// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. STATE APLIKASI
// ==========================================
let products = [];
let activeCanteen = 1;

function $(id) {
  return document.getElementById(id);
}

// ==========================================
// 3. AMBIL DATA DARI SUPABASE
// ==========================================
async function fetchProducts() {
  const list = $('menu-list');
  list.innerHTML = `<p class="text-slate-400 col-span-full italic text-center py-8">Memuat data menu...</p>`;

  const { data, error } = await supabaseClient
    .from('data_kantin')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Gagal mengambil data:', error);
    list.innerHTML = `
      <div class="col-span-full text-center py-8">
        <i class="ri-error-warning-line text-3xl text-rose-500"></i>
        <p class="text-rose-500 font-semibold mt-2">Gagal memuat data dari database.</p>
      </div>`;
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

// ==========================================
// 4. TAMBAH MENU BARU
// ==========================================
async function handleAddProduct(e) {
  e.preventDefault();

  const canteenId = parseInt($('canteen-select').value);
  const name = $('name').value.trim();
  const price = parseInt($('price').value);
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!name || !Number.isFinite(price) || price < 0) {
    alert('Input data tidak valid.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = 'Menyimpan...';

  const { error } = await supabaseClient
    .from('data_kantin')
    .insert([{
      canteen_id: canteenId,
      name: name,
      price: price
    }]);

  submitBtn.disabled = false;
  submitBtn.innerText = 'Simpan';

  if (error) {
    console.error('Gagal menambah menu:', error);
    alert('Gagal menambah menu: ' + error.message);
    return;
  }

  $('add-form').reset();
  filterKantin(canteenId);
  await fetchProducts();
}

// ==========================================
// 5. HAPUS MENU
// ==========================================
async function deleteMenu(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (!confirm(`Hapus menu "${product.name}"?`)) return;

  const { error } = await supabaseClient
    .from('data_kantin')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Gagal menghapus menu:', error);
    alert('Gagal menghapus menu: ' + error.message);
    return;
  }

  await fetchProducts();
}

// ==========================================
// 6. FILTER & RENDERING UI
// ==========================================
function filterKantin(id) {
  activeCanteen = Number(id);
  updateTabStyle();
  renderMenu();
}

function updateTabStyle() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach((tab, index) => {
    const canteenNumber = index + 1;
    if (canteenNumber === activeCanteen) {
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
        <button onclick="deleteMenu(${item.id})" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition active:scale-95" title="Hapus Menu">
          <i class="ri-delete-bin-line text-base"></i>
        </button>
      </div>
    `;
  });
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  $('add-form').addEventListener('submit', handleAddProduct);
  updateTabStyle();
  fetchProducts();
});
