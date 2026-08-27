require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Middlewares
app.use(express.json()); // برای دریافت JSON از فرانت
app.use(cors()); // برای جلوگیری از خطای CORS بین فرانت و بک‌اند

// اتصال به دیتابیس MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ به دیتابیس متصل شد"))
  .catch((err) => console.log("❌ خطا در اتصال به دیتابیس:", err));

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// استارت سرور
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
});