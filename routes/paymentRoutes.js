const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  initializeSubscription,
  verifySubscription,
} = require("../controllers/paymentController");

router.post(
  "/subscribe",
  protect,
  restrictTo("vendor"),
  asyncHandler(initializeSubscription),
);
router.get(
  "/verify/:reference",
  protect,
  restrictTo("vendor"),
  asyncHandler(verifySubscription),
);

module.exports = router;
