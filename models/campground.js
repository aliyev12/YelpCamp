const mongoose = require("mongoose");

// SCHEMA SETUP
const campgroundSchema = new mongoose.Schema({
  name: String,
  price: String,
  image: String,
  imageId: String,
  description: String,
  location: String,
  city: String,
  country: String,
  lat: Number,
  lng: Number,
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    }
  ],
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }
  ],
  rating: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Campground", campgroundSchema);
