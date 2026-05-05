# 🎓 EduConnect — Nền tảng học trực tuyến

EduConnect là một ứng dụng web học trực tuyến (e-learning) xây dựng bằng **Node.js + Express**, sử dụng **MySQL** làm cơ sở dữ liệu và **Nunjucks** làm template engine. Hệ thống hỗ trợ hai vai trò: **Người học** và **Admin**, với đầy đủ tính năng quản lý khóa học, bài học, ví điện tử và tài khoản.

---

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Cấu hình môi trường](#-cấu-hình-môi-trường)
- [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
- [API & Routes](#-api--routes)
- [Tài khoản mặc định](#-tài-khoản-mặc-định)

---

## ✨ Tính năng

### Người dùng (User)
- Đăng ký / Đăng nhập / Đăng xuất
- Quên mật khẩu (gửi yêu cầu đến Admin)
- Xem danh sách và chi tiết khóa học (lọc theo danh mục, giá, cấp độ, từ khóa)
- Đăng ký học và theo dõi tiến trình học tập
- Xem bài học (video, tài liệu, bài tập trắc nghiệm)
- Đánh giá / review khóa học
- Quản lý ví điện tử: nạp tiền, rút tiền
- Tạo và chỉnh sửa khóa học (cho Instructor)
- Chỉnh sửa thông tin tài khoản cá nhân

### Admin
- Dashboard tổng quan (thống kê người dùng, khóa học, doanh thu, lượt đăng ký)
- Quản lý người dùng (xem, tạo, khóa tài khoản, cấp lại mật khẩu)
- Quản lý khóa học và danh mục
- Duyệt yêu cầu nạp tiền / rút tiền
- Xử lý yêu cầu đặt lại mật khẩu
- Xử lý yêu cầu xóa tài khoản
- Quản lý liên hệ từ người dùng

---

## 🛠 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js |
| Web framework | Express.js 4 |
| Template engine | Nunjucks 3 |
| Cơ sở dữ liệu | MySQL Workbench 8.0 CE |
| Session store | express-mysql-session |
| Xác thực mật khẩu | bcryptjs |
| Upload file | Multer |
| Gửi email | Nodemailer |
| Flash message | express-flash |
| Dev server | Nodemon |

---

## 📁 Cấu trúc dự án

```
educonnect_nodejs/
├── src/
│   ├── app.js                  # Entry point, cấu hình Express & Nunjucks
│   ├── database.js             # MySQL connection pool & helper functions
│   ├── create-admin.js         # Script tạo tài khoản admin
│   ├── middleware/
│   │   └── auth.js             # Middleware xác thực (loginRequired, adminRequired)
│   └── routes/
│       ├── public.js           # Routes công khai (trang chủ, khóa học, liên hệ)
│       ├── auth.js             # Routes xác thực (login, register, quên mật khẩu)
│       ├── user.js             # Routes người dùng (tài khoản, khóa học, bài học, ví)
│       └── admin.js            # Routes admin (dashboard, quản lý hệ thống)
├── views/
│   ├── layout.html             # Layout chính (user)
│   ├── trang-chu.html          # Trang chủ
│   ├── tat-ca-khoa-hoc.html    # Danh sách khóa học
│   ├── xem-bai-hoc.html        # Xem bài học
│   ├── tai-khoan-cua-toi.html  # Trang tài khoản cá nhân
│   ├── chinh-sua-khoa-hoc.html # Chỉnh sửa khóa học
│   ├── chinh-sua-bai-hoc.html  # Chỉnh sửa bài học
│   ├── gioi-thieu.html         # Giới thiệu
│   ├── lien-he.html            # Liên hệ
│   ├── quen-mat-khau.html      # Quên mật khẩu
│   ├── doi-mat-khau.html       # Đổi mật khẩu
│   └── admin/
│       ├── layout.html         # Layout admin
│       ├── dashboard.html      # Dashboard admin
│       ├── users.html          # Quản lý người dùng
│       ├── courses.html        # Quản lý khóa học
│       ├── categories.html     # Quản lý danh mục
│       ├── contacts.html       # Quản lý liên hệ
│       ├── deposit.html        # Yêu cầu nạp tiền
│       ├── withdrawals.html    # Yêu cầu rút tiền
│       ├── password-resets.html# Yêu cầu đặt lại mật khẩu
│       ├── delete_requests.html# Yêu cầu xóa tài khoản
│       └── login.html          # Đăng nhập admin
├── public/
│   ├── css/                    # Stylesheet từng trang
│   ├── js/                     # JavaScript từng trang
│   └── images/courses/         # Ảnh thumbnail khóa học (upload)
├── scripts/
│   └── migrate-passwords.js    # Script migrate hash mật khẩu
├── database_mysql.sql          # Schema & dữ liệu mẫu MySQL
├── .env                        # Biến môi trường (không commit)
└── package.json
```
---

## 💻 Yêu cầu hệ thống

- **Node.js** >= 18
- **MySQL** >= 8.0
- **npm** >= 9

---

## 🚀 Cài đặt & Chạy

### 1. Clone / giải nén dự án

```bash
git clone <repo-url>
cd educonnect_nodejs
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo cơ sở dữ liệu

Đăng nhập vào MySQL và chạy file schema:

```bash
mysql -u root -p < database_mysql.sql
```

hoặc trong MySQL client:

```sql
CREATE DATABASE IF NOT EXISTS educonnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE educonnect;
SOURCE database_mysql.sql;
```

### 4. Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc (xem [Cấu hình môi trường](#-cấu-hình-môi-trường)).

### 5. Tạo tài khoản Admin (lần đầu)

```bash
node src/create-admin.js
```

### 6. Khởi động server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Ứng dụng chạy tại: [http://localhost:5000](http://localhost:5000)  
Admin panel: [http://localhost:5000/admin](http://localhost:5000/admin)

---

## ⚙️ Cấu hình môi trường

Tạo file `.env` ở thư mục gốc với nội dung sau:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=educonnect

# Server
PORT=5000
NODE_ENV=development

# Session
SECRET_KEY=your_very_secret_key_here

# Email (Nodemailer — tuỳ chọn)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

> ⚠️ **Không commit file `.env` lên Git.** File `.gitignore` đã loại trừ file này.

---

## 🗄 Cơ sở dữ liệu

Schema MySQL gồm các bảng chính:

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản người dùng & admin, ví điện tử |
| `categories` | Danh mục khóa học |
| `courses` | Khóa học (tiêu đề, giá, cấp độ, instructor...) |
| `lessons` | Bài học trong khóa học (video, thứ tự) |
| `lesson_materials` | Tài liệu bài học (document/file) |
| `lesson_exercises` | Bài tập trắc nghiệm của bài học |
| `enrollments` | Lịch sử đăng ký học & tiến trình |
| `reviews` | Đánh giá khóa học |
| `contacts` | Tin nhắn liên hệ |
| `deposit_requests` | Yêu cầu nạp tiền vào ví |
| `wallet_transactions` | Lịch sử giao dịch ví (nạp/rút/mua) |
| `password_reset_requests` | Yêu cầu đặt lại mật khẩu |
| `delete_requests` | Yêu cầu xóa tài khoản |
| `sessions` | Session store (tự tạo bởi express-mysql-session) |

---

## 🔗 API & Routes

### Public

| Method | Route | Mô tả |
|---|---|---|
| GET | `/` | Trang chủ |
| GET | `/khoa-hoc` | Danh sách khóa học (hỗ trợ filter & phân trang) |
| GET | `/search` | Tìm kiếm khóa học (JSON) |
| GET | `/gioi-thieu` | Trang giới thiệu |
| GET/POST | `/lien-he` | Trang liên hệ |

### Auth

| Method | Route | Mô tả |
|---|---|---|
| POST | `/login` | Đăng nhập (JSON) |
| POST | `/register` | Đăng ký (JSON) |
| GET | `/logout` | Đăng xuất |
| GET/POST | `/quen-mat-khau` | Quên mật khẩu |

### User (yêu cầu đăng nhập)

| Method | Route | Mô tả |
|---|---|---|
| GET/POST | `/tai-khoan` | Trang tài khoản cá nhân |
| GET | `/khoa-hoc/:slug/bai-hoc/:id` | Xem bài học |
| POST | `/khoa-hoc/:slug/dang-ky` | Đăng ký khóa học |
| POST | `/khoa-hoc/:slug/danh-gia` | Đánh giá khóa học |
| GET | `/tao-khoa-hoc` | Tạo khóa học mới |
| GET/POST | `/chinh-sua-khoa-hoc/:id` | Chỉnh sửa khóa học |
| GET/POST | `/chinh-sua-bai-hoc/:id` | Chỉnh sửa bài học |
| POST | `/nap-tien` | Yêu cầu nạp tiền |
| POST | `/rut-tien` | Yêu cầu rút tiền |

### Admin (yêu cầu quyền admin)

| Method | Route | Mô tả |
|---|---|---|
| GET | `/admin` | Dashboard |
| GET | `/admin/users` | Quản lý người dùng |
| GET | `/admin/courses` | Quản lý khóa học |
| GET | `/admin/categories` | Quản lý danh mục |
| GET | `/admin/contacts` | Xem liên hệ |
| GET | `/admin/deposits` | Duyệt nạp tiền |
| GET | `/admin/withdrawals` | Duyệt rút tiền |
| GET | `/admin/password-resets` | Xử lý đặt lại mật khẩu |
| GET | `/admin/delete-requests` | Xử lý xóa tài khoản |

---

## 👤 Tài khoản mặc định

Sau khi chạy `node src/create-admin.js`, tài khoản admin mặc định sẽ được tạo. Thông tin đăng nhập được cấu hình trong script đó.

Để đăng nhập admin: [http://localhost:5000/admin/login](http://localhost:5000/admin/login)

---

## 📝 Lưu ý phát triển

- **Upload ảnh khóa học**: lưu tại `public/images/courses/`, tối đa 5MB, hỗ trợ JPG/PNG/GIF/WEBP.
- **Upload tài liệu bài học**: lưu tại `public/uploads/materials/`, tối đa 20MB, hỗ trợ PDF/DOCX/XLSX/PPTX/ZIP và ảnh.
- **Template engine**: Nunjucks với các custom filter `currency`, `date`, `rating`, `numfmt` đã được đăng ký global.
- **Session**: lưu trong bảng MySQL `sessions`, thời gian hết hạn 7 ngày.
- **Windows**: dự án dùng `express-mysql-session` thay vì `session-file-store` để tránh lỗi `EPERM rename` trên Windows.
