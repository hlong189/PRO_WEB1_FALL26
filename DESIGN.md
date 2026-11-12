# DESIGN.md

## Quy chuẩn thiết kế và phát triển dự án Bus Ticket Booking System

> **Mục đích:** Tài liệu quy chuẩn chung (base) để cả 5 thành viên phát triển các module độc lập nhưng thống nhất về kiến trúc, giao diện, cơ sở dữ liệu, API và cách tích hợp.
>
> **Nguyên tắc:** Đọc và thống nhất tài liệu này trước khi lập trình. Mọi thay đổi ảnh hưởng nhiều module phải được cả nhóm đồng ý và cập nhật lại tài liệu.
>
> **Ký hiệu:** **[Chốt]** = quyết định kỹ thuật đã được đưa vào tài liệu, có hiệu lực khi nhóm thông qua. Các mục còn mở nằm ở Phụ lục A.

### Lịch sử thay đổi

| Phiên bản | Nội dung |
|---|---|
| 1.0 | Bản base đầu tiên |
| 1.1 | Thêm trạng thái `draft` cho chuyến; bảng chuyển trạng thái; cơ chế giữ ghế; mô hình guest checkout; ERD sơ bộ và sở hữu bảng; chốt thư viện dùng chung; chốt sở hữu layout/endpoint dùng chung; bổ sung quy chuẩn sơ đồ ghế, email, chatbot, múi giờ, tiền tệ |

------------------------------------------------------------------------

## 1. Thông tin dự án

-   **Tên dự án:** Bus Ticket Booking System
-   **Mô tả:** Website hỗ trợ tìm kiếm và đặt vé xe khách liên tỉnh tại Việt Nam.
-   **Backend:** Node.js, Express.js
-   **Database:** PostgreSQL
-   **Rendering:** Server-Side Rendering (SSR)
-   **Frontend:** HTML, CSS, JavaScript; Bootstrap cho giao diện ứng dụng; Tailwind CSS cho các trang tĩnh.
-   **Cập nhật dữ liệu:** AJAX cho những thành phần cần cập nhật mà không tải lại toàn bộ trang.
-   **Triển khai:** Docker Compose
-   **Quản lý mã nguồn:** Git

### 1.1. Phạm vi người dùng

| Vai trò | Quyền và chức năng chính |
|---|---|
| Guest | Tìm chuyến, xem chi tiết, đặt vé không cần tài khoản, tra cứu/hủy vé bằng mã đặt chỗ theo chính sách, xem tin tức, dùng chatbot |
| Customer | Các quyền của Guest; quản lý hồ sơ, xem lịch sử đặt vé, hủy vé theo chính sách |
| Staff | Xem danh sách hành khách của chuyến **được phân công** và thực hiện check-in |
| Admin | Toàn quyền: quản lý danh mục, chuyến, đặt chỗ, nội dung, người dùng, phân công nhân viên, báo cáo |

Tên vai trò trong code dùng chữ thường: `guest`, `customer`, `staff`, `admin`. `guest` không phải giá trị lưu trong bảng `users`; đó là trạng thái "chưa đăng nhập". Cột `users.role` chỉ nhận `customer`, `staff`, `admin`.

------------------------------------------------------------------------

## 2. Nguyên tắc làm việc chung

1.  Mỗi thành viên sở hữu một module, nhưng tất cả cùng tuân thủ cấu trúc và quy chuẩn trong file này.
2.  Không tự ý đổi tên bảng, cột, route, trạng thái hoặc cấu trúc dữ liệu đã thống nhất.
3.  Không tạo bảng hoặc chức năng trùng với module khác khi chưa trao đổi.
4.  Không truy cập database từ route hoặc view. Luồng xử lý đi qua controller/service/repository.
5.  Không viết toàn bộ nghiệp vụ trong một file hoặc một route handler.
6.  Không hard-code mật khẩu, secret, thông tin kết nối database hoặc dữ liệu môi trường vào source code.
7.  Mọi dữ liệu từ form, URL, query string và request body phải được kiểm tra ở backend.
8.  Khi chưa rõ nghiệp vụ hoặc quan hệ dữ liệu, phải hỏi nhóm và cập nhật tài liệu trước khi tự quyết định.
9.  Mỗi module có tài liệu riêng: hướng dẫn chạy, danh sách route/API, bảng phụ trách và các trường hợp đã kiểm thử (đặt tại `docs/modules/<module>.md`).

------------------------------------------------------------------------

## 3. Cấu trúc thư mục

```text
bus-ticket-booking/
├── src/
│   ├── config/                 # Cấu hình ứng dụng, database, env
│   ├── middlewares/            # Authentication, authorization, error handler, csrf, rate limit
│   ├── routes/                 # Gắn router của từng module vào app
│   ├── modules/
│   │   ├── auth/               # Thành viên 1
│   │   ├── users/              # Thành viên 1
│   │   ├── catalog/            # Thành viên 2
│   │   ├── content/            # Thành viên 2
│   │   ├── trips/              # Thành viên 3
│   │   ├── bookings/           # Thành viên 4
│   │   ├── payments/           # Thành viên 4
│   │   ├── tickets/            # Thành viên 5
│   │   ├── checkins/           # Thành viên 5
│   │   ├── reports/            # Thành viên 5
│   │   └── chatbot/            # Thành viên 5
│   ├── views/                  # Template SSR (EJS)
│   │   ├── layouts/            # main, auth, admin, staff, static
│   │   ├── partials/           # header, footer, sidebar, flash, pagination, modal, seat-map
│   │   ├── <module>/           # View riêng của từng module
│   │   └── errors/             # 403, 404, 500
│   ├── public/
│   │   ├── css/                # design-tokens.css, bootstrap-theme.css, tailwind.css (đã build)
│   │   ├── js/
│   │   ├── img/
│   │   └── fonts/
│   ├── services/               # Dịch vụ hạ tầng dùng chung: mailer
│   ├── utils/                  # Hàm tiện ích: format tiền, ngày giờ, response helper, sinh mã
│   ├── app.js                  # Khởi tạo Express
│   └── server.js               # Khởi chạy server
├── database/
│   ├── migrations/             # node-pg-migrate
│   └── seeds/                  # Dữ liệu mẫu
├── docs/                       # ERD, API docs, tài liệu module
├── tests/
├── .env.example
├── .gitignore
├── Dockerfile
├── compose.yaml
├── package.json
└── DESIGN.md
```

### 3.1. Cấu trúc bên trong mỗi module

```text
modules/<module-name>/
├── <module>.routes.js          # Khai báo endpoint
├── <module>.controller.js      # Nhận request, trả response
├── <module>.service.js         # Xử lý nghiệp vụ
├── <module>.repository.js      # Truy vấn database
├── <module>.validation.js      # Kiểm tra dữ liệu đầu vào
├── <module>.constants.js       # Hằng số/trạng thái riêng (nếu cần)
└── index.js                    # Public API của module (xem 3.2)
```

Module có nhiều chức năng được chia nhiều file controller/service/repository nhưng giữ đúng vai trò từng lớp.

**Luồng xử lý:** Browser → Route → Middleware → Controller → Service → Repository → PostgreSQL.

-   **Route:** khai báo URL, HTTP method và middleware.
-   **Controller:** đọc request, gọi service, quyết định render view hoặc trả JSON.
-   **Service:** quy tắc nghiệp vụ; không phụ thuộc giao diện.
-   **Repository:** truy vấn database.
-   **Validation:** kiểm tra dữ liệu đầu vào trước khi xử lý.

### 3.2. Giao tiếp giữa các module **[Chốt]**

