// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. DATA KANTIN
// ==========================================
const canteenLayouts = {
  1: { name: 'Kantin 1 - Spesialis Nasi & Berat', desc: 'BISA QRIS: ?' },
  2: { name: 'Kantin 2 - Bebakaran & Mie', desc: 'BISA QRIS: BISA.' },
  3: { name: 'Kantin 3 - Snack & Cold Drink', desc: 'BISA QRIS: ?' },
  4: { name: 'Kantin 4 - Masakan Rumahan', desc: 'BISA QRIS: ?' },
  5: { name: 'Kantin 5 - Western & Fast Food', desc: 'BISA QRIS: TIDAK' },
  6: { name: 'Kantin 6 - Jus & Buah Segar', desc: 'BISA QRIS: ?' }
};

let products = [];
let currentUser = null;
let currentRole = 'guest';
let activeCanteen = 1;

function $(id) {
  return document.getElementById(id);
}

// ==========================================
// 3. AUTENTIKASI & PROFIL
// ==========================================
async function initApp() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    await fetchUserProfile(currentUser.id);
  } else {
    enterApp('guest');
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await fetchUserProfile(currentUser.id);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentRole = 'guest';
      $('main-app').classList.add('hidden');$('login-portal').classList.remove('hidden');
    }
  });
}

async function fetchUserProfile(userId) {
  // Mengambil data dari tabel data_user
  const { data, error } = await supabaseClient
    .from('data_user')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Gagal memuat profil user:', error);
    enterApp('guest');
    return;
  }

  enterApp(data.role);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const btn = $('btn-login');

  btn.disabled = true;
  btn.innerHTML = `<span>Memproses...</span>`;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  btn.disabled = false;
  btn.innerHTML = `<span>Masuk ke Sistem</span>`;

  if (error) {
    alert('Gagal login: ' + error.message);
  }
}

function loginGuest() {
  enterApp('guest');
}

function enterApp(role) {
  currentRole = role;
  $('login-portal').classList.add('hidden');$('main-app').classList.remove('hidden');
  
  changeRole(role);
  fetchProducts();
}

async function logout() {
  await supabaseClient.auth.signOut();
}

// ==========================================
// 4. MANAJEMEN DATA (TABEL data_kantin)
// ==========================================
async function fetchProducts() {
  const list = $('product-list');
  list.innerHTML = `<p class="text-slate-400 col-span-full italic text-center py-8">Memuat data menu...</p>`;

  // Mengambil data dari tabel data_kantin
  const { data, error } = await supabaseClient
    .from('data_kantin')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Gagal mengambil data:', error);
    list.innerHTML = `
      <div class="col-span-full text-center py-8">
        <i class="ri-error-warning-line text-3xl text-rose-500"></i>
        <p class="text-rose-500 font-semibold mt-2">Gagal memuat data dari Supabase.</p>
      </div>`;
    return;
  }

  products = (data || []).map(item => ({
    id: item.id,
    canteenId: Number(item.canteen_id),
    name: item.name,
    price: Number(item.price),
    img: item.img || ''
  }));

  renderCanteen(activeCanteen);
  renderAdminStats();
}

async function handleAddProduct(e) {
  e.preventDefault();

  if (!currentRole.startsWith('kantin') && currentRole !== 'admin') {
    alert('Akses ditolak.');
    return;
  }

  const canteenNum = currentRole === 'admin' ? activeCanteen : parseInt(currentRole.replace('kantin', ''));
  const name = $('prod-name').value.trim();
  const price = parseInt($('prod-price').value);
  const img = $('prod-img').value.trim();
  const btn = $('btn-submit-product');

  if (!name || !Number.isFinite(price) || price < 0) {
    alert('Input data tidak valid.');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  // Menambah data ke tabel data_kantin
  const { error } = await supabaseClient
    .from('data_kantin')
    .insert([{
      canteen_id: canteenNum,
      name: name,
      price: price,
      img: img || null
    }]);

  btn.disabled = false;
  btn.innerText = 'Tambah Menu';

  if (error) {
    console.error('Gagal menambah menu:', error);
    alert('Gagal menambah menu! ' + error.message);
    return;
  }

  $('add-product-form').reset();
  await fetchProducts();
}

async function deleteProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (!confirm(`Hapus menu "${product.name}"?`)) return;

  // Menghapus data dari tabel data_kantin
  const { error } = await supabaseClient
    .from('data_kantin')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Gagal menghapus menu:', error);
    alert('Gagal menghapus menu! ' + error.message);
    return;
  }

  await fetchProducts();
}

