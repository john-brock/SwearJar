// app.js
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var jade = require('jade');
var logfmt = require('logfmt');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var config = require('./config.json');
var models = require('./models/models.js');
var passport = require('./config/passport.js');

var app = express();
var router = express.Router();
var port = Number(process.env.PORT || 5005);

var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://localhost/swearjar';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({'extended':true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use(logfmt.requestLogger());

app.use(session({ secret: 'test' }));
app.use(passport.initialize());
app.use(passport.session());

if ('development' == app.get('env')) { }
if ('production' == app.get('env')) { }

var User = models.User;
var Word = models.Word;
var Team = models.Team;
var AuditHistory = models.AuditHistory;

router.param('user_id', function(req, res, next, id) {
  userId = mongoose.Types.ObjectId.createFromHexString(id.toString())
  User.find({_id: userId})
    .populate('team')
    .populate('words.word')
    .exec(function(err, users) {
      if (null != users && users.length > 0) {
        req.userObjectFromParam = users[0];
        next();
      } else {
        return next(new Error('User not found!'));
      }
    });
});

router.param('word_id', function(req, res, next, word_id) {
  wordId = mongoose.Types.ObjectId.createFromHexString(word_id.toString())
  Word.find({_id: wordId})
    .populate('team')
    .exec(function(err, words) {
      if (words.length > 0) {
        req.word = words[0];
        next();
      } else {
        return next(new Error('No matching Word found.'));
      }
    });
});

router.param('team_id', function(req, res, next, team_id) {
  teamObjectId = mongoose.Types.ObjectId.createFromHexString(team_id.toString())
  Team.find({_id: teamObjectId})
    .exec(function(err, teams) {
      if (!err && teams.length > 0) {
        req.team = teams[0];
        next();
      } else {
        return next(new Error('No matching Team found. ' + err));
      }
    });
});

router.route('/users/summary')
.get(isLoggedIntoTeam, function(req, res, next) {
  var count = 0;
  var userSummary = [];
  var totalInfractions = 0;
  var totalOwed = 0;
  var totalPaid = 0;
  User.find({'team' : req.user.team._id})
    .populate('team')
    .populate('words.word')
    .exec(function(err, users) {
      if (err) { return next(new Error('Error finding users.')); }
      for (var i=0; i<users.length; i++) {
        var user = users[i];
        var dataObj = {};
        dataObj.name = user.name;
        dataObj.totalPaid = user.moneyPaid;
        totalPaid += user.moneyPaid;
        user.getTotalInfractions(function(infractions) {
          dataObj.totalInfractions = infractions;
          totalInfractions += infractions;
          user.getTotalOwed(function(owed) {
            dataObj.totalOwed = owed;
            totalOwed += owed;
            userSummary.push(dataObj);
            count++;
            if (count == users.length) {
              userSummary.push({ 'name':'Total', 'totalInfractions':totalInfractions, 'totalOwed':totalOwed, 'totalPaid':totalPaid });
              res.json(userSummary);
            }
          })
        });
      }
    });
})

router.route('/users/signup/:team_id')
.get(function(req, res, next) {
  req.session.team = req.team;
  res.redirect('/auth/google')
})

router.route('/users/:user_id/owes')
.get(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.userObjectFromParam.team._id) == String(req.user.team._id)) {
    req.userObjectFromParam.getTotalOwed(function(total) {
      res.json(total);
    });
  } else {
    res.json({});
  }
})

router.route('/users/:user_id/paid')
.get(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.userObjectFromParam.team._id) == String(req.user.team._id)) {
    res.json(req.userObjectFromParam.moneyPaid);
  } else {
    res.json({});
  }
})
.post(isLoggedIn, function(req, res, next) {
  var user = req.userObjectFromParam;
  var amount = parseFloat(req.param('amount'));
  if (isNaN(amount)) {
    return next(new Error('Error: amount must be a number.'));
  } else {
    var totalPaid = user.moneyPaid + amount;
    User.findOneAndUpdate(
      {'_id': user._id, 'team': req.user.team._id}, 
      {'$set':{'moneyPaid': totalPaid}}, 
      function(err, user) {
        if (err) {
          return next(new Error('Error updating user. Please try again. ' + err));
        } else {
          res.json(user.moneyPaid);
        }
      }
    );
  }
})

