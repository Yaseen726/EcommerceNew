const express = require("express");
const router = express.Router();
const passport=require("../config/passport")
const userController = require("../controllers/user/userController");
const profileController=require("../controllers/user/profileController")
const productController=require("../controllers/user/productController")
const {userAuth}=require("../middlewares/auth")
const User =require("../models/userSchema")
router.use(async(req, res, next) => {
    const userData = await User.findById(req.session.user);
    res.locals.user = userData || null;
    next();
});
router.get("/pagenotfound", userController.pagenotfound);
router.get("/", userController.loadHomepage);


//authentication routes and account creation 
router.get("/signup",userController.loadsignup);
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyotp)
router.post("/resend-otp",userController.resendotp)
router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}))
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    res.redirect("/")
})

//login logout
router.get("/login", userController.loadlogin);
router.post("/login",userController.login)
router.get("/logout",userAuth,userController.logout)
//product details

router.get('/productdetails',productController.getProductDetails);

//user profile
router.get("/account",userAuth,profileController.userprofile)

router.post("/address/add",userAuth,profileController.addaddress)
router.get("/address/edit",userAuth,profileController.loadeditaddress)
router.post("/address/edit",userAuth,profileController.updateaddress)

//cart
router.get("/cart",userAuth,productController.loadcart)
router.get("/cart/checkout",userAuth,productController.checkout)
router.post("/addtocart",userAuth,productController.addtocart)


module.exports = router;
