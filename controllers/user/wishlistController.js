const Wishlist=require("../../models/wishlistSchema")
const Product=require("../../models/productSchema")
const User=require("../../models/userSchema")

const loadwishlist=async(req,res)=>{
  try {
    const userId=req.session.user
    const wishlist=await Wishlist.findOne({userId}).populate("products.productId")
    console.log(wishlist,"wislist items")
    res.render("wishlist",{wishlistItems:wishlist ? wishlist.products : []})
  } catch (error) {
    console.error("Error loading Wishlist",error)
    res.status(500).send("server error")
  }
}

const addwishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;
        if(!userId){
            return res.json({success:false,message:"login to view wishlist"})
        }

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        if (!wishlist.products.some(products => products.productId.toString() === productId)) {
            wishlist.products.push({ productId });
            await wishlist.save();
            return res.json({ success: true });
        }

        res.json({ success: false, message: 'Product already in wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const deleteWishlistItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemId = req.body.itemId;

        const wishlist = await Wishlist.findOne({ userId });
        console.log(wishlist)

        if (wishlist) {
            // Filter out the item to remove
            wishlist.products = wishlist.products.filter(item => item._id.toString() !== itemId);
            await wishlist.save();
            return res.json({ success: true, message: 'Item removed from wishlist.' });
        }

        res.status(404).json({ success: false, message: 'Wishlist not found.' });
    } catch (error) {
        console.error('Error deleting wishlist item:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};


module.exports={
    loadwishlist,
    addwishlist,
    deleteWishlistItem
}