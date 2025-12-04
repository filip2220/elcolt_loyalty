# Forgot Password Feature - Implementation Guide

## Overview
This document describes the "Forgot Password" functionality for the El Colt Loyalty App.

## Database Setup

### Step 1: Create Password Reset Tokens Table

Run the following SQL command in your database:

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

## Backend Configuration

### Environment Variables

Add the following to your `backend/.env` file:

```env
# Email Configuration (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:5173
```

**Note:** For Gmail, you'll need to create an App Password:
1. Go to Google Account settings
2. Security → 2-Step Verification → App passwords
3. Generate a new app password for "Mail"

### Install Required Package

Run in the `backend` directory:

```bash
npm install nodemailer
```

## API Endpoints

### POST /api/forgot-password
Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła."
}
```

### POST /api/reset-password
Reset password using the token from email.

**Request Body:**
```json
{
  "token": "abc123...",
  "newPassword": "newSecurePassword123"
}
```

**Response (Success - 200):**
```json
{
  "message": "Hasło zostało pomyślnie zresetowane. Możesz się teraz zalogować."
}
```

## Frontend Flow

1. User clicks "Zapomniałeś hasła?" on login page
2. Modal appears asking for email address
3. User enters email and submits
4. Success message shown (regardless of whether email exists - security best practice)
5. User receives email with reset link
6. User clicks link → redirected to reset password page
7. User enters new password
8. Password is reset → user redirected to login

## Security Features

- Tokens expire after 1 hour
- Tokens are single-use only
- Email existence is not revealed (prevents user enumeration)
- Tokens are cryptographically secure (crypto.randomBytes)
- Old/expired tokens are automatically invalidated

## Testing

### Manual Testing Steps:

1. **Request Password Reset:**
   ```bash
   curl -X POST http://localhost:8080/api/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Check email for reset link** (or check database for token if email not configured)

3. **Reset Password:**
   ```bash
   curl -X POST http://localhost:8080/api/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"YOUR_TOKEN_HERE","newPassword":"NewPassword123!"}'
   ```

4. **Login with new password**

## Troubleshooting

### Email not sending?
- Check SMTP credentials in `.env`
- Verify Gmail App Password is correct
- Check firewall/antivirus isn't blocking SMTP port 587
- Review backend console for error messages

### Token invalid/expired?
- Tokens expire after 1 hour
- Tokens can only be used once
- Request a new password reset if needed

### Database errors?
- Ensure the `wp_password_reset_tokens` table was created
- Check database user has proper permissions
- Verify foreign key constraint is satisfied
