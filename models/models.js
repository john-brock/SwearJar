// models.js
var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
  name: {type: String, required: true},
  googleId: String,
  email: String,
  words: [{
    word: { type: String, ref: 'Word' },
    count: {type: Number, default: 0},
    _id: false
  }],
  wordCost: {type: Number, default: 0.25},
  moneyPaid: {type: Number, default: 0},
  team: {type: String, ref: 'Team'}  
});

var wordSchema = mongoose.Schema({
  word: {type: String, required: true},
  category: String,
  active: {type: Boolean, default: true},
  team: {type: String, ref: 'Team'}
});

var teamSchema = mongoose.Schema({
  name: {type: String, required: true, unique: true, trim: true},
  active: {type: Boolean, default: true}
});

var auditHistorySchema = mongoose.Schema({
  team: {type: String, ref: 'Team', required: true},
  reporter: {type: String, ref: 'User', required: true},
  reported: {type: String, ref: 'User', required: true},
  word: { type: String, ref: 'Word', required: true},
  count: {type: Number, required: true},
  timestamp: {type: Date, default: Date.now}
})

// *******************************
// USER SCHEMA METHODS
// *******************************
userSchema.methods.getTotalInfractions = function(callback) {
  var wordCountTotal = 0;
  var words = this.words;
  var team_id = this.team._id;
  var count = 0;
  for (var i=0; i<words.length; i++) {
    var wordObj = words[i];
    if (String(team_id) == String(wordObj.word.team)) {
      wordCountTotal += words[i].count;
    }
    count++;
    if (count == words.length) {
      callback(wordCountTotal);
    }
  }
  if (words.length == 0) { 
    callback(wordCountTotal); 
  }
}

userSchema.methods.getTotalOwed = function(callback) {
  var wordCost = this.wordCost;
  var moneyPaid = this.moneyPaid;
  this.getTotalInfractions(function(totalInfractions) {
    callback((totalInfractions * wordCost) - moneyPaid);
  });
}

userSchema.statics.findOrCreate = function(profile, callback) {
  User.find({'googleId' : profile.id}, function(err, users) {
    if (err || null == users) { callback(err, null); }
    if (users.length > 0) {
      callback(null, users[0]);
    } else {
      var user = new User();
      user.googleId = profile.id;
      user.name = profile.displayName;
      user.email = profile.emails[0].value;
      user.save(function(err, savedUser) {
        if (err || null == savedUser) { callback(err, null); }
        callback(null, savedUser);
      });
    }
  });
}

// *******************************
// WORD SCHEMA METHODS
// *******************************
wordSchema.methods.getTotalCount = function(callback) {
  var word = this._id;
  User.find({'$and':[{'team':this.team._id}, {'words.word':word}]}, function(err, users) {
    if (err) { callback(err, null); }
    var count = 0;
    var totalWordsToCheck = 0;
    for (var i=0; i<users.length; i++) {
      totalWordsToCheck += users[i].words.length;
      count++;
      if (count == users.length) {
        getTotalUseCount(totalWordsToCheck, users, word, callback);
      }
    }
    if (users.length == 0) {  // no users means no usage
      callback(null, 0);
    }
  });
}

function getTotalUseCount(totalWordsToCheck, users, word, callback) {
  var count = 0;
  var total = 0;
  for (var i=0; i<users.length; i++) {
    var words = users[i].words;
    for (var j=0; j<words.length; j++) {
      if (String(words[j].word) == String(word)) {
        total += words[j].count;
      }
      count++;
      if (count == totalWordsToCheck) {
        callback(null, total);
      }
    }
  }
}

wordSchema.statics.getTotalCount = function(team_id, callback) {
  Word.find({'team': team_id})
    .populate('team')
    .exec(function(err, words) {
      if (err) { callback(err, null); }
      var countMap = {};
      var count = 0;
      var numWords = words.length;
      for (var i=0; i<numWords; i++) {
        var word = words[i];
        if (word.word) {
          addCountToMap(word, function(err, wordText, total) {
            if (err) { callback(err, null); }
            countMap[wordText] = total;
            count++;
            if (count == numWords) {
              callback(null, countMap);
            }
          })
        } else {
          count++;  // mark that we have processed a Word if it doesn't have a word attribute
        }
      }
    });
}

function addCountToMap(word, callback) {
  word.getTotalCount(function(err, total) {
    if (err) { callback(err, null); }
    callback(null, word.word, total);
  });
}

// *******************************
// TEAM SCHEMA METHODS
// *******************************

// *******************************
// Export Object Models
// *******************************
var User = mongoose.model('User', userSchema);
var Word = mongoose.model('Word', wordSchema);
var Team = mongoose.model('Team', teamSchema);
var AuditHistory = mongoose.model('AuditHistory', auditHistorySchema);

module.exports.User = User;
module.exports.Word = Word;
module.exports.Team = Team;
module.exports.AuditHistory = AuditHistory;
