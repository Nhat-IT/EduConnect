// LESSON_ID và COURSE_ID được khai báo trong HTML template (inline script)
// trước khi load file này — xem chinh-sua-bai-hoc.html

// ── Toggle section collapse ──
function toggleSection(name) {
  document.getElementById('section-' + name).classList.toggle('collapsed');
}

// ── Toggle material item collapse ──
function toggleMaterial(header) {
  header.closest('.material-item').classList.toggle('collapsed');
}

// ── Toggle exercise item collapse ──
function toggleExercise(header) {
  const item = header.closest('.exercise-item');
  item.classList.toggle('collapsed');
  const icon = header.querySelector('.material-toggle-icon');
  if (icon) icon.style.transform = item.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
}

// ── Mark unsaved ──
function markUnsaved() {
  const dot = document.getElementById('save-dot');
  const txt = document.getElementById('save-status');
  if (dot) { dot.className = 'save-dot unsaved'; }
  if (txt) txt.textContent = 'Có thay đổi chưa lưu';
}
function markSaved() {
  const dot = document.getElementById('save-dot');
  const txt = document.getElementById('save-status');
  if (dot) { dot.className = 'save-dot saved'; }
  if (txt) txt.textContent = 'Đã lưu';
}

// Watch all inputs for changes
document.querySelectorAll('input,textarea,select').forEach(el => {
  el.addEventListener('input', markUnsaved);
  el.addEventListener('change', markUnsaved);
});

// ── showFormMsg helper ──
function showFormMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'form-message ' + (type === 'success' ? 'success' : 'error');
  setTimeout(() => { el.textContent = ''; el.className = 'form-message'; }, 4000);
}

// ── Toast helper ──
function showToast(msg, type = 'success') {
  let toast = document.getElementById('_toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '_toast';
    toast.style.cssText = `
      position:fixed;bottom:90px;right:24px;z-index:9999;
      padding:12px 20px;border-radius:12px;font-size:0.88rem;font-weight:600;
      box-shadow:0 4px 16px rgba(0,0,0,.15);transition:opacity .3s;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
  toast.style.color = '#fff';
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── Basic info form ──
document.getElementById('basic-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form  = e.target;
  const title = (form.querySelector('[name=title]')?.value || '').trim();
  if (!title) {
    showFormMsg('basic-msg', 'Vui lòng nhập tiêu đề bài học.', 'error');
    form.querySelector('[name=title]')?.focus();
    return;
  }
  const orderInput = form.querySelector('[name=order_num]');
  if (orderInput && !orderInput.value) orderInput.value = '1';

  const btn = form.querySelector('button[type=submit]');
  const orig = btn.textContent; btn.textContent = '⏳ Đang lưu...'; btn.disabled = true;
  try {
    const res  = await fetch(`/chinh-sua-bai-hoc/${LESSON_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form))
    });
    const data = await res.json();
    showFormMsg('basic-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) { showToast('Đã lưu thông tin bài học!', 'success'); markSaved(); }
  } catch { showFormMsg('basic-msg', 'Lỗi kết nối.', 'error'); }
  btn.textContent = orig; btn.disabled = false;
});

// ══════════════════════════════════════════════════════════════════════
// EVENT DELEGATION — bind 1 lần duy nhất lên container tĩnh.
// Bắt submit của MỌI form con (có sẵn + tạo động), không bao giờ bị
// nhân lên dù user click "Thêm" bao nhiêu lần.
// ══════════════════════════════════════════════════════════════════════

