const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // اطلاعات دریافتی از کاربر
  siteType: { type: String, required: true },
  features: [{ type: String }],
  budget: { type: String, required: true },
  deadline: { type: String, required: true },
  desc: { type: String, required: true },
  refUrl: { type: String, default: "" },
  name: { type: String, required: true },
  contact: { type: String, required: true },

  // اطلاعات بخش ادمین (داشبورد تو)
  status: { 
    type: String, 
    enum: ["pending", "reviewed", "approved", "rejected"], 
    default: "pending" 
  },
  finalPrice: { type: Number, default: null }, // قیمتی که تو تعیین می‌کنی
  contractText: { type: String, default: null }, // متن قرارداد تولید شده
}, { timestamps: true }); // زمان ثبت سفارش رو اتوماتیک ذخیره میکنه

module.exports = mongoose.model("Order", orderSchema);