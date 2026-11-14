# API DOCUMENTATION – BUS TICKET BOOKING SYSTEM

**Version:** 1.1 **Backend:** Node.js + Express.js **Database:** PostgreSQL **Kiến trúc:** REST API (JSON) + Server-Side Rendering (SSR)

> API.md là nguồn chuẩn về **endpoint, request, response, quyền truy cập và mã lỗi**. Cấu trúc bảng và trạng thái dữ liệu xem DATABASE.md; quy tắc chung xem DESIGN.md.

### Lịch sử thay đổi

| Phiên bản | Nội dung |
|---|---|
| 1.0 | Bản đầu tiên |
| 1.1 | Dùng `trip_seats` và `hold_token` cho giữ ghế; đổi URL booking/ticket/payment sang mã khó đoán; `lookup` chuyển sang `POST`; thêm cột quyền cho mọi endpoint; bổ sung endpoint thiếu (autocomplete, quản trị đặt chỗ, phân công nhân viên, điểm đón/trả, chính sách hủy, xem trước hoàn tiền, khóa ghế); thêm mã lỗi (`code`), bộ lọc tìm kiếm, CSRF, rate limit; bỏ endpoint trùng |

------------------------------------------------------------------------

## 1. Mục đích

-   Thống nhất endpoint, request, response giữa 5 thành viên; tránh API trùng lặp.
-   Quy định xác thực, phân quyền và cách xử lý lỗi.
-   Giúp các module tích hợp mà không phải sửa cấu trúc dữ liệu của nhau.

Mọi thành viên tuân thủ tài liệu này. Muốn đổi endpoint hoặc cấu trúc response phải trao đổi với nhóm và cập nhật API.md (mục 12).

------------------------------------------------------------------------

## 2. API Convention

### 2.1. Base URL và phân biệt trang với API **[Chốt]**

| Loại | Tiền tố | Trả về | Ví dụ |
|---|---|---|---|
| Trang SSR (khách) | không có | HTML | `/trips`, `/login`, `/bookings/lookup` |
| Trang SSR quản trị | `/admin` | HTML | `/admin/trips` |
| Trang SSR nhân viên | `/staff` | HTML | `/staff/trips/12/passengers` |
| **API JSON** | **`/api/v1`** | JSON | `GET /api/v1/trips` |
| API quản trị | `/api/v1/admin` | JSON | `POST /api/v1/admin/trips` |
| API nhân viên | `/api/v1/staff` | JSON | `GET /api/v1/staff/trips` |

Mọi endpoint trong tài liệu này (mục 4–8) có tiền tố `/api/v1` ở trước; để ngắn gọn các bảng viết đường dẫn **không** kèm `/api/v1`. Route `/api/v1/*` luôn trả JSON, kể cả lỗi 401/403/404/500. Danh sách trang SSR chính ở mục 9.

### 2.2. HTTP Methods

| Method | Mục đích |
|---|---|
| `GET` | Lấy dữ liệu, không thay đổi dữ liệu |
| `POST` | Tạo mới hoặc thực hiện hành động |
| `PUT` | Thay thế toàn bộ tài nguyên |
| `PATCH` | Cập nhật một phần/trạng thái |
| `DELETE` | Xóa khi nghiệp vụ cho phép |

`DELETE` thành công trả `200` kèm JSON chuẩn (`data` có thể `null`); không dùng `204`.

### 2.3. Quy tắc đặt tên endpoint

-   Chữ thường, danh từ số nhiều, từ nối bằng dấu gạch ngang; không đặt tên theo hàm; không dùng tiếng Việt.
-   Hành động không thuộc CRUD đặt sau tài nguyên: `PATCH /bookings/:booking_code/cancel`.
-   **Định danh trong URL:** dùng ID số cho dữ liệu công khai/quản trị (`/trips/:id`); dùng **mã khó đoán** cho dữ liệu cá nhân: `booking_code`, `ticket_code`, `transaction_code`, `hold_token` (xem DATABASE.md). Không đưa ID tuần tự của đơn/vé/thanh toán lên URL.
-   Query parameter dùng `snake_case`.

### 2.4. Header và định dạng dữ liệu

```text
Content-Type: application/json
Accept: application/json
X-CSRF-Token: <token>        # bắt buộc với POST/PUT/PATCH/DELETE từ trình duyệt
```

| Dữ liệu | Định dạng |
|---|---|
| Thời gian | ISO 8601 có offset, ví dụ `"2026-12-20T07:30:00+07:00"` |
| Ngày (tham số) | `YYYY-MM-DD`, hiểu theo múi giờ `Asia/Ho_Chi_Minh` |
| Tiền | Số nguyên VND, ví dụ `"price": 250000` |
| ID | Số nguyên |
| Trạng thái | Giá trị DB (`active`, `pending`...); frontend tự đổi sang nhãn tiếng Việt |

