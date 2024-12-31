const User=require("../../models/userSchema")


// const customerInfo=async(req,res)=>{
//     try {
//         const userData=await User.find({isAdmin:false})
//         console.log(userData)
//         res.render("customer-manage",{
//             data:userData
//         })
//     } catch (error) {
//         console("error",error)
//     }
// }

const customerInfo = async (req, res) => {
    try {
        const { search, page = 1 } = req.query; // Retrieve search query and page number
        const limit = 10; // Set the number of records per page
        const skip = (page - 1) * limit;

        // Build search query
        const query = { isAdmin: false };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } }, // Case-insensitive search on name
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ];
        }

        // Get total count of matching users
        const totalUsers = await User.countDocuments(query);

        // Fetch paginated and filtered user data
        const userData = await User.find(query).skip(skip).limit(limit);

        // Calculate total pages
        const totalPages = Math.ceil(totalUsers / limit);

        res.render("customer-manage", {
            data: userData,
            currentPage: parseInt(page),
            totalPages,
            search
        });
    } catch (error) {
        console.error("Error fetching customer info:", error);
        res.status(500).send("Server error");
    }
};


const UserBlockUnblock=async(req,res)=>{
    try {
        const id=req.query.id
        const findUser=await User.findOne({_id:id})
        const state=findUser.isBlocked
        if(state){
            await User.updateOne({_id:id},{$set:{isBlocked:false}})
        }
        else{
            await User.updateOne({_id:id},{$set:{isBlocked:true}})
        }
        res.redirect("/admin/users")
    } catch (error) {
        console.error("error in block unblock",error)
    }
}



module.exports={
    customerInfo,
    UserBlockUnblock
}