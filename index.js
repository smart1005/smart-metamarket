require("dotenv").config();
const express = require("express"); // Import the Express framework
const app = express(); // Create an instance of the Express application
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.static("public"));
const cors = require("cors");
app.use(cors());

const PORT = process.env.PORT || 3000; // Use environment port if available

require("./config/firebase"); // Import Firebase configuration

const productRoutes = require("./routes/productRoutes"); // Import product routes
const orderRoutes = require("./routes/orderRoutes"); // Import order routes
const paymentRoutes = require("./routes/paymentRoutes"); // Import payment routes
const { errorHandler } = require("./middleware/errorHandler"); // Central error handling middleware
const authRoutes = require("./routes/authRoutes"); // Import authentication routes
const serviceRoutes = require("./routes/serviceRoutes"); // Import service routes
const collectionRoutes = require("./routes/collectionRoutes");
const vendorRoutes = require("./routes/vendorRoutes");

app.use("/products", productRoutes); // Use product routes for handling requests to /products
app.use("/orders", orderRoutes); // Use order routes for handling requests to /orders
app.use("/payments", paymentRoutes); // Use payment routes for handling requests to /payments
app.use("/auth", authRoutes); // Use authentication routes for handling requests to /auth
app.use("/services", serviceRoutes); // Use service routes for handling requests to /services
app.use("/collections", collectionRoutes); // Use collection routes for handling requests to /collections
app.use("/vendors", vendorRoutes); // Use vendor routes for handling requests to /vendors
app.use(errorHandler); // Handle errors in one place

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Log a message when the server starts successfully
});