Token CSRF lấy từ thẻ `<meta name="csrf-token">` của trang SSR.

### 2.5. Success Response

```json
{ "success": true, "message": "Thao tác thành công", "data": {} }
```

### 2.6. Error Response

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "errors": [ { "field": "email", "message": "Email không đúng định dạng" } ]
}
```

-   `code`: mã lỗi cố định (mục 10) để frontend xử lý; `message`: nội dung tiếng Việt cho người dùng.
-   `errors`: lỗi theo trường (chỉ có với `400`/`422` do validation).
-   Một số lỗi kèm `data` mô tả chi tiết, ví dụ `SEAT_TAKEN` kèm `{ "seat_ids": [12, 13] }`.
-   Dùng helper `utils/response`; không tự dựng JSON trong controller.

### 2.7. HTTP Status Codes

| Status | Ý nghĩa |
|---|---|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Request/dữ liệu không hợp lệ |
| 401 | Chưa đăng nhập |
| 403 | Không có quyền (hoặc email chưa xác thực, tài khoản bị khóa) |
| 404 | Không tìm thấy (cũng dùng khi người dùng không được phép biết tài nguyên có tồn tại) |
| 409 | Xung đột dữ liệu (ghế bị người khác chọn, email trùng, vé đã check-in) |
| 422 | Đúng định dạng nhưng không thỏa điều kiện nghiệp vụ |
| 429 | Quá nhiều request |
| 500 | Lỗi máy chủ |

### 2.8. Pagination, sắp xếp, lọc

Danh sách lớn hỗ trợ `?page=1&limit=10` (`page` mặc định 1, `limit` mặc định 10, **tối đa 100**).

```json
{
  "success": true,
  "message": "Lấy dữ liệu thành công",
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 10, "total": 100, "total_pages": 10 }
  }
}
```

Sắp xếp: `sort_by` + `sort_order` (`asc` | `desc`); giá trị không hợp lệ trả `400`. Danh sách không phân trang trả `data.items` là mảng.

### 2.9. Rate limit

| Nhóm | Giới hạn (mỗi IP) |
|---|---|
| `POST /auth/login` | 10 lần / 15 phút |
| `POST /auth/register`, `/auth/forgot-password`, `/auth/resend-verification` | 5 lần / giờ |
| `POST /bookings/lookup` | 10 lần / 15 phút |
| `POST /seat-holds` | 20 lần / phút |
| `POST /chatbot/messages` | 20 lần / phút |
| `POST /bookings/:booking_code/resend-tickets` | 3 lần / giờ / đơn |

Vượt giới hạn trả `429 RATE_LIMITED` và header `Retry-After`.

------------------------------------------------------------------------

## 3. Authentication & Authorization

### 3.1. Authentication

-   Session-based (`express-session` + `connect-pg-simple`), cookie `httpOnly`, `sameSite=lax`, `secure` khi production.
-   Đăng nhập thành công gắn `req.session.user = { id, role }`.
-   Tài khoản chưa xác thực email đăng nhập bị từ chối (`403 EMAIL_NOT_VERIFIED`); tài khoản `locked` bị từ chối (`403 ACCOUNT_LOCKED`).
-   Guest chứng minh quyền với một đơn bằng cách **tra cứu đúng** (`POST /bookings/lookup`) hoặc vừa **tạo đơn** trong phiên; hệ thống lưu `booking_code` vào `req.session.guestBookings`. Danh sách này chỉ có hiệu lực trong phiên đó.

### 3.2. Roles

| Role | Quyền |
|---|---|
| `guest` (chưa đăng nhập) | Xem danh mục/chuyến/nội dung, giữ ghế, đặt vé không tài khoản, tra cứu/hủy/thanh toán đơn của mình qua mã đặt chỗ, chatbot |
| `customer` | Quyền của guest; hồ sơ; lịch sử đặt vé |
| `staff` | Xem hành khách và check-in **chuyến được phân công** |
| `admin` | Toàn quyền quản trị; check-in bất kỳ chuyến |

### 3.3. Cột "Quyền" trong các bảng endpoint

| Ký hiệu | Ý nghĩa |
|---|---|
| Công khai | Ai cũng gọi được |
| Đăng nhập | Mọi người dùng đã đăng nhập |
| Customer | `customer` (admin/staff không dùng) |
| Chủ đơn | Customer sở hữu đơn (`bookings.user_id = session.user.id`), hoặc guest có `booking_code` trong `session.guestBookings`; admin luôn được |
| Staff* | `staff` được phân công chuyến đó (qua `trip_staff`), hoặc `admin` |
| Admin | `admin` |

### 3.4. Quy tắc phân quyền

-   Mọi kiểm tra quyền thực hiện ở backend; không tin `user_id`, `role`, `price`, `status` từ client.
-   Truy cập đơn/vé không thuộc quyền trả `404` (không tiết lộ tài nguyên tồn tại).
-   Customer chỉ xem dữ liệu của mình; staff chỉ làm việc trong chuyến được giao.

------------------------------------------------------------------------

## 4. Module 1 – Auth & Users (Thành viên 1)

### 4.1. Authentication

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký, gửi email xác thực | Công khai |
| POST | `/auth/verify-email` | Xác thực email bằng token | Công khai |
| POST | `/auth/resend-verification` | Gửi lại email xác thực | Công khai |
| POST | `/auth/login` | Đăng nhập | Công khai |
| POST | `/auth/logout` | Đăng xuất | Đăng nhập |
| GET | `/auth/me` | Thông tin người đang đăng nhập (`null` nếu chưa) | Công khai |
| POST | `/auth/forgot-password` | Yêu cầu đặt lại mật khẩu (luôn trả thành công, không tiết lộ email có tồn tại) | Công khai |
| POST | `/auth/reset-password` | Đặt lại mật khẩu bằng token | Công khai |

Liên kết trong email mở **trang SSR** (`GET /verify-email?token=...`, `GET /reset-password?token=...`); trang đó gọi API tương ứng.

**Register Request**

```json
{ "full_name": "Nguyen Van A", "email": "user@example.com", "phone": "0901234567", "password": "Password123" }
```

Mật khẩu tối thiểu 8 ký tự gồm chữ và số. Lỗi trùng email: `409 EMAIL_TAKEN`.

**Login Request**

```json
{ "email": "user@example.com", "password": "Password123" }
```

**Login Response**

```json
{ "success": true, "message": "Đăng nhập thành công",
  "data": { "user": { "id": 5, "full_name": "Nguyen Van A", "email": "user@example.com", "role": "customer" } } }
