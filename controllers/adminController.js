const Order = require("../models/Order");
const puppeteer = require("puppeteer");

// تابع کمکی برای ساخت و استریم فایل PDF با استفاده از Puppeteer
const generateContractPDF = async (order, res) => {
  try {
    const formattedPrice = order.finalPrice ? Number(order.finalPrice).toLocaleString("fa-IR") : "---";
    const features = order.features ? order.features.join("، ") : "استاندارد";

    // --- طراحی قالب HTML قرارداد بر اساس فایل اصلی ---
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
          
          body { 
            font-family: 'Vazirmatn', sans-serif; 
            padding: 40px; 
            color: #222; 
            line-height: 1.8; 
            font-size: 13px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
          }
          .contract-number { 
            text-align: left; 
            font-size: 12px; 
            margin-bottom: -20px; 
          }
          .title { 
            font-size: 22px; 
            font-weight: bold; 
          }
          .section-title { 
            font-weight: bold; 
            font-size: 15px; 
            margin-top: 25px; 
            margin-bottom: 10px;
            background-color: #f5f5f5;
            padding: 5px 10px;
            border-right: 3px solid #0056b3;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
            font-size: 12px;
          }
          table, th, td { 
            border: 1px solid #444; 
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
          }
          th, td { 
            padding: 8px; 
            text-align: center; 
          }
          ul {
            margin-top: 5px;
            margin-bottom: 5px;
            padding-right: 20px;
          }
          .signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="contract-number">شماره قرارداد: 1001-WEB</div>
        <div class="header">
          <div>بسمه تعالی</div>
          <div class="title">قرارداد طراحی وب سایت</div>
        </div>
        
        <div class="section-title">ماده ۱ - مشخصات طرفین قرارداد</div>
        <p>
          این قرارداد فی مابین <strong>آقای پارسا اسدزاده</strong> (طراح و توسعه‌دهنده وب) از این پس «مجری» و <strong>${order.name || "کارفرما"}</strong> با اطلاعات تماس <strong>${order.contact || "---"}</strong> از این پس «کارفرما» در تاریخ <strong>۱۴۰۵/۰۶/۰۵</strong> با اراده‌ی آزاد و بدون اکراه بر اساس مفاد مندرج در این سند منعقد و لازم‌الاجرا می‌گردد.
        </p>

        <div class="section-title">ماده ۲ - موضوع قرارداد</div>
        <p>موضوع این قرارداد عبارت است از طراحی، توسعه و راه‌اندازی یک وب‌سایت از نوع «<strong>${order.siteType || "Landing Page"}</strong>» مطابق با نیازمندی‌های اعلام شده توسط کارفرما با امکانات: ${features}</p>
        <p>توضیحات تکمیلی: ${order.desc || "ندارد"}</p>

        <div class="section-title">ماده ۳ - شرح خدمات</div>
        <ul>
          <li>طراحی رابط کاربری (UI) و تجربه کاربری (UX) مطابق با هویت بصری کارفرما</li>
          <li>کدنویسی و توسعه فرانت‌اند و بک‌اند وب‌سایت</li>
          <li>راه‌اندازی و پیکربندی هاستینگ و دامنه در صورت درخواست</li>
          <li>ادغام امکانات درخواست شده</li>
          <li>بهینه‌سازی اولیه برای موتورهای جستجو (SEO On-Page)</li>
          <li>تست عملکرد، سازگاری با مرورگرها و ریسپانسیو بودن سایت</li>
          <li>تحویل فایل‌های پروژه و آموزش مقدماتی مدیریت سایت به کارفرما</li>
        </ul>

        <div class="section-title">ماده ۴ - زمان بندی پروژه</div>
        <p>مهلت اجرا و تحویل نهایی پروژه بدون عجله حدود <strong>۴ هفته</strong> می‌باشد. در صورت تأخیر از سوی کارفرما در ارائه محتوا یا تأیید مراحل، زمان‌بندی به همان میزان به تعویق خواهد افتاد.</p>

        <div class="section-title">ماده ۵ - مبلغ قرارداد و نحوه پرداخت</div>
        <p>مبلغ کل قرارداد توافق شده <strong>${formattedPrice} تومان</strong> می‌باشد.</p>
        <table>
          <tr>
            <th>مرحله</th>
            <th>درصد</th>
            <th>زمان پرداخت</th>
          </tr>
          <tr>
            <td>پیش پرداخت</td>
            <td>۵۰٪</td>
            <td>هنگام امضای قرارداد</td>
          </tr>
          <tr>
            <td>مرحله دوم</td>
            <td>۳۰٪</td>
            <td>پس از تأیید طراحی</td>
          </tr>
          <tr>
            <td>تسویه نهایی</td>
            <td>۲۰٪</td>
            <td>پس از تحویل نهایی</td>
          </tr>
        </table>

        <div class="section-title">ماده ۶ - حقوق مالکیت معنوی</div>
        <p>وب‌سایت طراحی شده شامل کدها، طرح‌های گرافیکی و محتوا پس از پرداخت کامل مبلغ قرارداد به کارفرما منتقل می‌گردد. مجری حق دارد نمونه کارهای پروژه را بدون افشای اطلاعات محرمانه در پورتفولیوی خود نمایش دهد.</p>

        <div class="section-title">ماده ۸ - ضمانت کیفیت و پشتیبانی</div>
        <p>مجری متعهد می‌گردد پس از تحویل نهایی به مدت <strong>۳ ماه</strong> خدمات پشتیبانی رایگان شامل رفع اشکالات فنی مرتبط با کدنویسی را ارائه نماید. خدمات پشتیبانی شامل تغییرات محتوایی، افزودن بخش‌های جدید یا توسعه امکانات نمی‌شود و مشمول هزینه جداگانه خواهد بود.</p>

        <div class="section-title">مواد ۹، ۱۰ و ۱۱ - شرایط فسخ، حل اختلاف و سایر شرایط</div>
        <p>تمایل هر یک از طرفین به فسخ قرارداد ملزم به اطلاع‌رسانی کتبی حداقل ۱۰ روز قبل می‌باشد. در صورت بروز هرگونه اختلاف، طرفین ابتدا از طریق مذاکره مستقیم سعی در رفع آن خواهند نمود. این قرارداد در ۲ نسخه با اعتبار یکسان تنظیم گردیده است.</p>

        <div style="text-align: center; margin-top: 40px;">این قرارداد با علم و آگاهی کامل از مفاد آن به صورت رسمی تنظیم شده و لازم‌الاجرا می‌باشد.</div>
        
        <div class="signatures">
          <div>امضای مجری<br><br>آقای پارسا اسدزاده</div>
          <div>امضای کارفرما<br><br>${order.name || "کارفرما"}</div>
        </div>
      </body>
      </html>
    `;

    // راه‌اندازی مرورگر Puppeteer برای ساخت PDF
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true 
    });
    const page = await browser.newPage();
    
    // لود کردن محتوای HTML در صفحه
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    
    // تولید فایل PDF
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    await browser.close();

    // تنظیم هدرها و ارسال فایل به کلاینت
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=contract_${order._id}.pdf`);
    res.end(pdfBuffer);
    
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "خطا در تولید فایل PDF", error: error.message });
    }
  }
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

    order.status = "approved";
    await order.save();

    // توجه: حتما باید await گذاشته شود
    await generateContractPDF(order, res);
  } catch (error) {
    console.error("Contract Generation Error:", error);
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};

// ۴. دانلود مجدد قرارداد
exports.downloadContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });

    // توجه: حتما باید await گذاشته شود
    await generateContractPDF(order, res);
  } catch (error) {
    console.error("Contract Download Error:", error);
    res.status(500).json({ message: "خطا در دانلود فایل قرارداد", error: error.message });
  }
};
