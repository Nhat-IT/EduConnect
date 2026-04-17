// ═══════════════════════════════════════════
//  EDUCONNECT — MAIN.JS (Shared)
// ═══════════════════════════════════════════

// ── HEADER SCROLL ──────────────────────────
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// ── MOBILE MENU ────────────────────────────
function toggleMenu() {
  const nav = document.getElementById('main-nav');
  const ham = document.getElementById('hamburger');
  nav.classList.toggle('open');
  ham.classList.toggle('open');
}
document.addEventListener('click', e => {
  const nav = document.getElementById('main-nav');
  const ham = document.getElementById('hamburger');
  if (nav && !nav.contains(e.target) && !ham.contains(e.target)) {
    nav.classList.remove('open');
    ham && ham.classList.remove('open');
  }
});

// ── MODAL ──────────────────────────────────
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
function closeModalOverlay(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}
function switchModal(from, to) {
  closeModal(from);
  setTimeout(() => openModal(to), 100);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
});

// ── TOAST ──────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── FORM HELPERS ───────────────────────────
function showFormMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.className = `form-message ${type}`;
  }
}

// ── AUTH FORMS ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      btn.textContent = 'Đang xử lý...';
      btn.disabled = true;
      try {
        const res = await fetch('/login', {
          method: 'POST',
          body: new FormData(loginForm)
        });
        const data = await res.json();
        if (data.success) {
          showFormMsg('login-msg', data.message, 'success');
          setTimeout(() => location.reload(), 800);
        } else {
          showFormMsg('login-msg', data.message, 'error');
          btn.textContent = 'Đăng Nhập';
          btn.disabled = false;
        }
      } catch {
        showFormMsg('login-msg', 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
        btn.textContent = 'Đăng Nhập';
        btn.disabled = false;
      }
    });
  }

  // Register form
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = regForm.querySelector('button[type=submit]');
      btn.textContent = 'Đang tạo tài khoản...';
      btn.disabled = true;
      try {
        const res = await fetch('/register', {
          method: 'POST',
          body: new FormData(regForm)
        });
        const data = await res.json();
        if (data.success) {
          showFormMsg('register-msg', data.message, 'success');
          setTimeout(() => location.reload(), 900);
        } else {
          showFormMsg('register-msg', data.message, 'error');
          btn.textContent = 'Đăng Ký Miễn Phí';
          btn.disabled = false;
        }
      } catch {
        showFormMsg('register-msg', 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
        btn.textContent = 'Đăng Ký Miễn Phí';
        btn.disabled = false;
      }
    });
  }

  // Animate stats numbers
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString('vi-VN') + suffix;
      if (current >= target) clearInterval(timer);
    }, 20);
  });

  // Intersection Observer for reveal animations
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