```

### 4.2. Users

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/users/profile` | Xem hồ sơ | Đăng nhập |
| PATCH | `/users/profile` | Cập nhật hồ sơ (`full_name`, `phone`) | Đăng nhập |
| PATCH | `/users/change-password` | Đổi mật khẩu (`current_password`, `new_password`) | Đăng nhập |
| GET | `/admin/users` | Danh sách người dùng (lọc `role`, `status`, `q`) | Admin |
| POST | `/admin/users` | Tạo tài khoản staff/admin | Admin |
| GET | `/admin/users/:id` | Chi tiết người dùng | Admin |
| PATCH | `/admin/users/:id/status` | Khóa/mở khóa (`active`, `locked`) | Admin |
| PATCH | `/admin/users/:id/role` | Đổi vai trò | Admin |

Admin không được tự khóa hoặc tự hạ quyền chính mình. **Lịch sử đặt vé** của customer nằm ở `GET /bookings/mine` (module 4, mục 7.2) để một module sở hữu một endpoint.

------------------------------------------------------------------------

## 5. Module 2 – Catalog & Content (Thành viên 2)

### 5.1. Autocomplete

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/locations/suggest?q=` | Gợi ý điểm đi/đến | Công khai |

`q` tối thiểu 1 ký tự (không phân biệt hoa thường và dấu tiếng Việt), tối đa 8 kết quả, client debounce 300ms.

```json
{ "success": true, "message": "OK", "data": { "items": [
  { "type": "province", "province": "Đà Lạt", "label": "Đà Lạt" },
  { "type": "station", "station_id": 3, "province": "Đà Lạt", "label": "Bến xe Liên tỉnh Đà Lạt" }
] } }
```

### 5.2. Danh mục công khai (đọc)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/stations`, `/stations/:id` | Bến xe đang hoạt động | Công khai |
| GET | `/stations/:id/stops` | Điểm đón/trả của bến | Công khai |
| GET | `/routes`, `/routes/:id` | Tuyến (kèm `route_stops`) | Công khai |
| GET | `/cancellation-rules` | Mức hoàn tiền khi hủy | Công khai |

### 5.3. Nội dung công khai (đọc)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/news`, `/news/:slug` | Tin tức đã đăng | Công khai |
| GET | `/promotions` | Khuyến mãi đang hiệu lực | Công khai |
| GET | `/faqs` | Câu hỏi thường gặp | Công khai |
| GET | `/policies`, `/policies/:slug` | Chính sách | Công khai |

Chatbot dùng lại `GET /faqs`; không có endpoint FAQ riêng cho chatbot.

### 5.4. Quản trị danh mục và nội dung (CRUD)

Quyền: **Admin**. Mẫu chung: `GET /admin/<tài nguyên>` (danh sách, phân trang, lọc), `GET /admin/<tài nguyên>/:id`, `POST /admin/<tài nguyên>`, `PUT|PATCH /admin/<tài nguyên>/:id`, `DELETE /admin/<tài nguyên>/:id`.

