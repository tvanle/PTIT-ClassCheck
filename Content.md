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

## 11) Anti-cheating System (điểm cộng lớn)

### Rotating QR Code
* QR code thay đổi mỗi 10-15 giây
* Sinh viên không thể chụp gửi cho bạn bè
* Implementation: Server generate JWT token ngắn hạn, encode vào QR

### Geofencing
* Kiểm tra GPS sinh viên có trong bán kính lớp học (50-100m)
* Kết hợp với WiFi BSSID của trường để verify location
* Fallback: Nếu indoor không có GPS, dùng WiFi fingerprint

### Device Fingerprint
* Mỗi sinh viên đăng ký tối đa 2 device
* Lưu device_id, model, OS version
* Cảnh báo nếu điểm danh từ device lạ


**Anti-cheat DB schema:**
```sql
device_registrations(id, student_id, device_id, device_name, os, registered_at, status)
checkin_verifications(id, record_id, gps_lat, gps_lng, distance_to_class, wifi_bssid, device_id, face_match_score, verified)
```

---

## 12) Real-time Features

### WebSocket cho Live Updates
* Teacher thấy danh sách điểm danh cập nhật realtime
* Live counter: "15/45 sinh viên đã điểm danh"
* Notification toast khi có SV mới check-in

### Server-Sent Events (SSE)
* Lightweight hơn WebSocket cho one-way updates
* Dashboard cập nhật số liệu realtime

### Implementation
* Socket.IO (Node.js) hoặc Spring WebSocket
* Redis Pub/Sub để broadcast giữa các instance

---

## 13) Smart Alert & Prediction System

### Rule-based Alerts
* Vắng 3 buổi → Email cảnh báo sinh viên
* Vắng 5 buổi → Email CTSV + Cố vấn học tập
* Vắng 20% tổng buổi → Cảnh báo cấm thi

### ML-based Prediction (nâng cao)
* Dự đoán sinh viên có nguy cơ vắng nhiều dựa trên:
  * Lịch sử điểm danh
  * Pattern vắng (hay vắng thứ 2, tiết đầu...)
* Model: Simple classification (Random Forest / Logistic Regression)

### Trend Analysis
* Phát hiện pattern: "SV này hay vắng tiết 1-2 thứ 2"
* Heatmap: Giờ nào lớp hay vắng nhất
* So sánh tỷ lệ chuyên cần giữa các lớp

**Alert DB schema:**
```sql
alert_rules(id, name, condition_type, threshold, action_type, recipient_roles, enabled)
alert_history(id, rule_id, student_id, class_id, triggered_at, action_taken, status)
prediction_scores(id, student_id, class_id, risk_score, factors_json, calculated_at)
```

---

## 14) Calendar & Reminder Integration

### Google Calendar / Outlook Sync
* Export lịch học sang calendar cá nhân
* Auto-update khi có thay đổi phòng/giờ

### Push Notifications
* Nhắc trước 15 phút: "Bạn có tiết Kiến trúc hướng dịch vụ lúc 13:00"
* Nhắc nộp đơn xin nghỉ trước deadline
* Thông báo kết quả duyệt đơn

### Implementation
* Firebase Cloud Messaging (FCM) cho mobile
* Web Push API cho browser
* Scheduler: Bull Queue (Node.js) / Quartz (Java)

---

## 15) Audit Trail & Compliance

### Comprehensive Logging
* Log mọi thao tác CRUD
* Ai sửa điểm danh, lúc nào, từ IP nào, giá trị cũ → mới
* Không cho phép xóa cứng, chỉ soft-delete

### Export & Reporting
* Export báo cáo theo template phòng đào tạo
* Format: Excel, PDF với chữ ký số
* Lưu trữ lịch sử báo cáo đã xuất

### Data Retention
* Giữ data tối thiểu 5 năm theo quy định
* Archive data cũ sang cold storage

**Audit DB schema:**
```sql
audit_logs(id, entity_type, entity_id, action, old_value, new_value, user_id, ip_address, user_agent, created_at)
export_history(id, report_type, params_json, file_url, exported_by, exported_at)
```

---

## 16) API Gateway & Resilience

### Rate Limiting
* Giới hạn request/phút theo user/IP
* Chống spam điểm danh, brute force

### Circuit Breaker
* Khi 1 service die, không kéo sập cả hệ thống
* Fallback response cho critical paths
* Library: Resilience4j (Java) / Polly (.NET) / opossum (Node.js)

### Distributed Tracing
* Trace request từ Gateway → các services
* Tools: Jaeger / Zipkin / OpenTelemetry
* Correlation ID cho mỗi request

### Health Checks
* Liveness & Readiness probes
* Dashboard monitoring: Grafana + Prometheus

---

## 17) Caching Strategy

### Redis Cache
* Cache thông tin lớp, danh sách SV (ít thay đổi)
* Cache QR token validation
* Session storage cho JWT

### Cache Invalidation
* Event-driven invalidation khi data thay đổi
* TTL-based cho data ít quan trọng
* Cache-aside pattern

### Caching layers
```
Client → CDN (static) → API Gateway (response cache) → Redis → Database
```

---

## 18) Kiến trúc tổng quan (Updated)

