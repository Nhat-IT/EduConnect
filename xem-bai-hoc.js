// ═══ XEM BÀI HỌC JS ═══

// ── Render Markdown đơn giản ──
function renderMarkdown(text) {
  if (!text) return '<p style="color:var(--neutral-400);font-style:italic;">Không có nội dung.</p>';
  let html = text
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;').trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Tables (simple)
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.includes('---')) return '';
      const cells = line.slice(1,-1).split('|').map(c => c.trim());
      const isHeader = false;
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    })
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap li items in ul
  html = html.replace(/(<li>.*?<\/li>)+/gs, m => `<ul>${m}</ul>`);
  // Wrap tr items in table
  html = html.replace(/(<tr>.*?<\/tr>)+/gs, m => `<table>${m}</table>`);

  return `<p>${html}</p>`;
}

// ── Render all materials ──
document.querySelectorAll('.material-content').forEach(el => {
  const content = el.dataset.content;
  const body = el.querySelector('.rendered-content');
  if (body) body.innerHTML = renderMarkdown(content);
});

// ── Toggle material expand/collapse ──
function toggleMaterial(btn) {
  const content = btn.closest('.material-card').querySelector('.material-content');
  btn.classList.toggle('collapsed');
  content.classList.toggle('hidden');
}

// Make headers clickable to toggle
document.querySelectorAll('.material-card-header').forEach(header => {
  header.addEventListener('click', (e) => {
    if (e.target.closest('.material-collapse-btn')) return;
    const btn = header.querySelector('.material-collapse-btn');
    if (btn) btn.click();
  });
});

// ── Lesson tab switching ──
function switchLessonTab(tab, btn) {
  document.querySelectorAll('.ltab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ltab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`ltab-${tab}`)?.classList.add('active');
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
  totalQuestions = document.querySelectorAll('.exercise-card').length;

  // Reset all cards
  document.querySelectorAll('.exercise-card').forEach(card => {
    card.classList.remove('answered-correct','answered-wrong');
    card.querySelectorAll('.ex-opt').forEach(opt => {
      opt.disabled = false;
      opt.classList.remove('correct','wrong');
    });
    const id = card.id.replace('ex-','');
    document.getElementById(`ex-status-${id}`).textContent = '';
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

  // Disable all options
  card.querySelectorAll('.ex-opt').forEach(opt => {
    opt.disabled = true;
    if (opt.dataset.letter === correct) opt.classList.add('correct');
    if (opt.dataset.letter === letter && !isCorrect) opt.classList.add('wrong');
  });

  // Show status
  const statusEl = document.getElementById(`ex-status-${exId}`);
  if (statusEl) {
    statusEl.textContent = isCorrect ? '✅ Đúng!' : '❌ Sai';
    statusEl.style.color = isCorrect ? '#10b981' : '#ef4444';
  }

  // Show explanation
  document.getElementById(`ex-exp-${exId}`)?.classList.remove('hidden');

  // Card highlight
  card.classList.add(isCorrect ? 'answered-correct' : 'answered-wrong');

  // Record answer
  answers[exId] = isCorrect;

  // Check if all answered
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

const NOTE_KEY = `edu_note_lesson_${typeof LESSON_ID !== 'undefined' ? LESSON_ID : '0'}`;

// Load saved note
const noteArea = document.getElementById('lesson-note');
if (noteArea) {
  try { noteArea.value = localStorage.getItem(NOTE_KEY) || ''; } catch (e) {}
  // Auto-save on input
  noteArea.addEventListener('input', () => {
    try { localStorage.setItem(NOTE_KEY, noteArea.value); } catch (e) {}
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

// ── Mark complete ──
function markComplete() {
  showToast('✅ Đã đánh dấu hoàn thành bài học!', 'success');
  document.querySelector('.complete-btn').textContent = '✅ Đã Hoàn Thành';
  document.querySelector('.complete-btn').style.background = '#059669';
}