| Tài nguyên | Ghi chú |
|---|---|
| `stations` | `DELETE` = vô hiệu hóa (`is_active = false`); từ chối nếu còn tuyến/chuyến đang dùng |
| `stops` | Điểm đón/trả; lọc `station_id` |
| `routes` | `DELETE` = vô hiệu hóa; kèm `PUT /admin/routes/:id/stops` (thay toàn bộ `route_stops`) |
| `buses` | `DELETE` = đặt `status = 'retired'`; từ chối nếu có chuyến chưa hoàn thành |
| `cancellation-rules` | Sửa số giờ/% hoàn tiền |
| `news` | `status` `draft`/`published` |
| `promotions`, `faqs`, `policies` | Nội dung hiển thị |

**Sơ đồ ghế của xe**

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/admin/buses/:id/seats` | Sơ đồ ghế của xe | Admin |
| PUT | `/admin/buses/:id/seats` | Thiết lập toàn bộ sơ đồ ghế | Admin |

```json
{ "seats": [ { "seat_number": "A01", "seat_type": "standard", "floor": 1, "row_no": 1, "col_no": 1 } ] }
```

Từ chối (`422`) khi xe đã có chuyến phát sinh `trip_seats`/giao dịch; khi đó chỉ được vô hiệu hóa ghế (`PATCH /admin/buses/:id/seats/:seat_id` với `is_active`).

------------------------------------------------------------------------

## 6. Module 3 – Trips (Thành viên 3)

### 6.1. Tìm kiếm và xem chuyến

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/trips/search` | Tìm chuyến có lọc/sắp xếp | Công khai |
| GET | `/trips/:id` | Chi tiết chuyến (kèm tuyến, xe, số ghế trống) | Công khai |
| GET | `/trips/:id/stops` | Điểm đón/trả của chuyến | Công khai |

Công khai chỉ thấy chuyến `active` chưa `departed`; chuyến khác trả `404`. Tình trạng từng ghế nằm ở `GET /trips/:id/seats` (module 4).

### 6.2. Tham số tìm kiếm

```text
GET /api/v1/trips/search?departure_province=Hồ Chí Minh&arrival_province=Đà Lạt&departure_date=2026-12-20&passengers=2
```

| Parameter | Type | Bắt buộc | Mô tả |
|---|---|---|---|
| `departure_province` hoặc `departure_station_id` | string / integer | Một trong hai | Điểm đi (giá trị lấy từ autocomplete) |
| `arrival_province` hoặc `arrival_station_id` | string / integer | Một trong hai | Điểm đến |
| `departure_date` | date | Có | Ngày đi, theo giờ Việt Nam; không được ở quá khứ |
| `passengers` | integer | Không | Số khách (1–5, mặc định 1); chỉ trả chuyến còn đủ ghế trống |
| `departure_time_from`, `departure_time_to` | `HH:mm` | Không | Khung giờ khởi hành |
| `price_min`, `price_max` | integer | Không | Khoảng giá (VND) |
| `bus_type` | string | Không | `seat`, `sleeper`, `limousine` (có thể lặp) |
| `sort_by` | string | Không | `departure_at` (mặc định), `price`, `duration`, `available_seats` |
| `sort_order` | string | Không | `asc` (mặc định), `desc` |
| `page`, `limit` | integer | Không | Phân trang |

Chuyến đã quá giờ khởi hành không xuất hiện trong kết quả.

**Mỗi phần tử kết quả**

```json
{ "id": 21, "route": { "id": 4, "name": "TP.HCM – Đà Lạt" },
  "departure_station": { "id": 1, "name": "Bến xe Miền Đông", "province": "Hồ Chí Minh" },
  "arrival_station": { "id": 3, "name": "Bến xe Liên tỉnh Đà Lạt", "province": "Đà Lạt" },
  "departure_at": "2026-12-20T07:30:00+07:00", "arrival_at": "2026-12-20T14:00:00+07:00",
  "price": 250000, "bus_type": "sleeper", "available_seats": 12, "status": "active" }
```

### 6.3. Quản trị chuyến

Quyền: **Admin**.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/trips` | Danh sách chuyến (lọc `status`, `route_id`, `date_from`, `date_to`) |
| GET | `/admin/trips/:id` | Chi tiết chuyến |
| POST | `/admin/trips` | Tạo chuyến, trạng thái `draft` |
| PUT | `/admin/trips/:id` | Cập nhật chuyến (chỉ khi `draft`; khi đã `active` chỉ sửa được giá cho vé chưa bán nếu nhóm cho phép) |
| PATCH | `/admin/trips/:id/status` | Đổi trạng thái (`active`, `departed`, `completed`, `cancelled`) |
| GET | `/admin/trips/:id/stops` | Điểm đón/trả của chuyến |
| POST | `/admin/trips/:id/stops` | Thêm điểm (`stop_id`, `stop_type`, `stop_order`, `scheduled_at`) |
| PATCH | `/admin/trips/:id/stops/:trip_stop_id` | Sửa điểm |
| DELETE | `/admin/trips/:id/stops/:trip_stop_id` | Xóa điểm (từ chối nếu đã có đơn dùng) |
| GET | `/admin/trips/:id/staff` | Nhân viên được phân công |
| PUT | `/admin/trips/:id/staff` | Đặt lại danh sách phân công (`user_ids`) |

Hủy chuyến **không** dùng `DELETE`; dùng `PATCH .../status` với `cancelled`.

**Create Trip Request**

```json
{ "route_id": 4, "bus_id": 2, "departure_at": "2026-12-20T07:30:00+07:00",
  "arrival_at": "2026-12-20T14:00:00+07:00", "base_price": 250000 }
