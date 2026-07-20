const express = require("express");
const router = express.Router();
const {
  register,
  login,
  createAdmin,
  registerVendor,
  forgotPassword,
  createSuperAdmin,
} = require("../controllers/authController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Customer auth routes
router.post("/register", register);
router.post("/signup", register);
router.post("/login", login);
router.post("/signin", login);

// Password recovery routes
router.post("/forgot-password", forgotPassword);
router.post("/password/forgot", forgotPassword);

// Vendor registration routes
router.post("/register-vendor", registerVendor);
router.post("/vendor/register", registerVendor);

// Admin and super admin creation routes
router.post("/create-admin", protect, restrictTo("superAdmin"), createAdmin);
router.post("/admin/create", protect, restrictTo("superAdmin"), createAdmin);
router.post(
  "/create-superAdmin",
  protect,
  restrictTo("superAdmin"),
  createSuperAdmin,
);
router.post(
  "/super-admin/create",
  protect,
  restrictTo("superAdmin"),
  createSuperAdmin,
);

module.exports = router;
