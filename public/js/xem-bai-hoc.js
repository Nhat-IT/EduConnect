/* ═══ XEM BÀI HỌC JS ═══ */

// ── Đọc constants từ data-* attributes trên .lesson-layout ──
const layoutEl = document.querySelector('.lesson-layout');
const LESSON_ID     = layoutEl ? parseInt(layoutEl.dataset.lessonId, 10) : 0;
const COURSE_ID     = layoutEl ? parseInt(layoutEl.dataset.courseId, 10) : 0;
const IS_INSTRUCTOR = layoutEl ? layoutEl.dataset.isInstructor === 'true' : false;
const TOTAL_LESSONS = layoutEl ? parseInt(layoutEl.dataset.totalLessons, 10) : 0;
const IS_DONE_INIT  = layoutEl ? layoutEl.dataset.isDoneInit === 'true' : false;
const PROGRESS_PCT_INIT = layoutEl ? parseInt(layoutEl.dataset.progressPct, 10) || 0 : 0;

// ── Khai báo biến global sớm để tránh ReferenceError ──
let courseFinished  = false;
let _discussLoaded  = false;
let _discussComments = [];
let _currentUserId   = 0;
let _replyingTo      = null;
let _editingId       = null;

// ── Khởi tạo trạng thái hoàn thành + progress bar lúc load ──
if (IS_INSTRUCTOR) {
  // Giảng viên xem trước — hiển thị badge xem trước, không ghi tiến độ
  const badge = document.getElementById('status-badge');
  if (badge) badge.textContent = '👁 Xem trước';
} else {
  if (IS_DONE_INIT) {
    const badge = document.getElementById('status-badge');
    if (badge) badge.textContent = '✅ Đã hoàn thành';
    const numEl = document.getElementById(`ls-num-${LESSON_ID}`);
    if (numEl) numEl.classList.add('done');
  }
  // Khởi tạo progress bar từ dữ liệu server
  updateSidebarProgress(PROGRESS_PCT_INIT);
}

// ── Render Markdown đơn giản ──
function renderMarkdown(text) {
  if (!text) return '<p style="color:var(--neutral-400);font-style:italic;">Không có nội dung.</p>';
  let html = text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;').trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.includes('---')) return '';
      const cells = line.slice(1,-1).split('|').map(c => c.trim());
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  html = html.replace(/(<li>.*?<\/li>)+/gs, m => `<ul>${m}</ul>`);
  html = html.replace(/(<tr>.*?<\/tr>)+/gs, m => `<table>${m}</table>`);
  return `<p>${html}</p>`;
}

// ── Render all materials ──
document.querySelectorAll('.material-content').forEach(el => {
  const content = el.dataset.content || '';
  const url     = el.dataset.url || '';
  const title   = el.dataset.title || 'Tài liệu';
  const body    = el.querySelector('.rendered-content');
  if (!body) return;

  if (url) {
    // Có file đính kèm — hiển thị link tải + nội dung text bên dưới nếu có
    const ext = url.split('.').pop().toLowerCase();
    const iconMap = { pdf: '📕', doc: '📝', docx: '📝', txt: '📄', zip: '🗜', png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼' };
    const icon = iconMap[ext] || '📎';
    const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext);
    let fileHtml = isImage
      ? `<div style="margin-bottom:12px;"><img src="${url}" alt="${title}" style="max-width:100%;border-radius:10px;"></div>`
      : `<a href="${url}" download target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--brand-50,#eff6ff);color:var(--brand-700,#1d4ed8);border:1.5px solid var(--brand-200,#bfdbfe);border-radius:10px;font-weight:600;font-size:0.88rem;text-decoration:none;margin-bottom:12px;">
        ${icon} Tải xuống: ${title}
      </a>`;
    body.innerHTML = fileHtml + (content ? renderMarkdown(content) : '');
  } else {
    body.innerHTML = renderMarkdown(content);
  }
});

// ── Toggle material card ──
function toggleMaterialCard(header) {
  const content = header.closest('.material-card').querySelector('.material-content');
  const btn = header.querySelector('.material-collapse-btn');
  btn.classList.toggle('collapsed');
  content.classList.toggle('hidden');
}

function toggleMaterial(btn) {
  const content = btn.closest('.material-card').querySelector('.material-content');
  btn.classList.toggle('collapsed');
  content.classList.toggle('hidden');
}

