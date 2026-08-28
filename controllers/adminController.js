const Order = require("../models/Order");
const PDFDocument = require("pdfkit");
const path = require("path");

// ─── مسیر فونت‌های فارسی ────────────────────────────────────────────────────
// فونت‌ها رو داخل پروژه در پوشه‌ی assets/fonts بذار
const FONT_REG  = path.join(__dirname, "../assets/fonts/Vazirmatn-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/Vazirmatn-Bold.ttf");

// ─── رنگ‌ها ─────────────────────────────────────────────────────────────────
const NAVY  = "#0f3460";
const DARK  = "#1a1a2e";
const GRAY  = "#555555";
const LIGHT = "#f0f4ff";

// ─── تابع کمکی: متن RTL (بدون نیاز به بیدی – PDFKit فونت OTF/TTF فارسی رو مستقیم رندر می‌کنه) ──
function rtl(text) {
  return String(text || "");
}

// ─── تابع اصلی ساخت PDF ──────────────────────────────────────────────────────
function generateContractPDF(order) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: "قرارداد طراحی وب‌سایت",
        Author: "پارسا اسدزاده",
        Subject: `قرارداد ${order.name}`,
      },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ثبت فونت
    doc.registerFont("Vazir",     FONT_REG);
    doc.registerFont("VazirBold", FONT_BOLD);

    const W = doc.page.width - 100; // عرض قابل استفاده
    const price = Number(order.finalPrice);
    const features = (order.features || []).join("، ");
    const date = new Date().toLocaleDateString("fa-IR");
    const contractNo = `WEB-${String(order._id).slice(-4).toUpperCase()}`;

    // ══════════════════════════════════════════════════════════
    // هدر
    // ══════════════════════════════════════════════════════════
    doc
      .font("VazirBold").fontSize(11).fillColor(DARK)
      .text(rtl("بسمه تعالی"), { align: "center" });

    doc.moveDown(0.3);
    doc
      .font("VazirBold").fontSize(20).fillColor(NAVY)
      .text(rtl("قرارداد طراحی وب‌سایت"), { align: "center" });

    doc.moveDown(0.3);
    // خط جداکننده ضخیم
    doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).strokeColor(NAVY).stroke();
    doc.moveDown(0.5);

    // شماره قرارداد و تاریخ
    const metaY = doc.y;
    doc.font("Vazir").fontSize(10).fillColor(GRAY);
    doc.text(rtl(`تاریخ: ${date}`),       50,  metaY, { width: W/2, align: "left"  });
    doc.text(rtl(`شماره: ${contractNo}`), 300, metaY, { width: W/2, align: "right" });
    doc.moveDown(1.2);

    // ══════════════════════════════════════════════════════════
    // تابع کمکی: عنوان ماده
    // ══════════════════════════════════════════════════════════
    function sectionTitle(title) {
      doc.moveDown(0.4);
      const y = doc.y;
      // پس‌زمینه
      doc.rect(50, y, W, 22).fill(NAVY);
      doc
        .font("VazirBold").fontSize(11).fillColor("white")
        .text(rtl(title), 55, y + 5, { width: W - 10, align: "right" });
      doc.y = y + 28;
      doc.fillColor(DARK);
    }

    // تابع کمکی: متن بدنه
    function bodyText(text, indent = 0) {
      doc
        .font("Vazir").fontSize(10.5).fillColor(DARK)
        .text(rtl(text), 50 + indent, doc.y, {
          width: W - indent,
          align: "right",
          lineGap: 4,
        });
      doc.moveDown(0.3);
    }

    // تابع کمکی: آیتم لیست
    function listItem(text) {
      bodyText(`• ${text}`, 10);
    }

    // تابع کمکی: جدول ساده
    function drawTable(headers, rows, colWidths) {
      const startX  = 50;
      const rowH    = 24;
      const headerH = 26;
      let y = doc.y;

      // هدر جدول
      let x = startX;
      headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], headerH).fill(NAVY);
        doc
          .font("VazirBold").fontSize(10).fillColor("white")
          .text(rtl(h), x + 4, y + 7, { width: colWidths[i] - 8, align: "center" });
        x += colWidths[i];
      });
      y += headerH;

      // ردیف‌های جدول
      rows.forEach((row, ri) => {
        x = startX;
        const bg = ri % 2 === 0 ? LIGHT : "white";
        row.forEach((cell, ci) => {
          doc.rect(x, y, colWidths[ci], rowH).fill(bg).stroke("#cccccc");
          doc
            .font("Vazir").fontSize(10).fillColor(DARK)
            .text(rtl(cell), x + 4, y + 6, { width: colWidths[ci] - 8, align: "center" });
          x += colWidths[ci];
        });
        y += rowH;
      });

      doc.y = y + 6;
    }

    // ══════════════════════════════════════════════════════════
    // ماده ۱ – مشخصات طرفین
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۱ – مشخصات طرفین قرارداد");
    drawTable(
      ["مجری (طراح)", "کارفرما"],
      [
        ["آقای پارسا اسدزاده", rtl(order.name)],
        ["طراح و توسعه‌دهنده وب",  "—"],
        ["اطلاعات تماس: محرمانه",  rtl(order.contact)],
      ],
      [W / 2, W / 2]
    );
    bodyText(
      `این قرارداد فی‌مابین آقای پارسا اسدزاده (مجری) و ${order.name} (کارفرما) ` +
      `با اراده‌ی آزاد و بدون اکراه، بر اساس مفاد مندرج در این سند، منعقد و لازم‌الاجرا می‌گردد.`
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۲ – موضوع قرارداد
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۲ – موضوع قرارداد");
    bodyText(
      `موضوع این قرارداد طراحی، توسعه و راه‌اندازی وب‌سایت از نوع «${order.siteType}» ` +
      `با امکانات ${features} می‌باشد.`
    );
    if (order.desc) bodyText(`شرح تکمیلی: ${order.desc}`);
    if (order.refUrl) {
      doc.font("Vazir").fontSize(9.5).fillColor(GRAY)
        .text(rtl(`سایت مرجع: ${order.refUrl}`), { align: "right" });
      doc.moveDown(0.3);
    }

    // ══════════════════════════════════════════════════════════
    // ماده ۳ – شرح خدمات
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۳ – شرح خدمات");
    [
      "طراحی رابط کاربری (UI/UX) مطابق با هویت بصری کارفرما",
      "کدنویسی و توسعه فرانت‌اند و بک‌اند وب‌سایت",
      `ادغام امکانات درخواست‌شده: ${features}`,
      "بهینه‌سازی اولیه برای موتورهای جستجو (SEO On-Page)",
      "تست سازگاری با مرورگرها و ریسپانسیو بودن سایت",
      "تحویل فایل‌های پروژه و آموزش مقدماتی مدیریت سایت",
    ].forEach(listItem);

    // ══════════════════════════════════════════════════════════
    // ماده ۴ – زمان‌بندی
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۴ – زمان‌بندی پروژه");
    bodyText(`مهلت تحویل نهایی پروژه: ${order.deadline || "توافقی"}`);
    bodyText(
      "در صورت تأخیر کارفرما در ارائه محتوا یا تأیید مراحل، " +
      "زمان‌بندی به همان میزان به تعویق می‌افتد."
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۵ – مبلغ و پرداخت
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۵ – مبلغ قرارداد و نحوه پرداخت");
    bodyText(`مبلغ کل قرارداد: ${price.toLocaleString("fa-IR")} تومان`);
    drawTable(
      ["مرحله", "درصد", "مبلغ (تومان)", "زمان پرداخت"],
      [
        ["پیش‌پرداخت",  "۵۰٪", (price * 0.5).toLocaleString("fa-IR"), "هنگام امضای قرارداد"],
        ["مرحله دوم",   "۳۰٪", (price * 0.3).toLocaleString("fa-IR"), "پس از تأیید طراحی"],
        ["تسویه نهایی", "۲۰٪", (price * 0.2).toLocaleString("fa-IR"), "پس از تحویل نهایی"],
      ],
      [W * 0.2, W * 0.12, W * 0.3, W * 0.38]
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۶ – مالکیت معنوی
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۶ – حقوق مالکیت معنوی");
    bodyText(
      "کلیه حقوق مالکیت معنوی پس از تسویه کامل مبلغ به کارفرما منتقل می‌گردد. " +
      "مجری حق نمایش نمونه‌کار (بدون افشای اطلاعات محرمانه) را دارد."
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۷ – تعهدات
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۷ – تعهدات طرفین");
    doc.font("VazirBold").fontSize(10.5).fillColor(NAVY)
      .text(rtl("تعهدات مجری:"), { align: "right" });
    doc.moveDown(0.2);
    [
      "انجام خدمات با کیفیت مطلوب و مطابق استانداردهای روز",
      "رعایت زمان‌بندی و ارائه گزارش پیشرفت در مراحل کلیدی",
      "حفظ محرمانگی کامل اطلاعات کارفرما",
    ].forEach(listItem);

    doc.moveDown(0.3);
    doc.font("VazirBold").fontSize(10.5).fillColor(NAVY)
      .text(rtl("تعهدات کارفرما:"), { align: "right" });
    doc.moveDown(0.2);
    [
      "ارائه به‌موقع محتوا، تصاویر و اطلاعات مورد نیاز",
      "پرداخت اقساط در موعد مقرر",
      "ارائه بازخورد حداکثر ظرف ۷ روز کاری",
    ].forEach(listItem);

    // ══════════════════════════════════════════════════════════
    // ماده ۸ – ضمانت و پشتیبانی
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۸ – ضمانت کیفیت و پشتیبانی");
    bodyText(
      "مجری متعهد است پس از تحویل نهایی، ۳ ماه خدمات پشتیبانی رایگان (رفع اشکالات فنی) ارائه نماید. " +
      "تغییرات محتوایی و توسعه امکانات جدید مشمول هزینه جداگانه است."
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۹ – فسخ
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۹ – شرایط فسخ قرارداد");
    bodyText(
      "فسخ قرارداد مستلزم اطلاع‌رسانی کتبی حداقل ۱۰ روز قبل است. " +
      "هزینه‌های انجام‌شده تا زمان فسخ بر اساس توافق طرفین تسویه می‌گردد."
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۱۰ – حل اختلاف
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۱۰ – حل اختلاف و قانون حاکم");
    bodyText(
      "اختلافات ابتدا از طریق مذاکره، سپس داوری و در نهایت مراجع قضایی " +
      "جمهوری اسلامی ایران حل‌وفصل می‌شود."
    );

    // ══════════════════════════════════════════════════════════
    // ماده ۱۱ – سایر شرایط
    // ══════════════════════════════════════════════════════════
    sectionTitle("ماده ۱۱ – سایر شرایط");
    bodyText(
      "این قرارداد در ۲ نسخه با اعتبار یکسان تنظیم شده. " +
      "هرگونه اصلاح باید کتبی و با امضای هر دو طرف باشد."
    );

    // ══════════════════════════════════════════════════════════
    // بلوک امضا
    // ══════════════════════════════════════════════════════════
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).strokeColor(NAVY).stroke();
    doc.moveDown(0.5);

    doc
      .font("Vazir").fontSize(10).fillColor(DARK)
      .text(
        rtl("این قرارداد با علم و آگاهی کامل از مفاد آن به صورت رسمی تنظیم شده و لازم‌الاجرا می‌باشد."),
        { align: "center" }
      );
    doc.moveDown(1);

    // ── جدول امضا ──
    const sigY  = doc.y;
    const sigW  = W / 2 - 10;
    const sigH  = 90;

    // کادر مجری (راست)
    doc.rect(300, sigY, sigW, sigH).stroke(NAVY);
    doc.font("VazirBold").fontSize(11).fillColor(NAVY)
      .text(rtl("امضای مجری"), 300, sigY + 8, { width: sigW, align: "center" });
    doc.font("Vazir").fontSize(10).fillColor(DARK)
      .text(rtl("آقای پارسا اسدزاده"), 300, sigY + 28, { width: sigW, align: "center" });
    doc.font("Vazir").fontSize(9).fillColor(GRAY)
      .text(rtl(`تاریخ: ${date}`), 300, sigY + 70, { width: sigW, align: "center" });

    // کادر کارفرما (چپ)
    doc.rect(50, sigY, sigW, sigH).stroke(NAVY);
    doc.font("VazirBold").fontSize(11).fillColor(NAVY)
      .text(rtl("امضای کارفرما"), 50, sigY + 8, { width: sigW, align: "center" });
    doc.font("Vazir").fontSize(10).fillColor(DARK)
      .text(rtl(order.name), 50, sigY + 28, { width: sigW, align: "center" });

    // ── بلوک امضای دیجیتال (canvas) – اگر موجود باشد ──
    if (order.clientSignature) {
      // order.clientSignature = data:image/png;base64,....
      const imgData = order.clientSignature.replace(/^data:image\/\w+;base64,/, "");
      const imgBuf  = Buffer.from(imgData, "base64");
      doc.image(imgBuf, 60, sigY + 38, { width: sigW - 20, height: 38 });
    } else {
      doc.font("Vazir").fontSize(9).fillColor(GRAY)
        .text(rtl("[ فضای امضا ]"), 50, sigY + 48, { width: sigW, align: "center" });
    }

    doc.font("Vazir").fontSize(9).fillColor(GRAY)
      .text(rtl(`تاریخ: ${date}`), 50, sigY + 70, { width: sigW, align: "center" });

    // فوتر
    doc.moveDown(6);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).strokeColor("#cccccc").stroke();
    doc.font("Vazir").fontSize(8.5).fillColor(GRAY)
      .text(
        rtl("این سند به صورت الکترونیکی صادر شده و کلیه مفاد آن برای طرفین لازم‌الاجرا می‌باشد."),
        { align: "center" }
      );

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

// ۱. دریافت لیست تمام سفارش‌ها
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "خطا در دریافت سفارش‌ها", error: error.message });
  }
};

// ۲. ویرایش قیمت نهایی
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
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    res.status(200).json({ message: "قیمت با موفقیت بروزرسانی شد", order });
  } catch (error) {
    res.status(500).json({ message: "خطا در ثبت قیمت", error: error.message });
  }
};

// ۳. تأیید و صدور قرارداد PDF
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

    const pdfBuffer = await generateContractPDF(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contract_${order._id}.pdf`
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Contract Error:", error);
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};

// ۴. دانلود مجدد قرارداد (از داشبورد پارسا)
exports.downloadContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (order.status !== "approved") {
      return res.status(400).json({ message: "قرارداد هنوز تأیید نشده است" });
    }

    const pdfBuffer = await generateContractPDF(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contract_${order._id}.pdf`
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ message: "خطا در دانلود قرارداد", error: error.message });
  }
};

// ۵. ثبت امضای کارفرما (canvas → base64)
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
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });

    // قرارداد نهایی با امضا رو بساز و بده
    const pdfBuffer = await generateContractPDF(order);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contract_signed_${order._id}.pdf`
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Signature Error:", error);
    res.status(500).json({ message: "خطا در ثبت امضا", error: error.message });
  }
};
