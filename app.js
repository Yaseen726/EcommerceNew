const express = require("express");
const app = express();
const session=require("express-session")
const passport=require("./config/passport")
const path=require("path")
const env = require("dotenv").config();
const db=require("./config/db")
const nocache=require("nocache")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter")
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(nocache())
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
      secure: false,   
      httpOnly: true, 
      maxAge: 72 * 60 * 60 * 1000 // 72 hours
  }
}));
app.use(passport.initialize())
app.use(passport.session())
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});
app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,"public")))
// Serve static files from the 'uploads/product-images' directory



app.use("/",userRouter)
app.use("/admin",adminRouter)

app.listen(process.env.PORT, () => {
  console.log("server running on port 3000");
});

module.exports = app;

