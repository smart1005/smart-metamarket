const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  initializeSubscription,
  verifySubscription, 
  callbackSubscription
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
router.get(
  "/callback",
  asyncHandler(callbackSubscription),
); // This route is for Paystack's callback after payment completion

module.exports = router;
