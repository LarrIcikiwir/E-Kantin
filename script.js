// ==========================================
// KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let activeCanteen = 1;
let currentRole = 'guest'; // Default Mode Guest

function $(id) {
  return document.getElementById(id);
}

// ==========================================
// LOGIN MANUAL VIA TABEL DATABASE
// ==========================================
async function handleLoginSubmit(e) {
  e.preventDefault();

  const usernameInput = $('login-email').value.trim(); // Bisa diisi username/email
  const passwordInput = $('login-password').value;
  const btn = $('btn-submit-login');

  btn.disabled = true;
  btn.innerText = 'Memproses...';

  // 1. Cek data username/email dan password langsung ke tabel data_user
  const { data, error } = await supabaseClient
    .from('data_user')
    .select('*')
    .eq('username', usernameInput) // Sesuaikan nama kolom jika di DB pakai 'email'
    .eq('password', passwordInput)
    .single();

  btn.disabled = false;
  btn.innerText = 'Masuk';

  if (error || !data) {
    alert('Username atau Password salah!');
    return;
  }

  // 2. Simpan session login sederhana di browser (LocalStorage)
  localStorage.setItem('user_session', JSON.stringify({
    username: data.username,
    role: data.role
  }));

  // 3. Update UI sesuai Role yang didapat dari tabel
  updateRoleUI(data.role);
  closeLoginModal();
}

// Cek status login saat halaman pertama kali dibuka
function checkLocalSession() {
  const savedSession = localStorage.getItem('user_session');
  if (savedSession) {
    const user = JSON.parse(savedSession);
    updateRoleUI(user.role);
  } else {
    updateRoleUI('guest');
  }
}

// Logout sederhana
function logout() {
  localStorage.removeItem('user_session');
  updateRoleUI('guest');
}

// ==========================================
// UPDATE UI SESUAI ROLE
// ==========================================
function updateRoleUI(role) {
  currentRole = role;
  const roleBadge = $('role-badge');
  const btnLogin = $('btn-login-trigger');
  const btnLogout = $('btn-logout');
  const formContainer = $('add-form-container');
  const selectCanteen = $('canteen-select');

  if (role === 'guest') {
    roleBadge.innerText = 'Mode Guest';
    roleBadge.className = 'bg-slate-100 text-slate-600 border border-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold';
    btnLogin.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    formContainer.classList.add('hidden');
  } else {
    btnLogin.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    formContainer.classList.remove('hidden');

    if (role === 'admin') {
      roleBadge.innerText = 'Role: ADMIN';
      roleBadge.className = 'bg-rose-100 text-rose-700 border border-rose-200 text-xs px-3 py-1.5 rounded-xl font-bold';
      selectCanteen.disabled = false;
    } else if (role.startsWith('kantin')) {
      const num = role.replace('kantin', '');
      roleBadge.innerText = `Role: Kantin ${num}`;
      roleBadge.className = 'bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-xl font-bold';
      selectCanteen.value = num;
      selectCanteen.disabled = true;
    }
  }

  renderMenu();
}

// Modal Handlers
function openLoginModal() {
  $('login-modal').classList.remove('hidden');
}

function closeLoginModal() {
  $('login-modal').classList.add('hidden');$('login-form').reset();
}

// ==========================================
// FETCH & CRUD MENU
// ==========================================
async function fetchProducts() {
  const list = $('menu-list');
  list.innerHTML = `<p class="text-slate-400 col-span-full italic text-center py-8">Memuat data menu...</p>`;

  const { data, error } = await supabaseClient
    .from('data_kantin')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    list.innerHTML = `<p class="text-rose-500 col-span-full text-center py-8">Gagal memuat data menu.</p>`;
    return;
  }

  products = (data || []).map(item => ({
    id: item.id,
    canteenId: Number(item.canteen_id),
    name: item.name,
    price: Number(item.price)
  }));

  renderMenu();
}

async function handleAddProduct(e) {
  e.preventDefault();

  let canteenId = parseInt($('canteen-select').value);
  if (currentRole.startsWith('kantin')) {
    canteenId = parseInt(currentRole.replace('kantin', ''));
  }

  const name = $('name').value.trim();
  const price = parseInt($('price').value);

  const { error } = await supabaseClient
    .from('data_kantin')
    .insert([{ canteen_id: canteenId, name: name, price: price }]);

  if (error) {
    alert('Gagal menambah menu: ' + error.message);
    return;
  }

  $('add-form').reset();
  filterKantin(canteenId);
  await fetchProducts();
}

async function deleteMenu(id) {
  const product = products.find(p => p.id === id);
  if (!product || !confirm(`Hapus menu "${product.name}"?`)) return;

  const { error } = await supabaseClient.from('data_kantin').delete().eq('id', id);

  if (error) {
    alert('Gagal menghapus: ' + error.message);
    return;
  }

  await fetchProducts();
}

function filterKantin(id) {
  activeCanteen = Number(id);
  updateTabStyle();
  renderMenu();
}

function updateTabStyle() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach((tab, index) => {
    const canteenNum = index + 1;
    if (canteenNum === activeCanteen) {
      tab.className = 'tab-btn bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-md shadow-indigo-600/20';
    } else {
      tab.className = 'tab-btn bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition whitespace-nowrap shadow-sm';
    }
  });
}

function renderMenu() {
  const list = $('menu-list');
  const filtered = products.filter(p => p.canteenId === activeCanteen);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="col-span-full text-center py-10">
        <i class="ri-restaurant-line text-4xl text-slate-300"></i>
        <p class="text-slate-400 italic mt-2">Belum ada menu di Kantin ${activeCanteen}.</p>
      </div>`;
    return;
  }

  const canDelete = currentRole === 'admin' || currentRole === `kantin${activeCanteen}`;

  list.innerHTML = '';
  filtered.forEach(item => {
    list.innerHTML += `
      <div class="card-item bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <div class="space-y-0.5">
          <h3 class="font-bold text-slate-800 text-sm">${escapeHTML(item.name)}</h3>
          <p class="text-xs text-emerald-600 font-extrabold">
            Rp ${item.price.toLocaleString('id-ID')}
          </p>
        </div>
        ${canDelete ? `
          <button onclick="deleteMenu(${item.id})" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition active:scale-95" title="Hapus Menu">
            <i class="ri-delete-bin-line text-base"></i>
          </button>
        ` : ''}
      </div>
    `;
  });
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// INIALISASI
document.addEventListener('DOMContentLoaded', () => {
  $('login-form').addEventListener('submit', handleLoginSubmit);$('add-form').addEventListener('submit', handleAddProduct);
  updateTabStyle();
  checkLocalSession();
  fetchProducts();
});
