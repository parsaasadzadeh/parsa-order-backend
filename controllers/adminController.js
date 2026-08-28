const Order = require("../models/Order");
const { generateContractPDF } = require("./contractGenerator"); 
// contractGenerator.js باید کنار adminController باشد

// ════════════════════════════════════════════════════════
// ۱. دریافت لیست تمام سفارش‌ها
// ════════════════════════════════════════════════════════
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "خطا در دریافت سفارش‌ها", error: error.message });
  }
};

// ════════════════════════════════════════════════════════
// ۲. ویرایش قیمت نهایی
// ════════════════════════════════════════════════════════
exports.updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice } = req.body;

    if (!finalPrice || isNaN(finalPrice)) {
      return res.status(400).json({ message: "لطفاً قیمت معتبر وارد کنید" });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { finalPrice: Number(finalPrice), status: "reviewed" },
      { returnDocument: "after" }
    );

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    res.status(200).json({ message: "قیمت با موفقیت بروزرسانی شد", order });
  } catch (error) {
    res.status(500).json({ message: "خطا در ثبت قیمت", error: error.message });
  }
};

// ════════════════════════════════════════════════════════
// ۳. تأیید و صدور قرارداد PDF
// ════════════════════════════════════════════════════════
exports.approveAndGenerateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice) {
      return res.status(400).json({ message: "ابتدا باید قیمت نهایی را تعیین کنید" });
    }

    order.status = "approved";
    await order.save();

    const pdfBytes = await generateContractPDF(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=contract_${order._id}.pdf`);
    res.end(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Contract Error:", error);
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};

// ════════════════════════════════════════════════════════
// ۴. دانلود مجدد قرارداد
// ════════════════════════════════════════════════════════
exports.downloadContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (order.status !== "approved") {
      return res.status(400).json({ message: "قرارداد هنوز تأیید نشده است" });
    }

    const pdfBytes = await generateContractPDF(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=contract_${order._id}.pdf`);
    res.end(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ message: "خطا در دانلود قرارداد", error: error.message });
  }
};

// ════════════════════════════════════════════════════════
// ۵. ثبت امضای کارفرما و صدور PDF نهایی
// ════════════════════════════════════════════════════════
exports.submitSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const { signature } = req.body; // data:image/png;base64,...

    if (!signature || !signature.startsWith("data:image")) {
      return res.status(400).json({ message: "امضا معتبر نیست" });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { clientSignature: signature, status: "signed" },
      { returnDocument: "after" }
    );

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });

    const pdfBytes = await generateContractPDF(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=contract_signed_${order._id}.pdf`);
    res.end(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Signature Error:", error);
    res.status(500).json({ message: "خطا در ثبت امضا", error: error.message });
  }
};
