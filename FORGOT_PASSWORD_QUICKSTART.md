# 🚀 Quick Start: Forgot Password Feature

## Step 1: Create Database Table (Required)

Open your MySQL/MariaDB client and run:

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

Or copy the SQL from `CREATE_PASSWORD_RESET_TABLE.txt`

## Step 2: Configure Email (Required for Production)

Edit `backend/.env` and add:

```env
# Email Configuration
SMTP_HOST=smtp.elcolt.pl
SMTP_PORT=587
SMTP_USER=info@elcolt.pl
SMTP_PASS=your-email-password
SMTP_FROM=info@elcolt.pl
FRONTEND_URL=http://localhost:5173
```

### Getting SMTP Settings:

You'll need to get the SMTP server details from your email hosting provider. Common settings:

- **SMTP Host:** Usually `smtp.elcolt.pl` or `mail.elcolt.pl`
- **SMTP Port:** 
  - `587` for TLS (recommended)
  - `465` for SSL
  - `25` for unencrypted (not recommended)
- **Username:** `info@elcolt.pl`
- **Password:** Your email account password

**Note:** If you're using a hosting provider like cPanel, you can find these settings in:
- cPanel → Email Accounts → Configure Mail Client
- Or contact your hosting provider's support


## Step 3: Restart Backend

```bash
cd backend
npm run dev
```

## Step 4: Test the Feature

1. **Open the app** → http://localhost:5173
2. **Click "Zapomniałeś hasła?"** on login page
3. **Enter your email** and click "Wyślij link"
4. **Check your email** for the reset link
5. **Click the link** in the email
6. **Enter new password** (minimum 8 characters)
7. **Login** with your new password

## 🧪 Testing Without Email (Development)

If you haven't configured SMTP yet, the backend will log the reset URL to the console:

```
⚠️ SMTP not configured. Password reset token: abc123...
Reset URL: http://localhost:5173/reset-password?token=abc123...
```

Just copy this URL and paste it in your browser to test.

## ✅ Verification Checklist

- [ ] Database table created successfully
- [ ] Email configuration added to `backend/.env`
- [ ] Backend server restarted
- [ ] Can click "Zapomniałeś hasła?" on login
- [ ] Modal opens when clicking the link
- [ ] Can submit email address
- [ ] Email received (or token logged to console)
- [ ] Can open reset password page
- [ ] Can set new password
- [ ] Can login with new password

## 🔧 Troubleshooting

### "Table doesn't exist" error
→ Run the SQL script to create the table

### Email not sending
→ Check SMTP credentials in `.env`
→ Verify Gmail App Password is correct
→ Check backend console for error messages

### "Token invalid or expired"
→ Tokens expire after 1 hour
→ Request a new password reset

### Can't access reset page
→ Make sure frontend is running on port 5173
→ Check that React Router is installed: `npm list react-router-dom`

## 📚 More Information

See `FORGOT_PASSWORD_IMPLEMENTATION.md` for complete documentation.
