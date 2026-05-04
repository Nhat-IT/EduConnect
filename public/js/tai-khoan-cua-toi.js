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
  // Cập nhật label trigger và đóng dropdown mobile
  const trigger = document.getElementById('pnav-trigger');
  const label   = document.getElementById('pnav-trigger-label');
  if (label && link) label.textContent = link.textContent.trim();
  if (trigger) {
    trigger.classList.remove('open');
    document.getElementById('profile-nav')?.classList.remove('open');
  }
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

// ── Mobile pipeline dropdown ──
function togglePnavMobile() {
  const trigger = document.getElementById('pnav-trigger');
  const nav     = document.getElementById('profile-nav');
  if (!trigger || !nav) return;
  const isOpen = nav.classList.contains('open');
  trigger.classList.toggle('open', !isOpen);
  nav.classList.toggle('open', !isOpen);
}

// Đóng dropdown khi click bên ngoài
document.addEventListener('click', e => {
  const sidebar = document.querySelector('.profile-sidebar');
  if (sidebar && !sidebar.contains(e.target)) {
    document.getElementById('pnav-trigger')?.classList.remove('open');
    document.getElementById('profile-nav')?.classList.remove('open');
  }
});

// ── Animate progress bars ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.progress-fill').forEach(bar => {
    const w = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = w; }, 300);
  });
});

// ── thông tin cá nhân ──
document.getElementById('profile-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const orig = btn.textContent;
  btn.textContent = 'Đang lưu...'; btn.disabled = true;
  try {
    //  Bọc FormData vào URLSearchParams
    const res = await fetch('/update-profile', { 
      method: 'POST', 
      body: new URLSearchParams(new FormData(e.target)) 
    });
    const data = await res.json();
    showFormMsg('profile-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) showToast('Cập nhật thành công!', 'success');
  } catch { showFormMsg('profile-msg', 'Có lỗi xảy ra.', 'error'); }
  btn.textContent = orig; btn.disabled = false;
});

// WALLET FUNCTIONS
// DEPOSIT — QR FLOW
// Số TK nhận tiền (thay bằng thực tế)
const BANK_ID   = 'ICB';       // mã ngân hàng VietQR (Vietinbank = ICB)
const BANK_ACCT = '0372475346';
const BANK_NAME = 'BUI HUU PHUOC';
const BANK_TEMPLATE = 'compact2';

function openDepositModal(preAmount) {
  document.getElementById('deposit-step-1').style.display = '';
  document.getElementById('deposit-step-2').style.display = 'none';
  document.getElementById('deposit-amount').value = preAmount || '';
  document.getElementById('deposit-step1-msg').innerHTML = '';
  openModal('deposit-modal');
}

function setDepositAmount(v) {
  document.getElementById('deposit-amount').value = v;
}

