// ═══ TRANG CHỦ JS ═══
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
