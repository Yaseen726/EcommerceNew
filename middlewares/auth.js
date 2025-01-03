const User = require("../models/userSchema");
const mongoose=require("mongoose")
const Product=require("../models/productSchema")
const userAuth = async (req, res, next) => {
    try {
        let userId = req.session.user || req.session?.passport?.user;
        console.log(req.session,"this is userid of req.session")
        if (!userId) {
            console.log("No user ID in session");
            return res.redirect("/login");
        }

        // Validate ObjectId format before querying
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log("Invalid user ID format");
            return res.redirect("/login");
        }

        const user = await User.findById(userId);
        console.log(user,"sucessfully finding the user")

        if (user && !user.isBlocked) {
            return next();
        } else {
            req.session.user=null
            res.locals.user = null;
            return res.redirect("/login");
        }
    } catch (error) {
        console.log("Error in user auth middleware", error);
        res.status(500).send("Internal Server Error");
    }
};



const adminAuth = async (req, res, next) => {
    try {
        let adminId=req.session.Admin
        if(!adminId){
            return res.redirect("/admin/login")
        }
        const user = await User.findById(adminId);
        if (user && user.isAdmin) {
            return next();
        } else {
            return res.redirect('/admin/login'); 
        }
    } catch (error) {
        console.log("Error in adminAuth Middleware", error);
        res.status(500).send("Internal Server Error"); 
    }
}; 

const checkProductBlocked = async (req, res, next) => {
    try {
    const productId = req.query.id;
    
    if (!productId) {
        return res.redirect("/"); 
    }

    const product = await Product.findById(productId).populate('category'); 

    if (!product) {
        return res.redirect("/"); 
    }

    if (product.isBlocked) {
        return res.redirect("/"); 
    }

    if (!product.category || !product.category.isListed) {
        return res.redirect("/"); 
    }

    req.product = product; 
    next(); 
    } catch (error) {
    console.error("Error in middleware:", error);
    res.status(500).send("Server error");
    }
};


module.exports = {
    userAuth,
    adminAuth,
    checkProductBlocked
};