// ── Delegation: materials-list ────────────────────────────────────────
// Guard: chỉ bind 1 lần duy nhất dù script bị load nhiều lần
const _matList = document.getElementById('materials-list');
if (_matList && !_matList._submitBound) {
  _matList._submitBound = true;
  _matList.addEventListener('submit', _onMaterialSubmit);
}
async function _onMaterialSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form._submitting) return; // ← chặn tuyệt đối double-submit
  form._submitting = true;

  // Form chỉnh sửa tài liệu đã có
  if (form.classList.contains('material-edit-form')) {
    const id   = form.dataset.id;
    const btn  = form.querySelector('button[type=submit]');
    const orig = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
    try {
      const res  = await fetch(`/chinh-sua-material/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form))
      });
      const data = await res.json();
      if (data.success) { showToast('Đã lưu tài liệu!', 'success'); markSaved(); }
      else showToast(data.message || 'Lỗi không xác định.', 'error');
    } catch { showToast('Lỗi kết nối.', 'error'); }
    btn.textContent = orig; btn.disabled = false;
    form._submitting = false;
    return;
  }

  // Form thêm tài liệu mới (tạo động)
  if (form.classList.contains('material-new-form')) {
    const title = (form.querySelector('[name=title]')?.value || '').trim();
    if (!title) {
      showToast('Vui lòng nhập tiêu đề tài liệu.', 'error');
      form.querySelector('[name=title]')?.focus();
      form._submitting = false;
      return;
    }
    const btn  = form.querySelector('button[type=submit]');
    const orig = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;

    const p = new URLSearchParams();
    p.set('lesson_id',     String(LESSON_ID));
    p.set('title',         title);
    p.set('material_type', form.querySelector('[name=material_type]').value);
    p.set('content',       form.querySelector('[name=content]').value.trim());
    try {
      const res = await fetch('/them-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: p
      });
      let data;
      try { data = await res.json(); }
      catch { data = { success: false, message: 'Server lỗi HTTP ' + res.status }; }
      if (data.success) { showToast('Đã thêm tài liệu!', 'success'); markSaved(); location.reload(); }
      else { showToast(data.message || 'Thêm tài liệu thất bại.', 'error'); btn.textContent = orig; btn.disabled = false; form._submitting = false; }
    } catch (err) {
      console.error('[them-material]', err);
      showToast('Lỗi kết nối.', 'error');
      btn.textContent = orig; btn.disabled = false; form._submitting = false;
    }
  }
}

// ── Delegation: exercises-list ────────────────────────────────────────
// Guard: chỉ bind 1 lần duy nhất
const _exList = document.getElementById('exercises-list');
if (_exList && !_exList._submitBound) {
  _exList._submitBound = true;
  _exList.addEventListener('submit', _onExerciseSubmit);
}
async function _onExerciseSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form._submitting) return; // ← chặn tuyệt đối double-submit
  form._submitting = true;

  // Form chỉnh sửa câu hỏi đã có
  if (form.classList.contains('exercise-edit-form')) {
    const id   = form.dataset.id;
    const btn  = form.querySelector('button[type=submit]');
    const orig = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
    try {
      const res  = await fetch(`/chinh-sua-exercise/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form))
      });
      const data = await res.json();
      if (data.success) { showToast('Đã lưu câu hỏi!', 'success'); markSaved(); }
      else showToast(data.message || 'Lỗi không xác định.', 'error');
    } catch { showToast('Lỗi kết nối.', 'error'); }
    btn.textContent = orig; btn.disabled = false;
    form._submitting = false;
    return;
  }

  // Form thêm câu hỏi mới (tạo động)
  if (form.classList.contains('exercise-new-form')) {
    const question = (form.querySelector('[name=question]')?.value || '').trim();
    if (!question) {
      showToast('Vui lòng nhập câu hỏi.', 'error');
      form.querySelector('[name=question]')?.focus();
      form._submitting = false;
      return;
    }
    const radioName     = form.dataset.radioName;
    const selectedRadio = form.querySelector(`input[name="${radioName}"]:checked`);
    if (!selectedRadio) {
      showToast('Vui lòng chọn đáp án đúng.', 'error');
      form._submitting = false;
      return;
    }
    const btn  = form.querySelector('button[type=submit]');
    const orig = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;

    const p = new URLSearchParams();
    p.set('lesson_id',      String(LESSON_ID));
    p.set('question',       question);
    p.set('correct_answer', selectedRadio.value);
    p.set('option_a',       (form.querySelector('[name=option_a]')?.value  || '').trim());
    p.set('option_b',       (form.querySelector('[name=option_b]')?.value  || '').trim());
    p.set('option_c',       (form.querySelector('[name=option_c]')?.value  || '').trim());
    p.set('option_d',       (form.querySelector('[name=option_d]')?.value  || '').trim());
    p.set('explanation',    (form.querySelector('[name=explanation]')?.value || '').trim());
    try {
      const res = await fetch('/them-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: p
      });
      let data;
      try { data = await res.json(); }
      catch { data = { success: false, message: 'Server lỗi HTTP ' + res.status }; }
      if (data.success) { showToast('Đã thêm câu hỏi!', 'success'); markSaved(); location.reload(); }
      else { showToast(data.message || 'Thêm câu hỏi thất bại.', 'error'); btn.textContent = orig; btn.disabled = false; form._submitting = false; }
    } catch (err) {
      console.error('[them-exercise]', err);
      showToast('Lỗi kết nối.', 'error');
      btn.textContent = orig; btn.disabled = false; form._submitting = false;
    }
  }
}

