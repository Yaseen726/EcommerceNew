const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema")
const Wallet=require("../models/walletSchema")
require("dotenv").config();

// passport.use(new GoogleStrategy({
//         clientID: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         callbackURL: "/auth/google/callback",
//         passReqToCallback: true,
//         scope: ["profile", "email"]
//     },
//     async (accessToken, refreshToken, profile, done) => {
//     try {
//       // Check if the user already exists
//     let user = await User.findOne({ email: profile.emails[0].value });
//     if (!user) {
//         // Create a new user if not found
//         user = await User.create({
//         googleId: profile.id,
//         name: profile.displayName,
//         email: profile.emails[0].value,
//           // Other fields you need
//         });
//     }
//       // Set session user after Google login
//     req.session.user = user._id;
//     return done(null, user);
//     } catch (error) {
//     console.log(error);
//     return done(error, null);
//     }

// }));
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  passReqToCallback: true,
  scope: ["profile", "email"]
},
async (req, accessToken, refreshToken, profile, done) => {
  try {
      let user = await User.findOne({ googleId: profile.id });
      console.log(user,"this is userData of google")
      console.log(profile.emails,"profile emails")
      console.log(profile.id,"this is profile id")
      if (user) {
          if (user.isBlocked) {
              return done(null, false, { message: "Your account is blocked. Please contact support." });
          }
          return done(null, user);
      } else {
          user = await User.findOne({ email: profile.emails[0].value });
          console.log(user,"this is confirmation that user is finded google id jdbvdjbvdjkvdjkvdvjbvjdbvdjkvbdjv")

          if (user) {
              user.googleId = profile.id;
              await user.save();
              return done(null, user);
          } else {
              user = new User({
                  name: profile.displayName,
                  email: profile.emails[0].value,
                  googleId: profile.id,
              });
              await user.save();

              const userWallet = new Wallet({
                  user: user._id,
                  balance: 0,
                  transactions: []
              });

              await userWallet.save();
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
        const user = await User.findById(id); // Retrieve the user from the database using the ID stored in the session
        done(null, user); // Assign the user to req.user
    } catch (err) {
        done(err);
    }
});


module.exports = passport;
