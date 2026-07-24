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
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  registerVendorSchema,
  createAdminSchema,
  createSuperAdminSchema,
  forgotPasswordSchema,
} = require("../utils/authSchemas");

// Customer auth routes
router.post("/register", validate(registerSchema), register);
router.post("/signup", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/signin", validate(loginSchema), login);

// Password recovery routes
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/password/forgot", validate(forgotPasswordSchema), forgotPassword);

// Vendor registration routes
router.post("/register-vendor", validate(registerVendorSchema), registerVendor);
router.post("/vendor/register", validate(registerVendorSchema), registerVendor);

// Admin and super admin creation routes
router.post(
  "/create-admin",
  protect,
  restrictTo("superAdmin"),
  validate(createAdminSchema),
  createAdmin,
);
router.post(
  "/admin/create",
  protect,
  restrictTo("superAdmin"),
  validate(createAdminSchema),
  createAdmin,
);
router.post(
  "/create-superAdmin",
  protect,
  restrictTo("superAdmin"),
  validate(createSuperAdminSchema),
  createSuperAdmin,
);
router.post(
  "/super-admin/create",
  protect,
  restrictTo("superAdmin"),
  validate(createSuperAdminSchema),
  createSuperAdmin,
);

module.exports = router;
