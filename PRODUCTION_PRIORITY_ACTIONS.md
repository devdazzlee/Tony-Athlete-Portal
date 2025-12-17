# 🎯 Trackdesk Production - Priority Action Plan

## 🔴 **CRITICAL (Do This First - Day 1-3)**

### 1. **Change All Test Credentials** ⚠️

```bash
# Current test accounts (MUST CHANGE!)
admin@trackdesk.com / password123
affiliate@trackdesk.com / password123
manager@trackdesk.com / password123

# Action: Delete these or change passwords!
```

### 2. **Set Up Production Environment Variables**

```bash
# Create backend/.env.production
cp backend/env.example backend/.env.production

# Generate new JWT secret
openssl rand -base64 64

# Fill in ALL required variables:
- DATABASE_URL (Production PostgreSQL)
- JWT_SECRET (New strong secret!)
- SMTP credentials (SendGrid/AWS SES)
- STRIPE_SECRET_KEY (Live mode!)
- Redis URL
```

### 3. **Configure Production Database**

```bash
# Options:
1. AWS RDS PostgreSQL ($15/month minimum)
2. DigitalOcean Managed Database ($15/month)
3. Supabase ($25/month with extras)

# Setup:
1. Create production database
2. Update DATABASE_URL in .env.production
3. Run: npx prisma migrate deploy
4. Enable automated backups
```

### 4. **Fix Frontend API URL**

```typescript
// frontend/config/config.ts
// Change from:
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003/api";

// To production:
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.your-domain.com/api";
```

### 5. **Set Up Email Service** (Required for notifications)

```bash
# Recommended: SendGrid (Free tier: 100 emails/day)
1. Sign up at sendgrid.com
2. Create API key
3. Add to .env.production:
   SMTP_HOST="smtp.sendgrid.net"
   SMTP_USER="apikey"
   SMTP_PASS="YOUR_API_KEY"
   SMTP_FROM="noreply@your-domain.com"
```

---

## 🟡 **HIGH PRIORITY (Day 4-7)**

### 6. **Deploy Backend**

```bash
# Option A: DigitalOcean App Platform (Easiest)
1. Connect GitHub repo
2. Select backend folder
3. Set environment variables
4. Deploy

# Option B: Railway (Modern)
1. Connect GitHub repo
2. Add backend service
3. Set environment variables
4. Deploy

# Cost: $10-20/month
```

### 7. **Deploy Frontend**

```bash
# Recommended: Vercel (Free for small projects)
1. Connect GitHub repo
2. Framework: Next.js
3. Root directory: frontend
4. Environment variables:
   NEXT_PUBLIC_API_URL="https://api.your-domain.com/api"
5. Deploy

# Cost: Free (or $20/month for pro features)
```

### 8. **Set Up Domain & SSL**

```bash
# 1. Buy domain (Namecheap, GoDaddy, etc.)
#    Cost: ~$12/year

# 2. Configure DNS:
A     @      -> Your Backend Server IP
A     api    -> Your Backend Server IP
A     www    -> Your Frontend IP (or CNAME)

# 3. SSL (Free with Let's Encrypt)
#    Most hosting platforms auto-configure this
```

### 9. **Configure Stripe Live Mode**

```bash
# 1. Go to Stripe Dashboard
# 2. Switch to Live mode
# 3. Get live API keys
# 4. Update .env.production:
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
# 5. Set up webhook: https://api.your-domain.com/api/webhooks/stripe
```

### 10. **Set Up Monitoring**

```bash
# Option A: Sentry (Free tier available)
1. Sign up at sentry.io
2. Create project
3. Get DSN
4. Add to .env.production:
   SENTRY_DSN="https://...@sentry.io/..."

# Option B: Better Stack (formerly Logtail)
# Cost: Free tier available
```

---

## 🟢 **MEDIUM PRIORITY (Week 2)**

### 11. **Implement Missing Features**

#### A. Email Verification

```typescript
// backend/src/routes/auth.ts
router.post("/send-verification", async (req, res) => {
  // Send verification email
});

router.post("/verify-email", async (req, res) => {
  // Verify token and activate account
});
```

#### B. Password Reset

```typescript
router.post("/forgot-password", async (req, res) => {
  // Send reset link
});

router.post("/reset-password/:token", async (req, res) => {
  // Reset password
});
```

#### C. Add Legal Pages

```bash
# Create these pages in frontend:
- Terms of Service (/terms)
- Privacy Policy (/privacy)
- Cookie Policy (/cookies)
- Affiliate Agreement (/affiliate-agreement)
```

### 12. **Set Up Automated Backups**

```bash
# Database backups (CRITICAL!)
# Most managed databases include this
# Verify: Daily automated backups enabled

# Alternative: Manual cron job
# 0 2 * * * pg_dump trackdesk_prod > backup.sql
```

### 13. **Add Security Features**

```typescript
// backend/src/middleware/security.ts

// Rate limiting per user
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// CSRF protection
import csrf from "csurf";
export const csrfProtection = csrf({ cookie: true });
```

### 14. **Performance Optimization**

