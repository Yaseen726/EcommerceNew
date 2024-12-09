const Product = require('../../models/productSchema');
const User=require("../../models/userSchema")
const Category = require('../../models/categorySchema');
const Cart=require("../../models/cartSchema")
const getProductDetails = async (req, res) => {
    try {
  
      const userId = req.session.user;
      const user = await User.findById(userId);
      const id = req.query.id;
      const productData = await Product.findOne({ _id: id });
      const category = await Category.findOne({ _id: productData.category });
  
      const finalSalePrice = productData.salePrice;
      const regularPrice=productData.regularPrice
  
      const recommendedProducts = await Product.find({
        category: productData.category,
        _id: { $ne: productData._id }
      }).limit(4);
  
      res.render('product-details', {
        product: productData,
        cat: category,
        recProducts: recommendedProducts,
        user: user,
        finalSalePrice: Math.floor(finalSalePrice),
        regularPrice:Math.floor(regularPrice)
      });
  
    } catch (error) {
      res.redirect('/pagenotfound')
    }
  }


  const loadcart=async(req,res)=>{
    const id=req.session.user
    try {
      const userId=await User.findById({_id:id})
     const cart =await Cart.findOne({userId:userId._id}).populate("items.productId")
     if(!cart || cart.items.length===0){
      return res.render("loadcart",{cart:null,message:"your cart is empty"})
     }
     res.render("loadcart",{cart,message:null})
    } catch (error) {
      console.log("error",error)
    }
  }

  const checkout=async(req,res)=>{
    try {
      res.render("checkout")
    } catch (error) {
      
    }
  }

  const addtocart = async (req, res) => {
    try {
      console.log(req.query)
      const userId = req.session.user; // Assuming user ID is stored in session
      const productId = req.query.id;
      const  quantity  = req.query.qty;
  
      if (!userId) {
        return res.redirect("/login");
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({success:false,message:"Product not Found"})
      }
  
      if (product.quantity < quantity) {
        return res.status(400).json({
          success:false,
          message:`cannot add more than ${product.quantity} items to the cart`
        })
      }
    
  
      // Find or create cart
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
  
      // Check if product is already in cart
      const existingProductIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );
  
      if (existingProductIndex >= 0) {
        // Update quantity and total price
        cart.items[existingProductIndex].quantity += parseInt(quantity, 10);
        cart.items[existingProductIndex].totalPrice =
          cart.items[existingProductIndex].quantity * cart.items[existingProductIndex].price;
      } else {
        // Add new product to cart
        const newItem = {
          productId,
          quantity: parseInt(quantity, 10),
          price: product.salePrice || product.regularPrice,
          totalPrice: (product.salePrice || product.regularPrice) * parseInt(quantity, 10),
        };
        cart.items.push(newItem);
      }
  
      // Save cart and redirect
      await cart.save();
      // res.redirect(`/productdetails?id=${productId}`);
      res.status(200).json({success:true,message:"product added to cart"})
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.status(500).json({success:false,message:"server error"})
    }
  };
  

  module.exports={
    getProductDetails,
    loadcart,
    checkout,
    addtocart
  }