// ── Lesson tab switching ──
function switchLessonTab(tab, btn) {
  document.querySelectorAll('.ltab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ltab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`ltab-${tab}`)?.classList.add('active');

  // Load thảo luận lần đầu khi bấm vào tab
  if (tab === 'discuss' && !_discussLoaded) {
    loadComments();
  }
}

// ══════════════════════════════════════════
// EXERCISE SYSTEM
// ══════════════════════════════════════════
let exerciseStarted = false;
let answers = {};
let totalQuestions = 0;

function startExercise() {
  exerciseStarted = true;
  answers = {};

  // Hiện container câu hỏi (ẩn mặc định trước khi bắt đầu)
  const container = document.getElementById('exercise-container');
  if (container) container.style.display = '';

  totalQuestions = document.querySelectorAll('.exercise-card').length;

  document.querySelectorAll('.exercise-card').forEach(card => {
    card.classList.remove('answered-correct','answered-wrong');
    card.querySelectorAll('.ex-opt').forEach(opt => {
      opt.disabled = false;
      opt.classList.remove('correct','wrong');
    });
    const id = card.id.replace('ex-','');
    const st = document.getElementById(`ex-status-${id}`);
    if (st) st.textContent = '';
    document.getElementById(`ex-exp-${id}`)?.classList.add('hidden');
  });

  document.getElementById('exercise-result')?.classList.add('hidden');
  showToast('Bài tập đã bắt đầu! Chọn đáp án cho mỗi câu.', 'success');
}

function selectAnswer(exId, letter, btn) {
  if (!exerciseStarted) {
    showToast('Nhấn "Bắt Đầu Làm Bài" trước!', 'error');
    return;
  }
  const card = document.getElementById(`ex-${exId}`);
  const correct = card.dataset.correct;
  const isCorrect = letter === correct;

  card.querySelectorAll('.ex-opt').forEach(opt => {
    opt.disabled = true;
    if (opt.dataset.letter === correct) opt.classList.add('correct');
    if (opt.dataset.letter === letter && !isCorrect) opt.classList.add('wrong');
  });

  const statusEl = document.getElementById(`ex-status-${exId}`);
  if (statusEl) {
    statusEl.textContent = isCorrect ? '✅ Đúng!' : '❌ Sai';
    statusEl.style.color = isCorrect ? '#10b981' : '#ef4444';
  }

  document.getElementById(`ex-exp-${exId}`)?.classList.remove('hidden');
  card.classList.add(isCorrect ? 'answered-correct' : 'answered-wrong');
  answers[exId] = isCorrect;

  if (Object.keys(answers).length === totalQuestions) {
    setTimeout(showExerciseResult, 600);
  }
}

function showExerciseResult() {
  const correct = Object.values(answers).filter(Boolean).length;
  const total   = totalQuestions;
  const pct     = Math.round((correct / total) * 100);

  const resultEl = document.getElementById('exercise-result');
  const scoreEl  = document.getElementById('result-score');
  const msgEl    = document.getElementById('result-msg');

  scoreEl.textContent = `${correct}/${total} — ${pct}%`;
  let msg = '';
  if (pct === 100) msg = '🏆 Xuất sắc! Bạn đã trả lời đúng tất cả câu hỏi!';
  else if (pct >= 80) msg = '🎉 Tuyệt vời! Bạn nắm vững kiến thức bài học này.';
  else if (pct >= 60) msg = '👍 Khá tốt! Hãy xem lại những câu trả lời sai nhé.';
  else msg = '📖 Hãy đọc lại tài liệu và thử lại!';
  msgEl.textContent = msg;

  resultEl.classList.remove('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function retryExercise() {
  startExercise();
  document.querySelector('.exercise-card')?.scrollIntoView({ behavior: 'smooth' });
}

// ══════════════════════════════════════════
// NOTES SYSTEM
// ══════════════════════════════════════════
const NOTE_KEY = `edu_note_lesson_${LESSON_ID || '0'}`;
let autoSaveTimer = null;

const noteArea = document.getElementById('lesson-note');
if (noteArea) {
  try { noteArea.value = localStorage.getItem(NOTE_KEY) || ''; } catch (e) {}
  noteArea.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    const indicator = document.getElementById('note-autosave');
    if (indicator) indicator.textContent = '...';
    autoSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(NOTE_KEY, noteArea.value);
        if (indicator) {
          indicator.textContent = '✓ Đã lưu';
          setTimeout(() => { indicator.textContent = ''; }, 2000);
        }
      } catch (e) {}
    }, 800);
  });
}

