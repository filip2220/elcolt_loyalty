# 🔍 Comprehensive Code Audit Prompt for El Colt Loyalty App

**Instructions for AI Code Builder:** Review and audit the ElColtLoyaltyApp codebase against the criteria outlined below. For each section, provide:
1. **Findings** (specific issues with file paths and line numbers)
2. **Severity** (CRITICAL / HIGH / MEDIUM / LOW)
3. **Recommendations** (actionable fixes with code examples where applicable)
4. **Priority Score** (1-10, with 10 being most urgent)

---

## 📂 Application Overview

This is a **React + Vite + TypeScript** frontend paired with a **Node.js + Express** backend loyalty/rewards application for a WooCommerce-based business. The app integrates with a WordPress/WooCommerce database and handles:
- User authentication (signup/login with email or phone)
- Loyalty points tracking and level progression
- Reward redemption with coupon generation
- QR code generation for user identification
- Shopping cart and checkout flows
- Order history and activity tracking

### Technology Stack
- **Frontend:** React 19, TypeScript, Vite, react-router-dom v7, qrcode.react
- **Backend:** Node.js, Express, MySQL2, JWT, bcrypt, wordpress-hash-node, nodemailer
- **Database:** WordPress/WooCommerce MySQL (el1users, el1usermeta, el1wlr_users, etc.)
- **Deployment:** Docker-ready with environment-based configuration

---

## 🔒 1. SECURITY AUDIT

### 1.1 Authentication & Authorization
Review the following aspects:

- [ ] **JWT Implementation** (`backend/apiRoutes.js`, `backend/authMiddleware.js`)
  - Token generation security (expiration, signing algorithm)
  - Token storage on frontend (localStorage vs httpOnly cookies)
  - Token refresh mechanism (if any)
  - JWT secret strength and entropy

- [ ] **Password Security** (`backend/apiRoutes.js`: `checkPassword`, `verifyViaHttp`)
  - Hashing algorithms used (bcrypt vs WordPress phpass)
  - Salt generation and storage
  - Password complexity requirements
  - Brute force protection (rate limiting on `/api/login`)
  - Timing attack vulnerabilities in password comparison

- [ ] **Session Management**
  - Token expiration handling
  - Logout invalidation (is token blacklisted?)
  - Concurrent session handling

- [ ] **Authorization Checks** (`backend/authMiddleware.js`)
  - Verify `verifyToken` middleware protects all sensitive routes
  - Check for privilege escalation vulnerabilities
  - User ID validation in protected routes

### 1.2 Input Validation & Sanitization
- [ ] **SQL Injection** (`backend/apiRoutes.js`)
  - Are all database queries using parameterized statements?
  - Check for any string concatenation in SQL queries
  - Validate the phone number login query (lines ~301-331)

- [ ] **Cross-Site Scripting (XSS)**
  - How is user input rendered in React components?
  - Are there any `dangerouslySetInnerHTML` usages?
  - HTML entity encoding for user-generated content

- [ ] **API Input Validation**
  - Is there schema validation for request bodies? (e.g., Joi, Zod)
  - Validate all incoming parameters in routes
  - Check for missing validation in `/api/signup`, `/api/login`, `/api/checkout/*`

### 1.3 CORS & Network Security
- [ ] **CORS Configuration** (`backend/server.js`)
  - Is CORS properly restricted to allowed origins?
  - Credentials support configuration
  - Headers and methods allowed

- [ ] **HTTPS Enforcement**
  - Is HTTPS required in production?
  - Secure cookie flags

- [ ] **Rate Limiting** (`backend/server.js`)
  - Are sensitive endpoints rate-limited?
  - Login, password reset, redemption endpoints
  - API abuse prevention

### 1.4 Sensitive Data Exposure
- [ ] **Environment Variables** (`backend/.env`, `.env.local`)
  - Are all secrets properly externalized?
  - No hardcoded credentials in code
  - Git history checked for exposed secrets

- [ ] **Error Messages**
  - Do error responses leak sensitive information?
  - Stack traces hidden in production
  - Database error details sanitized

- [ ] **Logging**
  - Are sensitive fields redacted from logs?
  - Password, tokens, personal data not logged

### 1.5 Dependency Vulnerabilities
- [ ] **npm audit** for `package.json` and `backend/package.json`
  - Known CVEs in dependencies
  - Outdated packages with security patches
  - Lock file integrity

---

## 🏗️ 2. CODE STRUCTURE & ARCHITECTURE AUDIT

### 2.1 Backend Architecture (`backend/`)
- [ ] **File Organization**
  - Is `apiRoutes.js` (1667 lines) too large?
  - Should routes be split into separate modules?
  - Proposal: `routes/auth.routes.js`, `routes/user.routes.js`, `routes/rewards.routes.js`, etc.

- [ ] **Separation of Concerns**
  - Business logic mixed with route handlers?
  - Need for service layer (e.g., `services/rewards.service.js`)?
  - Database access abstraction (repository pattern)?

