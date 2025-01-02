const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReviewSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true }, // Optional: Store username for convenience
    rating: { type: Number, required: true, min: 1, max: 5 }, // Rating from 1 to 5
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", ReviewSchema);