# Architecture Documentation

## Application Overview

Lomsak Tourism is a full-stack web application built with Next.js 15 using the App Router architecture. The application follows a modern, server-first approach with API routes handling business logic and data operations.

### Architecture Pattern

- **Frontend:** Server-Side Rendering (SSR) with Client Components for interactivity
- **Backend:** Next.js API Routes (RESTful architecture)
- **Database:** MySQL with connection pooling
- **Authentication:** JWT-based with HTTP-only cookies
- **State Management:** React Hooks and Server Components

## Directory Structure

```
src/
├── app/                          # Next.js 15 App Router
│   ├── layout.js                # Root layout (global navigation, fonts)
│   ├── page.js                  # Homepage (hero, featured places)
│   ├── globals.css              # Global styles & design system
│   │
│   ├── login/                   # Authentication
│   │   └── page.js             # Login form
│   │
│   ├── places/                  # Public place browsing
│   │   ├── page.js             # Place listing with filters
│   │   └── [id]/
│   │       └── page.js         # Place detail page
│   │
│   ├── trip-planner/            # AI trip planning
│   │   └── page.js             # Trip planner interface
│   │
│   ├── share/                   # Shared trip plans
│   │   └── [id]/
│   │       └── page.js         # View shared trip
│   │
│   ├── staff/                   # Staff dashboard (protected)
│   │   ├── layout.js           # Staff layout with navigation
│   │   ├── page.js             # Staff dashboard
│   │   ├── places/
│   │   │   └── page.js         # Manage assigned places
│   │   ├── reports/
│   │   │   └── page.js         # View statistics
│   │   └── profile/
│   │       └── page.js         # Edit profile
│   │
│   ├── admin/                   # Admin dashboard (protected)
│   │   ├── layout.js           # Admin layout with navigation
│   │   ├── page.js             # Admin dashboard
│   │   ├── places/
│   │   │   └── page.js         # Manage all places
│   │   ├── categories/
│   │   │   └── page.js         # Manage categories
│   │   ├── users/
│   │   │   └── page.js         # Manage users & permissions
│   │   └── reports/
│   │       └── page.js         # Full analytics
│   │
│   └── api/                     # API Routes
│       ├── auth/               # Authentication endpoints
│       │   ├── login/
│       │   │   └── route.js   # POST: Login
│       │   ├── logout/
│       │   │   └── route.js   # POST: Logout
│       │   ├── me/
│       │   │   └── route.js   # GET: Current user
│       │   └── profile/
│       │       └── route.js   # PUT: Update profile
│       │
│       ├── places/             # Place management
│       │   ├── route.js       # GET: List, POST: Create
│       │   └── [id]/
│       │       ├── route.js   # GET: Detail, PUT: Update, DELETE: Delete
│       │       ├── images/
│       │       │   └── route.js # POST: Upload, DELETE: Remove
│       │       └── visit/
│       │           └── route.js # POST: Record visit
│       │
│       ├── categories/         # Category management
│       │   ├── route.js       # GET: List, POST: Create
│       │   └── [id]/
│       │       └── route.js   # PUT: Update, DELETE: Delete
│       │
│       ├── users/              # User management
│       │   ├── route.js       # GET: List, POST: Create
│       │   └── [id]/
│       │       ├── route.js   # PUT: Update, DELETE: Delete
│       │       └── reset-password/
│       │           └── route.js # POST: Reset password
│       │
│       ├── staff-permissions/  # Permission management
│       │   └── route.js       # GET: List, POST: Assign, DELETE: Revoke
│       │
│       ├── reports/            # Analytics
│       │   └── route.js       # GET: Statistics
│       │
│       └── trip-planner/       # AI trip planning
│           └── route.js       # POST: Generate plan
│
├── components/                  # Reusable React components
│   ├── Navbar.js               # Navigation bar with user menu
│   ├── Footer.js               # Footer with links
│   ├── PlaceCard.js            # Place card display
│   ├── MapView.js              # Single place map (Leaflet)
│   ├── TripRouteMap.js         # Multi-place route map
│   └── Select.js               # Custom select dropdown
│
├── lib/                         # Utility libraries
│   ├── auth.js                 # Authentication helpers
│   └── db.js                   # Database connection pool
│
└── middleware.js                # Route protection middleware
```

