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

// State Obrolan yang sedang dibuka di modal
let activeChatContext = null; // { canteenId, buyerUsername, title }

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
      console.warn("Pakai fallback canteens:", err.message);
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
// 3. PESANAN (CHECKOUT & CHAT TERINTEGRASI)
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
      if (error) throw new Error(error.message);
    } else {
      const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
      localOrders.unshift({ ...newOrder, id: Date.now(), created_at: new Date().toISOString() });
      localStorage.setItem("ekantin_orders", JSON.stringify(localOrders));
    }

    alert(`Pesanan senilai ${toRupiah(totalAmount)} BERHASIL DIBUAT!\nLihat pesanan Anda dan chat langsung di tab "Pesanan".`);
    cart = [];
    renderCart();
    document.getElementById("cartSidebar").classList.remove("open");
    await loadOrders();
    switchTab("orders");
  } catch (err) {
    console.error("Gagal checkout:", err);
    alert("Gagal membuat pesanan:\n" + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Beli Sekarang";
  }
}

async function loadOrders() {
  if (supabaseClient) {
    try {
      let query = supabaseClient.from("orders").select("*").order("id", { ascending: false });

      if (currentUser.role === "kantin") {
        query = query.eq("canteen_id", Number(selectedCanteenId));
      } else if (currentUser.role === "pembeli") {
        query = query.eq("buyer_username", currentUser.username);
      }

      const { data, error } = await query;
      if (error) throw error;
      orders = data || [];
    } catch (err) {
      console.warn("Gagal load orders dari Supabase:", err.message);
      orders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
    }
  } else {
    orders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
  }

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
            <!-- Tombol Chat Pesanan (Hanya aktif selama pesanan pending) -->
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

// Selesaikan pesanan & HAPUS OTOMATIS chat obrolan tersebut
window.completeOrder = async function(orderId, canteenId, buyerUsername) {
  if (!confirm(`Selesaikan pesanan #ORD-${orderId}? Chat obrolan seputar pesanan ini akan dibersihkan otomatis.`)) return;

  try {
    if (supabaseClient) {
      await supabaseClient.from("orders").update({ status: "selesai" }).eq("id", orderId);
      await supabaseClient
        .from("messages")
        .delete()
        .eq("canteen_id", Number(canteenId))
        .eq("buyer_username", buyerUsername);
    } else {
      const localOrders = JSON.parse(localStorage.getItem("ekantin_orders")) || [];
      const target = localOrders.find(o => o.id === orderId);
      if (target) target.status = "selesai";
      localStorage.setItem("ekantin_orders", JSON.stringify(localOrders));

      localStorage.removeItem(`chat_${canteenId}_${buyerUsername}`);
    }

    alert(`Pesanan #ORD-${orderId} selesai! Riwayat chat telah dibersihkan.`);
    await loadOrders();
    document.getElementById("orderChatModal").close();
  } catch (err) {
    alert("Gagal menyelesaikan pesanan: " + err.message);
  }
};

// ==========================================
// 4. CHAT MODAL KHUSUS PESANAN
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
// 5. RENDERING CATALOG
// ==========================================
function updateCanteenBanner() {
  const current = canteens.find(c => c.id === Number(selectedCanteenId)) || canteens[0];
  if (!current) return;

  const bannerEl = document.getElementById("canteenBanner");
  bannerEl.style.backgroundImage = `url('${current.banner_url}')`;
  document.getElementById("canteenPfp").src = current.pfp_url;
  document.getElementById("canteenTitle").textContent = current.name;
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
        <img class="card-img" src="${item.image_url || 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?w=400'}" alt="${item.name}" loading="lazy" />
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
  const mobileBadge = document.getElementById("mobileCartBadge");
  const mobileTotal = document.getElementById("mobileCartTotal");

  const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalAmount = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  totalEl.textContent = toRupiah(totalAmount);
  if (mobileTotal) mobileTotal.textContent = toRupiah(totalAmount);
  if (mobileBadge) mobileBadge.textContent = `${totalQty} Item`;
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
    container.innerHTML = `<p class="empty-state">Belum ada menu di kantin ini. Tambahkan di form sebelah kiri.</p>`;
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
// 6. TAMBAH MENU
// ==========================================
async function handleAddMenuSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById("btnSubmitMenu");
  btn.disabled = true;
  btn.textContent = "Menyimpan ke Supabase...";

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

    const newProduct = {
      canteen_id: targetCanteenId,
      name,
      price,
      stock,
      cat,
      variants,
      image_url
    };

    if (supabaseClient) {
      const { error } = await supabaseClient.from("products").insert([newProduct]);
      if (error) throw new Error(error.message);
    } else {
      products.push({ ...newProduct, id: Date.now() });
      localStorage.setItem(`ekantin_prod_${targetCanteenId}`, JSON.stringify(products));
    }

    selectedCanteenId = targetCanteenId;
    document.getElementById("canteenSelect").value = targetCanteenId;
    activeCategory = "all";
    document.querySelectorAll("#categoryChips .chip").forEach((c, idx) => c.classList.toggle("active", idx === 0));

    e.target.reset();
    await loadProducts();
    renderProducts();
    renderKantinStockManager();

    alert(`Menu "${name}" berhasil disimpan!`);
    switchTab("catalog");
  } catch (err) {
    alert("GAGAL SIMPAN KE DATABASE:\n" + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Menu";
  }
}

// ==========================================
// 7. LOGIN & GANTI FOTO PROFIL (PFP)
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
  const role = document.getElementById("loginRole").value;
  const username = document.getElementById("loginUsername").value.trim();
  const passcode = document.getElementById("loginPasscode").value.trim();
  const pfpFile = document.getElementById("loginPfpFile").files[0];
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

  let newUploadedPfp = null;
  if (pfpFile) {
    newUploadedPfp = await compressImage(pfpFile, 250, 0.6);
  }

  let finalPfp = newUploadedPfp;

  if (supabaseClient) {
    try {
      const { data: existingUser } = await supabaseClient
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.passcode !== passcode) {
          alert("Username sudah ada, tetapi PIN/Password Anda salah!");
          return;
        }

        if (newUploadedPfp) {
          await supabaseClient.from("users").update({ pfp_url: newUploadedPfp }).eq("username", username);
          finalPfp = newUploadedPfp;
        } else {
          finalPfp = existingUser.pfp_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        }
      } else {
        finalPfp = newUploadedPfp || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        await supabaseClient.from("users").insert([{
          username,
          role,
          passcode,
          kantin_id,
          pfp_url: finalPfp
        }]);
      }
    } catch (err) {
      console.warn("Koneksi Supabase user:", err.message);
    }
  }

  if (!finalPfp) {
    finalPfp = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  }

  currentUser = { username, role, kantin_id, pfp: finalPfp };
  localStorage.setItem("ekantin_user", JSON.stringify(currentUser));

  updateUserUI();
  document.getElementById("loginModal").close();
  alert(`Berhasil masuk! Akun dan profil telah disinkronkan.`);

  if (role === "kantin") switchTab("kantin");
  else if (role === "admin") switchTab("admin");
  else switchTab("catalog");

  await loadProducts();
  await loadOrders();
  renderProducts();
});

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

