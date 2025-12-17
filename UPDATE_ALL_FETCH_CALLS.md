# Update All Fetch Calls to Use Authorization Header

## Pattern to Replace

### Before (Cookie-based):

```typescript
const response = await fetch(url, {
  credentials: "include",
});
```

### After (Authorization header):

```typescript
import { getAuthHeaders } from "@/lib/fetch-with-auth";

const response = await fetch(url, {
  headers: getAuthHeaders(),
  credentials: "omit",
});
```

Or for more complex cases:

```typescript
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  body: JSON.stringify(data),
});
```

## Files That Need Updating

Based on the grep results, these files use `credentials: "include"`:

### Admin Pages:

1. `frontend/app/admin/offers/page.tsx` - 8 instances (lines 216, 238, 258, 298, 345, 372, 412, 529, 587)
2. `frontend/app/admin/settings/profile/page.tsx` - Multiple instances
3. `frontend/app/admin/settings/security/page.tsx` - Multiple instances
4. `frontend/app/admin/payouts/page.tsx` - Multiple instances
5. `frontend/app/admin/commissions/page.tsx` - Multiple instances
6. `frontend/app/admin/affiliates/page.tsx` - Multiple instances
7. `frontend/app/admin/settings/page.tsx` - Multiple instances

### Dashboard Pages:

8. `frontend/app/dashboard/settings/security/page.tsx` - 2 instances
9. `frontend/app/dashboard/notifications/page.tsx` - 4 instances
10. `frontend/app/dashboard/links/page.tsx` - 10 instances (lines 143, 182, 203, 255, 341, 384, 418, 461, 520)
11. `frontend/app/dashboard/statistics/page.tsx` - Multiple instances
12. `frontend/app/dashboard/settings/profile/page.tsx` - Multiple instances
13. `frontend/app/dashboard/referrals/page.tsx` - Multiple instances
14. `frontend/app/dashboard/commissions/page.tsx` - Multiple instances
15. `frontend/app/dashboard/resources/support/page.tsx` - Multiple instances
16. `frontend/app/dashboard/resources/faq/page.tsx` - Multiple instances
17. `frontend/app/dashboard/referrals/analytics/page.tsx` - Multiple instances
18. `frontend/app/dashboard/referrals/share/page.tsx` - Multiple instances

### Other Files:

19. `frontend/app/debug-avatar/page.tsx` - 1 instance
20. `frontend/components/modals/commission-impact-modal.tsx` - 1 instance

## Quick Fix Script

Run this to find all instances:

```bash
grep -r 'credentials: "include"' frontend/app/ | wc -l
```

## Recommended Approach

Since there are ~70 instances, I recommend:

1. **Option 1**: Update files one-by-one as you encounter them
2. **Option 2**: Create a global find/replace script
3. **Option 3**: Use apiClient (which already has the interceptor) for all API calls

The easiest approach is **Option 3** - most files should use `apiClient` from `frontend/lib/api-client.ts` instead of raw `fetch`. The `apiClient` already has the Authorization header interceptor set up.

## Example Conversion

### Current (fetch with credentials):

```typescript
const response = await fetch(`${config.apiUrl}/admin/offers`, {
  credentials: "include",
});
const data = await response.json();
```

### Convert to (using apiClient):

```typescript
import apiClient from "@/lib/api-client";

const response = await apiClient.get("/admin/offers");
const data = response.data;
```

Or if you must use fetch directly:

```typescript
import { getAuthHeaders } from "@/lib/fetch-with-auth";

const response = await fetch(`${config.apiUrl}/admin/offers`, {
  headers: getAuthHeaders(),
  credentials: "omit",
});
const data = await response.json();
```

## Priority

1. Most important: Admin dashboard pages
2. Next: Dashboard pages
3. Then: Other pages

The backend already supports Authorization headers (it checks them first before cookies), so the app will work even if some pages still use `credentials: "include"` for now. Cookies will be used as fallback.

## Testing

After updating files, test:

1. Login functionality
2. API calls in each updated page
3. Logout functionality
4. Check Network tab - verify `Authorization` header is sent
