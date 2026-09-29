:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #f97316;
  --primary-hover: #ea580c;
  --success: #10b981;
  --danger: #ef4444;
  --border: #e2e8f0;
  --radius: 14px;
  --font: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  --shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Navbar */
.navbar {
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.brand-badge { font-size: 1.75rem; line-height: 1; }
.brand h1 { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; }
.tagline { font-size: 0.7rem; color: var(--muted); }

.user-session {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--border);
  object-fit: cover;
  background: #f1f5f9;
  flex-shrink: 0;
}
.user-meta { display: flex; flex-direction: column; }
.user-meta strong { font-size: 0.85rem; line-height: 1.2; }
.role-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
}
.user-btn-group {
  display: flex;
  gap: 0.35rem;
}

/* Secondary Navigation */
.canteen-nav-bar {
  background: #ffffff;
  border-bottom: 1px solid var(--border);
}
.nav-tabs-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.canteen-selector-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.canteen-dropdown {
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  background: #fff;
}
.tab-links {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
}
.nav-tab {
  background: transparent;
  border: none;
  padding: 0.45rem 0.8rem;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.825rem;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.nav-tab.active, .nav-tab:hover {
  background: var(--text);
  color: #fff;
}
.tab-badge {
  background: var(--primary);
  color: #fff;
  border-radius: 999px;
  font-size: 0.68rem;
  padding: 1px 6px;
  font-weight: 800;
}

/* Main Content Views */
.main-content {
  max-width: 1200px;
  margin: 1.25rem auto 5rem;
  padding: 0 1rem;
}
.view-panel { display: none; }
.view-panel.active { display: block; }

/* Responsive Banner */
.canteen-banner {
  height: clamp(140px, 22vw, 220px);
  border-radius: var(--radius);
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow);
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
  color: #fff;
  display: flex;
  align-items: flex-end;
  padding: 1rem;
  gap: 0.85rem;
}
.canteen-hero-pfp {
  width: clamp(52px, 10vw, 72px);
  height: clamp(52px, 10vw, 72px);
  border-radius: 50%;
  border: 3px solid #fff;
  background: #fff;
  object-fit: cover;
  flex-shrink: 0;
}
.banner-text h2 {
  font-size: clamp(1rem, 2.5vw, 1.4rem);
  font-weight: 800;
  line-height: 1.2;
}
.banner-text p {
  font-size: clamp(0.75rem, 1.8vw, 0.85rem);
  opacity: 0.9;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.categories {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 4px;
}
.chip {
  padding: 0.4rem 0.85rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
.chip.active, .chip:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.search-wrap { flex: 1; min-width: 200px; max-width: 320px; }
.search-input {
  width: 100%;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
}

/* Store & Cart Layout */
.store-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.25rem;
  align-items: start;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow);
}
.card-img {
  height: 140px;
  width: 100%;
  object-fit: cover;
  background: #f1f5f9;
}
.card-body {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.card-tag {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0.2rem 0 0.4rem;
}
.variant-select {
  margin: 0.35rem 0 0.6rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 0.75rem;
  font-family: inherit;
}
.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.card-price {
  font-weight: 800;
  color: var(--primary);
  font-size: 0.95rem;
}

/* Cart Sidebar */
.cart-sidebar {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  position: sticky;
  top: 5rem;
  box-shadow: var(--shadow);
}
.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cart-items {
  max-height: 300px;
  overflow-y: auto;
  margin: 0.85rem 0;
}
.empty-state {
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
  padding: 1.5rem 0;
}
.cart-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 0.35rem;
}
.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0.5rem 0 0.85rem;
}

/* Mobile Bottom Sheet Cart */
.mobile-only { display: none; }
.mobile-cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid var(--border);
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 45;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.06);
}
.mobile-cart-info { display: flex; flex-direction: column; }
.mobile-cart-info span { font-size: 0.75rem; color: var(--muted); }

