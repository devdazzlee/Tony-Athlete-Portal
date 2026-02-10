# 🧹 Trackdesk Cleanup Plan

This document shows what files will be deleted and what will be kept.

---

## ✅ **WILL BE KEPT (Your Essential Code)**

### **Backend (100% Safe)**

```
backend/
├── src/                    ✓ All your backend code
├── prisma/                 ✓ Database schema
├── migrations/             ✓ Database migrations
├── package.json            ✓ Dependencies
├── tsconfig.json           ✓ TypeScript config
├── Dockerfile              ✓ Docker config
├── README.md               ✓ Backend docs
└── All other backend files ✓
```

### **Frontend (100% Safe)**

```
frontend/
├── app/                    ✓ All pages (admin, dashboard, auth, etc.)
├── components/             ✓ All UI components
├── contexts/               ✓ React contexts
├── hooks/                  ✓ Custom hooks
├── lib/                    ✓ Utilities
├── config/                 ✓ Configuration
├── public/                 ✓ Public assets (including trackdesk.js)
├── package.json            ✓ Dependencies
├── next.config.ts          ✓ Next.js config
├── middleware.ts           ✓ Next.js middleware
├── Dockerfile              ✓ Docker config
├── README.md               ✓ Frontend docs
└── All other frontend files ✓
```

### **Root Files (Kept)**

```
docker-compose.yml          ✓ Docker orchestration
```

---

## ❌ **WILL BE DELETED (Safe to Remove)**

### **Test HTML Files**

```
test-cors-fix.html          ❌ Test file
test-store.html             ❌ Test file
test-store-improved.html    ❌ Test file
checkout-tracking-example.html ❌ Test file
```

### **Documentation Files**

```
AFFILIATE_DASHBOARD_NAVIGATION.md   ❌ Guide (created for reference)
AUTHENTICATION_FIX.md               ❌ Troubleshooting doc
AUTHENTICATION.md                   ❌ Auth guide
cdn-deployment.md                   ❌ Deployment guide
HOW_TO_GENERATE_REFERRAL_LINKS.md  ❌ User guide
INTEGRATION_GUIDE.md                ❌ Integration guide
NEXTJS_INTEGRATION.md               ❌ Next.js guide
QUICK_START.md                      ❌ Quick start guide
README-CDN.md                       ❌ CDN readme
TEST_GUIDE.md                       ❌ Testing guide
TRACKING_FLOW_EXPLANATION.md        ❌ Tracking explanation
vercel-deployment.md                ❌ Deployment guide
WHERE_TO_CALL_TRACKING.md           ❌ Implementation guide
```

### **Example Components**

```
nextjs-components/          ❌ Example components (already in frontend)
├── TrackdeskScript.tsx     ❌ Example
├── useTrackdesk.ts         ❌ Example
├── examples/               ❌ Examples
├── README.md               ❌ Examples readme
└── QUICK_SETUP.md          ❌ Setup guide
```

### **Nginx Config (if not using)**

```
nginx-proxy.conf            ❌ Nginx config
nginx.conf                  ❌ Nginx config
```

### **Duplicate Files**

```
public/trackdesk.js         ❌ Duplicate (kept in frontend/public/)
frontend/public/trackdesk-fixed.js ❌ Old version
backend/create-demo-affiliate.js   ❌ Demo script (already run)
```

---

## 📊 **Summary**

| Category           | Action           |
| ------------------ | ---------------- |
| **Backend Code**   | ✅ **100% KEPT** |
| **Frontend Code**  | ✅ **100% KEPT** |
| **Docker Configs** | ✅ **KEPT**      |
| **Test Files**     | ❌ **DELETED**   |
| **Documentation**  | ❌ **DELETED**   |
| **Examples**       | ❌ **DELETED**   |
| **Duplicates**     | ❌ **DELETED**   |

---

## 🎯 **What You'll Have After Cleanup**

```
Trackdesk/
├── backend/              ✓ Your backend (complete)
├── frontend/             ✓ Your frontend (complete)
├── docker-compose.yml    ✓ Docker setup
└── cleanup-unused-files.sh (this cleanup script)
```

**Clean, organized, and ready to work with!**

---

## 🚀 **How to Run Cleanup**

### **Option 1: Automatic (Recommended)**

```bash
cd /Users/mac/Documents/GitHub/Trackdesk
chmod +x cleanup-unused-files.sh
./cleanup-unused-files.sh
```

### **Option 2: Manual**

Delete files one by one if you prefer more control.

---

## ⚠️ **Important Notes**

1. **Your code is 100% safe** - Only documentation and test files will be deleted
2. **Backend remains intact** - All your API code, database, and configs are kept
3. **Frontend remains intact** - All your pages, components, and assets are kept
4. **You can always recover** - If using git, files can be restored

---

## 🔍 **Before Running**

Double-check that you don't need:

- [ ] Test HTML files (for testing tracking)
- [ ] Documentation guides (for reference)
- [ ] Example components (for Next.js integration)

If you need any of these, **don't run the cleanup** or modify the script to keep specific files.

---

**Ready to clean up? Run the cleanup script!** 🧹
