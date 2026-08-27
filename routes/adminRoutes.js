const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { getAllOrders, updatePrice, approveAndGenerateContract } = require("../controllers/adminController");
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

module.exports = router;