## Component Hierarchy

### Public Pages
```
Layout (Root)
├── Navbar
├── Page Content
│   ├── Homepage
│   │   ├── Hero Section
│   │   ├── Featured Places (PlaceCard[])
│   │   └── Trip Planner CTA
│   ├── Places
│   │   ├── Search Bar
│   │   ├── Category Filters
│   │   └── Place Grid (PlaceCard[])
│   ├── Place Detail
│   │   ├── Image Gallery
│   │   ├── Info Section
│   │   ├── MapView
│   │   └── QR Code
│   └── Trip Planner
│       ├── Planning Form
│       ├── AI Results
│       └── TripRouteMap
└── Footer
```

### Admin/Staff Dashboards
```
Dashboard Layout
├── Sidebar Navigation
├── Header (User info, logout)
└── Content Area
    ├── Dashboard Cards
    ├── Data Tables
    ├── Forms (Create/Edit)
    └── Charts/Reports
```

## API Routes Structure

### RESTful Conventions

```
GET     /api/resource          # List all
POST    /api/resource          # Create new
GET     /api/resource/[id]     # Get one
PUT     /api/resource/[id]     # Update
DELETE  /api/resource/[id]     # Delete
POST    /api/resource/[id]/action  # Custom action
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### Authentication Flow

```
1. User submits credentials
   ↓
2. POST /api/auth/login
   ↓
3. Verify credentials (bcrypt)
   ↓
4. Generate JWT token
   ↓
5. Set HTTP-only cookie
   ↓
6. Return user data
   ↓
7. Redirect to dashboard
```

### Protected Route Flow

```
1. Request to /admin or /staff
   ↓
2. Middleware checks cookie
   ↓
3. If no token → redirect to /login
   ↓
4. If valid token → allow access
   ↓
5. Page loads → API call with cookie
   ↓
6. API uses requireAuth() helper
   ↓
7. Verify token & role
   ↓
8. Return data or 401/403
```

### Permission Check Flow

```
Staff modifying place:
1. POST /api/places/[id]
   ↓
2. requireAuth(['admin', 'staff'])
   ↓
3. If staff → check staff_permissions table
   ↓
4. If not authorized → 403
   ↓
5. If authorized → proceed with update
```

## Database Schema

### Entity Relationship

```
users (1) ────< (N) staff_permissions (N) >──── (1) places
                                                    │
                                                    │ (1)
                                                    │
                                                    ├─< (N) place_images
                                                    │
                                                    ├─< (N) place_visits
                                                    │
                                                    └─> (1) categories
```

### Key Tables

**users**
- Primary authentication table
- Stores admin and staff accounts
- Password hashed with bcrypt
- Role-based access (admin, staff)

**places**
- Core content table
- Linked to categories
- Geographic coordinates for maps
- Opening hours information

**place_images**
- Multiple images per place
- Cascade delete with place

**place_visits**
- Analytics tracking
- Records each QR scan
- Timestamp-based

**staff_permissions**
- Junction table
- Controls staff access to specific places
- Unique constraint on user_id + place_id

**categories**
- Classification system
- Can be deleted (places.category_id becomes NULL)

**trip_plans**
- Stores AI-generated plans
- JSON format for flexibility
- Used for sharing via /share/[id]

## Authentication System

### JWT Token Structure

```javascript
{
  user_id: 123,
  username: "admin",
  role: "admin",
  full_name: "ผู้ดูแลระบบ",
  iat: 1234567890,
  exp: 1235172690  // 7 days later
}
```

### Security Features

1. **Password Hashing:** bcrypt with salt rounds = 10
2. **HTTP-only Cookies:** Prevents XSS attacks
3. **Token Expiration:** 7 days lifetime
4. **Role-Based Access Control (RBAC)**
5. **Middleware Protection:** Auto-redirect unauthorized users
6. **API-level Authorization:** Double-check on sensitive operations

### Helper Functions (lib/auth.js)

- `hashPassword(password)` - Hash plaintext password
- `comparePassword(password, hash)` - Verify password
- `signToken(payload)` - Generate JWT
- `verifyToken(token)` - Validate JWT
- `getAuthUser()` - Get current user from cookie
- `requireAuth(roles)` - Protect API routes

## Data Flow Examples

### Creating a Place (Staff)

```
1. Staff fills form on /staff/places
2. Client-side validation
3. POST /api/places with JSON body
4. requireAuth(['admin', 'staff']) checks token
5. If staff → verify they have permission
6. INSERT INTO places
7. Return new place_id
8. Upload images via POST /api/places/[id]/images
9. Refresh page with new data
```

### Viewing Place Statistics

```
1. Admin accesses /admin/reports
2. Component loads
3. GET /api/reports with auth cookie
4. requireAuth(['admin']) checks role
5. Query:
   - Total places
   - Total visits
   - Visits per place (JOIN)
   - Recent visits
