const User = require("../models/userSchema");
const mongoose=require("mongoose")

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
    if(req.session.Admin){
        try {
            const admin = await User.findOne({ isAdmin: true });
            if (admin) {
                return next();
            } else {
                return res.redirect('/admin/login'); 
            }
        } catch (error) {
            console.log("Error in adminAuth Middleware", error);
            res.status(500).send("Internal Server Error"); 
        }
    }else{
        res.redirect("/admin/login")

    }

};

module.exports = {
    userAuth,
    adminAuth
};