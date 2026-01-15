-- Tạo các database cho từng service
CREATE DATABASE identity_db;
CREATE DATABASE classroom_db;
CREATE DATABASE attendance_db;
CREATE DATABASE leave_db;
CREATE DATABASE notification_db;
CREATE DATABASE reporting_db;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE identity_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE classroom_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE leave_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE reporting_db TO postgres;