// ==========================================
// 8. EVENTS & ACTIONS
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

function setupEventListeners() {
  const cartSidebar = document.getElementById("cartSidebar");
  document.getElementById("openCartMobileBtn")?.addEventListener("click", () => cartSidebar.classList.add("open"));
  document.getElementById("closeCartMobileBtn")?.addEventListener("click", () => cartSidebar.classList.remove("open"));

  document.getElementById("switchUserBtn").addEventListener("click", () => document.getElementById("loginModal").showModal());
  document.getElementById("cancelLoginBtn").addEventListener("click", () => document.getElementById("loginModal").close());

  document.getElementById("canteenSelect").addEventListener("change", async (e) => {
    selectedCanteenId = Number(e.target.value);
    cart = [];
    renderCart();
    updateCanteenBanner();
    await loadProducts();
    await loadOrders();
    renderProducts();
    renderKantinStockManager();
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

  document.getElementById("addMenuForm").addEventListener("submit", handleAddMenuSubmit);
  document.getElementById("checkoutBtn").addEventListener("click", handleCheckout);
  document.getElementById("refreshOrdersBtn").addEventListener("click", () => loadOrders());

  // Form Tambah Kantin (Admin)
  document.getElementById("addCanteenForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitCanteen");
    btn.disabled = true;

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
    } else {
      canteens.push({ ...newCanteen, id: canteens.length + 1 });
    }

    btn.disabled = false;
    e.target.reset();
    await loadCanteens();
    alert("Kantin baru berhasil ditambahkan!");
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

initApp();
