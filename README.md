# EduConnect - Hướng dẫn deploy host (Node.js + MySQL)

Backend hiện tại chạy bằng Node.js + Express và sử dụng MySQL.

## Tổng quan

1. Source backend: [server.js](server.js)
2. Mẫu biến môi trường: [.env.example](.env.example)
3. Script tạo DB + seed dữ liệu: [database.mysql.sql](database.mysql.sql).

## Yêu cầu trên host

1. Host hỗ trợ ứng dụng Node.js.
2. Có MySQL database.
3. Có thể tạo file .env trong thư mục gốc project.

## Cấu hình biến môi trường (.env)

Tạo file .env dựa theo [.env.example](.env.example), tối thiểu cần:

1. DB_HOST
2. DB_PORT
3. DB_USER
4. DB_PASSWORD
5. DB_NAME
6. SESSION_SECRET

Gợi ý production:

1. Đặt COOKIE_SECURE=true nếu website chạy HTTPS.
2. Đặt SESSION_SECRET dài, ngẫu nhiên, không để mặc định.
3. Không commit file .env.

## Tạo database MySQL

Import file [database.mysql.sql](database.mysql.sql) vào MySQL.

File này đã bao gồm:

1. Tạo toàn bộ bảng cần thiết.
2. Seed categories, users, courses, lessons, reviews.
3. Dữ liệu tài khoản mẫu để đăng nhập ngay.

## Tài khoản mẫu sau khi import DB

Mật khẩu mặc định cho tất cả tài khoản seed: 123456

1. an.nguyen@educonnect.vn
2. binh.tran@educonnect.vn
3. cuong.le@educonnect.vn

## Cài đặt app trên host

1. Upload source code lên host.
2. Cấu hình file .env.
3. Tạo DB và import [database.mysql.sql](database.mysql.sql).
4. Đặt startup file là [server.js](server.js).
5. Startup command: node server.js.

Port được đọc từ biến PORT (mặc định 3000).

## Route chính

1. /
2. /khoa-hoc
3. /gioi-thieu
4. /lien-he
5. /quen-mat-khau
6. /tai-khoan

## API frontend

1. POST /login
2. POST /register
3. GET /logout
4. GET /search?q=
5. POST /lien-he
6. POST /enroll/:courseId
7. POST /update-profile
8. POST /quen-mat-khau

## Ghi chú vận hành

1. App sẽ báo lỗi ngay khi thiếu biến DB trong .env.
2. Nếu không đăng nhập được tài khoản seed, kiểm tra đã import đúng [database.mysql.sql](database.mysql.sql).
3. Nếu deploy sau proxy/SSL, cần bật COOKIE_SECURE=true và cấu hình HTTPS đúng trên host.
