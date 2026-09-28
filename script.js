// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================

const SUPABASE_URL = 'https://ourpabonuhvntmugogky.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_qLSSiu0TuPnZxqEiqyrBBg_r0ymdsSM';

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ==========================================
// 2. AKUN
// ==========================================

const userAccounts = {
  admin: {
    password: 'admin123',
    role: 'admin'
  },

  kantin1: {
    password: 'kantin1pass',
    role: 'kantin1'
  },

  kantin2: {
    password: 'kantin2pass',
    role: 'kantin2'
  },

  kantin3: {
    password: 'kantin3pass',
    role: 'kantin3'
  },

  kantin4: {
    password: 'kantin4pass',
    role: 'kantin4'
  },

  kantin5: {
    password: 'kantin5pass',
    role: 'kantin5'
  },

  kantin6: {
    password: 'kantin6pass',
    role: 'kantin6'
  }
};


// ==========================================
// 3. DATA KANTIN
// ==========================================

const canteenLayouts = {

  1: {
    name: 'Kantin 1 - Spesialis Nasi & Berat',
    desc: 'Menyediakan aneka nasi olahan segar dan lauk pauk.'
  },

  2: {
    name: 'Kantin 2 - Bebakaran & Mie',
    desc: 'Spesialis Mie Goreng, Rebus, dan Bakaran Pedas.'
  },

  3: {
    name: 'Kantin 3 - Snack & Cold Drink',
    desc: 'Tempat nongkrong dengan es boba, kopi, dan camilan renyah.'
  },

  4: {
    name: 'Kantin 4 - Masakan Rumahan',
    desc: 'Menu prasmanan sehat dan hemat kantong mahasiswa/siswa.'
  },

  5: {
    name: 'Kantin 5 - Western & Fast Food',
    desc: 'Burger, Dimsum, Kentang Goreng, dan Milkshake.'
  },

  6: {
    name: 'Kantin 6 - Jus & Buah Segar',
    desc: 'Jus buah murni, es buah, dan salad sehat.'
  }

};


let products = [];

let currentRole = 'guest';

let activeCanteen = 1;


// ==========================================
// 4. ELEMENT HELPER
// ==========================================

function $(id) {
  return document.getElementById(id);
}


// ==========================================
// 5. LOGIN
// ==========================================

function handleAuthSubmit(e) {

  e.preventDefault();

  const username = $('auth-username').value.trim();
  const password = $('auth-password').value;

  const user = userAccounts[username];

  if (!user || user.password !== password) {

    alert('Username atau Password salah!');

    return;
  }

  $('auth-form').reset();

  enterApp(user.role);
}


// ==========================================
// 6. LOGIN GUEST
// ==========================================

function loginGuest() {

  enterApp('guest');

}


// ==========================================
// 7. MASUK APLIKASI
// ==========================================

function enterApp(role) {

  $('login-portal').classList.add('hidden');

  $('main-app').classList.remove('hidden');

  changeRole(role);

}


// ==========================================
// 8. LOGOUT
// ==========================================

function logout() {

  currentRole = 'guest';

  $('main-app').classList.add('hidden');

  $('login-portal').classList.remove('hidden');

}


// ==========================================
// 9. AMBIL DATA PRODUK
// ==========================================

