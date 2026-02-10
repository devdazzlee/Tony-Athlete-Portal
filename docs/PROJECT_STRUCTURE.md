# 📁 TC Nutrition Athlete Portal Project Structure

Clean and organized project structure after cleanup.

---

## 🏗️ Project Layout

```
TC Nutrition Athlete Portal/
├── backend/              # Backend API (Node.js + Express + Prisma)
├── frontend/             # Frontend Dashboard (Next.js + React)
├── docker-compose.yml    # Docker orchestration
└── .git/                 # Git repository
```

---

## 🔙 Backend Structure

```
backend/
├── src/
│   ├── controllers/      # API controllers
│   ├── routes/           # API routes
│   ├── models/           # Business logic models
│   ├── services/         # External services
│   ├── middleware/       # Auth & other middleware
│   ├── lib/              # Utilities (Prisma client)
│   ├── types/            # TypeScript types
│   └── index.ts          # Main entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── migrations/           # SQL migrations
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── Dockerfile            # Docker config
```

**Running on:** `http://localhost:3003`

---

## 🎨 Frontend Structure

```
frontend/
├── app/
│   ├── admin/            # Admin dashboard pages
│   ├── dashboard/        # Affiliate dashboard pages
│   ├── manager/          # Manager dashboard pages
│   ├── auth/             # Login/Register pages
│   ├── unauthorized/     # Unauthorized access page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # UI components (shadcn/ui)
│   ├── auth/             # Auth components
│   ├── charts/           # Chart components
│   ├── dashboard/        # Dashboard components
│   └── layout/           # Layout components
├── contexts/
│   └── AuthContext.tsx   # Authentication context
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & helpers
├── config/               # Configuration
├── public/
│   └── trackdesk.js      # Tracking script for stores
├── middleware.ts         # Next.js middleware (auth)
├── package.json          # Dependencies
└── next.config.ts        # Next.js config
```

**Running on:** `http://localhost:3001`

---

## 🚀 Quick Start

### **Start Backend:**

```bash
cd backend
npm run dev
```

### **Start Frontend:**

```bash
cd frontend
npm run dev
```

### **Start Both (Docker):**

```bash
docker-compose up
```

---

## 🔑 Access Points

### **Frontend URLs:**

- Home: `http://localhost:3001`
- Login: `http://localhost:3001/auth/login`
- Affiliate Dashboard: `http://localhost:3001/dashboard`
- Admin Dashboard: `http://localhost:3001/admin`
- Manager Dashboard: `http://localhost:3001/manager`

### **Backend URLs:**

- API: `http://localhost:3003/api`
- Health Check: `http://localhost:3003/health`

---

## 👥 Demo Accounts

### **Affiliate:**

```
Email: demo.affiliate@tcnutrition.com
Password: demo123
```

### **Admin:**

```
Email: admin@test.com
Password: admin123
```

---

## 📊 Key Features

### **Affiliate Dashboard:**

- View referral codes
- Generate shareable links
- Track clicks & conversions
- View earnings & analytics
- Download QR codes
- Social media sharing

### **Admin Dashboard:**

- Manage all affiliates
- View all commissions
- Commission analytics
- Approve/reject payouts
- System monitoring

### **Tracking System:**

- Cookie-based tracking (90 days)
- Anonymous checkout support
- Order attribution
- Commission calculation
- Click tracking
- Conversion tracking

---

## 🔗 Integration

### **For Your E-commerce Store:**

Add this script to your store:

```html
<script src="http://localhost:3001/trackdesk.js"></script>
<script>
  Trackdesk.init({
    apiUrl: "http://localhost:3003/api",
    storeId: "store-a",
  });
</script>
```

Track orders on success page:

```javascript
Trackdesk.trackOrder({
  orderId: 'ORD-123',
  orderValue: 99.99,
  currency: 'USD',
  customerEmail: 'customer@example.com',
  items: [...]
});
```

---

## 🗄️ Database

**Provider:** PostgreSQL (Neon Tech)  
**ORM:** Prisma

### **Key Tables:**

- `users` - User accounts
- `affiliate_profiles` - Affiliate data
- `referral_codes` - Referral codes
- `referral_usages` - Code usage tracking
- `affiliate_clicks` - Click tracking
- `affiliate_orders` - Order tracking
- `commissions` - Commission records

---

## 🛠️ Tech Stack

### **Backend:**

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO (WebSockets)

### **Frontend:**

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts (for charts)

---

## 📦 Deployment

### **Production Checklist:**

- [ ] Update environment variables
- [ ] Set up production database
- [ ] Configure CORS for production domain
- [ ] Update tracking script URL
- [ ] Set up SSL certificates
- [ ] Configure Docker for production
- [ ] Set up monitoring & logging

---

## 🔐 Security

- JWT authentication
- HttpOnly cookies
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention (Prisma)
- XSS protection

---

## 📝 Development

### **Backend Development:**

```bash
cd backend
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

### **Frontend Development:**

```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

---

## 🧪 Testing

### **Test Affiliate Link:**

```
http://localhost:3001/?ref=DEMO_SIGNUP_001
```

### **Test Order Tracking:**

Use the tracking script in your store's order success page.

---

## 📚 Documentation

All essential documentation is now in the code:

- Comments in source files
- TypeScript types
- README files in backend/frontend

---

## 🎯 Next Steps

1. **Customize branding** - Update colors, logos, etc.
2. **Add payment integration** - Stripe, PayPal, etc.
3. **Set up email notifications** - For affiliates & admins
4. **Deploy to production** - Use Docker or cloud platform
5. **Add more analytics** - Custom reports, exports
6. **Mobile app** - React Native or Flutter

---

**Your Trackdesk project is now clean, organized, and ready for development!** 🚀
