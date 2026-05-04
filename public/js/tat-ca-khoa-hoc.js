// ═══ TẤT CẢ KHÓA HỌC JS ═══

// ── Filter Drawer ──────────────────────────────
function openFilter() {
  document.getElementById('filter-sidebar').classList.add('open');
  document.getElementById('filter-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFilter() {
  document.getElementById('filter-sidebar').classList.remove('open');
  document.getElementById('filter-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Đóng bằng Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeFilter();
});

// ── Auto-submit khi chọn radio ─────────────────
document.querySelectorAll('.filter-opt input[type=radio]').forEach(radio => {
  radio.addEventListener('change', () => {
    const form = document.getElementById('filter-form');
    form.classList.add('loading');
    form.submit();
  });
});

// ── Debounce search input ──────────────────────
const searchInput = document.querySelector('.filter-search input[name=q]');
let searchTimer;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (searchInput.value.length === 0 || searchInput.value.length >= 2) {
        document.getElementById('filter-form').submit();
      }
    }, 600);
  });
  // Enter key
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimer);
      document.getElementById('filter-form').submit();
    }
  });
}

// ── Đăng ký khóa học ──────────────────────────
async function enrollCourse(courseId, btn) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = '⏳';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  try {
    const res = await fetch(`/enroll/${courseId}`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      // Redirect vào bài học đầu tiên của khóa vừa đăng ký
      if (data.first_lesson_id) {
        setTimeout(() => { window.location.href = `/xem-bai-hoc/${data.first_lesson_id}`; }, 800);
      } else {
        btn.textContent = '✓ Đã Đăng Ký';
        btn.style.background = 'var(--green-500)';
        btn.style.color = 'white';
        btn.style.opacity = '1';
      }
    } else {
      btn.textContent = original;
      btn.disabled = false;
      btn.style.opacity = '1';
      showToast(data.message, 'error');
    }
  } catch {
    btn.textContent = original;
    btn.disabled = false;
    btn.style.opacity = '1';
    showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
  }
}

// ── Highlight active filter opts ──────────────
document.querySelectorAll('.filter-opt').forEach(opt => {
  const radio = opt.querySelector('input[type=radio]');
  if (radio && radio.checked) {
    opt.style.background = 'var(--brand-100)';
    opt.style.color = 'var(--brand-600)';
    opt.style.fontWeight = '600';
  }
  radio?.addEventListener('change', () => {
    // Remove highlight from siblings
    radio.closest('.filter-options').querySelectorAll('.filter-opt').forEach(o => {
      o.style.background = '';
      o.style.color = '';
      o.style.fontWeight = '';
    });
    // Highlight selected
    opt.style.background = 'var(--brand-100)';
    opt.style.color = 'var(--brand-600)';
    opt.style.fontWeight = '600';
  });
});