function showDepositQR() {
  const raw = document.getElementById('deposit-amount').value;
  const amount = parseInt(raw, 10);
  if (!amount || amount < 10000) {
    showFormMsg('deposit-step1-msg', 'Vui lòng nhập số tiền tối thiểu 10.000₫.', 'error');
    return;
  }
  if (amount > 50000000) {
    showFormMsg('deposit-step1-msg', 'Số tiền tối đa là 50.000.000₫.', 'error');
    return;
  }
  // Tạo mã nội dung chuyển khoản duy nhất
  const ref = `EDU${Date.now().toString().slice(-8)}`;
  const fmtAmt = new Intl.NumberFormat('vi-VN').format(amount);

  // VietQR URL
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCT}-${BANK_TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(BANK_NAME)}`;

  document.getElementById('deposit-qr-img').src = qrUrl;
  document.getElementById('deposit-qr-amount').textContent = fmtAmt + '₫';
  document.getElementById('deposit-qr-ref').textContent = ref;

  document.getElementById('deposit-step-1').style.display = 'none';
  document.getElementById('deposit-step-2').style.display = '';

  // Lưu lại để dùng khi confirm
  document.getElementById('deposit-step-2').dataset.amount = amount;
  document.getElementById('deposit-step-2').dataset.ref = ref;
}

function backToDepositStep1() {
  document.getElementById('deposit-step-1').style.display = '';
  document.getElementById('deposit-step-2').style.display = 'none';
}

function copyDepositRef() {
  const ref = document.getElementById('deposit-qr-ref').textContent;
  navigator.clipboard?.writeText(ref).then(() => showToast('Đã copy nội dung chuyển khoản!', 'success'));
}
//nạp tiền
async function confirmDepositDone() {
  const step2 = document.getElementById('deposit-step-2');
  const amount = parseFloat(step2.dataset.amount);
  const ref    = step2.dataset.ref;

  const btn = document.querySelector('#deposit-modal .btn-primary[onclick="confirmDepositDone()"]');
  const orig = btn.textContent;
  btn.textContent = '⏳ Đang gửi...'; btn.disabled = true;

  try {
    const fd = new URLSearchParams();
    fd.append('amount', amount);
    fd.append('transfer_content', ref);
    fd.append('bank_name', 'Vietinbank');
    const res  = await fetch('/wallet/deposit-request', { method: 'POST', body: fd });
    const data = await res.json();

    if (data.success) {
      showToast('Yêu cầu nạp tiền đã gửi! Admin sẽ xác nhận trong vòng 24h.', 'success');
      setTimeout(() => closeModal('deposit-modal'), 1600);
    } else {
      showToast(data.message || 'Có lỗi xảy ra.', 'error');
    }
  } catch {
    showToast('Không thể kết nối server.', 'error');
  }
  btn.textContent = orig; btn.disabled = false;
}

// ══════════════════════════════════════════
// WITHDRAW — FEE 10%
// ══════════════════════════════════════════

function openWithdrawModal() {
  // Lấy số dư hiện tại từ DOM
  const balEl = document.querySelector('.wallet-balance-amount');
  const balText = balEl ? balEl.textContent.replace(/[₫,.]/g, '') : '0';
  document.getElementById('withdraw-balance-display').textContent = balEl ? balEl.textContent : '--';
  document.getElementById('withdraw-amount').value = '';
  document.getElementById('withdraw-fee-box').style.display = 'none';
  document.getElementById('withdraw-msg').innerHTML = '';
  openModal('withdraw-modal');
}

function calcWithdrawFee() {
  const raw    = document.getElementById('withdraw-amount').value;
  const amount = parseFloat(raw);
  const box    = document.getElementById('withdraw-fee-box');
  if (!amount || amount <= 0) { box.style.display = 'none'; return; }

  const fee     = Math.round(amount * 0.10);
  const receive = amount - fee;
  const fmt     = v => new Intl.NumberFormat('vi-VN').format(v) + '₫';

  document.getElementById('fee-requested').textContent = fmt(amount);
  document.getElementById('fee-charge').textContent    = '−' + fmt(fee);
  document.getElementById('fee-receive').textContent   = fmt(receive);
  box.style.display = '';
}
// Rút tiền
async function submitWithdraw() {
  const amountInput = document.getElementById('withdraw-amount').value;
  const amount = parseFloat(amountInput);

  if (!amount || amount < 100000) {
    showFormMsg('withdraw-msg', 'Số tiền rút tối thiểu là 100.000₫.', 'error');
    return;
  }

  const btn  = document.getElementById('withdraw-submit-btn');
  const orig = btn.textContent;
  btn.textContent = '⏳ Đang xử lý...'; btn.disabled = true;

  try {
    // SỬA TẠI ĐÂY: Dùng URLSearchParams thay vì FormData[cite: 4, 6]
    const params = new URLSearchParams();
    params.append('amount', amountInput);

    const res  = await fetch('/wallet/withdraw-request', { 
      method: 'POST', 
      body: params // Gửi params thay vì fd
    });
    const data = await res.json();

    if (data.success) {
      showFormMsg('withdraw-msg', data.message, 'success');
      showToast(data.message, 'success');
      updateBalanceDisplay(data.new_balance);
      const fee     = Math.round(amount * 0.10);
      const receive = amount - fee;
      addTxnToList('withdraw', amount, `Rút tiền (thực nhận ${new Intl.NumberFormat('vi-VN').format(receive)}₫)`);
      setTimeout(() => closeModal('withdraw-modal'), 1800);
    } else {
      showFormMsg('withdraw-msg', data.message, 'error');
    }
  } catch {
    showFormMsg('withdraw-msg', 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
  }
  btn.textContent = orig; btn.disabled = false;
}

// ── Helper: cập nhật số dư trên UI ──
function updateBalanceDisplay(newBalance) {
  if (newBalance === undefined) return;
  const fmt = new Intl.NumberFormat('vi-VN').format(newBalance) + '₫';
  document.querySelectorAll('.wallet-balance-amount, #wallet-balance-display, .wallet-hero-amount').forEach(el => {
    el.textContent = fmt;
  });
}

function addTxnToList(type, amount, desc) {
  const list = document.querySelector('.txn-list');
  if (!list) return;
  const icons  = { deposit: '⬇️', withdraw: '⬆️' };
  const cls    = type === 'deposit' ? 'txn-in' : 'txn-out';
  const sign   = type === 'deposit' ? '+' : '-';
  const amtCls = type === 'deposit' ? 'txn-amount-in' : 'txn-amount-out';
  const now    = new Date().toISOString().slice(0,16).replace('T',' ');
  const fmt    = new Intl.NumberFormat('vi-VN').format(amount);
  const el     = document.createElement('div');
  el.className = 'txn-item';
  el.innerHTML = `
    <div class="txn-icon ${cls}">${icons[type] || '↔️'}</div>
    <div class="txn-body">
      <div class="txn-desc">${desc || ''}</div>
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
  // Đảm bảo số bài học = 0 khi mở modal
  var totalLessons = document.getElementById('create-total-lessons');
  if (totalLessons) totalLessons.value = '0';
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

