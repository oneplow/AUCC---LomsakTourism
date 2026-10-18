-- Lomsak Tourism Database Schema
CREATE DATABASE IF NOT EXISTS lomsak_tourism CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lomsak_tourism;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Places
CREATE TABLE IF NOT EXISTS places (
  place_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  history TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  open_time TIME,
  close_time TIME,
  open_days VARCHAR(20) NULL COMMENT 'วันเปิด เช่น 0,6 (0=อาทิตย์ ... 6=เสาร์), NULL = เปิดทุกวัน',
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- Place Images
CREATE TABLE IF NOT EXISTS place_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  place_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE
);

-- Users (admin / staff)
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  email VARCHAR(100),
  role ENUM('admin', 'staff') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Staff Permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  place_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_place (user_id, place_id)
);

-- Place Visits
CREATE TABLE IF NOT EXISTS place_visits (
  visit_id INT AUTO_INCREMENT PRIMARY KEY,
  place_id INT NOT NULL,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE
);

-- Trip Plans
CREATE TABLE IF NOT EXISTS trip_plans (
  trip_id INT AUTO_INCREMENT PRIMARY KEY,
  days INT,
  budget DECIMAL(10, 2),
  place_types VARCHAR(255),
  plan_result JSON,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- Seed Data
-- ================================

-- Default Categories
INSERT INTO categories (name) VALUES
('วัดและศาสนสถาน'),
('น้ำตกและธรรมชาติ'),
('จุดชมวิว'),
('แหล่งเรียนรู้'),
('ตลาดและชุมชน'),
('ที่พักและรีสอร์ท');

-- Default Admin User (password: admin123)
INSERT INTO users (username, password, full_name, email, role) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ', 'admin@lomsak.go.th', 'admin');

-- Sample Places
INSERT INTO places (category_id, name, description, history, address, latitude, longitude, open_time, close_time, phone) VALUES
(1, 'วัดผาซ่อนแก้ว', 'วัดที่ตั้งอยู่บนเนินเขา ประดับด้วยเศษกระเบื้องสีสันสวยงาม เป็นสถานที่ท่องเที่ยวยอดนิยมของเพชรบูรณ์', 'สร้างขึ้นโดยพระอาจารย์สรยุทธ ชยปัญโญ เพื่อเป็นสถานที่ปฏิบัติธรรมและสถานที่ท่องเที่ยวเชิงวัฒนธรรม', 'ตำบลแคมป์สน อำเภอเขาค้อ จังหวัดเพชรบูรณ์', 16.7167, 101.0500, '06:00', '17:00', '056-910-055'),
(2, 'น้ำตกตาดหมอก', 'น้ำตกที่ซ่อนตัวอยู่ในป่าลึก มีความสวยงามเป็นเอกลักษณ์ น้ำใสไหลผ่านหน้าผาหินสูง', 'เป็นน้ำตกธรรมชาติในเขตอุทยานแห่งชาติน้ำหนาว พื้นที่อุดมสมบูรณ์ด้วยพันธุ์ไม้นานาชนิด', 'อุทยานแห่งชาติน้ำหนาว อำเภอหล่มสัก จังหวัดเพชรบูรณ์', 16.7333, 101.5667, '08:00', '16:30', '056-789-012'),
(3, 'ภูทับเบิก', 'จุดชมวิวทะเลหมอกที่สูงที่สุดในเพชรบูรณ์ เป็นจุดหมายยอดนิยมโดยเฉพาะในช่วงฤดูหนาว', 'เดิมเป็นพื้นที่ทำไร่ของชาวเขาเผ่าม้ง ต่อมาพัฒนาเป็นแหล่งท่องเที่ยวที่มีชื่อเสียงระดับประเทศ', 'ตำบลวังบาล อำเภอหล่มเก่า จังหวัดเพชรบูรณ์', 16.8833, 101.1167, '00:00', '23:59', '086-555-1234'),
(4, 'อุทยานแห่งชาติน้ำหนาว', 'ผืนป่าอนุรักษ์ขนาดใหญ่ เต็มไปด้วยพันธุ์พืชและสัตว์ป่าหายาก อากาศเย็นสบายตลอดปี', 'ได้รับการประกาศเป็นอุทยานแห่งชาติ เมื่อปี พ.ศ. 2515 เป็นส่วนหนึ่งของเทือกเขาเพชรบูรณ์', 'ตำบลน้ำหนาว อำเภอน้ำหนาว จังหวัดเพชรบูรณ์', 16.7500, 101.5500, '06:00', '18:00', '056-779-456'),
(5, 'ตลาดเช้าหล่มสัก', 'ตลาดเช้าสดของอำเภอหล่มสัก มีอาหารพื้นเมือง ผักสด ผลไม้ และของฝากมากมาย', 'เป็นตลาดที่อยู่คู่ชุมชนหล่มสักมาอย่างยาวนาน สะท้อนวิถีชีวิตและวัฒนธรรมท้องถิ่น', 'ถนนสฤษดิ์เดช ตำบลหล่มสัก อำเภอหล่มสัก จังหวัดเพชรบูรณ์', 16.7858, 101.2511, '05:00', '10:00', '056-701-234');

-- Sample Place Images
INSERT INTO place_images (place_id, image_url) VALUES
(1, 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800'),
(2, 'https://images.unsplash.com/photo-1504214208698-ea446addcf77?w=800'),
(3, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'),
(4, 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800'),
(5, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800');

-- ================================
-- Migration: วันเปิดของสถานที่ (สำหรับฐานข้อมูลเดิมที่สร้างไว้ก่อน)
-- ================================
-- ALTER TABLE places ADD COLUMN open_days VARCHAR(20) NULL AFTER close_time;
-- UPDATE places SET open_days = '6' WHERE name LIKE '%ถนนคนเดิน%';  -- ตัวอย่าง: เปิดเฉพาะวันเสาร์
