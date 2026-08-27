const Order = require("../models/Order");

// 1. دریافت لیست تمام سفارش‌ها برای نمایش در داشبورد
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "خطا در دریافت سفارش‌ها", error: error.message });
  }
};

// 2. ویرایش قیمت توسط پارسا
exports.updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice } = req.body;

    const order = await Order.findByIdAndUpdate(
      id, 
      { finalPrice, status: "reviewed" }, 
      { new: true }
    );
    
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    res.status(200).json({ message: "قیمت با موفقیت بروزرسانی شد", order });
  } catch (error) {
    res.status(500).json({ message: "خطا در ثبت قیمت", error: error.message });
  }
};

// 3. تایید نهایی و صدور خودکار قرارداد
exports.approveAndGenerateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice) return res.status(400).json({ message: "ابتدا باید قیمت نهایی را تعیین کنید" });

    // قالب‌بندی تاریخ شمسی (اختیاری)
    const date = new Date().toLocaleDateString('fa-IR');

    // تولید متن قرارداد
    const contract = `
    بسمه تعالی
    قرارداد طراحی وب‌سایت
    
    تاریخ: ${date}
    این قرارداد فی مابین آقای پارسا اسدزاده (مجری) و ${order.name} (کارفرما) با راه‌های ارتباطی ${order.contact} منعقد می‌گردد.
    
    موضوع قرارداد: طراحی یک وب‌سایت از نوع "${order.siteType}" با امکانات (${order.features.join('، ')}).
    
    مبلغ قرارداد: توافق نهایی برای انجام این پروژه مبلغ ${order.finalPrice.toLocaleString()} تومان می‌باشد.
    زمان‌بندی حدودی بر اساس درخواست: ${order.deadline}
    
    امضای مجری: پارسا اسدزاده                     امضای کارفرما: ${order.name}
    `;

    order.contractText = contract;
    order.status = "approved";
    await order.save();

    res.status(200).json({ message: "قرارداد صادر شد", contract: order.contractText });
  } catch (error) {
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};