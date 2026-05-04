# EduConnect – Node.js

Phiên bản Node.js (Express + Nunjucks + better-sqlite3) chuyển đổi từ Python Flask.

## Cấu trúc dự án

```
educonnect_nodejs/
├── src/
│   ├── app.js                  # Entry point chính (tương đương app.py)
│   ├── database.js             # Module SQLite (tương đương get_db())
│   ├── middleware/
│   │   └── auth.js             # loginRequired, adminRequired (tương đương decorator Flask)
│   └── routes/
│       ├── public.js           # Route công khai: /, /khoa-hoc, /search, /gioi-thieu, /lien-he
│       ├── auth.js             # Auth: /login, /register, /logout, /quen-mat-khau
│       ├── user.js             # User: /tai-khoan, /enroll, /xem-bai-hoc, wallet, CRUD bài học...
│       └── admin.js            # Admin: /admin/*, dashboard, courses, users, deposits...
├── views/                      # Templates Nunjucks (chuyển từ Jinja2 – cú pháp gần như giống nhau)
│   ├── layout.html
│   ├── trang-chu.html
│   ├── tat-ca-khoa-hoc.html
│   ├── xem-bai-hoc.html
│   ├── chinh-sua-khoa-hoc.html
│   ├── chinh-sua-bai-hoc.html
│   ├── tai-khoan-cua-toi.html
│   ├── gioi-thieu.html
│   ├── lien-he.html
│   ├── quen-mat-khau.html
│   └── admin/
│       ├── layout.html
│       ├── login.html
│       ├── dashboard.html
│       ├── courses.html
│       ├── users.html
│       ├── contacts.html
│       ├── categories.html
│       ├── withdrawals.html
│       ├── deposit.html
│       └── delete_requests.html
├── public/                     # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── scripts/
│   └── migrate-passwords.js    # Script migrate hash mật khẩu từ Werkzeug → bcrypt
├── elearning.db                # SQLite database (giữ nguyên)
├── database.sql                # Schema SQL (giữ nguyên)
├── package.json
├── .env.example
└── README.md
```

## Yêu cầu

- **Node.js** >= 18.x
- **npm** >= 9.x

## Cài đặt & Chạy

```bash
# 1. Cài packages
npm install

# 2. Tạo file .env từ example
cp .env.example .env

# 3. (Quan trọng!) Migrate mật khẩu seed data từ Werkzeug → bcrypt
node scripts/migrate-passwords.js

# 4. Chạy server
npm start
# hoặc dev mode với auto-reload:
npm run dev
```

Server sẽ chạy tại: **http://localhost:5000**

## Tài khoản mặc định (sau migrate)

| Tài khoản | Email | Mật khẩu |
|-----------|-------|-----------|
| Admin | admin@educonnect.vn | 123456 |
| Nguyễn Văn An | an.nguyen@educonnect.vn | 123456 |
| Trần Thị Bình | binh.tran@educonnect.vn | 123456 |
| Lê Minh Cường | cuong.le@educonnect.vn | 123456 |

> **Lưu ý:** Mật khẩu mặc định sau migrate là `123456`. Hãy đổi trong môi trường production.

## So sánh Python Flask → Node.js

| Flask (Python) | Node.js (Express) |
|---|---|
| `Flask` | `express` |
| `Jinja2` templates | `Nunjucks` templates (cú pháp gần như giống nhau) |
| `sqlite3` | `better-sqlite3` (synchronous, không cần async/await) |
| `werkzeug.security` | `bcryptjs` |
| `session` (Flask) | `express-session` + `connect-session-file-store` |
| `flash()` | `express-flash` |
| `@login_required` decorator | `loginRequired` middleware |
| `@admin_required` decorator | `adminRequired` middleware |
| `@app.context_processor` | `res.locals` trong middleware |
| `url_for('trang_chu')` | `url_for('trang_chu')` (map trong `app.js`) |
| `request.form.get(...)` | `req.body.xxx` |
| `request.args.get(...)` | `req.query.xxx` |
| `redirect(url_for(...))` | `res.redirect(url)` |
| `jsonify({...})` | `res.json({...})` |
| `render_template(...)` | `res.render(...)` |
| `werkzeug Multer` | `multer` (upload file) |

## Dependencies chính

```json
{
  "express": "Web framework",
  "nunjucks": "Template engine (tương đương Jinja2)",
  "better-sqlite3": "SQLite driver (synchronous như Python sqlite3)",
  "bcryptjs": "Hash mật khẩu (thay Werkzeug)",
  "express-session": "Session management",
  "connect-session-file-store": "Lưu session vào file",
  "express-flash": "Flash messages",
  "multer": "Upload file ảnh",
  "uuid": "Tạo UUID cho tên file"
}
```

## Ghi chú kỹ thuật

### Tại sao dùng better-sqlite3 (synchronous)?

Python's `sqlite3` là synchronous (blocking). `better-sqlite3` cũng synchronous,
giúp code logic trông gần giống Python nhất, không cần `async/await` khắp nơi.

### Migrate mật khẩu

Database cũ dùng Werkzeug's `scrypt` format (`scrypt:32768:8:1$...`).
Node.js dùng `bcryptjs` — hai format này không tương thích.
Script `migrate-passwords.js` sẽ set lại mật khẩu `123456` cho tất cả accounts cũ.

### Nunjucks vs Jinja2

Nunjucks được thiết kế dựa trên Jinja2 nên cú pháp gần như giống hệt:
- `{% block %}`, `{% extends %}`, `{% for %}`, `{% if %}` — **giống nhau**
- `{{ variable }}`, `{{ variable | filter }}` — **giống nhau**
- Khác biệt nhỏ: `"string".split(' ')[0]` thay vì `"string".split()[0]`