-   Mỗi module chỉ export ra ngoài qua `modules/<module>/index.js` (các hàm service được phép dùng chung). Module khác **chỉ import từ `index.js`**, không import trực tiếp repository hay file nội bộ của module khác.
-   Không query bảng của module khác trong repository của mình, trừ truy vấn báo cáo (module `reports`, chỉ đọc, được phép JOIN nhiều bảng).
-   Thao tác cần transaction qua nhiều module (ví dụ tạo đơn + giữ ghế) do module chủ trì (`bookings`) mở transaction và truyền `client` vào hàm service của module khác.

------------------------------------------------------------------------

## 4. Quy chuẩn đặt tên

| Thành phần | Quy chuẩn | Ví dụ |
|---|---|---|
| Thư mục | `kebab-case` hoặc chữ thường | `trip-management/` |
| File | `kebab-case` hoặc theo mẫu module | `trip.service.js` |
| Biến/hàm JavaScript | `camelCase` | `findAvailableTrips()` |
| Class | `PascalCase` | `BookingService` |
| Hằng số | `UPPER_SNAKE_CASE` | `BOOKING_STATUS` |
| Bảng database | `snake_case`, số nhiều | `bookings`, `trip_stops` |
| Cột database | `snake_case` | `created_at`, `trip_id` |
| Khóa chính | `id` | `bookings.id` |
| Khóa ngoại | `<entity>_id` | `trip_id`, `user_id` |
| URL trang (SSR) | chữ thường, danh từ số nhiều | `/trips`, `/bookings` |
| URL API (JSON) | tiền tố `/api` | `/api/trips/:id/seats` |
| URL quản trị / nhân viên | tiền tố `/admin`, `/staff` | `/admin/trips`, `/staff/trips/:id/passengers` |
| Query parameter | `snake_case` | `departure_date` |

### 4.1. Quy tắc database

-   **[Chốt] Khóa chính:** `id INTEGER GENERATED ALWAYS AS IDENTITY` cho mọi bảng. Khóa ngoại cùng kiểu `INTEGER`. Không dùng UUID cho khóa chính (tránh lẫn kiểu giữa các module).
-   **[Chốt] Tiền tệ:** lưu VND dạng số nguyên (`INTEGER`), tên cột kết thúc bằng `_amount` hoặc `price` (ví dụ `total_amount`, `price`). Không dùng float.
-   **[Chốt] Thời gian:** mọi cột thời điểm dùng `TIMESTAMPTZ`; DB và server chạy UTC; **hiển thị** theo `Asia/Ho_Chi_Minh`. Ngày giờ khởi hành lưu `departure_time TIMESTAMPTZ`. Việc format hiển thị đi qua hàm chung trong `utils/datetime`.
-   Khóa ngoại phải có ràng buộc tham chiếu phù hợp (`ON DELETE RESTRICT` là mặc định cho dữ liệu nghiệp vụ).
-   Bảng nghiệp vụ có `created_at` và `updated_at` (mặc định `now()`).
-   Dùng `NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY` để bảo vệ tính toàn vẹn. Cột trạng thái dùng `CHECK (status IN (...))` theo mục 7.
-   Không lưu dữ liệu có thể tính lại nếu không có lý do nghiệp vụ rõ ràng.
-   Dữ liệu đã phát sinh giao dịch không xóa cứng; dùng cột `is_active` hoặc trạng thái.
-   **[Chốt] Migration:** dùng `node-pg-migrate`. Tên file theo timestamp do công cụ sinh (`npm run migrate:create -- <ten>`), mỗi migration chỉ động vào bảng của mình, có cả `up` và `down`. Không sửa migration đã merge; muốn đổi thì tạo migration mới.
-   **[Chốt] Seed:** thư mục `database/seeds/` chạy bằng `npm run seed`, chia file theo thứ tự `01-users`, `02-catalog`, `03-content`, `04-trips`, `05-bookings`. Mỗi thành viên viết seed cho bảng của mình; Thành viên 5 chịu trách nhiệm kiểm tra bộ seed chạy trọn vẹn từ DB trống. Seed phải có tài khoản mẫu cho đủ 3 vai trò `customer`, `staff`, `admin` (mật khẩu mẫu ghi trong README, chỉ dùng cho demo).

### 4.2. Quy tắc truy vấn

-   Dùng parameterized query, không nối chuỗi dữ liệu người dùng vào SQL.
-   Chỉ lấy các cột cần thiết, tránh `SELECT *` trong truy vấn nghiệp vụ.
-   Thao tác nhiều bảng cần đồng nhất dữ liệu phải dùng transaction.
-   Có index cho cột thường dùng để tìm kiếm, join, lọc (ví dụ `trips(departure_time)`, `trips(route_id, departure_time)`, `trip_seats(trip_id)`, `bookings(booking_code)`).

### 4.3. Sở hữu bảng và ERD sơ bộ **[Chốt]**

Mỗi bảng có đúng một người sở hữu (người duy nhất được tạo migration và sửa cấu trúc bảng đó).

| TV | Bảng | Ghi chú |
|---|---|---|
| 1 | `users`, `email_verifications`, `password_resets`, `sessions` | `sessions` do `connect-pg-simple` quản lý |
| 2 | `stations`, `stops`, `routes`, `route_stops`, `seat_layouts`, `seats`, `buses`, `news`, `promotions`, `faqs`, `policies`, `cancellation_rules` | `stops` = điểm đón/trả thuộc bến |
| 3 | `trips`, `trip_stops`, `trip_staff` | `trip_staff` = phân công nhân viên cho chuyến |
| 4 | `trip_seats`, `bookings`, `booking_items`, `payments` | `trip_seats` được tạo khi chuyến chuyển sang `active` (xem 7.7) |
| 5 | `tickets`, `checkins`, `email_logs`, `chat_messages` | |

**Quan hệ chính:**

```text
stations 1─n stops
routes   n─n stations (qua route_stops: thứ tự điểm dừng của tuyến)
seat_layouts 1─n seats          (seats: vị trí ghế trên sơ đồ, KHÔNG chứa trạng thái bán)
buses n─1 seat_layouts
trips n─1 routes, n─1 buses; trips 1─n trip_stops; trips n─n users(staff) qua trip_staff
trips 1─n trip_seats            (trip_seats: trạng thái từng ghế THEO CHUYẾN)
trip_seats n─1 seats
bookings n─1 trips; bookings n─0..1 users (guest => user_id NULL)
bookings 1─n booking_items      (mỗi item = 1 ghế + 1 hành khách + giá)
bookings 1─n payments
booking_items 1─1 tickets
tickets 1─0..1 checkins
```

**Bảng cốt lõi (cột bắt buộc, các thành viên có thể thêm cột mô tả):**

-   `users`: `id, email (unique), password_hash, full_name, phone, role, is_email_verified, is_active, created_at, updated_at`
-   `trips`: `id, route_id, bus_id, departure_time, arrival_time, base_price, status, created_at, updated_at`
-   `trip_seats`: `id, trip_id, seat_id, status, held_until, held_by_booking_id, UNIQUE (trip_id, seat_id)`
-   `bookings`: `id, booking_code (unique), trip_id, user_id (nullable), contact_name, contact_email, contact_phone, pickup_stop_id, dropoff_stop_id, total_amount, status, expires_at, cancelled_at, created_at, updated_at`
-   `booking_items`: `id, booking_id, trip_seat_id, passenger_name, passenger_phone, price`
-   `payments`: `id, booking_id, amount, method, status, transaction_ref, paid_at, created_at`
-   `tickets`: `id, booking_item_id (unique), ticket_code (unique), status, issued_at`
-   `checkins`: `id, ticket_id (unique), staff_id, checked_in_at`

Sơ đồ ERD đầy đủ được vẽ bằng Mermaid trong `docs/erd.md` và cập nhật khi có thay đổi bảng.

------------------------------------------------------------------------

## 5. Quy chuẩn Backend và SSR

