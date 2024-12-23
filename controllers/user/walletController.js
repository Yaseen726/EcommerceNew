const Wallet=require("../../models/walletSchema")
const User=require("../../models/userSchema")
const LoadWallet = async (req, res) => {
    try {
      const userId = req.session.user; // Assuming user ID is stored in the session
  
      // Fetch the user document and populate walletId
      const user = await User.findById(userId).populate('walletId');
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // If no wallet exists, create a new one and link it to the user
      if (!user.walletId) {
        const wallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
        await wallet.save();
  
        // Link wallet to the user
        user.walletId = wallet._id;
        await user.save();
      }
  
      // Access the wallet directly from the populated user document
      const wallet = user.walletId;
      res.render("Wallet", { wallet });
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  



  const addWalletMoney = async (req, res) => {
    try {
      const { amount } = req.body;
      const userId = req.session.user; // Get user ID from session
  
      // Validate the amount
      if (!amount || amount <= 0) {
        return res.status(400).send("Invalid amount");
      }
  
      // Fetch the user document
      const user = await User.findById(userId).populate('walletId');
  
      if (!user || !user.walletId) {
        return res.status(404).json({ success: false, message: "User or wallet not found" });
      }
  
      // Add the amount to the wallet balance
      user.walletId.balance += parseFloat(amount);
  
      // Add the transaction entry
      user.walletId.transactions.push({
        type: "credit",
        amount: parseFloat(amount),
        description: "Added money to wallet",
        date: new Date(),
      });
  
      // Save the updated wallet document
      await user.walletId.save();
  
      res.redirect("/wallet"); // Redirect to wallet page
    } catch (error) {
      console.error("Error adding money to wallet:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  


module.exports={
    LoadWallet,
    addWalletMoney
}