```

Lỗi: `409 BUS_TIME_CONFLICT` khi xe đã có chuyến trùng giờ.

**Đổi trạng thái**

```json
{ "status": "active" }
```

`draft → active` yêu cầu: có xe, có ít nhất một điểm `pickup` và một điểm `dropoff`, `departure_at` ở tương lai; hệ thống sinh `trip_seats`. Chuyển không hợp lệ trả `422 INVALID_STATUS_TRANSITION`. Hủy chuyến đã có đơn: hủy các đơn và hoàn tiền theo DESIGN.md 7.8; response trả số đơn bị ảnh hưởng.

### 6.4. Chuyến của nhân viên

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/staff/trips` | Chuyến được phân công (mặc định từ hôm nay trở đi) | Staff* (`admin` thấy tất cả) |

------------------------------------------------------------------------

## 7. Module 4 – Bookings & Payments (Thành viên 4)

### 7.1. Ghế và giữ ghế

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/trips/:id/seats` | Tình trạng ghế của chuyến (client gọi lặp mỗi 5 giây) | Công khai |
| POST | `/seat-holds` | Giữ ghế tạm thời | Công khai |
| GET | `/seat-holds/:hold_token` | Kiểm tra lượt giữ và thời gian còn lại | Người giữ (biết `hold_token`) |
| DELETE | `/seat-holds/:hold_token` | Hủy giữ, giải phóng ghế | Người giữ |
| PATCH | `/admin/trips/:id/seats/:seat_id/status` | Khóa/mở ghế (`unavailable` ↔ `available`) | Admin |

**Seats Response**

```json
{ "success": true, "message": "OK", "data": {
  "trip_id": 21, "server_time": "2026-12-20T05:01:12+07:00",
  "seats": [ { "seat_id": 101, "seat_number": "A01", "seat_type": "standard", "floor": 1,
               "row_no": 1, "col_no": 1, "status": "available", "price": 250000 } ] } }
```

`status` là một trong `available`, `held`, `booked`, `unavailable`; ghế `held` đã hết hạn được trả là `available`. Ghế mà **chính người gọi** đang giữ (cùng `hold_token` trong cookie/session) được đánh dấu `"is_mine": true` để giao diện hiển thị là "đang chọn". Không trả `hold_token` của người khác, không trả thông tin cá nhân.

**Hold Request**

```json
{ "trip_id": 21, "seat_ids": [101, 102] }
```

**Hold Response `201`**

```json
{ "success": true, "message": "Đã giữ ghế", "data": {
  "hold_token": "6f1f0f0e-8a5a-4c2e-9d0b-2a6b9c9b3f11",
  "trip_id": 21, "seat_ids": [101, 102], "expires_at": "2026-12-20T05:11:12+07:00", "seconds_left": 600 } }
```

Quy tắc:

-   Chuyến phải `active`, tối đa `SEAT_MAX_PER_BOOKING` ghế (mặc định 5), ghế thuộc xe của chuyến.
-   Một phiên chỉ có **một lượt giữ còn hiệu lực cho mỗi chuyến**; giữ mới sẽ giải phóng lượt cũ.
-   Có ghế đã bị người khác giữ/đặt: `409 SEAT_TAKEN` kèm `data.seat_ids`; **không** giữ một phần.
-   `hold_token` cũng được lưu trong session của người giữ.

### 7.2. Bookings

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/bookings` | Tạo đơn từ lượt giữ ghế | Công khai (guest hoặc customer) |
| GET | `/bookings/:booking_code` | Chi tiết đơn | Chủ đơn |
| POST | `/bookings/lookup` | Tra cứu đơn bằng mã + email/SĐT | Công khai |
| GET | `/bookings/mine` | Lịch sử đặt vé của tôi | Customer |
| GET | `/bookings/:booking_code/cancel-preview` | Xem trước số tiền hoàn nếu hủy | Chủ đơn |
| PATCH | `/bookings/:booking_code/cancel` | Hủy đơn theo chính sách | Chủ đơn |

**Create Booking Request**

