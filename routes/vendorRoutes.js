const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const { uploadPortfolio, uploadProfile } = require("../config/cloudinary");
const {
  updateVendorProfile,
  getVendorProfile,
  getVendors,
  addPortfolioImages,
} = require("../controllers/vendorController");

router.get("/", asyncHandler(getVendors));
router.get("/:id", asyncHandler(getVendorProfile));
router.put(
  "/profile",
  protect,
  restrictTo("vendor"),
  uploadProfile.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "certificationImages", maxCount: 10 },
  ]),
  asyncHandler(updateVendorProfile),
);
router.post(
  "/portfolio",
  protect,
  restrictTo("vendor"),
  uploadPortfolio.array("images", 10),
  asyncHandler(addPortfolioImages),
);

module.exports = router;