1.  Dùng Express Router để chia route theo module.
2.  Dùng SSR cho các trang theo yêu cầu dự án; dữ liệu lấy từ backend trước khi render.
3.  **[Chốt] Template engine:** EJS + `express-ejs-layouts`. Layout đặt tên theo mục 6.2.
4.  AJAX chỉ dùng cho phần cần cập nhật động: trạng thái ghế, lọc kết quả, autocomplete, thao tác quản trị.
5.  Không để frontend tự quyết định giá vé, quyền người dùng, trạng thái thanh toán hoặc trạng thái ghế.
6.  Controller không chứa truy vấn SQL dài hoặc toàn bộ nghiệp vụ.
7.  Dùng middleware chung cho xác thực, phân quyền, xử lý lỗi.
8.  Không gửi stack trace, SQL query hoặc thông tin bí mật về trình duyệt.
9.  Form SSR xử lý cả dữ liệu hợp lệ và không hợp lệ, hiển thị thông báo dễ hiểu.

### 5.1. Thư viện dùng chung **[Chốt]**

Không tự thêm thư viện cùng chức năng với bảng dưới; thư viện mới phải báo nhóm.

| Chức năng | Thư viện |
|---|---|
| Template | `ejs`, `express-ejs-layouts` |
| Database | `pg` (không dùng ORM) |
| Migration | `node-pg-migrate` |
| Validation | `joi` |
| Hash mật khẩu | `bcrypt` |
| Session | `express-session` + `connect-pg-simple` (không dùng MemoryStore) |
| Flash message | `connect-flash` |
| CSRF | `csrf-csrf` |
| Header bảo mật | `helmet` |
| Rate limit | `express-rate-limit` |
| Email | `nodemailer` |
| Lập lịch | `node-cron` |
| Log | `morgan` (request) + `console`/`pino` (ứng dụng) |

### 5.2. Quy tắc HTTP method

| Method | Mục đích | Ví dụ |
|---|---|---|
| `GET` | Lấy dữ liệu/trang | `GET /trips` |
| `POST` | Tạo mới hoặc thực hiện hành động | `POST /bookings` |
| `PUT` | Cập nhật toàn bộ tài nguyên | `PUT /admin/buses/:id` |
| `PATCH` | Cập nhật một phần/trạng thái | `PATCH /admin/trips/:id/status` |
| `DELETE` | Xóa tài nguyên khi nghiệp vụ cho phép | `DELETE /admin/news/:id` |

Form HTML chỉ hỗ trợ `GET`/`POST`; với `PUT/PATCH/DELETE` từ form dùng `method-override` qua trường `_method`, hoặc gọi bằng AJAX.

### 5.3. Quy ước response cho AJAX/API

**Thành công:**

```json
{ "success": true, "message": "Thao tác thành công", "data": {} }
```

**Thất bại:**

```json
{ "success": false, "message": "Dữ liệu không hợp lệ", "errors": [] }
```

-   `success`: kết quả xử lý. `message`: thông báo ngắn, dễ hiểu. `data`: dữ liệu khi thành công. `errors`: danh sách lỗi đầu vào, mỗi phần tử `{ "field": "email", "message": "Email không hợp lệ" }`.
-   Dùng helper chung `utils/response.js` (`sendSuccess`, `sendError`); không tự dựng JSON trong controller.
-   Với trang SSR, controller render template thay vì JSON. Không trộn HTML và JSON trong cùng một response.
-   Route có tiền tố `/api` luôn trả JSON, kể cả khi lỗi 401/403/404/500.

### 5.4. Quy ước mã HTTP

| Mã | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `400` | Request hoặc dữ liệu không hợp lệ |
| `401` | Chưa đăng nhập |
| `403` | Không có quyền |
| `404` | Không tìm thấy tài nguyên |
| `409` | Xung đột dữ liệu, ví dụ ghế vừa được người khác đặt |
| `422` | Đúng định dạng nhưng không thỏa điều kiện nghiệp vụ |
| `429` | Gửi quá nhiều yêu cầu (rate limit) |
| `500` | Lỗi máy chủ |

### 5.5. Endpoint và dịch vụ dùng chung **[Chốt]**

| Thành phần | Chủ sở hữu | Mô tả |
|---|---|---|
| `GET /api/locations/suggest?q=` | TV2 (`catalog`) | Autocomplete điểm đi/đến, trả `[{ id, name, province }]`, tối đa 8 kết quả, debounce 300ms phía client |
| `GET /api/trips/:id/seats` | TV4 (`bookings`) | Trạng thái ghế theo chuyến; client polling (xem 7.7) |
| `services/mailer` | TV1 dựng, TV5 dùng thêm | `sendMail({ to, subject, template, data })`; mọi email đi qua hàm này, ghi log vào `email_logs` |
| `middlewares/auth` | TV1 | `requireAuth`, `requireRole(...roles)`, `attachUser` |
| `middlewares/errorHandler` | TV5 (khung dự án) | Trả JSON cho `/api`, render `errors/*` cho trang |
| `utils/response`, `utils/datetime`, `utils/money` | TV5 (khung dự án) | Helper dùng chung |

------------------------------------------------------------------------

## 6. Quy chuẩn Frontend và giao diện

### 6.1. Nguyên tắc thiết kế

-   Giao diện tiếng Việt; responsive trên điện thoại, máy tính bảng, máy tính.
-   Các trang cùng khu vực có header, footer, sidebar, màu sắc và kiểu nút thống nhất.
-   Bootstrap cho giao diện ứng dụng; Tailwind CSS cho trang tĩnh (xem 16.15).
-   Không thêm framework CSS khác khi chưa được nhóm thống nhất.
-   Ưu tiên tái sử dụng partial thay vì viết lại giao diện ở nhiều trang.

### 6.2. Layout và sở hữu **[Chốt]**

| Layout | Áp dụng | Framework CSS | Chủ sở hữu |
|---|---|---|---|
| `main` | Trang khách hàng (trang chủ, tìm chuyến, đặt vé, tài khoản...) | Bootstrap | TV3 |
| `auth` | Đăng nhập, đăng ký, quên mật khẩu, xác thực email | Bootstrap | TV1 |
| `admin` | Khu vực quản trị | Bootstrap | TV2 |
| `staff` | Khu vực nhân viên soát vé | Bootstrap | TV5 |
| `static` | Trang tĩnh: giới thiệu, chính sách, FAQ, điều khoản | **Tailwind** | TV2 |

Partial dùng chung (`views/partials/`): `flash`, `pagination`, `modal-confirm`, `empty-state`, `form-error` do **TV2** sở hữu; `header`/`footer` của `main` do TV3; `seat-map` do TV4. Ai cần chỉnh partial của người khác thì tạo PR và báo chủ sở hữu.

### 6.3. Trạng thái giao diện

Mỗi trang có dữ liệu tối thiểu xử lý: **Loading**, **Success**, **Empty**, **Error**, **Validation**.

Không để nút bấm chỉ có hình thức mà không có hành động. Thao tác quan trọng (xóa, hủy vé, xác nhận thanh toán) cần bước xác nhận (`modal-confirm`).

### 6.4. Quy tắc form

-   Label rõ ràng; đánh dấu trường bắt buộc.
-   Kiểm tra ở frontend để hỗ trợ người dùng và **kiểm tra lại ở backend**.
-   Giữ lại dữ liệu hợp lệ khi form lỗi.
-   Lỗi hiển thị ngay tại trường hoặc khu vực dễ nhận biết.
-   Không chỉ dùng màu để biểu thị lỗi/thành công; kèm chữ hoặc biểu tượng.

------------------------------------------------------------------------

## 7. Quy chuẩn trạng thái nghiệp vụ

### 7.1. Trạng thái chuyến xe **[Chốt]**

