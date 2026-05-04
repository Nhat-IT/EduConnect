// ═══ TRANG CHỦ JS ═══

// ── Course Detail Modal ────────────────────────
let _currentCourseId = null;

function openCourseDetail(course) {
  _currentCourseId = course.id;

  // Populate header
  document.getElementById('cd-category').textContent = course.category || '';
  document.getElementById('cd-title').textContent = course.title || '';
  document.getElementById('cd-instructor').textContent = '👨‍🏫 ' + (course.instructor || '');

  // Meta
  document.getElementById('cd-rating').textContent = (course.rating || '—') + ' / 5';
  document.getElementById('cd-lessons').textContent = (course.lessons || 0) + ' bài học';
  document.getElementById('cd-students').textContent = (course.students || 0) + ' học viên';

  // Description
  const descEl = document.getElementById('cd-desc');
  descEl.textContent = course.description && course.description.trim()
    ? course.description
    : 'Khóa học thực chiến với nội dung được xây dựng bài bản, giúp bạn nắm vững kiến thức và áp dụng ngay vào công việc thực tế.';

  // Price
  const priceNow = Number(course.price) || 0;
  const priceOld = Number(course.originalPrice) || 0;
  document.getElementById('cd-price-now').textContent = priceNow.toLocaleString('vi-VN') + '₫';
  const oldEl = document.getElementById('cd-price-old');
  const badgeEl = document.getElementById('cd-price-badge');
  if (priceOld > priceNow) {
    oldEl.textContent = priceOld.toLocaleString('vi-VN') + '₫';
    oldEl.style.display = '';
    const pct = Math.round((1 - priceNow / priceOld) * 100);
    badgeEl.textContent = '-' + pct + '%';
    badgeEl.style.display = '';
  } else {
    oldEl.style.display = 'none';
    badgeEl.style.display = 'none';
  }

  openModal('course-detail-modal');
}

function closeCourseDetailOverlay(e) {
  if (e.target === e.currentTarget) closeModal('course-detail-modal');
}

async function enrollFromDetail() {
  if (!_currentCourseId) return;
  const btn = document.getElementById('cd-enroll-btn');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '⏳ Đang xử lý...';
  btn.disabled = true;
  try {
    const res = await fetch(`/enroll/${_currentCourseId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Đăng ký thành công!', 'success');
      closeModal('course-detail-modal');
      if (data.first_lesson_id) {
        setTimeout(() => { window.location.href = `/xem-bai-hoc/${data.first_lesson_id}`; }, 800);
      }
    } else {
      btn.textContent = orig;
      btn.disabled = false;
      showToast(data.message || 'Có lỗi xảy ra.', 'error');
    }
  } catch {
    btn.textContent = orig;
    btn.disabled = false;
    showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
  }
}

let searchTimeout;
const searchInput = document.getElementById('hero-search');
const searchResults = document.getElementById('search-results');

function doSearch() {
  const q = searchInput?.value.trim();
  if (q) window.location.href = `/khoa-hoc?q=${encodeURIComponent(q)}`;
}

if (searchInput) {
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 2) {
      searchResults.classList.remove('open');
      return;
    }
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.length === 0) {
          searchResults.innerHTML = `<div class="search-result-item"><span class="sri-title">Không tìm thấy kết quả</span></div>`;
        } else {
          searchResults.innerHTML = data.map(c => `
            <div class="search-result-item" onclick="window.location.href='/khoa-hoc'">
              <span class="sri-icon">📚</span>
              <div>
                <div class="sri-title">${c.title}</div>
                <div class="sri-price">${Number(c.price).toLocaleString('vi-VN')}₫</div>
              </div>
            </div>`).join('');
        }
        searchResults.classList.add('open');
      } catch {}
    }, 300);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar')) {
      searchResults.classList.remove('open');
    }
  });
}