// ═══════════════════════════════════════════
//  EDUCONNECT ADMIN JS
// ═══════════════════════════════════════════

// ── Sidebar toggle (mobile) ────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

// ── Modal helpers ──────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function closeAdminModal(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// Đóng modal bằng Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.admin-modal-overlay.open').forEach(m => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
});

// ── Toast ─────────────────────────────────
function showAdminToast(msg, type) {
  if (!type) type = 'success';
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.classList.remove('show');
  void toast.offsetWidth; // force reflow để reset transition
  toast.textContent = msg;
  toast.className = 'admin-toast ' + type + ' show';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function() {
    toast.classList.remove('show');
  }, 3200);
}

// ── Active sidebar link ────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Highlight active nav based on current path
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(function(link) {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });

  // Animate stat numbers
  document.querySelectorAll('.dsc-num[data-count]').forEach(function(el) {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = target / 50;
    const timer = setInterval(function() {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString('vi-VN') + suffix;
      if (current >= target) clearInterval(timer);
    }, 20);
  });

  // Bar chart animation on load
  document.querySelectorAll('.bar-fill').forEach(function(bar, i) {
    const targetH = bar.style.height;
    bar.style.height = '0%';
    bar.style.transition = 'height 0.6s ease ' + (i * 0.08) + 's';
    setTimeout(function() { bar.style.height = targetH; }, 100);
  });
});

// ── Utility: POST JSON ─────────────────────
function adminPost(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }).then(function(r) { return r.json(); });
}

function reloadAfter(ms) {
  setTimeout(function() { location.reload(); }, ms || 1000);
}

// ── Withdrawals ────────────────────────────
function approveWithdrawal(wid) {
  if (!confirm('Xác nhận đã chuyển tiền và duyệt yêu cầu này?')) return;
  adminPost('/admin/withdrawals/approve/' + wid).then(function(res) {
    showAdminToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAfter();
  }).catch(function() { showAdminToast('Lỗi kết nối server.', 'error'); });
}

function completeWithdrawal(wid) {
  if (!confirm('Xác nhận đã chuyển khoản thành công cho yêu cầu này?')) return;
  fetch('/admin/withdrawals/complete/' + wid, { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      showAdminToast(res.message, res.success ? 'success' : 'error');
      if (res.success) reloadAfter(800);
    }).catch(function() { showAdminToast('Lỗi kết nối server.', 'error'); });
}

// openReject() và submit form từ chối được xử lý trong withdrawals.html

// ── Deposits ───────────────────────────────
function approveDeposit(did) {
  if (!confirm('Xác nhận duyệt yêu cầu nạp tiền này?')) return;
  adminPost('/admin/deposits/approve/' + did).then(function(res) {
    showAdminToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAfter();
  }).catch(function() { showAdminToast('Lỗi kết nối server.', 'error'); });
}

function rejectDeposit(did) {
  const note = prompt('Lý do từ chối (có thể bỏ trống):') ;
  if (note === null) return; // user bấm Cancel
  adminPost('/admin/deposits/reject/' + did, { note: note }).then(function(res) {
    showAdminToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAfter();
  }).catch(function() { showAdminToast('Lỗi kết nối server.', 'error'); });
}

// ── Password Resets ────────────────────────
function grantPasswordReset(rid) {
  const newPass = prompt('Nhập mật khẩu mới cho người dùng (tối thiểu 6 ký tự):');
  if (newPass === null) return; // user bấm Cancel
  if (!newPass || newPass.trim().length < 6) {
    showAdminToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
    return;
  }
  adminPost('/admin/password-resets/grant/' + rid, { new_password: newPass.trim() }).then(function(res) {
    showAdminToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAfter(1500);
  }).catch(function() { showAdminToast('Lỗi kết nối server.', 'error'); });
}

function rejectPasswordReset(rid) {
  if (!confirm('Từ chối yêu cầu đặt lại mật khẩu này?')) return;
  adminPost('/admin/password-resets/reject/' + rid).then(function(res) {
    showAdminToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAfter();
  }).catch(function() { showAdminToast('Lỗi kết nối server.', 'error'); });
}