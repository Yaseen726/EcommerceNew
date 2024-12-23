const User = require("../../models/userSchema");
// const productController=require("../../controllers/admin/productController")
const bcrypt = require("bcrypt");

//loading admin loagi page
const loadAdmin = (req, res) => {
  try {
    if (req.session.Admin) {
      return res.redirect("/");
    }
    return res.render("admin-login", { message: "" });
  } catch (error) {
    console.log("error load login page ", error);
    res.redirect("/pagenotfound");
  }
};

//admin authentication
const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passwordMath = await bcrypt.compare(password, admin.password);
      if (passwordMath) {
        req.session.Admin = true;
        return res.redirect("/admin");
      } else {
        return res.render("admin-login",{message:"enter correct password"})
      }
    } else {
      res.render("admin-login",{message:"admin can only login here"})
    }
  } catch (error) {
    console.log("login error", error);
  }
};

//load admin dashboard
const loaddashboard = async (req, res) => {
  try {
    if (req.session.Admin) {
      res.render("admin-dashboard");
    }
  } catch (error) {
    console.log("error loading dashboard",error)
    res.redirect("/pagenotfound")
  }
};

//logout admin
const logout=async(req,res)=>{
    try {
      if(req.session.Admin){
      req.session.Admin=null
      }
    res.redirect("/admin/login")
    } catch (error) {
        console.log("error logging out",error);
    }
}

const pagenotfound=async(req,res)=>{
    try {
        res.render("page-error")
    } catch (error) {
        console.log("failed to render page not found")
    }
}

module.exports = {
  loadAdmin,
  loaddashboard,
  adminlogin,
  logout,
  pagenotfound
};
