/* ===== Trang Chỉnh Sửa Khóa Học ===== */
/* COURSE_ID được khai báo trong template trước khi nạp file này. */

(function () {
  'use strict';

  // --------- Helpers ---------
  function $(id) { return document.getElementById(id); }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // showFormMsg / showToast được định nghĩa ở layout.html.
  // Nếu chưa có, fallback nhẹ để không vỡ trang.
  if (typeof window.showFormMsg !== 'function') {
    window.showFormMsg = function (id, msg, kind) {
      var el = $(id);
      if (el) el.innerHTML = '<div class="form-message ' + (kind || '') + '">' + escHtml(msg) + '</div>';
    };
  }
  if (typeof window.showToast !== 'function') {
    window.showToast = function (msg) { console.log('[toast]', msg); };
  }

  // Đọc body trả về: ưu tiên JSON, fallback text để bắt lỗi server (HTML 500…).
  async function readResponse(res) {
    var text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch (_) {
      return {
        ok: res.ok,
        status: res.status,
        data: {
          success: false,
          message: res.ok
            ? 'Server trả về dữ liệu không hợp lệ.'
            : 'Server lỗi (' + res.status + '). ' + (text ? text.slice(0, 200) : ''),
        },
      };
    }
  }

  // --------- Trạng thái lưu ---------
  function markUnsaved() {
    var dot = $('save-dot'), txt = $('save-status');
    if (dot) dot.className = 'save-dot unsaved';
    if (txt) txt.textContent = 'Có thay đổi chưa lưu';
  }
  function markSaved() {
    var dot = $('save-dot'), txt = $('save-status');
    if (dot) dot.className = 'save-dot saved';
    if (txt) txt.textContent = 'Đã lưu';
  }

  // --------- Toggle section ---------
  window.toggleSection = function (name) {
    var sec = $('section-' + name);
    if (sec) sec.classList.toggle('collapsed');
  };

  // --------- Ảnh bìa: preview ---------
  window.previewThumb = function (input) {
    if (!input.files || !input.files[0]) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = $('thumb-preview-img');
      var wrap = $('thumb-preview-wrap');
      if (img) img.src = e.target.result;
      if (wrap) wrap.style.display = 'block';
      var urlInput = $('thumb-url-input');
      if (urlInput) urlInput.value = '';
    };
    reader.readAsDataURL(input.files[0]);
  };

  window.previewThumbUrl = function (val) {
    var wrap = $('thumb-preview-wrap');
    var img = $('thumb-preview-img');
    if (!val) { if (wrap) wrap.style.display = 'none'; return; }
    if (!img || !wrap) return;
    img.src = val;
    img.onerror = function () { wrap.style.display = 'none'; };
    img.onload  = function () { wrap.style.display = 'block'; };
    var fileInput = $('thumb-file-input');
    if (fileInput) fileInput.value = '';
  };

  // --------- Cập nhật ảnh bìa hiện tại sau khi lưu ---------
  function updateCurrentThumb(thumbUrl) {
    if (!thumbUrl) return;
    var cur = $('current-thumb');
    if (cur) {
      var img = cur.querySelector('img');
      if (img) img.src = thumbUrl;
    } else {
      var wrap = document.createElement('div');
      wrap.id = 'current-thumb';
      wrap.className = 'thumb-current';
      wrap.innerHTML =
        '<img src="' + escHtml(thumbUrl) + '" alt="Ảnh bìa hiện tại">' +
        '<div class="thumb-caption">Ảnh bìa hiện tại</div>';
      var fileInput = $('thumb-file-input');
      if (fileInput) {
        var formGroup = fileInput.closest('.form-group');
        if (formGroup) formGroup.prepend(wrap);
      }
    }
    var prevWrap = $('thumb-preview-wrap');
    var fileInput2 = $('thumb-file-input');
    if (prevWrap) prevWrap.style.display = 'none';
    if (fileInput2) fileInput2.value = '';
  }

  // --------- Submit form thông tin khóa học ---------
  function bindBasicForm() {
    var form = $('course-basic-form');
    if (!form) return;

    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('input', markUnsaved);
      el.addEventListener('change', markUnsaved);
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.textContent = '⏳ Đang lưu...'; btn.disabled = true; }

      try {
        var res = await fetch('/cap-nhat-khoa-hoc/' + COURSE_ID, {
          method: 'POST',
          body: new FormData(form),
        });
        var parsed = await readResponse(res);
        var data = parsed.data || {};

        showFormMsg(
          'course-basic-msg',
          data.message || (parsed.ok ? 'Đã lưu.' : 'Có lỗi xảy ra.'),
          data.success ? 'success' : 'error'
        );

        if (data.success) {
          showToast('Đã lưu khóa học!', 'success');
          markSaved();
          if (data.thumbnail) updateCurrentThumb(data.thumbnail);
        }
      } catch (err) {
        console.error('Lỗi khi lưu khóa học:', err);
        showFormMsg('course-basic-msg',
          'Không kết nối được tới server. Kiểm tra kết nối mạng hoặc thử lại.',
          'error');
      } finally {
        if (btn) { btn.textContent = orig; btn.disabled = false; }
      }
    });
  }

  // --------- Thêm bài học ---------
  window.openAddLessonForm = function () {
    var f = $('add-lesson-form'); if (f) f.classList.add('open');
    var b = $('btn-open-add-lesson'); if (b) b.style.display = 'none';
    var t = $('new-lesson-title'); if (t) t.focus();
  };

  window.closeAddLessonForm = function () {
    var f = $('add-lesson-form'); if (f) f.classList.remove('open');
    var b = $('btn-open-add-lesson'); if (b) b.style.display = '';
    ['new-lesson-title', 'new-lesson-duration', 'new-lesson-video'].forEach(function (id) {
      var el = $(id); if (el) el.value = '';
    });
    var fr = $('new-lesson-free'); if (fr) fr.checked = false;
    var msg = $('add-lesson-msg'); if (msg) msg.innerHTML = '';
  };

  window.submitAddLesson = async function () {
    var titleEl = $('new-lesson-title');
    var title = titleEl ? titleEl.value.trim() : '';
    if (!title) {
      showFormMsg('add-lesson-msg', 'Vui lòng nhập tiêu đề bài học.', 'error');
      return;
    }
    var btn = document.querySelector('#add-lesson-form .btn-primary');
    var orig = btn ? btn.textContent : '';
    if (btn) { btn.textContent = '⏳ Đang thêm...'; btn.disabled = true; }

    var fd = new URLSearchParams();
    fd.append('course_id', COURSE_ID);
    fd.append('title', title);
    fd.append('order_num', ($('new-lesson-order') || {}).value || 1);
    fd.append('duration_minutes', ($('new-lesson-duration') || {}).value || '');
    fd.append('video_url', (($('new-lesson-video') || {}).value || '').trim());
    fd.append('is_free', ($('new-lesson-free') && $('new-lesson-free').checked) ? '1' : '');

    try {
      var res = await fetch('/them-bai-hoc', { method: 'POST', body: fd });
      var parsed = await readResponse(res);
      var data = parsed.data || {};

      if (data.success) {
        showToast('Đã thêm bài học!', 'success');
        var emptyEl = $('empty-lessons');
        if (emptyEl) emptyEl.remove();
        var list = $('lesson-list');
        var order = ($('new-lesson-order') || {}).value || 1;
        var dur = ($('new-lesson-duration') || {}).value;
        var isFree = $('new-lesson-free') && $('new-lesson-free').checked;

        var metaParts = [];
        if (dur) metaParts.push('⏱ ' + escHtml(dur) + ' phút');
        if (isFree) metaParts.push('<span class="free-tag">Miễn phí</span>');
        var metaHtml = metaParts.join(' · ');

        list.insertAdjacentHTML('beforeend',
          '<div class="lesson-item" id="lesson-row-' + data.lesson_id + '">' +
            '<span class="lesson-order">' + escHtml(order) + '</span>' +
            '<div class="lesson-info">' +
              '<div class="lesson-title">' + escHtml(title) + '</div>' +
              '<div class="lesson-meta">' + metaHtml + '</div>' +
            '</div>' +
            '<div class="lesson-actions">' +
              '<a href="/chinh-sua-bai-hoc/' + data.lesson_id + '" class="btn-outline-sm">✏️ Sửa</a>' +
              '<button class="btn-outline-sm btn-delete" data-lesson-id="' + data.lesson_id +
                '" data-lesson-title="' + escHtml(title) + '">🗑</button>' +
            '</div>' +
          '</div>');

        var orderInput = $('new-lesson-order');
        if (orderInput) orderInput.value = parseInt(order, 10) + 1;
        closeAddLessonForm();
      } else {
        showFormMsg('add-lesson-msg', data.message || 'Không thêm được bài học.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi thêm bài học:', err);
      showFormMsg('add-lesson-msg', 'Không kết nối được tới server.', 'error');
    } finally {
      if (btn) { btn.textContent = orig; btn.disabled = false; }
    }
  };

  // --------- Xóa bài học ---------
  window.deleteLesson = async function (id, title) {
    if (!confirm('Xóa bài học "' + title + '"? Tất cả tài liệu và bài tập sẽ bị xóa theo.')) return;
    try {
      var res = await fetch('/xoa-bai-hoc/' + id, { method: 'POST' });
      var parsed = await readResponse(res);
      var data = parsed.data || {};
      if (data.success) {
        var row = $('lesson-row-' + id);
        if (row) row.remove();
        showToast('Đã xóa bài học!', 'success');
        if (!document.querySelector('#lesson-list .lesson-item')) {
          $('lesson-list').innerHTML =
            '<div id="empty-lessons" class="empty-lessons">' +
            'Chưa có bài học nào. Hãy thêm bài học đầu tiên!</div>';
        }
      } else {
        showToast(data.message || 'Không xóa được.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi xóa bài học:', err);
      showToast('Không kết nối được tới server.', 'error');
    }
  };

  // Bắt sự kiện click cho nút xóa (event delegation)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.lesson-actions .btn-delete');
    if (!btn) return;
    var id = btn.getAttribute('data-lesson-id');
    var title = btn.getAttribute('data-lesson-title') || '';
    if (id) deleteLesson(id, title);
  });

  // --------- Khởi tạo ---------
  document.addEventListener('DOMContentLoaded', bindBasicForm);
})();