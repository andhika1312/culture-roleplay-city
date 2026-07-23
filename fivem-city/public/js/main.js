// ================= KONFIGURASI FORM PER KATEGORI =================
const FORM_CONFIG = {
  admin: {
    title: 'Formulir Pendaftaran Admin',
    sub: 'Lengkapi data diri kamu untuk bergabung sebagai tim admin Culture Roleplay.',
    isAdmin: true
  },
  polisi: { title: 'Whitelist Kepolisian', sub: 'Lengkapi data untuk bergabung sebagai anggota Kepolisian.', isAdmin: false },
  ems: { title: 'Whitelist EMS', sub: 'Lengkapi data untuk bergabung sebagai anggota EMS.', isAdmin: false },
  pedagang: { title: 'Whitelist Pedagang', sub: 'Lengkapi data untuk memulai usaha sebagai pedagang resmi.', isAdmin: false },
  pemerintah: { title: 'Whitelist Pemerintah', sub: 'Lengkapi data untuk bergabung dengan instansi pemerintahan.', isAdmin: false },
  mekanik: { title: 'Whitelist Mekanik', sub: 'Lengkapi data untuk bergabung sebagai mekanik resmi kota.', isAdmin: false },
  bahamas: { title: 'Whitelist Bahamas', sub: 'Lengkapi data untuk bergabung dengan instansi Bahamas.', isAdmin: false },
  media: { title: 'Whitelist Media', sub: 'Lengkapi data untuk bergabung sebagai jurnalis/media kota.', isAdmin: false }
};

const TEAM_LABELS = {
  founder: 'Founder',
  co_founder: 'Co-Founder',
  dev: 'Developer',
  management: 'Management',
  admin: 'Admin',
  helper: 'Helper'
};

// ================= MODAL HANDLING =================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-open-modal]');
  if (openBtn) { openModal(openBtn.dataset.openModal); return; }

  const closeBtn = e.target.closest('[data-close-modal]');
  if (closeBtn) { closeAllModals(); return; }

  const formBtn = e.target.closest('[data-open-form]');
  if (formBtn) {
    e.preventDefault();
    closeModal('daftar-modal');
    openFormModal(formBtn.dataset.openForm);
    return;
  }

  // klik di luar modal-box menutup modal
  if (e.target.classList.contains('modal-overlay')) {
    closeAllModals();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});

function openFormModal(type) {
  const cfg = FORM_CONFIG[type];
  if (!cfg) return;

  document.getElementById('form_type').value = type;
  document.getElementById('form-title').textContent = cfg.title;
  document.getElementById('form-sub').textContent = cfg.sub;
  document.getElementById('admin-only-fields').style.display = cfg.isAdmin ? 'block' : 'none';
  document.getElementById('whitelist-only-fields').style.display = cfg.isAdmin ? 'none' : 'block';

  // reset required pada field yang disembunyikan
  document.querySelectorAll('#admin-only-fields textarea').forEach((el) => { el.required = cfg.isAdmin; });
  document.querySelectorAll('#whitelist-only-fields [name]').forEach((el) => {
    if (el.tagName === 'TEXTAREA') el.required = !cfg.isAdmin;
  });

  const msg = document.getElementById('form-msg');
  msg.className = 'form-msg';
  msg.textContent = '';

  openModal('form-modal');
}

document.getElementById('form-back').addEventListener('click', (e) => {
  e.preventDefault();
  closeModal('form-modal');
  openModal('daftar-modal');
});

// ================= SUBMIT FORM =================
document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const msg = document.getElementById('form-msg');
  const originalText = btn.textContent;

  const formData = new FormData(e.target);
  const payload = {};
  formData.forEach((value, key) => { payload[key] = value; });

  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  msg.className = 'form-msg';

  try {
    const res = await fetch('/api/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Gagal mengirim formulir.');

    msg.className = 'form-msg success show';
    msg.textContent = '✓ Formulir berhasil dikirim! Tim kami akan meninjau pengajuanmu segera.';
    e.target.reset();
    setTimeout(() => closeModal('form-modal'), 2200);
  } catch (err) {
    msg.className = 'form-msg error show';
    msg.textContent = '✕ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// ================= FETCH DATA PUBLIK (tim, keuangan preview, update) =================
let ALL_TEAM = [];

async function loadPublicData() {
  try {
    const res = await fetch('/api/get-public-data');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    ALL_TEAM = data.team || [];
    document.getElementById('stat-tim').textContent = ALL_TEAM.length;
    renderTeamGroup('founder');
    renderUpdates(data.updates || []);
  } catch (err) {
    console.error('Gagal memuat data publik:', err);
    document.getElementById('team-grid').innerHTML = '<div class="team-empty">Gagal memuat data tim. Coba muat ulang halaman.</div>';
    document.getElementById('updates-list').innerHTML = '<p class="mono" style="color:var(--parchment-dim);font-size:13.5px;">Belum ada pembaruan.</p>';
  }
}

function renderTeamGroup(group) {
  const members = ALL_TEAM.filter((m) => m.role_group === group).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const grid = document.getElementById('team-grid');

  if (members.length === 0) {
    grid.innerHTML = `<div class="team-empty">Belum ada anggota di posisi ${TEAM_LABELS[group]}.</div>`;
    return;
  }

  grid.innerHTML = members.map((m) => `
    <div class="team-card">
      <div class="team-avatar">${m.photo_url ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.name)}">` : escapeHtml(initials(m.name))}</div>
      <div>
        <div class="team-name">${escapeHtml(m.name)}</div>
        <div class="team-tag">${m.discord_tag ? escapeHtml(m.discord_tag) : TEAM_LABELS[group]}</div>
      </div>
    </div>
  `).join('');
}

document.getElementById('team-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.team-tab');
  if (!tab) return;
  document.querySelectorAll('.team-tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  renderTeamGroup(tab.dataset.group);
});

function renderUpdates(updates) {
  const container = document.getElementById('updates-list');
  if (!updates.length) {
    container.innerHTML = '<p class="mono" style="color:var(--parchment-dim);font-size:13.5px;">Belum ada pembaruan terbaru.</p>';
    return;
  }
  container.innerHTML = `<div class="info-grid" style="grid-template-columns:1fr;">${updates.slice(0, 6).map((u) => `
    <div class="info-card">
      <div class="mark">${escapeHtml((u.tipe || 'info').toUpperCase())} · ${formatDate(u.created_at)}</div>
      <h3>${escapeHtml(u.judul)}</h3>
      <p>${escapeHtml(u.isi)}</p>
    </div>
  `).join('')}</div>`;
}

function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

loadPublicData();
