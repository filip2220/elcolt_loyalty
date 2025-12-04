# System Architecture Map - El Colt Loyalty App

**Generated:** 2025-11-20  
**Purpose:** Comprehensive health check and technical audit

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Frontend)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ React 19.2.0 + TypeScript 5.8.2 + Vite 6.2.0          │ │
│  │ Port: Vite Dev Server (default 5173)                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ (JWT Bearer Auth)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (API Server)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Node.js + Express 4.18.2                              │ │
│  │ Port: 8080                                             │ │
│  │ JWT Authentication (jsonwebtoken 9.0.0)               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MySQL2 (3.2.0)
                            │ Connection Pool
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (MySQL/MariaDB)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Host: 188.210.222.87                                   │ │
│  │ Database: srv56797_wp1                                 │ │
│  │ WordPress/WooCommerce Schema                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Map

### User Authentication Flow
```
1. User enters credentials → LoginView.tsx
2. Frontend calls api.login() → services/api.ts
3. POST /api/login → backend/apiRoutes.js
4. Validate against wp_users table (WordPress password hash)
5. Generate JWT token (1 day expiration)
6. Return token → Store in localStorage
7. useAuth hook manages auth state globally
```

### Data Fetching Flow (Protected Routes)
```
1. Component mounts (e.g., DashboardView)
2. useAuth hook provides token
3. API call with Authorization: Bearer {token}
4. authMiddleware.js verifies JWT
5. Extract userId from token payload
6. Query database with userId
7. Return JSON response
8. Component renders data
```

### Database → API → Frontend Component Mapping

| **Frontend Component** | **API Endpoint** | **Database Tables** | **Data Flow** |
|------------------------|------------------|---------------------|---------------|
| `LoginView.tsx` | `POST /api/login` | `wp_users` | Email/password → WordPress hash validation → JWT |
| `DashboardView.tsx` → `LevelCard.tsx` | `GET /api/user/points` | `wp_wlr_users` ← JOIN → `wp_wlr_levels` | userId → userEmail → loyalty data |
| `DashboardView.tsx` → `TotalSavingsCard.tsx` | `GET /api/user/savings` | `wp_wc_order_product_lookup` → `wp_wdr_order_item_discounts` | userId → orderIds → SUM(cart_discount) |
| `ActivityView.tsx` → `ActivityCard.tsx` | `GET /api/user/activity` | `wp_wc_order_product_lookup` ← LEFT JOIN → `wp_posts` | userId → recent orders with product names |
| `RewardsView.tsx` | `GET /api/rewards` (public) | `wp_wlr_rewards` | All active rewards |
| `RewardsView.tsx` | `POST /api/user/redeem` | `wp_wlr_users`, `wp_wlr_rewards`, `wp_wlr_user_rewards` | Transaction: deduct points, create coupon |

---

## 🔧 Technology Stack

### Frontend Stack
| Technology | Version | Status | Notes |
|------------|---------|--------|-------|
| **React** | 19.2.0 | ✅ Latest | Released Dec 2024 - Very new! |
| **TypeScript** | 5.8.2 | ✅ Latest | Latest stable release |
| **Vite** | 6.2.0 | ✅ Latest | Modern build tool |
| **react-dom** | 19.2.0 | ✅ Latest | Matches React version |

**Frontend Dependencies:** NONE (Pure React + TypeScript)

### Backend Stack
| Technology | Version | Status | Notes |
|------------|---------|--------|-------|
| **Node.js** | Runtime | ⚠️ Unknown | Not specified in package.json |
| **Express** | 4.18.2 | ⚠️ Outdated | Current: 4.21.2 (Nov 2024) |
| **mysql2** | 3.2.0 | ⚠️ Outdated | Current: 3.12.0 (Nov 2024) |
| **jsonwebtoken** | 9.0.0 | ⚠️ Outdated | Current: 9.0.2 (security fixes) |
| **cors** | 2.8.5 | ✅ Latest | No updates needed |
| **dotenv** | 16.0.3 | ⚠️ Outdated | Current: 16.4.7 |
| **wordpress-hash-node** | 1.0.0 | ⚠️ Unmaintained | Last update: 2015 |
| **nodemon** (dev) | 2.0.22 | ⚠️ Outdated | Current: 3.1.9 |

---

## 🚨 CRITICAL FINDINGS - Deprecated/EOL Dependencies

### 🔴 HIGH PRIORITY
1. **wordpress-hash-node (v1.0.0)**
   - **Status:** ⚠️ UNMAINTAINED (Last update: 2015 - 9 years old!)
   - **Risk:** Security vulnerabilities, no bug fixes
   - **Impact:** Core authentication system relies on this
   - **Recommendation:** Migrate to `bcrypt` or `@phc/bcrypt` with WordPress hash compatibility layer

2. **jsonwebtoken (v9.0.0)**
   - **Status:** ⚠️ OUTDATED (Missing security patches)
   - **Current:** 9.0.2
   - **Risk:** Known CVEs may exist
   - **Recommendation:** Immediate update to 9.0.2+

