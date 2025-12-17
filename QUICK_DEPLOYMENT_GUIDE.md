# 🚀 Quick Deployment Guide - Trackdesk

## 30-Minute Production Setup (Minimum Viable)

This guide will get you live FAST. Perfect for MVP or testing.

---

## ⚡ **Prerequisites** (5 minutes)

### 1. Create Accounts:

- [ ] [Railway.app](https://railway.app) (Backend hosting - FREE)
- [ ] [Vercel.com](https://vercel.com) (Frontend hosting - FREE)
- [ ] [SendGrid.com](https://sendgrid.com) (Email - FREE tier)
- [ ] [Stripe.com](https://stripe.com) (Payments)

### 2. Get Your Repo Ready:

```bash
git add .
git commit -m "Prepare for production"
git push origin main
```

---

## 🔧 **Step 1: Deploy Database** (5 minutes)

### Option A: Railway (Easiest)

```bash
1. Go to railway.app
2. Click "New Project"
3. Select "Provision PostgreSQL"
4. Copy the DATABASE_URL
```

### Option B: Supabase (Free)

```bash
1. Go to supabase.com
2. Create new project
3. Go to Settings > Database
4. Copy connection string
```

**Save this URL - you'll need it!**

---

## 💻 **Step 2: Deploy Backend** (10 minutes)

### Using Railway:

```bash
# 1. Go to railway.app
# 2. Click "New Project" > "Deploy from GitHub repo"
# 3. Select your Trackdesk repo
# 4. Add service name: "trackdesk-backend"
# 5. Set root directory: backend
# 6. Add environment variables:
```

**Required Environment Variables:**

```bash
NODE_ENV=production
PORT=3003
DATABASE_URL=postgresql://...  # From Step 1
JWT_SECRET=your-super-secret-key-min-32-chars
FRONTEND_URL=https://your-app.vercel.app

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
SMTP_FROM=noreply@your-domain.com

# Stripe (Use test keys for now)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (Optional for MVP)
# REDIS_URL=redis://...
```

**Get SendGrid API Key:**

```bash
1. Go to sendgrid.com
2. Sign up for free
3. Go to Settings > API Keys
4. Create API Key
5. Copy the key
```

**Deploy Commands:**

```bash
# Railway will auto-detect and run:
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

**Copy your Railway backend URL**: `https://trackdesk-backend-production.up.railway.app`

---

## 🎨 **Step 3: Deploy Frontend** (5 minutes)

### Using Vercel:

```bash
# 1. Go to vercel.com
# 2. Click "New Project"
# 3. Import your GitHub repo
# 4. Configure:
```

**Project Settings:**

- Framework Preset: **Next.js**
- Root Directory: **frontend**
- Build Command: **npm run build**
- Output Directory: **.next**

**Environment Variables:**

```bash
NEXT_PUBLIC_API_URL=https://trackdesk-backend-production.up.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Click "Deploy"** ✅

**Your site will be live at**: `https://your-app.vercel.app`

---

## ✅ **Step 4: Test Everything** (5 minutes)

### 1. Test Backend Health:

```bash
curl https://your-backend-url.railway.app/health
# Should return: {"status":"OK"}
```

### 2. Test Frontend:

```bash
# Open browser:
https://your-app.vercel.app
```

### 3. Test Login:

```bash
# Go to: https://your-app.vercel.app/auth/login
# Try logging in with test credentials
```

### 4. Create Real Admin Account:

```bash
# SSH into your Railway backend or run locally:
cd backend
npx tsx create-test-users.ts

# Then change passwords immediately!
```

---

## 🔐 **Step 5: Security (CRITICAL - 5 minutes)**

### 1. Change Default Passwords:

```bash
# Login to your app as admin
# Go to Settings > Security
# Change password immediately
```

### 2. Update CORS Settings:

```typescript
// backend/src/index.ts
// Make sure FRONTEND_URL matches your Vercel domain
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3001",
  "https://your-app.vercel.app", // Add your Vercel domain
];
```

### 3. Generate Strong JWT Secret:

```bash
# Run locally:
openssl rand -base64 64

# Update in Railway environment variables
```

---

## 🎯 **You're Live!**

### **Your URLs:**

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.railway.app
- **Database**: Managed by Railway/Supabase

### **Admin Access:**

```
URL: https://your-app.vercel.app/auth/login
Email: admin@trackdesk.com
Password: (Change immediately!)
```

---

## 📊 **What's Working:**

✅ Authentication
✅ Database
✅ API endpoints
✅ Frontend dashboard
✅ Notifications
✅ Links & Assets
✅ Real-time updates (WebSocket)

## ⚠️ **What's NOT Configured Yet:**

❌ Custom domain
❌ Production emails
❌ Stripe live mode
❌ Automated backups
❌ Monitoring/alerts
❌ CDN for assets

---

## 🚀 **Next Steps (Do Within 24 Hours):**

### 1. **Custom Domain** (Optional)

```bash
# In Vercel:
1. Go to Settings > Domains
2. Add your domain
3. Update DNS records
4. Wait for SSL to activate (~5 minutes)

# Update backend FRONTEND_URL:
FRONTEND_URL=https://your-domain.com
```

### 2. **Enable Production Emails**

```bash
# Verify SendGrid domain:
1. Go to SendGrid > Settings > Sender Authentication
2. Authenticate your domain
3. Update SMTP_FROM to use your domain
```

### 3. **Switch to Stripe Live Mode**

```bash
# In Stripe Dashboard:
1. Toggle to "Live mode"
2. Get live API keys
3. Update environment variables:
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 4. **Set Up Monitoring**

```bash
# Add Sentry:
1. Go to sentry.io
2. Create project
3. Add to environment variables:
   SENTRY_DSN=https://...@sentry.io/...
```

### 5. **Enable Backups**

```bash
# Railway auto-backups (Verify):
1. Go to Railway project
2. Click on Postgres
3. Verify "Backups" tab shows daily backups

# Or set up manual backups:
pg_dump DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 💰 **Costs (First Month FREE):**

### **Free Tier:**

- Railway: $5 credit/month (enough for small apps)
- Vercel: Unlimited for personal projects
- SendGrid: 100 emails/day free
- Stripe: No monthly fee, just transaction fees

### **After Free Tier:**

- Railway: ~$10-15/month (database + backend)
- Vercel: Free (or $20/month for Pro)
- SendGrid: $15/month (40k emails)

**Total: $10-30/month to start**

---

## 🆘 **Troubleshooting:**

### **Frontend can't connect to backend:**

```bash
# Check NEXT_PUBLIC_API_URL is correct:
console.log(process.env.NEXT_PUBLIC_API_URL)

# Should be: https://your-backend.railway.app/api
```

### **Database connection error:**

```bash
# Verify DATABASE_URL format:
postgresql://user:pass@host:port/dbname?sslmode=require

# Check Railway database is running
```

### **CORS errors:**

```bash
# Add your Vercel domain to backend CORS:
FRONTEND_URL=https://your-app.vercel.app
```

### **"Failed to fetch" errors:**

```bash
# Check backend logs in Railway
# Verify backend is running:
curl https://your-backend.railway.app/health
```

---

## 📱 **Mobile Testing:**

```bash
# Test on mobile devices:
1. Open https://your-app.vercel.app on phone
2. Login and test all features
3. Check responsive design
```

---

## ✅ **Post-Deployment Checklist:**

```
[ ] Backend deployed and health check passing
[ ] Frontend deployed and loading
[ ] Database migrations run successfully
[ ] Can login with test account
[ ] Changed default passwords
[ ] CORS configured correctly
[ ] Environment variables set
[ ] SSL certificates active (automatic)
[ ] Email sending works
[ ] Stripe test payment works
[ ] Mobile responsive design works
[ ] Error monitoring active (if using Sentry)
```

---

## 🎉 **Congratulations!**

Your Trackdesk affiliate platform is now LIVE in production!

### **Share Your Link:**

```
https://your-app.vercel.app
```

### **What You Can Do Now:**

1. ✅ Accept affiliate signups
2. ✅ Generate affiliate links
3. ✅ Track clicks and conversions
4. ✅ Process commissions
5. ✅ Manage payouts
6. ✅ View analytics

---

## 📚 **Additional Resources:**

- [Full Production Checklist](./PRODUCTION_READINESS_CHECKLIST.md)
- [Priority Actions](./PRODUCTION_PRIORITY_ACTIONS.md)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Deployed:** ✅  
**Time Taken:** ~30 minutes  
**Cost:** FREE (first month)  
**Status:** LIVE IN PRODUCTION! 🚀