- [ ] **Middleware Organization**
  - Authentication middleware placement
  - Error handling middleware
  - Request logging middleware

- [ ] **Configuration Management** (`backend/config.js`)
  - Environment validation completeness
  - Different configs for dev/staging/production

### 2.2 Frontend Architecture (`components/`, `services/`, `hooks/`)
- [ ] **Component Structure**
  - Are components appropriately sized and focused?
  - Component naming conventions
  - Separation of container vs presentational components

- [ ] **State Management** (`hooks/useAuth.tsx`, `hooks/useCart.tsx`)
  - Context API usage patterns
  - State updates and re-render efficiency
  - Global vs local state decisions

- [ ] **API Service Layer** (`services/api.ts`)
  - Error handling consistency
  - Request/response typing
  - API versioning preparation

- [ ] **Type Safety** (`types.ts`)
  - Complete type definitions for all data structures
  - Use of `any` types (should be eliminated)
  - Interface vs type consistency

### 2.3 Code Quality
- [ ] **DRY Principle Violations**
  - Duplicate code across components
  - Utility functions that could be extracted
  - Repeated API call patterns

- [ ] **Naming Conventions**
  - Consistent file naming (PascalCase for components)
  - Variable and function naming clarity
  - Hungarian notation or prefixes (if any)

- [ ] **Comments & Documentation**
  - JSDoc comments for functions
  - Complex logic documentation
  - API endpoint documentation

- [ ] **Error Handling Patterns**
  - Consistent error handling across backend routes
  - Frontend error boundaries
  - User-friendly error messages

---

## ⚡ 3. PERFORMANCE & EFFICIENCY AUDIT

### 3.1 Frontend Performance
- [ ] **React Rendering Optimization**
  - Usage of `React.memo()` for pure components
  - `useMemo()` for expensive computations
  - `useCallback()` for stable callback references
  - Check: `LevelCard.tsx`, `ActivityCard.tsx`, `RewardsView.tsx`, `SalesView.tsx`

- [ ] **Bundle Size**
  - Vite build configuration (`vite.config.ts`)
  - Tree shaking effectiveness
  - Code splitting and lazy loading for views
  - Unnecessary dependencies

- [ ] **API Call Optimization**
  - Duplicate API calls between components (e.g., `getLevels()`)
  - Data caching strategy
  - Request deduplication
  - Pagination implementation

- [ ] **Rendering Performance**
  - List virtualization for long lists (activity, orders)
  - Image lazy loading
  - Suspense boundaries for loading states

### 3.2 Backend Performance
- [ ] **Database Query Efficiency**
  - N+1 query problems
  - Index usage in frequently queried columns
  - Query result limiting (pagination)
  - Connection pool configuration (`backend/db.js`)

- [ ] **Response Optimization**
  - Response payload size (over-fetching)
  - Data selection (only needed fields)
  - Response compression (gzip)

- [ ] **Memory Management**
  - Connection pool limits
  - Memory leaks in long-running processes
  - Proper resource cleanup (`finally` blocks)

- [ ] **Caching Strategy**
  - Static data caching (levels, rewards)
  - Redis or in-memory caching for frequent queries
  - Cache invalidation strategy

### 3.3 Network Performance
- [ ] **API Design**
  - Endpoint consolidation opportunities
  - Batch endpoints for multiple resources
  - GraphQL consideration for complex queries

- [ ] **Request Compression**
  - Accept-Encoding headers
  - Response compression middleware

---

## 🔧 4. RELIABILITY & ERROR HANDLING AUDIT

### 4.1 Error Handling
- [ ] **Backend Error Handling**
  - Try-catch blocks in all async handlers
  - Transaction rollback on errors
  - Consistent error response format
  - HTTP status code accuracy

- [ ] **Frontend Error Handling**
  - API error catching and display
  - Network failure handling
  - Retry logic for failed requests
  - Error boundaries for component crashes

### 4.2 Database Operations
- [ ] **Transaction Safety**
  - All multi-step operations use transactions
  - Proper commit/rollback handling
  - Deadlock prevention

- [ ] **Connection Management**
  - Pool connection release after use
  - Connection leak prevention
  - Timeout handling

### 4.3 Logging & Monitoring
- [ ] **Backend Logging** (`morgan` configured)
  - Request/response logging
  - Error logging with context
  - Structured logging format (JSON)
  - Log levels (debug, info, warn, error)

- [ ] **Frontend Error Tracking**
  - Error reporting to monitoring service
  - User session context
  - Breadcrumb trails

---

## ♿ 5. ACCESSIBILITY (A11Y) AUDIT

### 5.1 WCAG Compliance
- [ ] **Semantic HTML**
  - Proper use of heading hierarchy (h1, h2, h3)
  - Landmark elements (nav, main, aside)
  - Button vs anchor usage

- [ ] **ARIA Attributes**
  - ARIA labels for interactive elements
  - ARIA live regions for dynamic content
  - Role attributes where needed

- [ ] **Keyboard Navigation**
  - All interactive elements focusable
  - Focus management in modals/dialogs
  - Skip-to-content links
  - Tab order logic

