from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, os, secrets
from functools import wraps
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'educonnect_secret_key_2024'
DB = 'elearning.db'

# ─── DB HELPERS ────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with open('database.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    conn = get_db()
    # Only run inserts if tables are empty
    conn.executescript(sql)
    conn.commit()
    conn.close()

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            flash('Vui lòng đăng nhập để tiếp tục.', 'warning')
            return redirect(url_for('trang_chu'))
        return f(*args, **kwargs)
    return decorated

def get_current_user():
    if 'user_id' in session:
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
        conn.close()
        return user
    return None

# ─── CONTEXT PROCESSOR ─────────────────────────────────────────────────────────
@app.context_processor
def inject_user():
    return {'current_user': get_current_user()}

# ─── TRANG CHỦ ─────────────────────────────────────────────────────────────────
@app.route('/')
def trang_chu():
    conn = get_db()
    featured_courses = conn.execute(
        'SELECT c.*, u.name as instructor_name, cat.name as category_name '
        'FROM courses c LEFT JOIN users u ON c.instructor_id=u.id '
        'LEFT JOIN categories cat ON c.category_id=cat.id '
        'WHERE c.is_featured=1 LIMIT 6'
    ).fetchall()
    stats = {
        'students': conn.execute('SELECT COUNT(*) FROM users').fetchone()[0] + 2847,
        'courses': conn.execute('SELECT COUNT(*) FROM courses').fetchone()[0],
        'lessons': conn.execute('SELECT SUM(total_lessons) FROM courses').fetchone()[0] or 0,
        'instructors': 3
    }
    reviews = conn.execute(
        'SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id=u.id ORDER BY r.created_at DESC LIMIT 6'
    ).fetchall()
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()
    return render_template('trang-chu.html', featured_courses=featured_courses, stats=stats, reviews=reviews, categories=categories)

# ─── TẤT CẢ KHÓA HỌC ───────────────────────────────────────────────────────────
@app.route('/khoa-hoc')
def tat_ca_khoa_hoc():
    q = request.args.get('q', '')
    category = request.args.get('category', '')
    price_filter = request.args.get('price', '')
    level = request.args.get('level', '')
    page = int(request.args.get('page', 1))
    per_page = 9

    conn = get_db()
    base_query = ('SELECT c.*, u.name as instructor_name, cat.name as category_name '
                  'FROM courses c LEFT JOIN users u ON c.instructor_id=u.id '
                  'LEFT JOIN categories cat ON c.category_id=cat.id WHERE 1=1')
    params = []

    if q:
        base_query += ' AND c.title LIKE ?'
        params.append(f'%{q}%')
    if category:
        base_query += ' AND cat.slug=?'
        params.append(category)
    if level:
        base_query += ' AND c.level=?'
        params.append(level)
    if price_filter == 'free':
        base_query += ' AND c.price=0'
    elif price_filter == 'paid':
        base_query += ' AND c.price>0'

    total = conn.execute(f'SELECT COUNT(*) FROM ({base_query})', params).fetchone()[0]
    courses = conn.execute(base_query + f' LIMIT {per_page} OFFSET {(page-1)*per_page}', params).fetchall()
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()

    total_pages = (total + per_page - 1) // per_page
    return render_template('tat-ca-khoa-hoc.html', courses=courses, categories=categories,
                           total=total, page=page, total_pages=total_pages,
                           q=q, selected_category=category, price_filter=price_filter, level=level)

# ─── TÌM KIẾM ──────────────────────────────────────────────────────────────────
@app.route('/search')
def search():
    q = request.args.get('q', '')
    conn = get_db()
    results = conn.execute(
        'SELECT c.*, u.name as instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id=u.id '
        'WHERE c.title LIKE ? LIMIT 5', (f'%{q}%',)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in results])

# ─── GIỚI THIỆU ────────────────────────────────────────────────────────────────
@app.route('/gioi-thieu')
def gioi_thieu():
    conn = get_db()
    instructors = conn.execute('SELECT * FROM users LIMIT 3').fetchall()
    conn.close()
    return render_template('gioi-thieu.html', instructors=instructors)

# ─── LIÊN HỆ ───────────────────────────────────────────────────────────────────
@app.route('/lien-he', methods=['GET', 'POST'])
def lien_he():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        message = request.form.get('message', '').strip()
        if name and email and message:
            conn = get_db()
            conn.execute('INSERT INTO contacts (name,email,message) VALUES (?,?,?)', (name, email, message))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.'})
        return jsonify({'success': False, 'message': 'Vui lòng điền đầy đủ thông tin.'})
    return render_template('lien-he.html')

