# 🚀 Migration Guide: Test Database → Live Database

This guide will walk you through migrating your El Colt Loyalty App from your test MySQL database to your live production MySQL database.

**Difficulty:** Beginner-friendly  
**Time Required:** 15-30 minutes  
**Prerequisites:** Access to your live database credentials

---

## 📋 Table of Contents

1. [What You'll Need](#1-what-youll-need)
2. [Step 1: Get Your Live Database Credentials](#step-1-get-your-live-database-credentials)
3. [Step 2: Verify Required Tables Exist](#step-2-verify-required-tables-exist)
4. [Step 3: Create the Password Reset Table](#step-3-create-the-password-reset-table)
5. [Step 4: Update Your Environment File](#step-4-update-your-environment-file)
6. [Step 5: Test the Connection](#step-5-test-the-connection)
7. [Step 6: Test All Features](#step-6-test-all-features)
8. [Troubleshooting](#troubleshooting)

---

## 1. What You'll Need

Before starting, make sure you have:

- [ ] **Live database hostname** (e.g., `mysql.yourhost.com` or an IP address)
- [ ] **Live database username** (e.g., `srv12345_user`)
- [ ] **Live database password**
- [ ] **Live database name** (e.g., `srv12345_wp1`)
- [ ] **Database port** (usually `3306` - the default for MySQL)

You can usually find these in:
- Your hosting control panel (cPanel, Plesk, etc.)
- Your WordPress `wp-config.php` file on the live server
- Your hosting provider's email/dashboard

---

## Step 1: Get Your Live Database Credentials

### Option A: From WordPress wp-config.php

If your live site is WordPress/WooCommerce, open the `wp-config.php` file on your live server and look for these lines:

```php
define('DB_NAME', 'your_database_name');    // This is DB_NAME
define('DB_USER', 'your_database_user');    // This is DB_USER
define('DB_PASSWORD', 'your_password');     // This is DB_PASSWORD
define('DB_HOST', 'localhost');             // This is DB_HOST
```

### Option B: From Hosting Control Panel

1. Log into your hosting control panel (cPanel, DirectAdmin, etc.)
2. Look for "MySQL Databases" or "Database Management"
3. Find your database name and user
4. If you forgot the password, you can usually reset it there

### Write Down Your Credentials

Fill in your live database credentials here (keep this private!):

```
DB_HOST     = ________________________
DB_USER     = ________________________
DB_PASSWORD = ________________________
DB_NAME     = ________________________
DB_PORT     = 3306 (default, change if different)
```

---

## Step 2: Verify Required Tables Exist

Your app needs these tables to work. They should already exist if you have WooCommerce with the Loyalty & Rewards plugin installed.

### Required WordPress/WooCommerce Tables:

| Table Name | Purpose | Required? |
|------------|---------|-----------|
| `wp_users` | User accounts | ✅ Yes |
| `wp_usermeta` | User profile data | ✅ Yes |
| `wp_posts` | Product information | ✅ Yes |
| `wp_wc_order_product_lookup` | Order history | ✅ Yes |

### Required Loyalty Plugin Tables:

| Table Name | Purpose | Required? |
|------------|---------|-----------|
| `wp_wlr_users` | User loyalty points | ✅ Yes |
| `wp_wlr_levels` | Loyalty level definitions | ✅ Yes |
| `wp_wlr_rewards` | Available rewards | ✅ Yes |
| `wp_wlr_user_rewards` | Redeemed rewards | ✅ Yes |

### Optional Tables:

| Table Name | Purpose | Required? |
|------------|---------|-----------|
| `wp_wdr_order_item_discounts` | Discount tracking for savings | ⚠️ Optional |
| `wp_password_reset_tokens` | Password reset feature | ⚠️ Must create |

### How to Check Tables Exist

**Option 1: Using phpMyAdmin** (easiest for beginners)

1. Log into your hosting control panel
2. Open phpMyAdmin
3. Select your live database on the left
4. Look at the list of tables
5. Check if all the required tables are there

**Option 2: Using MySQL Command Line**

```sql
SHOW TABLES LIKE 'wp_%';
```

---

## Step 3: Create the Password Reset Table

The `wp_password_reset_tokens` table is **custom** and won't exist in your live database. You need to create it.

### Using phpMyAdmin:

1. Log into phpMyAdmin
2. Select your live database
3. Click the "SQL" tab at the top
4. Copy and paste this SQL code:

```sql
-- Create Password Reset Tokens Table
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

5. Click "Go" or "Execute"
6. You should see a success message

### Verify It Was Created:

Run this SQL to check:

```sql
DESCRIBE wp_password_reset_tokens;
```

You should see a table structure with columns: `id`, `user_id`, `token`, `created_at`, `expires_at`, `used`.

---

## Step 4: Update Your Environment File

Now you need to tell your app to use the live database instead of the test database.

### 4.1: Navigate to the Backend Folder

Open a terminal/command prompt and navigate to your backend folder:

```powershell
cd C:\Users\fszym\OneDrive\Documents\ElColtLoyaltyApp\backend
```

### 4.2: Create or Edit the .env File

**If you don't have a `.env` file yet:**

Create a new file called `.env` in the `backend` folder.

**If you already have a `.env` file:**

Open it and update the values.

### 4.3: Add Your Live Database Credentials

Copy this template into your `.env` file and replace the placeholder values:

```env
# ===========================================
# DATABASE CONFIGURATION - LIVE
# ===========================================
DB_HOST=your_live_database_host
DB_USER=your_live_database_user
DB_PASSWORD=your_live_database_password
DB_NAME=your_live_database_name
DB_PORT=3306

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
# IMPORTANT: Change this to a long random string (at least 32 characters)
# Generate one at: https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
JWT_SECRET=your_very_long_secret_key_at_least_32_characters_here

# ===========================================
# SERVER CONFIGURATION
# ===========================================
PORT=8080
NODE_ENV=production
FRONTEND_URL=http://localhost:5173

# ===========================================
# EMAIL CONFIGURATION (for password reset)
# ===========================================
# Leave blank if you don't need password reset emails yet
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 4.4: Example with Real Values

Here's what a filled-in `.env` might look like (with fake values):

```env
DB_HOST=mysql.myhosting.com
DB_USER=srv12345_elcolt
DB_PASSWORD=MySecurePassword123!
DB_NAME=srv12345_wordpress
DB_PORT=3306

JWT_SECRET=a8f3k2j5h6g7d8s9a0p1o2i3u4y5t6r7e8w9q0z1x2c3v4b5n6m7

PORT=8080
NODE_ENV=production
FRONTEND_URL=https://myapp.com
```

---

## Step 5: Test the Connection

### 5.1: Start the Backend Server

Open a terminal in the backend folder and run:

```powershell
cd C:\Users\fszym\OneDrive\Documents\ElColtLoyaltyApp\backend
npm run dev
```

### 5.2: Check for Success Messages

You should see something like:

```
✅ Environment validation passed
🚀 Server running on port 8080
```

### 5.3: Check for Error Messages

**If you see this error:**
```
❌ FATAL ERROR: Missing required environment variables
```
→ Your `.env` file is missing or has missing values. Check Step 4.

**If you see this error:**
```
Error: connect ECONNREFUSED
```
→ The database host is wrong or the database server is not accessible.

**If you see this error:**
```
Error: Access denied for user
```
→ Your username or password is incorrect.

**If you see this error:**
```
Error: Unknown database
```
→ The database name is wrong.

---

## Step 6: Test All Features

Once the server is running, test each feature:

### 6.1: Start the Frontend

Open a new terminal and run:

```powershell
cd C:\Users\fszym\OneDrive\Documents\ElColtLoyaltyApp
npm run dev
```

### 6.2: Test Checklist

Open your browser and test each feature:

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Login** | Enter a valid user email/password from the live site | Successfully logs in, sees dashboard |
| **View Points** | After login, check dashboard | Shows correct points from live data |
| **View Level** | After login, check dashboard | Shows correct loyalty level |
| **View Activity** | Click on Activity tab | Shows real order history |
| **View Rewards** | Click on Rewards tab | Shows available rewards |
| **Redeem Reward** | Click redeem on a reward | Deducts points, shows coupon code |

---

## Troubleshooting

### Problem: "Cannot connect to database"

**Possible causes:**
1. **Wrong host** - Make sure DB_HOST is correct
2. **Firewall blocking** - Your hosting might block external connections
3. **Wrong port** - Try port 3306 (MySQL default)

**Solution for remote database access:**
Some hosts block external database connections. You may need to:
1. Log into your hosting control panel
2. Find "Remote MySQL" or "Remote Database Access"
3. Add your IP address to the allowed list (or use `%` to allow all)

### Problem: "Table doesn't exist"

**Error example:**
```
Table 'database.wp_wlr_users' doesn't exist
```

**Solution:**
The WooCommerce Loyalty plugin may not be installed on your live site. You need to:
1. Install and activate the "WPLoyalty" or similar loyalty plugin on your WordPress site
2. Configure the plugin to create the required tables

### Problem: "Access denied"

**Solution:**
1. Double-check your username and password
2. Make sure the user has permission to access the database
3. In cPanel, go to MySQL Databases → Add User to Database → select ALL PRIVILEGES

### Problem: "JWT_SECRET is too weak"

**Error:**
```
❌ FATAL ERROR: JWT_SECRET is too weak (minimum 32 characters required)
```

**Solution:**
Generate a longer secret key. Use this website: https://randomkeygen.com/
Copy a "CodeIgniter Encryption Keys" value (they're 32 characters).

---

## 🎉 Success!

If everything is working, congratulations! Your app is now connected to your live database.

### Next Steps:

1. **Keep your `.env` file secure** - Never commit it to Git
2. **Add `.env` to `.gitignore`** - Make sure it's listed there
3. **Consider database backups** - Back up your live database regularly
4. **Update FRONTEND_URL** - When you deploy, update this to your real domain

---

## Quick Reference: Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database server address | `mysql.host.com` or `localhost` |
| `DB_USER` | Database username | `srv12345_user` |
| `DB_PASSWORD` | Database password | `MyPassword123` |
| `DB_NAME` | Database name | `srv12345_wordpress` |
| `DB_PORT` | Database port | `3306` |
| `JWT_SECRET` | Secret key for tokens (32+ chars) | `a1b2c3d4e5f6...` |
| `PORT` | Backend server port | `8080` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `FRONTEND_URL` | Your frontend URL | `http://localhost:5173` |

---

**Need help?** If you run into issues, check the error message carefully - it usually tells you exactly what's wrong!

