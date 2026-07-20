const axios = require("axios");
const { db, admin } = require("../config/firebase");
const { buildLocationData } = require("../utils/locationLookup");

// Maps common Firebase Admin SDK error codes to friendly, safe messages.
// Returns null for anything unrecognized so the caller falls back to a
// fully generic message instead of ever leaking a raw error/network detail.
const mapFirebaseAdminErrorCode = (error) => {
  switch (error.code) {
    case "auth/email-already-exists":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-password":
      return "Password must be at least 6 characters.";
    case "auth/phone-number-already-exists":
      return "An account with this phone number already exists.";
    default:
      return null;
  }
};

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
    console.error("Error creating account:", error);
    const friendly = mapFirebaseAdminErrorCode(error);
    res.status(friendly ? 400 : 500).json({
      message:
        friendly ||
        "Something went wrong creating your account. Please try again.",
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
      console.error("Missing FIREBASE_API_KEY for login.");
      return res.status(500).json({
        message: "Something went wrong logging you in. Please try again.",
      });
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

    // ensure user has verified their email
    const firebaseUser = await admin.auth().getUser(uid);
    if (!firebaseUser.emailVerified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in. Check your inbox.",
        emailNotVerified: true,
      });
    }

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User profile not found." });
    }

    const userData = userDoc.data();

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: uid,
        email,
        name: userData.name,
        role: userData.role,
        emailVerified: firebaseUser.emailVerified,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error.response?.data || error.message);

    const firebaseCode = error.response?.data?.error?.message;

    if (firebaseCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
      return res.status(429).json({
        message: "Too many attempts. Please wait a few minutes and try again.",
      });
    }

    if (firebaseCode) {
      // Any Firebase auth error (wrong password, unknown email, etc.) gets
      // the exact same response — this prevents the login endpoint being
      // used to check which emails are registered on the platform.
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.status(500).json({
      message: "Something went wrong logging you in. Please try again.",
    });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const allowedRoles = ["admin", "superAdmin"];
    const assignedRole = allowedRoles.includes(role) ? role : "admin";

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone,
      role: assignedRole,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: `${assignedRole} account created successfully`,
      userId: userRecord.uid,
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    const friendly = mapFirebaseAdminErrorCode(error);
    res.status(friendly ? 400 : 500).json({
      message:
        friendly ||
        "Something went wrong creating that account. Please try again.",
    });
  }
};

const registerVendor = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      businessName,
      vendorType,
      state,
      lga,
    } = req.body;

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
    if (!state || !lga) {
      return res.status(400).json({ message: "State and LGA are required." });
    }

    const locationData = buildLocationData(state, lga);
    if (!locationData) {
      return res.status(400).json({
        message:
          "Invalid state/LGA combination. Please select from the provided list.",
      });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: businessName,
    });

    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        name,
        email,
        phone,
        businessName,
        vendorType,
        role: "vendor",
        location: locationData,
        subscriptionStatus: "active",
        subscriptionExpiry: admin.firestore.Timestamp.fromDate(expiryDate),
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      });

    // sign in to obtain idToken and send verification email
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("Missing FIREBASE_API_KEY for registerVendor.");
      return res.status(500).json({
        message:
          "Your account was created, but we couldn't send a verification email. Please contact support.",
      });
    }

    const signInRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true },
    );

    const idToken = signInRes.data.idToken;

    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      { requestType: "VERIFY_EMAIL", idToken },
    );

    return res.status(201).json({
      message: "Vendor account created successfully",
      vendorId: userRecord.uid,
    });
  } catch (error) {
    console.error("Error creating vendor account:", error);
    const friendly = mapFirebaseAdminErrorCode(error);
    res.status(friendly ? 400 : 500).json({
      message:
        friendly ||
        "Something went wrong creating your vendor account. Please try again.",
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
    console.error("Error creating superAdmin:", error);
    const friendly = mapFirebaseAdminErrorCode(error);
    res.status(friendly ? 400 : 500).json({
      message:
        friendly ||
        "Something went wrong creating that account. Please try again.",
    });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("Missing FIREBASE_API_KEY for forgotPassword.");
    return res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }

  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        requestType: "PASSWORD_RESET",
        email,
      },
    );
  } catch (error) {
    // Log the real outcome, but always respond the same way to the client
    // regardless of whether the email exists — this prevents the endpoint
    // being used to check which emails are registered on the platform.
    console.error(
      "Error sending password reset email:",
      error.response?.data || error.message,
    );
  }

  res.status(200).json({
    message:
      "If an account exists with that email, a password reset link has been sent.",
  });
};

module.exports = {
  register,
  login,
  createAdmin,
  forgotPassword,
  registerVendor,
  createSuperAdmin,
};
