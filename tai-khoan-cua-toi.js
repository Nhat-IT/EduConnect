// ═══ TÀI KHOẢN JS ═══

// ── Tab navigation ──
function switchTab(tabName) {
  document.querySelectorAll('.pnav-link[data-tab]').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const link = document.querySelector(`.pnav-link[data-tab="${tabName}"]`);
  const panel = document.getElementById(`tab-${tabName}`);
  if (link) link.classList.add('active');
  if (panel) panel.classList.add('active');
  history.replaceState(null, '', `#${tabName}`);
}

document.querySelectorAll('.pnav-link[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchTab(link.dataset.tab);
  });
});

// Open tab from URL hash
const hash = location.hash.replace('#', '');
const validTabs = ['courses', 'my-courses', 'wallet', 'profile', 'security'];
if (hash && validTabs.includes(hash)) {
  switchTab(hash);
}

// ── Animate progress bars ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.progress-fill').forEach(bar => {
    const w = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = w; }, 300);
  });
});

// ── Update profile ──
document.getElementById('profile-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const orig = btn.textContent;
  btn.textContent = 'Đang lưu...'; btn.disabled = true;
  try {
    const res = await fetch('/update-profile', { method: 'POST', body: new FormData(e.target) });
    const data = await res.json();
    showFormMsg('profile-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) showToast('Cập nhật thành công!', 'success');
  } catch { showFormMsg('profile-msg', 'Có lỗi xảy ra.', 'error'); }
  btn.textContent = orig; btn.disabled = false;
});

// ══════════════════════════════════════════
// WALLET FUNCTIONS
// ══════════════════════════════════════════

function openWalletModal(action) {
  const modal = document.getElementById('wallet-modal');
  const title = document.getElementById('wallet-modal-title');
  const sub   = document.getElementById('wallet-modal-sub');
  const btn   = document.getElementById('wallet-submit-btn');
  const hint  = document.getElementById('wallet-hint');
  document.getElementById('wallet-action').value = action;
  document.getElementById('wallet-amount').value = '';
  document.getElementById('wallet-msg').innerHTML = '';

  if (action === 'deposit') {
    title.textContent = '💳 Nạp Tiền Vào Ví';
    sub.textContent   = 'Nhập số tiền bạn muốn nạp';
    btn.textContent   = '⬇️ Xác Nhận Nạp Tiền';
    btn.style.background = '#10b981';
    hint.textContent  = 'Tối thiểu 10.000₫ · Tối đa 50.000.000₫';
    document.getElementById('wallet-amount').min = 10000;
  } else {
    title.textContent = '⬆️ Rút Tiền Về Tài Khoản';
    sub.textContent   = 'Tiền sẽ về ngân hàng trong 1–3 ngày làm việc';
    btn.textContent   = '⬆️ Xác Nhận Rút Tiền';
    btn.style.background = '';
    hint.textContent  = 'Tối thiểu 100.000₫';
    document.getElementById('wallet-amount').min = 100000;
  }
  openModal('wallet-modal');
}

function quickDeposit(amount) {
  openWalletModal('deposit');
  setTimeout(() => {
    document.getElementById('wallet-amount').value = amount;
  }, 100);
}

document.getElementById('wallet-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const action  = document.getElementById('wallet-action').value;
  const amount  = parseFloat(document.getElementById('wallet-amount').value);
  const btn     = document.getElementById('wallet-submit-btn');
  const orig    = btn.textContent;

  if (!amount || amount <= 0) {
    showFormMsg('wallet-msg', 'Vui lòng nhập số tiền hợp lệ.', 'error');
    return;
  }

  btn.textContent = '⏳ Đang xử lý...'; btn.disabled = true;

  try {
    const fd = new FormData();
    fd.append('amount', amount);
    const res  = await fetch(`/wallet/${action}`, { method: 'POST', body: fd });
    const data = await res.json();

    if (data.success) {
      showFormMsg('wallet-msg', data.message, 'success');
      showToast(data.message, 'success');
      // Cập nhật số dư hiển thị
      if (data.new_balance !== undefined) {
        const fmt = new Intl.NumberFormat('vi-VN').format(data.new_balance);
        document.querySelectorAll('.wallet-balance-amount, #wallet-balance-display').forEach(el => {
          el.textContent = fmt + '₫';
        });
        document.querySelector('.wallet-hero-amount') && (document.querySelector('.wallet-hero-amount').textContent = fmt + '₫');
      }
      // Thêm transaction vào list
      addTxnToList(action, amount);
      setTimeout(() => closeModal('wallet-modal'), 1500);
    } else {
      showFormMsg('wallet-msg', data.message, 'error');
    }
  } catch {
    showFormMsg('wallet-msg', 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
  }
  btn.textContent = orig; btn.disabled = false;
});

function addTxnToList(type, amount) {
  const list = document.querySelector('.txn-list');
  if (!list) return;
  const icons  = { deposit: '⬇️', withdraw: '⬆️' };
  const cls    = type === 'deposit' ? 'txn-in' : 'txn-out';
  const sign   = type === 'deposit' ? '+' : '-';
  const amtCls = type === 'deposit' ? 'txn-amount-in' : 'txn-amount-out';
  const desc   = type === 'deposit' ? 'Nạp tiền qua chuyển khoản ngân hàng' : 'Rút tiền về tài khoản ngân hàng';
  const now    = new Date().toISOString().slice(0,16).replace('T',' ');
  const fmt    = new Intl.NumberFormat('vi-VN').format(amount);

  const el = document.createElement('div');
  el.className = 'txn-item';
  el.innerHTML = `
    <div class="txn-icon ${cls}">${icons[type]}</div>
    <div class="txn-body">
      <div class="txn-desc">${desc}</div>
      <div class="txn-date">${now}</div>
    </div>
    <div class="txn-amount ${amtCls}">${sign}${fmt}₫</div>`;
  list.prepend(el);
}

// ══════════════════════════════════════════
// CREATE COURSE
// ══════════════════════════════════════════

function openCreateModal() {
  document.getElementById('create-course-form')?.reset();
  document.getElementById('create-course-msg').innerHTML = '';
  openModal('create-course-modal');
}

document.getElementById('create-course-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn  = e.target.querySelector('button[type=submit]');
  const orig = btn.textContent;
  btn.textContent = '⏳ Đang tạo...'; btn.disabled = true;

  try {
    const res  = await fetch('/tao-khoa-hoc', { method: 'POST', body: new FormData(e.target) });
    const data = await res.json();
    showFormMsg('create-course-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) {
      showToast(data.message, 'success');
      setTimeout(() => {
        closeModal('create-course-modal');
        location.reload();
      }, 1200);
    }
  } catch {
    showFormMsg('create-course-msg', 'Có lỗi xảy ra.', 'error');
  }
  btn.textContent = orig; btn.disabled = false;
});

// ══════════════════════════════════════════
// DELETE CREATED COURSE
// ══════════════════════════════════════════

async function deleteCreatedCourse(id, title) {
  if (!confirm(`Bạn có chắc muốn xóa khóa học "${title}"?\nHành động này không thể hoàn tác!`)) return;
  try {
    const res  = await fetch(`/xoa-khoa-hoc/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      setTimeout(() => location.reload(), 800);
    } else {
      showToast(data.message, 'error');
    }
  } catch {
    showToast('Có lỗi xảy ra.', 'error');
  }
}