```json
{
  "trip_id": 21,
  "hold_token": "6f1f0f0e-8a5a-4c2e-9d0b-2a6b9c9b3f11",
  "contact": { "full_name": "Nguyen Van A", "email": "user@example.com", "phone": "0901234567" },
  "pickup_trip_stop_id": 55,
  "dropoff_trip_stop_id": 58,
  "passengers": [
    { "seat_id": 101, "full_name": "Nguyen Van A", "phone": "0901234567" },
    { "seat_id": 102, "full_name": "Tran Thi B", "phone": null }
  ]
}
```

**Create Booking Response `201`**

```json
{ "success": true, "message": "Tạo đơn thành công", "data": {
  "booking_code": "K7M2QX9P", "status": "pending", "total_amount": 500000,
  "expires_at": "2026-12-20T05:11:12+07:00" } }
```

Backend phải kiểm tra:

-   Chuyến còn `active` và chưa khởi hành.
-   `hold_token` còn hiệu lực, thuộc về phiên này và gồm **đúng** tập ghế trong `passengers` (không thừa, không thiếu).
-   Điểm đón/trả thuộc chuyến; `pickup` đứng trước `dropoff` theo `stop_order`/`scheduled_at`.
-   Giá lấy và tính ở backend từ `trips.base_price`; bỏ qua mọi giá từ client.
-   Customer đăng nhập thì `user_id` lấy từ session; guest thì `user_id = NULL` và `booking_code` được lưu vào `session.guestBookings`.
-   Lỗi: `422 HOLD_EXPIRED`, `409 SEAT_TAKEN`, `422 TRIP_NOT_OPEN`, `400/422` validation.

**Lookup Request**

```json
{ "booking_code": "K7M2QX9P", "contact": "user@example.com" }
```

`contact` là email hoặc SĐT liên hệ và phải khớp với đơn. Sai bất kỳ trường nào đều trả cùng `404 BOOKING_NOT_FOUND` ("Không tìm thấy đơn với thông tin đã nhập"), không phân biệt mã sai hay liên hệ sai. Thành công thì cấp quyền xem/hủy đơn đó trong phiên. Dùng `POST` để không đưa mã và email lên URL/log.

**Cancel Preview Response**

```json
{ "success": true, "message": "OK", "data": {
  "booking_code": "K7M2QX9P", "can_cancel": true, "hours_before_departure": 30.5,
  "refund_percent": 100, "refund_amount": 500000, "total_amount": 500000 } }
```

`PATCH .../cancel` nhận `{ "reason": "..." }` (tùy chọn), tính lại hoàn tiền tại thời điểm hủy (không tin số từ preview). Từ chối `422 CANCEL_NOT_ALLOWED` khi chuyến đã `departed` hoặc đơn đã `cancelled`/`expired`. Hủy là thao tác một lần, có CSRF và kết quả không lặp lại tác dụng nếu gọi lại (trả `422`).

### 7.3. Payments (giả lập)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/payments` | Tạo yêu cầu thanh toán cho đơn `pending` | Chủ đơn |
| GET | `/payments/:transaction_code` | Xem kết quả thanh toán | Chủ đơn |
| POST | `/payments/:transaction_code/confirm` | Mô phỏng thanh toán thành công | Chủ đơn |
| POST | `/payments/:transaction_code/fail` | Mô phỏng thanh toán thất bại | Chủ đơn |

**Create Payment Request**

```json
{ "booking_code": "K7M2QX9P", "payment_method": "e_wallet" }
```

Số tiền do backend lấy từ `bookings.total_amount`. Đây là cổng **giả lập** cho đồ án, không kết nối ngân hàng thật.

Endpoint `confirm`/`fail` bắt buộc:

-   Người gọi là **chủ đơn** (mục 3.3); có CSRF.
-   Đơn đang `pending`, `expires_at > now()`, payment đang `pending`; ngược lại `422 PAYMENT_NOT_PENDING`/`HOLD_EXPIRED`.
-   Idempotent: gọi lại `confirm` trên payment đã `success` trả kết quả cũ (`200`), không tạo vé mới.
-   `confirm`: thực hiện transaction ở DATABASE.md 7.4 (ghế `booked`, đơn `confirmed`, tạo vé), rồi gửi email vé.
-   `fail`: payment `failed`, đơn quay về `pending` cho phép thanh toán lại trong hạn giữ ghế; hết hạn thì ghế được giải phóng.

------------------------------------------------------------------------

## 8. Module 5 – Tickets, Check-ins, Reports, Chatbot (Thành viên 5)