function saveNote() {
  try {
    localStorage.setItem(NOTE_KEY, noteArea.value);
    showToast('Ghi chú đã được lưu!', 'success');
  } catch (e) {
    showToast('Không thể lưu ghi chú.', 'error');
  }
}

// ── Sidebar toggle (mobile) ──
function toggleLessonSidebar() {
  document.getElementById('lesson-sidebar')?.classList.toggle('open');
}

// ══════════════════════════════════════════
// MARK COMPLETE — gọi API + tự động hoàn thành khóa khi đạt 100%
// ══════════════════════════════════════════
async function markComplete() {
  // Giảng viên chỉ xem trước — không ghi nhận tiến độ
  if (IS_INSTRUCTOR) {
    showToast('Bạn đang xem trước với tư cách giảng viên. Tiến độ không được ghi nhận.', 'error');
    return;
  }
  const btn = document.getElementById('complete-btn');
  if (!btn || btn.classList.contains('is-done')) return;

  btn.textContent = '⏳ Đang lưu...';
  btn.disabled = true;

  try {
    const res  = await fetch('/mark-lesson-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: LESSON_ID })
    });
    const data = await res.json();

    if (data.success) {
      btn.textContent = '✅ Đã Hoàn Thành';
      btn.classList.add('is-done');
      const badge = document.getElementById('status-badge');
      if (badge) badge.textContent = '✅ Đã hoàn thành';

      const numEl = document.getElementById(`ls-num-${LESSON_ID}`);
      if (numEl) { numEl.textContent = '✓'; numEl.classList.add('done'); }

      updateSidebarProgress(data.progress_pct);
      showToast('✅ Đánh dấu hoàn thành!', 'success');

      if (Number(data.progress_pct) >= 100) {
        autoFinishCourse();
      }
    } else {
      showToast(data.message || 'Có lỗi.', 'error');
      btn.textContent = '☑️ Đánh Dấu Hoàn Thành';
      btn.disabled = false;
    }
  } catch {
    showToast('Lỗi kết nối.', 'error');
    btn.textContent = '☑️ Đánh Dấu Hoàn Thành';
    btn.disabled = false;
  }
}

function updateSidebarProgress(pct) {
  if (pct === undefined || pct === null) return;
  const bar = document.getElementById('sidebar-bar');
  const lbl = document.getElementById('sidebar-pct');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent = pct + '%';
  if (Number(pct) >= 100) autoFinishCourse();
}

// ══ REVIEW MODAL ══════════════════════════════
let _reviewCourseId   = COURSE_ID;
let _reviewCourseName = '';
let _selectedStar     = 0;

function autoFinishCourse() {
  if (courseFinished) return;
  courseFinished = true;

  // Lấy tên khóa học từ sidebar
  const titleEl = document.querySelector('.ls-course-title');
  _reviewCourseName = titleEl ? titleEl.textContent.trim() : 'khóa học này';

  showToast('🎉 Chúc mừng bạn đã hoàn thành khóa học!', 'success');

  // Hiện modal đánh giá sau 1.2s (để toast hiện trước)
  setTimeout(openReviewModal, 1200);
}

