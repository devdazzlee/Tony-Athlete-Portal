# Website Database Storage

## Overview

Websites created from the admin dashboard are now stored in a **dedicated database table** called `websites`.

---

## Database Table: `websites`

### Table Structure

```sql
CREATE TABLE "websites" (
    "id" TEXT PRIMARY KEY,              -- Internal database ID (CUID)
    "websiteId" TEXT UNIQUE NOT NULL,   -- Unique identifier for tracking (e.g., "store-1-production")
    "name" TEXT NOT NULL,               -- Website name (e.g., "My Store")
    "domain" TEXT NOT NULL,             -- Website domain (e.g., "mystore.com")
    "description" TEXT,                 -- Optional description
    "status" WebsiteStatus NOT NULL,   -- ACTIVE, PAUSED, or INACTIVE
    "createdBy" TEXT,                   -- User ID of admin who created it
    "createdAt" TIMESTAMP NOT NULL,    -- Creation timestamp
    "updatedAt" TIMESTAMP NOT NULL      -- Last update timestamp
);
```

### Key Fields

- **`id`**: Internal database ID (auto-generated CUID)
- **`websiteId`**: **This is the unique identifier used in tracking scripts**
  - Must be unique across all websites
  - Used in `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID` environment variable
  - Referenced in tracking events (`TrackingEvent.websiteId`, `TrackingSession.websiteId`, `TrackingStats.websiteId`)

---

## Prisma Model

```prisma
model Website {
  id          String       @id @default(cuid())
  websiteId   String       @unique // Unique identifier for tracking
  name        String
  domain      String
  description String?
  status      WebsiteStatus @default(ACTIVE)
  createdBy   String?      // User ID who created it (admin)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("websites")
}
```

---

## API Endpoints

All endpoints are now fully integrated with the database:

### `GET /api/websites`

- Fetches all websites from the database
- Returns real database data (not placeholder)

### `GET /api/websites/:id`

- Fetches a specific website by database ID
- Returns 404 if not found

### `POST /api/websites` (Admin only)

- Creates a new website in the database
- Validates that `websiteId` is unique
- Returns the created website with database ID

### `PUT /api/websites/:id` (Admin only)

- Updates an existing website in the database
- Validates website exists before updating

### `DELETE /api/websites/:id` (Admin only)

- Deletes a website from the database
- Validates website exists before deleting

---

## How It Works

### 1. Admin Creates Website

When an admin creates a website from `/admin/settings/websites`:

1. Form submits to `POST /api/websites`
2. Backend validates input (name, domain, optional websiteId)
3. If `websiteId` not provided, generates one from domain (e.g., `mystore.com` → `mystore-com`)
4. Checks if `websiteId` already exists in database
5. Creates record in `websites` table
6. Returns website data with database ID and `websiteId`

### 2. Website Data Storage

The website is stored with:

- **Database ID** (`id`): Used for API operations (update, delete)
- **Website ID** (`websiteId`): Used for tracking scripts
- **Name, Domain, Description**: Website details
- **Status**: ACTIVE, PAUSED, or INACTIVE
- **Created By**: Admin user ID who created it

### 3. Tracking Script Usage

When a customer website uses the tracking script:

1. Script reads `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID` from environment
2. This `websiteId` is sent with tracking events
3. Backend stores events with `websiteId` in:
   - `TrackingEvent.websiteId`
   - `TrackingSession.websiteId`
   - `TrackingStats.websiteId`

### 4. Analytics & Reporting

The `websiteId` links tracking events back to the website record:

- All tracking events reference the `websiteId`
- Analytics can group events by `websiteId`
- Reports can show which websites are generating traffic

---

## Migration

To apply the database changes:

### Option 1: Run SQL Migration (Recommended)

```bash
cd backend
psql $DATABASE_URL -f migrations/004_add_website_table.sql
```

### Option 2: Use Prisma Migrate (Development)

```bash
cd backend
npx prisma migrate dev --name add_website_table
```

### Option 3: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

---

## Example Data Flow

### Creating a Website

1. **Admin fills form**:

   - Name: "My Store"
   - Domain: "mystore.com"
   - Website ID: (auto-generated as "mystore-com")

2. **Backend creates record**:

   ```json
   {
     "id": "clx123abc456",
     "websiteId": "mystore-com",
     "name": "My Store",
     "domain": "mystore.com",
     "status": "ACTIVE",
     "createdBy": "admin-user-id"
   }
   ```

3. **Frontend displays**:
   - Website ID: `mystore-com` (shown in dashboard)
   - Copy button for environment variable:
     ```
     NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=mystore-com
     ```

### Using in Tracking Script

1. **Customer sets environment variable**:

   ```env
   NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=mystore-com
   ```

2. **Tracking script sends events**:

   ```javascript
   {
     websiteId: "mystore-com",
     event: "page_view",
     sessionId: "session-123"
   }
   ```

3. **Backend stores event**:
   - `TrackingEvent.websiteId = "mystore-com"`
   - Links back to `websites` table

---

## Relationship with Tracking Tables

The `websiteId` field is used in these tracking tables:

1. **`TrackingEvent`**:

   - `websiteId` (String?) - Stores the website ID from tracking script

2. **`TrackingSession`**:

   - `websiteId` (String?) - Stores the website ID for session tracking

3. **`TrackingStats`**:
   - `websiteId` (String?) - Aggregates stats by website ID

**Note**: These are currently stored as strings (not foreign keys), but they reference the `websites.websiteId` field.

---

## Summary

- **Table Name**: `websites`
- **Primary Key**: `id` (database ID)
- **Unique Identifier**: `websiteId` (used in tracking scripts)
- **Location**: PostgreSQL database
- **Access**: Via Prisma ORM (`prisma.website`)
- **API**: Fully integrated CRUD operations
- **Status**: ✅ **COMPLETE** - All API endpoints now use real database

---

## Next Steps

1. ✅ Website model created in Prisma schema
2. ✅ WebsiteStatus enum added
3. ✅ Prisma client regenerated
4. ✅ All API endpoints updated to use database
5. ✅ Migration SQL file created
6. ⏳ Run migration on database (when ready)
7. ⏳ Test website creation from admin dashboard
8. ⏳ Verify website data appears in database

---

**Last Updated**: 2025-11-03