// ── Delete material ──
async function deleteMaterial(id, btn) {
  if (!confirm('Xóa tài liệu này?')) return;
  try {
    const res  = await fetch(`/xoa-material/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`mat-${id}`)?.remove();
      showToast('Đã xóa tài liệu!', 'success');
    } else showToast(data.message || 'Xóa thất bại.', 'error');
  } catch { showToast('Lỗi kết nối.', 'error'); }
}

// ── Delete exercise ──
async function deleteExercise(id, btn) {
  if (!confirm('Xóa câu hỏi này?')) return;
  try {
    const res  = await fetch(`/xoa-exercise/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`ex-edit-${id}`)?.remove();
      showToast('Đã xóa câu hỏi!', 'success');
      renumberExercises();
    } else showToast(data.message || 'Xóa thất bại.', 'error');
  } catch { showToast('Lỗi kết nối.', 'error'); }
}

function renumberExercises() {
  document.querySelectorAll('#exercises-list .exercise-item').forEach((el, i) => {
    const num = el.querySelector('.exercise-item-num');
    if (num) num.textContent = `Câu ${i + 1}`;
  });
}

// ── Add new material (inline) ──
function addMaterial() {
  // FIX: Nếu đã có form mới đang chờ, scroll đến đó thay vì tạo thêm
  const existing = document.querySelector('#materials-list .material-new-form');
  if (existing) {
    existing.closest('.material-item').scrollIntoView({ behavior: 'smooth', block: 'center' });
    existing.closest('.material-item').style.outline = '2px solid var(--primary-500)';
    setTimeout(() => { existing.closest('.material-item').style.outline = ''; }, 1500);
    return;
  }
  const newId = 'new-' + Date.now();
  const html = `
    <div class="material-item" id="mat-${newId}">
      <div class="material-item-header" onclick="toggleMaterial(this)">
        <span class="drag-handle" onclick="event.stopPropagation()">⠿</span>
        <span class="material-item-title">📄 Tài liệu mới</span>
        <span class="material-toggle-icon">▾</span>
      </div>
      <div class="material-item-body">
        <form class="material-new-form">
          <div class="form-row-2" style="margin-bottom:12px;">
            <div class="form-group" style="margin:0;">
              <label>Tiêu Đề *</label>
              <input type="text" name="title" required placeholder="Ví dụ: Giới thiệu biến">
            </div>
            <div class="form-group" style="margin:0;">
              <label>Loại</label>
              <select name="material_type">
                <option value="document">📄 Tài liệu</option>
                <option value="code">💻 Code mẫu</option>
                <option value="exercise">📎 Bài tập</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label>Tải Lên File Tài Liệu <span style="color:var(--neutral-400);font-weight:400;">(PDF, Word, TXT, ảnh...)</span></label>
            <input type="file" class="file-upload-input" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.zip" style="width:100%;padding:8px;border:1.5px dashed var(--neutral-300);border-radius:10px;cursor:pointer;font-size:0.85rem;">
            <div class="file-upload-preview" style="margin-top:6px;font-size:0.8rem;color:var(--neutral-500);"></div>
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label>Hoặc nhập nội dung văn bản (Markdown)</label>
            <textarea name="content" rows="4" placeholder="Nội dung tài liệu..."></textarea>
          </div>
          <div class="material-item-footer">
            <button type="button" class="remove-btn" onclick="this.closest('.material-item').remove()">🗑 Xóa tài liệu</button>
            <button type="submit" class="btn-primary-sm">+ Thêm tài liệu</button>
          </div>
        </form>
      </div>
    </div>`;

  const list    = document.getElementById('materials-list');
  list.insertAdjacentHTML('beforeend', html);

  const newItem = list.lastElementChild;
  bindFileUpload(newItem); // bind file upload, delegation xử lý submit

  newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── File upload handler ──
// Lưu file object vào property của input để submit form đọc lại
function bindFileUpload(container) {
  const fileInput = container.querySelector('.file-upload-input');
  if (!fileInput) return;
  const preview  = container.querySelector('.file-upload-preview');

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) {
      fileInput._uploadedFile = null;
      if (preview) preview.textContent = '';
      return;
    }

    // Lưu file object để submit handler lấy sau
    fileInput._uploadedFile = file;
    if (preview) preview.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    // Chỉ đọc nội dung text vào textarea nếu là file text/markdown
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const textarea = container.querySelector('textarea[name="content"]');
      if (textarea) {
        const text = await file.text();
        textarea.value = text;
        textarea.dispatchEvent(new Event('input'));
      }
      if (preview) preview.textContent += ' ✅ Đã đọc nội dung';
    } else {
      // File nhị phân (PDF, ảnh...) — KHÔNG ghi vào textarea
      // submit handler sẽ đính kèm file trực tiếp vào FormData
      if (preview) preview.textContent += ' ✅ Sẵn sàng gửi lên';
    }
  });
}

