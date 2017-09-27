// app.js
var express = require('express');
var bodyParser = require('body-parser');
var jade = require('jade');
var logfmt = require('logfmt');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var config = require('./config.json');
var models = require('./models/models.js');

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

if ('development' == app.get('env')) { }
if ('production' == app.get('env')) { }

var User = models.User;
var Word = models.Word;
var Team = models.Team;

router.param('user_id', function(req, res, next, id) {
  userId = mongoose.Types.ObjectId.createFromHexString(id.toString())
  User.find({_id: userId}, function(err, users) {
    if (null != users && users.length > 0) {
      req.user = users[0];
      next();
    } else {
      return next(new Error('User not found!'));
    }
  });
});

router.route('/users/summary')
.get(function(req, res, next) {
  var count = 0;
  var userSummary = [];
  var totalInfractions = 0;
  var totalOwed = 0;
  var totalPaid = 0;
  User.find({}, function(err, users) {
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

router.route('/users/:user_id/owes')
.get(function(req, res, next) {
  req.user.getTotalOwed(function(total) {
    res.json(total);
  })
})

router.route('/users/:user_id/paid')
.get(function(req, res, next) {
  res.json(req.user.moneyPaid);
})
.post(function(req, res, next) {
  var user = req.user;
  var amount = parseFloat(req.param('amount'));
  if (isNaN(amount)) {
    return next(new Error('Error: amount must be a number.'));
  } else {
    user.moneyPaid += amount;
    user.update(function(err, user) {
      if (err) {
        return next(new Error('Error updating user. Please try again. ' + err));
      } else {
        res.json(user.moneyPaid);
      }
    });
  }
})

router.route('/users/:user_id/words/count')
.get(function(req, res, next) {
  req.user.getTotalInfractions(function(total) {
    res.json(total);
  });
})

router.route('/users/:user_id/words')
.get(function(req, res, next) {
  res.json(req.user.words);
})
.post(function(req, res, next) {
  var user = req.user;
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
      res.send(200);
    });
  }
})

function updateUserWords(user, word, userInfo, callback) {
  var wordFound = false;
  var count = 0;
  var origCount = user.words.length;
  for (var i=0; i<origCount; i++) {
    if (user.words[i]._id === word.word._id) {
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
          callback(err);
        }
        callback(null);
      });
    }
  }
  if (origCount == 0) {
    user.words.push(word);
    saveUser(user, word, null, function(err) {
      if (err) {
        callback(err);
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
            callback(err);
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

router.route('/users/:user_id')
.get(function(req, res, next) {
  res.json(req.user);
})

router.route('/users')
.get(function(req, res, next) {

  User.find()
    .populate('words.word')
    .exec(function(err, users) {
      if (err) { return next(new Error('Error retireving all users. ' + err)); }
      res.json(users);
    });
})
.post(function(req, res, next) {
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
        callback(err);
      }
      saveUser(user, null, userInfo, function(err) {
        if (err) {
          callback(err);
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
.get(function(req, res, next) {
  Word.getTotalCount(function(err, result) {
    if (err) { return next(new Error('Error when attempting to get total count for all words. ' + err)) }
    res.json(result);
  })
})

router.param('word_id', function(req, res, next, word_id) {
  wordId = mongoose.Types.ObjectId.createFromHexString(word_id.toString())
  Word.find({_id: wordId}, function(err, words) {
    if (words.length > 0) {
      req.word = words[0];
      next();
    } else {
      return next(new Error('No matching Word found.'));
    }
  });
});

router.route('/words/:word_id')
.get(function(req, res, next) {
  res.json(req.word);
})

router.route('/words/:word_id/count')
.get(function(req, res, next) {
  req.word.getTotalCount(function(err, total) {
    if (err) { return next(new Error('Error getting the total count of word usage. ' + err)); }
    res.json(total);
  });
})

router.route('/words')
.get(function(req, res, next) {
  Word.find(function(err, words) {
    if (err) { return next(new Error('Error retrieving all words. ' + err)); }
    res.json(words);
  })
})
.post(function(req, res, next) {
  var wordText = req.param('word');
  var category = req.param('category');
  var isActiveOption = req.param('active');
  Word.find({word: wordText}, function (err, words) {
    if (err) {
      return next(new Error('Error attempting to find existing word.'));
    } else {
      var word = words.length > 0 ? words[0] : new Word({
        word: wordText,
      });
      if (null != category) {
        word.category = category;
      }
      if (null != isActiveOption) {
        word.isActiveOption = isActiveOption;
      }
      word.save(function(err, word) {
        if (err) { return next(new Error('Error saving new word. ' + err)); }
        res.send(200);
      });
    }
  });
})

router.param('team_id', function(req, res, next, team_id) {
  teamObjectId = mongoose.Types.ObjectId.createFromHexString(team_id.toString())
  Team.find({_id: teamObjectId}, function(err, teams) {
    if (!err && teams.length > 0) {
      req.team = teams[0];
      next();
    } else {
      return next(new Error('No matching Team found. ' + err));
    }
  });
});

router.route('/teams/:team_id/add/:user_id')
.post(function(req, res, next) {
  var team = req.team;
  var memberAlreadyAdded = team.members.some(function(member) {
    return member.toString() == req.user._id;
  })
  if (!memberAlreadyAdded) {
    team.members.push(req.user);
    team.save(function(err, team) {
      if (err) { return next(new Error('Error adding user to team. ' + err)); }
      res.send(200);
      return;
    })    
  }
  res.send(200);
})

router.route('/teams')
.get(function(req, res, next) {
  Team.find()
   .populate('members')
   .exec(function(err, teams) {
    if (err) { return next(new Error('Error retrieving all teams. ' + err)); }
      res.json(teams);
    });
})
.post(function(req, res, next) {
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
  var users = User.find( {$query: {}, $orderby : {name: 1} }, function(err, users) {
    if (err) {
      res.send(500);
    } else {
      userList = users;
      Word.find( {$query: {'isActiveOption': {$ne: false}}, $orderby: { word: 1 } }, function(err, words) {
        if (err) {
          res.send(500);
        } else {
          res.render(pageToRender, {'users': userList, 'words': words});
        }
      });
    }
  });
}

app.get('/', function(req, res) {
  renderPage('indexOld', req, res);
});

app.get('/new', function(req, res) {
  renderPage('index', req, res);
});

app.get('/charts', function(req, res) {
  res.render('charts');
});

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
