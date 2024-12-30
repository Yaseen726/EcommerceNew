const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema")
const Wallet=require("../models/walletSchema")
require("dotenv").config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://www.yase.site/auth/google/callback",
  passReqToCallback: true,
  scope: ["profile", "email"]
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
      
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
          
          req.session.user = user._id;
          return done(null, user);
      } else {
          
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
              
              user.googleId = profile.id;
              await user.save();
              req.session.user = user._id;
              return done(null, user);
          } else {
              
              user = new User({
                  name: profile.displayName,
                  email: profile.emails[0].value,
                  googleId: profile.id,
              });

              const wallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
              await wallet.save();

          
              user.walletId = wallet._id;
              await user.save();

              req.session.user = user._id;
              return done(null, user);
          }
      }
  } catch (error) {
      return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
      const user = await User.findById(id);
      done(null, user);  
  } catch (err) {
      done(err);
  }
});




module.exports = passport;
