const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const dotenv = require("dotenv").config();
const crypto = require("crypto");
const Wallet=require("../../models/walletSchema")

const razorpayInstance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

//product details page
const getProductDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const id = req.query.id;
    const productData = await Product.findOne({ _id: id });
    const category = await Category.findOne({ _id: productData.category });

    const finalSalePrice = productData.salePrice;
    const regularPrice = productData.regularPrice;

    const recommendedProducts = await Product.find({
      category: productData.category,
      _id: { $ne: productData._id },
    }).limit(4);

    res.render("product-details", {
      product: productData,
      cat: category,
      recProducts: recommendedProducts,
      user: user,
      finalSalePrice: Math.floor(finalSalePrice),
      regularPrice: Math.floor(regularPrice),
    });
  } catch (error) {
    res.redirect("/pagenotfound");
  }
};

//cart loading
const loadcart = async (req, res) => {
  const id = req.session.user;
  try {
    const userId = await User.findById({ _id: id });
    const cart = await Cart.findOne({ userId: userId._id }).populate(
      "items.productId"
    );
    if (!cart || cart.items.length === 0) {
      return res.render("loadcart", {
        cart: null,
        message: "your cart is empty",
      });
    }
    res.render("loadcart", { cart, message: null });
  } catch (error) {
    console.log("error", error);
  }
};

//add to cart
const addtocart = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.query.id;
    const quantity = parseInt(req.query.qty, 10);

    if (!userId) {
      return res
        .status(404)
        .json({ success: false, message: "login to add product to cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if requested quantity exceeds product stock
    if (quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more than ${product.quantity} items to the cart.`,
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    console.log(cart.items)
    console.log(cart.items.length,"this is the cart to setting new logic")


    if(cart.items.length>3){
      return res.status(400).json({
        success:false,
        message:"connot add more than 4 items in cart"
      })
    }


    // Check if product is already in cart
    const existingProduct = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingProduct) {
      // Check if the total quantity exceeds product stock
      if (existingProduct.quantity + quantity > product.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more than ${product.quantity} items to the cart.`,
        });
      }

      // Update quantity and total price
      existingProduct.quantity += quantity;
      existingProduct.totalPrice =
        existingProduct.quantity * (product.salePrice || product.regularPrice);
    } else {
      // Add new product to cart
      const newItem = {
        productId,
        quantity,
        price: product.salePrice || product.regularPrice,
        totalPrice: (product.salePrice || product.regularPrice) * quantity,
      };
      cart.items.push(newItem);
    }
    for(let i=0;i<cart.items.length;i++){
      if(cart.items[i].quantity>5){
        return res.status(400).json({
          success:false,
          message:"Cannot add more than 5 quantity for a product"
        })
          }
    }
    // Save cart
    await cart.save();

    res.status(200).json({ success: true, message: "Product added to cart" });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//updating product to cart
const updatecart = async (req, res) => {
  try {
    const { productId, newQuantity } = req.body;
    const userId = req.session.user;
    const product = await Product.findById(productId);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Login to update cart." });
    }

    const cart = await Cart.findOne({ userId: userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found." });
    }



    const item = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not in cart." });
    }

    if (newQuantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity." });
    }
    if (newQuantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `only ${product.quantity} units are available in stock`,
      });
    }

    item.quantity = parseInt(newQuantity);
    item.totalPrice = item.price * item.quantity;

    for(let i=0;i<cart.items.length;i++){
      if(cart.items[i].quantity>5){
        return res.status(400).json({
          success:false,
          message:"Cannot add more than 5 quantity for a product"
        })
          }
    }

    await cart.save();

    return res.json({ success: true, message: "cart updated successfully" }); // Redirect to the cart page
  } catch (error) {
    console.log("error", error);
    res
      .status(500)
      .json({
        success: false,
        message: "server error. please try again later",
      });
  }
};

//delete product from cart

const deletecart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Login to delete items from cart." });
    }

    const cart = await Cart.findOne({ userId: userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found." });
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();

    res.redirect("/cart"); // Redirect to the cart page
  } catch (error) {
    console.log("error delete cart", error);
  }
};

//get checkout page

