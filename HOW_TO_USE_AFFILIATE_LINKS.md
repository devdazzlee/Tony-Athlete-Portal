# 🔗 How to Create and Use Affiliate Links for Your Two Stores

Complete guide for creating affiliate links and using them with Store A and Store B.

---

## 🏪 **Your Two Stores Setup**

You mentioned you have **two e-commerce stores**. Here's how the affiliate system works with both:

```
Store A: storeId = "store-a"
Store B: storeId = "store-b"
```

**One affiliate code works for BOTH stores!** 🎉

---

## 📍 **Where to Create/Get Affiliate Links**

### **Option 1: Get Your Existing Link (Fastest)** ⚡

1. **Login to Affiliate Dashboard:**

   ```
   http://localhost:3001/auth/login
   Email: demo.affiliate@trackdesk.com
   Password: demo123
   ```

2. **Navigate to Shareable Links:**

   - Click **"Referral System"** in sidebar
   - Click **"Shareable Links"**

3. **Your link is already there!**

   ```
   You'll see:
   - Your referral code: DEMO_SIGNUP_001
   - Copy button to copy the link
   - QR code
   - Social media sharing buttons
   ```

4. **Copy and use it!**

---

### **Option 2: Create New Custom Links** 🆕

For different campaigns (e.g., Summer Sale, Blog Promotion):

1. **Go to My Referral Codes:**

   ```
   http://localhost:3001/dashboard/referrals
   ```

2. **Click "Create New Referral Code"** button (top right)

3. **Fill in the form:**

   ```
   Code: SUMMER2024
   Type: BOTH (works for signups and products)
   Commission Rate: 10%
   Expiration Date: (optional) 2024-12-31
   Max Uses: (optional) 1000
   ```

4. **Click "Create"**

5. **Your new code appears** with a copy button

---

## 🎯 **How to Use Links with Your Two Stores**

### **Store A Integration:**

1. **Add tracking script to Store A:**

```html
<!-- In Store A's HTML (every page) -->
<script src="http://localhost:3001/trackdesk.js"></script>
<script>
  Trackdesk.init({
    apiUrl: "http://localhost:3003/api",
    storeId: "store-a", // ← Store A ID
  });
</script>
```

2. **Your affiliate link for Store A:**

```
https://store-a.com/?ref=YOUR_CODE
```

Example:

```
https://store-a.com/?ref=DEMO_SIGNUP_001
https://store-a.com/?ref=SUMMER2024
```

---

### **Store B Integration:**

1. **Add tracking script to Store B:**

```html
<!-- In Store B's HTML (every page) -->
<script src="http://localhost:3001/trackdesk.js"></script>
<script>
  Trackdesk.init({
    apiUrl: "http://localhost:3003/api",
    storeId: "store-b", // ← Store B ID
  });
</script>
```

2. **Your affiliate link for Store B:**

```
https://store-b.com/?ref=YOUR_CODE
```

Example:

```
https://store-b.com/?ref=DEMO_SIGNUP_001
https://store-b.com/?ref=SUMMER2024
```

---

## 🔄 **Complete Flow**

```
┌─────────────────────────────────────────────────────────────┐
│  1. AFFILIATE CREATES/GETS LINK                             │
│                                                              │
│  Dashboard → Shareable Links → Copy Link                    │
│  Result: https://store-a.com/?ref=SUMMER2024                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. AFFILIATE SHARES LINK                                   │
│                                                              │
│  • Social media (Facebook, Twitter, Instagram)              │
│  • Email campaigns                                          │
│  • Blog posts                                               │
│  • YouTube descriptions                                     │
│  • WhatsApp/Telegram                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. CUSTOMER CLICKS LINK                                    │
│                                                              │
│  Customer visits: https://store-a.com/?ref=SUMMER2024       │
│  ✅ Trackdesk captures the referral code                    │
│  ✅ Stores in cookie (90 days)                              │
│  ✅ Records the click in database                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. CUSTOMER SHOPS & PURCHASES                              │
│                                                              │
│  Customer browses products and completes checkout            │
│  ✅ Trackdesk tracks the order                              │
│  ✅ Calculates commission                                   │
│  ✅ Attributes sale to affiliate                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. AFFILIATE EARNS COMMISSION                              │
│                                                              │
│  Affiliate sees in dashboard:                                │
│  • New conversion                                           │
│  • Earnings increased                                       │
│  • Commission pending approval                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 **Practical Example**

### **Scenario: You're an Affiliate**

1. **Login to Dashboard:**

   ```
   http://localhost:3001/auth/login
   ```

2. **Get Your Code:**

   - Go to: Referral System → Shareable Links
   - Your code: `DEMO_SIGNUP_001`

3. **Create Links for Both Stores:**

   **For Store A (e.g., Electronics Store):**

   ```
   https://electronics-store.com/?ref=DEMO_SIGNUP_001
   ```

   **For Store B (e.g., Fashion Store):**

   ```
   https://fashion-store.com/?ref=DEMO_SIGNUP_001
   ```

4. **Share Different Links:**

   - Instagram post about electronics → Use Store A link
   - Blog post about fashion → Use Store B link
   - Email campaign → Include both links

5. **Track Performance:**
   - Go to: My Referral Codes
   - See clicks and earnings from both stores
   - See which store performs better

---

## 🎨 **Creating Campaign-Specific Links**

### **Example: Summer Sale Campaign**

1. **Create New Code:**

   ```
   Dashboard → My Referral Codes → Create New

   Code: SUMMER2024
   Type: BOTH
   Rate: 15% (special summer rate!)
   Expires: 2024-08-31
   ```

2. **Use for Both Stores:**

   ```
   Store A: https://store-a.com/?ref=SUMMER2024
   Store B: https://store-b.com/?ref=SUMMER2024
   ```

3. **Track Campaign:**
   - See how many clicks from SUMMER2024
   - Compare with other codes
   - Measure campaign success

---

## 📊 **Where to See Your Links**

### **1. Shareable Links Page**

```
URL: http://localhost:3001/dashboard/referrals/share

