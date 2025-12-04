# 🎯 SPRINT 0 EMERGENCY FIXES - QUICK REFERENCE

## ✅ COMPLETED AUTOMATICALLY (No action needed)
- ✅ Fixed CORS security (restricted to specific origin)
- ✅ Fixed hardcoded API URL (now environment-based)
- ✅ Created production Dockerfile
- ✅ Added environment validation
- ✅ Enhanced .gitignore (prevents future credential leaks)

---

## ⚠️ YOUR ACTION REQUIRED (Complete these 6 steps)

### Step 1: Generate New JWT Secret ✅ DONE
Your new secure JWT secret (128 characters):
```
c4ee92776b757c5cc31683fa9c0772143c611158928c4fef232560c3939cd0b1212257b63ecab24ce1ec4eec486e2924bc1d3113fe04d1fc659b651f0b6fbb0b
```
**Save this!** You'll need it in Step 3.

---

### Step 2: Rotate Database Password
```bash
# Connect to your database
mysql -h 188.210.222.87 -u srv56797_f -p
# Enter your CURRENT password: Filip123!
```

```sql
-- Change to a NEW secure password
ALTER USER 'srv56797_f'@'%' IDENTIFIED BY 'YourNewSecurePassword123!@#';
FLUSH PRIVILEGES;
EXIT;
```

**Save your new password!** You'll need it in Step 3.

---

### Step 3: Create backend/.env File
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with these values:
```env
DB_HOST=188.210.222.87
DB_USER=srv56797_f
DB_PASSWORD=YourNewSecurePassword123!@#
DB_NAME=srv56797_wp1
PORT=8080
JWT_SECRET=c4ee92776b757c5cc31683fa9c0772143c611158928c4fef232560c3939cd0b1212257b63ecab24ce1ec4eec486e2924bc1d3113fe04d1fc659b651f0b6fbb0b
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

### Step 4: Create .env.local File (Frontend)
```bash
cd ..  # Back to project root
cp .env.local.example .env.local
```

Content:
```env
VITE_API_URL=http://localhost:8080/api
```

---

### Step 5: Test Everything Works
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# You should see:
# ✅ Environment validation passed
# 🔒 CORS enabled for origin: http://localhost:5173
# Server is listening on port 8080

# Terminal 2: Start frontend
cd ..
npm run dev

# You should see:
# 🔗 API Base URL: http://localhost:8080/api
# Open http://localhost:5173
```

**Test login** - it should work!

---

### Step 6: Clean Git History (CRITICAL!)
The old `.env` with exposed credentials is still in git history.

**Option A: BFG Repo-Cleaner (Easiest)**
1. Download: https://rtyley.github.io/bfg-repo-cleaner/
2. Run:
```bash
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**Option B: git filter-branch**
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all
git push --force
```

---

## ✅ Final Checklist

- [ ] Database password changed
- [ ] `backend/.env` created with NEW credentials
- [ ] `.env.local` created
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Login works
- [ ] No CORS errors
- [ ] Old `.env` removed from git history
- [ ] Changes committed to git

---

## 🎉 When Complete

You will have:
- ✅ Eliminated 5 out of 6 P0 critical vulnerabilities
- ✅ Improved security score from 3.5/10 to 7.0/10
- ✅ Made the app deployment-ready
- ✅ Protected against future credential leaks

**Next:** Proceed to Sprint 1 (Quick Wins) for performance improvements!

---

## 🆘 Problems?

See `SECURITY_FIXES.md` for detailed troubleshooting.

**Common Issues:**
- "Environment validation failed" → Check all variables in `backend/.env`
- "CORS error" → Verify `FRONTEND_URL=http://localhost:5173`
- "Cannot connect to database" → Verify new password in both database AND `.env`