```
                         ┌─────────────┐
                         │   Nginx /   │
                         │   Traefik   │
                         └──────┬──────┘
                                │
                    ┌───────────▼───────────┐
                    │      API Gateway      │
                    │  (Kong / Spring GW)   │
                    │  - Rate Limiting      │
                    │  - Auth Validation    │
                    │  - Circuit Breaker    │
                    └───────────┬───────────┘
                                │
     ┌──────────┬───────────┬───┴────┬───────────┬──────────┐
     │          │           │        │           │          │
┌────▼────┐┌────▼────┐┌─────▼─────┐┌─▼─────┐┌────▼────┐┌────▼────┐
│Identity ││Classroom││Attendance ││ Leave ││Reporting││  Notif  │
│ Service ││ Service ││  Service  ││Service││ Service ││ Service │
└────┬────┘└────┬────┘└─────┬─────┘└───┬───┘└────┬────┘└────┬────┘
     │          │           │          │         │          │
     │     ┌────┴────┐ ┌────┴────┐     │         │          │
     │     │ Redis   │ │ Redis   │     │         │          │
     │     │ (cache) │ │(QR tok) │     │         │          │
     │     └─────────┘ └─────────┘     │         │          │
     │          │           │          │         │          │
┌────▼────┐┌────▼────┐┌─────▼─────┐┌───▼───┐┌────▼────┐┌────▼────┐
│   DB    ││   DB    ││    DB     ││  DB   ││   DB    ││   DB    │
│Identity ││Classroom││Attendance ││ Leave ││Reporting││  Notif  │
└─────────┘└─────────┘└───────────┘└───────┘└─────────┘└─────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Message Broker      │
                    │   (RabbitMQ/Kafka)    │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Monitoring Stack    │
                    │ Prometheus + Grafana  │
                    │ Jaeger (Tracing)      │
                    │ ELK (Logging)         │
                    └───────────────────────┘
```

---

## 19) Tech Stack chi tiết

| Layer | Technology | Lý do chọn |
|-------|------------|------------|
| API Gateway | Kong / Spring Cloud Gateway | Plugin ecosystem, rate limit built-in |
| Backend | NestJS (TypeScript) | Type-safe, microservice support tốt |
| Database | PostgreSQL | ACID, JSON support, mature |
| Cache | Redis | Fast, pub/sub, session store |
| Message Broker | RabbitMQ | Dễ setup, đủ cho BTL |
| Real-time | Socket.IO | Cross-platform, fallback support |
| Push Notification | Firebase FCM | Free, reliable |
| File Storage | MinIO / S3 | S3-compatible, self-hosted được |
| Monitoring | Prometheus + Grafana | Industry standard |
| Tracing | Jaeger | OpenTelemetry compatible |
| Logging | ELK Stack | Powerful search & visualize |
| Container | Docker + Docker Compose | Easy local dev |
| Orchestration | Kubernetes (optional) | Production-ready scaling |

---

## 20) Deployment Architecture

### Development (Docker Compose)
```yaml
services:
  - api-gateway
  - identity-service
  - classroom-service
  - attendance-service
  - leave-service
  - notification-service
  - reporting-service
  - postgres (multi-db)
  - redis
  - rabbitmq
  - prometheus
  - grafana
```

### Production (Kubernetes)
* Helm charts cho mỗi service
* HPA (Horizontal Pod Autoscaler) cho auto-scaling
* Ingress controller cho routing
* Secrets management với Vault
* CI/CD: GitHub Actions → ArgoCD

---

## 21) Security Checklist

- [ ] JWT với short expiry + refresh token rotation
- [ ] HTTPS everywhere (TLS 1.3)
- [ ] Input validation & sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CORS configuration
- [ ] Rate limiting per user/IP
- [ ] Brute force protection (account lockout)
- [ ] Sensitive data encryption at rest
- [ ] Audit logging for compliance
- [ ] Dependency vulnerability scanning
- [ ] Container image scanning

---

## 22) Demo Scenarios (để thuyết trình)

### Scenario 1: QR Điểm danh với Anti-cheat
1. GV mở phiên điểm danh → QR hiện lên, xoay mỗi 10s
2. SV scan QR → App check GPS/Device → Điểm danh thành công
3. SV khác thử chụp QR cũ → Fail (token expired)
4. Dashboard GV thấy realtime: 30/45 đã điểm danh

### Scenario 2: Xin nghỉ có phê duyệt
1. SV tạo đơn xin nghỉ 2 buổi, đính kèm giấy khám bệnh
2. GV nhận notification, vào duyệt đơn
3. Approve → Attendance auto update "excused"
4. SV nhận thông báo đơn đã duyệt
5. Report cập nhật: tỷ lệ chuyên cần không bị ảnh hưởng

### Scenario 3: Cảnh báo tự động
1. SV vắng 3 buổi liên tiếp
2. System trigger alert → Email SV
3. Admin/CTSV xem dashboard alerts
4. ML model flag SV này "high risk"

---

## 23) Estimation & Milestones

### Phase 1: Core (MVP)
* Identity + Classroom + Attendance Service
* Basic QR điểm danh (không rotating)
* PostgreSQL + RabbitMQ setup

### Phase 2: Leave & Notification
* Leave Service với approval workflow
* Email notification
* Event-driven integration

### Phase 3: Advanced Features
* Rotating QR + Geofencing
* Real-time WebSocket
* Reporting dashboard

### Phase 4: Polish
* Audit logging
* Monitoring stack
* Security hardening
* Docker Compose hoàn chỉnh

---