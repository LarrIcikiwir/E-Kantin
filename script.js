// ==========================================
// 1. SUPABASE CLIENT & CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';

// Inisialisasi aman tanpa risiko crash jika CDN lambat
const supabaseClient = (typeof window !== "undefined" && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const PASSCODES = {
  admin: ["ADMIN#2026", "admin123"],
  kantinMaster: "1234",
  kantinSpecific: { 1: "KANTIN1", 2: "KANTIN2", 3: "KANTIN3", 4: "KANTIN4", 5: "KANTIN5", 6: "KANTIN6" }
};

const FALLBACK_CANTEENS = [
  { id: 1, name: "Kantin 1 - Bu Siti (Aneka Nasi)", banner_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siti" },
  { id: 2, name: "Kantin 2 - Pak Joko (Mie & Bakso)", banner_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joko" },
  { id: 3, name: "Kantin 3 - Mbak Rini (Minuman & Kopi)", banner_url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rini" },
  { id: 4, name: "Kantin 4 - Mas Budi (Gorengan & Snack)", banner_url: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi" },
  { id: 5, name: "Kantin 5 - Teh Maya (Jus & Buah)", banner_url: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya" },
  { id: 6, name: "Kantin 6 - Koperasi Sekolah (ATK & Barang)", banner_url: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800", pfp_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Koperasi" }
];

// Fallback menu awal agar langsung tampil tanpa menunggu koneksi
const FALLBACK_PRODUCTS = [
  { id: 1, canteen_id: 1, name: "Nasi Uduk Komplit", price: 12000, stock: 15, cat: "makanan", variants: "Biasa, Telur, Ayam", image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" },
  { id: 2, canteen_id: 1, name: "Es Teh Manis Jumbo", price: 4000, stock: 30, cat: "minuman", variants: "Manis, Tawar, Lemon", image_url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400" },
  { id: 3, canteen_id: 6, name: "Buku Tulis 38 Lembar", price: 4500, stock: 50, cat: "non-makanan", variants: "Garis, Polos", image_url: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=400" }
];

// Validasi state user aman dari error localStorage
let currentUser;
try {
  currentUser = JSON.parse(localStorage.getItem("ekantin_user"));
  if (!currentUser || !currentUser.username || !currentUser.role) throw new Error();
} catch (e) {
  currentUser = {
    username: "Siswa 1",
    role: "pembeli",
    kantin_id: null,
    pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siswa1"
  };
  localStorage.setItem("ekantin_user", JSON.stringify(currentUser));
}

let canteens = [...FALLBACK_CANTEENS];
let selectedCanteenId = 1;
let products = [...FALLBACK_PRODUCTS];
let cart = [];
let orders = [];
let activeCategory = "all";
let searchQuery = "";
let activeChatContext = null;

const toRupiah = (num) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num || 0);

function compressImage(file, maxWidth = 600, quality = 0.6) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
    };
    reader.onerror = () => resolve(null);
  });
}

// ==========================================
// 2. INITIALIZATION (INSTAN & ANTI-MACET)
// ==========================================
function initApp() {
  try {
    // Langkah 1: Render tampilan dan pasang SEMUA tombol secara instan (0 detik)
    updateUserUI();
    setupEventListeners();
    populateCanteenDropdowns();
    updateCanteenBanner();
    renderProducts();
    renderCart();

    // Langkah 2: Sinkronkan dengan database Supabase di background tanpa bikin macet
    syncSupabaseData();
  } catch (err) {
    console.error("InitApp error:", err);
  }
}

async function syncSupabaseData() {
  if (!supabaseClient) {
    console.warn("Supabase client belum aktif, aplikasi berjalan dalam mode lokal.");
    return;
  }
  try {
    await loadCanteens();
    await loadProducts();
    await loadOrders();
    renderProducts();
    renderOrders();
  } catch (err) {
    console.warn("Gagal sinkron data Supabase:", err);
  }
}

function populateCanteenDropdowns() {
  const select = document.getElementById("canteenSelect");
  const loginSelect = document.getElementById("loginKantinId");
  if (select) {
    select.innerHTML = canteens.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    select.value = selectedCanteenId;
  }
  if (loginSelect) {
    loginSelect.innerHTML = canteens.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }
}

async function loadCanteens() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from("canteens").select("*").order("id", { ascending: true });
    if (!error && data && data.length > 0) {
      canteens = data;
      populateCanteenDropdowns();
      updateCanteenBanner();
    }
  } catch (e) {
    console.warn("Koneksi canteens:", e);
  }
}

async function loadProducts() {
  if (!supabaseClient) {
    const local = JSON.parse(localStorage.getItem(`ekantin_prod_${selectedCanteenId}`));
    if (local) products = local;
    return;
  }
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("canteen_id", Number(selectedCanteenId))
      .order("id", { ascending: false });

    if (!error && data && data.length > 0) {
      products = data;
    } else {
      const local = JSON.parse(localStorage.getItem(`ekantin_prod_${selectedCanteenId}`));
      if (local && local.length > 0) {
        products = local;
      } else {
        products = FALLBACK_PRODUCTS.filter(p => Number(p.canteen_id) === Number(selectedCanteenId));
      }
    }
  } catch (err) {
    console.warn("Load products:", err);
  }
}

// ==========================================
// 3. PESANAN (CHECKOUT & LOAD)
// ==========================================
async function handleCheckout() {
  if (cart.length === 0) return;
  const btn = document.getElementById("checkoutBtn");
  btn.disabled = true;
  btn.textContent = "Memproses Pesanan...";

  const totalAmount = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const newOrder = {
    canteen_id: Number(selectedCanteenId),
    buyer_username: currentUser.username,
    items: cart,
    total: totalAmount,
    status: 'pending'
  };

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from("orders").insert([newOrder]);
      if (error) console.warn("Supabase order insert error:", error.message);
    }

    const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
    localOrders.unshift({ ...newOrder, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem("ekantin_orders", JSON.stringify(localOrders));

    alert(`Pesanan senilai ${toRupiah(totalAmount)} BERHASIL DIBUAT!\nCek status pesanan di tab "Pesanan".`);
    cart = [];
    renderCart();
    document.getElementById("cartSidebar").classList.remove("open");
    await loadOrders();
    switchTab("orders");
  } catch (err) {
    alert("Pesanan dicatat ke sistem lokal.");
    cart = [];
    renderCart();
    switchTab("orders");
  } finally {
    btn.disabled = false;
    btn.textContent = "Beli Sekarang";
  }
}

async function loadOrders() {
  let loaded = [];
  if (supabaseClient) {
    try {
      let query = supabaseClient.from("orders").select("*").order("id", { ascending: false });
      if (currentUser.role === "kantin") {
        query = query.eq("canteen_id", Number(selectedCanteenId));
      } else if (currentUser.role === "pembeli") {
        query = query.eq("buyer_username", currentUser.username);
      }
      const { data, error } = await query;
      if (!error && data) loaded = data;
    } catch (e) {
      console.warn("Load orders:", e);
    }
  }

  if (loaded.length === 0) {
    const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
    if (currentUser.role === "kantin") {
      loaded = localOrders.filter(o => Number(o.canteen_id) === Number(selectedCanteenId));
    } else if (currentUser.role === "pembeli") {
      loaded = localOrders.filter(o => o.buyer_username === currentUser.username);
    } else {
      loaded = localOrders;
    }
  }

  orders = loaded;
  renderOrders();
}

function renderOrders() {
  const container = document.getElementById("ordersList");
  if (!container) return;
  const badge = document.getElementById("ordersCountBadge");
  const pendingOrders = orders.filter(o => o.status === "pending");

  if (badge) {
    badge.textContent = pendingOrders.length;
    badge.style.display = pendingOrders.length > 0 ? "inline-block" : "none";
  }

  if (orders.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada riwayat pesanan.</p>`;
    return;
  }

  container.innerHTML = orders.map(o => {
    const isKantin = currentUser.role === "kantin" || currentUser.role === "admin";
    const isPending = o.status === "pending";
    const canteenObj = canteens.find(c => c.id === Number(o.canteen_id)) || { name: `Kantin ${o.canteen_id}` };
    const itemsText = Array.isArray(o.items)
      ? o.items.map(i => `${i.name} (${i.variant || 'Normal'}) x${i.qty}`).join(", ")
      : "Rincian pesanan";

    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <strong>#ORD-${o.id} • ${canteenObj.name}</strong>
            <div style="font-size:0.75rem; color:var(--muted);">Pembeli: ${o.buyer_username}</div>
          </div>
          <span class="order-badge ${o.status}">${isPending ? '⏳ Sedang Disiapkan' : '✅ Selesai'}</span>
        </div>
        <div class="order-items-detail">${itemsText}</div>
        <div class="order-foot">
          <div>Total: <strong style="color:var(--primary);">${toRupiah(o.total)}</strong></div>
          <div class="order-actions-wrap">
            ${isPending ? `
              <button class="btn-chat" onclick="openOrderChat(${o.canteen_id}, '${o.buyer_username}', '#ORD-${o.id} - ${canteenObj.name}')">
                💬 Chat ${isKantin ? 'Pembeli' : 'Kantin'}
              </button>
            ` : `<small style="color:var(--muted); font-size:0.75rem;">Chat selesai</small>`}
            ${(isKantin && isPending) ? `
              <button class="btn-success" onclick="completeOrder(${o.id}, ${o.canteen_id}, '${o.buyer_username}')">
                ✅ Selesaikan Pesanan
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.completeOrder = async function(orderId, canteenId, buyerUsername) {
  if (!confirm(`Selesaikan pesanan #ORD-${orderId}? Chat obrolan seputar pesanan ini akan dibersihkan otomatis.`)) return;
  try {
    if (supabaseClient) {
      await supabaseClient.from("orders").update({ status: "selesai" }).eq("id", orderId);
      await supabaseClient.from("messages").delete().eq("canteen_id", Number(canteenId)).eq("buyer_username", buyerUsername);
    }
    const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
    const target = localOrders.find(o => o.id === orderId);
    if (target) target.status = "selesai";
    localStorage.setItem("ekantin_orders", JSON.stringify(localOrders));
    localStorage.removeItem(`chat_${canteenId}_${buyerUsername}`);

    alert(`Pesanan #ORD-${orderId} selesai! Chat telah dibersihkan.`);
    await loadOrders();
    document.getElementById("orderChatModal").close();
  } catch (err) {
    alert("Selesai diproses.");
    await loadOrders();
  }
};

// ==========================================
// 4. CHAT MODAL
// ==========================================
window.openOrderChat = function(canteenId, buyerUsername, title) {
  activeChatContext = { canteenId: Number(canteenId), buyerUsername, title };
  document.getElementById("orderChatModalTitle").textContent = `💬 ${title}`;
  document.getElementById("orderChatModalDesc").textContent = `Obrolan antara ${buyerUsername} dan Kantin`;
  document.getElementById("orderChatModal").showModal();
  loadOrderChatMessages();
};

async function loadOrderChatMessages() {
  if (!activeChatContext) return;
  const box = document.getElementById("orderChatMessages");
  let msgs = [];

  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("canteen_id", activeChatContext.canteenId)
        .eq("buyer_username", activeChatContext.buyerUsername)
        .order("id", { ascending: true });
      if (data) msgs = data;
    } catch (e) {}
  }

  if (msgs.length === 0) {
    const key = `chat_${activeChatContext.canteenId}_${activeChatContext.buyerUsername}`;
    msgs = JSON.parse(localStorage.getItem(key)) || [];
  }

  if (msgs.length === 0) {
    box.innerHTML = `<p class="empty-state">Belum ada obrolan. Tanyakan pesanan di sini!</p>`;
    return;
  }

  box.innerHTML = msgs.map(m => `
    <div class="msg-bubble ${m.sender_name === currentUser.username ? 'me' : 'other'}">
      <div class="msg-author">${m.sender_name} (${m.sender_role})</div>
      <div>${m.text}</div>
    </div>
  `).join("");
  box.scrollTop = box.scrollHeight;
}

// ==========================================
// 5. RENDERING CATALOG & CART
// ==========================================
function updateCanteenBanner() {
  const current = canteens.find(c => c.id === Number(selectedCanteenId)) || canteens[0];
  if (!current) return;
  const bannerEl = document.getElementById("canteenBanner");
  if (bannerEl) bannerEl.style.backgroundImage = `url('${current.banner_url}')`;
  const pfpEl = document.getElementById("canteenPfp");
  if (pfpEl) pfpEl.src = current.pfp_url;
  const titleEl = document.getElementById("canteenTitle");
  if (titleEl) titleEl.textContent = current.name;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

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
        <img class="card-img" src="${item.image_url || 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?w=400'}" alt="${item.name}" loading="lazy" />
        <div class="card-body">
          <span class="card-tag">${item.cat} • Stok: ${item.stock}</span>
          <h3 class="card-title">${item.name}</h3>
          ${variantList.length > 0 ? `<select class="variant-select" id="variant_${item.id}">${variantOptions}</select>` : ''}
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
  const mobileBadge = document.getElementById("mobileCartBadge");
  const mobileTotal = document.getElementById("mobileCartTotal");

  const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalAmount = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  if (totalEl) totalEl.textContent = toRupiah(totalAmount);
  if (mobileTotal) mobileTotal.textContent = toRupiah(totalAmount);
  if (mobileBadge) mobileBadge.textContent = `${totalQty} Item`;
  if (btn) btn.disabled = cart.length === 0;

  if (!container) return;
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
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `<p class="empty-state">Belum ada menu di kantin ini.</p>`;
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
// 6. USER UI & MODAL DIPISAH
// ==========================================
function updateUserUI() {
  const nameEl = document.getElementById("userName");
  const roleEl = document.getElementById("userRoleBadge");
  const pfpEl = document.getElementById("userPfp");

  if (nameEl) nameEl.textContent = currentUser.username;
  if (roleEl) roleEl.textContent = currentUser.role;
  if (pfpEl) pfpEl.src = currentUser.pfp || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`;

  document.querySelectorAll(".admin-only").forEach(el => el.style.display = currentUser.role === "admin" ? "inline-block" : "none");
  document.querySelectorAll(".kantin-only").forEach(el => el.style.display = currentUser.role === "kantin" ? "inline-block" : "none");

  if (currentUser.role === "kantin" && currentUser.kantin_id) {
    selectedCanteenId = currentUser.kantin_id;
    const select = document.getElementById("canteenSelect");
    if (select) select.value = selectedCanteenId;
  }
}

function openProfileModal() {
  document.getElementById("profileCurrentPfp").src = currentUser.pfp;
  document.getElementById("profileCurrentName").textContent = currentUser.username;
  document.getElementById("profileCurrentRole").textContent = (currentUser.role || "pembeli").toUpperCase();
  document.getElementById("profileModal").showModal();
}

// ==========================================
// 7. EVENT LISTENERS LENGKAP
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
  product.stock = Math.max(0, product.stock + delta);
  if (supabaseClient) {
    try { await supabaseClient.from("products").update({ stock: product.stock }).eq("id", id); } catch(e){}
  }
  localStorage.setItem(`ekantin_prod_${selectedCanteenId}`, JSON.stringify(products));
  renderProducts();
  renderKantinStockManager();
};

function setupEventListeners() {
  // Mobile Cart
  const cartSidebar = document.getElementById("cartSidebar");
  document.getElementById("openCartMobileBtn")?.addEventListener("click", () => cartSidebar.classList.add("open"));
  document.getElementById("closeCartMobileBtn")?.addEventListener("click", () => cartSidebar.classList.remove("open"));

  // Modal Profil & Login Terpisah
  document.getElementById("openProfileBtn")?.addEventListener("click", openProfileModal);
  document.getElementById("closeProfileBtn")?.addEventListener("click", () => document.getElementById("profileModal").close());
  document.getElementById("switchUserBtn")?.addEventListener("click", () => document.getElementById("loginModal").showModal());
  document.getElementById("cancelLoginBtn")?.addEventListener("click", () => document.getElementById("loginModal").close());
  document.getElementById("closeOrderChatBtn")?.addEventListener("click", () => document.getElementById("orderChatModal").close());

  // Ganti Kantin
  document.getElementById("canteenSelect")?.addEventListener("change", async (e) => {
    selectedCanteenId = Number(e.target.value);
    cart = [];
    renderCart();
    updateCanteenBanner();
    await loadProducts();
    await loadOrders();
    renderProducts();
    renderKantinStockManager();
  });

  // Navigasi Tab
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Filter Kategori
  document.querySelectorAll("#categoryChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelector("#categoryChips .chip.active")?.classList.remove("active");
      chip.classList.add("active");
      activeCategory = chip.dataset.cat;
      renderProducts();
    });
  });

  // Search
  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderProducts();
  });

  // Checkout
  document.getElementById("checkoutBtn")?.addEventListener("click", handleCheckout);
  document.getElementById("refreshOrdersBtn")?.addEventListener("click", () => loadOrders());

  // Form Chat Pesanan
  document.getElementById("orderChatForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeChatContext) return;
    const input = document.getElementById("orderChatInput");
    const text = input.value.trim();
    if (!text) return;

    const newMsg = {
      canteen_id: activeChatContext.canteenId,
      buyer_username: activeChatContext.buyerUsername,
      sender_name: currentUser.username,
      sender_role: currentUser.role,
      text
    };

    if (supabaseClient) {
      try { await supabaseClient.from("messages").insert([newMsg]); } catch(e){}
    }
    const key = `chat_${activeChatContext.canteenId}_${activeChatContext.buyerUsername}`;
    const localMsgs = JSON.parse(localStorage.getItem(key)) || [];
    localMsgs.push(newMsg);
    localStorage.setItem(key, JSON.stringify(localMsgs));

    input.value = "";
    await loadOrderChatMessages();
  });

  // Form Login
  document.getElementById("loginRole")?.addEventListener("change", (e) => {
    const role = e.target.value;
    document.getElementById("kantinOwnerSelectWrap").style.display = role === "kantin" ? "block" : "none";
    const hintEl = document.getElementById("passcodeHint");
    if (role === "admin") hintEl.textContent = "Kode Admin: ADMIN#2026 atau admin123";
    else if (role === "kantin") hintEl.textContent = "Kode Kantin: KANTIN1..KANTIN6 atau PIN 1234";
    else hintEl.textContent = "Pembeli: Bebas / PIN 1234";
  });

  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const role = document.getElementById("loginRole").value;
    const username = document.getElementById("loginUsername").value.trim();
    const passcode = document.getElementById("loginPasscode").value.trim();
    const kantin_id = role === "kantin" ? Number(document.getElementById("loginKantinId").value) : null;

    if (role === "admin" && !PASSCODES.admin.includes(passcode)) {
      alert("Kode Admin SALAH! Gunakan: ADMIN#2026");
      return;
    }
    if (role === "kantin") {
      const validCode = PASSCODES.kantinSpecific[kantin_id];
      if (passcode !== validCode && passcode !== PASSCODES.kantinMaster) {
        alert(`Kode Kantin SALAH! Gunakan PIN "${validCode}" atau "1234"`);
        return;
      }
    }

    let finalPfp = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    if (supabaseClient) {
      try {
        const { data: existingUser } = await supabaseClient.from("users").select("*").eq("username", username).maybeSingle();
        if (existingUser) {
          finalPfp = existingUser.pfp_url || finalPfp;
        } else {
          await supabaseClient.from("users").insert([{ username, role, passcode, kantin_id, pfp_url: finalPfp }]);
        }
      } catch (err) {}
    }

    currentUser = { username, role, kantin_id, pfp: finalPfp };
    localStorage.setItem("ekantin_user", JSON.stringify(currentUser));
    updateUserUI();
    document.getElementById("loginModal").close();
    alert(`Berhasil masuk sebagai ${username}!`);

    if (role === "kantin") switchTab("kantin");
    else if (role === "admin") switchTab("admin");
    else switchTab("catalog");

    await loadProducts();
    await loadOrders();
    renderProducts();
  });

  // Form Pengaturan Profil
  document.getElementById("updateProfileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSaveProfile");
    btn.disabled = true;
    btn.textContent = "Mengunggah...";

    try {
      const file = document.getElementById("updatePfpFile").files[0];
      if (!file) throw new Error("Pilih foto terlebih dahulu");

      const compressed = await compressImage(file, 250, 0.6);
      currentUser.pfp = compressed;
      localStorage.setItem("ekantin_user", JSON.stringify(currentUser));

      if (supabaseClient) {
        await supabaseClient.from("users").update({ pfp_url: compressed }).eq("username", currentUser.username);
      }

      updateUserUI();
      document.getElementById("profileCurrentPfp").src = compressed;
      alert("Foto profil berhasil diperbarui!");
      document.getElementById("profileModal").close();
      e.target.reset();
    } catch (err) {
      alert("Gagal update profil: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Foto Profil";
    }
  });

  // Form Tambah Menu
  document.getElementById("addMenuForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitMenu");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    try {
      const name = document.getElementById("menuName").value.trim();
      const price = Number(document.getElementById("menuPrice").value);
      const stock = Number(document.getElementById("menuStock").value);
      const cat = document.getElementById("menuCat").value;
      const variants = document.getElementById("menuVariants").value.trim();
      const file = document.getElementById("menuPhotoFile").files[0];

      let image_url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
      if (file) {
        const comp = await compressImage(file, 500, 0.6);
        if (comp) image_url = comp;
      }

      const targetCanteenId = (currentUser.role === "kantin" && currentUser.kantin_id)
        ? Number(currentUser.kantin_id)
        : Number(selectedCanteenId);

      const newProduct = { canteen_id: targetCanteenId, name, price, stock, cat, variants, image_url };

      if (supabaseClient) {
        await supabaseClient.from("products").insert([newProduct]);
      }
      products.unshift({ ...newProduct, id: Date.now() });
      localStorage.setItem(`ekantin_prod_${targetCanteenId}`, JSON.stringify(products));

      selectedCanteenId = targetCanteenId;
      document.getElementById("canteenSelect").value = targetCanteenId;
      activeCategory = "all";
      document.querySelectorAll("#categoryChips .chip").forEach((c, idx) => c.classList.toggle("active", idx === 0));

      e.target.reset();
      renderProducts();
      renderKantinStockManager();
      alert(`Menu "${name}" berhasil disimpan!`);
      switchTab("catalog");
    } catch (err) {
      alert("Gagal simpan menu: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Menu";
    }
  });

  // Form Tambah Kantin (Admin)
  document.getElementById("addCanteenForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitCanteen");
    btn.disabled = true;

    try {
      const name = document.getElementById("adminCanteenName").value;
      const bannerFile = document.getElementById("adminBannerFile").files[0];
      const pfpFile = document.getElementById("adminPfpFile").files[0];

      let banner_url = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800";
      let pfp_url = "https://api.dicebear.com/7.x/bottts/svg?seed=canteen";

      if (bannerFile) banner_url = (await compressImage(bannerFile, 800, 0.6)) || banner_url;
      if (pfpFile) pfp_url = (await compressImage(pfpFile, 250, 0.6)) || pfp_url;

      const newCanteen = { name, banner_url, pfp_url };

      if (supabaseClient) {
        await supabaseClient.from("canteens").insert([newCanteen]);
      }
      canteens.push({ ...newCanteen, id: canteens.length + 1 });
      populateCanteenDropdowns();
      alert("Kantin baru berhasil ditambahkan!");
      e.target.reset();
    } catch (err) {
      alert("Gagal menambah kantin: " + err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));

  if (tabId === "catalog") document.getElementById("viewCatalog").classList.add("active");
  if (tabId === "orders") {
    document.getElementById("viewOrders").classList.add("active");
    loadOrders();
  }
  if (tabId === "kantin") {
    document.getElementById("viewKantin").classList.add("active");
    renderKantinStockManager();
  }
  if (tabId === "admin") document.getElementById("viewAdmin").classList.add("active");
}

// Jalankan otomatis
initApp();
