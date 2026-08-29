const { PDFDocument, rgb, degrees } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const reshaper = require("arabic-reshaper");
const { VAZIR_REG_B64, VAZIR_BOLD_B64 } = require("./fonts.js");

// ── رنگ‌ها ──────────────────────────────────────────────
const NAVY     = rgb(0.059, 0.204, 0.376);
const WHITE    = rgb(1, 1, 1);
const DARK     = rgb(0.08, 0.08, 0.08);
const GRAY     = rgb(0.45, 0.45, 0.45);
const LIGHT_BG = rgb(0.94, 0.96, 1.0);
const GREEN    = rgb(0.06, 0.72, 0.51);

// ── RTL helper ──────────────────────────────────────────
function rtl(text) {
  if (!text) return "";
  return String(text)
    .split("\n")
    .map((line) => {
      const reshaped = reshaper.convertArabic(line);
      return reshaped.split(" ").reverse().join(" ");
    })
    .join("\n");
}

// ── تابع اصلی ───────────────────────────────────────────
async function generateContractPDF(order) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regBytes  = Buffer.from(VAZIR_REG_B64,  "base64");
  const boldBytes = Buffer.from(VAZIR_BOLD_B64, "base64");
  const F  = await doc.embedFont(regBytes);
  const FB = await doc.embedFont(boldBytes);

  const PW = 595, PH = 842;
  const ML = 45, MR = 45;
  const CW = PW - ML - MR;

  let page, y;

  function addPage() {
    page = doc.addPage([PW, PH]);
    y = PH - 48;
  }
  addPage();

  function checkY(need = 60) {
    if (y < need + 45) addPage();
  }

  // ── متن RTL با wrap ─────────────────────────────────
  function drawText(raw, { x = ML, width = CW, size = 10.5,
    font = F, color = DARK, align = "right", lineH = null } = {}) {
    
    const lh = lineH || size * 1.85;
    const text = rtl(raw);
    const words = text.split(" ").filter(Boolean);
    const lines = [];
    let cur = "";

    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > width - 4 && cur) {
        lines.push(cur); cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);

    for (const line of lines) {
      checkY(lh);
      const tw = font.widthOfTextAtSize(line, size);
      let dx;
      if (align === "right")  dx = x + width - tw;
      else if (align === "center") dx = x + (width - tw) / 2;
      else dx = x;
      page.drawText(line, { x: dx, y, size, font, color });
      y -= lh;
    }
    y -= 2;
  }

  function drawCenter(raw, size, font = F, color = DARK) {
    const text = rtl(raw);
    const tw = font.widthOfTextAtSize(text, size);
    checkY(size * 2);
    page.drawText(text, { x: (PW - tw) / 2, y, size, font, color });
    y -= size * 1.8;
  }

  // ── عنوان ماده ──────────────────────────────────────
  function section(title) {
    checkY(50);
    y -= 8;
    page.drawRectangle({ x: ML, y: y - 2, width: CW, height: 23, color: NAVY });
    const t = rtl(title);
    const tw = FB.widthOfTextAtSize(t, 11);
    page.drawText(t, { x: ML + CW - tw - 6, y: y + 5, size: 11, font: FB, color: WHITE });
    y -= 28;
  }

  // ── آیتم لیست ───────────────────────────────────────
  function item(raw) {
    drawText("• " + raw, { size: 10.5, x: ML + 8, width: CW - 8 });
  }

  // ── جدول ────────────────────────────────────────────
  function table(headers, rows, widths) {
    const hH = 26, rH = 24;
    const totalH = hH + rows.length * rH;
    checkY(totalH + 10);

    let cx = ML;
    // هدر
    headers.forEach((h, i) => {
      page.drawRectangle({ x: cx, y: y - hH, width: widths[i], height: hH, color: NAVY });
      page.drawRectangle({ x: cx, y: y - hH, width: widths[i], height: hH,
        borderColor: rgb(0.2,0.3,0.5), borderWidth: 0.5 });
      const t = rtl(h);
      const tw = FB.widthOfTextAtSize(t, 10);
      page.drawText(t, { x: cx + (widths[i] - tw) / 2, y: y - hH + 9, size: 10, font: FB, color: WHITE });
      cx += widths[i];
    });
    y -= hH;

    // ردیف‌ها
    rows.forEach((row, ri) => {
      cx = ML;
      const bg = ri % 2 === 0 ? LIGHT_BG : WHITE;
      row.forEach((cell, ci) => {
        page.drawRectangle({ x: cx, y: y - rH, width: widths[ci], height: rH,
          color: bg, borderColor: rgb(0.75,0.75,0.75), borderWidth: 0.5 });
        const t = rtl(cell);
        const tw = F.widthOfTextAtSize(t, 9.5);
        page.drawText(t, { x: cx + (widths[ci] - tw) / 2, y: y - rH + 7,
          size: 9.5, font: F, color: DARK });
        cx += widths[ci];
      });
      y -= rH;
    });
    y -= 8;
  }

  // ═══════════════════════════════════════════════════
  // داده‌ها
  // ═══════════════════════════════════════════════════
  const price    = Number(order.finalPrice);
  const features = (order.features || []).join("، ");
  const date     = new Date().toLocaleDateString("fa-IR");
  const cNo      = `WEB-${String(order._id || "0001").slice(-4).toUpperCase()}`;

  // ═══════════════════════════════════════════════════
  // هدر صفحه
  // ═══════════════════════════════════════════════════
  drawCenter("بسمه تعالی", 11, FB, NAVY);
  y -= 2;
  drawCenter("قرارداد طراحی وب‌سایت", 20, FB, NAVY);
  y -= 4;
  page.drawLine({ start:{x:ML,y}, end:{x:PW-MR,y}, thickness:2, color:NAVY });
  y -= 14;

  // تاریخ + شماره
  const dateT = rtl(`تاریخ: ${date}`);
  const noT   = rtl(`شماره: ${cNo}`);
  page.drawText(dateT, { x: ML, y, size:10, font:F, color:GRAY });
  const noW = F.widthOfTextAtSize(noT, 10);
  page.drawText(noT, { x: PW - MR - noW, y, size:10, font:F, color:GRAY });
  y -= 20;

  // ═══════════════════════════════════════════════════
  // ماده ۱
  // ═══════════════════════════════════════════════════
  section("ماده ۱ – مشخصات طرفین قرارداد");
  table(
    ["مجری (طراح)", "کارفرما"],
    [
      ["آقای پارسا اسدزاده",    order.name    || "—"],
      ["طراح و توسعه‌دهنده وب", "—"],
      ["اطلاعات تماس: محرمانه", order.contact || "—"],
    ],
    [CW/2, CW/2]
  );
  drawText(
    `این قرارداد فی‌مابین آقای پارسا اسدزاده (مجری) و ${order.name} (کارفرما) ` +
    `با اراده‌ی آزاد و بدون اکراه، بر اساس مفاد این سند منعقد و لازم‌الاجرا می‌گردد.`
  );

  // ═══════════════════════════════════════════════════
  // ماده ۲
  // ═══════════════════════════════════════════════════
  section("ماده ۲ – موضوع قرارداد");
  drawText(`موضوع این قرارداد طراحی، توسعه و راه‌اندازی وب‌سایت از نوع «${order.siteType}» با امکانات ${features} می‌باشد.`);
  if (order.desc)   drawText(`شرح تکمیلی: ${order.desc}`);
  if (order.refUrl) drawText(`سایت مرجع: ${order.refUrl}`, { size:9.5, color:GRAY });

  // ═══════════════════════════════════════════════════
  // ماده ۳
  // ═══════════════════════════════════════════════════
  section("ماده ۳ – شرح خدمات");
  [
    "طراحی رابط کاربری (UI/UX) مطابق هویت بصری کارفرما",
    "کدنویسی و توسعه فرانت‌اند و بک‌اند وب‌سایت",
    `ادغام امکانات درخواستی: ${features}`,
    "بهینه‌سازی اولیه موتورهای جستجو (SEO On-Page)",
    "تست سازگاری مرورگرها و ریسپانسیو بودن سایت",
    "تحویل فایل‌ها و آموزش مقدماتی مدیریت سایت",
  ].forEach(item);

  // ═══════════════════════════════════════════════════
  // ماده ۴
  // ═══════════════════════════════════════════════════
  section("ماده ۴ – زمان‌بندی پروژه");
  drawText(`مهلت تحویل نهایی پروژه: ${order.deadline || "توافقی"}`);
  drawText("در صورت تأخیر کارفرما در ارائه محتوا یا تأیید مراحل، زمان‌بندی به همان میزان به تعویق می‌افتد.");

  // ═══════════════════════════════════════════════════
  // ماده ۵
  // ═══════════════════════════════════════════════════
  section("ماده ۵ – مبلغ قرارداد و نحوه پرداخت");
  drawText(`مبلغ کل قرارداد: ${price.toLocaleString("fa-IR")} تومان`);
  table(
    ["مرحله", "درصد", "مبلغ (تومان)", "زمان پرداخت"],
    [
      ["پیش‌پرداخت",  "۵۰٪", (price*.5).toLocaleString("fa-IR"), "هنگام امضای قرارداد"],
      ["مرحله دوم",   "۳۰٪", (price*.3).toLocaleString("fa-IR"), "پس از تأیید طراحی"],
      ["تسویه نهایی", "۲۰٪", (price*.2).toLocaleString("fa-IR"), "پس از تحویل نهایی"],
    ],
    [CW*.22, CW*.13, CW*.3, CW*.35]
  );

  // ═══════════════════════════════════════════════════
  // ماده ۶
  // ═══════════════════════════════════════════════════
  section("ماده ۶ – حقوق مالکیت معنوی");
  drawText("کلیه حقوق مالکیت معنوی پس از تسویه کامل مبلغ به کارفرما منتقل می‌گردد. مجری حق نمایش نمونه‌کار بدون افشای اطلاعات محرمانه را دارد.");

  // ═══════════════════════════════════════════════════
  // ماده ۷
  // ═══════════════════════════════════════════════════
  section("ماده ۷ – تعهدات طرفین");
  drawText("تعهدات مجری:", { font: FB, size:10.5 });
  ["انجام خدمات با کیفیت مطلوب و استانداردهای روز",
   "رعایت زمان‌بندی و ارائه گزارش پیشرفت در مراحل کلیدی",
   "حفظ محرمانگی کامل اطلاعات کارفرما"].forEach(item);

  y -= 4;
  drawText("تعهدات کارفرما:", { font: FB, size:10.5 });
  ["ارائه به‌موقع محتوا، تصاویر و اطلاعات مورد نیاز",
   "پرداخت اقساط در موعد مقرر",
   "ارائه بازخورد حداکثر ظرف ۷ روز کاری"].forEach(item);

  // ═══════════════════════════════════════════════════
  // ماده ۸
  // ═══════════════════════════════════════════════════
  section("ماده ۸ – ضمانت و پشتیبانی");
  drawText("مجری متعهد است پس از تحویل نهایی، ۳ ماه پشتیبانی رایگان شامل رفع اشکالات فنی ارائه نماید. تغییرات محتوایی و توسعه امکانات جدید مشمول هزینه جداگانه است.");

  // ═══════════════════════════════════════════════════
  // ماده ۹
  // ═══════════════════════════════════════════════════
  section("ماده ۹ – شرایط فسخ قرارداد");
  drawText("فسخ قرارداد مستلزم اطلاع‌رسانی کتبی حداقل ۱۰ روز قبل است. هزینه‌های انجام‌شده تا زمان فسخ بر اساس توافق طرفین تسویه می‌گردد.");

  // ═══════════════════════════════════════════════════
  // ماده ۱۰
  // ═══════════════════════════════════════════════════
  section("ماده ۱۰ – حل اختلاف و قانون حاکم");
  drawText("اختلافات ابتدا از طریق مذاکره، سپس داوری و در نهایت مراجع قضایی جمهوری اسلامی ایران حل‌وفصل می‌شود.");

  // ═══════════════════════════════════════════════════
  // ماده ۱۱
  // ═══════════════════════════════════════════════════
  section("ماده ۱۱ – سایر شرایط");
  drawText("این قرارداد در ۲ نسخه با اعتبار یکسان تنظیم شده است. هرگونه اصلاح باید به صورت کتبی و با امضای هر دو طرف صورت پذیرد.");

  // ═══════════════════════════════════════════════════
  // صفحه امضا (صفحه جدید)
  // ═══════════════════════════════════════════════════
  addPage();

  // هدر صفحه امضا
  page.drawRectangle({ x:0, y:PH-70, width:PW, height:70, color:NAVY });
  const h1 = rtl("صفحه امضا");
  const h1w = FB.widthOfTextAtSize(h1, 18);
  page.drawText(h1, { x:(PW-h1w)/2, y:PH-42, size:18, font:FB, color:WHITE });
  const h2 = rtl("قرارداد طراحی وب‌سایت");
  const h2w = F.widthOfTextAtSize(h2, 11);
  page.drawText(h2, { x:(PW-h2w)/2, y:PH-60, size:11, font:F, color:rgb(0.7,0.8,1) });

  y = PH - 100;

  // خط اطلاعات قرارداد
  page.drawRectangle({ x:ML, y:y-36, width:CW, height:36, color:LIGHT_BG,
    borderColor:NAVY, borderWidth:1 });
  const info1 = rtl(`شماره قرارداد: ${cNo}`);
  const info2 = rtl(`تاریخ: ${date}`);
  const info3 = rtl(`مبلغ: ${price.toLocaleString("fa-IR")} تومان`);
  page.drawText(info1, { x:ML+8,            y:y-22, size:10, font:FB, color:NAVY });
  const i2w = F.widthOfTextAtSize(info2, 10);
  page.drawText(info2, { x:(PW-i2w)/2,      y:y-22, size:10, font:F,  color:DARK });
  const i3w = F.widthOfTextAtSize(info3, 10);
  page.drawText(info3, { x:PW-MR-i3w,       y:y-22, size:10, font:FB, color:NAVY });
  y -= 52;

  // متن تأیید
  drawCenter("این قرارداد با علم و آگاهی کامل از مفاد آن به صورت رسمی تنظیم شده", 10.5, F, DARK);
  drawCenter("و با امضای طرفین لازم‌الاجرا می‌گردد.", 10.5, F, DARK);
  y -= 10;

  // ── دو کادر امضا ──────────────────────────────────
  const sigBoxW = (CW - 20) / 2;
  const sigBoxH = 180;
  const sigY    = y - sigBoxH;

  // کادر مجری (سمت راست)
  const rxStart = ML + sigBoxW + 20;
  page.drawRectangle({ x:rxStart, y:sigY, width:sigBoxW, height:sigBoxH,
    borderColor:NAVY, borderWidth:1.5, color:WHITE });
  // هدر کادر
  page.drawRectangle({ x:rxStart, y:sigY+sigBoxH-28, width:sigBoxW, height:28, color:NAVY });
  const mt = rtl("امضای مجری");
  const mtw = FB.widthOfTextAtSize(mt, 12);
  page.drawText(mt, { x:rxStart+(sigBoxW-mtw)/2, y:sigY+sigBoxH-19, size:12, font:FB, color:WHITE });
  // اطلاعات
  const mn = rtl("آقای پارسا اسدزاده");
  const mnw = FB.widthOfTextAtSize(mn, 11);
  page.drawText(mn, { x:rxStart+(sigBoxW-mnw)/2, y:sigY+sigBoxH-50, size:11, font:FB, color:NAVY });
  const mr2 = rtl("طراح و توسعه‌دهنده وب");
  const mr2w = F.widthOfTextAtSize(mr2, 9.5);
  page.drawText(mr2, { x:rxStart+(sigBoxW-mr2w)/2, y:sigY+sigBoxH-66, size:9.5, font:F, color:GRAY });
  // خط امضا
  page.drawLine({ start:{x:rxStart+15, y:sigY+45}, end:{x:rxStart+sigBoxW-15, y:sigY+45},
    thickness:0.8, color:rgb(0.8,0.8,0.8), dashArray:[4,3] });
  const sigLabel1 = rtl("محل امضا");
  const sl1w = F.widthOfTextAtSize(sigLabel1, 9);
  page.drawText(sigLabel1, { x:rxStart+(sigBoxW-sl1w)/2, y:sigY+27, size:9, font:F, color:GRAY });
  const dt1 = rtl(`تاریخ: ${date}`);
  const dt1w = F.widthOfTextAtSize(dt1, 9);
  page.drawText(dt1, { x:rxStart+(sigBoxW-dt1w)/2, y:sigY+10, size:9, font:F, color:GRAY });

  // کادر کارفرما (سمت چپ)
  const lxStart = ML;
  page.drawRectangle({ x:lxStart, y:sigY, width:sigBoxW, height:sigBoxH,
    borderColor:NAVY, borderWidth:1.5, color:WHITE });
  page.drawRectangle({ x:lxStart, y:sigY+sigBoxH-28, width:sigBoxW, height:28, color:NAVY });
  const ct = rtl("امضای کارفرما");
  const ctw = FB.widthOfTextAtSize(ct, 12);
  page.drawText(ct, { x:lxStart+(sigBoxW-ctw)/2, y:sigY+sigBoxH-19, size:12, font:FB, color:WHITE });
  const cn = rtl(order.name || "کارفرما");
  const cnw = FB.widthOfTextAtSize(cn, 11);
  page.drawText(cn, { x:lxStart+(sigBoxW-cnw)/2, y:sigY+sigBoxH-50, size:11, font:FB, color:NAVY });

  // امضای دیجیتال (اگه باشه) وگرنه خط امضا
  if (order.clientSignature) {
    try {
      const imgData = order.clientSignature.replace(/^data:image\/\w+;base64,/, "");
      const imgBuf  = Buffer.from(imgData, "base64");
      const img = await doc.embedPng(imgBuf).catch(() => doc.embedJpg(imgBuf));
      page.drawImage(img, { x:lxStart+10, y:sigY+42, width:sigBoxW-20, height:55 });
    } catch(e) { /* skip */ }
  } else {
    page.drawLine({ start:{x:lxStart+15, y:sigY+45}, end:{x:lxStart+sigBoxW-15, y:sigY+45},
      thickness:0.8, color:rgb(0.8,0.8,0.8), dashArray:[4,3] });
    const sigLabel2 = rtl("محل امضای دیجیتال");
    const sl2w = F.widthOfTextAtSize(sigLabel2, 9);
    page.drawText(sigLabel2, { x:lxStart+(sigBoxW-sl2w)/2, y:sigY+27, size:9, font:F, color:GRAY });
  }

  const dt2 = rtl("تاریخ:");
  const dt2w = F.widthOfTextAtSize(dt2, 9);
  page.drawText(dt2, { x:lxStart+(sigBoxW-dt2w)/2, y:sigY+10, size:9, font:F, color:GRAY });

  y = sigY - 24;

  // ── اثر انگشت / QR placeholder ──────────────────────
  page.drawRectangle({ x:ML, y:y-50, width:CW, height:50,
    color:LIGHT_BG, borderColor:rgb(0.8,0.85,1), borderWidth:1 });
  const qrText = rtl(`کد رهگیری قرارداد: ${cNo} | تاریخ صدور: ${date}`);
  const qrw = F.widthOfTextAtSize(qrText, 9.5);
  page.drawText(qrText, { x:(PW-qrw)/2, y:y-20, size:9.5, font:F, color:NAVY });
  const noteText = rtl("این قرارداد به صورت الکترونیکی صادر شده و اعتبار قانونی دارد.");
  const notew = F.widthOfTextAtSize(noteText, 9);
  page.drawText(noteText, { x:(PW-notew)/2, y:y-36, size:9, font:F, color:GRAY });

  return await doc.save();
}

module.exports = { generateContractPDF };
