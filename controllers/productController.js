const { db } = require("../config/firebase");
const cloudinary = require("cloudinary").v2;
const { validateProductPayload } = require("../utils/validators");

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.[a-z]+$/);
  return match ? `smart-shop/products/${match[1]}` : null;
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error.message);
  }
};

const getUploadedImageUrls = (req) => {
  const uploadedFiles = [];

  if (req.files) {
    Object.values(req.files).forEach((files) => {
      if (Array.isArray(files)) {
        uploadedFiles.push(...files);
      }
    });
  }

  if (req.file) {
    uploadedFiles.push(req.file);
  }

  return uploadedFiles
    .map((file) => file?.secure_url || file?.path)
    .filter(Boolean);
};

const addProduct = async (req, res) => {
  const payload = Object.fromEntries(
    Object.entries(req.body || {}).filter(([, value]) => value !== undefined),
  );

  const validationError = validateProductPayload(payload);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const { name, price, description, stock, category } = payload;
  const normalizedPrice = Number(price);
  const normalizedStock = Number(stock);

  const imageUrls = getUploadedImageUrls(req);
  const imageUrl = imageUrls[0] || null;

  const productRef = await db.collection("products").add({
    name,
    price: normalizedPrice,
    description: description ?? "",
    stock: normalizedStock,
    category: category ?? "",
    imageUrl,
    imageUrls,
    vendorId: req.user.id,
    vendorName: req.user.name,
    createdAt: new Date(),
  });
  res.status(201).json({
    message: "Product added successfully",
    id: productRef.id,
  });
};

const getProducts = async (req, res) => {
  try {
    const { category, vendorId } = req.query;
    let query = db.collection("products");
    if (category) query = query.where("category", "==", category);
    if (vendorId) query = query.where("vendorId", "==", vendorId);
    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = productDoc.data();
    // vendor can only update their own product
    if (req.user.role === "vendor" && product.vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own products" });
    }
    const imageUrls = getUploadedImageUrls(req);
    const nextImageUrls =
      imageUrls.length > 0
        ? imageUrls
        : product.imageUrls || (product.imageUrl ? [product.imageUrl] : []);
    const imageUrl = nextImageUrls[0] || product.imageUrl || null;

    if (imageUrls.length > 0 && product.imageUrl) {
      const oldPublicId = extractPublicIdFromUrl(product.imageUrl);
      await deleteCloudinaryImage(oldPublicId);
    }

    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(([, value]) => value !== undefined),
    );
    delete updateData.imageUrl;
    delete updateData.imageUrls;

    if (updateData.description === undefined) updateData.description = "";
    if (updateData.category === undefined) updateData.category = "";

    await db
      .collection("products")
      .doc(id)
      .update({ ...updateData, imageUrl, imageUrls: nextImageUrls });
    res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error updating product",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = productDoc.data();
    // vendor can only delete their own product
    if (req.user.role === "vendor" && product.vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own products" });
    }
    await db.collection("products").doc(id).delete();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message,
    });
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
