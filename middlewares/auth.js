const User = require("../models/userSchema");
const mongoose=require("mongoose")
// const userAuth = async (req, res, next) => {
//     try {
//         if (req.session.user) {
//             const user = await User.findById(req.session.user);
//             if (user && !user.isBlocked) {
//                 return next(); 
//             } else {
//                 return res.redirect("/login"); 
//             }
//         } else {
//             return res.redirect("/login");
//         }
//     } catch (error) {
//         console.log("Error in user auth middleware", error);
//         res.status(500).send("Internal Server Error"); 
// }
// };
const userAuth = async (req, res, next) => {
    try {
        let userId = req.session.user || req.session?.passport?.user;
        console.log(req.session,"data from session")
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

        if (user && !user.isBlocked) {
            return next();
        } else {
            console.log("User not found or blocked");
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