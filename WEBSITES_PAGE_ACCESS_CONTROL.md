# 🔐 Websites Page - Access Control & Permissions

Complete documentation of access control and permissions for the Websites page in both Affiliate and Admin dashboards.

---

## 📋 **Access Control Summary**

### **Affiliate Dashboard** (`/dashboard/settings/websites`)

- **Role:** `AFFILIATE`
- **Access Level:** **READ-ONLY** (View Only)
- **Badge:** "View Only" badge displayed

### **Admin Dashboard** (`/admin/settings/websites`)

- **Role:** `ADMIN` or `MANAGER`
- **Access Level:** **FULL ACCESS** (Create, Edit, Delete)
- **Badge:** "Admin - Full Access" badge displayed

---

## 🔍 **Detailed Permissions**

### **Affiliate Access (READ-ONLY)**

#### ✅ **What Affiliates CAN Do:**

1. **View Websites**

   - See all websites in the system
   - View website details (name, domain, description, status)
   - See Website IDs for all websites

2. **Copy Website IDs**

   - Copy individual Website IDs
   - Copy environment variables (`NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=...`)
   - Use Website IDs in their Next.js projects

3. **View Integration Instructions**
   - See how to integrate Website IDs
   - View integration steps and code examples
   - Access quick reference guide

#### ❌ **What Affiliates CANNOT Do:**

1. **Create Websites**

   - "Add Website" button is **disabled/hidden**
   - Cannot create new website entries
   - Cannot add new Website IDs

2. **Edit Websites**

   - No edit functionality available
   - Cannot modify website details

3. **Delete Websites**
   - Delete button is **hidden**
   - Cannot remove websites

---

### **Admin Access (FULL ACCESS)**

#### ✅ **What Admins CAN Do:**

1. **View All Websites**

   - See all websites in the system
   - View complete website details

2. **Create Websites**

   - Click "Add Website" button (enabled)
   - Create new website entries
   - Generate new Website IDs automatically
   - Set website name, domain, and description

3. **Copy Website IDs**

   - Copy individual Website IDs
   - Copy environment variables
   - Share Website IDs with affiliates

4. **Delete Websites**

   - Delete button is **visible and functional**
   - Remove websites from the system
   - Confirmation dialog before deletion

5. **Manage All Websites**
   - Full CRUD operations (Create, Read, Update, Delete)
   - Manage websites for all users
   - System-wide changes

---

## 🎨 **UI/UX Features by Role**

### **Affiliate Dashboard UI:**

```tsx
// Header Section
- Title: "Manage Websites"
- Description: "View your websites and get Website IDs for tracking integration"
- Badge: "View Only" (amber/outline badge with Eye icon)

// Info Card
- Shows: "What is a Website ID?" explanation
- Warning Box: Amber colored warning explaining view-only access
- Message: "As an affiliate, you can view and copy Website IDs but cannot create, edit, or delete websites. Contact an admin to add new websites."

// Action Buttons
- "Add Website" button: HIDDEN (not shown)
- "View Only" button: SHOWN (disabled, with Lock icon)

// Website Cards
- Display: Full website information
- Copy Buttons: ENABLED (Copy ID, Copy ENV Variable)
- Delete Button: HIDDEN (not shown)
```

### **Admin Dashboard UI:**

```tsx
// Header Section
- Title: "Manage Websites"
- Description: "Create and manage all websites. Full admin access to create, edit, and delete websites."
- Badge: "Admin - Full Access" (green badge with Shield icon)

// Info Card
- Shows: "What is a Website ID?" explanation
- Success Box: Green colored box explaining admin access
- Message: "You have full permissions to create, edit, and delete websites. All changes affect all users in the system."

// Action Buttons
- "Add Website" button: SHOWN and ENABLED (with Plus icon)
- Full create form available

// Website Cards
- Display: Full website information
- Copy Buttons: ENABLED (Copy ID, Copy ENV Variable)
- Delete Button: SHOWN and ENABLED (red, with Trash icon)
```