async function fetchProducts() {

  const list = $('product-list');

  list.innerHTML = `
    <p class="text-slate-400 col-span-full italic text-center py-8">
      Memuat data menu...
    </p>
  `;


  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('id', { ascending: true });


  if (error) {

    console.error('Gagal mengambil data:', error);

    list.innerHTML = `
      <div class="col-span-full text-center py-8">

        <i class="ri-error-warning-line text-3xl text-rose-500"></i>

        <p class="text-rose-500 font-semibold mt-2">
          Gagal memuat data dari Supabase.
        </p>

        <p class="text-xs text-slate-400 mt-1">
          Periksa koneksi atau konfigurasi database.
        </p>

      </div>
    `;

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


// ==========================================
// 10. TAMBAH PRODUK
// ==========================================

async function handleAddProduct(e) {

  e.preventDefault();


  if (!currentRole.startsWith('kantin')) {

    alert('Hanya pemilik kantin yang dapat menambahkan menu.');

    return;
  }


  const canteenNum =
    parseInt(currentRole.replace('kantin', ''));


  const name =
    $('prod-name').value.trim();


  const price =
    parseInt($('prod-price').value);


  const img =
    $('prod-img').value.trim();


  if (!name) {

    alert('Nama menu wajib diisi.');

    return;
  }


  if (!Number.isFinite(price) || price < 0) {

    alert('Harga tidak valid.');

    return;
  }


  const { error } = await supabaseClient
    .from('products')
    .insert([{
      canteen_id: canteenNum,
      name: name,
      price: price,
      img: img || null
    }]);


  if (error) {

    console.error('Gagal menambah menu:', error);

    alert('Gagal menambah menu!');

    return;
  }


  $('add-product-form').reset();

  await fetchProducts();

}


// ==========================================
// 11. HAPUS PRODUK
// ==========================================

async function deleteProduct(id) {

  const product =
    products.find(p => p.id === id);


  if (!product) {

    alert('Menu tidak ditemukan.');

    return;
  }


  // Admin boleh hapus semua.
  // Pemilik hanya boleh hapus menu kantinnya.

  if (
    currentRole !== 'admin' &&
    currentRole !== `kantin${product.canteenId}`
  ) {

    alert('Kamu tidak memiliki izin untuk menghapus menu ini.');

    return;
  }


  if (!confirm(`Hapus menu "${product.name}"?`)) {

    return;
  }


  const { error } = await supabaseClient
    .from('products')
    .delete()
    .eq('id', id);


  if (error) {

    console.error('Gagal menghapus menu:', error);

    alert('Gagal menghapus menu!');

    return;
  }


  await fetchProducts();

}


// ==========================================
// 12. TAB KANTIN
// ==========================================

function renderTabs() {

  const tabs = $('kantin-tabs');

  tabs.innerHTML = '';


  for (let i = 1; i <= 6; i++) {

    const active =
      activeCanteen === i;


    const button =
      document.createElement('button');


    button.type = 'button';

    button.textContent = `Kantin ${i}`;

    button.className = `
      px-4 py-2
      font-semibold
      text-xs
      rounded-xl
      transition-all
      whitespace-nowrap
      ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }
    `;


    button.addEventListener('click', () => {

      selectCanteen(i);

    });


    tabs.appendChild(button);

  }

}


// ==========================================
// 13. PILIH KANTIN
// ==========================================

function selectCanteen(id) {

  activeCanteen = Number(id);

  renderTabs();

  renderCanteen(activeCanteen);

}


// ==========================================
// 14. RENDER KATALOG
// ==========================================

function renderCanteen(id) {

  const layout =
    canteenLayouts[id];


  if (!layout) return;


  $('canteen-name').textContent =
    layout.name;


  $('canteen-desc').textContent =
    layout.desc;


  const list =
    $('product-list');


  const filtered =
    products.filter(
      p => Number(p.canteenId) === Number(id)
    );


  if (filtered.length === 0) {

    list.innerHTML = `
      <div class="col-span-full text-center py-10">

        <i class="ri-restaurant-line text-4xl text-slate-300"></i>

        <p class="text-slate-400 italic mt-2">
          Belum ada menu yang dijual di kantin ini.
        </p>

      </div>
    `;

    return;
  }


  list.innerHTML = '';


  filtered.forEach(p => {

    const card =
      document.createElement('div');


    card.className =
      'bg-white rounded-xl border border-slate-200 overflow-hidden canteen-card flex flex-col justify-between';


    const image =
      document.createElement('img');


    image.className =
      'product-image';


    image.alt =
      p.name;


    image.src =
      p.img ||
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';


    image.onerror = function () {

      this.src =
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

    };


    const content =
      document.createElement('div');


    content.innerHTML = `
      <div class="p-4">

        <h4 class="font-bold text-slate-800 text-base mb-1">
          ${escapeHTML(p.name)}
        </h4>

        <p class="text-emerald-600 font-extrabold text-sm">
          Rp ${Number(p.price).toLocaleString('id-ID')}
        </p>

      </div>
    `;


    const top =
      document.createElement('div');


    top.appendChild(image);

    top.appendChild(content);

    card.appendChild(top);


    const canDelete =
      currentRole === 'admin' ||
      currentRole === `kantin${id}`;


    if (canDelete) {

      const footer =
        document.createElement('div');


      footer.className =
        'p-3 bg-slate-50 border-t border-slate-100 flex justify-end';


      const button =
        document.createElement('button');


      button.type = 'button';

      button.className =
        'text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1';


      button.innerHTML = `
        <i class="ri-delete-bin-line"></i>
        <span>Hapus</span>
      `;


      button.addEventListener('click', () => {

        deleteProduct(p.id);

      });


      footer.appendChild(button);

      card.appendChild(footer);

    }


    list.appendChild(card);

  });

}


// ==========================================
// 15. STATISTIK ADMIN
// ==========================================

function renderAdminStats() {

  const stats =
    $('admin-stats');


  if (!stats) return;


  stats.innerHTML = '';


  for (let i = 1; i <= 6; i++) {

    const count =
      products.filter(
        p => Number(p.canteenId) === i
      ).length;


    stats.innerHTML += `
      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">

        <div class="font-bold text-slate-800 text-sm">
          Kantin ${i}
        </div>

        <div class="text-xs text-slate-500 font-medium mt-0.5">
          ${count} Menu
        </div>

      </div>
    `;

  }

}


// ==========================================
// 16. GANTI ROLE
// ==========================================

function changeRole(role) {

  currentRole = role;


  $('role-display').textContent =
    `Role: ${role.toUpperCase()}`;


  const adminPage =
    $('page-admin');


  const ownerPage =
    $('page-owner');


  adminPage.classList.add('hidden');

  ownerPage.classList.add('hidden');


  if (role === 'admin') {

    adminPage.classList.remove('hidden');

    renderAdminStats();

  }


  else if (role.startsWith('kantin')) {

    const canteenNum =
      parseInt(
        role.replace('kantin', '')
      );


    ownerPage.classList.remove('hidden');


    $('owner-title').textContent =
      `Manajemen Menu (Kantin ${canteenNum})`;


    selectCanteen(canteenNum);

  }


  else {

    selectCanteen(activeCanteen);

  }


  renderCanteen(activeCanteen);

}


// ==========================================
// 17. ESCAPE HTML
// ==========================================

function escapeHTML(text) {

  const div =
    document.createElement('div');

  div.textContent =
    text;

  return div.innerHTML;

}


// ==========================================
// 18. EVENT LISTENERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

  $('auth-form')
    .addEventListener(
      'submit',
      handleAuthSubmit
    );


  $('guest-login')
    .addEventListener(
      'click',
      loginGuest
    );


  $('logout-btn')
    .addEventListener(
      'click',
      logout
    );


  $('add-product-form')
    .addEventListener(
      'submit',
      handleAddProduct
    );


  renderTabs();

  fetchProducts();

});