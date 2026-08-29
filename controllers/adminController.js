const crypto = require("crypto");
const Order = require("../models/Order");
const { generateContractPDF } = require("./contractGenerator");

// ════════════════════════════════════════════════════════
// ۱. لیست سفارش‌ها
// ════════════════════════════════════════════════════════
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (e) {
    res.status(500).json({ message: "خطا در دریافت سفارش‌ها", error: e.message });
  }
};

// ════════════════════════════════════════════════════════
// ۲. ثبت قیمت
// ════════════════════════════════════════════════════════
exports.updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice } = req.body;
    if (!finalPrice || isNaN(finalPrice))
      return res.status(400).json({ message: "قیمت معتبر وارد کنید" });

    // ✅ FIX: Mongoose از { new: true } استفاده می‌کنه، نه returnDocument
    const order = await Order.findByIdAndUpdate(
      id,
      { finalPrice: Number(finalPrice), status: "reviewed" },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    res.status(200).json({ message: "قیمت ثبت شد", order });
  } catch (e) {
    res.status(500).json({ message: "خطا در ثبت قیمت", error: e.message });
  }
};

// ════════════════════════════════════════════════════════
// ۳. ساخت لینک امضا (پارسا میزنه — کارفرما میگیره)
// ════════════════════════════════════════════════════════
exports.generateSignLink = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice)
      return res.status(400).json({ message: "ابتدا قیمت را تعیین کنید" });

    // ✅ FIX: crypto درست require شده بالا — این الان کار می‌کنه
    const token  = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعت

    order.signToken       = token;
    order.signTokenExpiry = expiry;
    await order.save();

    const signUrl = `${process.env.FRONTEND_URL}/sign?token=${token}`;
    res.status(200).json({ signUrl, expiresAt: expiry });
  } catch (e) {
    res.status(500).json({ message: "خطا", error: e.message });
  }
};

// ════════════════════════════════════════════════════════
// ۴. خوندن اطلاعات سفارش با توکن (صفحه امضای کارفرما)
// ════════════════════════════════════════════════════════
exports.getOrderByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const order = await Order.findOne({
      signToken: token,
      signTokenExpiry: { $gt: new Date() },
    });
    if (!order)
      return res.status(404).json({ message: "لینک نامعتبر یا منقضی شده است" });

    res.status(200).json({
      name:          order.name,
      siteType:      order.siteType,
      features:      order.features,
      finalPrice:    order.finalPrice,
      deadline:      order.deadline,
      alreadySigned: !!order.clientSignature,
    });
  } catch (e) {
    res.status(500).json({ message: "خطا", error: e.message });
  }
};

// ════════════════════════════════════════════════════════
// ۵. ثبت امضای کارفرما
// ════════════════════════════════════════════════════════
exports.submitClientSignature = async (req, res) => {
  try {
    const { token } = req.params;
    const { signature } = req.body;

    if (!signature || !signature.startsWith("data:image"))
      return res.status(400).json({ message: "امضا معتبر نیست" });

    const order = await Order.findOne({
      signToken: token,
      signTokenExpiry: { $gt: new Date() },
    });
    if (!order)
      return res.status(404).json({ message: "لینک نامعتبر یا منقضی شده" });
    if (order.clientSignature)
      return res.status(400).json({ message: "این قرارداد قبلاً امضا شده" });

    order.clientSignature = signature;
    order.status          = "signed";
    order.signToken       = undefined;
    order.signTokenExpiry = undefined;
    await order.save();

    res.status(200).json({ message: "امضا با موفقیت ثبت شد" });
  } catch (e) {
    res.status(500).json({ message: "خطا", error: e.message });
  }
};

// ════════════════════════════════════════════════════════
// ۶. صدور قرارداد نهایی (بعد از امضای کارفرما — پارسا میزنه)
// ════════════════════════════════════════════════════════
exports.approveAndGenerateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order  = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice)
      return res.status(400).json({ message: "قیمت تعیین نشده" });
    if (!order.clientSignature)
      return res.status(400).json({ message: "کارفرما هنوز امضا نکرده" });

    order.status = "approved";
    await order.save();

    const pdfBytes = await generateContractPDF(order);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contract_${order._id}.pdf`
    );
    res.end(Buffer.from(pdfBytes));
  } catch (e) {
    console.error("Contract Error:", e);
    res.status(500).json({ message: "خطا در صدور قرارداد", error: e.message });
  }
};

// ════════════════════════════════════════════════════════
// ۷. دانلود مجدد
// ════════════════════════════════════════════════════════
exports.downloadContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order  = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });

    const pdfBytes = await generateContractPDF(order);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contract_${order._id}.pdf`
    );
    res.end(Buffer.from(pdfBytes));
  } catch (e) {
    res.status(500).json({ message: "خطا در دانلود", error: e.message });
  }
};