- [ ] **Color Contrast**
  - Text contrast ratios (WCAG AA: 4.5:1)
  - Focus indicator visibility
  - Error state colors

### 5.2 Form Accessibility
- [ ] **Form Labels**
  - All inputs have associated labels
  - Required field indicators
  - Error message association

- [ ] **Form Validation**
  - Accessible error announcements
  - Focus management on errors
  - Clear validation feedback

---

## 🧪 6. TESTING & QUALITY ASSURANCE AUDIT

### 6.1 Test Coverage
- [ ] **Unit Tests**
  - Backend route handlers
  - Frontend components
  - Utility functions
  - Custom hooks

- [ ] **Integration Tests**
  - API endpoint testing
  - Database operation testing
  - Authentication flow testing

- [ ] **End-to-End Tests**
  - Critical user journeys
  - Signup/login flows
  - Reward redemption flow
  - Checkout flow

### 6.2 Code Quality Tools
- [ ] **Linting**
  - ESLint configuration
  - TypeScript strict mode
  - Consistent code style

- [ ] **Type Checking**
  - TypeScript configuration (`tsconfig.json`)
  - Strict null checks
  - Type coverage

---

## 🚀 7. DEPLOYMENT & OPERATIONS AUDIT

### 7.1 Docker Configuration
- [ ] **Dockerfile** (`backend/Dockerfile`)
  - Multi-stage builds
  - Non-root user
  - Security scanning
  - Health checks

### 7.2 Environment Configuration
- [ ] **Environment Variables**
  - All required vars documented
  - Example files provided
  - Validation on startup

### 7.3 Build Process
- [ ] **Production Build**
  - Minification and optimization
  - Source maps handling
  - Asset hashing for cache busting

---

## 📋 8. SPECIFIC FILES TO AUDIT

### High Priority Files
| File | Lines | Audit Focus |
|------|-------|-------------|
| `backend/apiRoutes.js` | ~1667 | Security, structure, performance |
| `backend/authMiddleware.js` | ~45 | Authentication security |
| `backend/db.js` | ~30 | Connection pooling, error handling |
| `backend/server.js` | ~100 | CORS, middleware, error handling |
| `services/api.ts` | ~280 | Type safety, error handling |
| `hooks/useAuth.tsx` | ~100 | Token management, security |
| `components/LoginView.tsx` | ~400 | Input validation, security |
| `components/RewardsView.tsx` | ~950 | Performance, security |
| `components/CartView.tsx` | ~600 | Security, data handling |

### Medium Priority Files
| File | Audit Focus |
|------|-------------|
| `components/Header.tsx` | Navigation, accessibility |
| `components/SalesView.tsx` | Performance, rendering |
| `components/QRCodeView.tsx` | Data handling |
| `hooks/useCart.tsx` | State management |
| `types.ts` | Type completeness |

---

## 📊 9. EXPECTED AUDIT OUTPUT

Please structure your audit report as follows:

### Executive Summary
- Overall security score (1-10)
- Overall code quality score (1-10)
- Overall performance score (1-10)
- Critical issues count
- High priority issues count

### Detailed Findings (per category)
For each issue found:
```markdown
### [CATEGORY]-[NUMBER]: [Issue Title]
**Severity:** CRITICAL | HIGH | MEDIUM | LOW
**Location:** `file/path.js:line-number`
**Description:** Clear explanation of the issue
**Impact:** What could go wrong
**Recommendation:** Specific fix with code example
**Priority:** 1-10
```

### Prioritized Action Items
1. Immediate (fix within 24 hours)
2. Short-term (fix within 1 week)
3. Medium-term (fix within 1 month)
4. Long-term (architectural improvements)

### Code Examples
Provide before/after code examples for critical fixes.

### Security Checklist Summary
- [ ] All critical security issues addressed
- [ ] All high security issues addressed
- [ ] Rate limiting implemented
- [ ] Input validation complete
- [ ] Authentication hardened

---

## 🎯 10. AUDIT SCOPE BOUNDARIES

### In Scope
- All files in `backend/` directory (excluding `node_modules`)
- All files in `components/` directory
- All files in `services/` directory
- All files in `hooks/` directory
- All files in `utils/` directory
- Root configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`)
- Type definitions (`types.ts`)
- Main application files (`App.tsx`, `index.tsx`, `index.html`)

### Out of Scope
- `node_modules/` directories
- `dist/` build output
- `.git/` directory
- Test utility files (`test-*.js`, `debug-*.js`, `fix-*.js`)
- Documentation files (`*.md`)

---

## ⏱️ Previous Audit Reference

Note: A previous audit was conducted (see `comprehensive_audit_report.md` and `SECURITY_FIXES.md`). This new audit should:
1. Verify that previous critical issues have been addressed
2. Identify any NEW issues since the last audit
3. Check for regressions in previously fixed areas
4. Update security/quality scores based on current state

---

**Audit Date:** [To be filled by auditor]
**Auditor:** AI Code Builder
**Version Audited:** Check `package.json` version
