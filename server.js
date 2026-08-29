require("dotenv").config();
const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// =========================
// تنظیمات CORS
// =========================
const allowedOrigins = [
  "https://parsaasadzadeh.ir",
  "https://www.parsaasadzadeh.ir",
];

const corsOptions = {
  origin: function (origin, callback) {
    // درخواست‌هایی که Origin ندارند (مثل Postman یا server-to-server)
    if (!origin) {
      return callback(null, false);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS: Origin مجاز نیست"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// ✅ FIX: در Vercel باید string "*" باشه نه regex — هر دو رو پوشش میده
app.options("*", cors(corsOptions));

// =========================
// Middleware
// =========================
app.use(express.json({ limit: "5mb" })); // برای امضای base64 که حجیمه

// =========================
// اتصال به MongoDB
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ اتصال به MongoDB موفق بود"))
  .catch((err) => console.error("❌ خطا در اتصال به MongoDB:", err));

// =========================
// Routes
// =========================
app.use("/api/orders", orderRoutes);
app.use("/api/admin",  adminRoutes);

// =========================
// Route تست
// =========================
app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// =========================
// ✅ FIX: یک Error Handler واحد — دو تا handler داشتی که دومی مرده بود
// =========================
app.use((err, req, res, next) => {
  if (err.message === "CORS: Origin مجاز نیست") {
    return res.status(403).json({
      success: false,
      message: "دسترسی از این Origin مجاز نیست.",
    });
  }
  console.error("❌ Server Error:", err);
  res.status(500).json({
    success: false,
    message: "خطای داخلی سرور",
  });
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
});
