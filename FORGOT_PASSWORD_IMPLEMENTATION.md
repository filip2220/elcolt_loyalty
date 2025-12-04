# Forgot Password Feature - Implementation Summary

## ✅ What Has Been Implemented

### 1. **Backend API Endpoints** (✅ Complete)

#### `/api/forgot-password` (POST)
- Generates a secure random token
- Stores token in database with 1-hour expiration
- Sends password reset email to user
- Returns success message (prevents user enumeration)

#### `/api/reset-password` (POST)
- Validates reset token
- Checks token expiration
- Updates user password with WordPress-compatible hash
- Marks token as used
- Cleans up old tokens

**Files Modified:**
- `backend/apiRoutes.js` - Added both endpoints with full error handling
- Added `crypto` and `nodemailer` imports

### 2. **Frontend Components** (✅ Complete)

#### `ForgotPasswordModal.tsx`
- Modal dialog for requesting password reset
- Email input with validation
- Loading states and error handling
- Auto-closes after successful submission
- Success/error message display

#### `ResetPasswordView.tsx`
- Full-page view for resetting password
- Extracts token from URL query parameter
- Password confirmation validation
- Minimum 8 character requirement
- Auto-redirects to login after success

#### `LoginView.tsx` (Updated)
- Added "Zapomniałeś hasła?" link (only on login, not signup)
- Integrated ForgotPasswordModal
- Maintains existing login/signup functionality

### 3. **Routing** (✅ Complete)

#### `App.tsx` (Updated)
- Added React Router (BrowserRouter)
- Created `/reset-password` route
- Maintains existing app structure
- Handles 404 redirects

### 4. **API Service Layer** (✅ Complete)

#### `services/api.ts` (Updated)
- `forgotPassword(email)` - Request password reset
- `resetPassword(token, newPassword)` - Reset password with token

### 5. **Dependencies Installed** (✅ Complete)

**Frontend:**
- `react-router-dom` - For routing to reset password page

**Backend:**
- `nodemailer` - For sending password reset emails

## 📋 Setup Required

### 1. Database Setup

You need to create the password reset tokens table. Run this SQL command:

```sql
CREATE TABLE IF NOT EXISTS wp_password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES wp_users(ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Environment Variables

Add these to `backend/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.elcolt.pl
SMTP_PORT=587
SMTP_USER=info@elcolt.pl
SMTP_PASS=your-email-password
SMTP_FROM=info@elcolt.pl
FRONTEND_URL=http://localhost:5173
```

**Getting SMTP Settings:**

Contact your email hosting provider or check your hosting control panel (e.g., cPanel) for:
- **SMTP Host:** Usually `smtp.elcolt.pl`, `mail.elcolt.pl`, or your hosting provider's SMTP server
- **SMTP Port:** Typically `587` (TLS) or `465` (SSL)
- **Credentials:** Your email account username and password

**Common hosting providers:**
- **cPanel:** Email Accounts → Configure Mail Client
- **Plesk:** Mail → Email Addresses → Settings
- **Custom hosting:** Contact your provider's support team

### 3. Restart Backend Server

After adding environment variables, restart the backend:
```bash
cd backend
npm run dev
```


## 🔄 User Flow

1. **User clicks "Zapomniałeś hasła?"** on login page
2. **Modal opens** asking for email
3. **User enters email** and clicks "Wyślij link"
4. **Email sent** with reset link (if SMTP configured)
5. **User clicks link** in email → redirected to `/reset-password?token=...`
6. **User enters new password** (twice for confirmation)
7. **Password reset** → auto-redirect to login page
8. **User logs in** with new password

## 🔒 Security Features

✅ **Token Security:**
- Cryptographically secure random tokens (32 bytes)
- 1-hour expiration
- Single-use only (marked as used after reset)
- Stored securely in database

✅ **User Enumeration Prevention:**
- Always returns same success message regardless of email existence
- Doesn't reveal if email is registered

✅ **Password Validation:**
- Minimum 8 characters
- Confirmation required
- WordPress-compatible hashing

✅ **Database Security:**
- Foreign key constraints
- Automatic cleanup of old tokens
- Indexed for performance

## 🧪 Testing

### Without Email (Development)

If SMTP is not configured, the backend will log the reset token and URL to console:

```
⚠️ SMTP not configured. Password reset token: abc123...
Reset URL: http://localhost:5173/reset-password?token=abc123...
```

You can copy this URL and test manually.

### With Email (Production)

1. Click "Zapomniałeś hasła?" on login
2. Enter your email
3. Check your inbox for reset email
4. Click the button or link in email
5. Enter new password
6. Verify you can login with new password

### API Testing (cURL)

**Request Reset:**
```bash
curl -X POST http://localhost:8080/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Reset Password:**
```bash
curl -X POST http://localhost:8080/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN","newPassword":"NewPassword123"}'
```

## 📁 Files Created/Modified

### Created:
- ✅ `components/ForgotPasswordModal.tsx`
- ✅ `components/ResetPasswordView.tsx`
- ✅ `FORGOT_PASSWORD_SETUP.md`
- ✅ `FORGOT_PASSWORD_IMPLEMENTATION.md` (this file)

### Modified:
- ✅ `backend/apiRoutes.js` - Added 2 new endpoints
- ✅ `services/api.ts` - Added 2 new API functions
- ✅ `components/LoginView.tsx` - Added forgot password link and modal
- ✅ `App.tsx` - Added React Router and reset password route

## 🎨 UI/UX Features

- **Dark theme** matching existing app design
- **Polish language** throughout
- **Loading states** with spinners
- **Error handling** with user-friendly messages
- **Success feedback** with auto-close/redirect
- **Responsive design** works on mobile and desktop
- **Accessibility** with proper ARIA labels

## ⚠️ Important Notes

1. **Database table must be created** before using the feature
2. **SMTP must be configured** for production use
3. **Frontend URL** must be set correctly in `.env`
4. **Tokens expire after 1 hour** - users must act quickly
5. **One-time use** - tokens cannot be reused

## 🚀 Next Steps

1. **Create database table** (see SQL above)
2. **Configure SMTP** in `backend/.env`
3. **Test the flow** end-to-end
4. **Consider adding:**
   - Rate limiting on forgot password endpoint
   - Email template customization
   - Password strength meter
   - Multi-language support for emails

## 📞 Support

If you encounter issues:
- Check backend console for error messages
- Verify database table exists
- Confirm SMTP credentials are correct
- Check email spam folder
- Verify `FRONTEND_URL` matches your actual URL

---

**Implementation Date:** 2025-12-01  
**Status:** ✅ Complete - Ready for testing after database setup
