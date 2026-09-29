// ==========================================
// 1. SUPABASE CLIENT & CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';

const supabaseClient = window.supabase
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

let currentUser = JSON.parse(localStorage.getItem("ekantin_user")) || {
  username: "Siswa 1",
  role: "pembeli",
  kantin_id: null,
  pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siswa1"
};

let canteens = [];
let selectedCanteenId = 1;
let products = [];
let cart = [];
let orders = [];
let activeCategory = "all";
let searchQuery = "";
let activeChatContext = null;

const toRupiah = (num) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

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
// 2. INITIALIZATION
// ==========================================
async function initApp() {
  updateUserUI();
  await loadCanteens();
  await loadProducts();
  await loadOrders();
  setupEventListeners();
  renderProducts();
  renderCart();
}

async function loadCanteens() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("canteens").select("*").order("id", { ascending: true });
      if (error) throw error;
      canteens = (data && data.length > 0) ? data : FALLBACK_CANTEENS;
    } catch (err) {
      console.warn("Koneksi canteens Supabase:", err.message);
      canteens = FALLBACK_CANTEENS;
    }
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
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("canteen_id", Number(selectedCanteenId))
        .order("id", { ascending: false });

      if (error) throw error;
      products = data || [];
    } catch (err) {
      console.error("Gagal load products:", err.message);
      products = JSON.parse(localStorage.getItem(`ekantin_prod_${selectedCanteenId}`)) || [];
    }
  } else {
    products = JSON.parse(localStorage.getItem(`ekantin_prod_${selectedCanteenId}`)) || [];
  }
}

// ==========================================
// 3. PESANAN (PEMBELIAN MASUK DUAL-SYNC)
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
    // 1. Simpan ke Supabase
    if (supabaseClient) {
      const { error } = await supabaseClient.from("orders").insert([newOrder]);
      if (error) throw error;
    }
    
    // 2. Selalu simpan ke local backup agar pasti masuk
    const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
    localOrders.unshift({ ...newOrder, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem("ekantin_orders", JSON.stringify(localOrders));

    alert(`Pesanan senilai ${toRupiah(totalAmount)} BERHASIL DIBUAT!\nLihat pesanan Anda di tab "Pesanan".`);
    cart = [];
    renderCart();
    document.getElementById("cartSidebar").classList.remove("open");
    await loadOrders();
    switchTab("orders");
  } catch (err) {
    console.error("Gagal checkout Supabase, simpan lokal:", err);
    // Simpan lokal jika Supabase ada kendala
    const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
    localOrders.unshift({ ...newOrder, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem("ekantin_orders", JSON.stringify(localOrders));

    alert(`Pesanan senilai ${toRupiah(totalAmount)} berhasil dicatat (Mode Offline)!`);
    cart = [];
    renderCart();
    document.getElementById("cartSidebar").classList.remove("open");
    await loadOrders();
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
    } catch (err) {
      console.warn("Load orders Supabase:", err.message);
    }
  }

  // Jika Supabase kosong, gunakan local
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
  const badge = document.getElementById("ordersCountBadge");
  const pendingOrders = orders.filter(o => o.status === "pending");

  if (pendingOrders.length > 0) {
    badge.textContent = pendingOrders.length;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
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
      : "Rincian item";

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
            ` : `
              <small style="color:var(--muted); font-size:0.75rem;">Chat ditutup</small>
            `}

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
  if (!confirm(`Selesaikan pesanan #ORD-${orderId}? Chat seputar pesanan ini akan otomatis dihapus.`)) return;

  try {
    if (supabaseClient) {
      await supabaseClient.from("orders").update({ status: "selesai" }).eq("id", orderId);
      await supabaseClient
        .from("messages")
        .delete()
        .eq("canteen_id", Number(canteenId))
        .eq("buyer_username", buyerUsername);
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
    alert("Gagal menyelesaikan pesanan: " + err.message);
  }
};

// ==========================================
// 4. CHAT PESANAN
// ==========================================
window.openOrderChat = function(canteenId, buyerUsername, title) {
  activeChatContext = { canteenId: Number(canteenId), buyerUsername, title };
  document.getElementById("orderChatModalTitle").textContent = `💬 ${title}`;
  document.getElementById("orderChatModalDesc").textContent = `Obrolan langsung antara ${buyerUsername} dan Kantin`;

  document.getElementById("orderChatModal").showModal();
  loadOrderChatMessages();
};

document.getElementById("closeOrderChatBtn").addEventListener("click", () => {
  document.getElementById("orderChatModal").close();
  activeChatContext = null;
});

async function loadOrderChatMessages() {
  if (!activeChatContext) return;
  const box = document.getElementById("orderChatMessages");

  let msgs = [];
  if (supabaseClient) {
    const { data } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("canteen_id", activeChatContext.canteenId)
      .eq("buyer_username", activeChatContext.buyerUsername)
      .order("id", { ascending: true });

    msgs = data || [];
  } else {
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

document.getElementById("orderChatForm").addEventListener("submit", async (e) => {
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
    await supabaseClient.from("messages").insert([newMsg]);
  } else {
    const key = `chat_${activeChatContext.canteenId}_${activeChatContext.buyerUsername}`;
    const localMsgs = JSON.parse(localStorage.getItem(key)) || [];
    localMsgs.push(newMsg);
    localStorage.setItem(key, JSON.stringify(localMsgs));
  }

  input.value = "";
  await loadOrderChatMessages();
});

// ==========================================
// 5. LOGIN CEPAT (TANPA RIBET UPLOAD)
// ==========================================
document.getElementById("loginRole").addEventListener("change", (e) => {
  const role = e.target.value;
  document.getElementById("kantinOwnerSelectWrap").style.display = role === "kantin" ? "block" : "none";
  const hintEl = document.getElementById("passcodeHint");
  if (role === "admin") hintEl.textContent = "Kode Admin: ADMIN#2026 atau admin123";
  else if (role === "kantin") hintEl.textContent = "Kode Kantin: KANTIN1..KANTIN6 atau PIN 1234";
  else hintEl.textContent = "Pembeli: Bebas / PIN 1234";
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnLoginSubmit");
  btn.disabled = true;
  btn.textContent = "Memverifikasi...";

  try {
    const role = document.getElementById("loginRole").value;
    const username = document.getElementById("loginUsername").value.trim();
    const passcode = document.getElementById("loginPasscode").value.trim();
    const kantin_id = role === "kantin" ? Number(document.getElementById("loginKantinId").value) : null;

    if (role === "admin") {
      if (!PASSCODES.admin.includes(passcode)) {
        alert("Kode Akses Admin SALAH! Gunakan: ADMIN#2026");
        return;
      }
    } else if (role === "kantin") {
      const validCode = PASSCODES.kantinSpecific[kantin_id];
      if (passcode !== validCode && passcode !== PASSCODES.kantinMaster) {
        alert(`Kode Kantin SALAH! Gunakan PIN "${validCode}" atau "1234"`);
        return;
      }
    }

    let finalPfp = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    // Cek di Supabase
    if (supabaseClient) {
      try {
        const { data: existingUser } = await supabaseClient
          .from("users")
          .select("*")
          .eq("username", username)
          .maybeSingle();

        if (existingUser) {
          if (existingUser.passcode !== passcode) {
            alert("Username ini sudah terdaftar tapi PIN/Password Anda salah!");
            return;
          }
          finalPfp = existingUser.pfp_url || finalPfp;
        } else {
