const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// 🔴 تغییر اول: تابع downloadContract را به ایمپورت‌ها اضافه کردیم
const { 
  getAllOrders, 
  updatePrice, 
  approveAndGenerateContract, 
  downloadContract 
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");

// لاگین - تنها route بدون نیاز به توکن
router.post("/login", (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "رمز اشتباه است" });
  }

  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // توکن ۷ روز معتبره
  );

  res.status(200).json({ message: "خوش آمدید پارسا!", token });
});

// بقیه routeها محافظت شده هستن
router.get("/orders", authMiddleware, getAllOrders);
router.put("/orders/:id/price", authMiddleware, updatePrice);
router.post("/orders/:id/approve", authMiddleware, approveAndGenerateContract);

// 🔴 تغییر دوم: مسیر دانلود فایل PDF را اینجا تعریف کردیم (حل خطای 404)
router.get("/orders/:id/download-contract", authMiddleware, downloadContract);

module.exports = router;
