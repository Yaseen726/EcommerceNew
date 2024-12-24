const Address=require("../../models/addressSchema")
const User=require("../../models/userSchema")
const Order=require("../../models/orderSchema")
const PDFDocument=require("pdfkit")
const fs=require("fs")
const mongoose=require("mongoose")
const ObjectId=mongoose.Types.ObjectId
const Product=require("../../models/productSchema")
const path=require("path")
const Razorpay=require("razorpay")
const dotenv = require("dotenv").config();
const razorpay=new Razorpay({
  key_id:process.env.KEY_ID,
  key_secret:process.env.KEY_SECRET
})
const crypto=require("crypto")

//user profile

const userprofile = async (req, res) => {
  try {
    const userId = req.session.user;

    const user = await User.findById(userId);

    const userAddress = await Address.findOne({ userId });

    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 2; 

    const totalOrders = await Order.countDocuments({ 
      address: { $in: userAddress?.address.map(addr => addr._id) || [] }
    });

    const userOrders = await Order.find({
      address: { $in: userAddress?.address.map(addr => addr._id) || [] },
    })
      .populate("orderedItem.product")
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("account", {
      user,
      addresses: userAddress?.address || [],
      orders: userOrders || [],
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("Error loading user profile:", error);
    res.status(500).send("Unable to load user profile");
  }
};

//invoice Download

const DownloadInvoice = async (req, res) => {
  const { orderId } = req.body; // Get orderId from the form submission

  if (!orderId) {
    return res.status(400).send('Order ID is required');
  }

  try {
    // Find the order by orderId
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Check if the order status is 'delivered'
    if (order.status !== 'delivered') {
      return res.status(400).send('Invoice can only be downloaded for delivered orders');
    }

    console.log(order.userId, "this is order id of user");
    console.log(order.address, "this is address id of user");

    // Fetch the full address details
    const addressOfOrder = await Address.findOne(
      {
        userId: new ObjectId(order.userId),
        "address._id": new ObjectId(order.address),
      },
      { "address.$": 1 } // Fetch only the matching address
    );

    if (!addressOfOrder) {
      return res.status(404).send('Address not found for the given order');
    }

    // Extract the specific address from the response
    const address = addressOfOrder.address[0];

    // Fetch product names for ordered items
    const enrichedOrderedItems = await Promise.all(
      order.orderedItem.map(async (item) => {
        const product = await Product.findOne({ _id: item.product });
        return {
          productName: product ? product.productName : "Unknown Product",
          price: item.price,
        };
      })
    );

    // Prepare invoice data
    const invoiceData = {
      orderId: order.orderId,
      userId: order.userId,
      orderedItem: enrichedOrderedItems,
      totalPrice: order.totalPrice,
      finalAmount: order.finalAmount,
      address: `${address.name}, ${address.city}, ${address.landmark}, ${address.state}, ${address.pincode}, Phone: ${address.phone}, Alt-Phone: ${address.altphone}`,
      invoiceDate: order.invoiceDate,
      createdOn: order.createdOn,
    };

    
    const invoiceBuffer = await generateInvoice(invoiceData); // Adjust as per your PDF generation function

    // Set headers to prompt file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice_' + orderId + '.pdf"');
    res.send(invoiceBuffer); // Send the generated PDF to the client
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Error generating invoice');
  }
};

async function generateInvoice(invoiceData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Pipe the document to a buffer
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Register fonts
    const fontPath = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
    doc.registerFont('NotoSans', fontPath);
    doc.font('NotoSans');

    // Title of the invoice
    doc.fontSize(20).text('Invoice', { align: 'center' }).moveDown();

    // Add Order Information
    doc.fontSize(12).text(`Order ID: ${invoiceData.orderId}`);
    doc.text(`Invoice Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}`);
    doc.fontSize(12).text(`Total Price: ₹${invoiceData.totalPrice}`);
    doc.text(`Final Amount: ₹${invoiceData.finalAmount}`).moveDown();

    // Add billing address
    doc.text('Billing Address:', { underline: true }).moveDown();
    doc.text(invoiceData.address).moveDown();

    // Add Table Header
    doc.text('Ordered Items:', { underline: true }).moveDown();

    // Create a table for ordered items
    invoiceData.orderedItem.forEach(item => {
      doc.text(`Product: ${item.productName}`);
      doc.text(`Price: ₹${item.price}`).moveDown();
    });

    // Add Footer with terms and contact info
    doc.moveDown();
    doc.text('Thank you for shopping with us!', { align: 'center' });
    doc.text('For support, contact us at support@LuxoraMarket.com', { align: 'center' });

    doc.end();
  });
}


