const mongoose = require("mongoose");
const env = require("dotenv");
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("db connected");
  } catch (error) {
    console.log("db connection error",error.message);
  }
};

module.exports = connectDB;