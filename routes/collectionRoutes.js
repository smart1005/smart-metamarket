const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  createCollection,
  getVendorCollections,
  addProductToCollection,
  removeProductFromCollection,
  deleteCollection,
} = require("../controllers/collectionController");

router.post("/", protect, restrictTo("vendor"), asyncHandler(createCollection));
router.get("/:vendorId", asyncHandler(getVendorCollections));
router.post(
  "/:collectionId/products",
  protect,
  restrictTo("vendor"),
  asyncHandler(addProductToCollection),
);
router.delete(
  "/:collectionId/products/:productId",
  protect,
  restrictTo("vendor"),
  asyncHandler(removeProductFromCollection),
);
router.delete(
  "/:collectionId",
  protect,
  restrictTo("vendor"),
  asyncHandler(deleteCollection),
);

module.exports = router;
