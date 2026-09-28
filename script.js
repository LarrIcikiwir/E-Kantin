// ==========================================
// 1. KONFIGURASI SUPABASE & STATE
// ==========================================
const SUPABASE_URL = 'https://ymaqspvidhwgzwrxxbfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g5dCXGE7no8ogQQH5wg8cA_4OzjyStl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let activeCanteen = 1;
let currentRole = 'guest';

// State Chat Realtime
let unreadCount = 0;
let chatSubscription = null;
let typingTimeout = null;

// Audio Notifikasi Pesan
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
notificationSound.volume = 0.5;

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// 2. LOGIN & SESSION MANAGEMENT
// ==========================================
async function handleLoginSubmit(e) {
  e.preventDefault();

  const usernameInput = $('login-email').value.trim();
  const passwordInput = $('login-password').value;
  const btn = $('btn-submit-login');

  btn.disabled = true;
  btn.innerText = 'Memproses...';

  const { data, error } = await supabaseClient
    .from('data_user')
    .select('*')
    .eq('username', usernameInput)
    .eq('password', passwordInput)
    .single();

  btn.disabled = false;
  btn.innerText = 'Masuk';

  if (error || !data) {
    alert('Username atau Password salah!');
    return;
  }

  localStorage.setItem('user_session', JSON.stringify({
    username: data.username,
    role: data.role
  }));

  updateRoleUI(data.role);
  closeLoginModal();
}

function checkLocalSession() {
  const savedSession = localStorage.getItem('user_session');
  if (savedSession) {
    const user = JSON.parse(savedSession);
    updateRoleUI(user.role);
  } else {
    updateRoleUI('guest');
  }
}

function logout() {
  localStorage.removeItem('user_session');
  updateRoleUI('guest');
}

// ==========================================
// 3. UPDATE TAMPILAN SESUAI ROLE
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
    btnLogout.classList.add('flex');
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
      activeCanteen = Number(num);
      updateTabStyle();
    }
  }

  renderMenu();

  // Jika modal chat sedang terbuka, muat ulang chat sesuai peran baru
  const modal = $('chat-modal');
  if (modal && !modal.classList.contains('hidden')) {
    initChat();
  }
}

// Modal Control Login
function openLoginModal() {
  $('login-modal').classList.remove('hidden');
}

function closeLoginModal() {
  $('login-modal').classList.add('hidden');$('login-form').reset();
}

// ==========================================
// 4. FETCH & CRUD MENU (DENGAN GAMBAR)
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
    price: Number(item.price),
    imageUrl: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
  }));

  renderMenu();
}

async function handleAddProduct(e) {
  e.preventDefault();

  const btnSave = $('btn-save-menu');
  btnSave.disabled = true;
  btnSave.innerText = 'Menyimpan...';

  let canteenId = parseInt($('canteen-select').value);
  if (currentRole.startsWith('kantin')) {
    canteenId = parseInt(currentRole.replace('kantin', ''));
  }

  const name = $('name').value.trim();
  const price = parseInt($('price').value);
  const fileInput = $('image-file').files[0];
  const urlInput = $('image-url').value.trim();

  let finalImageUrl = urlInput;

  // 1. Upload File Lokal jika ada
  if (fileInput) {
    const fileExt = fileInput.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `menu/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('menu-images')
      .upload(filePath, fileInput);

    if (uploadError) {
      alert('Gagal upload gambar: ' + uploadError.message);
      btnSave.disabled = false;
      btnSave.innerText = 'Simpan Menu';
      return;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    finalImageUrl = publicUrlData.publicUrl;
  }

  // 2. Simpan Data ke Supabase Database
  const { error } = await supabaseClient
    .from('data_kantin')
    .insert([{ 
      canteen_id: canteenId, 
      name: name, 
      price: price,
      image_url: finalImageUrl || null
    }]);

  btnSave.disabled = false;
  btnSave.innerText = 'Simpan Menu';

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

  // Jika modal chat terbuka, muat ulang chat sesuai kantin aktif
  const modal = $('chat-modal');
  if (modal && !modal.classList.contains('hidden')) {
    initChat();
  }
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
      <div class="card-item bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <img src="${item.imageUrl}" alt="${escapeHTML(item.name)}" class="w-full h-36 object-cover bg-slate-100" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'">
          <div class="p-3.5 space-y-1">
            <h3 class="font-bold text-slate-800 text-sm leading-snug">${escapeHTML(item.name)}</h3>
            <p class="text-xs text-emerald-600 font-extrabold">
              Rp ${item.price.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
        ${canDelete ? `
          <div class="p-3 pt-0 flex justify-end">
            <button onclick="deleteMenu(${item.id})" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition active:scale-95" title="Hapus Menu">
              <i class="ri-delete-bin-line text-base"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  });
}