const cancelorder = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Find the order by orderId and populate userId (no need to populate wallet)
    const order = await Order.findOne({ orderId }).populate("userId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Prevent cancellation of delivered or already canceled orders
    if (order.status === "delivered" || order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Order cannot be canceled" });
    }

    // Mark order as canceled

    if(order.status==="processing"){
      order.status="cancelled"
      await order.save()
      return res.json({success:true,message:"cancelled successfully"});
    }
    order.status = "cancelled";
    await order.save();

    // Refund the final amount to the user's wallet
    const user = await User.findById(order.userId).populate("walletId");

    if (!user || !user.walletId) {
      return res.status(404).json({ success: false, message: "User or wallet not found" });
    }


    // Update wallet balance
    user.walletId.balance += order.finalAmount;

    // Add transaction for refund
    user.walletId.transactions.push({
      amount: order.finalAmount,
      type: "credit", // Credit to the wallet
      description: `Refund for canceled order ${order.orderId}`,
      date: new Date(),
    });

    await user.walletId.save(); // Save the updated wallet

    res.json({
      success: true,
      message: "Order canceled and amount refunded to wallet successfully",
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
};




//add address
const addaddress=async(req,res)=>{
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
      res.redirect("/account");
    } catch (error) {
      console.log("error",error)
    }
  }

//load address
  const loadeditaddress=async(req,res)=>{
    try {
      
      const addressId = req.query.id;
      const userAddress = await Address.findOne({ "address._id": addressId });
      if (userAddress) {
          const address = userAddress.address.find(a => a._id.toString() === addressId);
          
          if (address) {
              return res.render("editaddress", { address });
          }
      }

      res.status(404).send('Address not found.');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error.');
  }
  }
  //update address

  const updateaddress = async (req, res) => {
    try {
      const userId = req.session.user;
      const { addressId, addresstype, name, city, landmark, state, pincode, phone, altphone } = req.body;
  
      const updatedAddress = {
        addresstype,
        name,
        city,
        landmark,
        state,
        pincode,
        phone,
        altphone,
      };
  
      let addressDoc = await Address.findOne({ userId });
  
      if (addressDoc) {
        if (addressId) {
          const addressIndex = addressDoc.address.findIndex((addr) => addr._id.toString() === addressId);
          if (addressIndex !== -1) {
            addressDoc.address[addressIndex] = { ...addressDoc.address[addressIndex]._doc, ...updatedAddress };
          } else {
            return res.status(404).json({ message: "Address not found" });
          }
        } else {
          addressDoc.address.push(updatedAddress);
        }
        await addressDoc.save();
        res.status(200).json({ message: "Address updated successfully", address: addressDoc });
      } else {
        addressDoc = new Address({
          userId,
          address: [updatedAddress],
        });
        await addressDoc.save();
        res.status(201).json({ message: "Address created successfully", address: addressDoc });
      }
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ message: "Error saving address" });
    }
  };
  

//delete address
const deleteaddress = async (req, res) => {
  try {
    const userId = req.session.user; 
    const addressId = req.query.id; 

    if (!userId || !addressId) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const result = await Address.updateOne(
      { userId: userId }, 
      { $pull: { address: { _id: addressId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.status(200).json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const updateUserProfile = async (req, res) => {
  try {
    const userId = req.query.id; 
    const { dname, phone } = req.body; 

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: dname, phone },
      { new: true } 
    );

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    res.redirect("/account"); 
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).send({ message: "Server error while updating profile" });
  }
};

const RetryPayment=async(req,res)=>{
  const { orderId, amount } = req.body; // orderId: your internal order ID, amount in INR

    try {
        // Fetch your order from the database
        const existingOrder = await Order.findOne({ orderId });
        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Create a Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: orderId, // Use your internal orderId for reference
        });

        // Save the Razorpay order ID in your database
        existingOrder.razorpayOrderId = razorpayOrder.id; // Add a field for Razorpay's order ID
        await existingOrder.save();

        res.status(200).json({ 
            success: true, 
            razorpayOrderId: razorpayOrder.id, 
            amount: razorpayOrder.amount 
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ success: false, message: "Failed to create Razorpay order." });
    }
}

const verifyPayment=async(req,res)=>{
  const { orderId } = req.params;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    try {
        // Fetch the order using Razorpay's `order_id` stored in your database
        const order = await Order.findOne({ orderId, razorpayOrderId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or mismatched." });
        }

        // Verify Razorpay payment signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.KEY_SECRET) // Replace with your Razorpay Secret
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (generatedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: "Invalid payment signature." });
        }

        // Update the order status to completed
        order.status = "completed";
        await order.save();

        return res.status(200).json({ success: true, message: "Payment verified and order completed." });
    } catch (error) {
        console.error("Error in payment-success:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
}


  module.exports={
    userprofile,
    addaddress,
    updateaddress,
    loadeditaddress,
    deleteaddress,
    cancelorder,
    updateUserProfile,
    DownloadInvoice,
    RetryPayment,
    verifyPayment
  }