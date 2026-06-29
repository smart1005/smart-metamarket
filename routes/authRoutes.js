const express = require("express");
const router = express.Router();
const {
  register,
  login,
  createAdmin,
  registerVendor,
  createSuperAdmin,
} = require("../controllers/authController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/register-vendor", registerVendor);
router.post("/create-admin", protect, restrictTo("superAdmin"), createAdmin);
router.post(
  "/create-superAdmin",
  protect,
  restrictTo("superAdmin"),
  createSuperAdmin,
);

module.exports = router;