// ==========================================
// 5. CHAT WIDGET & REALTIME LOGIC
// ==========================================
function toggleChatModal() {
  const modal = $('chat-modal');
  const isHidden = modal.classList.contains('hidden');

  if (isHidden) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    unreadCount = 0;
    updateChatBadge();
    initChat();
  } else {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function updateChatBadge() {
  const badge = $('chat-badge');
  if (!badge) return;

  if (unreadCount > 0) {
    badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function initChat() {
  const headerTitle = $('chat-header-title');
  if (headerTitle) headerTitle.innerText = `Chat Kantin ${activeCanteen}`;

  await fetchChatMessages();
  subscribeChatRealtime();
}

async function fetchChatMessages() {
  const container = $('chat-messages');

  const { data, error } = await supabaseClient
    .from('chat_messages')
    .select('*')
    .eq('canteen_id', activeCanteen)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = `<p class="text-rose-500 text-center text-[11px]">Gagal memuat pesan.</p>`;
    return;
  }

  renderChatMessages(data || []);
}

function renderChatMessages(messages) {
  const container = $('chat-messages');

  if (messages.length === 0) {
    container.innerHTML = `<p class="text-slate-400 text-center text-[11px] py-4">Belum ada obrolan di Kantin ${activeCanteen}. Mulai sapa!</p>`;
    return;
  }

  container.innerHTML = '';
  messages.forEach(msg => {
    // Tentukan apakah pesan dikirim oleh user yang sedang aktif
    const isMe = (currentRole === 'guest' && msg.sender_role === 'guest') || 
                 (currentRole !== 'guest' && currentRole === msg.sender_role);

    container.innerHTML += `
      <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
        <span class="text-[9px] text-slate-400 mb-0.5 px-1">${escapeHTML(msg.sender_name)}</span>
        <div class="max-w-[80%] p-2 rounded-xl text-xs chat-bubble ${
          isMe 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
        }">
          ${escapeHTML(msg.message)}
        </div>
      </div>
    `;
  });

  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(e) {
  e.preventDefault();
  const input = $('chat-input');
  const text = input.value.trim();

  if (!text) return;

  // Tentukan nama pengirim sesuai peran aktif
  let senderName = 'Pembeli (Guest)';
  if (currentRole === 'admin') {
    senderName = 'Admin Kantin';
  } else if (currentRole.startsWith('kantin')) {
    senderName = `Penjual Kantin ${activeCanteen}`;
  }

  input.value = '';

  const { error } = await supabaseClient
    .from('chat_messages')
    .insert([{
      canteen_id: activeCanteen,
      sender_role: currentRole,
      sender_name: senderName,
      message: text
    }]);

  if (error) {
    alert('Gagal mengirim pesan: ' + error.message);
  }
}

// Typing Indicator Signal
function handleTypingInput() {
  if (!chatSubscription) return;

  let senderName = currentRole === 'guest' ? 'Pembeli' : `Penjual Kantin ${activeCanteen}`;

  chatSubscription.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      sender_name: senderName,
      sender_role: currentRole
    }
  });
}

function showTypingIndicator(name) {
  const container = $('chat-messages');
  let indicator = $('typing-indicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'flex items-center gap-1.5 text-slate-400 text-[11px] italic my-1 px-1';
    container.appendChild(indicator);
  }

  indicator.innerHTML = `
    <span>${escapeHTML(name)} sedang mengetik</span>
    <span class="inline-flex gap-0.5">
      <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
      <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
    </span>
  `;

  container.scrollTop = container.scrollHeight;

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (indicator) indicator.remove();
  }, 2500);
}

function subscribeChatRealtime() {
  if (chatSubscription) {
    supabaseClient.removeChannel(chatSubscription);
  }

  chatSubscription = supabaseClient
    .channel(`canteen_chat_${activeCanteen}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'chat_messages',
      filter: `canteen_id=eq.${activeCanteen}`
    }, (payload) => {
      const newMsg = payload.new;
      const isMyMsg = (currentRole === 'guest' && newMsg.sender_role === 'guest') || 
                      (currentRole !== 'guest' && currentRole === newMsg.sender_role);

      const indicator = $('typing-indicator');
      if (indicator) indicator.remove();

      if (!isMyMsg) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => {});
      }

      const modal = $('chat-modal');
      const isChatClosed = modal && modal.classList.contains('hidden');

      if (isChatClosed) {
        if (!isMyMsg) {
          unreadCount++;
          updateChatBadge();
        }
      } else {
        fetchChatMessages();
      }
    })
    .on('broadcast', { event: 'typing' }, (response) => {
      const payload = response.payload;
      const isMyEvent = (currentRole === 'guest' && payload.sender_role === 'guest') || 
                        (currentRole !== 'guest' && currentRole === payload.sender_role);

      if (!isMyEvent) {
        showTypingIndicator(payload.sender_name);
      }
    })
    .subscribe();
}

// ==========================================
// 6. INISIALISASI UTAMA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  $('login-form').addEventListener('submit', handleLoginSubmit);$('add-form').addEventListener('submit', handleAddProduct);
  
  updateTabStyle();
  checkLocalSession();
  fetchProducts();
});