const getcheckout = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    const addressDoc = await Address.findOne({ userId: user });
    const address = addressDoc ? addressDoc.address : [];

    let totalPrice = 0;
    let couponMessage = "";

    if (req.query.id) {
      const product = await Product.findOne({
        _id: req.query.id,
        isBlocked: false,
      });
      const quantity = req.query.quantity
        ? parseInt(req.query.quantity, 10)
        : 1;

      if (!product) {
        return res.redirect("/page-not-found");
      }

      totalPrice = product.salePrice * quantity;

      // Store the product in the session temporarily
      req.session.selectedProduct = {
        productId: product._id,
        quantity: quantity,
        salePrice: product.salePrice,
        totalPrice: totalPrice,
      };

      return res.render("checkout", {
        cart: null,
        product,
        address: address,
        totalPrice,
        couponMessage,
      });
    } else {
      // Logic for cart
      const cartItems = await Cart.findOne({ userId: user }).populate(
        "items.productId"
      );
      if (!cartItems) {
        return res.render("checkout", {
          cart: null,
          products: [],
          address: address,
          totalPrice,
          product: null,
          couponMessage,
        });
      }

      totalPrice = cartItems.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      return res.render("checkout", {
        cart: cartItems,
        products: cartItems.items,
        address: address,
        totalPrice,
        product: null,
        couponMessage,
      });
    }
  } catch (error) {
    console.log("Error loading checkout page:", error);
    res.status(500).send("Server Error");
  }
};

//place order 

const placeorder = async (req, res) => {
  try {
    const { addressId, paymentMethod, amount, totalPrice, couponCode } = req.body;
    console.log(req.body,"req body of place order")
    console.log(paymentMethod,"payment method Check")
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    // Validate address
    const addressDoc = await Address.findOne({
      userId,
      "address._id": addressId,
    });
    if (!addressDoc) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address selected" });
    }
    const selectedAddress = addressDoc.address.find(
      (addr) => addr._id.toString() === addressId
    );

    let finalPrice = totalPrice;
    let items = [];
    let cart;
   if(paymentMethod==="cod"){
    if(finalPrice>1000){
      return res.status(400).json({
        success:false,
        message:"Order Above 1000 Doesnt allowed for Cash on delivery User Another Mode "
      })
    }
   }


    // Apply coupon discount if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        isList: true,
        isExpired: false,
      });
      if (coupon) {
        const discount = coupon.offerPrice;
        finalPrice -= discount;
      }
    }

    // Check if a "Buy Now" product exists in the session
    if (req.session.selectedProduct) {
      const product = await Product.findById(
        req.session.selectedProduct.productId
      );
      if (product) {
        const selectedQuantity = req.session.selectedProduct.quantity;

        if (selectedQuantity > product.quantity) {
          return res
            .status(400)
            .json({ success: false, message: "Insufficient stock available" });
        }

        items.push({
          product: product._id,
          quantity: selectedQuantity,
          price: product.salePrice,
          totalPrice: selectedQuantity * product.salePrice,
        });

        // Deduct stock immediately for "Buy Now"
        product.quantity -= selectedQuantity;
        await product.save();
      }
      req.session.selectedProduct = null; // Clear the session after placing the order
    } else {
      // Retrieve user's cart
      cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Cart is empty" });
      }

      items = cart.items.map((cartItem) => ({
        product: cartItem.productId._id,
        quantity: cartItem.quantity,
        price: cartItem.productId.salePrice,
        totalPrice: cartItem.quantity * cartItem.productId.salePrice,
      }));

      // Deduct stock for all items in the cart
      for (const cartItem of cart.items) {
        const product = await Product.findById(cartItem.productId._id);
        if (product) {
          product.quantity -= cartItem.quantity;
          await product.save();
        }
      }
    }
    console.log(items,"checking is there any quantity in items")

    

    const tempcoupon=await Coupon.findOne({name:couponCode,isList:true,isExpired:false})
    
    if (paymentMethod === "cod") {

      const order = new Order({
        userId,
        orderedItem: items,
        totalPrice: finalPrice,
        finalAmount: finalPrice,
        address: selectedAddress._id,
        invoiceDate: new Date(),
        status: "processing",
        discount:tempcoupon?.offerPrice||0,
        couponApplied:!!tempcoupon

      });

      const savedOrder = await order.save();
      console.log(savedOrder,"checking the quantity of cart")

      // Clear the cart if COD is selected
      if (cart) {
        cart.items = [];
        await cart.save();
      }

      return res.json({ success: true, orderId: savedOrder.orderId });//changed gereeeee
    }

    //check for wallet payments
    if (paymentMethod === "wallet") {
      // Check if the user has enough balance in the wallet
      const userWallet = await Wallet.findOne({ userId });
      if (!userWallet || userWallet.balance < finalPrice) {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient wallet balance" });
      }

      // Deduct amount from wallet
      userWallet.balance -= finalPrice;
      userWallet.transactions.push({
        amount: finalPrice,
        type: "debit",
        description: "Order payment",
      });
      await userWallet.save();

      // Create order with "paid" status
      const order = new Order({
        userId,
        orderedItem: items,
        totalPrice: finalPrice,
        finalAmount: finalPrice,
        address: selectedAddress._id,
        invoiceDate: new Date(),
        status: "Wallet-Payment", // Order marked as paid
        discount:tempcoupon?.offerPrice||0,
        couponApplied:!!tempcoupon
      });

      const savedOrder = await order.save();

      // Clear the cart if wallet is used for payment
      if (cart) {
        cart.items = [];
        await cart.save();
      }

      return res.json({ success: true, orderId: savedOrder.orderId });
    }

    // Razorpay payment initialization
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amount, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    const coupondiscount=await Coupon.findOne({name:couponCode,isList:true,isExpired:false})
    const order = new Order({
      userId,
      orderedItem: items,
      totalPrice: amount/100,
      finalAmount: amount/100,
      address: selectedAddress._id,
      invoiceDate: new Date(),
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
      discount:coupondiscount?.offerPrice || 0,
      couponApplied:!!coupondiscount
    });

    const savedOrder = await order.save();

    // Clear the cart after Razorpay payment initialization
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      orderId: savedOrder.orderId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
};


