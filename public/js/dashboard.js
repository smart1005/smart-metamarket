let currentUser = null;
let vendorProfile = null;
let allJobTitles = [];
let myProducts = [];
let myServices = [];
let myCollections = [];

// ── Check Auth State ──
const checkAuth = async () => {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    showAuthSection();
    return;
  }

  if (user.role !== "vendor") {
    showToast("This dashboard is for vendors only", "error");
    showAuthSection();
    return;
  }

  currentUser = user;
  showDashboard();
};

// ── Show Auth Section ──
const showAuthSection = () => {
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("dashboard-section").style.display = "none";
};

// ── Show Dashboard ──
const showDashboard = async () => {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("dashboard-section").style.display = "block";

  // load profile first to get correct vendorType
  const profileRes = await getVendorProfile(currentUser.id);
  vendorProfile = profileRes.vendor;

  const vendorType = vendorProfile?.vendorType || currentUser.vendorType;

  document.getElementById("dash-business-name").textContent =
    vendorProfile?.businessName || currentUser.name || "My Store";
  document.getElementById("dash-vendor-type").textContent =
    vendorType === "service" ? "🔧 Service Vendor" : "🛍️ Product Vendor";
  document.getElementById("view-storefront-btn").href =
    `vendor.html?id=${currentUser.id}`;

  // hide irrelevant tab
  if (vendorType === "service") {
    document.getElementById("dtab-products").style.display = "none";
  } else {
    document.getElementById("dtab-services").style.display = "none";
  }

  // show inactive banner
  if (vendorProfile?.subscriptionStatus !== "active") {
    showInactiveBanner();
  }

  await loadDashboardData();
};

// ── Load All Dashboard Data ──
const loadDashboardData = async () => {
  try {
    const [productsRes, servicesRes, collectionsRes, profileRes, jobTitlesRes] =
      await Promise.all([
        getProducts(),
        getServices(),
        getVendorCollections(currentUser.id),
        getVendorProfile(currentUser.id),
        getJobTitles(),
      ]);

    myProducts = (productsRes.products || []).filter(
      (p) => p.vendorId === currentUser.id,
    );
    myServices = (servicesRes.services || []).filter(
      (s) => s.vendorId === currentUser.id,
    );
    myCollections = collectionsRes.collections || [];
    vendorProfile = profileRes.vendor;
    allJobTitles = [];

    const jobTitlesData =
      jobTitlesRes.jobTitles || jobTitlesRes.categories || [];
    jobTitlesData.forEach((cat) => {
      allJobTitles.push(...cat.titles);
    });

    // update stats
    document.getElementById("stat-products").textContent = myProducts.length;
    document.getElementById("stat-services").textContent = myServices.length;
    document.getElementById("stat-collections").textContent =
      myCollections.length;
    document.getElementById("stat-portfolio").textContent = (
      vendorProfile?.portfolioImages || []
    ).length;

    // update subscription
    updateSubscriptionStatus();

    // prefill profile
    prefillProfile();

    // render lists
    renderMyProducts();
    renderMyServices();
    renderMyCollections();
  } catch (error) {
    showToast("Failed to load dashboard data", "error");
  }
};

// ── Switch Dashboard Tab ──
const switchDashTab = (tab) => {
  const tabs = [
    "overview",
    "products",
    "services",
    "collections",
    "profile",
    "subscription",
  ];
  tabs.forEach((t) => {
    document.getElementById(`dash-${t}`).style.display =
      t === tab ? "block" : "none";
    document.getElementById(`dtab-${t}`).classList.toggle("active", t === tab);
  });
};

// ── Auth: Login ──
const handleLogin = async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) return showToast("Fill in all fields", "error");

  const res = await login(email, password);
  if (res.token) {
    if (res.user.role !== "vendor") {
      return showToast("This dashboard is for vendors only", "error");
    }
    setToken(res.token);
    setUser(res.user);
    currentUser = res.user;
    showToast("Login successful!");
    showDashboard();
  } else {
    showToast(res.error || res.message || "Login failed", "error");
  }
};

