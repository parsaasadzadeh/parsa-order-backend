const Order = require("../models/Order");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
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


exports.approveAndGenerateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد" });
    if (!order.finalPrice) return res.status(400).json({ message: "ابتدا باید قیمت نهایی را تعیین کنید" });

    const date = new Date().toLocaleDateString("fa-IR");
    const outputPath = path.join(__dirname, `../contracts/contract_${id}.pdf`);
    
    // اطمینان از وجود پوشه contracts
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // داده‌های سفارش را به صورت JSON به اسکریپت Python پاس می‌دهیم
    const orderData = JSON.stringify({
      orderId: id,
      name: order.name,
      contact: order.contact,
      siteType: order.siteType,
      features: order.features,
      finalPrice: order.finalPrice,
      deadline: order.deadline,
      desc: order.desc || "",
      refUrl: order.refUrl || "",
      date: date,
    });

    const escaped = orderData.replace(/'/g, "'\\''");
    const cmd = `python3 generate_contract.py '${escaped}' '${outputPath}'`;

    exec(cmd, async (error, stdout, stderr) => {
      if (error) {
        console.error("PDF Error:", stderr);
        return res.status(500).json({ message: "خطا در تولید PDF", error: stderr });
      }

      order.contractPath = outputPath;
      order.status = "approved";
      await order.save();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=contract_${id}.pdf`);
      fs.createReadStream(outputPath).pipe(res);
    });

  } catch (error) {
    res.status(500).json({ message: "خطا در صدور قرارداد", error: error.message });
  }
};