//coupon apply

const ApplyCoupon = async (req, res) => {
  try {
    const { couponCode, totalPrice } = req.body;
    const userId = new mongoose.Types.ObjectId(req.session.user);
    console.log(userId);

    const coupon = await Coupon.findOne({
      name: couponCode,
      isList: true,
      isExpired: false,
    });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid or Expired Coupon" });
    }
    if (coupon.userId.includes(userId)) {
      return res.json({ success: false, message: "Coupon is Already Used" });
    }

    if (totalPrice >= coupon.minimumPrice) {
      const discountPrice = totalPrice - coupon.offerPrice;
      coupon.userId.push(userId);
      await coupon.save();

      return res.json({
        success: true,
        message: "coupon applied successfully",
        newTotalPrice: discountPrice,
      });
    } else {
      return res.json({
        success: false,
        message: `Minimum Order Value for this Coupon is ₹${coupon.minimumPrice}`,
      });
    }
  } catch (error) {
    console.error("Error Applying Coupon ", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

//verify razorpay
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, addressId } =
      req.body;
    // Verify payment signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    // Update order status to "confirmed"
    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found"});
    }

    order.status = "completed";
    order.addressId = addressId; // Ensure address is saved
    await order.save();

    res.json({
      success: true,
      message: "Payment successful and order confirmed",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};

//order success page
const ordersuccess = async (req, res) => {
  try {
    res.render("ordersuccess");
  } catch (error) {
    console.log("error", error);
  }
};

//order failed

const orderfailed=async(req,res)=>{
  try {
    res.render("orderfailed")
  } catch (error) {
    console.log("error",error)
  }
}

//add address in checkout flow

const AddAddressCheckout=async(req,res)=>{
  try {
    const userid=req.session.user
    const {addresstype,name,city,landmark,state,pincode,phone,altphone}=req.body
    
    const userAddress=await Address.findOne({userId:userid})
    if (userAddress) {
      userAddress.address.push({
        addresstype,
        name,
        city,
        landmark,
        state,
        pincode,
        phone,
        altphone,
      });
      await userAddress.save();
    } else {
      const newAddress = new Address({
        userId: userid,
        address: [
          {
            addresstype,
            name,
            city,
            landmark,
            state,
            pincode,
            phone,
            altphone,
          },
        ],
      });
      await newAddress.save();
    }
    res.redirect("/cart/checkout");
  } catch (error) {
    console.log("error",error)
  }
}

module.exports = {
  getProductDetails,
  loadcart,
  addtocart,
  updatecart,
  deletecart,
  getcheckout,
  placeorder,
  ordersuccess,
  ApplyCoupon,
  verifyRazorpayPayment,
  AddAddressCheckout,
  orderfailed
};
