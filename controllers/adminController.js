const Order = require("../models/Order");
const PDFDocument = require("pdfkit");

// 🔴 این خط جادویی برای حل خطای Vercel است (ورسل را مجبور می‌کند فونت را پاک نکند)
try {
  require("pdfkit/js/standard-fonts/Helvetica.cjs");
} catch (e) {}
// تابع کمکی برای ساخت و استریم فایل PDF قرارداد رسمی
const generateContractPDF = (order, res) => {
  // تنظیم هدرهای HTTP برای دانلود فایل PDF با نام فارسی یا انگلیسی صحیح
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=contract_${order._id}.pdf`
  );

  // ایجاد سند با حاشیه‌های مناسب
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  // آدرس فایل فونت فارسی در پروژه
  const fontPath = path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf");

  try {
    // ثبت و اعمال فونت فارسی
    doc.registerFont("Vazir", fontPath);
    doc.font("Vazir");
  } catch (err) {
    console.error("Font loading error:", err.message);
  }

  // --- شروع طراحی متن رسمی قرارداد بر اساس قالب شما ---
  
  doc.fontSize(14).text("شماره قرارداد: 1001-WEB", { align: "right" });
  doc.fontSize(16).text("بسمه تعالی", { align: "center" });
  doc.fontSize(18).text("قرارداد طراحی وب سایت", { align: "center" });
  doc.moveDown(1);

  doc.fontSize(11);
  doc.text("ماده ۱ - مشخصات طرفین قرارداد", { bold: true });
  doc.text(`کارفرما: ${order.name || "---"} | اطلاعات تماس: ${order.contact || "---"}`);
  doc.text("مجری (طراح): آقای پارسا اسدزاده - طراح و توسعه‌دهنده وب");
  doc.text(`تاریخ صدور: ۱۴۰۵/۰۶/۰۵`);
  doc.moveDown(0.5);

  doc.text("ماده ۲ - موضوع قرارداد");
  doc.text(`موضوع این قرارداد عبارت است از طراحی، توسعه و راه‌اندازی یک وب‌سایت از نوع "${order.siteType || "Landing Page"}" با امکانات: ${order.features ? order.features.join(", ") : "استاندارد"}`);
  doc.moveDown(0.5);

  doc.text("ماده ۳ - شرح خدمات");
  doc.text("۱. طراحی رابط کاربری (UI) و تجربه کاربری (UX)");
  doc.text("۲. کدنویسی و توسعه فرانت‌اند و بک‌اند وب‌سایت");
  doc.text("۳. راه‌اندازی و پیکربندی اولیه و ادغام امکانات درخواست شده");
  doc.text(`توضیحات تکمیلی / نیازمندی‌ها: ${order.desc || "ندارد"}`);
  doc.moveDown(0.5);

  doc.text("ماده ۴ - زمان بندی پروژه");
  doc.text("مهلت اجرا و تحویل نهایی پروژه حدود ۴ هفته می‌باشد.");
  doc.moveDown(0.5);

  const formattedPrice = order.finalPrice ? Number(order.finalPrice).toLocaleString("fa-IR") : "---";
  doc.text("ماده ۵ - مبلغ قرارداد و نحوه پرداخت");
  doc.text(`مبلغ کل قرارداد (توافق شده): ${formattedPrice} تومان`);
  doc.moveDown(0.5);

  doc.text("ماده ۶ - حقوق مالکیت معنوی");
  doc.text("وب‌سایت طراحی شده پس از پرداخت کامل مبلغ قرارداد به کارفرما منتقل می‌گردد.");
  doc.moveDown(0.5);

  doc.text("ماده ۸ - ضمانت کیفیت و پشتیبانی");
  doc.text("مجری متعهد می‌گردد پس از تحویل نهایی به مدت ۳ ماه خدمات پشتیبانی رایگان ارائه نماید.");
  doc.moveDown(1);

  doc.text("این قرارداد با علم و آگاهی کامل از مفاد آن به امضا رسیده است.", { align: "center" });
  doc.moveDown(1.5);

  doc.text("امضای مجری: پارسا اسدزاده                   امضای کارفرما: " + (order.name || "کارفرما"), { align: "center" });

  // پایان سند
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
