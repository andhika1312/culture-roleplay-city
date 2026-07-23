const TOKEN_KEY = 'culture_dash_token';
const USER_KEY = 'culture_dash_user';

const TEAM_LABELS = {
  founder: 'Founder',
  co_founder: 'Co-Founder',
  dev: 'Developer',
  management: 'Management',
  admin: 'Admin',
  helper: 'Helper'
};

let CURRENT_USER = null;
let ALL_TEAM = [];

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function isFullAccess() { return CURRENT_USER && (CURRENT_USER.role === 'founder' || CURRENT_USER.role === 'dev'); }

function showToast(message, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 3200);
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch('/api/' + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
  return data;
}

function formatMoney(n) {
  const num = Number(n || 0);
  return '₵' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}
function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ================= LOGIN =================
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const msg = document.getElementById('login-msg');
  const formData = new FormData(e.target);

  btn.disabled = true;
  btn.textContent = 'Memproses...';
  msg.className = 'form-msg';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login gagal.');

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    initDashboard(data.user);
  } catch (err) {
    msg.className = 'form-msg error show';
    msg.textContent = '✕ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  location.reload();
});

// ================= INIT / SESSION CHECK =================
async function checkSession() {
  const token = getToken();
  const cachedUser = localStorage.getItem(USER_KEY);
  if (!token || !cachedUser) return;

  try {
    const data = await apiFetch('verify-session');
    initDashboard(data.user);
  } catch (err) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

function initDashboard(user) {
  CURRENT_USER = user;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dash-shell').style.display = 'flex';
  document.getElementById('dash-user-name').textContent = user.display_name;
  document.getElementById('dash-user-role').textContent = user.role;

  applyRolePermissions();
  loadOverview();
  loadFinanceForm();
  loadExpenses();
  loadTeam();
  loadUpdates();
  loadSubmissions();
}

function applyRolePermissions() {
  const full = isFullAccess();

  // Finance: admin hanya lihat
  document.getElementById('finance-lock-note').style.display = full ? 'none' : 'block';
  document.getElementById('finance-save-btn').style.display = full ? 'inline-flex' : 'none';
  document.querySelectorAll('#finance-form input').forEach((el) => { el.disabled = !full; });

  // Expenses: admin hanya lihat
  document.getElementById('expenses-lock-note').style.display = full ? 'none' : 'block';
  document.getElementById('expense-form-panel').style.display = full ? 'block' : 'none';

  // Team: semua role bisa akses, admin dibatasi ke entri miliknya (dihandle saat render)
  document.getElementById('team-lock-note').style.display = full ? 'none' : 'block';

  // Updates: admin hanya lihat
  document.getElementById('updates-lock-note').style.display = full ? 'none' : 'block';
  document.getElementById('update-form-panel').style.display = full ? 'block' : 'none';
}

// ================= NAV ROUTING =================
document.querySelectorAll('.dash-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.dash-view').forEach((v) => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

// ================= OVERVIEW =================
async function loadOverview() {
  try {
    const data = await apiFetch('get-public-data');
    if (data.finance) {
      document.getElementById('ov-kas').textContent = formatMoney(data.finance.kas_kota);
      document.getElementById('ov-pemasukan').textContent = formatMoney(data.finance.pemasukan_bulan_ini);
      document.getElementById('ov-pengeluaran').textContent = formatMoney(data.finance.pengeluaran_bulan_ini);
    }
    document.getElementById('ov-tim').textContent = (data.team || []).length;

    const rows = (data.expenses || []).slice(0, 8);
    const tbody = document.getElementById('ov-expense-rows');
    tbody.innerHTML = rows.length
      ? rows.map((r) => `
        <tr>
          <td>${formatDate(r.tanggal)}</td>
          <td>${escapeHtml(r.kategori)}</td>
          <td>${escapeHtml(r.deskripsi)}</td>
          <td class="${r.tipe === 'pemasukan' ? 'tag-plus' : 'tag-minus'}">${r.tipe === 'pemasukan' ? '+' : '-'}${formatMoney(r.jumlah)}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" class="empty-row">Belum ada catatan.</td></tr>';
  } catch (err) {
    showToast(err.message, true);
  }
}

// ================= FINANCE =================
async function loadFinanceForm() {
  try {
    const data = await apiFetch('get-public-data');
    const f = data.finance;
    if (!f) return;
    document.getElementById('f-kas').value = f.kas_kota;
    document.getElementById('f-pemasukan').value = f.pemasukan_bulan_ini;
    document.getElementById('f-pengeluaran').value = f.pengeluaran_bulan_ini;
    document.getElementById('f-keterangan').value = f.keterangan || '';
    document.getElementById('finance-updated-info').textContent = f.updated_at
      ? `Terakhir diperbarui ${formatDate(f.updated_at)} oleh ${f.updated_by || '-'}`
      : '';
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('finance-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFullAccess()) return;
  const formData = new FormData(e.target);
  try {
    await apiFetch('update-finance', {
      method: 'POST',
      body: JSON.stringify({
        kas_kota: Number(formData.get('kas_kota')),
        pemasukan_bulan_ini: Number(formData.get('pemasukan_bulan_ini')),
        pengeluaran_bulan_ini: Number(formData.get('pengeluaran_bulan_ini')),
        keterangan: formData.get('keterangan')
      })
    });
    showToast('Data keuangan berhasil disimpan.');
    loadFinanceForm();
    loadOverview();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ================= EXPENSES =================
async function loadExpenses() {
  try {
    const data = await apiFetch('get-public-data');
    const rows = data.expenses || [];
    const full = isFullAccess();
    const tbody = document.getElementById('expense-rows');
    tbody.innerHTML = rows.length
      ? rows.map((r) => `
        <tr>
          <td>${formatDate(r.tanggal)}</td>
          <td class="${r.tipe === 'pemasukan' ? 'tag-plus' : 'tag-minus'}">${r.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</td>
          <td>${escapeHtml(r.kategori)}</td>
          <td>${escapeHtml(r.deskripsi)}</td>
          <td class="${r.tipe === 'pemasukan' ? 'tag-plus' : 'tag-minus'}">${r.tipe === 'pemasukan' ? '+' : '-'}${formatMoney(r.jumlah)}</td>
          <td>${escapeHtml(r.created_by || '-')}</td>
          <td>${full ? `<button class="icon-btn danger" data-del-expense="${r.id}">Hapus</button>` : ''}</td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="empty-row">Belum ada catatan transaksi.</td></tr>';
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('expense-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFullAccess()) return;
  const formData = new FormData(e.target);
  try {
    await apiFetch('manage-expenses', {
      method: 'POST',
      body: JSON.stringify({
        tanggal: formData.get('tanggal'),
        tipe: formData.get('tipe'),
        kategori: formData.get('kategori'),
        deskripsi: formData.get('deskripsi'),
        jumlah: Number(formData.get('jumlah'))
      })
    });
    showToast('Catatan berhasil ditambahkan.');
    e.target.reset();
    loadExpenses();
    loadOverview();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('expense-rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-del-expense]');
  if (!btn) return;
  if (!confirm('Hapus catatan ini?')) return;
  try {
    await apiFetch('manage-expenses', { method: 'DELETE', body: JSON.stringify({ id: btn.dataset.delExpense }) });
    showToast('Catatan berhasil dihapus.');
    loadExpenses();
    loadOverview();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ================= TEAM =================
async function loadTeam() {
  try {
    const data = await apiFetch('get-public-data');
    ALL_TEAM = data.team || [];
    renderTeamGroups();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderTeamGroups() {
  const container = document.getElementById('team-role-groups');
  const full = isFullAccess();

  container.innerHTML = Object.entries(TEAM_LABELS).map(([key, label]) => {
    const members = ALL_TEAM.filter((m) => m.role_group === key).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const rows = members.length
      ? members.map((m) => {
          const canEdit = full || m.owner_username === CURRENT_USER.username;
          return `
            <tr>
              <td>${escapeHtml(m.name)}</td>
              <td>${escapeHtml(m.discord_tag || '-')}</td>
              <td>${m.sort_order ?? 0}</td>
              <td>
                ${canEdit ? `
                  <div class="table-actions">
                    <button class="icon-btn" data-edit-team='${JSON.stringify(m).replace(/'/g, "&#39;")}'>Edit</button>
                    <button class="icon-btn danger" data-del-team="${m.id}">Hapus</button>
                  </div>
                ` : '<span class="mono" style="font-size:11.5px;color:var(--parchment-dim);">Milik admin lain</span>'}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" class="empty-row">Belum ada anggota.</td></tr>';

    return `
      <div class="role-section">
        <div class="role-section-title">${label}</div>
        <table class="dash-table">
          <thead><tr><th>Nama</th><th>Discord</th><th>Urutan</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
}

document.getElementById('team-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = document.getElementById('team-edit-id').value;

  try {
    await apiFetch('manage-team', {
      method: 'POST',
      body: JSON.stringify({
        id: id || undefined,
        role_group: formData.get('role_group'),
        name: formData.get('name'),
        discord_tag: formData.get('discord_tag'),
        sort_order: Number(formData.get('sort_order') || 0)
      })
    });
    showToast(id ? 'Anggota tim berhasil diperbarui.' : 'Anggota tim berhasil ditambahkan.');
    e.target.reset();
    document.getElementById('team-edit-id').value = '';
    document.getElementById('team-cancel-edit').style.display = 'none';
    document.getElementById('team-save-btn').textContent = 'Simpan Anggota';
    loadTeam();
    loadOverview();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('team-role-groups').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-team]');
  if (editBtn) {
    const m = JSON.parse(editBtn.dataset.editTeam.replace(/&#39;/g, "'"));
    document.getElementById('team-edit-id').value = m.id;
    document.getElementById('team-role-select').value = m.role_group;
    document.querySelector('#team-form [name="name"]').value = m.name;
    document.querySelector('#team-form [name="discord_tag"]').value = m.discord_tag || '';
    document.querySelector('#team-form [name="sort_order"]').value = m.sort_order || 0;
    document.getElementById('team-cancel-edit').style.display = 'inline-flex';
    document.getElementById('team-save-btn').textContent = 'Perbarui Anggota';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const delBtn = e.target.closest('[data-del-team]');
  if (delBtn) {
    if (!confirm('Hapus anggota ini dari susunan tim?')) return;
    try {
      await apiFetch('manage-team', { method: 'DELETE', body: JSON.stringify({ id: delBtn.dataset.delTeam }) });
      showToast('Anggota tim berhasil dihapus.');
      loadTeam();
      loadOverview();
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

document.getElementById('team-cancel-edit').addEventListener('click', () => {
  document.getElementById('team-form').reset();
  document.getElementById('team-edit-id').value = '';
  document.getElementById('team-cancel-edit').style.display = 'none';
  document.getElementById('team-save-btn').textContent = 'Simpan Anggota';
});

// ================= UPDATES =================
async function loadUpdates() {
  try {
    const data = await apiFetch('get-public-data');
    const rows = data.updates || [];
    const full = isFullAccess();
    const tbody = document.getElementById('update-rows');
    tbody.innerHTML = rows.length
      ? rows.map((u) => `
        <tr>
          <td>${formatDate(u.created_at)}</td>
          <td>${escapeHtml(u.tipe)}</td>
          <td>${escapeHtml(u.judul)}</td>
          <td style="max-width:280px;">${escapeHtml(u.isi)}</td>
          <td>${full ? `<button class="icon-btn danger" data-del-update="${u.id}">Hapus</button>` : ''}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="empty-row">Belum ada pengumuman.</td></tr>';
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('update-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFullAccess()) return;
  const formData = new FormData(e.target);
  try {
    await apiFetch('manage-updates', {
      method: 'POST',
      body: JSON.stringify({
        judul: formData.get('judul'),
        isi: formData.get('isi'),
        tipe: formData.get('tipe')
      })
    });
    showToast('Pengumuman berhasil dipublikasikan.');
    e.target.reset();
    loadUpdates();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('update-rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-del-update]');
  if (!btn) return;
  if (!confirm('Hapus pengumuman ini?')) return;
  try {
    await apiFetch('manage-updates', { method: 'DELETE', body: JSON.stringify({ id: btn.dataset.delUpdate }) });
    showToast('Pengumuman berhasil dihapus.');
    loadUpdates();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ================= SUBMISSIONS =================
async function loadSubmissions(formType) {
  try {
    const query = formType ? `?form_type=${formType}` : '';
    const data = await apiFetch('get-submissions' + query);
    const rows = data.submissions || [];
    const tbody = document.getElementById('submission-rows');
    tbody.innerHTML = rows.length
      ? rows.map((s) => `
        <tr>
          <td>${formatDate(s.created_at)}</td>
          <td style="text-transform:capitalize;">${escapeHtml(s.form_type)}</td>
          <td>${escapeHtml(s.data?.nama_ooc || '-')}</td>
          <td>${escapeHtml(s.data?.nama_discord || '-')}</td>
          <td><button class="icon-btn" data-view-submission='${JSON.stringify(s.data).replace(/'/g, "&#39;")}'>Lihat</button></td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="empty-row">Belum ada pendaftar.</td></tr>';
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('submission-filter').addEventListener('change', (e) => {
  loadSubmissions(e.target.value);
});

document.getElementById('submission-rows').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view-submission]');
  if (!btn) return;
  const detail = JSON.parse(btn.dataset.viewSubmission.replace(/&#39;/g, "'"));
  const text = Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join('\n\n');
  alert(text);
});

// ================= START =================
checkSession();
