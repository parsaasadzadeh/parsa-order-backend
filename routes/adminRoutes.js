const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
// ✅ FIX: حذف import اضافی crypto که استفاده نمی‌شد
const {
  getAllOrders,
  updatePrice,
  approveAndGenerateContract,
  downloadContract,
  generateSignLink,
  getOrderByToken,
  submitClientSignature,
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// ── لاگین ──────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "رمز اشتباه است" });
  }
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.status(200).json({ message: "خوش آمدید پارسا!", token });
});

// ── روت‌های ادمین (نیاز به توکن) ──────────────────────
router.get("/orders",                       authMiddleware, getAllOrders);
router.put("/orders/:id/price",             authMiddleware, updatePrice);
router.post("/orders/:id/approve",          authMiddleware, approveAndGenerateContract);
router.get("/orders/:id/download-contract", authMiddleware, downloadContract);
router.post("/orders/:id/generate-link",    authMiddleware, generateSignLink);

// ── روت‌های عمومی امضا (بدون توکن — برای کارفرما) ────
router.get("/sign/:token",  getOrderByToken);
router.post("/sign/:token", submitClientSignature);

module.exports = router;
