const BASE_URL = "http://localhost:3000";

// ── Token Management ──
const getToken = () => localStorage.getItem("token");
const setToken = (token) => localStorage.setItem("token", token);
const removeToken = () => localStorage.removeItem("token");
const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
const setUser = (user) => localStorage.setItem("user", JSON.stringify(user));
const removeUser = () => localStorage.removeItem("user");

// ── Headers ──
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const jsonHeaders = () => ({
  "Content-Type": "application/json",
});

// ── Auth ──
const login = async (email, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

const register = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

const registerVendor = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/register-vendor`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

// ── Products ──
const getProducts = async () => {
  const res = await fetch(`${BASE_URL}/products`);
  return res.json();
};

const getProductById = async (id) => {
  const res = await fetch(`${BASE_URL}/products/${id}`);
  return res.json();
};

const addProduct = async (formData) => {
  const res = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
};

const updateProduct = async (id, formData) => {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
};

const deleteProduct = async (id) => {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.json();
};

// ── Services ──
const getServices = async () => {
  const res = await fetch(`${BASE_URL}/services`);
  return res.json();
};

const getServiceById = async (id) => {
  const res = await fetch(`${BASE_URL}/services/${id}`);
  return res.json();
};

const getJobTitles = async () => {
  const res = await fetch(`${BASE_URL}/services/job-titles`);
  return res.json();
};

const addService = async (formData) => {
  const res = await fetch(`${BASE_URL}/services`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
};

const updateService = async (id, formData) => {
  const res = await fetch(`${BASE_URL}/services/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
};

const deleteService = async (id) => {
  const res = await fetch(`${BASE_URL}/services/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.json();
};

// ── Vendors ──
const getVendors = async () => {
  const res = await fetch(`${BASE_URL}/vendors`);
  return res.json();
};

const getVendorProfile = async (id) => {
  const res = await fetch(`${BASE_URL}/vendors/${id}`);
  return res.json();
};

const updateVendorProfile = async (formData) => {
  const res = await fetch(`${BASE_URL}/vendors/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
};

const addPortfolioImages = async (formData) => {
  const res = await fetch(`${BASE_URL}/vendors/portfolio`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
};

// ── Collections ──
const getVendorCollections = async (vendorId) => {
  const res = await fetch(`${BASE_URL}/collections/${vendorId}`);
  return res.json();
};

const createCollection = async (data) => {
  const res = await fetch(`${BASE_URL}/collections`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

const addProductToCollection = async (collectionId, productId) => {
  const res = await fetch(`${BASE_URL}/collections/${collectionId}/products`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ productId }),
  });
  return res.json();
};

const deleteCollection = async (collectionId) => {
  const res = await fetch(`${BASE_URL}/collections/${collectionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.json();
};

// ── Payments ──
const initializeSubscription = async (plan) => {
  const res = await fetch(`${BASE_URL}/payments/subscribe`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ plan }),
  });
  return res.json();
};

const verifySubscription = async (reference) => {
  const res = await fetch(`${BASE_URL}/payments/verify/${reference}`, {
    headers: authHeaders(),
  });
  return res.json();
};

// ── Toast Notification ──
const showToast = (message, type = "success") => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
};

// ── Logout ──
const logout = () => {
  removeToken();
  removeUser();
  window.location.href = "index.html";
};

// expose a few utilities to the global scope for inline handlers
window.logout = logout;
window.showToast = showToast;
