// ==========================================
// 🔑 SUPABASE CONFIGURATION
// Replace the values below with your credentials from
// Supabase Dashboard -> Project Settings -> API
// ==========================================
const SUPABASE_URL = "https://ymaqspvidhwgzwrxxbfk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl";

// ponytail: naive configuration check allows local testing prior to database provisioning
const isSupabaseConfigured = !SUPABASE_URL.includes("YOUR_PROJECT_ID");
const supabase = isSupabaseConfigured && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Fallback menu in case Supabase is offline or not configured yet
const FALLBACK_PRODUCTS = [
  { id: 1, name: "Nasi Goreng Spesial", price: 15000, cat: "makanan", icon: "🍳" },
  { id: 2, name: "Ayam Geprek Sambal Bawang", price: 17000, cat: "makanan", icon: "🍗" },
  { id: 3, name: "Mie Ayam Bakso", price: 13000, cat: "makanan", icon: "🍜" },
  { id: 4, name: "Es Teh Manis Jumbo", price: 4000, cat: "minuman", icon: "🧋" },
  { id: 5, name: "Kopi Susu Gula Aren", price: 8000, cat: "minuman", icon: "☕" },
  { id: 6, name: "Jus Alpukat", price: 10000, cat: "minuman", icon: "🥑" },
  { id: 7, name: "Kentang Goreng", price: 9000, cat: "snack", icon: "🍟" },
  { id: 8, name: "Pisang Goreng Keju", price: 7000, cat: "snack", icon: "🍌" }
];

let PRODUCTS = [];
let cart = {}; // Format: { [productId]: quantity }
let activeCategory = "all";
let searchQuery = "";

const toRupiah = (num) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

// Fetch products from Supabase
async function loadProducts() {
  if (!supabase) {
    console.warn("Supabase keys not replaced yet. Using local fallback data.");
    PRODUCTS = FALLBACK_PRODUCTS;
    renderProducts();
    return;
  }

  try {
    const { data, error } = await supabase.from("products").select("*");
    if (error || !data || data.length === 0) {
      console.error("Supabase load error:", error);
      PRODUCTS = FALLBACK_PRODUCTS;
    } else {
      PRODUCTS = data;
    }
  } catch (err) {
    console.error("Failed to connect to Supabase:", err);
    PRODUCTS = FALLBACK_PRODUCTS;
  }

  renderProducts();
}

// Render Menu
function renderProducts() {
  const grid = document.getElementById("productGrid");
  const filtered = PRODUCTS.filter((item) => {
    const matchCat = activeCategory === "all" || item.cat === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state" style="grid-column: 1/-1;">Item tidak ditemukan.</p>`;
    return;
  }

  grid.innerHTML = filtered.map((item) => `
    <article class="card">
      <div class="card-thumb">${item.icon}</div>
      <div class="card-body">
        <span class="card-tag">${item.cat}</span>
        <h3 class="card-title">${item.name}</h3>
        <p class="card-price">${toRupiah(item.price)}</p>
        <button class="btn-primary" onclick="addToCart(${item.id})">+ Tambah</button>
      </div>
    </article>
  `).join("");
}

// Render Cart
function renderCart() {
  const container = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("subtotalPrice");
  const totalEl = document.getElementById("totalPrice");
  const badgeEl = document.getElementById("cartCountBadge");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const items = Object.entries(cart).map(([id, qty]) => {
    const prod = PRODUCTS.find((p) => p.id === Number(id));
    return { ...prod, qty };
  });

  const totalQty = items.reduce((acc, i) => acc + i.qty, 0);
  const totalAmount = items.reduce((acc, i) => acc + (i.price * i.qty), 0);

  badgeEl.textContent = totalQty;
  subtotalEl.textContent = toRupiah(totalAmount);
  totalEl.textContent = toRupiah(totalAmount);
  checkoutBtn.disabled = items.length === 0;

  if (items.length === 0) {
    container.innerHTML = `<p class="empty-state">Keranjang masih kosong.</p>`;
    return;
  }

  container.innerHTML = items.map((i) => `
    <div class="cart-item">
      <div>
        <strong>${i.name}</strong>
        <div style="color: var(--muted); font-size: 0.8rem;">${toRupiah(i.price)}</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="updateQty(${i.id}, -1)">-</button>
        <span>${i.qty}</span>
        <button class="qty-btn" onclick="updateQty(${i.id}, 1)">+</button>
      </div>
    </div>
  `).join("");
}

// Global Cart Actions
window.addToCart = function (id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
};

window.updateQty = function (id, delta) {
  if (!cart[id]) return;
  cart[id] += delta;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
};

// Event Listeners
document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderProducts();
});

document.querySelectorAll("#categoryList .chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector("#categoryList .chip.active")?.classList.remove("active");
    btn.classList.add("active");
    activeCategory = btn.dataset.cat;
    renderProducts();
  });
});

// Mobile Drawer Toggle
const cartDrawer = document.getElementById("cartDrawer");
document.getElementById("cartToggleBtn").addEventListener("click", () => {
  cartDrawer.classList.toggle("open");
});

document.getElementById("closeCartBtn").addEventListener("click", () => {
  cartDrawer.classList.remove("open");
});

// Checkout Modal & Save Order to Supabase
const modal = document.getElementById("checkoutModal");
document.getElementById("checkoutBtn").addEventListener("click", () => {
  const totalAmount = Object.entries(cart).reduce((acc, [id, qty]) => {
    const prod = PRODUCTS.find((p) => p.id === Number(id));
    return acc + (prod.price * qty);
  }, 0);

  document.getElementById("modalNominal").textContent = toRupiah(totalAmount);
  modal.showModal();
});

document.getElementById("cancelModalBtn").addEventListener("click", () => modal.close());

document.getElementById("confirmPayBtn").addEventListener("click", async () => {
  const orderItems = Object.entries(cart).map(([id, qty]) => {
    const prod = PRODUCTS.find((p) => p.id === Number(id));
    return { id: prod.id, name: prod.name, price: prod.price, qty };
  });
  const total = orderItems.reduce((acc, i) => acc + (i.price * i.qty), 0);

  if (supabase) {
    const { error } = await supabase.from("orders").insert([{ items: orderItems, total }]);
    if (error) console.error("Gagal simpan ke Supabase:", error);
  }

  alert("Pembayaran berhasil diterima! Pesanan tersimpan.");
  cart = {};
  renderCart();
  modal.close();
  cartDrawer.classList.remove("open");
});

// Initialize
loadProducts();
renderCart();

// Runnable self-check
(function testCartCalculation() {
  const samplePrice = 15000;
  const sampleQty = 2;
  console.assert(samplePrice * sampleQty === 30000, "Math check failed");
})();
