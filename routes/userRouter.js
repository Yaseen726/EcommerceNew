const express = require("express");
const router = express.Router();
const passport=require("../config/passport")
const userController = require("../controllers/user/userController");
const profileController=require("../controllers/user/profileController")
const productController=require("../controllers/user/productController")
const wishlistController=require("../controllers/user/wishlistController")
const walletController=require("../controllers/user/walletController")
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

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
"/auth/google/callback",
passport.authenticate("google", { failureRedirect: "/signup" }),
(req, res) => {
    if (req.user && req.user._id) {
      req.session.user = req.user._id; 
    }

    console.log(req.session, "Session after Google auth");
    res.redirect("/");
}
);
//sort
router.get("/sort",userController.sortProduct)
router.get('/filter-by-category',userController.categoryFilter)
router.get("/search",userController.searchProducts)
router.get('/paginate',userController.paginateProducts);
//login logout
router.get("/login", userController.loadlogin);
router.post("/login",userController.login)
router.get("/logout",userAuth,userController.logout)

//forgot password
router.get('/forgot-password', userController.getForgotPassword);
router.post('/forgot-email-valid', userController.forgotEmailValid);
router.post('/verify-forgotpass-otp', userController.verifyForgotOtp);
router.get('/reset-password', userController.getResetPassPage);
router.post('/resend-forgot-otp', userController.resendOtp);
router.post('/reset-password', userController.resetPassword);

//product details

router.get('/productdetails',productController.getProductDetails);
router.post('/addreview', productController.addReview);
//user profile
router.get("/account",userAuth,profileController.userprofile)

//cancel order
router.post("/account/cancelOrder",userAuth,profileController.cancelorder)

router.post("/address/add",userAuth,profileController.addaddress)
router.get("/address/edit",userAuth,profileController.loadeditaddress)
router.post("/address/edit",userAuth,profileController.updateaddress)
router.get("/address/delete",userAuth,profileController.deleteaddress)

//cart
router.get("/cart",userAuth,productController.loadcart)
router.get("/cart/checkout",userAuth,productController.getcheckout)
router.post("/addtocart",productController.addtocart)

router.post("/cart/updateQuantity",userAuth,productController.updatecart)
router.post("/cart/deleteItem",userAuth,productController.deletecart)
router.post("/checkout/place-order",userAuth,productController.placeorder)
router.post("/checkout/verify-razorpay-payment",userAuth,productController.verifyRazorpayPayment)
router.post("/checkout/addaddress",userAuth,productController.AddAddressCheckout)
router.get("/place-order/success",userAuth,productController.ordersuccess)
router.get("/place-order/failed",userAuth,productController.orderfailed)
//apply coupon
router.post("/checkout/applyCoupon",userAuth,productController.ApplyCoupon)

//invoice 
router.post("/account/downloadinvoice",userAuth,profileController.DownloadInvoice)
//update profile
router.post("/profile/updateprofile", userAuth,profileController.updateUserProfile);

//wislist
router.get("/wishlist",userAuth,wishlistController.loadwishlist)
router.post("/wishlist/add",wishlistController.addwishlist)

router.post("/wishlist/delete",userAuth,wishlistController.deleteWishlistItem)

//wallet
router.get("/wallet",userAuth,walletController.LoadWallet)
router.post("/wallet/add-money",userAuth,walletController.addWalletMoney)

//retrypayments
router.post("/account/create-retry-razorpay-order",profileController.RetryPayment)
router.post("/account/payment-success/:orderId",profileController.verifyPayment)
router.get('/order/:id/details',userAuth,profileController.loadOrderDetailsModal);

module.exports = router;
