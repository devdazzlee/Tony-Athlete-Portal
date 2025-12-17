#!/bin/bash

# Trackdesk Cleanup Script
# This script removes unnecessary documentation and test files
# while keeping all essential frontend and backend code

echo "🧹 Starting Trackdesk cleanup..."
echo ""

# Array of files to delete
FILES_TO_DELETE=(
    # Test HTML files
    "test-cors-fix.html"
    "test-store.html"
    "test-store-improved.html"
    "checkout-tracking-example.html"
    
    # Documentation files (keeping only essential ones)
    "AFFILIATE_DASHBOARD_NAVIGATION.md"
    "AUTHENTICATION_FIX.md"
    "AUTHENTICATION.md"
    "cdn-deployment.md"
    "HOW_TO_GENERATE_REFERRAL_LINKS.md"
    "INTEGRATION_GUIDE.md"
    "NEXTJS_INTEGRATION.md"
    "QUICK_START.md"
    "README-CDN.md"
    "TEST_GUIDE.md"
    "TRACKING_FLOW_EXPLANATION.md"
    "vercel-deployment.md"
    "WHERE_TO_CALL_TRACKING.md"
    
    # Nginx config files (if not using)
    "nginx-proxy.conf"
    "nginx.conf"
    
    # Duplicate tracking script in root
    "public/trackdesk.js"
    
    # Example components directory
    "nextjs-components"
    
    # Backend test/demo files
    "backend/create-demo-affiliate.js"
    
    # Frontend duplicate tracking script
    "frontend/public/trackdesk-fixed.js"
)

# Directories to delete
DIRS_TO_DELETE=(
    "nextjs-components"
    "public"
)

echo "📝 Files that will be deleted:"
echo ""

for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ $file"
    fi
done

for dir in "${DIRS_TO_DELETE[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ❌ $dir/ (directory)"
    fi
done

echo ""
echo "✅ Files that will be KEPT (your code is safe):"
echo "  ✓ backend/ (all backend code)"
echo "  ✓ frontend/ (all frontend code)"
echo "  ✓ docker-compose.yml"
echo "  ✓ backend/README.md"
echo "  ✓ frontend/README.md"
echo ""

read -p "Do you want to proceed with cleanup? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗑️  Deleting files..."
    
    for file in "${FILES_TO_DELETE[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  ✓ Deleted: $file"
        fi
    done
    
    for dir in "${DIRS_TO_DELETE[@]}"; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            echo "  ✓ Deleted: $dir/"
        fi
    done
    
    echo ""
    echo "✅ Cleanup complete!"
    echo ""
    echo "📊 Summary:"
    echo "  • All backend code: SAFE ✓"
    echo "  • All frontend code: SAFE ✓"
    echo "  • Docker configs: SAFE ✓"
    echo "  • Test files: REMOVED ✓"
    echo "  • Extra docs: REMOVED ✓"
    echo ""
    echo "🚀 Your project is now cleaner!"
else
    echo ""
    echo "❌ Cleanup cancelled. No files were deleted."
fi