### 8.1. Tickets

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/bookings/:booking_code/tickets` | Danh sách vé của đơn `confirmed` | Chủ đơn |
| GET | `/tickets/:ticket_code` | Chi tiết một vé | Chủ đơn |
| GET | `/tickets/:ticket_code/qr` | Ảnh QR của vé (`image/png`, ngoại lệ so với JSON) | Chủ đơn |
| POST | `/bookings/:booking_code/resend-tickets` | Gửi lại email vé tới `contact_email` | Chủ đơn |

Không có `/tickets/lookup`: tra cứu vé đi qua tra cứu đơn (`POST /bookings/lookup`) rồi xem danh sách vé. Nội dung QR gồm `ticket_code` và chữ ký HMAC (DATABASE.md 4.5). Chỉ đơn `confirmed` mới có vé.

### 8.2. Check-ins

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/staff/trips/:id/passengers` | Danh sách hành khách (tên, ghế, điểm đón/trả, trạng thái vé) | Staff* |
| GET | `/staff/trips/:id/check-ins` | Danh sách vé đã check-in | Staff* |
| POST | `/check-ins` | Check-in bằng mã vé/QR | Staff* |
| GET | `/check-ins/:id` | Chi tiết một lượt check-in | Staff*, Admin |

**Check-in Request**

```json
{ "trip_id": 21, "ticket_code": "K7M2QX9P-01" }
```

hoặc `{ "trip_id": 21, "qr_payload": "K7M2QX9P-01.a1b2c3" }`.

Kiểm tra theo thứ tự: chữ ký QR hợp lệ (nếu dùng QR) → vé tồn tại → vé thuộc **đúng chuyến** (`422 TICKET_WRONG_TRIP`) → chuyến `active` và trong khung giờ cho phép (mặc định từ 2 giờ trước giờ khởi hành) → vé `valid` (`409 TICKET_ALREADY_CHECKED_IN` nếu đã dùng; `422 TICKET_CANCELLED`) → người gọi là staff được phân công hoặc admin. Thành công trả `201` kèm tên hành khách và số ghế.

### 8.3. Quản lý đặt chỗ (quản trị)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/admin/bookings` | Danh sách đơn (lọc `status`, `trip_id`, `q` theo mã/email/SĐT, `date_from`, `date_to`) | Admin |
| GET | `/admin/bookings/:booking_code` | Chi tiết đơn, thanh toán, vé | Admin |
| PATCH | `/admin/bookings/:booking_code/cancel` | Hủy đơn (kèm hoàn tiền theo chính sách hoặc `refund_percent` do admin chọn) | Admin |

### 8.4. Reports

Quyền: **Admin**. Tham số chung: `from`, `to` (`YYYY-MM-DD`, giờ Việt Nam), `route_id` (tùy chọn). Báo cáo theo thời gian thêm `group_by` = `day` | `week` | `month`.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/reports/overview` | Tổng doanh thu, số vé bán, tỉ lệ lấp đầy, số đơn theo trạng thái |
| GET | `/admin/reports/revenue` | Doanh thu theo thời gian (`group_by`) và theo tuyến |
| GET | `/admin/reports/bookings` | Số đơn/số vé bán theo thời gian và trạng thái |
| GET | `/admin/reports/trips` | Hiệu suất từng chuyến (số vé, doanh thu, lấp đầy) |
| GET | `/admin/reports/seats` | Tỉ lệ lấp đầy ghế theo tuyến/thời gian |

Quy ước tính: **doanh thu** = tổng `payments.amount − refunded_amount` của payment `success`/`refunded` theo `paid_at`; **vé bán** = số `tickets` có trạng thái `valid`/`checked_in`; **tỉ lệ lấp đầy** = ghế `booked` / tổng ghế bán được (`trip_seats` không `unavailable`) của các chuyến trong khoảng. Mọi báo cáo chỉ đọc.

### 8.5. Chatbot

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/chatbot/messages` | Gửi câu hỏi, nhận trả lời | Công khai |

```json
{ "conversation_id": 8, "message": "Chuyến TP.HCM đi Đà Lạt ngày mai còn vé không?" }
```

`conversation_id` tùy chọn (không có thì tạo mới gắn với phiên). Tin nhắn tối đa 500 ký tự. Chatbot **chỉ đọc**: tìm chuyến (gọi `trips`), tra cứu vé (bắt buộc mã đặt chỗ + email/SĐT như `/bookings/lookup`), trả lời chính sách/FAQ; không đặt, hủy hay thanh toán. Khi trả lời có kết quả chuyến, kèm `data.suggestions` là danh sách liên kết tới trang tìm chuyến.

------------------------------------------------------------------------

## 9. Trang SSR chính (tham khảo)

| Khu vực | Trang | Chủ sở hữu |
|---|---|---|
| Khách | `/` (trang chủ), `/trips` (kết quả tìm), `/trips/:id` (chi tiết), `/news`, `/news/:slug`, `/faqs`, `/policies/:slug` | TV3 / TV2 |
| Đặt vé | `/trips/:id/seats` (chọn ghế), `/checkout` (thông tin + điểm đón/trả), `/payments/:transaction_code` (thanh toán giả lập), `/bookings/:booking_code` (kết quả, vé) | TV4 |
| Tra cứu | `/bookings/lookup` | TV4 |
| Tài khoản | `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/profile`, `/profile/bookings` | TV1 |
| Quản trị | `/admin`, `/admin/stations`, `/admin/trips`, `/admin/bookings`, `/admin/users`, `/admin/reports`... | TV2 (khung) và từng module |
| Nhân viên | `/staff/trips`, `/staff/trips/:id/passengers` | TV5 |