# ─── AUTH ───────────────────────────────────────────────────────────────────────
@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        return jsonify({'success': True, 'message': f'Chào mừng {user["name"]}!'})
    return jsonify({'success': False, 'message': 'Email hoặc mật khẩu không đúng.'})

@app.route('/register', methods=['POST'])
def register():
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Vui lòng điền đầy đủ thông tin.'})
    conn = get_db()
    existing = conn.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'success': False, 'message': 'Email đã được sử dụng.'})
    hashed = generate_password_hash(password)
    conn.execute('INSERT INTO users (name,email,password) VALUES (?,?,?)', (name, email, hashed))
    conn.commit()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()
    session['user_id'] = user['id']
    session['user_name'] = user['name']
    return jsonify({'success': True, 'message': f'Đăng ký thành công! Chào mừng {name}!'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('trang_chu'))

# ─── QUÊN MẬT KHẨU ─────────────────────────────────────────────────────────────
@app.route('/quen-mat-khau', methods=['GET', 'POST'])
def quen_mat_khau():
    if request.method == 'POST':
        step = request.form.get('step')
        if step == '1':
            email = request.form.get('email', '').strip()
            conn = get_db()
            user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
            if not user:
                conn.close()
                return jsonify({'success': False, 'message': 'Email không tồn tại trong hệ thống.'})
            token = secrets.token_hex(4).upper()
            expires = datetime.now() + timedelta(minutes=15)
            conn.execute('INSERT INTO password_resets (email,token,expires_at) VALUES (?,?,?)',
                         (email, token, expires))
            conn.commit()
            conn.close()
            # In real app: send email. For demo, return token
            return jsonify({'success': True, 'message': f'Mã OTP đã gửi! (Demo: {token})', 'demo_token': token})
        elif step == '2':
            email = request.form.get('email', '').strip()
            token = request.form.get('token', '').strip().upper()
            conn = get_db()
            reset = conn.execute(
                'SELECT * FROM password_resets WHERE email=? AND token=? AND used=0 AND expires_at>?',
                (email, token, datetime.now())
            ).fetchone()
            conn.close()
            if not reset:
                return jsonify({'success': False, 'message': 'Mã OTP không hợp lệ hoặc đã hết hạn.'})
            return jsonify({'success': True, 'message': 'Xác thực thành công!'})
        elif step == '3':
            email = request.form.get('email', '').strip()
            new_password = request.form.get('new_password', '')
            conn = get_db()
            hashed = generate_password_hash(new_password)
            conn.execute('UPDATE users SET password=? WHERE email=?', (hashed, email))
            conn.execute('UPDATE password_resets SET used=1 WHERE email=?', (email,))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Đổi mật khẩu thành công!'})
    return render_template('quen-mat-khau.html')

# ─── TÀI KHOẢN ─────────────────────────────────────────────────────────────────
@app.route('/tai-khoan')
@login_required
def tai_khoan():
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
    enrolled_courses = conn.execute(
        'SELECT c.*, e.progress, e.enrolled_at, u.name as instructor_name '
        'FROM enrollments e JOIN courses c ON e.course_id=c.id '
        'LEFT JOIN users u ON c.instructor_id=u.id '
        'WHERE e.user_id=?', (session['user_id'],)
    ).fetchall()
    conn.close()
    return render_template('tai-khoan-cua-toi.html', user=user, enrolled_courses=enrolled_courses)

@app.route('/update-profile', methods=['POST'])
@login_required
def update_profile():
    name = request.form.get('name', '').strip()
    if name:
        conn = get_db()
        conn.execute('UPDATE users SET name=? WHERE id=?', (name, session['user_id']))
        conn.commit()
        conn.close()
        session['user_name'] = name
        return jsonify({'success': True, 'message': 'Cập nhật thành công!'})
    return jsonify({'success': False, 'message': 'Tên không hợp lệ.'})

@app.route('/enroll/<int:course_id>', methods=['POST'])
@login_required
def enroll(course_id):
    conn = get_db()
    existing = conn.execute('SELECT * FROM enrollments WHERE user_id=? AND course_id=?',
                            (session['user_id'], course_id)).fetchone()
    if existing:
        conn.close()
        return jsonify({'success': False, 'message': 'Bạn đã đăng ký khóa học này rồi.'})
    conn.execute('INSERT INTO enrollments (user_id,course_id) VALUES (?,?)',
                 (session['user_id'], course_id))
    conn.execute('UPDATE courses SET total_students=total_students+1 WHERE id=?', (course_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Đăng ký thành công!'})

# ─── MAIN ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if not os.path.exists(DB):
        init_db()
    app.run(debug=True, port=5000)
