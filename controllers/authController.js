const axios = require("axios");
const { db, admin } = require("../config/firebase");

const register = async (req, res) => {
  try {
    const { email, password, name, phone, address } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone,
      address,
      role: "customer",
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Account created successfully",
      userId: userRecord.uid,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating account",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Missing Firebase API key." });
    }

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
    );

    const token = response.data.idToken;
    const uid = response.data.localId;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User profile not found." });
    }

    const userData = userDoc.data();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: uid,
        email,
        name: userData.name,
        role: userData.role,
      },
    });
  } catch (error) {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Error logging in";
    res.status(500).json({
      message: "Error logging in",
      error: message,
    });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone,
      role: "admin",
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Admin account created successfully",
      userId: userRecord.uid,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating admin",
      error: error.message,
    });
  }
};

const registerVendor = async (req, res) => {
  try {
    const { email, password, name, phone, businessName, category, vendorType } =
      req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }
    if (!businessName) {
      return res.status(400).json({ message: "Business name is required." });
    }
    if (!vendorType || !["product", "service"].includes(vendorType)) {
      return res
        .status(400)
        .json({ message: "vendorType must be 'product' or 'service'." });
    }
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: businessName,
    });
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        name,
        email,
        phone,
        businessName,
        category,
        vendorType,
        role: "vendor",
        subscriptionStatus: "active",
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
    res.status(201).json({
      message: "Vendor account created successfully",
      vendorId: userRecord.uid,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating vendor account",
      error: error.message,
    });
  }
};

const createSuperAdmin = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone,
      role: "superAdmin",
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "SuperAdmin account created successfully",
      userId: userRecord.uid,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating superAdmin",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  createAdmin,
  registerVendor,
  createSuperAdmin,
};
