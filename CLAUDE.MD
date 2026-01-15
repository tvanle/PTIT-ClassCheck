Được. Dưới đây là bản “làm to” đề tài **Hệ thống Quản lý điểm danh + xin nghỉ** theo **microservices** (đủ để làm BTL: use case, services, DB, API, event, saga, deploy).

---

## 1) Bài toán & phạm vi

**Mục tiêu:** hỗ trợ lớp học/khóa học (trường/TT) quản lý:

* Điểm danh theo buổi (có thể QR/Code/Manual)
* Xin nghỉ (có duyệt/từ chối)
* Thống kê chuyên cần, cảnh báo vắng quá số buổi
* Thông báo realtime (email/app)
* Phân quyền: admin/giảng viên/sinh viên

**Actors**

* Admin đào tạo
* Giảng viên
* Sinh viên
* (Tùy chọn) Phòng CTSV / Trợ giảng

---

## 2) Use cases chính

1. Admin tạo học kỳ, môn, lớp, lịch học (sessions)
2. Import danh sách sinh viên vào lớp
3. Giảng viên mở “phiên điểm danh” cho buổi học
4. Sinh viên điểm danh:

   * QR trong X phút, hoặc GPS/Wifi (optional), hoặc giảng viên tick tay
5. Sinh viên tạo đơn xin nghỉ (chọn buổi / khoảng ngày, lý do, đính kèm)
6. Giảng viên/CTSV duyệt / từ chối (có comment)
7. Tự động cập nhật trạng thái chuyên cần + cảnh báo
8. Báo cáo: theo lớp, theo sinh viên, theo tuần/tháng
9. Notification: xác nhận đã điểm danh, kết quả duyệt nghỉ, cảnh báo vắng

---

## 3) Đề xuất kiến trúc Microservices

### Core services (đủ BTL)

1. **Identity Service**

* Auth (JWT), RBAC (Admin/Teacher/Student)
* Profile cơ bản

2. **Classroom Service**

* Quản lý môn/lớp, danh sách SV, giảng viên, phân công
* Lịch học (sessions)

3. **Attendance Service**

* Phiên điểm danh, record điểm danh
* Quy tắc: late/absent/excused/present

4. **Leave Service**

* Đơn xin nghỉ + trạng thái duyệt
* Đính kèm (file metadata)

5. **Notification Service**

* Gửi email/push/in-app
* Template + retry

6. **Reporting Service**

* Read model tổng hợp: chuyên cần, tỷ lệ vắng, top absent
* Dashboard queries nhanh

### Optional (nếu muốn nâng level)

* **File Service** (lưu minh chứng nghỉ học)
* **Policy/Rule Service** (ngưỡng cảnh báo, quy định vắng)
* **Audit/Log Service** (lịch sử thao tác)
* **Gateway/API Composition** (BFF cho web/app)

---

## 4) Database per service (tách riêng)

### Identity DB

* users(id, email, password_hash, role, status)
* profiles(user_id, full_name, student_code, teacher_code, ...)

### Classroom DB

* courses(id, code, name, credits)
* classes(id, course_id, term, group, teacher_id)
* enrollments(id, class_id, student_id, status)
* sessions(id, class_id, date, start_time, end_time, room, session_no)

### Attendance DB

* attendance_sessions(id, session_id, opened_by, open_time, close_time, method, qr_token, status)
* attendance_records(id, session_id, student_id, status[present/late/absent/excused], checkin_time, source, note)

### Leave DB

* leave_requests(id, student_id, class_id, from_session_id?, to_session_id?, reason, attachment_url?, status[pending/approved/rejected], reviewer_id, reviewer_comment, created_at)
* leave_session_map(id, leave_request_id, session_id) (nếu xin nghỉ nhiều buổi)

### Notification DB

* notifications(id, user_id, type, title, content, status, created_at, sent_at, retry_count)

### Reporting DB (read model)

* attendance_summary(student_id, class_id, total_sessions, present, late, absent, excused, attendance_rate, last_updated)
* alerts(id, student_id, class_id, type, threshold, triggered_at, status)