6. Return aggregated data
7. Render charts and tables
```

### Trip Planning with AI

```
1. User fills trip planner form
2. POST /api/trip-planner with:
   - days, budget, start_time, end_time, place_types
3. Query places matching criteria
4. Send prompt to Google Gemini API
5. AI generates itinerary
6. Parse response
7. INSERT INTO trip_plans
8. Return trip_id and plan_result (JSON)
9. Display on map with TripRouteMap
10. Generate shareable link /share/[trip_id]
```

### QR Code Check-in

```
1. User scans QR code at place
2. QR contains URL: /places/[id]?checkin=true
3. Page loads place detail
4. If checkin param → POST /api/places/[id]/visit
5. INSERT INTO place_visits
6. Show success message
7. Increment visit counter
```

## External Integrations

### Google Generative AI (Gemini)

**Purpose:** Generate trip itineraries

**Integration:**
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const result = await model.generateContent(prompt);
```

**Prompt Structure:**
- User preferences (days, budget, time, types)
- Available places with details
- Request structured itinerary

### Leaflet Maps

**Purpose:** Display place locations and routes

**Components:**
- `MapView`: Single marker for place detail
- `TripRouteMap`: Multiple markers with route polyline

**Features:**
- Custom markers
- Tooltips with place names
- Route calculation
- Responsive zoom

### QR Code Generation

**Library:** `qrcode`

**Usage:**
```javascript
import QRCode from 'qrcode';

const url = `${baseURL}/places/${place_id}?checkin=true`;
const qrDataURL = await QRCode.toDataURL(url);
```

**Display:** Embedded as `<img src={qrDataURL} />`

## Performance Optimizations

### Database
- Connection pooling (max 10 connections)
- Keep-alive connections
- Indexed columns: primary keys, foreign keys
- Efficient JOIN queries

### Frontend
- Server Components by default (reduced JS bundle)
- Client Components only when needed (interactivity)
- Image optimization with Next.js Image
- Font preloading (LINE Seed Sans TH)

### Caching
- Static assets cached by browser
- API responses fresh (no cache headers)
- Connection pool reuse

## Security Considerations

1. **SQL Injection Prevention:** Parameterized queries with mysql2
2. **XSS Prevention:** React escapes by default, HTTP-only cookies
3. **CSRF Protection:** SameSite cookies
4. **Authentication:** JWT with secure secret
5. **Authorization:** Role checks on every API call
6. **Input Validation:** Server-side validation on all endpoints
7. **Error Handling:** Generic error messages (no stack traces to client)

## Deployment Considerations

### Environment Variables
- Never commit `.env` file
- Set production values in hosting platform
- Use strong JWT_SECRET in production
- Secure database credentials

### Database
- Regular backups
- SSL connection in production
- Separate read replicas for analytics (optional)

### Application
- Build optimization: `npm run build`
- Process manager: PM2 or similar
- Reverse proxy: Nginx
- SSL certificate: Let's Encrypt

### Monitoring
- Error logging
- Performance monitoring
- Database query analysis
- User analytics

## Future Enhancements

### Potential Features
- Multi-language support (EN, TH)
- Mobile app (React Native)
- Real-time notifications
- Advanced analytics dashboard
- Image upload to cloud storage (S3, Cloudinary)
- Social media integration
- Review and rating system
- Booking system integration
- Weather API integration
- Offline mode (PWA)

### Technical Improvements
- Redis caching layer
- GraphQL API option
- Microservices architecture for scaling
- CDN for static assets
- Automated testing (Jest, Playwright)
- CI/CD pipeline
- Docker containerization
- Kubernetes orchestration

---

**Last Updated:** 2026-10-05  
**Version:** 1.0.0