// ── Add new exercise (inline) ──
// FIX: Dùng uid tăng dần để tạo radio name duy nhất cho mỗi câu hỏi mới,
// tránh các câu share chung radio group và bỏ chọn lẫn nhau.
let _exUid = 0;

function addExercise() {
  // Nếu đã có form mới đang chờ, scroll đến đó thay vì tạo thêm
  const existing = document.querySelector('#exercises-list .exercise-new-form');
  if (existing) {
    existing.closest('.exercise-item').scrollIntoView({ behavior: 'smooth', block: 'center' });
    existing.closest('.exercise-item').style.outline = '2px solid var(--brand-400)';
    setTimeout(() => { existing.closest('.exercise-item').style.outline = ''; }, 1500);
    return;
  }
  _exUid++;
  const uid       = _exUid;
  const displayN  = document.querySelectorAll('#exercises-list .exercise-item').length + 1;
  const radioName = 'correct_answer_new_' + uid; // unique per câu

  // FIX: Tách options ra khỏi template literal chính để tránh nested backtick bug
  const optionsHtml = ['A','B','C','D'].map(function(l) {
    const colors = { A: 'background:#dbeafe;color:#1d4ed8', B: 'background:#dcfce7;color:#166534', C: 'background:#fef9c3;color:#713f12', D: 'background:#fce7f3;color:#9d174d' };
    return '<div class="option-row">'
      + '<label class="option-label">'
      + '<input type="radio" class="correct-radio" name="' + radioName + '" value="' + l + '">'
      + '<span style="' + colors[l] + ';padding:2px 8px;border-radius:6px;font-size:0.8rem;">' + l + '</span>'
      + '</label>'
      + '<input type="text" name="option_' + l.toLowerCase() + '" placeholder="Đáp án ' + l + '...">'
      + '</div>';
  }).join('');

  const html = `
    <div class="exercise-item" id="ex-new-${uid}">
      <div class="exercise-item-header" onclick="toggleExercise(this)" style="cursor:pointer;user-select:none;">
        <span class="exercise-item-num">Câu ${displayN}</span>
        <span class="material-toggle-icon" style="margin-left:auto;">▾</span>
      </div>
      <form class="exercise-new-form" data-radio-name="${radioName}">
        <div class="form-group">
          <label>Câu Hỏi *</label>
          <textarea name="question" rows="2" required placeholder="Nhập câu hỏi..."></textarea>
        </div>
        <div style="margin-bottom:14px;">
          <label style="font-size:0.83rem;font-weight:600;color:var(--neutral-700);display:block;margin-bottom:8px;">Các Đáp Án</label>
          ${optionsHtml}
        </div>
        <div class="form-group">
          <label>Giải Thích (tùy chọn)</label>
          <textarea name="explanation" rows="2" placeholder="Tại sao đáp án đó đúng..."></textarea>
        </div>
        <div class="material-item-footer">
          <button type="button" class="remove-btn" onclick="this.closest('.exercise-item').remove();renumberExercises();">🗑 Xóa câu hỏi</button>
          <button type="submit" class="btn-primary-sm">+ Thêm câu hỏi</button>
        </div>
      </form>
    </div>`;

  const list = document.getElementById('exercises-list');
  list.insertAdjacentHTML('beforeend', html);

  // delegation xử lý submit — không bind gì thêm ở đây
  list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Bind nút thêm sau khi DOM load ──
// Guard: chỉ bind 1 lần, tránh script load lại gây double-click
const _btnMat = document.getElementById('btn-add-material');
if (_btnMat && !_btnMat._clickBound) { _btnMat._clickBound = true; _btnMat.addEventListener('click', addMaterial); }
const _btnEx = document.getElementById('btn-add-exercise');
if (_btnEx && !_btnEx._clickBound) { _btnEx._clickBound = true; _btnEx.addEventListener('click', addExercise); }

// Bind file upload cho các material có sẵn
document.querySelectorAll('.material-item').forEach(item => bindFileUpload(item));