---

## 5) API thiết kế (REST) – mẫu đủ dùng

### Identity Service

* POST `/auth/login` → JWT
* POST `/auth/refresh`
* GET `/users/me`
* GET `/users/{id}` (admin/teacher)

### Classroom Service

* POST `/classes` (admin)
* POST `/classes/{classId}/enrollments/import` (admin)
* GET `/classes/{classId}`
* GET `/classes/{classId}/sessions`
* POST `/classes/{classId}/sessions` (tạo lịch)

### Attendance Service

* POST `/attendance/sessions/open`
  body: `{sessionId, method: QR|MANUAL, durationMinutes}`
* POST `/attendance/sessions/{attendanceSessionId}/checkin`
  body: `{studentId, qrToken?, deviceInfo?}`
* PATCH `/attendance/records/{id}` (teacher sửa status)
* GET `/attendance/classes/{classId}/sessions/{sessionId}/records`

### Leave Service

* POST `/leave-requests`
  body: `{classId, sessionIds[], reason, attachmentUrl?}`
* GET `/leave-requests?classId=&status=`
* PATCH `/leave-requests/{id}/approve` `{comment}`
* PATCH `/leave-requests/{id}/reject` `{comment}`

### Reporting Service

* GET `/reports/classes/{classId}/attendance`
* GET `/reports/students/{studentId}/attendance?term=`
* GET `/reports/alerts?classId=`

---

## 6) Event-driven (điểm cộng microservice)

Dùng Kafka/RabbitMQ.

**Events gợi ý**

* `AttendanceCheckedIn` (Attendance → Reporting/Notification)
* `AttendanceSessionClosed`
* `LeaveRequestCreated` (Leave → Notification)
* `LeaveRequestApproved` / `LeaveRequestRejected` (Leave → Attendance/Reporting/Notification)
* `EnrollmentImported` (Classroom → Reporting init)

**Luồng quan trọng: Leave approved → cập nhật Attendance**

* Khi đơn nghỉ được duyệt, Attendance Service nhận event `LeaveRequestApproved` và set các buổi đó thành `excused` (nếu chưa có record) hoặc overwrite theo rule.

---

## 7) Saga / đảm bảo nhất quán

Ví dụ **“Duyệt đơn nghỉ”** (Orchestration tại Leave Service):

1. Leave Service set status `approved`
2. Publish `LeaveRequestApproved`
3. Attendance Service cập nhật records → publish `AttendanceExcusedUpdated`
4. Reporting Service cập nhật summary
5. Notification Service gửi thông báo

**Outbox pattern** (điểm cộng): mỗi service ghi event vào bảng `outbox_events` cùng transaction DB rồi worker bắn ra broker.

---

## 8) Luồng QR điểm danh (demo rất dễ ăn điểm)

* Teacher “Open attendance” → Attendance Service tạo `qr_token`, set open/close time
* Student scan QR → app gọi `/checkin` kèm `qr_token`
* Attendance validate:

  * token đúng + trong thời gian + student có enrollment
* Ghi record `present/late`
* Emit `AttendanceCheckedIn` → notify + update report

Rule late: nếu check-in sau `start_time + X phút` thì `late`.

---

## 9) UI tối thiểu (để thuyết trình)

* **Teacher web**

  * Danh sách lớp → buổi hôm nay → Open QR → xem danh sách check-in realtime → đóng phiên
  * Tab “Leave requests” để duyệt
* **Student mobile/web**

  * Lịch học → Scan QR → trạng thái
  * Form xin nghỉ + xem kết quả duyệt
* **Admin**

  * Tạo lớp, import SV, xem báo cáo tổng

---

## 10) Công nghệ gợi ý (dễ triển khai BTL)

* Backend: Spring Boot / Node.js (NestJS) / .NET
* DB: Postgres (mỗi service 1 schema/db)
* Broker: RabbitMQ (setup nhanh)
* API Gateway: Kong / Nginx / Spring Cloud Gateway
* Docker Compose: chạy full stack local
* Auth: JWT + refresh token

---