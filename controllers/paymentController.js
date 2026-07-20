const axios = require("axios");
const { db, admin } = require("../config/firebase");

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
        callback_url: `${process.env.BASE_URL}/payments/callback`,
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
      console.error("Invalid Paystack initialize response:", response?.data);
      return res.status(502).json({
        message: "Unable to start payment right now. Please try again.",
      });
    }

    res.status(200).json({
      message: "Subscription payment initialized",
      paymentUrl: paystackData.authorization_url,
      reference: paystackData.reference,
      plan: selectedPlan.label,
      amount: selectedPlan.amount,
    });
  } catch (error) {
    console.error("Error initializing subscription:", error);
    res.status(500).json({
      message: "Something went wrong starting your payment. Please try again.",
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
      console.error("Invalid Paystack verify response:", response?.data);
      return res.status(502).json({
        message: "Unable to verify payment right now. Please try again.",
      });
    }

    const { status, metadata, amount } = paystackData;
    console.log("PAYSTACK STATUS:", status);
    console.log("PAYSTACK METADATA:", JSON.stringify(metadata));
    console.log("VENDOR ID FROM META:", metadata?.vendorId);
    console.log("DAYS FROM META:", metadata?.days);

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
        subscriptionExpiry: admin.firestore.Timestamp.fromDate(newExpiry),
        lastPayment: {
          amount: amount / 100,
          plan,
          paidAt: admin.firestore.Timestamp.fromDate(new Date()),
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
    console.error("Error verifying subscription:", error);
    res.status(500).json({
      message:
        "Something went wrong verifying your payment. Please contact support if you were charged.",
    });
  }
};

const callbackSubscription = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.redirect(
        `${process.env.BASE_URL}/dashboard.html?payment=failed`,
      );
    }

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
      console.error("Invalid Paystack callback response:", response?.data);
      return res.redirect(
        `${process.env.BASE_URL}/dashboard.html?payment=failed`,
      );
    }

    const { status, metadata, amount } = paystackData;

    if (status !== "success") {
      return res.redirect(
        `${process.env.BASE_URL}/dashboard.html?payment=failed`,
      );
    }

    const { vendorId, plan, days } = metadata;

    const vendorDoc = await db.collection("users").doc(vendorId).get();
    if (!vendorDoc.exists) {
      return res.redirect(
        `${process.env.BASE_URL}/dashboard.html?payment=failed`,
      );
    }

    const vendorData = vendorDoc.data();
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
        subscriptionExpiry: admin.firestore.Timestamp.fromDate(newExpiry),
        lastPayment: {
          amount: amount / 100,
          plan,
          paidAt: admin.firestore.Timestamp.fromDate(new Date()),
          reference,
        },
      });

    // redirect vendor back to dashboard with success
    return res.redirect(
      `${process.env.BASE_URL}/dashboard.html?payment=success`,
    );
  } catch (error) {
    console.error("Error in payment callback:", error);
    return res.redirect(
      `${process.env.BASE_URL}/dashboard.html?payment=failed`,
    );
  }
};

module.exports = {
  initializeSubscription,
  verifySubscription,
  callbackSubscription,
};
