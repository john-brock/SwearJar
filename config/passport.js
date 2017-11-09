// passport.js

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var configAuth = require('./auth.js');
var models = require('../models/models.js');
var User = models.User;

var googleClientId = process.env.GOOGLE_CLIENT_ID || configAuth.googleAuth.clientId;
var googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || configAuth.googleAuth.clientSecret;
var googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || configAuth.googleAuth.callbackUrl;

passport.use(new GoogleStrategy(
	{
		clientID: googleClientId,
		clientSecret: googleClientSecret,
		callbackURL: googleCallbackUrl
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