### 🟡 MEDIUM PRIORITY
3. **Express (v4.18.2)**
   - **Status:** ⚠️ OUTDATED (2 years behind)
   - **Current:** 4.21.2
   - **Risk:** Missing security patches and performance improvements
   - **Recommendation:** Update to 4.21.x

4. **mysql2 (v3.2.0)**
   - **Status:** ⚠️ OUTDATED (10 minor versions behind)
   - **Current:** 3.12.0
   - **Risk:** Connection pool improvements, bug fixes missed
   - **Recommendation:** Update to 3.12.x

5. **nodemon (v2.0.22)**
   - **Status:** ⚠️ OUTDATED (Dev dependency)
   - **Current:** 3.1.9
   - **Risk:** Low (dev only)
   - **Recommendation:** Update to 3.x

---

## 📁 Project Structure

```
ElColtLoyaltyApp/
├── 📁 backend/                    # Node.js API Server
│   ├── server.js                  # Express app entry point
│   ├── apiRoutes.js               # All API endpoints (386 lines)
│   ├── authMiddleware.js          # JWT verification middleware
│   ├── db.js                      # MySQL connection pool
│   ├── .env                       # ⚠️ EXPOSED CREDENTIALS (see security audit)
│   └── package.json               # Backend dependencies
│
├── 📁 components/                 # React UI Components (11 files)
│   ├── LoginView.tsx              # Auth: Login/Signup form
│   ├── DashboardView.tsx          # Main dashboard layout
│   ├── ActivityView.tsx           # Order history view
│   ├── RewardsView.tsx            # Rewards catalog + redemption
│   ├── Header.tsx                 # Navigation header
│   ├── LevelCard.tsx              # Loyalty level display
│   ├── TotalSavingsCard.tsx       # Savings calculation display
│   ├── ActivityCard.tsx           # Individual activity item
│   ├── Card.tsx                   # Reusable card wrapper
│   ├── Button.tsx                 # Reusable button component
│   └── Spinner.tsx                # Loading spinner
│
├── 📁 hooks/                      # React Custom Hooks
│   └── useAuth.tsx                # Global auth state management
│
├── 📁 services/                   # API Client Layer
│   └── api.ts                     # All backend API calls
│
├── App.tsx                        # Root component + routing
├── types.ts                       # TypeScript type definitions
├── index.tsx                      # React entry point
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Frontend dependencies
```

---

## 🔌 API Endpoints Inventory

### Public Endpoints (No Auth)
| Method | Endpoint | Purpose | Database Tables |
|--------|----------|---------|-----------------|
| GET | `/api/levels` | Get all loyalty levels | `wp_wlr_levels` |
| GET | `/api/rewards` | Get active rewards | `wp_wlr_rewards` |

### Authentication Endpoints
| Method | Endpoint | Purpose | Database Tables |
|--------|----------|---------|-----------------|
| POST | `/api/login` | User login | `wp_users` |
| POST | `/api/signup` | User registration | `wp_users`, `wp_usermeta` |

### Protected Endpoints (Require JWT)
| Method | Endpoint | Purpose | Database Tables |
|--------|----------|---------|-----------------|
| GET | `/api/user/profile` | Get user profile | `wp_users` |
| GET | `/api/user/points` | Get points & level | `wp_wlr_users`, `wp_wlr_levels` |
| GET | `/api/user/activity` | Get order history | `wp_wc_order_product_lookup`, `wp_posts` |
| GET | `/api/user/savings` | Calculate total savings | `wp_wc_order_product_lookup`, `wp_wdr_order_item_discounts` |
| POST | `/api/user/redeem` | Redeem reward | `wp_wlr_users`, `wp_wlr_rewards`, `wp_wlr_user_rewards` |

---

## 🗄️ Database Schema (WordPress/WooCommerce)

### Core WordPress Tables
- `wp_users` - User accounts
- `wp_usermeta` - User metadata (first_name, last_name, billing_phone, wp_capabilities)

### WooCommerce Tables
- `wp_wc_order_product_lookup` - Order line items (optimized lookup table)
- `wp_posts` - Products (post_type = 'product')
- `wp_wdr_order_item_discounts` - Discount tracking

### WooCommerce Loyalty & Rewards Plugin Tables
- `wp_wlr_users` - Loyalty user data (points, level_id)
- `wp_wlr_levels` - Loyalty levels (name, from_points, to_points)
- `wp_wlr_rewards` - Available rewards (name, points_required, status)
- `wp_wlr_user_rewards` - Redeemed rewards history

---

## 🔐 Authentication & Security Architecture

### JWT Flow
1. **Token Generation:** `jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' })`
2. **Token Storage:** `localStorage.setItem('jwt_token', token)`
3. **Token Transmission:** `Authorization: Bearer {token}` header
4. **Token Verification:** `authMiddleware.js` validates on every protected route
5. **Token Expiration:** 24 hours (1 day)