// ── Auth: Register ──
const handleRegister = async () => {
  const name = document.getElementById("reg-name").value.trim();
  const businessName = document.getElementById("reg-business").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const vendorType = document.getElementById("reg-type").value;

  if (!name || !businessName || !email || !phone || !password) {
    return showToast("Fill in all required fields", "error");
  }

  const res = await registerVendor({
    name,
    businessName,
    email,
    phone,
    password,
    vendorType,
  });

  if (res.vendorId) {
    showToast("Account created! Please login.");
    showLogin();
  } else {
    showToast(res.error || res.message || "Registration failed", "error");
  }
};

// ── Show Login / Register ──
const showLogin = () => {
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-form").style.display = "none";
};

const showRegister = () => {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
};

// ── Modal ──
const openModal = (id) => {
  document.getElementById(id).classList.add("open");
};

const closeModal = (id) => {
  document.getElementById(id).classList.remove("open");
};

// ── Job Title Autocomplete ──
let selectedJobTitles = [];

const searchJobTitles = (query) => {
  const suggestions = document.getElementById("job-title-suggestions");
  if (!query || query.length < 2) {
    suggestions.style.display = "none";
    return;
  }

  const matches = allJobTitles
    .filter(
      (t) =>
        t.toLowerCase().includes(query.toLowerCase()) &&
        !selectedJobTitles.includes(t),
    )
    .slice(0, 8);

  if (matches.length === 0) {
    suggestions.style.display = "none";
    return;
  }

  suggestions.style.display = "block";
  suggestions.innerHTML = matches
    .map(
      (title) => `
    <div 
      style="padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.9rem;"
      onmousedown="selectJobTitle('${title}')"
    >${title}</div>
  `,
    )
    .join("");
};

const selectJobTitle = (title) => {
  if (!allJobTitles.includes(title)) {
    showToast("Please select a valid job title from the list", "error");
    return;
  }
  if (!selectedJobTitles.includes(title)) {
    selectedJobTitles.push(title);
    renderSelectedTitles();
  }
  document.getElementById("service-title-input").value = "";
  document.getElementById("job-title-suggestions").style.display = "none";
};

const renderSelectedTitles = () => {
  const container = document.getElementById("selected-job-titles");
  container.innerHTML = selectedJobTitles
    .map(
      (title) => `
    <span style="background: var(--primary); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
      ${title}
      <span onclick="removeJobTitle('${title}')" style="cursor: pointer; font-size: 1rem;">×</span>
    </span>
  `,
    )
    .join("");
};

const removeJobTitle = (title) => {
  selectedJobTitles = selectedJobTitles.filter((t) => t !== title);
  renderSelectedTitles();
};

