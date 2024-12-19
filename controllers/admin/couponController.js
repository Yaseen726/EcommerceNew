const Coupon=require("../../models/couponSchema")
const product=require("../../models/productSchema")

const updateExpiredCoupons = async () => {
    const now = new Date();
    await Coupon.updateMany(
      { expireOn: { $lt: now } }, // Expired coupons
      { $set: { isExpired: true } }
    );
  };

//loading coupon creation page
const loadcreatecoupon=async(req,res)=>{
    try {
        res.render("addcoupon")
    } catch (error) {
        console.error('Error loading coupons:', error);
        res.status(500).send('Internal Server Error');
    }
}
//post request for coupon creation
const createcoupon=async(req,res)=>{
    try {
        const {name,expireOn,}=req.body
        const offerPrice = Number(req.body.offerPrice);
        const minimumPrice = Number(req.body.minimumPrice);
        
        if(offerPrice>=minimumPrice){
          return res.status(400).json({success:false,message:"discount amount connot greater that Minimum amount"})
        }
        const newCoupon=new Coupon({
            name,
            expireOn,
            offerPrice,
            minimumPrice
        })
        await newCoupon.save()
        res.status(201).json({success:true,message:"Coupon Created successfully",coupon:newCoupon})
    } catch (error) {
        console.error("error creating Coupon",error.message)
        res.status(400).json({success:false,message:"coupon creation failed "})
    }
}

//managing coupon page
const loadmanagecoupon = async (req, res) => {
    try {
      // Update expiration status
      await updateExpiredCoupons();
  
      // Fetch all non-expired coupons
      const coupons = await Coupon.find().sort({ expireOn: 1 });
  
      res.render("loadcoupon", { coupons });
    } catch (error) {
      console.error('Error loading coupons:', error);
      res.status(500).send('Internal Server Error');
    }
  };



const deleteCoupon = async (req, res) => {
    try {
    const { id } = req.params;

      // Delete the coupon by ID
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
        return res.status(404).json({ message: 'Coupon not found!' });
    }

    res.status(200).json({ message: 'Coupon successfully deleted!' });
    } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete coupon. Please try again later.' });
    }
};



module.exports={
    loadcreatecoupon,
    createcoupon,
    loadmanagecoupon,
    deleteCoupon,
}