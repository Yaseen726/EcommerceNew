const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema")
const Wallet=require("../models/walletSchema")
require("dotenv").config();

// For Google Auth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  passReqToCallback: true,
  scope: ["profile", "email"]
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
          // Setting user._id to session
          req.session.user = user._id;
          return done(null, user);
      } else {
          // Create new user if not found
          user = new User({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
          });
          await user.save();
          req.session.user = user._id;
          return done(null, user);
      }
  } catch (error) {
      return done(error, null);
  }
}));



passport.serializeUser((user, done) => {
  // Store only the user ID in session as 'user'
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
      const user = await User.findById(id);
      done(null, user);  // Assign the full user object to req.user
  } catch (err) {
      done(err);
  }
});




module.exports = passport;