// ==========================================
// 5. RENDERING UI
// ==========================================
function renderTabs() {
  const tabs = $('kantin-tabs');
  tabs.innerHTML = '';

  for (let i = 1; i <= 6; i++) {
    const active = activeCanteen === i;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Kantin ${i}`;
    button.className = `px-4 py-2 font-semibold text-xs rounded-xl transition-all whitespace-nowrap ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
    }`;
    button.addEventListener('click', () => selectCanteen(i));
    tabs.appendChild(button);
  }
}

function selectCanteen(id) {
  activeCanteen = Number(id);
  renderTabs();
  renderCanteen(activeCanteen);
}

function renderCanteen(id) {
  const layout = canteenLayouts[id];
  if (!layout) return;

  $('canteen-name').textContent = layout.name;
  $('canteen-desc').textContent = layout.desc;

  const list = $('product-list');
  const filtered = products.filter(p => Number(p.canteenId) === Number(id));

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="col-span-full text-center py-10">
        <i class="ri-restaurant-line text-4xl text-slate-300"></i>
        <p class="text-slate-400 italic mt-2">Belum ada menu yang dijual di kantin ini.</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-slate-200 overflow-hidden canteen-card flex flex-col justify-between';

    const image = document.createElement('img');
    image.className = 'product-image';
    image.alt = p.name;
    image.src = p.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
    image.onerror = function () {
      this.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
    };

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="p-4">
        <h4 class="font-bold text-slate-800 text-base mb-1">${escapeHTML(p.name)}</h4>
        <p class="text-emerald-600 font-extrabold text-sm">Rp ${Number(p.price).toLocaleString('id-ID')}</p>
      </div>`;

    const top = document.createElement('div');
    top.appendChild(image);
    top.appendChild(content);
    card.appendChild(top);

    const canDelete = currentRole === 'admin' || currentRole === `kantin${id}`;

    if (canDelete) {
      const footer = document.createElement('div');
      footer.className = 'p-3 bg-slate-50 border-t border-slate-100 flex justify-end';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1';
      button.innerHTML = `<i class="ri-delete-bin-line"></i><span>Hapus</span>`;
      button.addEventListener('click', () => deleteProduct(p.id));

      footer.appendChild(button);
      card.appendChild(footer);
    }

    list.appendChild(card);
  });
}

function renderAdminStats() {
  const stats = $('admin-stats');
  if (!stats) return;
  stats.innerHTML = '';

  for (let i = 1; i <= 6; i++) {
    const count = products.filter(p => Number(p.canteenId) === i).length;
    stats.innerHTML += `
      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
        <div class="font-bold text-slate-800 text-sm">Kantin ${i}</div>
        <div class="text-xs text-slate-500 font-medium mt-0.5">${count} Menu</div>
      </div>`;
  }
}

function changeRole(role) {
  $('role-display').textContent = `Role: ${role.toUpperCase()}`;

  const adminPage = $('page-admin');
  const ownerPage = $('page-owner');

  adminPage.classList.add('hidden');
  ownerPage.classList.add('hidden');

  if (role === 'admin') {
    adminPage.classList.remove('hidden');
    ownerPage.classList.remove('hidden');
    $('owner-title').textContent = 'Manajemen Menu All Kantin (Admin)';
  } else if (role.startsWith('kantin')) {
    const canteenNum = parseInt(role.replace('kantin', ''));
    ownerPage.classList.remove('hidden');
    $('owner-title').textContent = `Manajemen Menu (Kantin ${canteenNum})`;
    selectCanteen(canteenNum);
  } else {
    selectCanteen(activeCanteen);
  }
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// 6. EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  $('auth-form').addEventListener('submit', handleAuthSubmit);$('guest-login').addEventListener('click', loginGuest);
  $('logout-btn').addEventListener('click', logout);$('add-product-form').addEventListener('submit', handleAddProduct);

  renderTabs();
  initApp();
});
