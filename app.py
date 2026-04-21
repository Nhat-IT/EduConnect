from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, os, secrets, re
from functools import wraps
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'educonnect_secret_key_2024'
DB = 'elearning.db'

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with open('database.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    conn = get_db()
    conn.executescript(sql)
    conn.commit()
    conn.close()

def update_db_schema():
    conn = get_db()
    try:
        conn.execute('ALTER TABLE courses ADD COLUMN is_locked INTEGER DEFAULT 0')
    except: pass
    try:
        conn.execute('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0')
    except: pass

    conn.execute('''CREATE TABLE IF NOT EXISTS password_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
    )''')

    conn.execute('''CREATE TABLE IF NOT EXISTS course_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        course_title TEXT,
        reporter_email TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
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

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('admin_login'))
        conn = get_db()
        user = conn.execute('SELECT is_admin FROM users WHERE id=?', (session['user_id'],)).fetchone()
        conn.close()
        if not user or not user['is_admin']:
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated

def get_current_user():
    if 'user_id' in session:
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
        conn.close()
        return user
    return None

@app.context_processor
def inject_user():
    return {'current_user': get_current_user()}

@app.context_processor
def admin_helpers():
    def get_contact_count():
        try:
            conn = get_db()
            n = conn.execute('SELECT COUNT(*) FROM contacts').fetchone()[0]
            conn.close()
            return n
        except:
            return 0
            
    def get_pending_approvals_count():
        try:
            conn = get_db()
            count_pw = conn.execute('SELECT COUNT(*) FROM password_requests WHERE status="pending"').fetchone()[0]
            count_rp = conn.execute('SELECT COUNT(*) FROM course_reports').fetchone()[0]
            conn.close()
            return count_pw + count_rp
        except:
            return 0
            
    return {
        'get_contact_count': get_contact_count,
        'get_pending_approvals_count': get_pending_approvals_count
    }

# ══════════════════════════════════════════════════════════════════════
#  PUBLIC ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.route('/')
def trang_chu():
    conn = get_db()
    featured_courses = conn.execute(
        'SELECT c.*, u.name as instructor_name, cat.name as category_name '
        'FROM courses c LEFT JOIN users u ON c.instructor_id=u.id '
        'LEFT JOIN categories cat ON c.category_id=cat.id '
        'WHERE c.is_featured=1 AND (c.is_locked=0 OR c.is_locked IS NULL) LIMIT 6'
    ).fetchall()
    stats = {
        'students': conn.execute('SELECT COUNT(*) FROM users WHERE is_admin=0').fetchone()[0] + 2847,
        'courses':  conn.execute('SELECT COUNT(*) FROM courses WHERE (is_locked=0 OR is_locked IS NULL)').fetchone()[0],
        'lessons':  conn.execute('SELECT COALESCE(SUM(total_lessons),0) FROM courses').fetchone()[0],
        'instructors': 3
    }
    reviews  = conn.execute('SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id=u.id ORDER BY r.created_at DESC LIMIT 6').fetchall()
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()
    return render_template('trang-chu.html', featured_courses=featured_courses, stats=stats, reviews=reviews, categories=categories)

@app.route('/khoa-hoc')
def tat_ca_khoa_hoc():
    q = request.args.get('q', '')
    category = request.args.get('category', '')
    price_filter = request.args.get('price', '')
    level = request.args.get('level', '')
    page = int(request.args.get('page', 1))
    per_page = 9
    conn = get_db()
    base = ('SELECT c.*, u.name as instructor_name, cat.name as category_name '
            'FROM courses c LEFT JOIN users u ON c.instructor_id=u.id '
            'LEFT JOIN categories cat ON c.category_id=cat.id WHERE (c.is_locked=0 OR c.is_locked IS NULL)')
    params = []
    if q:        base += ' AND c.title LIKE ?'; params.append(f'%{q}%')
    if category: base += ' AND cat.slug=?';     params.append(category)
    if level:    base += ' AND c.level=?';      params.append(level)
    if price_filter == 'free': base += ' AND c.price=0'
    elif price_filter == 'paid': base += ' AND c.price>0'
    total   = conn.execute(f'SELECT COUNT(*) FROM ({base})', params).fetchone()[0]
    courses = conn.execute(base + f' ORDER BY c.id DESC LIMIT {per_page} OFFSET {(page-1)*per_page}', params).fetchall()
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()
    return render_template('tat-ca-khoa-hoc.html', courses=courses, categories=categories,
                           total=total, page=page, total_pages=(total+per_page-1)//per_page,
                           q=q, selected_category=category, price_filter=price_filter, level=level)

@app.route('/search')
def search():
    q = request.args.get('q', '')
    conn = get_db()
    results = conn.execute(
        'SELECT c.*, u.name as instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id=u.id WHERE c.title LIKE ? AND (c.is_locked=0 OR c.is_locked IS NULL) LIMIT 5',
        (f'%{q}%',)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in results])

@app.route('/gioi-thieu')
def gioi_thieu():
    conn = get_db()
    instructors = conn.execute('SELECT * FROM users WHERE is_admin=0 LIMIT 3').fetchall()
    conn.close()
    return render_template('gioi-thieu.html', instructors=instructors)

@app.route('/lien-he', methods=['GET','POST'])
def lien_he():
    if request.method == 'POST':
        name = request.form.get('name','').strip()
        email = request.form.get('email','').strip()
        message = request.form.get('message','').strip()
        if name and email and message:
            conn = get_db()
            conn.execute('INSERT INTO contacts (name,email,message) VALUES (?,?,?)', (name, email, message))
            conn.commit(); conn.close()
            return jsonify({'success': True, 'message': 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.'})
        return jsonify({'success': False, 'message': 'Vui lòng điền đầy đủ thông tin.'})
    return render_template('lien-he.html')

@app.route('/login', methods=['POST'])
def login():
    email    = request.form.get('email','').strip()
    password = request.form.get('password','')
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], password):
        try:
            if user['is_locked'] == 1:
                return jsonify({'success': False, 'message': 'Tài khoản của bạn đã bị khóa.'})
        except: pass
        session['user_id']  = user['id']
        session['user_name'] = user['name']
        return jsonify({'success': True, 'message': f'Chào mừng {user["name"]}!', 'is_admin': bool(user['is_admin'])})
    return jsonify({'success': False, 'message': 'Email hoặc mật khẩu không đúng.'})

@app.route('/register', methods=['POST'])
def register():
    name     = request.form.get('name','').strip()
    email    = request.form.get('email','').strip()
    password = request.form.get('password','')
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Vui lòng điền đầy đủ thông tin.'})
    conn = get_db()
    if conn.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone():
        conn.close()
        return jsonify({'success': False, 'message': 'Email đã được sử dụng.'})
    conn.execute('INSERT INTO users (name,email,password) VALUES (?,?,?)', (name, email, generate_password_hash(password)))
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

@app.route('/quen-mat-khau', methods=['GET','POST'])
def quen_mat_khau():
    if request.method == 'POST':
        step = request.form.get('step')
        conn = get_db()
        if step == '1':
            email = request.form.get('email','').strip()
            if not conn.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone():
                conn.close(); return jsonify({'success': False, 'message': 'Email không tồn tại.'})
            token = secrets.token_hex(4).upper()
            conn.execute('INSERT INTO password_resets (email,token,expires_at) VALUES (?,?,?)',
                         (email, token, datetime.now()+timedelta(minutes=15)))
            conn.execute('INSERT INTO password_requests (email) VALUES (?)', (email,))
            conn.commit(); conn.close()
            return jsonify({'success': True, 'message': f'Yêu cầu của bạn đã được gửi cho Quản trị viên chờ phê duyệt.', 'demo_token': token})
        elif step == '2':
            email = request.form.get('email','').strip()
            token = request.form.get('token','').strip().upper()
            reset = conn.execute('SELECT * FROM password_resets WHERE email=? AND token=? AND used=0 AND expires_at>?',
                                 (email, token, datetime.now())).fetchone()
            conn.close()
            if not reset: return jsonify({'success': False, 'message': 'Mã OTP không hợp lệ hoặc hết hạn.'})
            return jsonify({'success': True, 'message': 'Xác thực thành công!'})
        elif step == '3':
            email        = request.form.get('email','').strip()
            new_password = request.form.get('new_password','')
            conn.execute('UPDATE users SET password=? WHERE email=?', (generate_password_hash(new_password), email))
            conn.execute('UPDATE password_resets SET used=1 WHERE email=?', (email,))
            conn.commit(); conn.close()
            return jsonify({'success': True, 'message': 'Đổi mật khẩu thành công!'})
    return render_template('quen-mat-khau.html')

@app.route('/tai-khoan')
@login_required
def tai_khoan():
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
    enrolled = conn.execute(
        'SELECT c.*, e.progress, e.enrolled_at, u.name as instructor_name '
        'FROM enrollments e JOIN courses c ON e.course_id=c.id '
        'LEFT JOIN users u ON c.instructor_id=u.id WHERE e.user_id=?', (session['user_id'],)
    ).fetchall()
    conn.close()
    return render_template('tai-khoan-cua-toi.html', user=user, enrolled_courses=enrolled)

@app.route('/update-profile', methods=['POST'])
@login_required
def update_profile():
    name = request.form.get('name','').strip()
    if name:
        conn = get_db()
        conn.execute('UPDATE users SET name=? WHERE id=?', (name, session['user_id']))
        conn.commit(); conn.close()
        session['user_name'] = name
        return jsonify({'success': True, 'message': 'Cập nhật thành công!'})
    return jsonify({'success': False, 'message': 'Tên không hợp lệ.'})

@app.route('/enroll/<int:course_id>', methods=['POST'])
@login_required
def enroll(course_id):
    conn = get_db()
    if conn.execute('SELECT id FROM enrollments WHERE user_id=? AND course_id=?',
                    (session['user_id'], course_id)).fetchone():
        conn.close(); return jsonify({'success': False, 'message': 'Bạn đã đăng ký khóa học này rồi.'})
    conn.execute('INSERT INTO enrollments (user_id,course_id) VALUES (?,?)', (session['user_id'], course_id))
    conn.execute('UPDATE courses SET total_students=total_students+1 WHERE id=?', (course_id,))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Đăng ký thành công!'})

# ══════════════════════════════════════════════════════════════════════
#  ADMIN ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.route('/admin/login', methods=['GET','POST'])
def admin_login():
    if request.method == 'POST':
        email    = request.form.get('email','').strip()
        password = request.form.get('password','')
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email=? AND is_admin=1', (email,)).fetchone()
        conn.close()
        if user and check_password_hash(user['password'], password):
            session['user_id']  = user['id']
            session['user_name'] = user['name']
            session['is_admin'] = True
            return redirect(url_for('admin_dashboard'))
        flash('Sai thông tin đăng nhập admin.', 'error')
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    return redirect(url_for('admin_login'))

@app.route('/admin')
@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    conn = get_db()
    stats = {
        'total_users':    conn.execute('SELECT COUNT(*) FROM users WHERE is_admin=0').fetchone()[0],
        'total_courses':  conn.execute('SELECT COUNT(*) FROM courses').fetchone()[0],
        'total_enrolls':  conn.execute('SELECT COUNT(*) FROM enrollments').fetchone()[0],
        'total_revenue':  conn.execute('SELECT COALESCE(SUM(c.price),0) FROM enrollments e JOIN courses c ON e.course_id=c.id').fetchone()[0],
        'total_contacts': conn.execute('SELECT COUNT(*) FROM contacts').fetchone()[0],
        'new_users_week': conn.execute("SELECT COUNT(*) FROM users WHERE created_at>=datetime('now','-7 days') AND is_admin=0").fetchone()[0],
    }
    recent_enrolls = conn.execute(
        'SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title, c.price '
        'FROM enrollments e JOIN users u ON e.user_id=u.id JOIN courses c ON e.course_id=c.id '
        'ORDER BY e.enrolled_at DESC LIMIT 8'
    ).fetchall()
    top_courses = conn.execute(
        'SELECT c.*, cat.name as category_name, u.name as instructor_name '
        'FROM courses c LEFT JOIN categories cat ON c.category_id=cat.id '
        'LEFT JOIN users u ON c.instructor_id=u.id ORDER BY c.total_students DESC LIMIT 5'
    ).fetchall()
    monthly = conn.execute(
        "SELECT strftime('%Y-%m',enrolled_at) as month, COUNT(*) as count "
        "FROM enrollments GROUP BY month ORDER BY month DESC LIMIT 6"
    ).fetchall()
    conn.close()
    return render_template('admin/dashboard.html', stats=stats, recent_enrolls=recent_enrolls,
                           top_courses=top_courses, monthly=list(reversed(monthly)))

# ── Categories CRUD (Đã Bổ Sung) ───────────────────────────────────────────────
@app.route('/admin/categories')
@admin_required
def admin_categories():
    conn = get_db()
    categories = conn.execute('''
        SELECT c.*, (SELECT COUNT(*) FROM courses WHERE category_id=c.id) as course_count 
        FROM categories c
    ''').fetchall()
    conn.close()
    return render_template('admin/categories.html', categories=categories)

@app.route('/admin/categories/add', methods=['POST'])
@admin_required
def admin_add_category():
    name = request.form.get('name', '').strip()
    slug = request.form.get('slug', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Vui lòng nhập tên danh mục.'})
    if not slug: 
        import unicodedata
        slug = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('utf-8').lower().replace(' ', '-')
        
    conn = get_db()
    try:
        conn.execute('INSERT INTO categories (name, slug) VALUES (?, ?)', (name, slug))
        conn.commit()
        msg, success = 'Đã thêm danh mục mới!', True
    except sqlite3.IntegrityError:
        msg, success = 'Tên hoặc slug đã tồn tại!', False
    conn.close()
    return jsonify({'success': success, 'message': msg})

@app.route('/admin/categories/edit/<int:cid>', methods=['POST'])
@admin_required
def admin_edit_category(cid):
    name = request.form.get('name', '').strip()
    slug = request.form.get('slug', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Tên không được để trống.'})
    conn = get_db()
    try:
        if slug:
            conn.execute('UPDATE categories SET name=?, slug=? WHERE id=?', (name, slug, cid))
        else:
            conn.execute('UPDATE categories SET name=? WHERE id=?', (name, cid))
        conn.commit()
        msg, success = 'Cập nhật thành công!', True
    except:
        msg, success = 'Lỗi cập nhật hoặc trùng slug!', False
    conn.close()
    return jsonify({'success': success, 'message': msg})

@app.route('/admin/categories/delete/<int:cid>', methods=['POST'])
@admin_required
def admin_delete_category(cid):
    conn = get_db()
    courses_count = conn.execute('SELECT COUNT(*) FROM courses WHERE category_id=?', (cid,)).fetchone()[0]
    if courses_count > 0:
        conn.close()
        return jsonify({'success': False, 'message': f'Không thể xóa vì còn {courses_count} khóa học trong danh mục này.'})
    
    conn.execute('DELETE FROM categories WHERE id=?', (cid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Đã xóa danh mục!'})

# ── Courses CRUD ───────────────────────────────────────────────────────────────
@app.route('/admin/courses')
@admin_required
def admin_courses():
    q       = request.args.get('q','')
    page    = int(request.args.get('page',1))
    per_page = 10
    conn    = get_db()
    base    = ('SELECT c.*, cat.name as category_name, u.name as instructor_name '
               'FROM courses c LEFT JOIN categories cat ON c.category_id=cat.id '
               'LEFT JOIN users u ON c.instructor_id=u.id WHERE 1=1')
    params  = []
    if q: base += ' AND c.title LIKE ?'; params.append(f'%{q}%')
    total   = conn.execute(f'SELECT COUNT(*) FROM ({base})', params).fetchone()[0]
    courses = conn.execute(base+f' ORDER BY c.id DESC LIMIT {per_page} OFFSET {(page-1)*per_page}', params).fetchall()
    categories  = conn.execute('SELECT * FROM categories').fetchall()
    instructors = conn.execute('SELECT id,name FROM users WHERE is_admin=0').fetchall()
    conn.close()
    return render_template('admin/courses.html', courses=courses, categories=categories,
                           instructors=instructors, total=total, page=page,
                           total_pages=(total+per_page-1)//per_page, q=q)

@app.route('/admin/courses/get/<int:cid>')
@admin_required
def admin_get_course(cid):
    conn = get_db()
    c = conn.execute('SELECT * FROM courses WHERE id=?',(cid,)).fetchone()
    conn.close()
    return jsonify(dict(c)) if c else (jsonify({'error':'Not found'}),404)

@app.route('/admin/courses/lock/<int:cid>', methods=['POST'])
@admin_required
def admin_lock_course(cid):
    conn = get_db()
    course = conn.execute('SELECT is_locked FROM courses WHERE id=?', (cid,)).fetchone()
    if not course:
        return jsonify({'success': False, 'message': 'Không tìm thấy khóa học'})
    
    try:
        new_state = 1 if course['is_locked'] == 0 else 0
    except:
        new_state = 1
        
    conn.execute('UPDATE courses SET is_locked=? WHERE id=?', (new_state, cid))
    conn.commit()
    conn.close()
    msg = "Đã khóa khóa học!" if new_state == 1 else "Đã mở khóa khóa học!"
    return jsonify({'success': True, 'message': msg})

@app.route('/admin/courses/delete/<int:cid>', methods=['POST'])
@admin_required
def admin_delete_course(cid):
    conn = get_db()
    conn.execute('DELETE FROM enrollments WHERE course_id=?',(cid,))
    conn.execute('DELETE FROM lessons WHERE course_id=?',(cid,))
    conn.execute('DELETE FROM reviews WHERE course_id=?',(cid,))
    conn.execute('DELETE FROM courses WHERE id=?',(cid,))
    conn.commit(); conn.close()
    return jsonify({'success':True,'message':'Đã xóa khóa học!'})

# ── Users CRUD ─────────────────────────────────────────────────────────────────
@app.route('/admin/users')
@admin_required
def admin_users():
    q       = request.args.get('q','')
    page    = int(request.args.get('page',1))
    per_page = 12
    conn    = get_db()
    base    = 'SELECT u.*, COUNT(e.id) as enroll_count FROM users u LEFT JOIN enrollments e ON u.id=e.user_id WHERE u.is_admin=0'
    params  = []
    if q: base += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.extend([f'%{q}%',f'%{q}%'])
    base   += ' GROUP BY u.id'
    total   = conn.execute(f'SELECT COUNT(*) FROM ({base})',params).fetchone()[0]
    users   = conn.execute(base+f' ORDER BY u.id DESC LIMIT {per_page} OFFSET {(page-1)*per_page}',params).fetchall()
    conn.close()
    return render_template('admin/users.html', users=users, total=total, page=page,
                           total_pages=(total+per_page-1)//per_page, q=q)

@app.route('/admin/users/get/<int:uid>')
@admin_required
def admin_get_user(uid):
    conn = get_db()
    user   = conn.execute('SELECT id,name,email,created_at FROM users WHERE id=?',(uid,)).fetchone()
    enrolls= conn.execute('SELECT c.title,e.enrolled_at,e.progress FROM enrollments e JOIN courses c ON e.course_id=c.id WHERE e.user_id=?',(uid,)).fetchall()
    conn.close()
    return jsonify({'user':dict(user),'enrollments':[dict(e) for e in enrolls]}) if user else (jsonify({'error':'Not found'}),404)

@app.route('/admin/users/lock/<int:uid>', methods=['POST'])
@admin_required
def admin_lock_user(uid):
    conn = get_db()
    user = conn.execute('SELECT is_locked FROM users WHERE id=?', (uid,)).fetchone()
    if not user:
        return jsonify({'success': False, 'message': 'Không tìm thấy người dùng'})
    
    try:
        new_state = 1 if user['is_locked'] == 0 else 0
    except:
        new_state = 1
        
    conn.execute('UPDATE users SET is_locked=? WHERE id=?', (new_state, uid))
    conn.commit()
    conn.close()
    msg = "Đã khóa tài khoản học viên!" if new_state == 1 else "Đã mở khóa tài khoản!"
    return jsonify({'success': True, 'message': msg})

@app.route('/admin/users/delete/<int:uid>', methods=['POST'])
@admin_required
def admin_delete_user(uid):
    conn = get_db()
    conn.execute('DELETE FROM enrollments WHERE user_id=?',(uid,))
    conn.execute('DELETE FROM reviews WHERE user_id=?',(uid,))
    conn.execute('DELETE FROM users WHERE id=? AND is_admin=0',(uid,))
    conn.commit(); conn.close()
    return jsonify({'success':True,'message':'Đã xóa học viên!'})

# ── Approvals (Xét Duyệt & Báo Cáo) ──────────────────────────────────────────────
@app.route('/admin/approvals')
@admin_required
def admin_approvals():
    conn = get_db()
    pw_requests = conn.execute('SELECT * FROM password_requests WHERE status="pending" ORDER BY created_at DESC').fetchall()
    course_reports = conn.execute('SELECT * FROM course_reports ORDER BY created_at DESC').fetchall()
    conn.close()
    return render_template('admin/approvals.html', pw_requests=pw_requests, course_reports=course_reports)

@app.route('/admin/approvals/password/approve/<int:rid>', methods=['POST'])
@admin_required
def approve_password(rid):
    conn = get_db()
    req = conn.execute('SELECT email FROM password_requests WHERE id=?', (rid,)).fetchone()
    if req:
        new_pw = generate_password_hash('123456')
        conn.execute('UPDATE users SET password=? WHERE email=?', (new_pw, req['email']))
        conn.execute('UPDATE password_requests SET status="approved" WHERE id=?', (rid,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Đã reset mật khẩu về "123456" và thông báo cho học viên!'})
    conn.close()
    return jsonify({'success': False, 'message': 'Lỗi xử lý'})

@app.route('/admin/approvals/password/reject/<int:rid>', methods=['POST'])
@admin_required
def reject_password(rid):
    conn = get_db()
    conn.execute('UPDATE password_requests SET status="rejected" WHERE id=?', (rid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Đã từ chối yêu cầu.'})

@app.route('/admin/approvals/report/dismiss/<int:rid>', methods=['POST'])
@admin_required
def dismiss_report(rid):
    conn = get_db()
    conn.execute('DELETE FROM course_reports WHERE id=?', (rid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Đã bỏ qua báo cáo.'})

# ── Contacts ────────────────────────────────────────────────────────────────────
@app.route('/admin/contacts')
@admin_required
def admin_contacts():
    page    = int(request.args.get('page',1))
    per_page = 15
    conn    = get_db()
    total   = conn.execute('SELECT COUNT(*) FROM contacts').fetchone()[0]
    contacts= conn.execute('SELECT * FROM contacts ORDER BY created_at DESC LIMIT ? OFFSET ?',
                           (per_page,(page-1)*per_page)).fetchall()
    conn.close()
    return render_template('admin/contacts.html', contacts=contacts, total=total,
                           page=page, total_pages=(total+per_page-1)//per_page)

@app.route('/admin/contacts/delete/<int:cid>', methods=['POST'])
@admin_required
def admin_delete_contact(cid):
    conn = get_db()
    conn.execute('DELETE FROM contacts WHERE id=?',(cid,))
    conn.commit(); conn.close()
    return jsonify({'success':True,'message':'Đã xóa liên hệ!'})

# ══════════════════════════════════════════════════════════════════════
# ACCOUNT / TRANSACTIONS
# ══════════════════════════════════════════════════════════════════════

# Người dùng tự xóa tài khoản
@app.route('/delete-account', methods=['POST'])
@login_required
def delete_account():
    user_id = session.get('user_id')
    conn = get_db()
    try:
        conn.execute('DELETE FROM enrollments WHERE user_id = ?', (user_id,))
        conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        session.clear()
        flash('Tài khoản của bạn đã được xóa vĩnh viễn.', 'info')
    except Exception as e:
        flash('Có lỗi xảy ra, vui lòng thử lại.', 'error')
    finally:
        conn.close()
    return redirect(url_for('trang_chu'))

# Route cập nhật thông tin bổ sung (Ngân hàng, SĐT)
@app.route('/update-profile-info', methods=['POST'])
@login_required
def update_profile_info():
    user_id = session.get('user_id')
    name = request.form.get('name')
    bank_account = request.form.get('bank_account')
    phone = request.form.get('phone')
    
    conn = get_db()
    conn.execute('UPDATE users SET name=?, bank_account=?, phone=? WHERE id=?', 
                 (name, bank_account, phone, user_id))
    conn.commit()
    conn.close()
    flash('Cập nhật thông tin thành công!', 'success')
    return redirect(url_for('tai_khoan'))

# Route xử lý Nạp và Rút tiền
@app.route('/transaction', methods=['POST'])
@login_required
def transaction():
    user_id = session.get('user_id')
    action = request.form.get('action') # 'deposit' hoặc 'withdraw'
    amount = float(request.form.get('amount', 0))
    
    if amount <= 0:
        flash('Số tiền không hợp lệ.', 'error')
        return redirect(url_for('tai_khoan'))
    
    conn = get_db()
    user = conn.execute('SELECT balance FROM users WHERE id=?', (user_id,)).fetchone()
    current_balance = user['balance']
    
    if action == 'deposit':
        # Nạp 100%
        new_balance = current_balance + amount
        flash(f"Nạp thành công {amount:,.0f}đ.", 'success')
    elif action == 'withdraw':
        # Rút mất phí 10%
        if current_balance < amount:
            flash('Số dư không đủ.', 'error')
            conn.close()
            return redirect(url_for('tai_khoan'))
        new_balance = current_balance - amount
        received_amount = amount * 0.9
        flash(f"Rút thành công {amount:,.0f}đ (Thực nhận: {received_amount:,.0f}đ sau khi trừ 10% phí).", 'success')
    else:
        flash('Hành động không hợp lệ.', 'error')
        conn.close()
        return redirect(url_for('tai_khoan'))

    conn.execute('UPDATE users SET balance=? WHERE id=?', (new_balance, user_id))
    conn.commit()
    conn.close()
    return redirect(url_for('tai_khoan'))   

if __name__ == '__main__':
    if not os.path.exists(DB):
        init_db()
    # Chạy update_db_schema() mỗi lần khởi động để đảm bảo các cột/bảng mới được tạo
    update_db_schema()
    app.run(debug=True, port=5000)