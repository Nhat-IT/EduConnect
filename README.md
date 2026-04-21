# 🎓 EduConnect — Nền Tảng Học Tập Trực Tuyến

> **Học Nhanh – Kiếm Tiền Sớm**

EduConnect là web đào tạo online xây dựng bằng **Python Flask** + **SQLite**, giao diện hiện đại với **Syne** + **DM Sans** font, màu chủ đạo indigo + amber.

---

## 📁 Cấu Trúc Thư Mục

```
edu-connect/
├── app.py                   # Flask backend (routes, auth, DB)
├── database.sql             # Schema + seed data
├── elearning.db             # SQLite database (tự tạo khi chạy lần đầu)
│
├── templates/
│   ├── layout.html          # Layout chung (header, footer, modals)
│   ├── trang-chu.html       # Trang chủ (hero, search, khóa học nổi bật)
│   ├── tat-ca-khoa-hoc.html # Danh sách + filter + phân trang
│   ├── gioi-thieu.html      # Giới thiệu, đội ngũ, giá trị
│   ├── lien-he.html         # Form liên hệ + FAQ
│   ├── quen-mat-khau.html   # Reset mật khẩu 3 bước (OTP)
│   └── tai-khoan-cua-toi.html # Profile, khóa học đã học, bảo mật
│
├── static/
│   ├── css/
│   │   ├── base.css         # Design system (variables, components)
│   │   ├── responsive.css   # Mobile/tablet breakpoints
│   │   ├── trang-chu.css
│   │   ├── tat-ca-khoa-hoc.css
│   │   ├── gioi-thieu.css
│   │   ├── lien-he.css
│   │   ├── quen-mat-khau.css
│   │   └── tai-khoan-cua-toi.css
│   │
│   ├── js/
│   │   ├── main.js          # Header scroll, modal, toast, auth forms
│   │   ├── trang-chu.js     # Live search
│   │   ├── tat-ca-khoa-hoc.js # Filter sidebar, enroll
│   │   ├── gioi-thieu.js
│   │   ├── lien-he.js       # Contact form, FAQ accordion
│   │   ├── quen-mat-khau.js # 3-step password reset
│   │   └── tai-khoan-cua-toi.js # Tab nav, profile update, progress bars
│   │
│   ├── images/
│   └── fonts/
│
└── README.md
```

---

## 🚀 Cài Đặt & Chạy

### 1. Cài dependencies
```bash
pip install flask werkzeug
```

### 2. Chạy server
```bash
cd edu-connect
python app.py
```

### 3. Mở trình duyệt
```
http://localhost:5000
```

> Database `elearning.db` sẽ được tạo tự động từ `database.sql` khi chạy lần đầu.

---

## 📌 Các Trang & Route

| Trang | URL | Mô tả |
|-------|-----|--------|
| Trang chủ | `/` | Hero, khóa học nổi bật, thống kê, review |
| Khóa học | `/khoa-hoc` | Danh sách + filter + phân trang |
| Giới thiệu | `/gioi-thieu` | About, đội ngũ, sứ mệnh |
| Liên hệ | `/lien-he` | Form liên hệ, FAQ |
| Quên MK | `/quen-mat-khau` | Reset 3 bước (email → OTP → mật khẩu mới) |
| Tài khoản | `/tai-khoan` | Profile, khóa học, bảo mật |

### API Endpoints

| Method | Route | Mô tả |
|--------|-------|--------|
| POST | `/login` | Đăng nhập |
| POST | `/register` | Đăng ký |
| GET | `/logout` | Đăng xuất |
| GET | `/search?q=` | Tìm kiếm khóa học (JSON) |
| POST | `/contact` | Gửi liên hệ |
| POST | `/enroll/<id>` | Đăng ký khóa học |
| POST | `/update-profile` | Cập nhật thông tin |

---

## 🎨 Design System

- **Font Display:** Syne (700, 800) — headings
- **Font Body:** DM Sans (300, 400, 500) — text
- **Màu chính:** `#4848c8` (Indigo 500)
- **Màu accent:** `#f59e0b` (Amber 500)
- **Border radius:** 8px / 14px / 22px / 32px
- **Responsive:** 1024px (tablet), 768px (mobile)

---

## 🔑 Tài Khoản Demo

Sau khi chạy, đăng ký tài khoản mới qua nút **Đăng Ký** trên trang chủ.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.x + Flask
- **Database:** SQLite (via sqlite3)
- **Auth:** Werkzeug password hashing
- **Frontend:** HTML5 + CSS3 + Vanilla JS
- **Fonts:** Google Fonts (Syne + DM Sans)
- **No external CSS framework** — custom design system

---

## 📦 Mở Rộng Gợi Ý

- Thêm trang chi tiết khóa học (`/khoa-hoc/<slug>`)
- Tích hợp thanh toán (VNPay, Momo)
- Hệ thống gửi email thật (Flask-Mail)
- Upload avatar học viên
- Hệ thống blog/tin tức
- Admin dashboard

---

Made with ❤️ for Vietnamese learners | EduConnect 2024