// Ngân hàng
document.getElementById('bank-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn  = e.target.querySelector('button[type=submit]');
  const orig = btn.textContent;
  btn.textContent = '⏳ Đang lưu...'; btn.disabled = true;

  try {
    // Sử dụng URLSearchParams để Backend đọc được dữ liệu
    const params = new URLSearchParams(new FormData(e.target));

    const res  = await fetch('/update-bank-info', { 
      method: 'POST', 
      body: params 
    });
    const data = await res.json();

    // Hiển thị thông báo lỗi/thành công vào vùng bank-msg
    showFormMsg('bank-msg', data.message, data.success ? 'success' : 'error');
    
    if (data.success) {
      showToast('Cập nhật thông tin ngân hàng thành công!', 'success');
    }
  } catch {
    showFormMsg('bank-msg', 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
  }
  btn.textContent = orig; btn.disabled = false;
});

// CLEAR TRANSACTION HISTORY
async function clearTxnHistory() {
  if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử giao dịch? Hành động này không thể hoàn tác!')) return;
  const btn = document.getElementById('clear-txn-btn');
  if (btn) { btn.textContent = '⏳ Đang xóa...'; btn.disabled = true; }
  try {
    const res  = await fetch('/wallet/clear-history', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa toàn bộ lịch sử giao dịch!', 'success');
      const txnList = document.querySelector('.txn-list');
      if (txnList) {
        txnList.outerHTML = `<div class="empty-courses" style="padding:40px 0;">
          <div class="empty-icon">💸</div>
          <h3>Chưa có giao dịch nào</h3>
          <p>Nạp tiền để bắt đầu mua khóa học!</p>
        </div>`;
      }
      if (btn) btn.remove();
    } else {
      showToast(data.message || 'Có lỗi xảy ra.', 'error');
      if (btn) { btn.textContent = '🗑 Xóa lịch sử'; btn.disabled = false; }
    }
  } catch {
    showToast('Không thể kết nối server.', 'error');
    if (btn) { btn.textContent = '🗑 Xóa lịch sử'; btn.disabled = false; }
  }
}

// DELETE ACCOUNT REQUEST
function openDeleteAccountModal() {
  document.getElementById('delete-reason').value = '';
  document.getElementById('delete-account-msg').innerHTML = '';
  document.getElementById('delete-account-msg').className = 'form-message';
  openModal('delete-account-modal');
}

async function submitDeleteAccount() {
  const reason = document.getElementById('delete-reason').value.trim();
  if (!reason) {
    showFormMsg('delete-account-msg', 'Vui lòng nhập lý do xóa tài khoản.', 'error');
    return;
  }
  const btn  = document.getElementById('delete-account-btn');
  const orig = btn.textContent;
  btn.textContent = '⏳ Đang gửi...'; btn.disabled = true;
  try {
    const fd = new URLSearchParams();
    fd.append('reason', reason);
    const res  = await fetch('/request-delete-account', { method: 'POST', body: fd });
    const data = await res.json();
    showFormMsg('delete-account-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) {
      showToast('Yêu cầu xóa tài khoản đã được gửi!', 'success');
      btn.textContent = '✓ Đã gửi yêu cầu';
      // Disable button sau khi gửi thành công
      document.getElementById('delete-account-btn').disabled = true;
    } else {
      btn.textContent = orig; btn.disabled = false;
    }
  } catch {
    showFormMsg('delete-account-msg', 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
    btn.textContent = orig; btn.disabled = false;
  }
}
// ── Xem trước ảnh bìa khóa học ──
function previewThumb(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const file = input.files && input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
}
// ── Đổi mật khẩu (modal #change-password-modal) ──
document.getElementById('change-password-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type=submit]');
  const orig = btn.textContent;

  const newPass  = document.getElementById('cp-new').value;
  const confPass = document.getElementById('cp-confirm').value;

  if (newPass !== confPass) {
    showFormMsg('password-msg', 'Mật khẩu xác nhận không khớp.', 'error');
    return;
  }

  btn.textContent = '⏳ Đang xử lý...'; btn.disabled = true;

  try {
    const res  = await fetch('/doi-mat-khau', {
      method: 'POST',
      body: new URLSearchParams(new FormData(form))
    });
    const data = await res.json();
    showFormMsg('password-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) {
      showToast('Đã đổi mật khẩu thành công!', 'success');
      form.reset();
      setTimeout(() => closeModal('change-password-modal'), 1600);
    }
  } catch {
    showFormMsg('password-msg', 'Lỗi kết nối máy chủ.', 'error');
  }
  btn.textContent = orig; btn.disabled = false;
});