```bash
# 1. Set up Redis for caching
#    Cost: $10-15/month (DigitalOcean, Redis Labs)

# 2. Enable compression
#    Already in code via helmet

# 3. Add CDN for static assets
#    Use Cloudflare (Free)
```

---

## 🔵 **NICE TO HAVE (Week 3+)**

### 15. **Add Advanced Features**

- [ ] Real-time notifications (WebSocket - already implemented!)
- [ ] Two-factor authentication
- [ ] Advanced analytics dashboard
- [ ] Automated payout scheduling
- [ ] Marketing materials library
- [ ] Mobile app support

### 16. **Testing**

- [ ] Set up Jest for unit tests
- [ ] Add API integration tests
- [ ] Implement E2E tests with Playwright
- [ ] Load testing with k6

### 17. **Documentation**

- [ ] API documentation (Swagger)
- [ ] User guide
- [ ] Admin guide
- [ ] Video tutorials

---

## 📋 **CONFIGURATION FILES TO CREATE**

### 1. **Backend Production Env**

```bash
# backend/.env.production
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"
SMTP_HOST="smtp.sendgrid.net"
SMTP_USER="apikey"
SMTP_PASS="..."
STRIPE_SECRET_KEY="sk_live_..."
REDIS_URL="redis://..."
SENTRY_DSN="..."
```

### 2. **Frontend Production Env**

```bash
# frontend/.env.production
NEXT_PUBLIC_API_URL="https://api.your-domain.com/api"
NEXT_PUBLIC_WS_URL="wss://api.your-domain.com"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### 3. **Docker Compose (Optional)**

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  backend:
    build: ./backend
    env_file: backend/.env.production
    ports: ["3003:3003"]
    restart: unless-stopped

  frontend:
    build: ./frontend
    env_file: frontend/.env.production
    ports: ["3000:3000"]
    restart: unless-stopped
```

### 4. **CI/CD Pipeline (GitHub Actions)**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Backend
        run: |
          # Your deployment commands
      - name: Deploy Frontend
        run: |
          # Your deployment commands
```

---

## 💰 **MINIMUM COST BREAKDOWN**

### **Essential Services:**

```
Backend Hosting (DigitalOcean/Railway)  $15/month
Database (Managed PostgreSQL)           $15/month
Redis Cache                             $10/month
Email Service (SendGrid)                $15/month
Domain Name                              $1/month ($12/year)
File Storage (S3/Spaces)                 $5/month
SSL Certificate                         FREE (Let's Encrypt)
Monitoring (Sentry Free Tier)           FREE
CDN (Cloudflare Free)                   FREE
─────────────────────────────────────────────────
TOTAL MINIMUM:                          $61/month
```

### **Recommended Setup:**

```
Above + Performance/Backup features     $100/month
```

---

## ✅ **QUICK VALIDATION CHECKLIST**

Before going live, verify:

```bash
# 1. Backend Health
curl https://api.your-domain.com/health
# Should return: {"status":"OK"}

# 2. Frontend Loading
curl https://your-domain.com
# Should return HTML

# 3. Authentication Working
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Should return JWT token

# 4. Database Connected
# Check your monitoring dashboard

# 5. Email Working
# Test sending an email from admin panel

# 6. Stripe Working
# Make a test payment

# 7. SSL Valid
curl -I https://your-domain.com
# Should show: HTTP/2 200 (not HTTP/1.1)
```

---

## 🚨 **CRITICAL SECURITY WARNINGS**

### **DO NOT GO TO PRODUCTION WITHOUT:**

1. ❌ Changing test credentials
2. ❌ Generating new JWT secret
3. ❌ Using Stripe LIVE keys (not test)
4. ❌ Enabling database backups
5. ❌ Setting up SSL certificates
6. ❌ Configuring proper CORS
7. ❌ Testing payment flows
8. ❌ Adding error monitoring

### **REMOVE BEFORE PRODUCTION:**

```typescript
// Remove all console.log statements
// Remove mock/test data
// Remove development-only routes
// Remove test payment details
```

---

## 📞 **RECOMMENDED VENDORS**

### **Hosting:**

- **Backend:** Railway, DigitalOcean, Render
- **Frontend:** Vercel, Netlify
- **Database:** DigitalOcean, AWS RDS, Supabase

### **Services:**

- **Email:** SendGrid, AWS SES, Postmark
- **Payments:** Stripe (already integrated!)
- **Monitoring:** Sentry, Better Stack
- **CDN:** Cloudflare (free)
- **Storage:** AWS S3, DigitalOcean Spaces

---

## 🎯 **YOUR NEXT 3 STEPS**

### **Step 1 (Today):**

1. Create `.env.production` files
2. Generate new JWT secret
3. Change all test passwords

### **Step 2 (This Week):**

1. Set up production database
2. Configure email service
3. Deploy to hosting platform

### **Step 3 (Next Week):**

1. Configure domain and SSL
2. Set up Stripe live mode
3. Enable monitoring
4. **GO LIVE!** 🚀

---

**Need Help?** Review the full checklist: `PRODUCTION_READINESS_CHECKLIST.md`
