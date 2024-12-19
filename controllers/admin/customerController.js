const User=require("../../models/userSchema")

// const customerInfo=async(req,res)=>{
//     try {
//         let search=""
//         if(req.query.search)
//         {
//             search=req.query.search
//         }
//         let page=1
//         if(req.query.page){
//             page=req.query.page
//         }
//         const limit=3
//         const userData = await User.find({
//             isAdmin:false,
//             $or:[
//                 {name:{$regex:".*"+ search +".*"}},
//                 {email:{$regex:".*"+ search +".*"}}
//             ]
//         })
//         .limit(limit*1)
//         .skip((page-1)*limit)
//         .exec();

//         const count=await User.find({
//             isAdmin:false,
//             $or:[
//                 {name:{$regex:".*"+search+".*"}},
//                 {email:{$regex:".*"+search+".*"}}
//             ]
//         })
//         .countDocuments()
//         res.render("customer-manage")
//     } catch (error) {
        
//     }
// }

const customerInfo=async(req,res)=>{
    try {
        const userData=await User.find({isAdmin:false})
        console.log(userData)
        res.render("customer-manage",{
            data:userData
        })
    } catch (error) {
        console("error",error)
    }
}

const UserBlockUnblock=async(req,res)=>{
    try {
        const id=req.query.id
        const findUser=await User.findOne({_id:id})
        const state=findUser.isBlocked
        if(state){
            await User.updateOne({_id:id},{$set:{isBlocked:false}})
            res.redirect("/admin/users")
        }
        else{
            await User.updateOne({_id:id},{$set:{isBlocked:true}})
            res.redirect("/admin/users")
        }
    } catch (error) {
        
    }
}


module.exports={
    customerInfo,
    UserBlockUnblock
}