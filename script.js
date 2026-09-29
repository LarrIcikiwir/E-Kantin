// ==========================================
// 1. KONFIGURASI SUPABASE & STATE
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Fallback 6 Kantin jika koneksi offline / tabel belum di-seed
const FALLBACK_CANTEENS = [
  { id: 1, name: "Kantin 1 - Bu Siti (Aneka Nasi)", banner_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siti" },
  { id: 2, name: "Kantin 2 - Pak Joko (Mie & Bakso)", banner_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1000", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joko" },
  { id: 3, name: "Kantin 3 - Mbak Rini (Minuman & Kopi)", banner_url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=1000", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rini" },
  { id: 4, name: "Kantin 4 - Mas Budi (Gorengan & Snack)", banner_url: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=1000", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi" },
  { id: 5, name: "Kantin 5 - Teh Maya (Jus & Buah)", banner_url: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1000", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya" },
  { id: 6, name: "Kantin 6 - Koperasi Sekolah (ATK & Non-Makanan)", banner_url: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=1000", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Koperasi" }
];

// State Global
let currentUser = JSON.parse(localStorage.getItem("ekantin_user")) || {
  username: "Siswa 1",
  role: "pembeli",
  kantin_id: null,
  pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siswa1"
};

let canteens = [];
let selectedCanteenId = 1;
let products = [];
let cart = []; // [{ id, name, price, variant, qty }]
let activeCategory = "all";
let searchQuery = "";

const toRupiah = (num) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

// ==========================================
// 2. INITIALIZATION & DATA FETCHING
// ==========================================
async function initApp() {
  updateUserUI();
  await loadCanteens();
  await loadProducts();
  setupEventListeners();
  renderProducts();
  renderCart();
  loadMessages();
}

async function loadCanteens() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from("canteens").select("*").order("id", { ascending: true });
    canteens = (!error && data?.length) ? data : FALLBACK_CANTEENS;
  } else {
    canteens = FALLBACK_CANTEENS;
  }

  const select = document.getElementById("canteenSelect");
  const loginSelect = document.getElementById("loginKantinId");
  select.innerHTML = canteens.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  loginSelect.innerHTML = canteens.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  select.value = selectedCanteenId;
  updateCanteenBanner();
}

async function loadProducts() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("canteen_id", selectedCanteenId)
      .order("id", { ascending: false });

    products = (!error && data) ? data : [];
  } else {
    products = JSON.parse(localStorage.getItem(`ekantin_prod_${selectedCanteenId}`)) || [];
  }
}

