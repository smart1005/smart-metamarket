let allProducts = [];
let allServices = [];
let currentTab = "products";
let selectedCategory = null;

// ── Switch Tabs ──
const switchTab = (tab) => {
  currentTab = tab;

  document.getElementById("products-tab").style.display =
    tab === "products" ? "block" : "none";
  document.getElementById("services-tab").style.display =
    tab === "services" ? "block" : "none";

  document.getElementById("btn-products").className =
    `btn w-full ${tab === "products" ? "btn-primary" : "btn-outline"}`;
  document.getElementById("btn-services").className =
    `btn w-full ${tab === "services" ? "btn-primary" : "btn-outline"}`;

  document.getElementById("browse-search").placeholder =
    tab === "products" ? "Search products..." : "Search services...";
  document.getElementById("browse-search").value = "";

  handleSearch();
};

// ── Handle Search ──
const handleSearch = () => {
  const query = document
    .getElementById("browse-search")
    .value.toLowerCase()
    .trim();

  if (currentTab === "products") {
    const filtered = allProducts.filter((p) =>
      p.name.toLowerCase().includes(query),
    );
    renderProducts(filtered);
  } else {
    let filtered = allServices;
    if (selectedCategory) {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }
    if (query) {
      filtered = filtered.filter(
        (s) =>
          s.jobTitle?.toLowerCase().includes(query) ||
          s.title?.toLowerCase().includes(query) ||
          s.skills?.some((skill) => skill.toLowerCase().includes(query)),
      );
    }
    renderServices(filtered);
  }
};

// ── Render Products ──
const renderProducts = (products) => {
  const grid = document.getElementById("products-grid");
  const count = document.getElementById("product-count");
  count.textContent = `${products.length} found`;

products = products.sort(() => Math.random() - 0.5);

  if (products.length === 0) {
    grid.innerHTML = "<p class='text-sub text-center'>No products found</p>";
    return;
  }

  grid.innerHTML = products
    .map(
      (product) => `
    <div class="vendor-card" onclick="window.location='vendor.html?id=${product.vendorId}'">
      <img 
        class="vendor-card-image" 
        src="${product.imageUrl || "https://via.placeholder.com/400x160/1a1a1a/FF6B35?text=No+Image"}" 
        alt="${product.name}"
      />
      <div class="vendor-card-body">
        <h3>${product.name}</h3>
        <p>${product.description || ""}</p>
        <div class="vendor-card-meta">
          <span class="vendor-type-badge">₦${Number(product.price).toLocaleString()}</span>
          <span class="vendor-location">by ${product.vendorName}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
};

// ── Render Services ──
const renderServices = (services) => {
  const grid = document.getElementById("services-grid");
  const count = document.getElementById("service-count");
  count.textContent = `${services.length} found`;
  
services = services.sort(() => Math.random() - 0.5);

  if (services.length === 0) {
    grid.innerHTML = "<p class='text-sub text-center'>No services found</p>";
    return;
  }

  grid.innerHTML = services
    .map(
      (service) => `
    <div class="vendor-card" onclick="window.location='vendor.html?id=${service.vendorId}'">
      <img 
        class="vendor-card-image" 
        src="${service.imageUrl || service.imageUrls?.[0] || "https://via.placeholder.com/400x160/1a1a1a/FF6B35?text=No+Image"}" 
        alt="${service.jobTitle || service.title}"
      />
      <div class="vendor-card-body">
        <h3>${service.jobTitle || service.title}</h3>
        <p>${service.description || ""}</p>
        <div class="vendor-card-meta">
          <span class="vendor-type-badge">🔧 ${service.category || "Service"}</span>
          <span class="vendor-location">by ${service.vendorName}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
};

// ── Load Category Filter ──
const loadCategoryFilter = async () => {
  const container = document.getElementById("category-filter");
  try {
    const data = await getJobTitles();
    const categories = data.jobTitles || data.categories || [];

    container.innerHTML = `
      <button 
        class="btn btn-primary" 
        id="cat-all"
        onclick="filterByCategory(null)"
        style="margin-right: 8px; padding: 6px 14px; font-size: 0.8rem; display: inline-block;"
      >All</button>
      ${categories
        .map(
          (cat) => `
        <button 
          class="btn btn-outline" 
          id="cat-${cat.category}"
          onclick="filterByCategory('${cat.category}')"
          style="margin-right: 8px; padding: 6px 14px; font-size: 0.8rem; display: inline-block; white-space: nowrap;"
        >${cat.category}</button>
      `,
        )
        .join("")}
    `;
  } catch (error) {
    container.innerHTML = "";
  }
};

// ── Filter By Category ──
const filterByCategory = (category) => {
  selectedCategory = category;

  // update button styles
  document.querySelectorAll("#category-filter button").forEach((btn) => {
    btn.className = "btn btn-outline";
    btn.style.cssText =
      "margin-right: 8px; padding: 6px 14px; font-size: 0.8rem; display: inline-block; white-space: nowrap;";
  });

  const activeBtn = category
    ? document.getElementById(`cat-${category}`)
    : document.getElementById("cat-all");

  if (activeBtn) {
    activeBtn.className = "btn btn-primary";
    activeBtn.style.cssText =
      "margin-right: 8px; padding: 6px 14px; font-size: 0.8rem; display: inline-block; white-space: nowrap;";
  }

  handleSearch();
};

// ── Load All Data ──
const loadData = async () => {
  try {
    const [productsData, servicesData] = await Promise.all([
      getProducts(),
      getServices(),
    ]);

    allProducts = productsData.products || [];
    allServices = servicesData.services || [];

    renderProducts(allProducts);
    renderServices(allServices);
    loadCategoryFilter();
  } catch (error) {
    showToast("Failed to load data", "error");
  }
};

// ── Check URL Params ──
const checkUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const search = params.get("search");
  const category = params.get("category");

  if (type === "services") {
    switchTab("services");
    if (category) filterByCategory(category);
  } else {
    switchTab("products");
  }

  if (search) {
    document.getElementById("browse-search").value = search;
    handleSearch();
  }
};

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  checkUrlParams();
});
