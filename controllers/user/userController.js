const User = require("../../models/userSchema");
const mongoose=require("mongoose")
const nodemailer=require("nodemailer")
const env=require("dotenv").config()
const bcrypt=require("bcrypt")
const Category=require("../../models/categorySchema")
const Product =require("../../models/productSchema")
const Address=require("../../models/addressSchema")

//loading home page 
const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });

    // Use $and to combine the conditions for product filtering
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(category => category._id) },
      quantity: { $gt: 0 }
    });

    // Sort the productData by createdOn date in descending order
    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

    // Get the first 4 products after sorting
    productData = productData.slice(0, 4);

    if (user) {
      const userData = await User.findById(user);
      res.render("home", {products: productData });
    } else {
      res.render("home", { products: productData });
    }
  } catch (error) {
    console.log("Home page not found:", error); // Log the error for debugging
    res.status(500).send("Server error");
  }
};


//page error
const pagenotfound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pagenotfound");
  }
};

//loading signup page
const loadsignup = async (req, res) => {
  try {
    res.render("signup-page",{message:""});
  } catch (error) {
    console.log("home page is not loading", error);
    res.status(500).send("server Error");
  }
};

//otp generation
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


//email verification -nodemailer
async function sendEmailVerification(email,otp){
  try {
    const transporter=nodemailer.createTransport({
      service:"gmail",
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD
      }

    })
    const info = await transporter.sendMail({
      from:process.env.NODEMAILER_EMAIL,
      to:email,
      subject:"You OTP verification",
      text:`your OTP is ${otp}`,
      html:`<b>your OTP is ${otp}</b>`
    })
    return info.accepted.length>0


  } catch (error) {
    console.error("error sent gmail",error)
    return false
  }
}


//account creation
const signup = async (req, res) => {
  try {
    const {name,phone,email, password, cpassword } = req.body;
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup-page", { message: "email already exist" });
    }

    const otp = generateOtp();
    const emailsent=await sendEmailVerification(email,otp)
    if(!emailsent){
    return res.JSON("email error ")
    }
    req.session.userOtp=otp //otp is saved here in session
    req.session.userData={name,phone,email,password}
    res.render("otp-page")
    console.log("otp sent success",otp)

  } catch (error) {
    console.error("signup error",error)
  }
};

//otp verification
const verifyotp=async(req,res)=>{
  try {
    const {otp}=req.body
    if(otp===req.session.userOtp){
      const user=req.session.userData
      const passwordHash=await bcrypt.hash(user.password,10)
      const userSave=new User({
        name:user.name,
        email:user.email,
        password:passwordHash,
        phone:user.phone,
      })
      await userSave.save()
      req.session.user=userSave._id
      res.json({success:true,redirectUrl:"/"})
    }
    else{
      res.status(400).json({success:false,message:"Invalid OTP",})
    }

  } catch (error) {
    console.error("error verify otp",error)
    res.status(500).json({success:false,message:"failed to verify otp"})
  }
}

//resending otp

const resendotp=async(req,res)=>{
  try {
    const {email}=req.session.userData || {}
    if(!email){
      return res.status(400).json({success:false,message:"email not found in session"})
    }
    const otp=generateOtp()
    req.session.userOtp=otp;
    const emailSent =await sendEmailVerification(email,otp)
   if(emailSent){
    console.log("Resend OTP:",otp);
    res.status(200).json({success:true,message:"OTP Resend Success"})
   }
   else{
    res.status(500).json({success:false,message:"OTP Resend Failed"})
   }
  } catch (error) {
    console.error("error resend Otp",error)
    res.status(500).json({success:false,message:"Failed to resend OTP"})
  }
}

//loading login page

const loadlogin = async (req, res) => {
  try {
    if(!req.session.user){
      return res.render("login-page",{message:""});
    }
    else{
      return res.redirect("/")
    }
    
  } catch (error) {
   res.redirect("/pagenotfound")

  }
};

//login authentication
const login=async(req,res)=>{
  try {
    const {email,password}=req.body
    const userFind=await User.findOne({isAdmin:0,email:email})
   if(!userFind)
   {
    return res.render("login-page",{message:"user not found"})
   }
   if(userFind.isBlocked)
   {
   return  res.render("login-page",{message:"user is blocked by Admin"})
   }
   const passwordMatch=await bcrypt.compare(password,userFind.password)
   console.log(passwordMatch)
   if(!passwordMatch){
    return res.render("login-page",{message:"please enter correct password"})
   }
    req.session.user=userFind._id    //my session is stored userId
    res.redirect("/")

  } catch (error) {
    console.log("login error",error)
  }
}

//logout 
const logout=async(req,res)=>{
  try {
      if(req.session.user){
      req.session.user=null
      }
      return res.redirect("/login")
    }
    catch (error) {
    console.log("logout error",error);
    res.redirect("/pagenotfound")
    
  }
}

module.exports = {
  loadHomepage,
  pagenotfound,
  loadlogin,
  loadsignup,
  signup,
  verifyotp,
  resendotp,
  login,
  logout,
};
