// ── 3D Hero Animation ──
const initHero = () => {
  const canvas = document.getElementById("hero-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 5;

  // floating particles
  const geometry = new THREE.BufferGeometry();
  const count = 800;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xff6b35,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // floating rings
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(1.5 + i * 0.8, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.15 - i * 0.03,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    scene.add(ring);
    rings.push(ring);
  }

  // animate
  const animate = () => {
    requestAnimationFrame(animate);
    particles.rotation.y += 0.001;
    particles.rotation.x += 0.0005;
    rings.forEach((ring, i) => {
      ring.rotation.x += 0.002 * (i + 1);
      ring.rotation.y += 0.001 * (i + 1);
    });
    renderer.render(scene, camera);
  };

  animate();

  // resize handler
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};

// ── Category Icons Map ──
const categoryIcons = {
  Education: "📚",
  Healthcare: "🏥",
  "Legal & Finance": "⚖️",
  "Construction & Skilled Trades": "🔨",
  "Home Services": "🏠",
  Automotive: "🚗",
  Technology: "💻",
  "Beauty & Fashion": "💄",
  Events: "🎉",
  "Business Services": "💼",
  Security: "🔒",
  Agriculture: "🌾",
  "Delivery & Transport": "🚚",
  "Manufacturing & Industrial": "🏭",
  "Creative Arts": "🎨",
  "Fitness & Sports": "💪",
  "Religious & Community": "🙏",
  "Repair Services": "🔧",
  "Real Estate": "🏢",
  "Specialized Services": "⭐",
};

// ── Load Categories ──
const loadCategories = async () => {
  const grid = document.getElementById("category-grid");
  try {
    const data = await getJobTitles();
    const categories = data.jobTitles || data.categories || [];

    if (categories.length === 0) {
      grid.innerHTML =
        "<p class='text-sub text-center'>No categories found</p>";
      return;
    }

    grid.innerHTML = categories
      .map(
        (cat) => `
      <div class="category-card" onclick="window.location='browse.html?type=services&category=${encodeURIComponent(cat.category)}'">
        <div class="icon">${categoryIcons[cat.category] || "🔹"}</div>
        <p>${cat.category}</p>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    grid.innerHTML =
      "<p class='text-sub text-center'>Failed to load categories</p>";
  }
};

// ── Load Vendors ──
const loadVendors = async () => {
  const grid = document.getElementById("vendor-grid");
  try {
    const data = await getVendors();
    let vendors = data.vendors || [];

    if (vendors.length === 0) {
      grid.innerHTML = "<p class='text-sub text-center'>No vendors yet</p>";
      return;
    }

    // shuffle vendors randomly
    vendors = vendors.sort(() => Math.random() - 0.5);

    // show max 6 on homepage
    vendors = vendors.slice(0, 6);

    grid.innerHTML = vendors
      .map(
        (vendor) => `
      <div class="vendor-card" onclick="window.location='vendor.html?id=${vendor.id}'">
        <img 
          class="vendor-card-image" 
          src="${vendor.profileImage || "https://via.placeholder.com/400x160/1a1a1a/FF6B35?text=No+Image"}" 
          alt="${vendor.businessName}"
        />
        <div class="vendor-card-body">
          <h3>${vendor.businessName}</h3>
          <p>${vendor.category || "General"}</p>
          <div class="vendor-card-meta">
            <span class="vendor-type-badge">${vendor.vendorType === "service" ? "🔧 Service" : "🛍️ Products"}</span>
            <span class="vendor-location">📍 ${vendor.location?.city || "Nigeria"}</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    grid.innerHTML =
      "<p class='text-sub text-center'>Failed to load vendors</p>";
  }
};

// ── Search Functions ──
const searchProducts = () => {
  const query = document.getElementById("product-search").value.trim();
  if (!query) return showToast("Enter a product to search", "error");
  window.location.href = `browse.html?type=products&search=${encodeURIComponent(query)}`;
};

const searchServices = () => {
  const query = document.getElementById("service-search").value.trim();
  if (!query) return showToast("Enter a service to search", "error");
  window.location.href = `browse.html?type=services&search=${encodeURIComponent(query)}`;
};

// ── Enter Key Support ──
document.getElementById("product-search").addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchProducts();
});

document.getElementById("service-search").addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchServices();
});

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  initHero();
  loadCategories();
  loadVendors();
});
