const Wallet=require("../../models/walletSchema")
const User=require("../../models/userSchema")

//load wallet
const LoadWallet = async (req, res) => {
    try {
      const userId = req.session.user; 
  
      const user = await User.findById(userId).populate('walletId');
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      if (!user.walletId) {
        const wallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
        await wallet.save();
  
        user.walletId = wallet._id;
        await user.save();
      }
  
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
      const userId = req.session.user; 
  
      if (!amount || amount <= 0) {
        return res.status(400).send("Invalid amount");
      }
  
      const user = await User.findById(userId).populate('walletId');
  
      if (!user || !user.walletId) {
        return res.status(404).json({ success: false, message: "User or wallet not found" });
      }
  
      user.walletId.balance += parseFloat(amount);
  
      
      user.walletId.transactions.push({
        type: "credit",
        amount: parseFloat(amount),
        description: "Added money to wallet",
        date: new Date(),
      });
  
      await user.walletId.save();
  
      res.redirect("/wallet"); 
    } catch (error) {
      console.error("Error adding money to wallet:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  


module.exports={
    LoadWallet,
    addWalletMoney
}