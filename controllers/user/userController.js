const User = require("../../models/userSchema");
const mongoose=require("mongoose")
const nodemailer=require("nodemailer")
const env=require("dotenv").config()
const bcrypt=require("bcrypt")
const Category=require("../../models/categorySchema")
const Product =require("../../models/productSchema")
const Address=require("../../models/addressSchema")
const Wallet=require("../../models/walletSchema")


//search filter includede homepage

const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    const googleauthuser = req.session?.passport?.user;

    // Fetch the categories
    const categories = await Category.find({ isListed: true });

    // Get the category filter from the query string (default is 'all-categories')
    const categoryFilter = req.query.category || 'all-categories';
    const searchQuery = req.query.query || '';  // Get the search query
    let productData;

    // Search by product name or description
    if (searchQuery) {
      productData = await Product.find({
        isBlocked: false,
        category: { $in: categories.map(category => category._id) },
        $or: [
          { productName: { $regex: searchQuery, $options: 'i' } },  // Case-insensitive search by product name
          { description: { $regex: searchQuery, $options: 'i' } }    // Case-insensitive search by product description
        ]
      });
    } else {
      productData = await Product.find({
        isBlocked: false,
        category: { $in: categories.map(category => category._id) },
      });
    }

    // Add the out-of-stock flag
    productData = productData.map(product => ({
      ...product._doc,
      isOutOfStock: product.quantity === 0,
    }));

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

    // Get the first 7 products after sorting
    productData = productData.slice(0, 7);

    // Handle user data
    let userData;
    if (user) {
      userData = await User.findById(user);
    } else if (googleauthuser) {
      userData = await User.findById(googleauthuser);
    }

    res.locals.user = userData;

    // Render the homepage with filtered products
    res.render("home", {
      products: productData,
      user: userData,
      categories: categories,
      categoryFilter: categoryFilter,
      searchQuery: searchQuery
    });

  } catch (error) {
    console.log("Error loading homepage:", error);
    res.status(500).send("Server error");
  }
};


const catFilter = async (req, res) => {
  try {

    const category = req.query.category;
    let products;

    if (category === 'all-categories') {
      products = await Product.find({});
    } else {
      products = await Product.find({ category: category});
    }

    res.json({ products });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};


//search products

const searchProducts = async (req, res) => {
  try {
    const searchQuery = req.query.query || '';  // Get the search query

    let products;
    if (searchQuery) {
      products = await Product.find({
        isBlocked: false,
        $or: [
          { productName: { $regex: searchQuery, $options: 'i' } },  // Case-insensitive search by product name
          { description: { $regex: searchQuery, $options: 'i' } }    // Case-insensitive search by product description
        ]
      });
    } else {
      products = await Product.find({ isBlocked: false });
    }

    // Send a clearer message if no products were found
    if (products.length === 0) {
      return res.status(200).json({ message: 'No products found', products });
    }

    res.json({ products });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

//sort products

const sortProduct = async (req, res) => {
  try {
    const sortOption = req.query.sort || 'default';
    console.log(sortOption);
    let sortCriteria;

    switch (sortOption) {
      case 'price-low-high':
        sortCriteria = { salePrice: 1 };
        break;
      case 'price-high-low':
        sortCriteria = { salePrice: -1 };
        break;
      case 'new-arrivals':
        sortCriteria = { createdAt: -1 };
        break;
      case 'alphabetical-a-z':
        sortCriteria = { productName: 1 };
        break;
      case 'alphabetical-z-a':
        sortCriteria = { productName: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    const products = await Product.find().sort(sortCriteria);
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
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
      const wallet=new Wallet({userId:userSave._id,balance:0,transactions:[]})
      await wallet.save()
      userSave.walletId=wallet._id
      await userSave.save()
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
      console.log(req.session,"session after logout")
      return res.redirect("/login")
    }
    catch (error) {
    console.log("logout error",error);
    res.redirect("/pagenotfound")
    
  }
}
//forgot password

const getForgotPassword = async (req, res) => {
  try {

      const message = req.query.msg || ""
      res.render('forgot-password', { message })

  } catch (error) {
      res.redirect('/page-not-found')
  }
}



const forgotEmailValid = async (req, res) => {
  try {

      const { email } = req.body;
      const findUser = await User.findOne({ email: email });
      console.log(findUser,"this is validating")

      if (findUser) {
          const otp = generateOtp();
          const emailSent = await sendEmailVerification(email, otp);
          if (emailSent) {
              req.session.forgOtp = otp;
              req.session.email = email;
              res.render("forgotPass-otp")
              console.log("OTP: " + otp);
          } else {
              res.json({ success: false, message: "Failed to send OTP. Please try again" })
          }
      } else {
          res.redirect("/forgot-password?msg=User with this email does not exist")
      }

  } catch (error) {
      res.redirect('/page-not-found')
  }
}



const verifyForgotOtp = async (req, res) => {
  try {
      const enteredOtp = req.body.otp;

      if (enteredOtp === req.session.forgOtp) {
          res.json({ success: true, redirectUrl: '/reset-password' });
      } else {
          res.json({ success: false, message: "OTP does not match. Please try again." });
      }
  } catch (error) {
      console.error("Error verifying OTP", error);
      res.status(500).json({ success: false, message: "An error occurred. Please try again." });
  }
};

const getResetPassPage = async (req, res) => {
  try {

      const message = req.query.msg || ""
      res.render('reset-password', message);

  } catch (error) {
      res.redirect('/page-not-found');
  }
}



const resendOtp = async (req, res) => {
  try {

      const otp = generateOtp();
      req.session.forgOtp = otp;
      const email = req.session.email;
      console.log("Resending OTP to email: " + otp);
      const emailSent = await sendEmailVerification(email, otp);
      if (emailSent) {
          console.log("Resend OTP:", otp);
          res.status(200).json({ success: true, message: "Resend OTP Successful" })
      }

  } catch (error) {
      console.error("Error in resend OTP ", error);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
}


const resetPassword = async (req, res) => {
  try {
      const { newPass1, newPass2 } = req.body;
      const email = req.session.email;

      if (newPass1 === newPass2) {
          const passwordHash = await bcrypt.hash(newPass1, 10);
        
          await User.updateOne({ email: email }, { $set: { password: passwordHash } });

          res.redirect("/login")
      } else {
          res.redirect('/reset-password?msg=Password do not match')
      }

  } catch (error) {
      res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};



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
  sortProduct,
  getForgotPassword,
  forgotEmailValid,
  verifyForgotOtp,
  getResetPassPage,
  resendOtp,
  resetPassword,
  catFilter,
  searchProducts

};
