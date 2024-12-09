const Address=require("../../models/addressSchema")
const User=require("../../models/userSchema")

const userprofile=async(req,res)=>{
  try {
    const id=req.session.user//user id is finded 
    const userId=await User.findById({_id:id}) //finding user is legit ,comparing with session of user(userid is stored )
    const userAddress = await Address.findOne({userId})//checking legit user id is ok in address schema
    res.render("account",{
      user:userId,
      addresses: userAddress?.address || [],
    })
  } catch (error) {
    console.log("error",error)
  }
}
const addaddress=async(req,res)=>{
    try {
      const userid=req.session.user
      const {addresstype,name,city,landmark,state,pincode,phone,altphone}=req.body
      //here  the userid compared
      const userAddress=await Address.findOne({userId:userid})
      if (userAddress) {
        // Add new address to existing array
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
        // If no address exists, create new address record
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


  const loadeditaddress=async(req,res)=>{
    try {
      
      const addressId = req.query.id;
      console.log("address id",addressId)

      // Find the specific address using its ID
      const userAddress = await Address.findOne({ "address._id": addressId });
     console.log(userAddress)
      if (userAddress) {
          const address = userAddress.address.find(a => a._id.toString() === addressId);
          
          if (address) {
              // Render the edit form with the fetched address data
              return res.render("editaddress", { address });
          }
      }

      res.status(404).send('Address not found.');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error.');
  }
  }


  const updateaddress = async (req, res) => {
    try {
        // Get the userId from the session (ensure it's correctly set in session)
        const userId = req.session.user;
        // Get the addressId from the route params
        const addressId  = req.query.id;
        // Get updated address data from the request body
        const updatedData = req.body;

        // Find the address object in the user's address array
        const address = await Address.findOne({
            userId: userId,
            "address._id": addressId,  // Look for the address by _id
        });

        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const addressIndex = address.address.findIndex(addr => addr._id.toString() === addressId);

        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: 'Address not found in the array' });
        }

        // Update the specific address in the array using its index
        await Address.updateOne(
            { userId: userId, "address._id": addressId }, // Ensure it matches the address
            {
                $set: {
                    [`address.${addressIndex}.addresstype`]: updatedData.addresstype,
                    [`address.${addressIndex}.name`]: updatedData.name,
                    [`address.${addressIndex}.city`]: updatedData.city,
                    [`address.${addressIndex}.landmark`]: updatedData.landmark,
                    [`address.${addressIndex}.state`]: updatedData.state,
                    [`address.${addressIndex}.pincode`]: updatedData.pincode,
                    [`address.${addressIndex}.phone`]: updatedData.phone,
                    [`address.${addressIndex}.altphone`]: updatedData.altphone,
                },
            }
        );

        res.status(200).json({ success: true, message: 'Address updated successfully' });
    } catch (error) {
        console.error('Error editing address:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


  module.exports={
    userprofile,
    addaddress,
    updateaddress,
    loadeditaddress

  }