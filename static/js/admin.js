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
function showAdminToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast ${type}`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Active sidebar link ────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav based on current path
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });

  // Animate stat numbers
  document.querySelectorAll('.dsc-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = target / 50;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString('vi-VN') + suffix;
      if (current >= target) clearInterval(timer);
    }, 20);
  });

  // Bar chart animation on load
  document.querySelectorAll('.bar-fill').forEach((bar, i) => {
    const targetH = bar.style.height;
    bar.style.height = '0%';
    bar.style.transition = `height 0.6s ease ${i * 0.08}s`;
    setTimeout(() => { bar.style.height = targetH; }, 100);
  });
});
