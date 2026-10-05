# Lomsak Tourism - ระบบจัดการการท่องเที่ยวหล่มสัก

## 📋 ภาพรวมโปรเจกต์

ระบบจัดการข้อมูลสถานที่ท่องเที่ยวสำหรับอำเภอหล่มสัก จังหวัดเพชรบูรณ์ ออกแบบมาเพื่อช่วยให้นักท่องเที่ยวสามารถค้นหาสถานที่ท่องเที่ยว วางแผนการเดินทาง และดูข้อมูลต่างๆ ได้อย่างสะดวก พร้อมระบบจัดการสำหรับเจ้าหน้าที่และผู้ดูแลระบบ

### วัตถุประสงค์
- ส่งเสริมการท่องเที่ยวในอำเภอหล่มสักและพื้นที่ใกล้เคียง
- จัดการข้อมูลสถานที่ท่องเที่ยวอย่างเป็นระบบ
- ให้บริการวางแผนการเดินทางด้วย AI
- ติดตามสถิติการเข้าชมสถานที่ท่องเที่ยว
- แบ่งปันข้อมูลการท่องเที่ยวผ่าน QR Code

## 🛠️ Tech Stack

- **Frontend Framework:** Next.js 15.5.14 (App Router)
- **React:** 19.1.0
- **Styling:** Tailwind CSS v4 with custom design system
- **Database:** MySQL with mysql2 (v3.20.0)
- **Authentication:** JWT with bcryptjs
- **Maps:** Leaflet & React Leaflet
- **AI Trip Planning:** Google Generative AI (Gemini)
- **QR Code:** qrcode library
- **Icons:** Lucide React

## 📦 Prerequisites

ก่อนเริ่มต้น ต้องแน่ใจว่าได้ติดตั้งสิ่งเหล่านี้แล้ว:

- **Node.js:** 18.x or higher
- **MySQL:** 8.0 or higher
- **npm:** 9.x or higher

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd LomsakTourism
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

สร้างฐานข้อมูล MySQL และ import schema:

```bash
mysql -u root -p < schema.sql
```

หรือสร้างด้วยตนเอง:
- สร้างฐานข้อมูลชื่อ `lomsak_tourism`
- รันคำสั่ง SQL ในไฟล์ `schema.sql`

ฐานข้อมูลจะมีข้อมูลเริ่มต้น:
- User: `admin` / Password: `admin123` (role: admin)
- Categories และ sample places

### 4. Environment Variables Setup

คัดลอกไฟล์ `.env.example` เป็น `.env`:

```bash
cp .env.example .env
```

แก้ไขค่าต่างๆ ในไฟล์ `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lomsak_tourism

# JWT Secret
JWT_SECRET=your-secret-key-change-this

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key
```

## 🏃 Development Commands

### Start Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

## 📁 Project Structure Overview

```
LomsakTourism/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard
│   │   ├── staff/             # Staff dashboard
│   │   ├── api/               # API routes
│   │   ├── places/            # Public place pages
│   │   ├── trip-planner/      # Trip planner
│   │   └── login/             # Authentication
│   ├── components/            # Reusable components
│   ├── lib/                   # Utilities (auth, db)
│   └── middleware.js          # Route protection
├── public/font/               # LINE Seed Sans TH
├── schema.sql                 # Database schema
└── .env.example               # Environment template
```

## 🎨 Design System

### Colors

- **Primary:** `#285943` (เขียวป่า)
- **Accent:** `#b96545` (ส้มอิฐ)
- **Gold:** `#b58a4a`
- **Background:** `#f7f4ee`
- **Surface:** `#fffdf9`

### Fonts

**LINE Seed Sans TH** - ฟอนต์ภาษาไทยที่รองรับน้ำหนัก 100-900

## 👥 User Roles

### 1. Public (นักท่องเที่ยว)
- ดูรายการสถานที่ท่องเที่ยว
- ค้นหาและกรองสถานที่
- ใช้ Trip Planner วางแผนด้วย AI
- แชร์แผนผ่าน QR Code
- Scan QR Code บันทึกการเข้าชม

### 2. Staff (เจ้าหน้าที่)
- จัดการสถานที่ที่ได้รับมอบหมาย
- อัปโหลดรูปภาพ
- ดูรายงานสถิติ
- แก้ไขโปรไฟล์

### 3. Admin (ผู้ดูแลระบบ)
- จัดการทุกอย่างในระบบ
- จัดการผู้ใช้และหมวดหมู่
- มอบหมายสิทธิ์ให้ Staff
- ดูรายงานทั้งหมด

---

**Documentation:** ดูรายละเอียดเพิ่มเติมใน `docs/ARCHITECTURE.md`

