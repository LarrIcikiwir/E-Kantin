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
        <img class="card-img" src="${item.image_url || 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?w=400'}" alt="${it
