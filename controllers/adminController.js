const Order = require("../models/Order");
const PDFDocument = require("pdfkit"); // کتابخانه ساخت PDF در Node.js
const path = require("path");

// ۱. دریافت لیست تمام سفارش‌ها برای نمایش در داشبورد
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "خطا در دریافت سفارش‌ها", error: error.message });
  }
};

// ۲. ویرایش قیمت توسط مدیر
exports.updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice } = req.body;

    // استفاده از returnDocument به جای new برای رفع اخطار Mongoose
    const order = await Order.findByIdAndUpdate(
      id, 
      { finalPrice, status: "reviewed" }, 
      { returnDocument: "after" }
    );
    
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    res.status(200).json({ message: "قیمت با موفقیت بروزرسانی شد", order });
  } catch (error) {
    res.status(500).json({ message: "خطا در ثبت قیمت", error: error.message });
  }
};

// ۳. تایید و صدور قرارداد (مستقیم در Node.js بدون پایتون و بدون ذخیره فایل)
exports.approveAndGenerateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice) return res.status(400).json({ message: "ابتدا باید قیمت نهایی را تعیین کنید" });

    // بروزرسانی وضعیت سفارش
    order.status = "approved";
    await order.save();

    // تنظیم هدرهای HTTP برای دانلود فایل PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=contract_${id}.pdf`);

    // ایجاد سند PDF در حافظه
    const doc = new PDFDocument({ margin: 50 });

    // هدایت مستقیم جریان خروجی PDF به ریسپانس مرورگر (بدون ذخیره در دیسک)
    doc.pipe(res);

    // نکته: برای نمایش حروف فارسی، فایل فونت (مثلاً Vazirmatn.ttf) را در پروژه بگذارید و آدرس دهید
    /*
    const fontPath = path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf");
    doc.font(fontPath);
    */

    // ساخت محتوای PDF
    const date = new Date().toLocaleDateString("fa-IR");

    doc.fontSize(18).text(`Contract - Order #${order._id}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Customer Name: ${order.name}`);
    doc.text(`Contact: ${order.contact}`);
    doc.text(`Site Type: ${order.siteType}`);
    doc.text(`Final Price: ${order.finalPrice}`);
    doc.text(`Deadline: ${order.deadline || "-"}`);
    doc.text(`Description: ${order.desc || "-"}`);
    doc.text(`Date: ${date}`);

    // اتمام ساخت PDF و ارسال نهایی
    doc.end();

  } catch (error) {
    console.error("Contract Generation Error:", error);
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};
