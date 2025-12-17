# Complete Functionality Analysis - All Sides (Admin, Manager, Affiliate)

## Table of Contents
1. [Admin Functionalities](#admin-functionalities)
2. [Manager Functionalities](#manager-functionalities)
3. [Affiliate Functionalities](#affiliate-functionalities)
4. [Shared/Common Functionalities](#sharedcommon-functionalities)
5. [Shopify Integration Analysis for Each Feature](#shopify-integration-analysis-for-each-feature)

---

## ADMIN FUNCTIONALITIES

### 1. Admin Dashboard (`/admin`)
**Purpose**: Central overview of the entire affiliate program

**Features**:
- **KPI Tiles**:
  - Total Affiliates (with active/pending breakdown)
  - Total Revenue (last 30 days)
  - Total Commissions (last 30 days)
  - Conversion Rate (overall program)
- **Daily Performance Chart**: Line chart showing clicks, conversions, revenue over last 7 days
- **Top Performing Affiliates Table**: Top 5 affiliates by earnings with:
  - Name, email, status, tier
  - Total earnings, conversions, clicks
  - Last activity timestamp
- **Pending Payouts Table**: Payout requests awaiting approval
- **System Alerts**: Notifications about pending applications, monthly payouts, performance changes
- **Refresh Button**: Manual data refresh
- **Date Range Filter**: Last 7 days (expandable)

**Data Sources**:
- `GET /admin/dashboard/overview`
- Aggregates from `AffiliateProfile`, `AffiliateOrder`, `AffiliateClick`, `Activity` tables

---

### 2. Affiliate Management (`/admin/affiliates`)
**Purpose**: Complete CRUD and management of all affiliates

**Features**:

#### 2.1 Affiliate List View
- **Pagination**: 20 per page (configurable up to 500)
- **Search**: By name, email
- **Filters**:
  - Status: All, PENDING, ACTIVE, SUSPENDED, REJECTED
  - Tier: All, BRONZE, SILVER, GOLD, PLATINUM
  - Date Range: From/To dates
- **Sorting**: By creation date or name, ascending/descending
- **Columns Displayed**:
  - ID, Name, Email, Join Date
  - Status (badge), Tier (badge)
  - Commission Rate (%)
  - Total Earnings (£)
  - Total Clicks, Total Conversions
  - Conversion Rate (%)
  - Last Activity (timestamp or "Never")
  - Payment Method
  - Country
- **Actions**: Edit, Delete (dropdown menu)

#### 2.2 Affiliate Detail View (Edit Modal)
- **Basic Information**:
  - Status: PENDING, ACTIVE, SUSPENDED, REJECTED
  - Tier: BRONZE, SILVER, GOLD, PLATINUM
  - Commission Rate: 0-100% (validated)
- **Deliverables Note**: Custom text note visible to affiliate on deliverables page
- **Discount Code Management**:
  - View existing discount codes (Coupon table)
  - Create new discount code:
    - Code (unique, min 3 chars)
    - Discount value (string, e.g., "10%", "$5")
    - Description (optional)
    - Expires At (date, default 1 year)
    - Max Usage (optional number)
    - Status: ACTIVE
- **Referral Code Management**:
  - View existing referral codes (ReferralCode table)
  - Create new referral code (tracking code):
    - Auto-generated code
    - Commission Rate (0-100%)
    - Expires At (optional date)
    - Type: BOTH (default)
- **Social Media Links**:
  - Instagram handle
  - TikTok handle
- **Analytics Tab**:
  - Total Clicks, Conversions, Revenue, Commissions
  - Conversion Rate
  - Average Order Value
  - Period filter: 7d, 30d, 90d
- **Delete Affiliate**: Cascade deletes referral codes, coupons, orders

**API Endpoints**:
- `GET /admin/affiliates` - List with filters
- `GET /admin/affiliates/:id` - Get details
- `PATCH /admin/affiliates/:id/status` - Update status
- `PATCH /admin/affiliates/:id/tier` - Update tier/commission rate
- `DELETE /admin/affiliates/:id` - Delete affiliate
- `PATCH /admin/affiliates/:id/deliverables-note` - Update deliverables note
- `POST /admin/affiliates/:id/discount-code` - Create discount code
- `POST /admin/affiliates/:id/referral-code` - Create referral code
- `PATCH /admin/affiliates/:id/social-media` - Update social media
- `GET /admin/affiliates/:id/analytics` - Get analytics

---

### 3. Commission Management (`/admin/commissions`)
**Purpose**: Manage and approve affiliate commissions

**Features**:
- **Analytics Cards**:
  - Total Commissions (count and value)
  - Paid Commissions (count and value)
  - Pending Commissions (count and value)
  - Top Affiliates count
- **Filters**:
  - Search by Affiliate (name/email) - debounced 500ms
  - Status: All, PENDING, APPROVED, PAID, CANCELLED
  - Date Range: From/To dates
  - Sort By: Date Created, Commission Amount, Order Value, Status
  - Sort Order: Ascending/Descending
- **Commissions Table**:
  - Affiliate (name, email)
  - Amount (£)
  - Rate (%)
  - Status (badge with icon)
  - Created Date
  - Bank Details (View button - opens modal)
  - Actions:
    - Approve (if PENDING)
    - Mark Paid (if APPROVED or PENDING)
- **Pagination**: 10 per page
- **Bank Details Modal**: Shows complete payout information:
  - Account Holder, Bank Name, Account Number
  - Routing Number, SWIFT/BIC, IBAN
  - Currency, Payout Method, Payout Email
  - Payout Frequency, Minimum Payout
  - Address, Notes

**API Endpoints**:
- `GET /commission-management` - List with filters
- `GET /commission-management/analytics` - Analytics
- `PATCH /commission-management/:id/status` - Update status (APPROVED, PAID, CANCELLED)
- `DELETE /commission-management/:id` - Delete commission
- `PATCH /commission-management/bulk-status` - Bulk status update

---

### 4. Payout Management (`/admin/payouts`)
**Purpose**: Process and manage affiliate payouts

**Features**:
- **Summary Cards**:
  - Completed Payouts (count)
  - Total Payouts (all time count)
- **Status Filter**: All, PENDING, PROCESSING, COMPLETED, FAILED
- **Payouts Table**:
  - Payout ID
  - Affiliate (name, email)
  - Amount (£)
  - Method (PayPal, Stripe, Bank Transfer, Crypto, Wise)
  - Status (badge)
  - Request Date
- **Pagination**: 10 per page
- **Data Sources**: 
  - `Payout` table (actual payout requests)
  - `AffiliateOrder` table with status=PAID (individual paid commissions shown as completed payouts)

**API Endpoints**:
- `GET /admin/payouts` - List with filters
- `PATCH /admin/payouts/:id/status` - Update status
- `POST /admin/payouts/process-bulk` - Bulk process
- `GET /admin/payouts/analytics` - Analytics

---

### 5. Deliverables Management (`/admin/deliverables`)
**Purpose**: Review and approve affiliate deliverable submissions

**Features**:
- **Stats Cards**:
  - Total Submissions
  - Pending Review
  - Approved
  - Rejected
- **Filters**:
  - Search: By affiliate name, email, platform, month
  - Status: All, PENDING, APPROVED, REJECTED
  - Month: All, January-December
- **Submissions List** (Mobile: Cards, Desktop: Table):
  - Affiliate (name, email)
  - Month
  - Platform (Instagram, TikTok, YouTube)
  - Submitted Date
  - Status (badge)
  - Actions: View, Approve, Reject
- **Review Modal**:
  - Full submission details
  - Post URL (clickable link)
  - Photo preview (if uploaded)
  - Admin Comment field (required for rejection)
  - Current status display
  - Approve/Reject buttons

**API Endpoints**:
- `GET /admin/deliverables` - List with filters
- `GET /admin/deliverables/:id` - Get submission details
- `PATCH /admin/deliverables/:id/approve` - Approve with optional comment
- `PATCH /admin/deliverables/:id/reject` - Reject with required comment
- `GET /admin/deliverables/stats/overview` - Statistics

**Data Storage**: `Activity` table with `action="deliverable_submitted"`

---

### 6. Offers Management (`/admin/offers`)
**Purpose**: Create and manage affiliate offers/campaigns

**Features**:
- **Summary Statistics**:
  - Total Offers
  - Total Revenue
  - Total Commissions
  - Active, Paused, Ended counts
- **Offers List**:
  - Name, Description
  - Commission Rate (%)
  - Status (active, paused)
  - Start Date, End Date
  - Tags
  - Tracking Metrics:
    - Total Clicks, Conversions
    - Total Revenue, Commissions
    - Conversion Rate
  - Affiliates Count (applications)
  - Creatives Count
- **Create Offer Modal**:
  - Name, Description (required)
  - Commission Rate (0-100%)
  - Start Date, End Date (optional)
  - Tags (array)
  - **Affiliate Selection**: Dropdown to select single affiliate
  - **Referral Code Selection**: Multi-select referral codes to associate
- **Edit Offer**: Update all fields, change status
- **Delete Offer**: With confirmation
- **Creatives Management**:
  - View creatives for an offer
  - Add Creative: Name, Type (banner, video, etc.), Size, Format, URL, Download URL
  - Edit/Delete creatives
- **Applications View**: See which affiliates applied to offers

**API Endpoints**:
- `GET /admin/offers` - List with filters
- `GET /admin/offers/affiliates` - Get affiliates for dropdown
- `POST /admin/offers` - Create offer
- `GET /admin/offers/:id` - Get offer details
- `PUT /admin/offers/:id` - Update offer
- `DELETE /admin/offers/:id` - Delete offer
- `GET /admin/offers/:id/creatives` - Get creatives
- `POST /admin/offers/:id/creatives` - Add creative
- `PUT /admin/offers/:id/creatives/:creativeId` - Update creative
- `DELETE /admin/offers/:id/creatives/:creativeId` - Delete creative

**Data Model**: `Offer` table with relations to `AffiliateApplication`, `Creative`, `ReferralCode` (via Activity log)

---

### 7. Affiliate Codes Management (`/admin/affiliate-codes`)
**Purpose**: Generate one-time use discount codes for affiliate monthly allowances

**Features**:
- **Stats Cards**:
  - Total Codes
  - Active Codes
  - Used Codes
  - Expired Codes
- **Filters**:
  - Search: By code, affiliate name, description
  - Status: All, ACTIVE, INACTIVE
- **Codes List** (Mobile: Cards, Desktop: Table):
  - Code (copyable)
  - Affiliate (name, email)
  - Discount & Shipping Benefits:
    - Discount percentage or fixed amount
    - Free Shipping badge (if enabled)
  - Expires Date (end of month automatically)
  - Usage: X / 1 (one-time use)
  - Status (Active, Inactive, Expired, Used)
  - Actions: Edit Status, Delete
- **Generate Code Modal**:
  - Select Affiliate (required)
  - Monthly Allowance Amount ($) (required)
  - Discount Type: Fixed Amount ($) or Percentage (%)
  - Discount Value (optional)
  - Free Shipping checkbox
  - Custom Description (optional)
  - Preview: Shows code settings summary
- **Edit Code Modal**: Update status (ACTIVE/INACTIVE)

**API Endpoints**:
- `GET /admin/affiliate-codes` - List with filters
- `GET /admin/affiliate-codes/stats/overview` - Statistics
- `POST /admin/affiliate-codes/generate` - Generate new code
- `GET /admin/affiliate-codes/:id` - Get code details
- `PATCH /admin/affiliate-codes/:id/status` - Update status
- `DELETE /admin/affiliate-codes/:id` - Delete code

**Data Model**: `Coupon` table with `isAffiliate=true`, auto-expires at end of month, `maxUsage=1`

---

### 8. Feedback Management (`/admin/feedback`)
**Purpose**: View and manage all user feedback submissions

**Features**:
- **Stats Cards**:
  - Total Feedback
  - Last 7 Days
  - Last 30 Days
  - With Details (non-anonymous)
  - Anonymous
- **Filters**:
  - Search: By feedback text, user name, email
  - Date Range: From/To dates
- **Feedback List** (Mobile: Cards, Desktop: Table):
  - User (name, email) or "Anonymous"
  - Feedback text (truncated)
  - Submitted date (relative time)
  - Status badge (Anonymous/With Details)
  - Actions: View Details
- **View Details Modal**:
  - Full feedback text
  - User information (if not anonymous):
    - Name, Email, Phone
  - Submission Details:
    - Submitted timestamp
    - IP Address
    - User Agent

**API Endpoints**:
- `GET /admin/feedback` - List with filters and pagination
- `GET /admin/feedback/stats` - Statistics
- `GET /admin/feedback/:id` - Get details (if needed)

**Data Storage**: `Activity` table with `action="feedback_submitted"`

---

### 9. System Settings (`/admin/settings`)
**Purpose**: Configure system-wide settings

**Features**:

#### 9.1 General Settings
- Program Name
- Program Description
- Timezone (dropdown: ET, CT, MT, PT, London, Paris)
- Currency (dropdown: USD, EUR, GBP, CAD, AUD)
- Language (dropdown: English, Spanish, French, German, Italian)

#### 9.2 Commission Settings
- Default Commission Rate (%): 0-100, updates all affiliates when changed
- Minimum Payout ($)
- Payout Frequency: Weekly, Monthly, Quarterly
- Approval Period (days)
- Cookie Duration (days)

#### 9.3 Affiliate Settings (in code, not fully exposed in UI)
- Auto Approve: true/false
- Require Approval: true/false
- Max Affiliates: number
- Allow Self Referrals: true/false
- Tier Based Commissions: true/false

#### 9.4 Security Settings (in code, not fully exposed in UI)
- Two Factor Required: true/false
- IP Whitelist: true/false
- Session Timeout: minutes
- Password Policy: string
- Audit Logging: true/false

#### 9.5 Notification Settings (in code, not fully exposed in UI)
- Email Notifications: true/false
- Admin Alerts: true/false
- Affiliate Welcome: true/false
- Payout Notifications: true/false
- System Maintenance: true/false

**API Endpoints**:
- `GET /system/settings` - Get all settings
- `PUT /system/settings/general` - Update general
- `PUT /system/settings/commission` - Update commission (with affiliate update option)
- `POST /system/settings/commission/preview` - Preview impact before saving

**Data Model**: `SystemSettings` table with JSON fields for each category

---

### 10. Admin Profile Settings (`/admin/settings/profile`)
**Purpose**: Manage admin personal profile

**Features**:
- View profile information
- Update first name, last name, phone
- Upload/delete avatar (5MB limit, image only)
- Email (read-only, cannot change)

**API Endpoints**:
- `GET /admin/settings/profile` - Get profile
- `PUT /admin/settings/profile` - Update profile
- `POST /upload/avatar` - Upload avatar
- `DELETE /upload/avatar` - Delete avatar

---

### 11. Admin Security Settings (`/admin/settings/security`)
**Purpose**: Manage admin account security

**Features**:
- Change password (current, new, confirm)
- View login history:
  - Timestamp, IP Address, Device, Location, Status
- Security recommendations display

**API Endpoints**:
- `GET /settings/security` - Get security data
- `POST /settings/security/change-password` - Change password

---

### 12. Admin Websites Management (`/admin/settings/websites`)
**Purpose**: Manage websites for tracking integration

**Features**:
- View all websites
- Create website:
  - Name, Domain, Description (optional)
  - Auto-generates Website ID from domain
- Edit website (name, domain, description)
- Delete website
- Copy Website ID
- Copy ENV variable format
- Integration instructions display

**API Endpoints**:
- `GET /websites` - List all websites
- `POST /websites` - Create (Admin only)
- `PUT /websites/:id` - Update (Admin only)
- `DELETE /websites/:id` - Delete (Admin only)

**Data Model**: `Website` table with `websiteId` (unique identifier for tracking)

---

## MANAGER FUNCTIONALITIES

### 1. Manager Dashboard (`/manager`)
**Purpose**: Manager overview (currently basic/placeholder)

**Features** (Current Implementation):
- Welcome message
- Stats Cards (hardcoded/mock data):
  - Total Affiliates: 1,234
  - Total Revenue: $45,231
  - Active Offers: 23
  - Conversion Rate: 3.2%
- Manager Actions Cards:
  - Affiliate Management: View Affiliates, Approval Queue
  - Performance Analytics: Revenue Reports, Traffic Analysis
  - Program Management: Offer Management, Payout Management

**Note**: Manager role exists but most functionality is not yet implemented. Manager likely has similar permissions to Admin but may be more limited. Currently shows placeholder dashboard.

**API Endpoints**:
- Manager routes exist but are mostly stubs
- Manager can access some admin endpoints with `requireRole(['ADMIN', 'MANAGER'])`

---

## AFFILIATE FUNCTIONALITIES

### 1. Affiliate Dashboard (`/dashboard`)
**Purpose**: Main overview of affiliate performance

**Features**:
- **Profile Data Section**:
  - Instagram handle (if set)
  - TikTok handle (if set)
  - Discount Codes list (from Coupon table, `isAffiliate=true`):
    - Code, Value (e.g., "10% off + Free Shipping"), Description
  - Spending Limit: "Not Set" (placeholder)
  - Deliverables Note (custom note from admin)
- **Performance Metrics**:
  - Conversions (with % change vs previous period)
  - Commission Earned (with % change)
  - Current Date Range vs Previous Period
  - Conversion Chart (bar chart)
  - Commission Chart (bar chart)
  - Discount Code Usage count
- **Date Range Filters**: Yesterday, Last 7 Days, Last 30 Days, Last 6 Months
- **Social Media Links Display**: Instagram, TikTok with follower counts (hardcoded for now)
- **Quick Stats**: Clicks, conversions, earnings summary

**API Endpoints**:
- `GET /athlete/profile` - Get profile with social media and discount codes
- `GET /athlete/performance` - Get performance data
- `GET /athlete/detailed-performance` - Get detailed chart data
- `GET /athlete/commission-summary` - Get commission summary

---

### 2. Performance/Statistics (`/dashboard/statistics`)
**Purpose**: Detailed analytics and performance tracking

**Features**:

#### 2.1 Clicks Analytics
- **Summary**:
  - Total Clicks
  - Unique Visitors
  - Top Referrers (top 10)
- **Clicks List**:
  - Timestamp, Referral Code, Store ID
  - URL, Referrer, User Agent
  - IP Address, UTM parameters
  - Country, Device, Browser
- **Period Filter**: 1h, 24h, 7d, 30d
- **Pagination**: 50 per page

#### 2.2 Conversions Analytics
- **Summary**:
  - Total Conversions
  - Total Revenue
  - Total Commissions
  - Conversion Rate
  - Average Order Value
- **Conversions List**:
  - Date, Order ID, Customer Email
  - Order Value, Commission Rate, Commission Amount
  - Referral Code, Status
- **Period Filter**: 7d, 30d, 90d
- **Pagination**: 50 per page

#### 2.3 Traffic Sources
- **Source Breakdown**: Social Media, Email, Direct, Search Engines
- **Device Breakdown**: Desktop, Mobile, Tablet
- **Geographic Data**: Country distribution (placeholder)
- **Referrer Analysis**: Top referring domains

#### 2.4 Performance Overview
- **Metrics**:
  - Total Clicks, Conversions
  - Conversion Rate
  - Total Revenue, Commissions
  - Average Order Value
- **Charts**: Line/bar charts for trends
- **Period Filter**: 7d, 30d, 90d

**API Endpoints**:
- `GET /statistics/clicks` - Get clicks data
- `GET /statistics/conversions` - Get conversions data
- `GET /statistics/traffic` - Get traffic sources
- `GET /statistics/performance` - Get performance overview

**Data Sources**: `AffiliateClick`, `AffiliateOrder` tables

---

### 3. Orders (`/dashboard/orders`)
**Purpose**: View all orders attributed to the affiliate

**Features**:
- **Orders List**:
  - Order ID
  - Placed On (timestamp)
  - Order Total (£)
  - Items count
  - Store ID
  - Shipping information (placeholder)
- **Order Details View**:
  - Full order information
  - Order Items (array with name, price, quantity)
  - Customer Email
  - Order Value, Commission Amount
  - Status (PENDING, APPROVED, PAID)
- **Pagination**: 50 per page

**API Endpoints**:
- `GET /athlete/orders` - List orders
- `GET /athlete/orders/:orderId` - Get order details

**Data Source**: `AffiliateOrder` table filtered by `affiliateId`

---

### 4. Commissions (`/dashboard/commissions`)
**Purpose**: Manage commissions and payouts

**Features**:

#### 4.1 Pending Commissions Tab
- **Summary**:
  - Pending Amount (£), Count
  - Approved Amount (£), Count
  - Paid Amount (£), Count
  - Next Payout Date (calculated: 30 days after oldest pending order)
  - Next Payout Amount
  - Payout Method, Email, Frequency
  - Minimum Payout
  - Currency
  - Bank Details (if provided)
- **Commissions List**:
  - ID, Date, Customer, Offer
  - Sale Amount, Commission Rate, Commission Amount
  - Status (PENDING, APPROVED, PAID)
  - Expected Payout Date
  - Referral Code, Type
- **Period Filter**: 7d, 30d, 90d, 180d, All
- **Status Filter**: PENDING, APPROVED, PAID, ALL
- **Pagination**: 20 per page

#### 4.2 Payout History Tab
- **History List**:
  - ID, Date, Order ID
  - Referral Code, Sale Amount
  - Commission Rate, Commission Amount
  - Payout Date, Currency
  - Payment Method, Payout Email
  - Status
- **Totals Display**:
  - Total Paid Amount
  - Total Count
  - Currency
- **Date Range Filter**: Start/End dates
- **Pagination**: 10 per page

#### 4.3 Payout Settings Tab
- **Payout Method**: PayPal, Stripe, Bank Transfer, Crypto, Wise
- **Payout Email**: Required
- **Payout Frequency**: Monthly, Bi-Weekly, Weekly, Quarterly
- **Minimum Payout**: Number (£)
- **Bank Details** (if Bank Transfer selected):
  - Account Holder (required)
  - Bank Name (optional)
  - Account Number (required)
  - Routing Number (optional)
  - SWIFT/BIC (optional)
  - IBAN (optional)
  - Currency (optional)
  - Address (optional)
  - Notes (optional)
- **Additional Info Display**:
  - Last Payout Date
  - Next Payout Date (calculated)
  - Tax Info (placeholder)

**API Endpoints**:
- `GET /commissions/pending` - Get pending commissions
- `GET /commissions/history` - Get payout history
- `GET /commissions/settings` - Get payout settings
- `PUT /commissions/settings` - Update payout settings
- `POST /commissions/request-payout` - Request payout
- `GET /commissions/analytics` - Get commission analytics

**Data Sources**: `AffiliateOrder` table, `Payout` table, `AffiliateProfile.bankAccount` (JSON field)

---

### 5. Referrals (`/dashboard/referrals`)
**Purpose**: Manage referral codes (tracking codes)

**Features**:
- **Referral Codes List**:
  - Code (display, copyable)
  - Type (BOTH, CLICK, ORDER)
  - Commission Rate (%)
  - Max Uses, Current Uses
  - Expires At (date)
  - Status: Active/Inactive (toggle)
  - Created At
- **Actions**:
  - Edit Status (toggle active/inactive)
  - View Stats (per code)
  - **Note**: "Create Code button removed - only admins can create codes"
  - **Note**: "Commission rate is not sent in update - it's controlled by admin only"
- **Stats Display**:
  - Total Referrals
  - Total Revenue
  - Total Commissions
  - Conversion Rate

**API Endpoints**:
- `GET /referral/codes` - Get affiliate's referral codes
- `PUT /referral/codes/:id` - Update code status (affiliate can only toggle isActive)
- `GET /referral/stats` - Get referral statistics
- `GET /referral/analytics` - Get detailed analytics

**Data Source**: `ReferralCode` table filtered by `affiliateId`

---

### 6. Referral Analytics (`/dashboard/referrals/analytics`)
**Purpose**: Deep dive into referral performance

**Features**:
- **Key Metrics**:
  - Total Referrals
  - Total Revenue
  - Conversion Rate
  - Average Commission per referral
- **Daily Performance Chart**: Referrals and commissions over time
- **Platform Performance**: Performance by sharing platform (Instagram, TikTok, etc.)
- **Top Products**: Best performing products by referrals
- **Time Range Filter**: 7d, 30d, 90d
- **Export**: Download analytics as JSON

**API Endpoints**:
- `GET /referral/analytics?period=30d` - Get analytics

---

### 7. Links & Assets (`/dashboard/links`)
**Purpose**: Generate affiliate links and access marketing materials

**Features**:

#### 7.1 Link Generator
- **Generate Affiliate Link Form**:
  - Destination Website (dropdown - only ACTIVE websites)
  - Campaign Name (optional)
  - Active Referral Code (dropdown - only active codes)
  - Generate button
- **Generated Links List**:
  - Link Name (auto-generated)
  - Campaign Name
  - Original URL (full URL with query params)
  - Short URL (`/link/{trackingCode}`)
  - Status (Active/Inactive toggle)
  - Stats: Clicks, Conversions, Earnings
  - Actions:
    - Copy URL buttons
    - View Stats (modal with detailed analytics)
    - Activate/Deactivate toggle
    - Delete (with confirmation)
- **Link Stats Modal**:
  - Total Clicks, Conversions, Earnings, Conversion Rate
  - Recent Clicks list (last 10):
    - Referrer, User Agent, Date/Time

#### 7.2 Marketing Assets (Commented out in UI, but API exists)
- Banners list
- Download functionality
- Preview functionality

#### 7.3 Coupon Codes (Commented out in UI, but API exists)
- Available coupons list
- Generate coupon functionality
- Deactivate coupon

**API Endpoints**:
- `GET /websites` - Get active websites
- `GET /referral/codes` - Get active referral codes
- `POST /links/generate` - Generate affiliate link
- `GET /links/my-links` - Get affiliate's links
- `GET /links/stats/:linkId` - Get link statistics
- `PATCH /links/:linkId/status` - Toggle link status
- `DELETE /links/:linkId` - Delete link
- `GET /links/assets/banners` - Get marketing assets
- `GET /links/coupons/available` - Get available coupons
- `POST /links/coupons/generate` - Generate coupon
- `PATCH /links/coupons/:id/deactivate` - Deactivate coupon

**Data Model**: `AffiliateLink` table with tracking code, URL, campaign name

---

### 8. Deliverables (`/dashboard/deliverables`)
**Purpose**: Submit monthly deliverables (social media posts)

**Features**:
- **Custom Deliverables Note**: Displayed at top (set by admin per affiliate)
- **Submit Deliverable Form**:
  - Month selector (January-December)
  - Links array:
    - Post URL (required, must be valid URL)
    - Platform: Instagram, TikTok, YouTube (dropdown)
    - Photo Upload (optional, max 5MB, image only)
  - Add/Remove links
  - Submit button
- **Your Submissions List**:
  - Date, Platform, URL (clickable)
  - Photo preview (if uploaded)
  - Status: PENDING, APPROVED, REJECTED (badge)
  - Admin Comment (if provided)
  - Reviewed At (if reviewed)
  - Filter by month
- **Mobile**: Card layout
- **Desktop**: Table layout

**API Endpoints**:
- `GET /athlete/profile` - Get deliverables note
- `POST /athlete/deliverables` - Submit deliverables
- `GET /athlete/deliverables?month=January` - Get submissions for month

**Data Storage**: `Activity` table with `action="deliverable_submitted"`, `status` field for approval

---

### 9. Social Media Stats (`/dashboard/socials`)
**Purpose**: View Instagram and TikTok follower counts

**Features**:
- **Instagram Section**:
  - Username (from affiliate profile)
  - Current Follower Count
  - Date of count
  - Change vs Previous Day (%)
  - Change vs 7 Days Ago (%)
  - Previous Date, 7 Days Ago Date
  - History Chart (line chart with daily data points)
- **TikTok Section**: Same structure as Instagram
- **Last Updated**: Timestamp
- **Date Range Filter**: From/To dates (default 30 days)
- **Note**: Currently uses hardcoded data, will be replaced with API data

**API Endpoints**:
- `GET /athlete/socials?from=2024-01-01&to=2024-01-31` - Get social stats

**Data Source**: `AffiliateProfile.socialMedia` (JSON field) for usernames, follower counts would need external API integration

---

### 10. Feedback (`/dashboard/feedback`)
**Purpose**: Submit general feedback

**Features**:
- **Feedback Form**:
  - Name (optional)
  - Email (optional)
  - Feedback text (required, textarea)
  - Submit button
- **Note**: "This form is for general feedback and can be submitted anonymously or with your details. For any additional concerns, please contact your Athlete Manager."

**API Endpoints**:
- `POST /athlete/feedback` - Submit feedback

**Data Storage**: `Activity` table with `action="feedback_submitted"`, `details.anonymous` field

---

### 11. Support (`/dashboard/resources/support`)
**Purpose**: Contact support and manage support tickets

**Features**:

#### 11.1 Create Ticket Tab
- **Support Channels Display**:
  - Live Chat (24/7, 2-5 min response)
  - Email Support (24/7, 2-4 hours response)
  - Phone Support (Mon-Fri 9AM-6PM EST, Immediate)
- **Ticket Creation Form**:
  - Subject (required)
  - Category (required): Account Issues, Payment Problems, Technical Support, Commission Questions, Marketing Materials, Program Terms, Other
  - Priority Level (required): Low, Medium, High, Critical
  - Message (required, textarea)

#### 11.2 My Tickets Tab
- **Ticket Summary Cards**:
  - Open Tickets (count)
  - In Progress (count)
  - Resolved (count)
- **Tickets List**:
  - Subject, Status (badge with icon)
  - Category, Priority (badge)
  - Messages count
  - Created date, Last response
  - Actions: View (opens modal)
- **View Ticket Modal**:
  - Full ticket details
  - Status, Priority, Category badges
  - Ticket ID, Messages count
  - Created, Updated timestamps
  - Last response text

**API Endpoints**:
- `GET /support/tickets` - Get user's tickets
- `POST /support/tickets` - Create ticket
- `GET /support/tickets/:id` - Get ticket details
- `POST /support/tickets/:id/reply` - Reply to ticket

**Data Model**: Support tickets (mock data currently, would need `SupportTicket` table)

---

### 12. FAQ (`/dashboard/resources/faq`)
**Purpose**: Browse frequently asked questions

**Features**:
- **Search**: By question/answer text
- **Category Filter**: All Categories, Getting Started, Commissions, Technical, Account
- **FAQ Accordion**:
  - Category badge
  - Question (clickable to expand)
  - Answer (expanded)
  - Helpful/Not Helpful buttons (with counts)
  - Vote tracking (prevents duplicate votes)
- **Help Card**: "Still Need Help?" with Contact Support button

**API Endpoints**:
- `GET /support/faq?category=Getting+Started&search=query` - Get FAQs
- `POST /support/faq/:id/helpful` - Vote on FAQ

**Data Source**: Mock FAQ data (would need `FAQ` table)

---

### 13. Notifications (`/dashboard/notifications`)
**Purpose**: View and manage notifications

**Features**:
- **Stats Cards**:
  - Total Notifications
  - Unread Count
  - Read Count
- **Filter Tabs**: All, Unread, Read
- **Notifications List**:
  - Type icon (Commission, Payout, Performance, System, Info)
  - Title, Message
  - Time ago (relative time)
  - Read/Unread indicator (blue dot)
  - Actions:
    - Mark as Read (if unread)
    - Delete
  - Action URL (if provided, shows "View details" link)
- **Mark All as Read** button (if unread count > 0)

**API Endpoints**:
- `GET /notifications` - Get notifications
- `PATCH /notifications/:id/read` - Mark as read
- `POST /notifications/mark-all-read` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

**Data Source**: Mock data currently (would need `Notification` table)

---

### 14. Settings (`/dashboard/settings`)
**Purpose**: Account settings hub

**Features**:
- **Settings Cards** (clickable navigation):
  - Profile Settings: Personal information and profile details
  - Security: Password, two-factor authentication, login history
  - Commission Payout Settings: Bank details and payout preferences
  - Websites: Manage websites and get Website IDs

---

### 15. Profile Settings (`/dashboard/settings/profile`)
**Purpose**: Manage personal profile

**Features**:
- **Profile Overview Card**:
  - Avatar (upload/delete, 5MB limit)
  - Name, Email
  - Role badge, Tier badge, Status badge
- **Personal Information Form**:
  - First Name, Last Name
  - Email (read-only, cannot change)
  - Phone Number
  - Save button

**API Endpoints**:
- `GET /settings/profile` - Get profile
- `PUT /settings/profile` - Update profile
- `POST /upload/avatar` - Upload avatar
- `DELETE /upload/avatar` - Delete avatar

---

### 16. Security Settings (`/dashboard/settings/security`)
**Purpose**: Manage account security

**Features**:
- **Security Overview**:
  - Email Verified status
  - Last Password Change date
- **Change Password Form**:
  - Current Password (with show/hide toggle)
  - New Password (with show/hide toggle, min 6 chars)
  - Confirm New Password (with show/hide toggle)
- **Login History**:
  - Device, Status (Success/Failed badge)
  - Location, IP Address, Timestamp
- **Security Recommendations**: Tips for account security

**API Endpoints**:
- `GET /settings/security` - Get security data
- `POST /settings/security/change-password` - Change password

---

### 17. Websites Settings (`/dashboard/settings/websites`)
**Purpose**: View websites and get Website IDs (Affiliates: View Only)

**Features**:
- **Info Card**: Explains what Website ID is and how to use it
- **Websites List**:
  - Website Name, Domain
  - Status badge (ACTIVE, PAUSED, INACTIVE)
  - Description (if provided)
  - **Website ID Display**:
    - Website ID (copyable)
    - Copy ENV Variable button
  - Integration Instructions:
    - Steps to add to `.env.local`
    - Example code
- **Affiliate Restrictions**:
  - View Only badge
  - Cannot create, edit, or delete websites
  - Contact admin message

**API Endpoints**:
- `GET /websites` - Get all websites (affiliates can view)

---

### 18. Shop (`/dashboard/shop`)
**Purpose**: Display shop/products (currently placeholder)

**Features**:
- Currently shows: "Portal Currently Closed"
- **Intended Purpose**: Display products from Shopify store
- **Future Integration**: Will show products, prices, inventory from Shopify

**API Endpoints**:
- Placeholder - will integrate with Shopify Products API

---

## SHARED/COMMON FUNCTIONALITIES

### 1. Authentication (`/auth/*`)
**Purpose**: User authentication and account management

**Features**:
- **Login** (`/auth/login`):
  - Email, Password
  - Remember me checkbox
  - Forgot password link
  - Register link
- **Register** (`/auth/register`):
  - First Name, Last Name
  - Email, Password, Confirm Password
  - Terms acceptance
  - Email verification required
- **Forgot Password** (`/auth/forgot-password`):
  - Email input
  - Send reset link
- **Reset Password** (`/auth/reset-password`):
  - Token validation
  - New password, Confirm password
- **Verify Email** (`/auth/verify-email`):
  - Token validation
  - Email verification
- **Resend Verification** (`/auth/resend-verification`):
  - Resend verification email

**API Endpoints**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email
- `POST /auth/resend-verification` - Resend verification
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `PUT /auth/profile` - Update profile
- `POST /auth/2fa/setup` - Setup 2FA
- `POST /auth/2fa/verify` - Verify 2FA
- `POST /auth/2fa/disable` - Disable 2FA

---

### 2. Tracking System (`/api/tracking/*`)
**Purpose**: Track affiliate clicks and orders

**Features**:
- **Click Tracking** (`POST /api/tracking/click`):
  - Referral code, Store ID, URL
  - Referrer, User Agent, IP Address
  - UTM parameters (source, medium, campaign, term, content)
  - Timestamp
- **Order Tracking** (`POST /api/tracking/order`):
  - Referral code, Store ID, Order ID
  - Order Value, Currency
  - Customer Email
  - Items array (id, productId, name, price, quantity)
  - UTM parameters
  - Calculates commission based on referral code rate
  - Creates `AffiliateOrder` record
  - Updates referral code usage stats
- **Events Tracking** (`POST /api/tracking/events`):
  - Batch event tracking
  - Session ID, Website ID
  - Page data, Device data, Browser data
- **Page View Tracking** (`POST /api/tracking/pageview`):
  - Referral code, Store ID, URL, Timestamp

**API Endpoints**:
- `POST /api/tracking/click` - Track click
- `POST /api/tracking/order` - Track order
- `POST /api/tracking/events` - Track events batch
- `POST /api/tracking/pageview` - Track page view

**Data Models**: `AffiliateClick`, `AffiliateOrder` tables

---

### 3. Link Redirect System (`/link/[slug]`)
**Purpose**: Public link redirect with tracking

**Features**:
- **Public Link Page** (`/link/:trackingCode`):
  - Validates tracking code
  - Tracks click automatically
  - Redirects to destination URL with referral code preserved
  - Shows "Continue" button if redirect fails
- **Tracking**:
  - Captures referrer, user agent, IP
  - Stores in `AffiliateClick` table
  - Updates affiliate click count

**API Endpoints**:
- `GET /links/public/:trackingCode` - Get link and track
- `GET /links/redirect/:trackingCode` - Redirect with tracking

---

## SHOPIFY INTEGRATION ANALYSIS FOR EACH FEATURE

### ADMIN SIDE - Shopify Integration

#### 1. Admin Dashboard
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - Total Revenue: Pull from Shopify Orders API
  - Total Conversions: Count Shopify orders with referral codes
  - Daily Performance: Aggregate Shopify order data by date
- **How**:
  - Use Shopify Admin API to fetch orders
  - Filter orders by referral codes (discount codes or order notes)
  - Aggregate revenue and commission data
- **Complexity**: Medium (3-4 days)
- **Challenges**: Matching Shopify orders to referral codes, handling refunds/cancellations

---

#### 2. Affiliate Management
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Discount Code Sync**: When admin creates discount code, sync to Shopify as Price Rule + Discount Code
  - **Order Attribution**: Link Shopify orders to affiliates via discount codes
  - **Performance Metrics**: Pull order data from Shopify for affiliate analytics
- **How**:
  - When creating `Coupon`, create Shopify Price Rule and Discount Code via API
  - Store `shopifyPriceRuleId` and `shopifyDiscountCodeId` in Coupon table
  - Webhook: `orders/create` - Check discount codes, attribute to affiliate
  - Webhook: `orders/updated` - Handle order changes, refunds
- **Complexity**: High (5-7 days)
- **Challenges**: 
  - Mapping discount types (percentage vs fixed)
  - Handling Shopify discount code limitations
  - Syncing code status (active/inactive)
  - Handling code expiration

---

#### 3. Commission Management
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Order Data**: Pull order details from Shopify for commission calculation
  - **Order Status Sync**: Sync Shopify order status (paid, cancelled, refunded) to commission status
  - **Refund Handling**: Detect refunds via webhooks, adjust commissions
- **How**:
  - Webhook: `orders/paid` - Create commission record
  - Webhook: `orders/cancelled` - Cancel commission
  - Webhook: `orders/updated` - Update commission if order value changes
  - Use Shopify Orders API to fetch full order details
- **Complexity**: Medium-High (4-6 days)
- **Challenges**:
  - Handling partial refunds
  - Currency conversion
  - Order value vs commission calculation

---

#### 4. Payout Management
**Shopify Integration**: ⚠️ **PARTIALLY FEASIBLE**
- **What to Integrate**:
  - **Order Payment Status**: Use Shopify to verify order payment before payout
  - **Payment Method Sync**: Shopify doesn't handle payouts to affiliates, but can verify order payments
- **How**:
  - Before processing payout, verify all orders are paid in Shopify
  - Use Shopify Financial Status to confirm payment
- **Complexity**: Low-Medium (2-3 days)
- **Challenges**: Shopify doesn't manage affiliate payouts, only order payments

---

#### 5. Deliverables Management
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: Deliverables are social media posts, not related to Shopify
- **Integration**: None needed

---

#### 6. Offers Management
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Product Sync**: Link offers to Shopify products
  - **Discount Code Creation**: Create Shopify discount codes for offers
  - **Performance Tracking**: Track offer performance via Shopify orders
- **How**:
  - When creating offer, optionally link to Shopify product IDs
  - Create discount codes in Shopify for the offer
  - Track orders using those discount codes
- **Complexity**: Medium (3-4 days)
- **Challenges**: Managing multiple discount codes per offer

---

#### 7. Affiliate Codes Management
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Auto-Sync to Shopify**: When generating affiliate code, create Shopify discount code
  - **Status Sync**: Sync code status (active/inactive) to Shopify
  - **Usage Tracking**: Track code usage in Shopify orders
- **How**:
  - `POST /admin/affiliate-codes/generate` → Create Shopify Price Rule + Discount Code
  - Store Shopify IDs in Coupon table
  - Webhook: `orders/create` - Track code usage
  - Sync status changes to Shopify
- **Complexity**: Medium (3-4 days)
- **Challenges**:
  - One-time use codes in Shopify
  - Expiration date sync
  - Usage limit enforcement

---

#### 8. Feedback Management
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: Feedback is user feedback, not related to Shopify
- **Integration**: None needed

---

#### 9. System Settings
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Shopify Connection Settings**: Store Shopify API credentials
  - **OAuth Flow**: Connect Shopify store via OAuth
  - **Sync Settings**: Configure auto-sync preferences
- **How**:
  - Add Shopify settings to SystemSettings.integrations
  - Implement OAuth flow
  - Store access tokens securely
- **Complexity**: Medium (3-4 days)
- **Challenges**: Secure token storage, token refresh

---

### MANAGER SIDE - Shopify Integration

#### 1. Manager Dashboard
**Shopify Integration**: ✅ **FEASIBLE** (Same as Admin Dashboard)
- **What to Integrate**: Same as Admin Dashboard
- **Complexity**: Medium (3-4 days)

---

### AFFILIATE SIDE - Shopify Integration

#### 1. Affiliate Dashboard
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Performance Data**: Pull order data from Shopify for metrics
  - **Discount Codes**: Display Shopify-synced discount codes
- **How**:
  - Filter Shopify orders by affiliate's discount codes
  - Calculate conversions and commissions from Shopify data
- **Complexity**: Medium (3-4 days)

---

#### 2. Performance/Statistics
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Clicks**: Track clicks to Shopify store
  - **Conversions**: Pull order data from Shopify
  - **Revenue**: Calculate from Shopify order values
- **How**:
  - Use tracking script to capture clicks to Shopify store
  - Webhook: `orders/create` - Create conversion record
  - Aggregate Shopify order data for statistics
- **Complexity**: Medium-High (4-5 days)

---

#### 3. Orders
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Order List**: Display Shopify orders attributed to affiliate
  - **Order Details**: Pull full order details from Shopify API
- **How**:
  - Webhook: `orders/create` - Create AffiliateOrder record
  - Use Shopify Orders API to fetch order details
  - Display Shopify order data in portal
- **Complexity**: Medium (3-4 days)
- **Challenges**: Matching Shopify orders to referral codes

---

#### 4. Commissions
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Commission Calculation**: Based on Shopify order values
  - **Order Status**: Sync Shopify order payment status
  - **Payout Eligibility**: Verify orders are paid before payout
- **How**:
  - Calculate commissions from Shopify order data
  - Webhook: `orders/paid` - Mark commission as eligible
  - Webhook: `orders/cancelled` - Cancel commission
- **Complexity**: Medium-High (4-5 days)

---

#### 5. Referrals
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Referral Code Usage**: Track usage in Shopify orders
  - **Stats**: Calculate stats from Shopify order data
- **How**:
  - Webhook: `orders/create` - Check discount codes, update referral code stats
  - Aggregate Shopify orders by referral code
- **Complexity**: Medium (3-4 days)

---

#### 6. Referral Analytics
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Analytics Data**: Pull from Shopify orders
  - **Product Performance**: Link to Shopify products
- **How**:
  - Aggregate Shopify order data by date, product, platform
  - Calculate metrics from Shopify data
- **Complexity**: Medium (3-4 days)

---

#### 7. Links & Assets
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Link Generation**: Generate links to Shopify store products
  - **Click Tracking**: Track clicks to Shopify store
  - **Conversion Tracking**: Link conversions to Shopify orders
- **How**:
  - Generate links with referral codes to Shopify product pages
  - Track clicks via tracking script
  - Webhook: `orders/create` - Match orders to links
- **Complexity**: Medium (3-4 days)

---

#### 8. Deliverables
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: Social media posts, not related to Shopify

---

#### 9. Social Media Stats
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: Follower counts from Instagram/TikTok APIs, not Shopify

---

#### 10. Feedback
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: User feedback, not related to Shopify

---

#### 11. Support
**Shopify Integration**: ⚠️ **PARTIALLY FEASIBLE**
- **What to Integrate**:
  - **Order-Related Tickets**: Link support tickets to Shopify orders
  - **Order Information**: Display Shopify order details in tickets
- **How**:
  - When creating ticket about order, link to Shopify order ID
  - Fetch order details from Shopify API for context
- **Complexity**: Low (1-2 days)

---

#### 12. FAQ
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: Static FAQ content, not related to Shopify

---

#### 13. Notifications
**Shopify Integration**: ✅ **FEASIBLE**
- **What to Integrate**:
  - **Order Notifications**: Notify affiliate when order is placed via their link
  - **Commission Notifications**: Notify when commission is earned
- **How**:
  - Webhook: `orders/create` - Create notification
  - Webhook: `orders/paid` - Create commission notification
- **Complexity**: Low-Medium (2-3 days)

---

#### 14. Settings (Profile, Security, Websites)
**Shopify Integration**: ❌ **NOT APPLICABLE**
- **Reason**: Account settings, not related to Shopify

---

#### 15. Shop (`/dashboard/shop`)
**Shopify Integration**: ✅ **FEASIBLE** - **HIGH PRIORITY**
- **What to Integrate**:
  - **Product Catalog**: Display Shopify products
  - **Product Details**: Images, prices, descriptions, variants
  - **Inventory**: Stock status
  - **Collections**: Product categories
- **How**:
  - Use Shopify Products API to fetch products
  - Display products in grid/list view
  - Link to Shopify product pages with referral codes
  - Cache product data for performance
- **Complexity**: Medium (3-4 days)
- **Challenges**: 
  - Product image optimization
  - Variant handling
  - Real-time inventory updates

---

## PRIORITY INTEGRATION ROADMAP

### Phase 1: Core Order & Commission Integration (Week 1-2)
1. **Shopify OAuth Connection** (2 days)
   - Implement OAuth flow
   - Store access tokens
   - Test connection

2. **Order Webhooks** (3 days)
   - `orders/create` - Create AffiliateOrder
   - `orders/paid` - Update commission status
   - `orders/cancelled` - Cancel commission
   - `orders/updated` - Handle order changes

3. **Discount Code Sync** (3 days)
   - Sync Coupon codes to Shopify
   - Create Price Rules and Discount Codes
   - Handle status sync

4. **Admin Dashboard Integration** (2 days)
   - Pull revenue from Shopify
   - Display Shopify order data

### Phase 2: Affiliate Experience (Week 3-4)
5. **Shop Page** (3 days)
   - Display Shopify products
   - Product details, images, prices
   - Link generation with referral codes

6. **Orders Page Integration** (2 days)
   - Display Shopify orders
   - Order details from Shopify API

7. **Commissions Integration** (3 days)
   - Calculate from Shopify orders
   - Sync payment status

8. **Statistics Integration** (2 days)
   - Pull data from Shopify orders
   - Calculate metrics

### Phase 3: Advanced Features (Week 5-6)
9. **Link Generation with Products** (2 days)
   - Generate links to specific Shopify products
   - Track product-specific performance

10. **Referral Analytics Enhancement** (2 days)
    - Product-level analytics from Shopify
    - Category performance

11. **Notifications** (1 day)
    - Order notifications from webhooks

12. **Support Ticket Integration** (1 day)
    - Link tickets to Shopify orders

---

## TECHNICAL IMPLEMENTATION NOTES

### Shopify API Endpoints Needed:
- **OAuth**: `GET /admin/oauth/authorize`, `POST /admin/oauth/access_token`
- **Products**: `GET /admin/api/2024-01/products.json`
- **Orders**: `GET /admin/api/2024-01/orders.json`, `GET /admin/api/2024-01/orders/{id}.json`
- **Discount Codes**: `POST /admin/api/2024-01/price_rules.json`, `POST /admin/api/2024-01/price_rules/{id}/discount_codes.json`
- **Webhooks**: Register webhooks for `orders/create`, `orders/paid`, `orders/cancelled`, `orders/updated`

### Database Schema Updates Needed:
- `Coupon` table already has:
  - `shopifyPriceRuleId` (String?)
  - `shopifyDiscountCodeId` (String?)
  - `syncedToShopify` (Boolean, default false)
  - `lastSyncedAt` (DateTime?)
- `AffiliateOrder` table may need:
  - `shopifyOrderId` (String?) - Shopify order ID
  - `shopifyOrderNumber` (String?) - Shopify order number
  - `shopifyFinancialStatus` (String?) - paid, pending, refunded, etc.

### Security Considerations:
- Store Shopify access tokens encrypted
- Implement token refresh mechanism
- Validate webhook signatures
- Rate limiting for API calls

---

## SUMMARY

### Total Functionalities Analyzed:
- **Admin**: 12 major features
- **Manager**: 1 feature (placeholder, needs expansion)
- **Affiliate**: 18 major features
- **Shared**: 3 features (Auth, Tracking, Link Redirect)

### Shopify Integration Feasibility:
- ✅ **Fully Feasible**: 15 features
- ⚠️ **Partially Feasible**: 3 features
- ❌ **Not Applicable**: 8 features (deliverables, feedback, FAQ, social media, settings)

### Estimated Total Integration Time:
- **Phase 1 (Core)**: 10 days
- **Phase 2 (Affiliate Experience)**: 10 days
- **Phase 3 (Advanced)**: 6 days
- **Total**: ~26 days (5-6 weeks)

### Key Integration Points:
1. **OAuth Connection**: Foundation for all integrations
2. **Webhooks**: Real-time order processing
3. **Discount Code Sync**: Bidirectional sync between portal and Shopify
4. **Order Attribution**: Matching Shopify orders to affiliates
5. **Product Catalog**: Displaying Shopify products in portal

---

## NEXT STEPS

1. **Review this document** and prioritize which features to integrate first
2. **Set up Shopify OAuth** and test connection
3. **Implement webhook handlers** for order events
4. **Build discount code sync** functionality
5. **Integrate product catalog** in Shop page
6. **Test end-to-end flow** from click to commission

Would you like me to start implementing any specific integration?




