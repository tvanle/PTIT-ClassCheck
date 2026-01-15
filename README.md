# PTIT ClassCheck - Hệ thống Quản lý Điểm danh Microservices

Hệ thống quản lý điểm danh và xin nghỉ cho sinh viên, xây dựng theo kiến trúc Microservices.

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (:3000)                       │
│                    (Auth, Rate Limiting, Routing)                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        │           │           │           │           │
   ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
   │Identity │ │Classroom│ │Attendance│ │  Leave  │ │Reporting│
   │ :3001   │ │  :3002  │ │  :3003   │ │  :3004  │ │  :3006  │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │           │
        └───────────┴───────────┼───────────┴───────────┘
                                │
                    ┌───────────▼───────────┐
                    │       RabbitMQ        │
                    │    (Event Bus)        │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Notification       │
                    │       :3005           │
                    └───────────────────────┘
```

## 📦 Services

| Service | Port | Mô tả |
|---------|------|-------|
| API Gateway | 3000 | Routing, Auth validation, Rate limiting |
| Identity Service | 3001 | Authentication, User management, JWT |
| Classroom Service | 3002 | Courses, Classes, Sessions, Enrollments |
| Attendance Service | 3003 | QR điểm danh, Records, WebSocket realtime |
| Leave Service | 3004 | Đơn xin nghỉ, Phê duyệt workflow |
| Notification Service | 3005 | Email, Push notifications |
| Reporting Service | 3006 | Thống kê, Cảnh báo, Dashboard |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Chạy với Docker Compose

```bash
# Clone repository
git clone <repository-url>
cd PTIT-ClassCheck

# Chạy toàn bộ stack
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

### Chạy Development (không Docker)

```bash
# Install dependencies
npm install

# Chạy từng service (trong các terminal riêng)
npm run start:dev:identity
npm run start:dev:classroom
npm run start:dev:attendance
npm run start:dev:leave
npm run start:dev:notification
npm run start:dev:reporting
npm run start:dev:gateway
```

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/register     - Đăng ký
POST   /api/v1/auth/login        - Đăng nhập
POST   /api/v1/auth/refresh      - Refresh token
POST   /api/v1/auth/logout       - Đăng xuất
GET    /api/v1/auth/me           - Thông tin user hiện tại
```

### Classroom
```
GET    /api/v1/courses           - Danh sách môn học
POST   /api/v1/courses           - Tạo môn học
GET    /api/v1/classes           - Danh sách lớp
POST   /api/v1/classes           - Tạo lớp
GET    /api/v1/classes/:id/sessions      - Lịch học của lớp
POST   /api/v1/classes/:id/sessions      - Tạo buổi học
POST   /api/v1/classes/:id/enrollments   - Thêm sinh viên vào lớp
```

### Attendance
```
POST   /api/v1/attendance/sessions/open          - Mở phiên điểm danh
PATCH  /api/v1/attendance/sessions/:id/close     - Đóng phiên
GET    /api/v1/attendance/sessions/:id/qr        - Lấy QR code
POST   /api/v1/attendance/sessions/:id/checkin   - Điểm danh (sinh viên)
GET    /api/v1/attendance/sessions/:id/records   - Danh sách điểm danh
```

### Leave Requests
```
POST   /api/v1/leave-requests                    - Tạo đơn xin nghỉ
GET    /api/v1/leave-requests/my-requests        - Đơn của tôi
GET    /api/v1/leave-requests?classId=&status=   - Danh sách đơn (GV)
PATCH  /api/v1/leave-requests/:id/approve        - Duyệt đơn
PATCH  /api/v1/leave-requests/:id/reject         - Từ chối đơn
```

### Reports
```
GET    /api/v1/reports/classes/:classId/attendance       - Báo cáo điểm danh lớp
GET    /api/v1/reports/students/:studentId/attendance    - Điểm danh của sinh viên
GET    /api/v1/reports/alerts                            - Danh sách cảnh báo
```

## 🔐 Authentication Flow

1. User đăng nhập qua `/auth/login`
2. Nhận `accessToken` (15 phút) và `refreshToken` (7 ngày)
3. Gửi `Authorization: Bearer <accessToken>` cho mọi request
4. Khi token hết hạn, dùng `/auth/refresh` để lấy token mới

## 📱 QR Điểm danh Flow

1. **Giảng viên** mở phiên điểm danh → Hệ thống tạo QR code
2. QR code **xoay mỗi 15 giây** (chống chụp gửi)
3. **Sinh viên** scan QR → Gửi checkin request
4. Hệ thống validate: token + time + enrollment
5. Ghi nhận điểm danh `present/late/absent`
6. **Realtime update** qua WebSocket

## 🔔 Event-Driven Architecture

```
AttendanceCheckedIn  → Notification + Reporting
LeaveRequestCreated  → Notification (GV)
LeaveRequestApproved → Attendance (update excused) + Notification (SV)
LeaveRequestRejected → Notification (SV)
EnrollmentImported   → Reporting (init summary)
```

## 📊 Database per Service

| Service | Database | Tables |
|---------|----------|--------|
| Identity | identity_db | users, profiles, refresh_tokens |
| Classroom | classroom_db | courses, classes, sessions, enrollments |
| Attendance | attendance_db | attendance_sessions, attendance_records, device_registrations |
| Leave | leave_db | leave_requests, leave_session_map |
| Notification | notification_db | notifications |
| Reporting | reporting_db | attendance_summary, alerts |

## 🛠️ Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Message Broker**: RabbitMQ
- **Realtime**: Socket.IO
- **Container**: Docker

## 📁 Project Structure

```
PTIT-ClassCheck/
├── docker-compose.yml
├── package.json
├── tsconfig.base.json
├── libs/
│   ├── common/          # Shared utilities, guards, decorators
│   ├── dto/             # Shared DTOs
│   └── events/          # Event definitions
└── services/
    ├── api-gateway/     # API Gateway
    ├── identity-service/
    ├── classroom-service/
    ├── attendance-service/
    ├── leave-service/
    ├── notification-service/
    └── reporting-service/
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 📝 License

MIT License
