const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // اطلاعات دریافتی از کاربر
  siteType:   { type: String, required: true },
  features:   [{ type: String }],
  budget:     { type: String, required: true },
  deadline:   { type: String, required: true },
  desc:       { type: String, required: true },
  refUrl:     { type: String, default: "" },
  name:       { type: String, required: true },
  contact:    { type: String, required: true },

  // اطلاعات ادمین
  status: {
    type: String,
    enum: ["pending", "reviewed", "signed", "approved", "rejected"],
    default: "pending",
  },
  finalPrice:      { type: Number, default: null },
  contractText:    { type: String, default: null },

  // ✅ امضا
  clientSignature: { type: String, default: null },

  // ✅ توکن لینک امضا
  signToken:       { type: String, default: null },
  signTokenExpiry: { type: Date,   default: null },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
