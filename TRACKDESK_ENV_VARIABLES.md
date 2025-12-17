# Trackdesk Environment Variables

Add these environment variables to your `frontend/.env.local` file:

```bash
# Trackdesk Tracking Configuration

# Trackdesk API URL (use your backend API URL)
# For Development:
NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api

# For Production (replace with your production API URL):
# NEXT_PUBLIC_TRACKDESK_API_URL=https://trackdesk-ihom.vercel.app/api

# Website ID (get this from your Trackdesk dashboard)
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID

# Debug mode (set to true for development, false for production)
NEXT_PUBLIC_TRACKDESK_DEBUG=true
```

## Quick Setup

1. Create `frontend/.env.local` file:

   ```bash
   cd frontend
   touch .env.local
   ```

2. Add these variables:

   ```bash
   NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID
   NEXT_PUBLIC_TRACKDESK_DEBUG=true
   NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
   ```

3. Replace `YOUR_WEBSITE_ID` with your actual website ID from the Trackdesk dashboard.

## For Production (Vercel)

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_TRACKDESK_API_URL` = `https://trackdesk-ihom.vercel.app/api`
- `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID` = `YOUR_WEBSITE_ID`
- `NEXT_PUBLIC_TRACKDESK_DEBUG` = `false` (or `true` for debugging)

## Environment Variables Explained

- **NEXT_PUBLIC_TRACKDESK_API_URL**: Your backend API URL where tracking events will be sent
- **NEXT_PUBLIC_TRACKDESK_WEBSITE_ID**: Your unique website identifier from Trackdesk dashboard
- **NEXT_PUBLIC_TRACKDESK_DEBUG**: Enable/disable debug logging (true = show console logs, false = silent)

---

## 📋 Understanding Website ID

### **What is `websiteId`?**

The `websiteId` is a **unique identifier for your e-commerce website/store** that will be tracked. When you integrate the Trackdesk tracking script on your website (e.g., `your-store.com`), you pass this `websiteId` so that Trackdesk knows which website the tracking events are coming from.

### **How it works:**

1. **Your E-commerce Store** → Integrates the tracking script with a `websiteId`
2. **Tracking Script** → Sends events with `websiteId` to Trackdesk API
3. **Trackdesk** → Uses `websiteId` to organize and display analytics for that specific website

### **How to Generate Your Website ID:**

Since you're tracking **your own e-commerce website**, you need to generate a unique identifier. Here are options:

**Option 1: Use Your Domain Name (Recommended)**

```bash
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=my-store-com
# or
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=mystore-com
```

**Option 2: Generate a UUID**

```bash
# Generate UUID (run in terminal)
node -e "console.log(require('crypto').randomUUID())"

# Use the output as your website ID
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=550e8400-e29b-41d4-a716-446655440000
```

**Option 3: Use a Custom String**

```bash
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=store-001-production
# or
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=my-ecommerce-website-2024
```

### **Example Scenario:**

You have **2 e-commerce stores**:

- **Store 1:** `store1.com` → Use `websiteId: "store1-com"`
- **Store 2:** `store2.com` → Use `websiteId: "store2-com"`

Each store gets its own `websiteId`, so you can track analytics separately.

### **Important Notes:**

✅ **Same `websiteId` for same website** - If you have multiple pages (home, products, checkout) on the same website, use the same `websiteId` for all pages

✅ **Different `websiteId` for different websites** - If you track multiple stores/websites, each should have a unique `websiteId`

✅ **Use consistent naming** - Use the same format (e.g., lowercase, hyphens) for consistency

### **Where to Use Website ID:**

The `websiteId` is used in:

- ✅ Environment variable: `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID`
- ✅ Passed automatically by the tracking script to Trackdesk API
- ✅ Used to filter analytics in your Trackdesk dashboard (future feature)