| Giá trị | Ý nghĩa |
|---|---|
| `draft` | Mới tạo, chưa mở bán (đang gán xe, cấu hình điểm dừng) |
| `active` | Đang mở bán |
| `departed` | Xe đã xuất bến |
| `completed` | Chuyến đã hoàn thành |
| `cancelled` | Chuyến bị hủy |

**Chuyển trạng thái chuyến:**

| Từ | Sang | Ai thực hiện | Điều kiện |
|---|---|---|---|
| `draft` | `active` | admin | Đã gán xe, có điểm dừng, có giá, `departure_time` ở tương lai; hệ thống tạo `trip_seats` |
| `active` | `departed` | admin / staff | Đến giờ khởi hành hoặc staff xác nhận xuất bến |
| `departed` | `completed` | admin / staff | Chuyến đã xuất bến |
| `draft` | `cancelled` | admin | — |
| `active` | `cancelled` | admin | Hủy toàn bộ đặt chỗ liên quan và hoàn tiền theo 7.8 |

Các chuyển khác bị từ chối (`422`).

### 7.2. Trạng thái đặt vé **[Chốt]**

| Giá trị | Ý nghĩa |
|---|---|
| `pending` | Đã giữ ghế, chờ thanh toán |
| `confirmed` | Đã thanh toán thành công |
| `cancelled` | Đã hủy |
| `expired` | Hết hạn giữ chỗ mà chưa thanh toán |

| Từ | Sang | Điều kiện |
|---|---|---|
| `pending` | `confirmed` | Thanh toán `success` |
| `pending` | `expired` | `expires_at` đã qua (job/kiểm tra lười) |
| `pending` | `cancelled` | Khách hủy, hoặc thanh toán `failed` |
| `confirmed` | `cancelled` | Hủy theo chính sách (7.8), chuyến chưa `departed` |

`expired` và `cancelled` là trạng thái kết thúc, không chuyển tiếp.

### 7.3. Trạng thái thanh toán

| Giá trị | Ý nghĩa |
|---|---|
| `pending` | Đang chờ kết quả |
| `success` | Thanh toán thành công |
| `failed` | Thanh toán thất bại |
| `refunded` | Đã hoàn tiền (**[Chốt]** có triển khai, giả lập khi hủy vé đã thanh toán) |

Chuyển hợp lệ: `pending → success | failed`; `success → refunded`. Một booking có thể có nhiều `payments` (thử lại sau khi `failed`); mỗi booking chỉ được có tối đa một payment `success`.

### 7.4. Trạng thái vé

| Giá trị | Ý nghĩa |
|---|---|
| `valid` | Vé hợp lệ, chưa check-in |
| `checked_in` | Đã check-in |
| `cancelled` | Đã hủy |

Chuyển hợp lệ: `valid → checked_in`, `valid → cancelled`. `checked_in` không chuyển tiếp, không check-in lần hai.

### 7.5. Trạng thái ghế **[Chốt]**

Trạng thái ghế xác định theo **từng chuyến**, lưu duy nhất trong `trip_seats.status`. Bảng `seats` chỉ mô tả vị trí trên sơ đồ xe, **không** có trạng thái bán.

| Giá trị (lưu DB) | Ý nghĩa |
|---|---|
| `available` | Có thể chọn |
| `held` | Đang được giữ tạm thời (có `held_until`) |
| `booked` | Đã đặt thành công |
| `unavailable` | Không được phép bán (admin khóa) |

Giao diện có thêm trạng thái **`selected`** chỉ tồn tại phía client (ghế người dùng đang chọn, chưa gửi lên server); không lưu DB.

### 7.6. Quy tắc chung về chuyển trạng thái

-   Chỉ chuyến `active` mới được đặt vé.
-   Chỉ đơn có thanh toán `success` mới chuyển `confirmed`.
-   Không phát hành vé `valid` cho đơn chưa thanh toán thành công.
-   Vé `checked_in` không check-in lần hai.
-   Đơn hủy/hết hạn phải giải phóng ghế (`trip_seats.status = 'available'`).
-   Không cho phép chuyển trạng thái tùy ý từ frontend; backend kiểm tra trạng thái hiện tại và đích.
-   Mỗi module định nghĩa bảng chuyển hợp lệ trong `<module>.constants.js` và chỉ đổi trạng thái qua một hàm service duy nhất.

### 7.7. Cơ chế giữ ghế và chống đặt trùng **[Chốt]**

**Dữ liệu:** `trip_seats (trip_id, seat_id, status, held_until, held_by_booking_id)` với `UNIQUE (trip_id, seat_id)`. Khi chuyến chuyển `draft → active`, `trips` gọi service của `bookings` để sinh một dòng `trip_seats` cho mỗi ghế của sơ đồ xe (trạng thái `available`).

**Thời hạn giữ ghế:** biến môi trường `SEAT_HOLD_MINUTES` (mặc định **10**). `bookings.expires_at = now + SEAT_HOLD_MINUTES`.

**Giữ ghế (tạo đơn)** thực hiện trong **một transaction**:

1.  Với mỗi ghế khách chọn, chạy câu UPDATE có điều kiện:

    ```sql
    UPDATE trip_seats
       SET status = 'held', held_until = $1, held_by_booking_id = $2
     WHERE trip_id = $3 AND seat_id = ANY($4)
       AND (status = 'available' OR (status = 'held' AND held_until < now()));
    ```

2.  Nếu số dòng được cập nhật **khác** số ghế yêu cầu → rollback, trả `409` ("Ghế vừa được người khác chọn, vui lòng chọn ghế khác").
3.  Tạo `bookings` (`pending`) và `booking_items` trong cùng transaction.

Hai người cùng chọn một ghế: chỉ một UPDATE thỏa điều kiện, người còn lại nhận `409`.

**Thanh toán thành công:** `held → booked`, booking `confirmed`, payment `success` — cùng một transaction.

**Giải phóng ghế hết hạn:**

-   Khi đọc trạng thái ghế, coi `held` có `held_until < now()` là `available` (kiểm tra lười).
-   Job `node-cron` chạy mỗi 60 giây: đặt booking `pending` quá `expires_at` thành `expired`, ghế về `available`. Job do **TV4** viết, khởi động trong `server.js`.

**Cập nhật trạng thái ghế liên tục:** client **polling AJAX** `GET /api/trips/:id/seats` mỗi **5 giây** khi đang mở sơ đồ ghế; dừng polling khi tab ẩn (`document.hidden`). Không dùng WebSocket trong phạm vi đồ án. Response trả `data: [{ seat_id, code, status }]`; trạng thái `held` của chính đơn người dùng đang thao tác hiển thị như `selected`.

### 7.8. Hủy vé và hoàn tiền **[Chốt]**

-   Quy tắc hủy lưu trong bảng `cancellation_rules` (TV2 sở hữu, quản lý qua trang admin): mỗi dòng gồm `min_hours_before_departure` và `refund_percent`. `bookings` (TV4) chỉ **đọc** bảng này qua service của `catalog`.
-   Mức đề xuất ban đầu (có thể chỉnh trong seed): hủy trước ≥ 24 giờ hoàn 100%; từ 6 đến dưới 24 giờ hoàn 50%; dưới 6 giờ không hoàn; không hủy được sau khi chuyến `departed`.
-   Hủy đơn đã thanh toán: tạo bản ghi `payments` loại hoàn tiền hoặc đặt payment `refunded` (TV4 quyết định chi tiết, ghi trong tài liệu module) và `tickets.status = 'cancelled'`.
-   **Guest** và **Customer** dùng cùng quy tắc hủy. Customer hủy trong trang lịch sử đặt vé; guest hủy trong trang tra cứu sau khi xác minh bằng mã + email/SĐT.

### 7.9. Guest checkout và tra cứu vé **[Chốt]**

