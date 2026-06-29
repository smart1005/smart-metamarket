const { db } = require("../config/firebase");
const cloudinary = require("cloudinary").v2;

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.[a-z]+$/);
  if (match) {
    const folder = url.includes("/profiles/") ? "profiles" : "portfolio";
    return `smart-shop/${folder}/${match[1]}`;
  }
  return null;
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error.message);
  }
};

const getUploadedUrl = (file) => file?.secure_url || file?.path || null;

const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendorDoc = await db.collection("users").doc(vendorId).get();
    const vendorData = vendorDoc.data();

    const { whatsapp, location, availability, certification, portfolioImages } =
      req.body;

    const updates = {};
    if (whatsapp) updates.whatsapp = whatsapp;
    if (location) updates.location = location;
    if (availability) updates.availability = availability;
    if (certification) updates.certification = certification;
    if (portfolioImages) updates.portfolioImages = portfolioImages;

    const profileImageFile = req.files?.profileImage?.[0] || req.file;
    if (profileImageFile) {
      const profileImageUrl = getUploadedUrl(profileImageFile);
      if (profileImageUrl) {
        if (vendorData?.profileImage) {
          const oldPublicId = extractPublicIdFromUrl(vendorData.profileImage);
          await deleteCloudinaryImage(oldPublicId);
        }
        updates.profileImage = profileImageUrl;
      }
    }

    const certificationFiles = req.files?.certificationImages || [];
    if (certificationFiles.length > 0) {
      const newCertUrls = certificationFiles
        .map(getUploadedUrl)
        .filter(Boolean);
      if (newCertUrls.length > 0) {
        if (vendorData?.certificationImages?.length) {
          for (const oldUrl of vendorData.certificationImages) {
            const oldPublicId = extractPublicIdFromUrl(oldUrl);
            await deleteCloudinaryImage(oldPublicId);
          }
        }
        updates.certificationImages = newCertUrls;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update fields provided" });
    }

    await db.collection("users").doc(vendorId).update(updates);

    res.status(200).json({
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

const getVendorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorDoc = await db.collection("users").doc(id).get();

    if (!vendorDoc.exists) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const vendor = vendorDoc.data();

    if (vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // don't expose sensitive fields
    const { password, subscriptionExpiry, ...publicProfile } = vendor;

    res.status(200).json({ vendor: publicProfile });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching vendor profile",
      error: error.message,
    });
  }
};

const getVendors = async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .where("role", "==", "vendor")
      .where("subscriptionStatus", "==", "active")
      .get();

    const vendors = snapshot.docs.map((doc) => {
      const { password, lastPayment, ...publicData } = doc.data();
      return { id: doc.id, ...publicData };
    });

    res.status(200).json({ vendors });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching vendors",
      error: error.message,
    });
  }
};

const addPortfolioImages = async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const validImages = req.files.filter(
      (file) => file?.secure_url || file?.path,
    );
    if (validImages.length === 0) {
      return res.status(400).json({ message: "No valid images to upload" });
    }

    const imageUrls = validImages
      .map((file) => file?.secure_url || file?.path)
      .filter(Boolean);

    const vendorDoc = await db.collection("users").doc(req.user.id).get();
    const existingImages = vendorDoc.data().portfolioImages || [];

    await db
      .collection("users")
      .doc(req.user.id)
      .update({
        portfolioImages: [...existingImages, ...imageUrls],
      });

    res.status(200).json({
      message: "Portfolio images uploaded successfully",
      images: imageUrls,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error uploading portfolio images",
      error: error.message,
    });
  }
};

module.exports = {
  updateVendorProfile,
  getVendorProfile,
  getVendors,
  addPortfolioImages,
};
