# 🔒 Security Best Practices for El Colt Loyalty App

This document outlines the security measures implemented and additional recommendations for production deployment.

---

## ✅ Implemented Security Measures

### 1. HTTP Security Headers (Helmet.js)

The following headers are automatically set:

| Header | Purpose |
|--------|---------|
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options: SAMEORIGIN` | Prevents clickjacking attacks |
| `X-DNS-Prefetch-Control` | Controls DNS prefetching |
| `Strict-Transport-Security` | Enforces HTTPS (production) |
| `Content-Security-Policy` | Prevents XSS and injection attacks |
| `Referrer-Policy` | Controls referrer information |
| `X-Permitted-Cross-Domain-Policies` | Restricts Adobe cross-domain policies |

### 2. CORS Configuration

- Whitelist-based origin control
- Separate development and production origins
- Support for Capacitor mobile app origins
- Credentials enabled for cookie authentication

### 3. Rate Limiting

| Route | Limit | Window |
|-------|-------|--------|
| Global | 500 requests | 15 minutes |
| `/api/login` | 10 requests | 15 minutes |
| `/api/signup` | 10 requests | 15 minutes |
| `/api/forgot-password` | 10 requests | 15 minutes |
| `/api/reset-password` | 10 requests | 15 minutes |
| `/api/user/account` | 3 requests | 1 hour |

### 4. Input Validation

- JSON body size limited to 10KB
- Strict JSON parsing (arrays and objects only)
- Route parameter validation

### 5. Error Handling

- Production errors don't leak stack traces
- Detailed logging for debugging
- Graceful error responses

---

## ⚠️ Pre-Production Checklist

### Environment Variables

```bash
# 1. Generate a strong JWT secret (128 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Set production environment
NODE_ENV=production

# 3. Configure allowed origins
FRONTEND_URL=https://elcolt.pl,https://www.elcolt.pl
```

### Database Security

- [ ] Use a dedicated database user with minimal permissions
- [ ] Enable SSL/TLS for database connections
- [ ] Regularly backup the database
- [ ] Use strong, unique passwords

### JWT Security

- [ ] Use a cryptographically random secret (minimum 64 bytes)
- [ ] Keep JWT expiration short (24 hours recommended)
- [ ] Never expose the JWT secret
- [ ] Consider implementing token refresh mechanism

### HTTPS

- [ ] Ensure SSL certificate is valid
- [ ] Use HSTS (automatically enabled in production)
- [ ] Redirect all HTTP to HTTPS

### API Security

- [ ] Remove debug endpoints in production
- [ ] Disable detailed error messages
- [ ] Implement request logging
- [ ] Monitor for suspicious activity

---

## 🔐 Known Security Considerations

### Password Hashing

The app uses two password hashing methods for WordPress compatibility:

1. **WordPress PHPass** (`$P$...`) - Legacy format, still supported
2. **Bcrypt** (`$2b$...`) - Modern format for new accounts

**Recommendation:** Gradually migrate all users to bcrypt by updating hashes on successful login.

### JWT Storage

Currently, JWTs are stored in `localStorage`. For enhanced security:

1. **Consider httpOnly cookies** - Already partially implemented
2. **Implement CSRF protection** - If using cookies
3. **Use short-lived tokens** - With refresh token mechanism

### Third-Party Dependencies

Regularly update dependencies to patch vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix
```

---

## 📋 Production Deployment Steps

### 1. Environment Setup

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with production values
nano backend/.env
```

### 2. Generate Secrets

```bash
# JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Test Security Headers

After deployment, verify headers using:

```bash
curl -I https://api.elcolt.pl/health
```

Or use online tools:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### 4. Enable Monitoring

For Cloud Run or similar platforms:
- Enable Cloud Logging
- Set up alerts for error rates
- Monitor rate limit hits

---

## 🚨 Security Incident Response

### If You Suspect a Breach:

1. **Rotate JWT secret immediately**
   ```bash
   # Generate new secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   # Update .env and restart server
   ```

2. **Revoke all active sessions**
   - All users will be logged out when JWT secret changes

3. **Check logs for suspicious activity**
   - Review access logs
   - Look for unusual patterns

4. **Reset affected user passwords**
   - Force password reset if credentials were compromised

5. **Update dependencies**
   ```bash
   npm audit fix --force
   ```

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-17 | Initial security implementation |
