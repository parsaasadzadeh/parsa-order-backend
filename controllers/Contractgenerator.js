const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { VAZIR_REG_B64, VAZIR_BOLD_B64 } = require("./fonts.js");

// رنگ‌ها
const NAVY  = rgb(0.059, 0.204, 0.376);
const WHITE = rgb(1, 1, 1);
const DARK  = rgb(0.1, 0.1, 0.1);
const GRAY  = rgb(0.4, 0.4, 0.4);
const LIGHT_BG = rgb(0.94, 0.96, 1);

// چون pdf-lib بیدی ندار، از arabic-reshaper پایتون استفاده نمی‌کنیم
// اما pdf-lib با فونت embed می‌تونه فارسی رو نشون بده (بدون reshaping)
// برای RTL درست: متن رو از راست شروع می‌کنیم

async function generateContractPDF(order) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regBytes  = Buffer.from(VAZIR_REG_B64,  "base64");
  const boldBytes = Buffer.from(VAZIR_BOLD_B64, "base64");
  const vazir     = await doc.embedFont(regBytes);
  const vazirBold = await doc.embedFont(boldBytes);

  // A4: 595 x 842
  const W = 595, H = 842;
  const ML = 45, MR = 45; // margin left/right
  const CW = W - ML - MR; // content width

  let page = doc.addPage([W, H]);
  let y = H - 45;

  function newPage() {
    page = doc.addPage([W, H]);
    y = H - 45;
  }

  function checkPage(needed = 60) {
    if (y < needed) newPage();
  }

  // ── helper: متن RTL (pdf-lib راست‌چین native) ──
  function textR(text, x, ty, size, font, color = DARK, maxW = CW) {
    const w = font.widthOfTextAtSize(text, size);
    const startX = x + maxW - w; // راست‌چین
    page.drawText(text, { x: startX, y: ty, size, font, color });
    return w;
  }

  function textC(text, ty, size, font, color = DARK) {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (W - w) / 2, y: ty, size, font, color });
  }

  // ── helper: کادر رنگی برای عنوان ماده ──
  function sectionHeader(title) {
    checkPage(50);
    y -= 12;
    page.drawRectangle({ x: ML, y: y - 4, width: CW, height: 22, color: NAVY });
    textR(title, ML, y + 3, 11, vazirBold, WHITE);
    y -= 26;
  }

  // ── helper: متن بدنه چندخطی (word-wrap دستی) ──
  function bodyText(text, size = 10.5, font = vazir, indent = 0) {
    checkPage(40);
    const maxW = CW - indent;
    const words = text.split(" ");
    let line = "";
    const lines = [];
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      checkPage(20);
      textR(l, ML + indent, y, size, font, DARK, maxW);
      y -= size * 1.8;
    }
    y -= 4;
  }

  function listItem(text) {
    bodyText("• " + text, 10.5, vazir, 10);
  }

  // ── helper: جدول ──
  function drawTable(headers, rows, colWidths) {
    checkPage(headers.length * 28 + rows.length * 26 + 10);
    const rowH = 24, hdrH = 26;
    const startX = ML;

    // هدر
    let cx = startX;
    headers.forEach((h, i) => {
      page.drawRectangle({ x: cx, y: y - hdrH, width: colWidths[i], height: hdrH, color: NAVY });
      page.drawRectangle({ x: cx, y: y - hdrH, width: colWidths[i], height: hdrH,
        borderColor: NAVY, borderWidth: 0.5 });
      const tw = vazirBold.widthOfTextAtSize(h, 10);
      page.drawText(h, { x: cx + (colWidths[i] - tw) / 2, y: y - hdrH + 8, size: 10, font: vazirBold, color: WHITE });
      cx += colWidths[i];
    });
    y -= hdrH;

    // ردیف‌ها
    rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? LIGHT_BG : WHITE;
      cx = startX;
      row.forEach((cell, ci) => {
        page.drawRectangle({ x: cx, y: y - rowH, width: colWidths[ci], height: rowH,
          color: bg, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5 });
        const tw = vazir.widthOfTextAtSize(cell, 9.5);
        page.drawText(cell, { x: cx + (colWidths[ci] - tw) / 2, y: y - rowH + 7,
          size: 9.5, font: vazir, color: DARK });
        cx += colWidths[ci];
      });
      y -= rowH;
    });
    y -= 8;
  }

  const date = new Date().toLocaleDateString("fa-IR");
  const price = Number(order.finalPrice);
  const features = (order.features || []).join("، ");
  const contractNo = `WEB-${String(order._id || "0001").slice(-4).toUpperCase()}`;

  // ════ هدر ════
  textC("بسمه تعالی", y, 11, vazirBold, NAVY);
  y -= 22;
  textC("قرارداد طراحی وب‌سایت", y, 20, vazirBold, NAVY);
  y -= 14;
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 2, color: NAVY });
  y -= 16;

  // تاریخ و شماره
  const dateText = `تاریخ: ${date}`;
  const noText   = `شماره: ${contractNo}`;
  textR(dateText, ML, y, 10, vazir, GRAY, CW / 2);
  const noW = vazir.widthOfTextAtSize(noText, 10);
  page.drawText(noText, { x: ML + CW / 2, y, size: 10, font: vazir, color: GRAY });
  y -= 22;

  // ════ ماده ۱ ════
  sectionHeader("ماده ۱ – مشخصات طرفین قرارداد");
  drawTable(
    ["مجری (طراح)", "کارفرما"],
    [
      ["آقای پارسا اسدزاده",      order.name     || "—"],
      ["طراح و توسعه‌دهنده وب",   "—"],
      ["اطلاعات تماس: محرمانه",   order.contact  || "—"],
    ],
    [CW / 2, CW / 2]
  );
  bodyText(`این قرارداد فی‌مابین آقای پارسا اسدزاده (مجری) و ${order.name} (کارفرما) با اراده‌ی آزاد، بر اساس مفاد این سند منعقد و لازم‌الاجرا می‌گردد.`);

  // ════ ماده ۲ ════
  sectionHeader("ماده ۲ – موضوع قرارداد");
  bodyText(`موضوع این قرارداد طراحی، توسعه و راه‌اندازی وب‌سایت از نوع «${order.siteType}» با امکانات ${features} می‌باشد.`);
  if (order.desc)   bodyText(`شرح تکمیلی: ${order.desc}`);
  if (order.refUrl) bodyText(`سایت مرجع: ${order.refUrl}`, 9.5, vazir);

  // ════ ماده ۳ ════
  sectionHeader("ماده ۳ – شرح خدمات");
  ["طراحی رابط کاربری (UI/UX) مطابق هویت بصری کارفرما",
   "کدنویسی و توسعه فرانت‌اند و بک‌اند وب‌سایت",
   `ادغام امکانات: ${features}`,
   "بهینه‌سازی اولیه برای موتورهای جستجو (SEO On-Page)",
   "تست سازگاری با مرورگرها و ریسپانسیو بودن",
   "تحویل فایل‌ها و آموزش مقدماتی مدیریت سایت",
  ].forEach(listItem);

  // ════ ماده ۴ ════
  sectionHeader("ماده ۴ – زمان‌بندی پروژه");
  bodyText(`مهلت تحویل نهایی: ${order.deadline || "توافقی"}`);
  bodyText("در صورت تأخیر کارفرما در ارائه محتوا یا تأیید مراحل، زمان‌بندی به همان میزان تعویق می‌افتد.");

  // ════ ماده ۵ ════
  sectionHeader("ماده ۵ – مبلغ قرارداد و نحوه پرداخت");
  bodyText(`مبلغ کل قرارداد: ${price.toLocaleString("fa-IR")} تومان`);
  drawTable(
    ["مرحله", "درصد", "مبلغ (تومان)", "زمان پرداخت"],
    [
      ["پیش‌پرداخت",  "۵۰٪", (price * .5).toLocaleString("fa-IR"), "هنگام امضای قرارداد"],
      ["مرحله دوم",   "۳۰٪", (price * .3).toLocaleString("fa-IR"), "پس از تأیید طراحی"],
      ["تسویه نهایی", "۲۰٪", (price * .2).toLocaleString("fa-IR"), "پس از تحویل نهایی"],
    ],
    [CW * .22, CW * .13, CW * .3, CW * .35]
  );

  // ════ ماده ۶ ════
  sectionHeader("ماده ۶ – حقوق مالکیت معنوی");
  bodyText("کلیه حقوق مالکیت معنوی پس از تسویه کامل مبلغ به کارفرما منتقل می‌گردد. مجری حق نمایش نمونه‌کار (بدون افشای اطلاعات محرمانه) را دارد.");

  // ════ ماده ۷ ════
  sectionHeader("ماده ۷ – تعهدات طرفین");
  bodyText("تعهدات مجری:", 10.5, vazirBold);
  ["انجام خدمات با کیفیت مطلوب و استانداردهای روز",
   "رعایت زمان‌بندی و ارائه گزارش پیشرفت",
   "حفظ محرمانگی کامل اطلاعات کارفرما",
  ].forEach(listItem);
  y -= 4;
  bodyText("تعهدات کارفرما:", 10.5, vazirBold);
  ["ارائه به‌موقع محتوا و اطلاعات مورد نیاز",
   "پرداخت اقساط در موعد مقرر",
   "ارائه بازخورد حداکثر ظرف ۷ روز کاری",
  ].forEach(listItem);

  // ════ ماده ۸ ════
  sectionHeader("ماده ۸ – ضمانت و پشتیبانی");
  bodyText("مجری متعهد است پس از تحویل، ۳ ماه پشتیبانی رایگان (رفع اشکالات فنی) ارائه نماید. تغییرات محتوایی و توسعه امکانات جدید مشمول هزینه جداگانه است.");

  // ════ ماده ۹ ════
  sectionHeader("ماده ۹ – شرایط فسخ");
  bodyText("فسخ مستلزم اطلاع‌رسانی کتبی ۱۰ روز قبل است. هزینه‌های انجام‌شده بر اساس توافق تسویه می‌گردد.");

  // ════ ماده ۱۰ ════
  sectionHeader("ماده ۱۰ – حل اختلاف و قانون حاکم");
  bodyText("اختلافات ابتدا از طریق مذاکره، سپس داوری و در نهایت مراجع قضایی جمهوری اسلامی ایران حل‌وفصل می‌شود.");

  // ════ ماده ۱۱ ════
  sectionHeader("ماده ۱۱ – سایر شرایط");
  bodyText("این قرارداد در ۲ نسخه با اعتبار یکسان تنظیم شده. هرگونه اصلاح باید کتبی و با امضای هر دو طرف باشد.");

  // ════ بلوک امضا ════
  checkPage(160);
  y -= 16;
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 1, color: NAVY });
  y -= 14;
  textC("این قرارداد با علم و آگاهی کامل از مفاد آن به صورت رسمی تنظیم شده و لازم‌الاجرا می‌باشد.", y, 10, vazir, DARK);
  y -= 24;

  const sigW = CW / 2 - 8;
  const sigH = 100;
  const sigY = y - sigH;

  // کادر مجری (راست)
  page.drawRectangle({ x: ML + CW / 2 + 8, y: sigY, width: sigW, height: sigH,
    borderColor: NAVY, borderWidth: 1 });
  textR("امضای مجری", ML + CW / 2 + 8, sigY + sigH - 18, 11, vazirBold, NAVY, sigW);
  textR("آقای پارسا اسدزاده", ML + CW / 2 + 8, sigY + sigH - 36, 10, vazir, DARK, sigW);
  textR(`تاریخ: ${date}`, ML + CW / 2 + 8, sigY + 10, 9, vazir, GRAY, sigW);

  // کادر کارفرما (چپ)
  page.drawRectangle({ x: ML, y: sigY, width: sigW, height: sigH,
    borderColor: NAVY, borderWidth: 1 });
  textR("امضای کارفرما", ML, sigY + sigH - 18, 11, vazirBold, NAVY, sigW);
  textR(order.name || "کارفرما", ML, sigY + sigH - 36, 10, vazir, DARK, sigW);

  // امضای دیجیتال (اگر موجود)
  if (order.clientSignature) {
    const imgData = order.clientSignature.replace(/^data:image\/\w+;base64,/, "");
    const imgBuf  = Buffer.from(imgData, "base64");
    const img = await doc.embedPng(imgBuf);
    page.drawImage(img, { x: ML + 4, y: sigY + 20, width: sigW - 8, height: 40 });
  } else {
    textR("[ فضای امضا ]", ML, sigY + sigH / 2 - 5, 9.5, vazir, rgb(0.7,0.7,0.7), sigW);
  }
  textR(`تاریخ: ${date}`, ML, sigY + 10, 9, vazir, GRAY, sigW);

  y = sigY - 16;
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: rgb(0.8,0.8,0.8) });
  y -= 12;
  textC("این سند به صورت الکترونیکی صادر شده و برای طرفین لازم‌الاجرا می‌باشد.", y, 8.5, vazir, GRAY);

  return await doc.save();
}

// تست
const sampleOrder = {
  _id: "6a913c82",
  name: "شرکت فناوران نوین",
  contact: "09121234567",
  siteType: "Landing Page",
  features: ["چندزبانه", "وبلاگ", "فرم تماس"],
  finalPrice: 12000000,
  deadline: "۴ هفته",
  desc: "سایت معرفی محصولات",
  refUrl: "https://example.com",
};

generateContractPDF(sampleOrder).then(bytes => {
  require("fs").writeFileSync("/tmp/contract_final.pdf", bytes);
  console.log("✅ Done! size:", bytes.length);
}).catch(console.error);

module.exports = { generateContractPDF };