What you get:
✅ Your main referral code
✅ Copy button for quick sharing
✅ QR code for offline sharing
✅ Social media sharing buttons
✅ Email sharing option
```

### **2. My Referral Codes Page**

```
URL: http://localhost:3001/dashboard/referrals

What you see:
✅ List of all your codes
✅ Copy button for each code
✅ Statistics (clicks, conversions, earnings)
✅ Create new codes button
✅ Edit/delete options
```

---

## 🛠️ **For Store Owners: How to Integrate**

If you're setting up the stores (not just an affiliate):

### **Store A Setup:**

1. **Add to your Store A's `<head>` tag:**

```html
<script src="http://localhost:3001/trackdesk.js"></script>
<script>
  window.addEventListener("load", function () {
    Trackdesk.init({
      apiUrl: "http://localhost:3003/api",
      storeId: "store-a",
    });
  });
</script>
```

2. **On order success page:**

```html
<script>
  Trackdesk.trackOrder({
    orderId: 'ORD-123',
    orderValue: 99.99,
    currency: 'USD',
    customerEmail: 'customer@example.com',
    items: [...]
  });
</script>
```

### **Store B Setup:**

Same as Store A, but use `storeId: 'store-b'`

---

## 🧪 **Testing Your Links**

### **Test Store A Link:**

1. **Copy your link:**

   ```
   http://localhost:3000/?ref=DEMO_SIGNUP_001
   ```

   (Replace with your actual Store A URL)

2. **Open in incognito window**

3. **Check browser console:**

   ```
   Should see:
   ✅ Trackdesk initialized
   ✅ Referral captured: DEMO_SIGNUP_001
   ```

4. **Complete a test purchase**

5. **Check your dashboard:**
   - Go to: My Referral Codes
   - See clicks increase
   - See conversion after purchase
   - See earnings update

### **Test Store B Link:**

Same process, but with Store B URL

---

## 📈 **Tracking Performance**

### **View Statistics:**

1. **Go to:** My Referral Codes
2. **See for each code:**

   ```
   Code: SUMMER2024
   👥 Clicks: 156
   ✅ Conversions: 42
   💰 Earnings: $420.00
   📊 Conversion Rate: 26.9%

   By Store:
   Store A: 89 clicks, 23 conversions, $230
   Store B: 67 clicks, 19 conversions, $190
   ```

3. **View Detailed Analytics:**
   - Click: Referral Analytics
   - See charts and graphs
   - Compare stores
   - Track trends over time

---

## 🎯 **Best Practices**

### **1. Use Different Codes for Different Campaigns**

```
BLOG2024     → Blog posts
YOUTUBE2024  → YouTube videos
EMAIL2024    → Email campaigns
SOCIAL2024   → Social media
```

### **2. Track Which Store Performs Better**

```
Create separate codes:
STOREA_PROMO → Only promote Store A
STOREB_PROMO → Only promote Store B

Compare results and focus on better performer
```

### **3. Use Custom Messages**

```
Instead of:
"Buy here: https://store.com/?ref=ABC"

Use:
"I love this product! Get 10% off with my link:
https://store.com/?ref=ABC"
```

---

## ❓ **Common Questions**

### **Q: Can I use the same code for both stores?**

**A:** Yes! One code works for both stores. The system tracks which store the sale came from.

### **Q: How do I know which store a sale came from?**

**A:** Check the analytics in your dashboard. It shows earnings by store.

### **Q: Can I create different codes for different stores?**

**A:** Yes! You can create `STOREA_CODE` and `STOREB_CODE` to track separately.

### **Q: What if I want different commission rates for each store?**

**A:** Create separate codes with different rates:

- `STOREA_15` → 15% commission for Store A
- `STOREB_10` → 10% commission for Store B

---

## 🚀 **Quick Start Checklist**

- [ ] Login to affiliate dashboard
- [ ] Go to "Shareable Links"
- [ ] Copy your referral link
- [ ] Replace domain with your Store A URL
- [ ] Replace domain with your Store B URL
- [ ] Share both links
- [ ] Track performance in dashboard

---

**Now you're ready to create and use affiliate links for both your stores!** 🎉