Trang SSR gọi API JSON bằng AJAX cho phần động (ghế, lọc, autocomplete); dữ liệu quan trọng (giá, quyền, trạng thái) luôn do backend quyết định.

------------------------------------------------------------------------

## 10. Mã lỗi (`code`)

| Code | Status | Ý nghĩa |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ (kèm `errors`) |
| `UNAUTHENTICATED` | 401 | Chưa đăng nhập |
| `FORBIDDEN` | 403 | Không có quyền |
| `EMAIL_NOT_VERIFIED` | 403 | Email chưa xác thực |
| `ACCOUNT_LOCKED` | 403 | Tài khoản bị khóa |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu (thông báo chung) |
| `NOT_FOUND` | 404 | Không tìm thấy tài nguyên |
| `BOOKING_NOT_FOUND` | 404 | Tra cứu đơn không khớp |
| `EMAIL_TAKEN` | 409 | Email đã được đăng ký |
| `SEAT_TAKEN` | 409 | Ghế vừa được người khác giữ/đặt (kèm `data.seat_ids`) |
| `BUS_TIME_CONFLICT` | 409 | Xe đã có chuyến trùng giờ |
| `TICKET_ALREADY_CHECKED_IN` | 409 | Vé đã check-in |
| `HOLD_EXPIRED` | 422 | Hết hạn giữ ghế hoặc ghế không còn thuộc đơn |
| `TRIP_NOT_OPEN` | 422 | Chuyến không còn mở bán |
| `INVALID_STATUS_TRANSITION` | 422 | Chuyển trạng thái không hợp lệ |
| `PAYMENT_NOT_PENDING` | 422 | Thanh toán/đơn không ở trạng thái chờ |
| `CANCEL_NOT_ALLOWED` | 422 | Không thể hủy theo chính sách/trạng thái |
| `TICKET_WRONG_TRIP` | 422 | Vé không thuộc chuyến đang check-in |
| `TICKET_CANCELLED` | 422 | Vé đã hủy |
| `CHECKIN_NOT_OPEN` | 422 | Chưa/không trong thời gian check-in |
| `RATE_LIMITED` | 429 | Quá nhiều yêu cầu |
| `INTERNAL_ERROR` | 500 | Lỗi máy chủ (không lộ chi tiết) |

Mã lỗi mới phải thêm vào bảng này trước khi dùng.

------------------------------------------------------------------------

## 11. API Ownership

| Module | Owner | Phối hợp |
|---|---|---|
| Auth & Users | TV1 | Tất cả |
| Catalog & Content, autocomplete | TV2 | TV3, TV4 |
| Trips, phân công nhân viên | TV3 | TV2, TV4 |
| Seats, Bookings, Payments | TV4 | TV1, TV2, TV3, TV5 |
| Tickets, Check-ins, Reports, Chatbot, quản lý đặt chỗ (admin) | TV5 | Tất cả |

Mỗi endpoint chỉ có một owner. Module khác cần dữ liệu thì gọi service, không gọi lại API của module khác qua HTTP.

------------------------------------------------------------------------

## 12. Quy trình thêm hoặc đổi API

1.  Kiểm tra endpoint đã tồn tại chưa.
2.  Xác định module và owner.
3.  Thống nhất endpoint, method, request, response, quyền.
4.  Thêm mã lỗi mới (nếu có) vào mục 10.
5.  Cập nhật API.md (và lịch sử thay đổi).
6.  Kiểm thử thành công và thất bại trước khi tích hợp.

## 13. API Definition of Done

-   [ ] Endpoint đúng quy chuẩn đặt tên và tiền tố.
-   [ ] Request được validation (Joi) ở backend.
-   [ ] Response đúng cấu trúc chung, có `code` khi lỗi.
-   [ ] HTTP status chính xác.
-   [ ] Có authentication/authorization và kiểm tra quyền sở hữu (không chỉ kiểm tra vai trò).
-   [ ] Có CSRF cho request thay đổi dữ liệu; có rate limit nếu thuộc mục 2.9.
-   [ ] Không lộ dữ liệu nhạy cảm hoặc ID tuần tự của đơn/vé/thanh toán.
-   [ ] Giá, trạng thái, quyền do backend quyết định.
-   [ ] Đã kiểm thử thành công, thất bại, và trường hợp đồng thời (nếu liên quan ghế/check-in).
-   [ ] Đã cập nhật API.md.

**END OF API DOCUMENTATION**
