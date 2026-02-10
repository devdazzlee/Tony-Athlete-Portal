# 📦 CDN & File Storage Setup Guide

## What is CDN and Why You Need It?

**CDN (Content Delivery Network)** stores and serves your files (images, documents, videos) from servers close to your users worldwide, making your app MUCH faster.

**Currently:** Files are stored locally on your server (not scalable!)
**Production:** Files should be stored on cloud storage with CDN

---

## 🎯 **What Files Need CDN Storage?**

### **In Trackdesk, these files need cloud storage:**

1. **User Uploads:**
   - Profile photos
   - Company logos
   - Marketing banners
   - Promotional materials
2. **Marketing Assets:**

   - Affiliate banners (JPG, PNG, GIF)
   - Product images
   - Email templates with images
   - PDF documents (guides, agreements)

3. **Generated Files:**
   - Reports (PDF/CSV)
   - Invoice PDFs
   - Commission statements
   - Analytics exports

**Current Issue:** All these are stored in `backend/uploads/` folder (local disk)
**Problem:**

- ❌ If server restarts, files might be lost
- ❌ Can't scale to multiple servers
- ❌ Slow file delivery
- ❌ No automatic backups

---

## 🚀 **Solution: AWS S3 + CloudFront CDN**

### **Step 1: Set Up AWS S3 (10 minutes)**

#### **1. Create AWS Account:**

```bash
# Go to: https://aws.amazon.com
# Sign up for free tier (includes 5GB storage free)
```

#### **2. Create S3 Bucket:**

```bash
# In AWS Console:
1. Go to S3 service
2. Click "Create bucket"
3. Settings:
   - Bucket name: trackdesk-prod-assets
   - Region: us-east-1 (or closest to your users)
   - Block Public Access: OFF (for public files)
   - Versioning: ENABLED (recommended)
   - Encryption: ENABLED (AES-256)
4. Click "Create bucket"
```

#### **3. Set Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::trackdesk-prod-assets/*"
    }
  ]
}
```

#### **4. Enable CORS:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

#### **5. Get AWS Credentials:**

```bash
# In AWS Console:
1. Go to IAM (Identity and Access Management)
2. Click "Users" > "Add User"
3. Username: trackdesk-s3-user
4. Access type: Programmatic access
5. Permissions: Attach existing policy "AmazonS3FullAccess"
6. SAVE these credentials:
   - Access Key ID: AKIA...
   - Secret Access Key: wJalr...
```

---

## 📝 **Step 2: Update Backend Code**

### **A. Install AWS SDK:**

```bash
cd backend
npm install aws-sdk multer multer-s3
```

### **B. Create S3 Service:**

```typescript
// backend/src/services/S3Service.ts
import AWS from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const s3 = new AWS.S3();

export class S3Service {
  private bucket = process.env.AWS_S3_BUCKET || "trackdesk-prod-assets";

  // Upload file to S3
  async uploadFile(
    file: Express.Multer.File,
    folder: string = "uploads"
  ): Promise<string> {
    const key = `${folder}/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    const result = await s3.upload(params).promise();
    return result.Location; // Returns CDN URL
  }

  // Delete file from S3
  async deleteFile(fileUrl: string): Promise<void> {
    const key = fileUrl.split(".com/")[1]; // Extract key from URL

    await s3
      .deleteObject({
        Bucket: this.bucket,
        Key: key,
      })
      .promise();
  }

  // Generate signed URL (for private files)
  getSignedUrl(key: string, expiresIn: number = 3600): string {
    return s3.getSignedUrl("getObject", {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  // Configure multer for direct S3 upload
  getMulterConfig() {
    return multer({
      storage: multerS3({
        s3: s3,
        bucket: this.bucket,
        acl: "public-read",
        metadata: (req, file, cb) => {
          cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
          const folder = req.params.folder || "uploads";
          cb(null, `${folder}/${Date.now()}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "application/pdf",
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid file type"));
        }
      },
    });
  }
}

export const s3Service = new S3Service();
```

### **C. Update Upload Routes:**

```typescript
// backend/src/routes/upload.ts
import { Router } from "express";
import { s3Service } from "../services/S3Service";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const upload = s3Service.getMulterConfig();