-   `bookings.user_id` cho phép NULL. Mọi đơn (cả customer) lưu `contact_name`, `contact_email`, `contact_phone`.
-   `booking_code`: 8 ký tự `A–Z` (bỏ `O`, `I`) và `2–9`, sinh bằng nguồn ngẫu nhiên an toàn (`crypto`), `UNIQUE`. Không dùng id tuần tự.
-   Tra cứu bằng **mã đặt chỗ + email hoặc SĐT liên hệ** (phải khớp). Nếu sai trả cùng một thông báo chung, không tiết lộ mã có tồn tại hay không.
-   Rate limit trang tra cứu: tối đa 10 lần/15 phút/IP.
-   Customer đăng nhập đặt vé thì `user_id` được gán từ session, không lấy từ form.

### 7.10. Nhân viên được phân công **[Chốt]**

Staff chỉ xem và check-in chuyến có bản ghi trong `trip_staff` (admin phân công khi tạo/sửa chuyến, TV3 làm giao diện). Check-in chỉ được thực hiện khi chuyến `active` và trong khoảng thời gian cho phép (mặc định từ 2 giờ trước `departure_time` đến lúc chuyến `departed`).

------------------------------------------------------------------------

## 8. Phân chia module và ranh giới phụ trách

| TV | Module | Phụ trách chính | Phối hợp |
|---|---|---|---|
| 1 | `auth`, `users` | Tài khoản, xác thực, phân quyền, hồ sơ, người dùng; `services/mailer`; middleware auth | Tất cả |
| 2 | `catalog`, `content` | Bến xe, điểm đón/trả, tuyến, xe, sơ đồ ghế, chính sách hủy, nội dung, trang tĩnh, layout `admin`/`static`, partial chung, autocomplete | TV3, TV4 |
| 3 | `trips` | Chuyến, lịch chạy, điểm dừng, phân công nhân viên, tìm kiếm, layout `main` | TV2, TV4 |
| 4 | `bookings`, `payments` | `trip_seats`, giữ ghế, đặt vé, thanh toán giả lập, tra cứu/hủy, job hết hạn | TV2, TV3, TV5 |
| 5 | `tickets`, `checkins`, `reports`, `chatbot` | Vé, email vé, soát vé, báo cáo, chatbot, khung dự án (Docker, app.js, error handler), layout `staff`, tích hợp, seed tổng | Tất cả |

### 8.1. Quy tắc sở hữu dữ liệu

-   Mỗi bảng có một người chịu trách nhiệm (xem 4.3).
-   Module khác đọc dữ liệu qua `index.js` của module sở hữu (xem 3.2).
-   Cần thay đổi bảng của người khác thì trao đổi trước.
-   Không tạo hai bảng cùng lưu một loại dữ liệu.
-   Bảng liên kết giữa module phải có trong ERD.

### 8.2. Email **[Chốt]**

-   Một `services/mailer` dùng `nodemailer`, cấu hình SMTP qua biến môi trường. Khi chạy Docker Compose dùng **MailHog** làm SMTP giả (giao diện xem thư tại cổng 8025).
-   Các loại thư: xác thực email, quên mật khẩu (TV1); vé điện tử (TV5). Template email là EJS riêng trong `views/emails/<module>/`.
-   Gửi email lỗi không được làm hỏng giao dịch chính: ghi lỗi vào `email_logs` và cho phép gửi lại.

### 8.3. Chatbot **[Chốt]**

-   Chatbot gọi một LLM API qua `chatbot.service`; khóa API trong `CHATBOT_API_KEY`, không có khóa thì chạy chế độ **rule-based** (từ khóa + FAQ) để demo vẫn hoạt động.
-   Chỉ có quyền **đọc**: tìm chuyến (gọi service `trips`), tra cứu vé (bắt buộc mã đặt chỗ + email/SĐT như 7.9), giải đáp chính sách và FAQ (dữ liệu `content`). Chatbot **không** đặt, hủy hay thanh toán.
-   Có rate limit riêng (mặc định 20 tin nhắn/phút/IP) và giới hạn độ dài tin nhắn.

------------------------------------------------------------------------

## 9. Bảo mật và kiểm tra dữ liệu

1.  Mật khẩu hash bằng `bcrypt` (cost ≥ 10); không lưu plain text.
2.  Một cơ chế xác thực duy nhất: session (`express-session` + `connect-pg-simple`), cookie `httpOnly`, `sameSite=lax`, `secure` khi production.
3.  Kiểm tra quyền ở backend cho mọi route `/admin` và `/staff`.
4.  Không tin `user_id`, `role`, `price`, `payment_status` gửi từ trình duyệt.
5.  Dùng parameterized query.
6.  Escape dữ liệu khi hiển thị (EJS `<%= %>`, hạn chế `<%- %>`).
7.  Bật CSRF cho mọi form `POST/PUT/PATCH/DELETE` và AJAX (gửi token qua header `X-CSRF-Token`).
8.  Dùng `helmet`; rate limit cho đăng nhập, quên mật khẩu, tra cứu vé, chatbot.
9.  Không commit `.env`.
10. Chỉ lưu dữ liệu cá nhân thực sự cần thiết; không lưu thông tin thẻ (cổng thanh toán giả lập chỉ nhận kết quả mô phỏng).
11. Không hiển thị thông tin cá nhân hoặc thanh toán cho người không có quyền.

------------------------------------------------------------------------

## 10. Quy chuẩn Git và phối hợp nhóm

### 10.1. Branch

-   `main`: bản ổn định, demo được.
-   `develop`: nhánh tích hợp.
-   **[Chốt]** Nhánh làm việc **ngắn hạn theo tính năng**, tách từ `develop`: `feature/<module>-<tinh-nang>` (ví dụ `feature/booking-seat-hold`, `feature/auth-register`). Merge về `develop` thường xuyên (ít nhất mỗi tính năng hoàn chỉnh), không giữ một nhánh dài cho cả module.
-   Sửa lỗi: `fix/<module>-<mo-ta>`.

### 10.2. Commit message

```text
type(scope): mô tả ngắn
```

Ví dụ: `feat(auth): add user registration`, `fix(booking): prevent duplicate seat booking`, `docs(database): update ERD`.

`type`: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`.

### 10.3. Quy trình làm việc

1.  Pull `develop` mới nhất.
2.  Tạo nhánh tính năng.
3.  Kiểm tra tại máy cá nhân (và chạy được bằng Docker Compose nếu đụng hạ tầng).
4.  Commit rõ ràng.
5.  Tạo Pull Request vào `develop`; ghi rõ migration mới nếu có.
6.  Ít nhất **một thành viên khác** review.
7.  Chỉ merge khi không có lỗi nghiêm trọng và không làm hỏng module khác.
8.  Định kỳ tích hợp `develop` vào `main` khi đủ ổn định.
9.  Xung đột migration: người merge sau chịu trách nhiệm tạo lại migration cho đúng thứ tự.

Không commit `node_modules`, `.env`, log, file build hoặc dữ liệu cá nhân.

------------------------------------------------------------------------

## 11. Environment và Docker

### 11.1. Biến môi trường

`.env.example` (được commit):

```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
TZ=UTC

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bus_ticket_booking
DB_USER=postgres
DB_PASSWORD=change_me

SESSION_SECRET=change_me
CSRF_SECRET=change_me

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Bus Ticket <no-reply@example.com>"

