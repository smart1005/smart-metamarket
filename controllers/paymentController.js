const axios = require("axios");
const { db } = require("../config/firebase");

const initializeSubscription = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const email = req.user.email;

    // subscription plans
    const plans = {
      monthly: { amount: 5000, days: 30, label: "Monthly" }, // ₦5,000
      yearly: { amount: 50000, days: 365, label: "Yearly" }, // ₦50,000
    };

    const { plan } = req.body;
    if (!plan || !plans[plan]) {
      return res
        .status(400)
        .json({ message: "Plan must be 'monthly' or 'yearly'" });
    }

    const selectedPlan = plans[plan];

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: selectedPlan.amount * 100, // convert to kobo
        metadata: {
          vendorId,
          plan,
          days: selectedPlan.days,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const paystackData = response?.data?.data;
    if (!paystackData) {
      return res.status(502).json({ message: "Invalid Paystack response" });
    }

    res.status(200).json({
      message: "Subscription payment initialized",
      paymentUrl: paystackData.authorization_url,
      reference: paystackData.reference,
      plan: selectedPlan.label,
      amount: selectedPlan.amount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error initializing subscription",
      error: error.message,
    });
  }
};

const verifySubscription = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const paystackData = response?.data?.data;
    if (!paystackData) {
      return res.status(502).json({ message: "Invalid Paystack response" });
    }

    const { status, metadata, amount } = paystackData;

    if (status !== "success") {
      return res.status(400).json({ message: "Payment not successful" });
    }

    const { vendorId, plan, days } = metadata;

    // get vendor's current expiry
    const vendorDoc = await db.collection("users").doc(vendorId).get();
    if (!vendorDoc.exists) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const vendorData = vendorDoc.data();

    // if subscription is still active, extend from expiry date
    // if expired, extend from today
    const now = new Date();
    const currentExpiry = vendorData.subscriptionExpiry?.toDate
      ? vendorData.subscriptionExpiry.toDate()
      : now;

    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await db
      .collection("users")
      .doc(vendorId)
      .update({
        subscriptionStatus: "active",
        subscriptionExpiry: newExpiry,
        lastPayment: {
          amount: amount / 100,
          plan,
          paidAt: new Date(),
          reference,
        },
      });

    res.status(200).json({
      message: "Subscription activated successfully",
      vendorId,
      plan,
      newExpiry,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error verifying subscription",
      error: error.message,
    });
  }
};

module.exports = { initializeSubscription, verifySubscription };
