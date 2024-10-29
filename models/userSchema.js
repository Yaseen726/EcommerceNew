const mongoose=require("mongoose")

const {Schema}=mongoose

const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId:{
        type:string,
        unique:true,

    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalcode:{
        type:String
    },
    radeemed:{
        type:Boolean
    },
    radeemedusers:[{
        type:Schema.Type.ObjectId,
        ref:"User"
    }],
    searchhistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        }
    }],
    brand:{
        type:String
    },
    searchOn:{
        type:Date,
        default:Date.now
    }

})


const User=mongoose.model("User",userSchema)

module.exports=User
