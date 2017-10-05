// passport.js

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var configAuth = require('./auth.js');
var models = require('../models/models.js');
var User = models.User;

passport.use(new GoogleStrategy(
	{
		clientID: configAuth.googleAuth.clientId,
		clientSecret: configAuth.googleAuth.clientSecret,
		callbackURL: configAuth.googleAuth.callbackUrl
	},
	function(accessToken, refreshToken, profile, done) {
		User.findOrCreate(profile, function (err, user) {
			return done(err, user);
		});
	}
));

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findOne({'_id': id})
    .populate('words.word')
    .populate('team')
    .exec(function(err, user) {
    	done(err, user);
    });
});

module.exports = passport;
