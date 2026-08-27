const Order = require("../models/Order");
const PDFDocument = require("pdfkit");

// 🔴 این خط جادویی برای حل خطای Vercel است (ورسل را مجبور می‌کند فونت را پاک نکند)
try {
  require("pdfkit/js/standard-fonts/Helvetica.cjs");
} catch (e) {}

// تابع کمکی برای ساخت و استریم فایل PDF قرارداد
const generateContractPDF = (order, res) => {
  // تنظیم هدرهای HTTP برای دریافت فایل PDF در مرورگر
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=contract_${order._id}.pdf`
  );

  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // هدایت مستقیم خروجی PDF به ریسپانس HTTP
  doc.pipe(res);

  const createdDate = new Date(order.createdAt || Date.now()).toLocaleDateString("fa-IR");
  const priceFormatted = order.finalPrice
    ? Number(order.finalPrice).toLocaleString("fa-IR") + " Toman"
    : "-";

  // ساخت ساختار محتوایی قرارداد
  doc.fontSize(20).text("OFFICIAL SERVICE CONTRACT", { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(12);
  doc.text(`Contract ID: ${order._id}`);
  doc.text(`Customer Name: ${order.name || "-"}`);
  doc.text(`Contact Info: ${order.contact || "-"}`);
  doc.text(`Site Type: ${order.siteType || "-"}`);
  doc.text(`Budget Range: ${order.budget || "-"}`);
  doc.text(`Final Approved Price: ${priceFormatted}`);
  doc.text(`Deadline: ${order.deadline || "-"}`);
  doc.text(`Date of Issue: ${createdDate}`);
  doc.moveDown();

  if (order.features && order.features.length > 0) {
    doc.text(`Requested Features: ${order.features.join(", ")}`);
    doc.moveDown();
  }

  doc.text(`Description / Requirements:`);
  doc.text(order.desc || "No additional requirements specified.");
  doc.moveDown(2);

  doc.text("Status: APPROVED & SIGNED", { align: "right" });
  doc.text(`Parsa Development Team`, { align: "right" });

  // اتمام ساخت PDF و ارسال به کلاینت
  doc.end();
};

// ۱. دریافت لیست تمام سفارش‌ها
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "خطا در دریافت سفارش‌ها", error: error.message });
  }
};

// ۲. ویرایش و ثبت قیمت نهایی توسط مدیر
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

// ۳. تایید سفارش و صدور قرارداد PDF
exports.approveAndGenerateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice) {
      return res.status(400).json({ message: "ابتدا باید قیمت نهایی را تعیین کنید" });
    }

    // تغییر وضعیت به تایید شده
    order.status = "approved";
    await order.save();

    // صدور فایل PDF
    generateContractPDF(order, res);
  } catch (error) {
    console.error("Contract Generation Error:", error);
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};

// ۴. دانلود مجدد قرارداد (برای سفارش‌های تایید شده)
exports.downloadContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });

    // تولید و ارسال مجدد فایل PDF
    generateContractPDF(order, res);
  } catch (error) {
    console.error("Contract Download Error:", error);
    res.status(500).json({ message: "خطا در دانلود فایل قرارداد", error: error.message });
  }
};
