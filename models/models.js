// models.js
var mongoose = require('mongoose');

// *******************************
// USER MODEL and SCHEMA
// *******************************
var userSchema = mongoose.Schema({
  name: String,
  words: [{
    word: { type: String, ref: 'Word' },
    count: {type: Number, default: 0},
    _id: false
  }],
  wordCost: {type: Number, default: 0.25},
  moneyPaid: {type: Number, default: 0}
});

userSchema.methods.getTotalInfractions = function(callback) {
  var wordCountTotal = 0;
  var words = this.words;
  var count = 0;
  for (var i=0; i<words.length; i++) {
    var wordObj = words[i];
    wordCountTotal += words[i].count;
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

// *******************************
// WORD MODEL and SCHEMA
// *******************************
var wordSchema = mongoose.Schema({
  word: {type: String, required: true},
  category: String,
  isActiveOption: {type: Boolean, default: true}
});

wordSchema.methods.getTotalCount = function(callback) {
  var word = this._id;
  User.find({'words.word':word}, function(err, users) {
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
      if (words[j].word._id === word._id) {
        total += words[j].count;
      }
      count++;
      if (count == totalWordsToCheck) {
        callback(null, total);
      }
    }
  }
}

wordSchema.statics.getTotalCount = function(callback) {
  Word.find(function(err, words) {
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
// TEAM MODEL and SCHEMA
// *******************************
var teamSchema = mongoose.Schema({
  name: String,
  members: [{ type: String, ref: 'User' }],
  active: {type: Boolean, default: true}
});

// *******************************
// Export Object Models
// *******************************
var User = mongoose.model('User', userSchema);
var Word = mongoose.model('Word', wordSchema);
var Team = mongoose.model('Team', teamSchema);

module.exports.User = User;
module.exports.Word = Word;
module.exports.Team = Team;