### Password Hashing
- **Method:** WordPress phpass algorithm (via `wordpress-hash-node`)
- **Validation:** `wphash.CheckPassword(password, user.user_pass)`
- **⚠️ Security Concern:** Relies on 9-year-old unmaintained library

---

## 🌐 Environment Configuration

### Backend (.env)
```
DB_HOST=188.210.222.87          # ⚠️ Remote database
DB_USER=srv56797_f              # ⚠️ EXPOSED in file
DB_PASSWORD=Filip123!           # 🚨 CRITICAL: EXPOSED in file
DB_NAME=srv56797_wp1
PORT=8080
JWT_SECRET=sjfhjsfh77748sjdhkfshdfu7377384jhkdfhskd  # ⚠️ Weak entropy
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8080
```

### Hardcoded Configuration
- **API Base URL:** Hardcoded in `services/api.ts` as `http://localhost:8080/api`
- **⚠️ Issue:** No environment-based configuration for production deployment

---

## 📦 Build & Deployment Configuration

### Frontend Build
- **Tool:** Vite
- **Output:** Static files (HTML, JS, CSS)
- **Commands:**
  - `npm run dev` - Development server
  - `npm run build` - Production build
  - `npm run preview` - Preview production build

### Backend Deployment
- **Dockerfile:** ❌ NOT FOUND (README mentions it, but file is missing)
- **Docker Configuration:** README references `Dockerfile.txt` (incorrect extension)
- **Deployment Target:** Google Cloud Run (per README)
- **⚠️ Issue:** Deployment configuration is incomplete/missing

---

## 🎯 Key Architectural Patterns

### Frontend Patterns
✅ **Good:**
- Context API for global auth state (`useAuth`)
- Centralized API client (`services/api.ts`)
- Component composition (Card, Button reusable components)
- TypeScript for type safety

⚠️ **Concerns:**
- No error boundaries for React error handling
- No retry logic for failed API calls
- No request caching or state management library
- Hardcoded API URL (not environment-aware)

### Backend Patterns
✅ **Good:**
- Connection pooling for database
- Transaction support for critical operations (signup, redeem)
- JWT middleware for auth
- Proper HTTP status codes

⚠️ **Concerns:**
- Single monolithic route file (386 lines)
- No input validation library (manual validation)
- No rate limiting
- No request logging middleware
- Global error handler is too generic
- CORS configured to allow all origins (`app.use(cors())`)

---

## 🔄 State Management

### Frontend State
- **Auth State:** `useAuth` context (user, token, points, level)
- **Component State:** Local `useState` hooks
- **Persistence:** `localStorage` for JWT token only

### Backend State
- **Stateless:** JWT-based authentication (no sessions)
- **Database:** Single source of truth

---

## ⚡ Performance Considerations

### Database Queries
✅ **Optimized:**
- LEFT JOIN for points/level (single query)
- Connection pooling (limit: 10)
- Prepared statements (SQL injection protection)

⚠️ **Potential Issues:**
- No query result caching
- No database indexes mentioned
- Dynamic SQL generation for IN clauses (savings endpoint)

### Frontend Performance
⚠️ **Missing:**
- No code splitting
- No lazy loading of components
- No memoization (React.memo, useMemo, useCallback)
- No service worker for offline support

---

## 🔍 Monitoring & Observability

### Logging
⚠️ **Current State:**
- `console.error()` for all errors
- No structured logging
- No log aggregation
- No request ID tracking

### Error Handling
⚠️ **Current State:**
- Generic error messages to client
- No error tracking service (Sentry, etc.)
- No health check endpoint

---

## 📋 Summary: Architecture Health Score

| Category | Score | Status |
|----------|-------|--------|
| **Technology Stack** | 6/10 | ⚠️ Outdated dependencies |
| **Security** | 4/10 | 🚨 Critical issues (exposed credentials, unmaintained libs) |
| **Code Organization** | 7/10 | ✅ Good structure, needs refactoring |
| **Performance** | 6/10 | ⚠️ Missing optimizations |
| **Scalability** | 5/10 | ⚠️ Monolithic backend, no caching |
| **Maintainability** | 7/10 | ✅ TypeScript helps, but needs documentation |
| **Deployment Readiness** | 4/10 | 🚨 Missing Docker config, hardcoded URLs |

**Overall Health: 5.6/10 - NEEDS ATTENTION**

---

## 🚀 Next Steps

**PAUSE FOR CONFIRMATION:** Please review this architecture map and confirm:
1. ✅ Is the data flow mapping accurate?
2. ✅ Are there any missing components or endpoints?
3. ✅ Should we proceed to Phase 2 (Parallel Specialist Audits)?

Once confirmed, I will spawn 4 specialized audit agents to perform deep dives into:
- Frontend (UX & Performance)
- Backend (Logic & Data)
- Security (Vulnerabilities & Auth)
- DevOps (Infrastructure & CI/CD)