SEAT_HOLD_MINUTES=10
CHATBOT_API_KEY=
```

-   `.env` thật không được commit; không tự đổi tên biến khi chưa báo nhóm.
-   Cấu hình phải chạy được cả khi chạy trực tiếp và bằng Docker Compose (khi chạy Compose, `DB_HOST=db`, `SMTP_HOST=mailhog`).

### 11.2. Docker Compose **[Chốt]**

-   Service `app` (Node.js), `db` (PostgreSQL, có `healthcheck`), `mailhog`.
-   `app` dùng `depends_on` với điều kiện `db` healthy.
-   Volume cho dữ liệu PostgreSQL để không mất khi khởi động lại.
-   Khi khởi động, `app` tự chạy migration; seed chạy bằng lệnh riêng (`npm run seed`) hoặc tự chạy nếu biến `AUTO_SEED=true`, để demo có sẵn dữ liệu chỉ với `docker compose up`.
-   Lệnh chạy cụ thể ghi trong `README.md`; TV5 chịu trách nhiệm giữ cho `docker compose up` luôn chạy được trên `develop`.

------------------------------------------------------------------------

## 12. Kiểm thử bắt buộc

Mỗi thành viên tự kiểm thử module của mình trước khi tích hợp.

| Nhóm | Nội dung tối thiểu |
|---|---|
| Validation | Bỏ trống, sai định dạng, dữ liệu quá dài |
| Database | Thêm, sửa, xóa, khóa ngoại, dữ liệu trùng |
| Authentication | Chưa đăng nhập, đăng nhập sai, session hết hạn |
| Authorization | Guest/Customer/Staff/Admin truy cập đúng quyền; staff không vào chuyến không được phân công |
| Business logic | Chuyển trạng thái hợp lệ và không hợp lệ |
| UI | Loading, empty, success, error, responsive |
| Integration | Dữ liệu giữa các module đồng bộ |

### 12.1. Luồng tích hợp quan trọng nhất

```text
Admin tạo bến xe, tuyến, xe và sơ đồ ghế
   → Admin tạo chuyến (draft), gán xe, điểm dừng, nhân viên → chuyển active (sinh trip_seats)
   → Khách tìm kiếm và chọn chuyến
   → Khách chọn ghế và nhập thông tin
   → Hệ thống giữ ghế (held) và tạo đơn (pending)
   → Khách thanh toán giả lập
        ├─ Thành công → đơn confirmed, ghế booked → tạo vé → gửi email vé
        │                → nhân viên check-in → chuyến departed → completed → cập nhật báo cáo
        └─ Thất bại   → đơn cancelled, ghế về available
```

Ngoài luồng thành công, phải thử tối thiểu: hai khách cùng chọn một ghế (người sau nhận `409`); thanh toán thất bại; giữ ghế hết hạn (job/kiểm tra lười giải phóng); khách hủy vé theo từng mức hoàn tiền; check-in vé đã dùng; guest tra cứu với mã đúng nhưng email sai; người không có quyền vào trang quản trị; admin hủy chuyến đã có đơn.

------------------------------------------------------------------------

## 13. Tiêu chí hoàn thành một module (Definition of Done)

-   [ ] Migration đã cập nhật, chạy được cả `up` và `down`.
-   [ ] Có seed cho bảng của module.
-   [ ] Backend xử lý đúng nghiệp vụ.
-   [ ] Frontend/SSR hiển thị đúng dữ liệu.
-   [ ] Có validation ở backend.
-   [ ] Có kiểm tra quyền nếu cần.
-   [ ] Có xử lý lỗi và thông báo cho người dùng.
-   [ ] Không làm hỏng chức năng của module khác.
-   [ ] Đã kiểm thử thành công và thất bại.
-   [ ] Đã merge lên nhánh tích hợp.
-   [ ] Có `docs/modules/<module>.md` ghi cách dùng, route/API và bảng dữ liệu.

------------------------------------------------------------------------

## 14. Quy tắc cập nhật tài liệu

Khi thay đổi một trong các nội dung sau, người đề xuất trao đổi với nhóm và cập nhật tài liệu (kèm dòng trong "Lịch sử thay đổi"):

-   Cấu trúc thư mục hoặc kiến trúc.
-   Tên bảng, cột, khóa ngoại, ERD.
-   API dùng chung giữa các module.
-   Vai trò và quyền truy cập.
-   Trạng thái và quy tắc chuyển trạng thái.
-   Cấu trúc response.
-   Biến môi trường hoặc cách triển khai Docker.
-   Thư viện dùng chung (mục 5.1).

**Không tự ý thay đổi quy chuẩn chung chỉ để giải quyết nhanh một lỗi cục bộ.**

------------------------------------------------------------------------

## 15. Checklist thống nhất trước khi bắt đầu code

-   [ ] Chốt cấu trúc thư mục và nguyên tắc giao tiếp module (3.2).
-   [ ] Chốt người sở hữu từng module, bảng, layout, endpoint dùng chung (4.3, 5.5, 6.2).
-   [ ] Vẽ xong ERD (`docs/erd.md`) và chốt kiểu khóa (4.1).
-   [ ] Chốt state machine chuyến, đặt vé, thanh toán, vé (mục 7).
-   [ ] Chốt cơ chế giữ ghế (7.7) và chính sách hủy (7.8).
-   [ ] Chốt thư viện dùng chung (5.1).
-   [ ] Chốt cách chạy migration, seed, Docker Compose (4.1, 11).
-   [ ] Chốt branch Git và quy trình Pull Request (10).
-   [ ] Dựng xong khung dự án chạy được (`docker compose up` hiển thị trang chủ rỗng) và đẩy lên `develop`.

> **Lưu ý:** DESIGN.md là quy chuẩn chung, không thay thế tài liệu chi tiết từng module. Khi có mâu thuẫn, nhóm thống nhất và cập nhật DESIGN.md trước khi tiếp tục.

------------------------------------------------------------------------

# 16. UI Design System – Quy chuẩn giao diện

Quy định các yếu tố giao diện dùng chung: màu sắc, typography, spacing, button, input, card, bảng, trạng thái, icon, responsive. Mục tiêu: giao diện 5 module thống nhất như một sản phẩm.

## 16.1. Định hướng thiết kế

-   **Phong cách:** hiện đại, rõ ràng, đáng tin cậy, thân thiện, dễ sử dụng.
-   **Ưu tiên:** dễ đọc, dễ tìm chuyến, dễ chọn ghế, dễ hoàn tất đặt vé.
-   **Không dùng:** nhiều màu nổi, gradient tùy tiện, hiệu ứng gây rối, nhiều kiểu button hoặc bo góc.
-   Mọi module dùng chung design token; không tự chọn màu/font/spacing riêng.

## 16.2. Color palette

### Màu thương hiệu

| Token | HEX | Công dụng |
|---|---|---|
| `--color-primary-900` | `#12305A` | Navy đậm: sidebar/header đậm, chữ trên nền sáng |
| `--color-primary-700` | `#1D4E89` | Màu thương hiệu chính |
| `--color-primary-600` | `#2563EB` | Button chính, link, focus |
| `--color-primary-100` | `#DBEAFE` | Nền xanh nhạt, vùng được chọn |
| `--color-primary-50` | `#EFF6FF` | Nền nhấn nhẹ |

### Màu nhấn

| Token | HEX | Công dụng |
|---|---|---|
| `--color-accent-600` | `#EA580C` | CTA phụ, khuyến mãi |
| `--color-accent-100` | `#FFEDD5` | Nền nhấn cam nhạt |

Màu cam chỉ dành cho hành động hoặc thông tin cần thu hút, không dùng cho mọi nút.

### Màu nền và chữ

| Token | HEX | Công dụng |
|---|---|---|
| `--color-background` | `#F8FAFC` | Nền trang |
| `--color-surface` | `#FFFFFF` | Card, modal, form, bảng |
| `--color-surface-muted` | `#F1F5F9` | Nền phụ |
| `--color-border` | `#E2E8F0` | Viền input, card, divider |
| `--color-text-primary` | `#0F172A` | Tiêu đề, nội dung chính |
| `--color-text-secondary` | `#475569` | Nội dung phụ |
| `--color-text-muted` | `#64748B` | Placeholder, mô tả phụ (chỉ dùng cỡ ≥ 14px trên nền sáng để đủ tương phản) |
| `--color-white` | `#FFFFFF` | Chữ trên nền đậm |