// ── Add Product ──
const handleAddProduct = async () => {
  const name = document.getElementById("product-name").value.trim();
  const price = document.getElementById("product-price").value;
  const stock = document.getElementById("product-stock").value;
  const category = document.getElementById("product-category").value.trim();
  const description = document
    .getElementById("product-description")
    .value.trim();
  const imageFile = document.getElementById("product-image").files[0];

  if (!name || !price || !stock) {
    return showToast("Name, price and stock are required", "error");
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("price", price);
  formData.append("stock", stock);
  formData.append("category", category);
  formData.append("description", description);
  if (imageFile) formData.append("image", imageFile);

  const res = await addProduct(formData);
  if (res.id) {
    showToast("Product added successfully!");
    closeModal("add-product-modal");
    await loadDashboardData();
    // clear form
    document.getElementById("product-name").value = "";
    document.getElementById("product-price").value = "";
    document.getElementById("product-stock").value = "";
    document.getElementById("product-category").value = "";
    document.getElementById("product-description").value = "";
    document.getElementById("product-image").value = "";
  } else {
    showToast(res.message || "Failed to add product", "error");
  }
};

// ── Add Service ──
const handleAddService = async () => {
  const skillsRaw = document.getElementById("service-skills").value.trim();
  const description = document
    .getElementById("service-description")
    .value.trim();
  const price = document.getElementById("service-price").value;
  const imageFiles = document.getElementById("service-images").files;

  if (selectedJobTitles.length === 0) {
    return showToast("Select at least one job title", "error");
  }

  if (!description) {
    return showToast("Description is required", "error");
  }

  // add one service per job title
  let successCount = 0;
  for (const jobTitle of selectedJobTitles) {
    const formData = new FormData();
    formData.append("jobTitle", jobTitle);
    formData.append("description", description);
    if (skillsRaw) formData.append("skills", skillsRaw);
    if (price) formData.append("price", price);
    for (const file of imageFiles) {
      formData.append("images", file);
    }
    const res = await addService(formData);
    if (res.id) successCount++;
  }
  if (successCount > 0) {
    showToast(`${successCount} service(s) added successfully!`);
    closeModal("add-service-modal");
    selectedJobTitles = [];
    renderSelectedTitles();
    document.getElementById("service-title-input").value = "";
    document.getElementById("service-skills").value = "";
    document.getElementById("service-description").value = "";
    document.getElementById("service-price").value = "";
    document.getElementById("service-images").value = "";
    await loadDashboardData();
  } else {
    showToast("Failed to add services", "error");
  }
};

// ── Add Collection ──
const handleAddCollection = async () => {
  const name = document.getElementById("collection-name").value.trim();
  const description = document
    .getElementById("collection-description")
    .value.trim();

  if (!name) return showToast("Collection name is required", "error");

  const res = await createCollection({ name, description });
  if (res.id) {
    showToast("Collection created!");
    closeModal("add-collection-modal");
    await loadDashboardData();
    document.getElementById("collection-name").value = "";
    document.getElementById("collection-description").value = "";
  } else {
    showToast(res.message || "Failed to create collection", "error");
  }
};

// ── Render My Products ──
const renderMyProducts = () => {
  const list = document.getElementById("my-products-list");
  if (myProducts.length === 0) {
    list.innerHTML =
      "<p class='text-sub text-center'>No products yet. Add your first product!</p>";
    return;
  }

  list.innerHTML = myProducts
    .map(
      (product) => `
    <div class="item-card">
      <img src="${product.imageUrl || "https://via.placeholder.com/60x60/1a1a1a/FF6B35?text=No"}" alt="${product.name}" />
      <div class="item-card-body">
        <h4>${product.name}</h4>
        <p>₦${Number(product.price).toLocaleString()} • Stock: ${product.stock}</p>
      </div>
      <div class="item-card-actions">
        <button class="btn btn-danger btn-sm" onclick="handleDeleteProduct('${product.id}')">🗑️</button>
      </div>
    </div>
  `,
    )
    .join("");
};

// ── Render My Services ──
const renderMyServices = () => {
  const list = document.getElementById("my-services-list");
  if (myServices.length === 0) {
    list.innerHTML =
      "<p class='text-sub text-center'>No services yet. Add your first service!</p>";
    return;
  }

  list.innerHTML = myServices
    .map(
      (service) => `
    <div class="item-card">
      <img src="${service.imageUrl || service.imageUrls?.[0] || "https://via.placeholder.com/60x60/1a1a1a/FF6B35?text=No"}" alt="${service.jobTitle}" />
      <div class="item-card-body">
        <h4>${service.jobTitle || service.title}</h4>
        <p>${service.category || ""}</p>
      </div>
      <div class="item-card-actions">
        <button class="btn btn-danger btn-sm" onclick="handleDeleteService('${service.id}')">🗑️</button>
      </div>
    </div>
  `,
    )
    .join("");
};

// ── Render My Collections ──
const renderMyCollections = () => {
  const list = document.getElementById("my-collections-list");
  if (myCollections.length === 0) {
    list.innerHTML = "<p class='text-sub text-center'>No collections yet.</p>";
    return;
  }

  list.innerHTML = myCollections
    .map(
      (col) => `
    <div class="item-card" style="flex-direction: column; align-items: flex-start;">
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <h4>📁 ${col.name}</h4>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteCollection('${col.id}')">🗑️</button>
      </div>
      <p style="font-size: 0.8rem; margin: 6px 0;">${col.products?.length || 0} products</p>
      ${
        col.products?.length > 0
          ? `
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
          ${col.products
            .map(
              (p) => `
            <span style="background: var(--border); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem;">
              ${p.productName}
              <span onclick="handleRemoveFromCollection('${col.id}', '${p.productId}')" 
                style="color: #e74c3c; cursor: pointer; margin-left: 4px;">×</span>
            </span>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
      <button class="btn btn-outline w-full mt-2" style="font-size: 0.8rem;" 
        onclick="showAddToCollection('${col.id}')">
        ➕ Add Product
      </button>
    </div>
  `,
    )
    .join("");
};

// ── Delete Product ──
const handleDeleteProduct = async (id) => {
  if (!confirm("Delete this product?")) return;
  const res = await deleteProduct(id);
  if (res.message) {
    showToast("Product deleted");
    await loadDashboardData();
  } else {
    showToast("Failed to delete", "error");
  }
};

// ── Delete Service ──
const handleDeleteService = async (id) => {
  if (!confirm("Delete this service?")) return;
  const res = await deleteService(id);
  if (res.message) {
    showToast("Service deleted");
    await loadDashboardData();
  } else {
    showToast("Failed to delete", "error");
  }
};

// ── Delete Collection ──
const handleDeleteCollection = async (id) => {
  if (!confirm("Delete this collection?")) return;
  const res = await deleteCollection(id);
  if (res.message) {
    showToast("Collection deleted");
    await loadDashboardData();
  } else {
    showToast("Failed to delete", "error");
  }
};

// ── Remove Product From Collection ──
const handleRemoveFromCollection = async (collectionId, productId) => {
  const res = await fetch(
    `${BASE_URL}/collections/${collectionId}/products/${productId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    },
  );
  const data = await res.json();
  if (data.message) {
    showToast("Removed from collection");
    await loadDashboardData();
  }
};

// ── Show Add To Collection ──
const showAddToCollection = (collectionId) => {
  if (myProducts.length === 0) {
    return showToast("Add products first", "error");
  }

  const product = prompt(
    `Enter product name to add:\n${myProducts.map((p) => p.name).join(", ")}`,
  );

  if (!product) return;

  const found = myProducts.find(
    (p) => p.name.toLowerCase() === product.toLowerCase(),
  );

  if (!found) return showToast("Product not found", "error");

  addProductToCollection(collectionId, found.id).then((res) => {
    if (res.message) {
      showToast("Added to collection!");
      loadDashboardData();
    } else {
      showToast(res.message || "Failed", "error");
    }
  });
};

// ── Update Profile ──
const handleUpdateProfile = async () => {
  const formData = new FormData();
  const whatsapp = document.getElementById("profile-whatsapp").value.trim();
  const city = document.getElementById("profile-city").value.trim();
  const state = document.getElementById("profile-state").value.trim();
  const hours = document.getElementById("profile-hours").value.trim();
  const days = document.getElementById("profile-days").value.trim();
  const cert = document.getElementById("profile-cert").value.trim();
  const imageFile = document.getElementById("profile-image").files[0];

  if (whatsapp) formData.append("whatsapp", whatsapp);
  if (city || state)
    formData.append("location", JSON.stringify({ city, state }));
  if (hours || days)
    formData.append(
      "availability",
      JSON.stringify({
        workingHours: hours,
        workingDays: days,
        isOpen: true,
      }),
    );
  if (cert) formData.append("certification", cert);
  if (imageFile) formData.append("profileImage", imageFile);

  const res = await updateVendorProfile(formData);
  if (res.message) {
    showToast("Profile updated!");
    await loadDashboardData();
  } else {
    showToast(res.message || "Failed to update", "error");
  }
};

// ── Portfolio Upload ──
const handlePortfolioUpload = async () => {
  const files = document.getElementById("portfolio-images").files;
  if (files.length === 0) return showToast("Select images first", "error");

  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }

  const res = await addPortfolioImages(formData);
  if (res.message) {
    showToast("Portfolio updated!");
    await loadDashboardData();
  } else {
    showToast("Failed to upload", "error");
  }
};

// ── Prefill Profile ──
const prefillProfile = () => {
  if (!vendorProfile) return;
  if (vendorProfile.whatsapp)
    document.getElementById("profile-whatsapp").value = vendorProfile.whatsapp;
  if (vendorProfile.location?.city)
    document.getElementById("profile-city").value = vendorProfile.location.city;
  if (vendorProfile.location?.state)
    document.getElementById("profile-state").value =
      vendorProfile.location.state;
  if (vendorProfile.availability?.workingHours)
    document.getElementById("profile-hours").value =
      vendorProfile.availability.workingHours;
  if (vendorProfile.availability?.workingDays)
    document.getElementById("profile-days").value =
      vendorProfile.availability.workingDays;
  if (vendorProfile.certification)
    document.getElementById("profile-cert").value = vendorProfile.certification;

  // show portfolio
  const portfolio = vendorProfile.portfolioImages || [];
  const portfolioDiv = document.getElementById("current-portfolio");
  if (portfolio.length > 0) {
    portfolioDiv.innerHTML = `
      <h4 style="margin-bottom: 10px;">Current Portfolio</h4>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
        ${portfolio
          .map(
            (url) => `
          <img src="${url}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px;" />
        `,
          )
          .join("")}
      </div>
    `;
  }
};

// ── Subscription Status ──
const updateSubscriptionStatus = () => {
  if (!vendorProfile) return;

  const status = vendorProfile.subscriptionStatus;
  const expiry = vendorProfile.subscriptionExpiry;

  const statusText = document.getElementById("sub-status-text");
  const expiryText = document.getElementById("sub-expiry-text");
  const badge = document.getElementById("sub-badge");

  statusText.textContent = status === "active" ? "Active" : "Inactive";

  if (expiry) {
    const expiryDate = expiry._seconds
      ? new Date(expiry._seconds * 1000)
      : new Date(expiry);
    expiryText.textContent = `Expires: ${expiryDate.toDateString()}`;
  }

  badge.innerHTML =
    status === "active"
      ? `<span style="background: var(--success); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">✓ Active</span>`
      : `<span style="background: #e74c3c; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">✗ Inactive</span>`;
};

// ── Subscribe ──
const handleSubscribe = async (plan) => {
  showToast("Initializing payment...");
  const res = await initializeSubscription(plan);
  if (res.paymentUrl) {
    window.open(res.paymentUrl, "_blank");
    showToast("Complete payment in the new tab");

    // poll for verification after payment
    setTimeout(async () => {
      const verified = await verifySubscription(res.reference);
      if (verified.message === "Subscription activated successfully") {
        showToast("Subscription activated! 🎉");
        await loadDashboardData();
      }
    }, 30000);
  } else {
    showToast(res.message || "Payment failed", "error");
  }
};

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});

const showInactiveBanner = () => {
  const existing = document.getElementById("inactive-banner");
  if (existing) return;

  const banner = document.createElement("div");
  banner.id = "inactive-banner";
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    background: #1a1a1a;
    border: 1px solid #FF6B35;
    border-radius: 12px;
    padding: 14px 16px;
    max-width: 280px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;
  banner.innerHTML = `
    <button onclick="document.getElementById('inactive-banner').remove()" style="
      position: absolute; top: 8px; right: 10px;
      background: none; border: none; color: #888; 
      font-size: 1.1rem; cursor: pointer;">×</button>
    <p style="color: #fff; font-size: 0.85rem; margin-bottom: 8px; padding-right: 16px;">
      🔔 Subscribe to share your business and services with the world!
    </p>
    <span onclick="switchDashTab('subscription')" style="
      color: #FF6B35; font-size: 0.85rem; 
      font-weight: 600; cursor: pointer;">
      Go to Subscription →
    </span>
  `;
  document.body.appendChild(banner);
};

// expose handlers and utilities to global scope so inline `onclick` attributes work
Object.assign(window, {
  switchDashTab,
  openModal,
  closeModal,
  handleLogin,
  showRegister,
  handleRegister,
  showLogin,
  handleAddProduct,
  handleAddService,
  handleAddCollection,
  handleDeleteProduct,
  handleDeleteService,
  handleDeleteCollection,
  handleRemoveFromCollection,
  showAddToCollection,
  handleUpdateProfile,
  handlePortfolioUpload,
  handleSubscribe,
  searchJobTitles,
  selectJobTitle,
  removeJobTitle,
});