router.route('/users/:user_id/words/count')
.get(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.userObjectFromParam.team._id) == String(req.user.team._id)) {
    req.userObjectFromParam.getTotalInfractions(function(total) {
      res.json(total);
    });
  } else {
    res.json({});
  }
})

router.route('/users/:user_id/words')
.get(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.userObjectFromParam.team._id) == String(req.user.team._id)) {
    res.json(req.userObjectFromParam.words);
  } else {
    res.json({});
  }
})
.post(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.userObjectFromParam.team._id) == String(req.user.team._id)) {
    var user = req.userObjectFromParam;
    var allowDelete = req.param('delete') == 'true';
    var wordIdParam = req.param('word');
    var word = {word: wordIdParam, count: parseInt(req.param('count'))};
    if (isNaN(word.count) || (word.count <= 0 && !allowDelete)) {
      return next(new Error('Error: count must be a positive number.'));
    } else if (null == wordIdParam || wordIdParam.length == 0) {
      return next(new Error('Error: word submitted was not valid.'));
    } else {
      updateUserWords(user, word, null, function(err) {
        if (err) {
          return next(new Error(err));
        }
        // insert audit record
        var auditHistory = AuditHistory({
          'team' : req.user.team._id,
          'reporter' : req.user._id,
          'reported' : req.userObjectFromParam._id,
          'word' : word.word,
          'count' : word.count 
        });
        auditHistory.save(function(err, auditHistory) {
          if (err) {
            return next(new Error(err));
          }
          res.send(200);
        });
      });
    }
  } else {
    res.json({});
  }
})