### Màu trạng thái

| Trạng thái | Màu đậm | Nền nhạt | Sử dụng |
|---|---|---|---|
| Success | `#15803D` | `#DCFCE7` | Thành công |
| Warning | `#B45309` | `#FEF3C7` | Đang chờ, sắp hết hạn |
| Danger | `#B91C1C` | `#FEE2E2` | Lỗi, hủy, thất bại |
| Info | `#1D4ED8` | `#DBEAFE` | Thông tin, đang xử lý |

**Quy tắc:**

1.  Mỗi trang chỉ có một màu hành động chính là `primary`.
2.  Màu trạng thái dùng đúng ngữ nghĩa.
3.  Không đặt chữ nhạt trên nền trắng nếu tương phản thấp.
4.  Không chỉ dùng màu để truyền đạt trạng thái; luôn kèm chữ hoặc icon.
5.  Không đổi mã HEX giữa các module.

## 16.3. Typography

**Font chính:** `Be Vietnam Pro` (hỗ trợ tiếng Việt tốt), fallback `Arial, sans-serif`. **[Chốt]** Font tự host trong `public/fonts/` (không phụ thuộc CDN) và khai báo `@font-face` trong `design-tokens.css`.

| Token | Kích thước | Độ đậm | Sử dụng |
|---|---:|---:|---|
| `text-xs` | 12px | 400–500 | Chú thích, metadata |
| `text-sm` | 14px | 400–500 | Nội dung phụ, label |
| `text-base` | 16px | 400 | Nội dung mặc định |
| `text-lg` | 18px | 500–600 | Nội dung nổi bật |
| `heading-sm` | 20px | 600 | Tiêu đề card/section nhỏ |
| `heading-md` | 24px | 600 | Tiêu đề section |
| `heading-lg` | 30px | 700 | Tiêu đề trang |
| `display` | 36px | 700 | Hero title nếu thực sự cần |

Quy tắc: nội dung thường 16px, line-height ~1.5; label/phụ không nhỏ hơn 12px; tiêu đề phân cấp rõ; không quá 3 cấp font-weight trong cùng khu vực; dùng sentence case, tránh IN HOA toàn bộ; giá vé, mã đặt chỗ, số liệu dùng kiểu chữ dễ phân biệt (khuyến nghị `font-variant-numeric: tabular-nums`).

## 16.4. Spacing

Bội số của 4px:

| Token | Giá trị | Sử dụng |
|---|---:|---|
| `space-1` | 4px | Rất nhỏ |
| `space-2` | 8px | Giữa icon và text |
| `space-3` | 12px | Khoảng cách trong form |
| `space-4` | 16px | Padding mặc định |
| `space-5` | 20px | Giữa các nhóm nội dung |
| `space-6` | 24px | Padding card |
| `space-8` | 32px | Giữa các section |
| `space-10` | 40px | Khoảng cách lớn |
| `space-12` | 48px | Giữa các khu vực lớn |

Label cách input ~8px; field cách nhau 16–20px; card padding 20–24px; section cách nhau 32–48px.

## 16.5. Border radius và shadow

| Thành phần | Radius |
|---|---:|
| Input, select, button | 8px |
| Card | 12px |
| Modal | 16px |
| Badge/pill | 999px |
| Avatar | 50% |

Shadow nhẹ (`--shadow-sm/md/lg`, giá trị ở 16.14). Card ưu tiên viền; không dùng shadow đậm cho mọi thành phần.

## 16.6. Button

| Loại | Kiểu | Công dụng |
|---|---|---|
| Primary | Nền `#2563EB`, chữ trắng | Hành động chính |
| Secondary | Nền trắng, viền xám | Hành động phụ: Quay lại |
| Outline | Trong suốt, viền xanh | Hành động phụ liên quan |
| Ghost | Không nền/viền | Tác vụ nhỏ |
| Danger | Nền đỏ, chữ trắng | Xóa, hủy vé |
| Link | Chữ xanh | Điều hướng |

| Size | Chiều cao | Padding ngang | Font |
|---|---:|---:|---:|
| Small | 32px | 12px | 14px |
| Medium (mặc định) | 40px | 16px | 14–16px |
| Large | 48px | 20px | 16px |

Trạng thái: default, hover (đậm hơn nhẹ), active, focus (focus ring), disabled, loading (spinner, chặn bấm lặp).

Quy tắc: mỗi khu vực một Primary nổi bật nhất; nhãn mô tả hành động (`Xác nhận đặt vé`, không dùng `OK`); xóa/hủy cần xác nhận; không dùng `<a>` giả làm button gửi dữ liệu; khoảng cách icon–chữ 8px; CTA quan trọng trên mobile có thể full width.

## 16.7. Input, Select và Form

Chiều cao input 44px; padding ngang 12px; viền `1px solid #E2E8F0`; radius 8px; font 14–16px; label 14px/500; label cách input 8px.

| Trạng thái | Quy chuẩn |
|---|---|
| Default | Viền `#E2E8F0`, nền trắng |
| Focus | Viền `#2563EB`, có focus ring |
| Error | Viền đỏ, lỗi bên dưới |
| Disabled | Nền `#F1F5F9`, chữ xám |
| Read-only | Nền trung tính |

Mỗi input có label; placeholder chỉ là ví dụ; lỗi gần trường; đúng loại input (`email`, `password`, `tel`, `date`, `number`); đánh dấu trường bắt buộc; submit có loading/disabled.

## 16.8. Card

Nền trắng; viền `1px solid #E2E8F0`; radius 12px; padding 20–24px; shadow nhẹ hoặc không; tiêu đề 18–20px/600.

Các loại: Trip Card, Booking Card, Summary Card, News Card. Không tạo kiểu card mới nếu có thể mở rộng component đã có.

## 16.9. Table (Admin, Staff)

Header nền `#F1F5F9`, chữ đậm; nội dung nền trắng; viền `#E2E8F0`; padding cell ~12px; font 14px; thao tác ở cột hành động; có empty state và pagination; trên mobile cuộn ngang hoặc chuyển thành danh sách card.

## 16.10. Badge và trạng thái

| Nội dung | Kiểu |
|---|---|
| Đã xác nhận / Thành công | Nền xanh lá nhạt, chữ xanh lá đậm |
| Đang chờ | Nền vàng nhạt, chữ vàng đậm |
| Đã hủy / Thất bại / Hết hạn | Nền đỏ nhạt, chữ đỏ đậm |
| Đang xử lý / Thông tin | Nền xanh dương nhạt, chữ xanh dương đậm |
| Không hoạt động / Nháp | Nền xám nhạt, chữ xám đậm |

**Ánh xạ trạng thái nghiệp vụ → nhãn tiếng Việt → badge** (dùng chung một helper, không mỗi module tự viết):

| Giá trị | Nhãn | Badge |
|---|---|---|
| trip `draft` | Nháp | Xám |
| trip `active` | Đang mở bán | Xanh lá |
| trip `departed` | Đã xuất bến | Xanh dương |
| trip `completed` | Hoàn thành | Xám |
| trip `cancelled` | Đã hủy | Đỏ |
| booking `pending` | Chờ thanh toán | Vàng |
| booking `confirmed` | Đã xác nhận | Xanh lá |
| booking `cancelled` | Đã hủy | Đỏ |
| booking `expired` | Hết hạn | Đỏ |
| payment `pending` / `success` / `failed` / `refunded` | Đang xử lý / Thành công / Thất bại / Đã hoàn tiền | Xanh dương / Xanh lá / Đỏ / Xám |
| ticket `valid` / `checked_in` / `cancelled` | Hợp lệ / Đã check-in / Đã hủy | Xanh lá / Xanh dương / Đỏ |

## 16.11. Sơ đồ ghế **[Chốt]**

