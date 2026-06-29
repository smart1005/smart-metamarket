const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "smart-shop/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

// storage for portfolio images
const portfolioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "smart-shop/portfolio",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  },
});

// storage for vendor profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "smart-shop/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
});

// storage for service images
const serviceStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "smart-shop/services",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  },
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadProduct = multer({
  storage: productStorage,
  limits: { fileSize: MAX_FILE_SIZE },
});
const uploadPortfolio = multer({
  storage: portfolioStorage,
  limits: { fileSize: MAX_FILE_SIZE },
});
const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: MAX_FILE_SIZE },
});
const uploadService = multer({
  storage: serviceStorage,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = {
  uploadProduct,
  uploadPortfolio,
  uploadProfile,
  uploadService,
};
