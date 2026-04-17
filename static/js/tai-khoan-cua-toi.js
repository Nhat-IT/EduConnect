// ═══ TÀI KHOẢN JS ═══

// ── Tab navigation ──
document.querySelectorAll('.pnav-link[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;

    document.querySelectorAll('.pnav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    link.classList.add('active');
    document.getElementById(`tab-${tab}`)?.classList.add('active');

    history.replaceState(null, '', `#${tab}`);
  });
});

// Open tab from URL hash
const hash = location.hash.replace('#', '');
if (hash && ['courses', 'profile', 'security'].includes(hash)) {
  document.querySelector(`.pnav-link[data-tab="${hash}"]`)?.click();
}

// ── Update profile ──
document.getElementById('profile-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Đang lưu...'; btn.disabled = true;
  try {
    const res = await fetch('/update-profile', { method: 'POST', body: new FormData(e.target) });
    const data = await res.json();
    showFormMsg('profile-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) showToast('Cập nhật thông tin thành công!', 'success');
  } catch {
    showFormMsg('profile-msg', 'Có lỗi xảy ra.', 'error');
  }
  btn.textContent = 'Lưu Thay Đổi'; btn.disabled = false;
});

// ── Animate progress bars ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.progress-fill').forEach(bar => {
    const w = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = w; }, 300);
  });
});
