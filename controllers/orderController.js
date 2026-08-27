const Order = require("../models/Order");

// ثبت سفارش جدید توسط کاربر
exports.createOrder = async (req, res) => {
  try {
    const { siteType, features, budget, deadline, desc, refUrl, name, contact } = req.body;

    const newOrder = new Order({
      siteType,
      features,
      budget,
      deadline,
      desc,
      refUrl,
      name,
      contact,
    });

    await newOrder.save();
    res.status(201).json({ message: "سفارش با موفقیت ثبت شد", orderId: newOrder._id });
  } catch (error) {
    res.status(500).json({ message: "خطا در ثبت سفارش", error: error.message });
  }
};