---

## 🔄 **Flow Comparison**

### **Affiliate Flow:**

```
1. Login as Affiliate
   ↓
2. Navigate to: Dashboard → Settings → Websites
   ↓
3. See "View Only" badge
   ↓
4. View list of websites
   ↓
5. Click "Copy ID" or "Copy ENV Variable"
   ↓
6. Use Website ID in Next.js project
   ↓
7. (Cannot create/edit/delete)
```

### **Admin Flow:**

```
1. Login as Admin
   ↓
2. Navigate to: Admin → Settings → Websites
   ↓
3. See "Admin - Full Access" badge
   ↓
4. View list of websites
   ↓
5. Click "Add Website" (create new)
   OR
   Click "Delete" (remove website)
   OR
   Click "Copy ID" (share with affiliates)
   ↓
6. Manage websites for all users
```

---

## 📊 **Visual Indicators**

### **Role Badges:**

| Role      | Badge Color   | Icon   | Text                  |
| --------- | ------------- | ------ | --------------------- |
| Affiliate | Amber/Outline | Eye    | "View Only"           |
| Admin     | Green         | Shield | "Admin - Full Access" |

### **Button States:**

| Action      | Affiliate       | Admin   |
| ----------- | --------------- | ------- |
| Add Website | Hidden/Disabled | Enabled |
| Copy ID     | Enabled         | Enabled |
| Copy ENV    | Enabled         | Enabled |
| Delete      | Hidden          | Enabled |

### **Warning/Info Boxes:**

| Role      | Box Type | Color | Icon   |
| --------- | -------- | ----- | ------ |
| Affiliate | Warning  | Amber | Lock   |
| Admin     | Success  | Green | Shield |

---

## 🔒 **Security Considerations**

### **Backend Validation:**

- Frontend access control is for UX only
- **Always validate permissions on the backend API**
- Backend should check user role before allowing:
  - `POST /api/websites` (Create)
  - `PUT /api/websites/:id` (Update)
  - `DELETE /api/websites/:id` (Delete)

### **Role-Based API Checks:**

```typescript
// Backend middleware should check:
if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
  return res.status(403).json({ error: "Forbidden: Admin access required" });
}
```

---

## ✅ **Professional Features Implemented**

### **1. Clear Visual Hierarchy**

- ✅ Role badges at the top
- ✅ Color-coded warnings/info boxes
- ✅ Icon indicators (Eye, Lock, Shield)

### **2. Intuitive UX**

- ✅ Disabled/hidden buttons for restricted actions
- ✅ Helpful messages explaining restrictions
- ✅ Clear call-to-action for what users can do

### **3. Access Control**

- ✅ Role-based UI rendering
- ✅ Conditional button visibility
- ✅ Permission-aware descriptions

### **4. User Guidance**

- ✅ Informative warning boxes
- ✅ Clear permission explanations
- ✅ Contact information for restricted actions

---

## 📝 **Code Implementation**

### **Affiliate Check:**

```tsx
const { user } = useAuth();
const isAffiliate = user?.role === "AFFILIATE";
```

### **Conditional Rendering:**

```tsx
{
  !isAffiliate && <Button onClick={handleCreateWebsite}>Add Website</Button>;
}

{
  isAffiliate && (
    <Button disabled>
      <Lock /> View Only
    </Button>
  );
}
```

---

## 🎯 **Summary**

### **Affiliate Dashboard:**

- **Access:** View Only ✅
- **Can Do:** View websites, copy Website IDs
- **Cannot Do:** Create, edit, or delete websites
- **Purpose:** Get Website IDs for integration

### **Admin Dashboard:**

- **Access:** Full Control ✅
- **Can Do:** Create, view, copy, delete websites
- **Purpose:** Manage all websites for the entire system

---

**Both dashboards have professional, role-appropriate access controls with clear visual indicators and intuitive user experience!** 🎉