// Upload profile photo
router.post(
  "/profile-photo",
  authenticateToken,
  upload.single("photo"),
  async (req: any, res) => {
    try {
      const fileUrl = req.file.location; // S3 URL

      // Update user profile with new photo URL
      await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePhoto: fileUrl },
      });

      res.json({
        success: true,
        url: fileUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// Upload marketing banner
router.post(
  "/banner",
  authenticateToken,
  upload.single("banner"),
  async (req: any, res) => {
    try {
      const fileUrl = req.file.location;

      // Save banner to database
      const banner = await prisma.marketingAsset.create({
        data: {
          type: "BANNER",
          url: fileUrl,
          name: req.body.name,
          affiliateId: req.user.affiliateProfile.id,
        },
      });

      res.json({
        success: true,
        banner,
      });
    } catch (error) {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// Delete file
router.delete("/file", authenticateToken, async (req: any, res) => {
  try {
    const { fileUrl } = req.body;

    await s3Service.deleteFile(fileUrl);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
```

### **D. Register Upload Routes:**

```typescript
// backend/src/index.ts
import uploadRoutes from "./routes/upload";

// Add this with other routes:
app.use("/api/upload", uploadRoutes);
```

---

## 🌐 **Step 3: Set Up CloudFront CDN (Optional but Recommended)**

### **Why CloudFront?**

- Faster delivery (cached at edge locations worldwide)
- HTTPS support
- Custom domain (cdn.your-domain.com)
- DDoS protection

### **Setup:**

```bash
# In AWS Console:
1. Go to CloudFront service
2. Click "Create Distribution"
3. Settings:
   - Origin Domain: trackdesk-prod-assets.s3.amazonaws.com
   - Viewer Protocol: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache Policy: CachingOptimized
   - Price Class: Use all edge locations (best performance)
4. Click "Create Distribution"
5. Wait 10-15 minutes for deployment
6. Copy CloudFront URL: d111111abcdef8.cloudfront.net
```

### **Update Environment Variables:**

```bash
# backend/.env.production
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="wJalr..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="trackdesk-prod-assets"
CDN_BASE_URL="https://d111111abcdef8.cloudfront.net"

# Or use custom domain:
# CDN_BASE_URL="https://cdn.your-domain.com"
```

---

## 🎨 **Step 4: Update Frontend**

### **A. Update Image Component:**

```typescript
// frontend/components/Image.tsx
interface ImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const CDNImage = ({ src, alt, className }: ImageProps) => {
  // If URL is already absolute (S3/CDN), use it
  // Otherwise, use placeholder
  const imageUrl = src?.startsWith("http") ? src : "/placeholder-avatar.jpg";

  return <img src={imageUrl} alt={alt} className={className} loading="lazy" />;
};
```

### **B. Update Upload Component:**

```typescript
// frontend/components/FileUpload.tsx
import { useState } from "react";
import { config } from "@/config/config";

export const FileUpload = ({
  onSuccess,
}: {
  onSuccess: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await fetch(`${config.apiUrl}/upload/profile-photo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.url); // S3 URL
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};
```

---

## 💰 **Cost Estimate:**

### **AWS S3 Pricing:**

```
Storage: $0.023/GB/month
Requests: $0.005 per 1,000 PUT requests
          $0.0004 per 1,000 GET requests
Data Transfer: $0.09/GB (first 10TB)

Example for small app:
- 10GB storage: $0.23/month
- 100K uploads: $0.50/month
- 1M downloads: $0.40/month
- Data transfer (50GB): $4.50/month
─────────────────────────────────
TOTAL: ~$5-10/month
```

### **CloudFront Pricing (Optional):**

```
Data Transfer: $0.085/GB (first 10TB)
Requests: $0.0075 per 10,000 HTTP requests

Example:
- 100GB transfer: $8.50/month
- 1M requests: $0.75/month
─────────────────────────────────
TOTAL: ~$9-10/month
```

**Free Tier (First 12 months):**

- 5GB storage
- 20,000 GET requests
- 2,000 PUT requests
- 15GB data transfer out

---

## 🔄 **Alternative: DigitalOcean Spaces (Easier)**

### **Why DigitalOcean Spaces?**

- Simpler than AWS
- S3-compatible API
- Built-in CDN included
- Fixed pricing: $5/month for 250GB

### **Setup:**

```bash
# 1. Create DigitalOcean account
# 2. Go to Spaces
# 3. Create Space:
#    - Name: trackdesk-assets
#    - Region: NYC3 (or closest to you)
#    - CDN: ENABLED
# 4. Get credentials:
#    - API > Tokens/Keys > Spaces access keys
```

### **Configuration:**

```bash
# backend/.env.production
AWS_ACCESS_KEY_ID="DO000..."
AWS_SECRET_ACCESS_KEY="abcd..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="trackdesk-assets"
AWS_S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
CDN_BASE_URL="https://trackdesk-assets.nyc3.cdn.digitaloceanspaces.com"
```

### **Update S3Service:**

```typescript
// backend/src/services/S3Service.ts
const s3 = new AWS.S3({
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  // ... rest of config
});
```

**Pricing:** $5/month (includes 250GB storage + CDN)

---

## 📋 **What Needs to Change - Quick Checklist:**

### **Backend Changes:**

- [ ] Install AWS SDK packages
- [ ] Create S3Service.ts file
- [ ] Create upload routes
- [ ] Update environment variables
- [ ] Remove local file storage logic
- [ ] Delete `uploads/` folder contents (keep .gitkeep)

### **Frontend Changes:**

- [ ] Create CDNImage component
- [ ] Create FileUpload component
- [ ] Update profile pages to use new upload
- [ ] Update image displays to use CDN URLs
- [ ] Remove any hardcoded local image paths

### **Environment Variables to Add:**

```bash
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="trackdesk-prod-assets"
CDN_BASE_URL="https://cdn.your-domain.com"
```

### **Database Changes:**

```sql
-- Update existing records to use placeholder
UPDATE "User" SET "profilePhoto" = NULL WHERE "profilePhoto" LIKE '/uploads/%';
UPDATE "AffiliateProfile" SET "logo" = NULL WHERE "logo" LIKE '/uploads/%';
```

---

## 🚀 **Quick Start (Minimum Setup):**

### **Option 1: Skip CDN for MVP (Not Recommended)**

```bash
# Keep using local storage for now
# Just make sure to backup uploads/ folder
# Add to .gitignore: uploads/*
```

### **Option 2: Use DigitalOcean Spaces (Recommended)**

```bash
# 1. Create DO Spaces account ($5/month)
# 2. Add 4 environment variables
# 3. Add S3Service code (provided above)
# 4. Test file upload
# Done! ✅
```

### **Option 3: Use AWS S3 + CloudFront (Best Performance)**

```bash
# 1. Create AWS account (free tier available)
# 2. Set up S3 bucket (10 minutes)
# 3. Set up CloudFront (15 minutes)
# 4. Add environment variables
# 5. Add S3Service code
# Done! ✅
```

---

## 🧪 **Testing CDN Integration:**

### **Test Upload:**

```bash
# Test file upload
curl -X POST https://api.your-domain.com/api/upload/profile-photo \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@test-image.jpg"

# Should return:
{
  "success": true,
  "url": "https://trackdesk-prod-assets.s3.amazonaws.com/uploads/1234567890-test-image.jpg"
}
```

### **Test Access:**

```bash
# Open the returned URL in browser
# Should display the image
```

---

## 🎯 **TL;DR - What to Do:**

### **For MVP (Quick):**

1. ✅ Create DigitalOcean Spaces account
2. ✅ Add 4 environment variables
3. ✅ Copy S3Service code
4. ✅ Test upload
5. ✅ **Done in 20 minutes!**

### **For Production (Best):**

1. ✅ Create AWS S3 bucket
2. ✅ Set up CloudFront CDN
3. ✅ Add environment variables
4. ✅ Implement S3Service
5. ✅ Update frontend components
6. ✅ **Done in 1-2 hours!**

---

## 📞 **Recommended Choice:**

**For Trackdesk: Use DigitalOcean Spaces**

- ✅ Simpler setup
- ✅ Fixed pricing ($5/month)
- ✅ Built-in CDN
- ✅ S3-compatible (same code)
- ✅ Perfect for startups

**Upgrade to AWS later** when you have:

- High traffic (>1TB/month)
- Global users
- Advanced features needed

---

**Next Step:** Choose your CDN provider and follow the setup guide above! 🚀