/* Orders List UI */
.max-800 { max-width: 800px; margin: 0 auto; }
.orders-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.75rem;
}
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.order-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: var(--shadow);
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}
.order-badge {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
}
.order-badge.pending {
  background: #fef3c7;
  color: #b45309;
}
.order-badge.selesai {
  background: #d1fae5;
  color: #065f46;
}
.order-items-detail {
  font-size: 0.85rem;
  color: var(--muted);
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
  padding: 0.5rem 0;
}
.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.order-actions-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Profile Modal Area */
.profile-preview-area {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}
.profile-large-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--border);
  object-fit: cover;
  background: #f1f5f9;
}

/* Chat Integrated in Modal */
.chat-modal-box {
  max-width: 480px;
  width: 95vw;
  padding: 1rem !important;
  display: flex;
  flex-direction: column;
}
.modal-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.6rem;
}
.modal-chat-body {
  height: 380px !important;
  overflow-y: auto;
  padding: 0.85rem 0.25rem !important;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.msg-bubble {
  max-width: 82%;
  padding: 0.55rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
}
.msg-bubble.me {
  align-self: flex-end;
  background: var(--primary);
  color: #fff;
  border-bottom-right-radius: 2px;
}
.msg-bubble.other {
  align-self: flex-start;
  background: #f1f5f9;
  border-bottom-left-radius: 2px;
}
.msg-author { font-size: 0.68rem; font-weight: bold; margin-bottom: 2px; }
.chat-form {
  display: flex;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  gap: 0.5rem;
}
.chat-form input {
  flex: 1;
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-family: inherit;
  outline: none;
}

/* Dashboards */
.dashboard-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 1.25rem;
}
.dash-column {
  display: flex;
  flex-direction: column;
}
.dash-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow);
}
.max-600 { max-width: 600px; margin: 0 auto; }
.form-stack { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem; }
.form-stack label { display: flex; flex-direction: column; font-size: 0.8rem; font-weight: 600; gap: 0.3rem; }
.form-stack input, .form-stack select {
  padding: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: inherit;
}
.file-input { padding: 0.35rem !important; font-size: 0.8rem; background: #f8fafc; }
.form-row { display: flex; gap: 0.5rem; }
.stock-manager-list { display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.75rem; }
.stock-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--border);
  gap: 0.5rem;
}
.stock-ctrl { display: flex; align-items: center; gap: 0.4rem; }
.stock-btn {
  width: 28px;
  height: 28px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.btn-trash {
  background: #fee2e2;
  color: #ef4444;
  border: 1px solid #fca5a5;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: bold;
}
.btn-trash:hover {
  background: #fecaca;
}

/* Buttons */
.btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.55rem 0.95rem;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-success {
  background: var(--success);
  color: #fff;
  border: none;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-chat {
  background: #f1f5f9;
  color: var(--text);
  border: 1px solid var(--border);
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-chat:hover { background: #e2e8f0; }
.btn-secondary {
  padding: 0.55rem 0.95rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}
.btn-outline {
  background: #fff;
  border: 1px solid var(--border);
}
.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: pointer;
}
.btn-ghost {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}

/* Modals */
.modal { margin: auto; border: none; background: transparent; }
.modal::backdrop { background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); }
.modal-box {
  background: #fff;
  padding: 1.5rem;
  border-radius: var(--radius);
  max-width: 380px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-desc { font-size: 0.8rem; color: var(--muted); margin: 0.2rem 0 0.65rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }

/* Responsive */
@media (max-width: 860px) {
  .store-layout, .dashboard-grid { grid-template-columns: 1fr; }
  .mobile-only { display: flex; }
  .cart-sidebar {
    position: fixed;
    bottom: 0; left: 0; right: 0; top: auto;
    z-index: 60;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
    display: none;
    max-height: 80vh;
  }
  .cart-sidebar.open { display: block; }
  .nav-tabs-wrapper { flex-direction: column; align-items: stretch; }
  .canteen-selector-wrap { width: 100%; justify-content: space-between; }
  .canteen-dropdown { max-width: 100%; flex: 1; }
  .tab-links { width: 100%; }
}

@media (max-width: 520px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 0.65rem; }
  .card-img { height: 110px; }
  .card-body { padding: 0.65rem; }
  .card-title { font-size: 0.85rem; }
  .card-price { font-size: 0.85rem; }
  .btn-primary { padding: 0.45rem 0.65rem; font-size: 0.78rem; }
}