function openReviewModal() {
  const nameEl = document.getElementById('review-modal-course-name');
  if (nameEl) nameEl.textContent = _reviewCourseName;

  // Reset form
  _selectedStar = 0;
  setStarDisplay(0);
  const commentEl = document.getElementById('review-comment');
  if (commentEl) commentEl.value = '';
  const msgEl = document.getElementById('review-msg');
  if (msgEl) { msgEl.textContent = ''; msgEl.className = 'form-message'; }
  const btn = document.getElementById('review-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Gửi Đánh Giá ⭐'; }

  // Star click handlers
  document.querySelectorAll('#star-rating .star').forEach(star => {
    star.onclick = () => {
      _selectedStar = parseInt(star.dataset.val);
      setStarDisplay(_selectedStar);
    };
    star.onmouseenter = () => setStarDisplay(parseInt(star.dataset.val));
    star.onmouseleave = () => setStarDisplay(_selectedStar);
  });

  document.getElementById('review-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setStarDisplay(val) {
  const hints = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Xuất sắc!'];
  document.querySelectorAll('#star-rating .star').forEach(star => {
    star.classList.toggle('active', parseInt(star.dataset.val) <= val);
  });
  const hintEl = document.getElementById('star-hint');
  if (hintEl) hintEl.textContent = val ? hints[val] : 'Chọn số sao';
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeReviewOverlay(e) {
  if (e.target === e.currentTarget) closeReviewModal();
}

function skipReview() {
  closeReviewModal();
  window.location.href = '/tai-khoan#courses';
}

async function submitReview() {
  if (!_selectedStar) {
    const msgEl = document.getElementById('review-msg');
    msgEl.textContent = 'Vui lòng chọn số sao đánh giá.';
    msgEl.className = 'form-message error';
    return;
  }
  const comment = (document.getElementById('review-comment').value || '').trim();
  if (!comment) {
    const msgEl = document.getElementById('review-msg');
    msgEl.textContent = 'Vui lòng nhập nhận xét của bạn.';
    msgEl.className = 'form-message error';
    return;
  }

  const btn = document.getElementById('review-submit-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Đang gửi...';

  try {
    const res  = await fetch('/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: _reviewCourseId, rating: _selectedStar, comment })
    });
    const data = await res.json();

    const msgEl = document.getElementById('review-msg');
    if (data.success) {
      msgEl.textContent = '🎉 Cảm ơn bạn đã đánh giá! Đang chuyển về tài khoản...';
      msgEl.className = 'form-message success';
      setTimeout(() => {
        closeReviewModal();
        window.location.href = '/tai-khoan#courses';
      }, 1800);
    } else {
      msgEl.textContent = data.message || 'Có lỗi xảy ra.';
      msgEl.className = 'form-message error';
      btn.disabled = false;
      btn.textContent = 'Gửi Đánh Giá ⭐';
    }
  } catch {
    const msgEl = document.getElementById('review-msg');
    msgEl.textContent = 'Lỗi kết nối, vui lòng thử lại.';
    msgEl.className = 'form-message error';
    btn.disabled = false;
    btn.textContent = 'Gửi Đánh Giá ⭐';
  }
}

// ══════════════════════════════════════════
// DISCUSSION / COMMENTS SYSTEM
// ══════════════════════════════════════════

// ── Khởi tạo avatar chữ cái đầu tên user ──
(function initDiscussAvatar() {
  const nameEl = document.querySelector('.ls-course-title');
  // Lấy tên từ instructor card nếu có, fallback "U"
  const userNameEl = document.querySelector('.ls-back');
  const avatar = document.getElementById('discuss-my-avatar');
  if (avatar) {
    // Lấy tên từ session (truyền qua data attribute trên layout nếu có)
    const layoutName = layoutEl ? (layoutEl.dataset.userName || '') : '';
    avatar.textContent = layoutName ? layoutName[0].toUpperCase() : 'U';
  }
})();



// ── Load danh sách bình luận ──
async function loadComments() {
  _discussLoaded = true;
  const listEl = document.getElementById('discuss-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="discuss-loading"><span class="discuss-spinner"></span> Đang tải thảo luận...</div>';

  try {
    const res  = await fetch(`/lesson-comments/${LESSON_ID}`);
    const data = await res.json();
    if (!data.success) {
      listEl.innerHTML = `<div class="discuss-empty"><p>${data.message || 'Không thể tải thảo luận.'}</p></div>`;
      return;
    }
    _discussComments = data.comments || [];
    _currentUserId   = data.current_user_id || 0;
    renderComments();
  } catch {
    listEl.innerHTML = '<div class="discuss-empty"><p>Lỗi kết nối, vui lòng thử lại.</p></div>';
  }
}

// ── Render toàn bộ danh sách (nested) ──
function renderComments() {
  const listEl = document.getElementById('discuss-list');
  if (!listEl) return;

  const roots   = _discussComments.filter(c => !c.parent_id);
  const replies = _discussComments.filter(c =>  c.parent_id);

  if (roots.length === 0) {
    listEl.innerHTML = `
      <div class="discuss-empty">
        <div class="discuss-empty-icon">💬</div>
        <p>Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = roots.map(c => renderCommentHTML(c, replies)).join('');
}

function renderCommentHTML(c, replies) {
  const isOwn        = c.user_id === _currentUserId;
  const roleTag      = c.is_instructor_comment
    ? '<span class="dc-role instructor">Giảng viên</span>'
    : (c.is_admin ? '<span class="dc-role admin">Admin</span>' : '');
  const time         = formatRelTime(c.created_at);
  const avatar       = (c.user_name || '?')[0].toUpperCase();
  const childReplies = replies.filter(r => r.parent_id === c.id);
  const edited       = c.updated_at && c.updated_at !== c.created_at
    ? '<span class="dc-edited">(đã sửa)</span>' : '';

  const actions = `
    <button class="dc-action-btn" onclick="startReply(${c.id}, '${escHtml(c.user_name)}')">↩ Trả lời</button>
    ${isOwn ? `<button class="dc-action-btn" onclick="startEdit(${c.id})">✏ Sửa</button>` : ''}
    ${isOwn || IS_INSTRUCTOR ? `<button class="dc-action-btn danger" onclick="deleteComment(${c.id})">🗑 Xóa</button>` : ''}
  `;

  const repliesHTML = childReplies.length > 0
    ? `<div class="dc-replies">${childReplies.map(r => renderReplyHTML(r)).join('')}</div>`
    : '';

  return `
    <div class="dc-item" id="dc-${c.id}">
      <div class="dc-avatar">${avatar}</div>
      <div class="dc-body">
        <div class="dc-meta">
          <span class="dc-name">${escHtml(c.user_name)}</span>
          ${roleTag}
          <span class="dc-time">${time}</span>
          ${edited}
        </div>
        <div class="dc-content" id="dc-content-${c.id}">${escHtml(c.content)}</div>
        <div class="dc-edit-form hidden" id="dc-edit-${c.id}">
          <textarea class="discuss-textarea small" id="dc-edit-input-${c.id}" maxlength="2000">${escHtml(c.content)}</textarea>
          <div class="dc-edit-actions">
            <button class="btn-primary-sm" onclick="saveEdit(${c.id})">💾 Lưu</button>
            <button class="btn-outline-sm"  onclick="cancelEdit(${c.id})">Hủy</button>
          </div>
        </div>
        <div class="dc-actions">${actions}</div>
        ${repliesHTML}
        <div class="dc-reply-form hidden" id="dc-reply-form-${c.id}">
          <textarea class="discuss-textarea small" id="dc-reply-input-${c.id}"
            placeholder="Trả lời ${escHtml(c.user_name)}..." maxlength="2000" rows="2"></textarea>
          <div class="dc-edit-actions">
            <button class="btn-primary-sm" onclick="submitReplyTo(${c.id})">↩ Gửi trả lời</button>
            <button class="btn-outline-sm"  onclick="cancelReply(${c.id})">Hủy</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderReplyHTML(c) {
  const isOwn   = c.user_id === _currentUserId;
  const roleTag = c.is_instructor_comment
    ? '<span class="dc-role instructor">Giảng viên</span>'
    : (c.is_admin ? '<span class="dc-role admin">Admin</span>' : '');
  const time    = formatRelTime(c.created_at);
  const avatar  = (c.user_name || '?')[0].toUpperCase();
  const edited  = c.updated_at && c.updated_at !== c.created_at
    ? '<span class="dc-edited">(đã sửa)</span>' : '';

  const actions = `
    ${isOwn ? `<button class="dc-action-btn" onclick="startEdit(${c.id})">✏ Sửa</button>` : ''}
    ${isOwn || IS_INSTRUCTOR ? `<button class="dc-action-btn danger" onclick="deleteComment(${c.id})">🗑 Xóa</button>` : ''}
  `;

  return `
    <div class="dc-item reply" id="dc-${c.id}">
      <div class="dc-avatar small">${avatar}</div>
      <div class="dc-body">
        <div class="dc-meta">
          <span class="dc-name">${escHtml(c.user_name)}</span>
          ${roleTag}
          <span class="dc-time">${time}</span>
          ${edited}
        </div>
        <div class="dc-content" id="dc-content-${c.id}">${escHtml(c.content)}</div>
        <div class="dc-edit-form hidden" id="dc-edit-${c.id}">
          <textarea class="discuss-textarea small" id="dc-edit-input-${c.id}" maxlength="2000">${escHtml(c.content)}</textarea>
          <div class="dc-edit-actions">
            <button class="btn-primary-sm" onclick="saveEdit(${c.id})">💾 Lưu</button>
            <button class="btn-outline-sm"  onclick="cancelEdit(${c.id})">Hủy</button>
          </div>
        </div>
        <div class="dc-actions">${actions}</div>
      </div>
    </div>`;
}

// ── Đăng bình luận gốc ──
async function postComment() {
  const input   = document.getElementById('discuss-input');
  const content = (input?.value || '').trim();
  if (!content) { showToast('Vui lòng nhập nội dung bình luận.', 'error'); return; }

  setDiscussStatus('sending');
  try {
    const res  = await fetch('/lesson-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: LESSON_ID, content })
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      discussCountChars();
      _discussComments.push(data.comment);
      renderComments();
      setDiscussStatus('');
      showToast('Đã đăng bình luận!', 'success');
    } else {
      setDiscussStatus('');
      showToast(data.message || 'Có lỗi xảy ra.', 'error');
    }
  } catch {
    setDiscussStatus('');
    showToast('Lỗi kết nối.', 'error');
  }
}

// ── Reply ──
function startReply(parentId, parentName) {
  // Đóng các reply form khác
  document.querySelectorAll('.dc-reply-form').forEach(f => f.classList.add('hidden'));
  const formEl = document.getElementById(`dc-reply-form-${parentId}`);
  if (formEl) {
    formEl.classList.remove('hidden');
    document.getElementById(`dc-reply-input-${parentId}`)?.focus();
  }
  _replyingTo = { id: parentId, name: parentName };
}

function cancelReply(parentId) {
  document.getElementById(`dc-reply-form-${parentId}`)?.classList.add('hidden');
  _replyingTo = null;
}

async function submitReplyTo(parentId) {
  const input   = document.getElementById(`dc-reply-input-${parentId}`);
  const content = (input?.value || '').trim();
  if (!content) { showToast('Vui lòng nhập nội dung trả lời.', 'error'); return; }

  try {
    const res  = await fetch('/lesson-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: LESSON_ID, content, parent_id: parentId })
    });
    const data = await res.json();
    if (data.success) {
      if (input) input.value = '';
      _discussComments.push(data.comment);
      renderComments();
      showToast('Đã gửi trả lời!', 'success');
    } else {
      showToast(data.message || 'Có lỗi xảy ra.', 'error');
    }
  } catch {
    showToast('Lỗi kết nối.', 'error');
  }
}

// ── Edit ──
function startEdit(id) {
  document.querySelectorAll('.dc-edit-form').forEach(f => f.classList.add('hidden'));
  document.querySelectorAll('.dc-content').forEach(c => c.classList.remove('hidden'));
  document.getElementById(`dc-edit-${id}`)?.classList.remove('hidden');
  document.getElementById(`dc-content-${id}`)?.classList.add('hidden');
  document.getElementById(`dc-edit-input-${id}`)?.focus();
  _editingId = id;
}

function cancelEdit(id) {
  document.getElementById(`dc-edit-${id}`)?.classList.add('hidden');
  document.getElementById(`dc-content-${id}`)?.classList.remove('hidden');
  _editingId = null;
}

async function saveEdit(id) {
  const input   = document.getElementById(`dc-edit-input-${id}`);
  const content = (input?.value || '').trim();
  if (!content) { showToast('Nội dung không được trống.', 'error'); return; }

  try {
    const res  = await fetch(`/lesson-comments/${id}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      // Cập nhật trong local list
      const c = _discussComments.find(c => c.id === id);
      if (c) { c.content = content; c.updated_at = new Date().toISOString(); }
      renderComments();
      showToast('Đã cập nhật bình luận!', 'success');
      _editingId = null;
    } else {
      showToast(data.message || 'Có lỗi.', 'error');
    }
  } catch {
    showToast('Lỗi kết nối.', 'error');
  }
}

// ── Delete ──
async function deleteComment(id) {
  if (!confirm('Xóa bình luận này?')) return;
  try {
    const res  = await fetch(`/lesson-comments/${id}/delete`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      // Xóa comment và các replies khỏi local list
      _discussComments = _discussComments.filter(c => c.id !== id && c.parent_id !== id);
      renderComments();
      showToast('Đã xóa bình luận.', 'success');
    } else {
      showToast(data.message || 'Có lỗi.', 'error');
    }
  } catch {
    showToast('Lỗi kết nối.', 'error');
  }
}

// ── Helpers ──
function discussCountChars() {
  const input   = document.getElementById('discuss-input');
  const counter = document.getElementById('discuss-char-count');
  if (input && counter) counter.textContent = `${input.value.length} / 2000`;
}

function setDiscussStatus(state) {
  const el = document.getElementById('discuss-status');
  if (!el) return;
  if (state === 'sending') {
    el.innerHTML = '<span class="discuss-spinner"></span> Đang gửi...';
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function formatRelTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}