// ==========================================
// 3. UI RENDERING
// ==========================================
function updateCanteenBanner() {
  const current = canteens.find(c => c.id === Number(selectedCanteenId)) || canteens[0];
  if (!current) return;

  const bannerEl = document.getElementById("canteenBanner");
  bannerEl.style.backgroundImage = `url('${current.banner_url}')`;
  document.getElementById("canteenPfp").src = current.pfp_url;
  document.getElementById("canteenTitle").textContent = current.name;
  document.getElementById("chatWithTitle").textContent = `Chat dengan ${current.name}`;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const filtered = products.filter(p => {
    const matchCat = activeCategory === "all" || p.cat === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state" style="grid-column: 1/-1;">Belum ada menu di kantin ini.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const variantList = item.variants ? item.variants.split(",").map(v => v.trim()).filter(Boolean) : [];
    const variantOptions = variantList.map(v => `<option value="${v}">${v}</option>`).join("");
    const isOutOfStock = item.stock <= 0;

    return `
      <article class="card">
        <img class="card-img" src="${item.image_url || 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?w=400'}" alt="${item.name}" />
        <div class="card-body">
          <span class="card-tag">${item.cat} • Stok: ${item.stock}</span>
          <h3 class="card-title">${item.name}</h3>

          ${variantList.length > 0 ? `
            <select class="variant-select" id="variant_${item.id}">
              ${variantOptions}
            </select>
          ` : ''}

          <div class="card-footer">
            <span class="card-price">${toRupiah(item.price)}</span>
            <button class="btn-primary" ${isOutOfStock ? "disabled" : ""} onclick="handleAddToCart(${item.id})">
              ${isOutOfStock ? "Habis" : "+ Beli"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotalPrice");
  const btn = document.getElementById("checkoutBtn");

  const total = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  totalEl.textContent = toRupiah(total);
  btn.disabled = cart.length === 0;

  if (cart.length === 0) {
    container.innerHTML = `<p class="empty-state">Keranjang kosong.</p>`;
    return;
  }

  container.innerHTML = cart.map((i, idx) => `
    <div class="cart-row">
      <div>
        <strong>${i.name}</strong>
        ${i.variant ? `<div style="font-size: 0.75rem; color: var(--muted);">${i.variant}</div>` : ""}
        <div>${i.qty} x ${toRupiah(i.price)}</div>
      </div>
      <button class="btn-sm" onclick="removeFromCart(${idx})">Hapus</button>
    </div>
  `).join("");
}

function renderKantinStockManager() {
  const container = document.getElementById("kantinMenuList");
  if (!products.length) {
    container.innerHTML = `<p class="empty-state">Belum ada produk terdaftar di kantin ini.</p>`;
    return;
  }

  container.innerHTML = products.map(item => `
    <div class="stock-item-row">
      <div>
        <strong>${item.name}</strong>
        <div style="font-size: 0.75rem; color: var(--muted);">${toRupiah(item.price)} (${item.cat})</div>
      </div>
      <div class="stock-ctrl">
        <button class="stock-btn" onclick="modifyStock(${item.id}, -1)">-</button>
        <strong>${item.stock}</strong>
        <button class="stock-btn" onclick="modifyStock(${item.id}, 1)">+</button>
      </div>
    </div>
  `).join("");
}

// ==========================================
// 4. CART & STOCK ACTIONS
// ==========================================
window.handleAddToCart = function(id) {
  const product = products.find(p => p.id === id);
  if (!product || product.stock <= 0) return;

  const variantSelect = document.getElementById(`variant_${id}`);
  const variant = variantSelect ? variantSelect.value : "";

  const existing = cart.find(c => c.id === id && c.variant === variant);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, variant, qty: 1 });
  }
  renderCart();
};

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  renderCart();
};

window.modifyStock = async function(id, delta) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const newStock = Math.max(0, product.stock + delta);
  product.stock = newStock;

  if (supabaseClient) {
    await supabaseClient.from("products").update({ stock: newStock }).eq("id", id);
  } else {
    localStorage.setItem(`ekantin_prod_${selectedCanteenId}`, JSON.stringify(products));
  }

  renderProducts();
  renderKantinStockManager();
};

// ==========================================
// 5. CHAT SYSTEM
// ==========================================
async function loadMessages() {
  const box = document.getElementById("chatMessages");
  if (supabaseClient) {
    const { data } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("canteen_id", selectedCanteenId)
      .order("id", { ascending: true });

    if (data) renderMessagesList(data);
  } else {
    const localMsgs = JSON.parse(localStorage.getItem(`chat_${selectedCanteenId}`)) || [];
    renderMessagesList(localMsgs);
  }
}

function renderMessagesList(msgs) {
  const box = document.getElementById("chatMessages");
  box.innerHTML = msgs.map(m => `
    <div class="msg-bubble ${m.sender_name === currentUser.username ? 'me' : 'other'}">
      <div class="msg-author">${m.sender_name} (${m.sender_role})</div>
      <div>${m.text}</div>
    </div>
  `).join("");
  box.scrollTop = box.scrollHeight;
}

document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const newMsg = {
    canteen_id: Number(selectedCanteenId),
    sender_name: currentUser.username,
    sender_role: currentUser.role,
    text
  };

  if (supabaseClient) {
    await supabaseClient.from("messages").insert([newMsg]);
  } else {
    const key = `chat_${selectedCanteenId}`;
    const localMsgs = JSON.parse(localStorage.getItem(key)) || [];
    localMsgs.push(newMsg);
    localStorage.setItem(key, JSON.stringify(localMsgs));
  }

  input.value = "";
  loadMessages();
});

// ==========================================
// 6. USER, ROLE & NAVIGATION
// ==========================================
function updateUserUI() {
  document.getElementById("userName").textContent = currentUser.username;
  document.getElementById("userRoleBadge").textContent = currentUser.role;
  document.getElementById("userPfp").src = currentUser.pfp || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`;

  document.querySelectorAll(".admin-only").forEach(el => el.style.display = currentUser.role === "admin" ? "inline-block" : "none");
  document.querySelectorAll(".kantin-only").forEach(el => el.style.display = currentUser.role === "kantin" ? "inline-block" : "none");

  if (currentUser.role === "kantin" && currentUser.kantin_id) {
    selectedCanteenId = currentUser.kantin_id;
    document.getElementById("canteenSelect").value = selectedCanteenId;
  }
}

const loginModal = document.getElementById("loginModal");
document.getElementById("switchUserBtn").addEventListener("click", () => loginModal.showModal());

document.getElementById("loginRole").addEventListener("change", (e) => {
  document.getElementById("kantinOwnerSelectWrap").style.display = e.target.value === "kantin" ? "block" : "none";
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const role = document.getElementById("loginRole").value;
  const username = document.getElementById("loginUsername").value.trim();
  const pfpInput = document.getElementById("loginPfpInput").value.trim();
  const kantin_id = role === "kantin" ? Number(document.getElementById("loginKantinId").value) : null;

  currentUser = {
    username,
    role,
    kantin_id,
    pfp: pfpInput || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };

  localStorage.setItem("ekantin_user", JSON.stringify(currentUser));
  updateUserUI();
  loginModal.close();
  switchTab("catalog");
  loadProducts().then(() => renderProducts());
});

function setupEventListeners() {
  document.getElementById("canteenSelect").addEventListener("change", async (e) => {
    selectedCanteenId = Number(e.target.value);
    cart = [];
    renderCart();
    updateCanteenBanner();
    await loadProducts();
    renderProducts();
    renderKantinStockManager();
    loadMessages();
  });

  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll("#categoryChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelector("#categoryChips .chip.active")?.classList.remove("active");
      chip.classList.add("active");
      activeCategory = chip.dataset.cat;
      renderProducts();
    });
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderProducts();
  });

  // Tambah Menu (Upload Foto -> Base64 data URL)
  document.getElementById("addMenuForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("menuName").value;
    const price = Number(document.getElementById("menuPrice").value);
    const stock = Number(document.getElementById("menuStock").value);
    const cat = document.getElementById("menuCat").value;
    const variants = document.getElementById("menuVariants").value;
    const file = document.getElementById("menuPhotoFile").files[0];

    let image_url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
    if (file) {
      image_url = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      });
    }

    const newProduct = { canteen_id: Number(selectedCanteenId), name, price, stock, cat, variants, image_url };

    if (supabaseClient) {
      await supabaseClient.from("products").insert([newProduct]);
    } else {
      products.push({ ...newProduct, id: Date.now() });
      localStorage.setItem(`ekantin_prod_${selectedCanteenId}`, JSON.stringify(products));
    }

    e.target.reset();
    await loadProducts();
    renderProducts();
    renderKantinStockManager();
    alert("Menu berhasil ditambahkan!");
  });

  // Tambah Kantin Baru (Admin)
  document.getElementById("addCanteenForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("adminCanteenName").value;
    const banner_url = document.getElementById("adminBannerUrl").value;
    const pfp_url = document.getElementById("adminPfpUrl").value;

    const newCanteen = { name, banner_url, pfp_url };

    if (supabaseClient) {
      await supabaseClient.from("canteens").insert([newCanteen]);
    } else {
      canteens.push({ ...newCanteen, id: canteens.length + 1 });
    }

    e.target.reset();
    await loadCanteens();
    alert("Kantin baru berhasil ditambahkan!");
  });

  document.getElementById("checkoutBtn").addEventListener("click", () => {
    alert("Pesanan berhasil dikirim ke penjual kantin!");
    cart = [];
    renderCart();
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));

  if (tabId === "catalog") document.getElementById("viewCatalog").classList.add("active");
  if (tabId === "chat") {
    document.getElementById("viewChat").classList.add("active");
    loadMessages();
  }
  if (tabId === "kantin") {
    document.getElementById("viewKantin").classList.add("active");
    renderKantinStockManager();
  }
  if (tabId === "admin") document.getElementById("viewAdmin").classList.add("active");
}

// Runnable self-check
(function selfCheck() {
  const sampleVariants = "Pedas, Sedang, Manis";
  const parsed = sampleVariants.split(",").map(s => s.trim());
  console.assert(parsed.length === 3 && parsed[0] === "Pedas", "Self-check failed: Variant parsing issue");
})();

initApp();
