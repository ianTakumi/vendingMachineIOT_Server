import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  rfid_tag: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },

  credits: {
    type: Number,
    default: 0,
    min: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now, // This is OK here
  },

  updatedAt: {
    type: Date,
    default: Date.now, // This is OK here
  },
});

export const User = mongoose.model("User", userSchema);