function updateUserWords(user, word, userInfo, callback) {
  var wordFound = false;
  var count = 0;
  var origCount = user.words.length;
  for (var i=0; i<origCount; i++) {
    if (String(user.words[i].word._id) == String(word.word)) {
      user.words[i].count += word.count;
      wordFound = true;
    }
    count++;
    if (count == origCount) {
      if (!wordFound) {
        user.words.push(word);
      }
      saveUser(user, word, null, function(err) {
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    }
  }
  if (origCount == 0) {
    user.words.push(word);
    saveUser(user, word, null, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  }
}

function saveUser(user, word, userInfo, callback) {
  var origId = user._id;
  user.save(function(err, user) {
    if (err) {
      if (err instanceof mongoose.Error.VersionError) {
        // refetch user and true to update
        console.log('Refetch required!');
        User.find({_id: origId}, function(err, users) {
          if (err) {
            return callback(err);
          } else if (users.length > 0) {
            if (word) {
              updateUserWords(users[0], word, null, callback);
            } else if (userInfo) {
              updateUserInfo(users[0], null, userInfo, callback);
            } else {
              callback('Error: did not have correct information to update user.');
            }
          } else {
            callback('Error: could not fetch user on retry during save.');
          }
        });
      } else {
        callback('Error updating user. ' + err);        
      }
    } else {
      callback(null);
    }
  });
}

router.route('/users/:user_id/join/:team_id')
.post(isLoggedIn, function(req, res, next) {
  var user_id = req.userObjectFromParam._id;
  var team_id = req.team._id;
  setTeamOnUser(user_id, team_id, function(err, user) {
    if (err) {
      console.log('Error ' + err);
      return next(new Error('Error updating user. Please try again. ' + err));
    } else {
      console.log('success');
      res.send(200);
    }
  });
})

function setTeamOnUser(user_id, team_id, callback) {
  User.findOneAndUpdate(
    {'_id': user_id}, 
    {'$set':{'team': team_id}}, 
    function(err, user) {
      return callback(err, user);
    }
  );  
}

router.route('/users/:user_id')
.get(isLoggedIn, function(req, res, next) {
  if (String(req.userObjectFromParam.team._id) == String(req.user.team._id)) {
    res.json(req.userObjectFromParam);
  } else {
    res.json({});
  }
})

router.route('/users')
.get(isLoggedIntoTeam, function(req, res, next) {
  User.find({'team': req.user.team._id})
    .populate('words.word')
    .exec(function(err, users) {
      if (err) { return next(new Error('Error retireving all users. ' + err)); }
      res.json(users);
    });
})
.post(isLoggedIn, function(req, res, next) {
  var userId = req.param('id') == null ? null : mongoose.Types.ObjectId.createFromHexString(req.param('id').toString());
  var userInfo = {wordCost : req.param('wordCost'), userName : req.param('name')};
  User.find({_id: userId}, function(err, users) {
    if (err) { return next(new Error('Error find user with given id')); }
    var user;
    if (users.length == 0) {
      user = new User();
    } else {
      user = users[0];
    }
    updateUserInfo(user, null, userInfo, function(err) {
      if (err) {
        return next(new Error(err));
      }
      res.send(200);
    });
  });
})

function updateUserInfo(user, word, userInfo, callback) {
  setUserName(user, userInfo.userName, function(user) {
    setWordCost(user, userInfo.wordCost, function(err, user) {
      if (err) {
        return callback(err);
      }
      saveUser(user, null, userInfo, function(err) {
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
}

function setWordCost(user, wordCost, callback) {
  if (wordCost != null) {
    var cost = parseFloat(wordCost);
    if (isNaN(cost)) { callback('WordCost must be a number.'); }
    user.wordCost = cost;
  }
  callback(null, user);
}

function setUserName(user, name, callback) {
  if (name != null) {
    user.name = name;
  }
  callback(user);
}

router.route('/words/count')
.get(isLoggedIntoTeam, function(req, res, next) {
  Word.getTotalCount(req.user.team._id, function(err, result) {
    if (err) { return next(new Error('Error when attempting to get total count for all words. ' + err)) }
    res.json(result);
  })
})

router.route('/words/:word_id')
.get(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.word.team._id) == String(req.user.team._id)) {
    res.json(req.word);
  } else {
    res.json({});
  }
})

router.route('/words/:word_id/count')
.get(isLoggedIntoTeam, function(req, res, next) {
  if (String(req.word.team._id) == String(req.user.team._id)) {
    req.word.getTotalCount(function(err, total) {
      if (err) { return next(new Error('Error getting the total count of word usage. ' + err)); }
      res.json(total);
    });
  } else {
    res.json({});
  }
})

router.route('/words')
.get(isLoggedIntoTeam, function(req, res, next) {
  Word.find({'team': req.user.team._id}, function(err, words) {
    if (err) { return next(new Error('Error retrieving all words. ' + err)); }
    res.json(words);
  })
})
.post(isLoggedIntoTeam, function(req, res, next) {
  var wordText = req.param('word');
  var category = req.param('category');
  var active = req.param('active');
  Word.find({team: req.user.team._id, word: wordText}, function (err, words) {
    if (err) {
      return next(new Error('Error attempting to find existing word.'));
    } else {
      var word = words.length > 0 ? words[0] : new Word({
        word: wordText,
        team: req.user.team._id
      });
      if (null != category) {
        word.category = category;
      }
      if (null != active) {
        word.active = active;
      }
      word.save(function(err, word) {
        if (err) { return next(new Error('Error saving new word. ' + err)); }
        res.send(200);
      });
    }
  });
})

router.route('/team')
.get(isLoggedIntoTeam, function(req, res, next) {
  Team.find({'_id': req.user.team._id})
   .exec(function(err, teams) {
    if (err) { return next(new Error('Error retrieving all teams. ' + err)); }
      res.json(teams);
    });
})
.post(isLoggedIn, function(req, res, next) {
  var name = req.param('name');
  var team = new Team({
    name: name
  })
  team.save(function(err, team) {
    if (err) { return next(new Error('Error saving new team. ' + err)); }
    res.send(200);
  })
})

function renderPage(pageToRender, req, res) {
  var userList;
  var words;
  var teamId = req.user.team._id;
  var users = User.find({'team': teamId})
    .sort({'name': 1})
    .exec(function(err, users) {
      if (err) {
        res.send(500);
      } else {
        userList = users;
        Word.find({'$and': [{'team': teamId}, {'active': {$ne: false}}]})
          .sort({'word': 1 })
          .exec(function(err, words) {
            if (err) {
              res.send(500);
            } else {
              res.render(pageToRender, {'users': userList, 'words': words});
            }
          });
      }
    });
}

function renderSignupPage(pageToRender, req, res) {
  Team.find({'active': true})
    .sort({'name': 1})
    .exec(function(err, teams) {
      if (err) {
        res.send(500);
      } else {
          res.render(pageToRender, {'teams': teams});
      }
    });
}

function renderHistoryPage(pageToRender, req, res) {
  AuditHistory.find({'team': req.user.team._id})
    .populate('team')
    .populate('reported')
    .populate('reporter')
    .populate('word')
    .limit(100)
    .sort({'timestamp': -1})
    .exec(function(err, auditHistoryDocs) {
      if (err) {
        res.send(500);
      } else {
          auditHistoryRows = []
          for (var i=0; i<auditHistoryDocs.length; i++) {
            var doc = auditHistoryDocs[i];
            var timeSuffix = doc.count > 1 ? 's' : '';
            var historyString = doc.reporter.name + ' reported ' + doc.reported.name + ' : ' + doc.word.word + ' ' + doc.count + ' time' + timeSuffix;
            auditHistoryRows.push({'report' : historyString, 'timestamp' : doc.timestamp});
          }
          res.render(pageToRender, {'auditHistoryRows': auditHistoryRows});
      }
    });
}

app.get('/', isLoggedIntoTeam, function(req, res) {
  renderPage('indexOld', req, res);
});

app.get('/bulk', isLoggedIntoTeam, function(req, res) {
  renderPage('index', req, res);
});

app.get('/charts', isLoggedIntoTeam, function(req, res) {
  res.render('charts');
});

app.get('/history', isLoggedIntoTeam, function(req, res) {
  renderHistoryPage('history', req, res);
})

app.get('/login', function(req, res) {
  res.render('login');
})

app.get('/signup', function(req, res) {
  // TODO ADD A NEW TEAM OPTION FOR BRAND NEW USERS
  renderSignupPage('signup', req, res);
})

app.get(
  '/auth/google',
  passport.authenticate(
    'google', 
    { scope: [
        'https://www.googleapis.com/auth/plus.profile.emails.read'
      ] 
    }
  )
);

app.get(
  '/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    if (null == req.user.team && null == req.session.team) {
      res.redirect('/signup');
    } else if ((null == req.user.team && null != req.session.team) || (null != req.session.team && String(req.user.team) != String(req.session.team._id))) {
      console.log('set team on user');
      setTeamOnUser(req.user._id, req.session.team._id, function(err, user) {
        res.redirect('/');
      });
    } else {
      res.redirect('/');      
    }
  }
);

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// route middleware to make sure a user is logged in and a member of a team
function isLoggedIntoTeam(req, res, next) {
  if (req.isAuthenticated() && null != req.user.team) {
    return next();
  }
  res.redirect('/login');
}

mongoose.connect(mongoUri);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  //successfully connected.
});
app.use(router);
app.listen(port, function() {
  console.log('Listening on port: ' + port);
});
