const mongoose=require("mongoose")
const {Schema}=mongoose

const bannerSchema=new Schema({
    bannerImage:{
        type:String,
        required:true
    },
    status:{
        type:Boolean,
        required:true
    },
    startDate:{
        type:Date,
        default:Date.now
    },
    endDate:{
        type:Date,
        default:Date.now
    }
})

const Banner=mongoose.model("Banner",bannerSchema)
module.exports=Banner 