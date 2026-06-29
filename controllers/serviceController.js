const { db } = require("../config/firebase");
const cloudinary = require("cloudinary").v2;
const { validateServicePayload } = require("../utils/validators");

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.[a-z]+$/);
  return match ? `smart-shop/services/${match[1]}` : null;
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error.message);
  }
};

const getUploadedImageUrl = (file) => file?.secure_url || file?.path || null;

const getUploadedImageUrls = (req) => {
  const files = [];

  if (Array.isArray(req.files?.images)) {
    files.push(...req.files.images);
  }
  if (Array.isArray(req.files?.["images[]"])) {
    files.push(...req.files["images[]"]);
  }
  if (Array.isArray(req.files?.image)) {
    files.push(...req.files.image);
  }
  if (req.file) {
    files.push(req.file);
  }

  return files.map((file) => getUploadedImageUrl(file)).filter(Boolean);
};

const normalizeSkills = (skills) => {
  if (skills === undefined || skills === null || skills === "") {
    return [];
  }

  if (Array.isArray(skills)) {
    return skills
      .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
      .filter((skill) => skill !== "");
  }

  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill !== "");
  }

  return [];
};

const normalizeRequestBody = (body) => {
  if (!body) return body;

  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key === "skills[]" ? "skills" : key,
      value,
    ]),
  );
};

const addService = async (req, res) => {
  const payload = normalizeRequestBody(req.body);

  const validationError = validateServicePayload(payload);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const { title, jobTitle, description, price, category, skills } = payload;
  const serviceTitle = (jobTitle || title || "").trim();
  const imageUrls = getUploadedImageUrls(req);
  // determine category from jobTitle when possible
  let computedCategory = category;
  if (serviceTitle) {
    try {
      const snapshot = await db
        .collection("jobTitles")
        .where("titles", "array-contains", serviceTitle)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        computedCategory = snapshot.docs[0].data().category;
      }
    } catch (err) {
      console.error("Error fetching job title category:", err.message);
    }
  }

  const serviceData = {
    title: serviceTitle,
    jobTitle: serviceTitle,
    description: description || "",
    category: computedCategory || "",
    imageUrl: imageUrls[0] || null,
    imageUrls,
    skills: normalizeSkills(skills),
    vendorId: req.user.id,
    vendorName: req.user.name,
    createdAt: new Date(),
  };

  if (price !== undefined && price !== null && price !== "") {
    serviceData.price = Number(price);
  }

  const serviceRef = await db.collection("services").add(serviceData);

  res.status(201).json({
    message: "Service added successfully",
    id: serviceRef.id,
  });
};
const getServices = async (req, res) => {
  try {
    const { category, vendorId } = req.query;
    let query = db.collection("services");

    if (category) query = query.where("category", "==", category);
    if (vendorId) query = query.where("vendorId", "==", vendorId);

    const snapshot = await query.get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ services });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching services",
      error: error.message,
    });
  }
};

const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("services").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching service",
      error: error.message,
    });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceDoc = await db.collection("services").doc(id).get();
    if (!serviceDoc.exists) {
      return res.status(404).json({ message: "Service not found" });
    }

    const service = serviceDoc.data();

    if (req.user.role === "vendor" && service.vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own services" });
    }

    const payload = normalizeRequestBody(req.body);

    const validationError = validateServicePayload(payload, true);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const updates = { ...payload };
    const updateTitle =
      payload.jobTitle !== undefined ? payload.jobTitle : payload.title;
    if (updateTitle !== undefined) {
      updates.title = updateTitle.trim();
      updates.jobTitle = updates.title;
    }

    if (updates.skills !== undefined) {
      updates.skills = normalizeSkills(updates.skills);
    }

    delete updates.vendorId;
    delete updates.vendorName;
    delete updates.createdAt;
    delete updates.imageUrl;
    delete updates.imageUrls;

    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
    }

    const uploadedUrls = getUploadedImageUrls(req);
    if (uploadedUrls.length > 0) {
      updates.imageUrls = uploadedUrls;
      updates.imageUrl = uploadedUrls[0];
    }

    await db.collection("services").doc(id).update(updates);
    res.status(200).json({ message: "Service updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error updating service",
      error: error.message,
    });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceDoc = await db.collection("services").doc(id).get();
    if (!serviceDoc.exists) {
      return res.status(404).json({ message: "Service not found" });
    }

    const service = serviceDoc.data();
    if (req.user.role === "vendor" && service.vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own services" });
    }

    await db.collection("services").doc(id).delete();
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting service",
      error: error.message,
    });
  }
};

const getJobTitles = async (req, res) => {
  try {
    const snapshot = await db.collection("jobTitles").get();
    const jobTitles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json({ jobTitles });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching job titles",
      error: error.message,
    });
  }
};

module.exports = {
  addService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getJobTitles,
};