Component `partials/seat-map` do TV4 sở hữu, dùng chung cho trang chọn ghế (khách) và danh sách hành khách (staff/admin). Mỗi trạng thái phân biệt bằng **màu + ký hiệu + chú giải chữ**, không chỉ bằng màu:

| Trạng thái | Hiển thị | Ký hiệu | Chọn được |
|---|---|---|---|
| `available` Còn trống | Nền trắng, viền `#E2E8F0` | Số ghế | Có |
| `selected` Bạn đang chọn | Nền `#2563EB`, chữ trắng | Dấu ✓ | Có (bỏ chọn) |
| `held` Đang được giữ | Nền `#FEF3C7`, viền `#B45309` | Biểu tượng đồng hồ | Không |
| `booked` Đã đặt | Nền `#E2E8F0`, chữ `#64748B` | Dấu × | Không |
| `unavailable` Không bán | Nền `#F1F5F9`, gạch chéo | Biểu tượng khóa | Không |

Quy tắc: ô ghế tối thiểu 44×44px trên mobile; có chú giải đủ 5 trạng thái; mỗi ghế là `<button>` có `aria-label` ("Ghế A12, còn trống"), `aria-pressed` cho ghế được chọn; thao tác được bằng bàn phím; hiển thị tổng tiền và danh sách ghế đã chọn cố định phía dưới trên mobile; giới hạn số ghế mỗi đơn (mặc định 5).

## 16.12. Icon và hình ảnh

-   **[Chốt]** Bộ icon Lucide, nạp bằng **SVG sprite** tự host (`public/img/icons.svg`) và dùng qua `<svg><use href="..."/></svg>`; không dùng CDN.
-   Icon mặc định 20px; nhỏ 16px; lớn 24px. Không trộn phong cách icon.
-   Icon đứng riêng cần tooltip hoặc `aria-label`.
-   Ảnh cùng loại có tỷ lệ khung hình thống nhất; có fallback khi lỗi.
-   Không dùng emoji thay icon cho thao tác quan trọng.

## 16.13. Responsive breakpoints

| Thiết bị | Breakpoint |
|---|---|
| Mobile nhỏ | dưới 576px |
| Mobile lớn | từ 576px |
| Tablet | từ 768px |
| Desktop | từ 992px |
| Desktop rộng | từ 1200px |

Mobile-first; không cuộn ngang ngoài chủ đích; form nhiều cột chuyển một cột trên mobile; sidebar admin chuyển offcanvas; bảng có phương án màn hình nhỏ; sơ đồ ghế chọn chính xác trên cảm ứng; nút quan trọng đủ lớn.

## 16.14. Accessibility

-   Tương phản tối thiểu WCAG AA; kiểm tra bằng công cụ trước khi chốt màu.
-   Thao tác chính bằng bàn phím; focus rõ.
-   Input có label liên kết đúng; ảnh nội dung có `alt`.
-   Không dùng màu làm tín hiệu duy nhất.
-   Thông báo lỗi nêu cách sửa, không chỉ ghi "Có lỗi".

## 16.15. Design tokens dùng chung

File `src/public/css/design-tokens.css`:

```css
:root {
  /* Brand */
  --color-primary-900: #12305A;
  --color-primary-700: #1D4E89;
  --color-primary-600: #2563EB;
  --color-primary-100: #DBEAFE;
  --color-primary-50: #EFF6FF;

  /* Accent */
  --color-accent-600: #EA580C;
  --color-accent-100: #FFEDD5;

  /* Surface and text */
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1F5F9;
  --color-border: #E2E8F0;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #64748B;

  /* Semantic */
  --color-success: #15803D;
  --color-success-bg: #DCFCE7;
  --color-warning: #B45309;
  --color-warning-bg: #FEF3C7;
  --color-danger: #B91C1C;
  --color-danger-bg: #FEE2E2;
  --color-info: #1D4ED8;
  --color-info-bg: #DBEAFE;

  /* Typography */
  --font-family-base: "Be Vietnam Pro", Arial, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 28px rgba(15, 23, 42, 0.12);
}
```

Tất cả module dùng chung file này; không sao chép bộ biến màu khác vào từng module.

## 16.16. Bootstrap và Tailwind CSS **[Chốt]**

**Tách hẳn hai framework theo layout để tránh xung đột** (preflight của Tailwind reset style của Bootstrap):

-   Layout `main`, `auth`, `admin`, `staff` **chỉ nạp Bootstrap** (+ `design-tokens.css` + `bootstrap-theme.css`).
-   Layout `static` **chỉ nạp Tailwind** (+ `design-tokens.css`). Các trang thuộc `static`: giới thiệu, chính sách, FAQ, điều khoản.
-   Tuyệt đối không nạp cả hai trong cùng một trang.

**Bootstrap theo token:** dùng Bootstrap bản CSS đã biên dịch và một file `bootstrap-theme.css` nạp sau, ánh xạ token sang biến `--bs-*` (ví dụ `--bs-primary: var(--color-primary-600)`, `--bs-body-font-family`, `--bs-border-radius: 8px`, `--bs-border-color`) và ghi đè `.btn`, `.form-control` theo 16.6–16.7. File này do TV2 sở hữu.

**Tailwind theo token:** `tailwind.config.js` ánh xạ màu/font/radius/spacing từ cùng bộ token (`primary`, `accent`, `surface`...). Tailwind được **build ra CSS tĩnh** bằng CLI (`npm run build:css`) và commit hoặc build trong Dockerfile; không dùng CDN trong bản demo.

Không dùng utility class để ghi đè lẫn nhau; component dùng chung phải nhất quán dù viết bằng Bootstrap hay Tailwind.

## 16.17. Checklist duyệt UI trước khi merge

-   [ ] Đúng bảng màu và design token.
-   [ ] Đúng font và phân cấp typography.
-   [ ] Button đúng loại, kích thước, trạng thái.
-   [ ] Input có label, focus, error state.
-   [ ] Card, table, badge dùng đúng quy chuẩn; nhãn trạng thái đúng bảng ánh xạ 16.10.
-   [ ] Icon cùng phong cách (Lucide sprite).
-   [ ] Có loading, empty, success, error state.
-   [ ] Responsive mobile, tablet, desktop.
-   [ ] Không cuộn ngang ngoài chủ đích.
-   [ ] Có focus state và tương phản phù hợp.
-   [ ] Không nạp lẫn Bootstrap và Tailwind trong một trang.
-   [ ] Không tự ý tạo màu hoặc component khác design system.

> **Nguyên tắc cuối:** Mọi thành viên có thể sáng tạo bố cục trong module của mình, nhưng không tự ý thay đổi design token, typography, button, input, radius, spacing và component dùng chung. Nếu cần, đề xuất và được nhóm thống nhất trước.

------------------------------------------------------------------------

## Phụ lục A. Các mục còn mở (cần nhóm quyết định trong buổi họp)

1.  **Mức hoàn tiền khi hủy vé** (7.8): các mốc 24h/6h và 100%/50%/0% chỉ là đề xuất.
2.  **Nhà cung cấp LLM cho chatbot** (8.3): chọn dịch vụ, hoặc chỉ làm rule-based nếu không có khóa API.
3.  **Khung giờ check-in** (7.10): mặc định 2 giờ trước giờ khởi hành, có thể đổi.
4.  **Số ghế tối đa mỗi đơn** (16.11): đề xuất 5.
5.  **Chi tiết ghi nhận hoàn tiền** (7.8): ghi trên cùng bản ghi `payments` hay tạo bản ghi mới, do TV4 quyết định và ghi vào `docs/modules/payments.md`.
6.  **Chuyến định kỳ**: đề bài nhắc "lập lịch chuyến"; cần quyết định có sinh hàng loạt chuyến theo lịch lặp (TV3) hay chỉ tạo từng chuyến thủ công.
