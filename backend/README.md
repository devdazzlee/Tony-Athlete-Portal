# TC Nutrition Athlete Portal Backend

A comprehensive, enterprise-grade backend for the TC Nutrition Athlete Portal built with Node.js, Express.js, TypeScript, and PostgreSQL.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - JWT-based auth with role-based access control
- **Affiliate Management** - Complete affiliate lifecycle management
- **Offer Management** - Create, manage, and track affiliate offers
- **Link Generation & Tracking** - Smart link generation with detailed analytics
- **Commission Management** - Automated commission calculation and tracking
- **Payout Processing** - Multiple payment methods with Stripe integration
- **Real-time Analytics** - Live dashboards with WebSocket support
- **Advanced Analytics** - Funnel analysis, cohort analysis, attribution modeling
- **Automation & Workflows** - Rule-based automation and workflow management
- **Webhook System** - Comprehensive webhook management and delivery
- **Security Features** - 2FA, IP blocking, audit trails, rate limiting
- **Enterprise Features** - White-label, multi-tenant, SSO support
- **Mobile & PWA** - Mobile-optimized APIs and PWA support
- **Compliance** - GDPR compliance, data retention, audit trails

### Integrations
- **Payment Processing** - Stripe, PayPal, Bank Transfer, Crypto
- **E-commerce** - Shopify, WooCommerce, Magento
- **Email Marketing** - Mailchimp, SendGrid, AWS SES
- **Analytics** - Google Analytics, Facebook Pixel, Google Tag Manager
- **CDN & Storage** - AWS S3, CloudFront, DigitalOcean Spaces

## 🏗️ Architecture

```
src/
├── controllers/          # Request handlers
├── services/            # Business logic
├── routes/             # API route definitions
├── middleware/         # Custom middleware
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── index.ts            # Application entry point
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 13
- Redis (optional, for caching)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/trackdesk/backend.git
   cd trackdesk-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.production .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Using the startup script
```bash
chmod +x start.sh
./start.sh
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity
- `GET /api/dashboard/performance-chart` - Get performance chart data
- `GET /api/dashboard/top-offers` - Get top performing offers
- `GET /api/dashboard/notifications` - Get user notifications

### Affiliate Management
- `GET /api/affiliates` - Get all affiliates
- `GET /api/affiliates/:id` - Get affiliate by ID
- `POST /api/affiliates` - Create new affiliate
- `PUT /api/affiliates/:id` - Update affiliate
- `DELETE /api/affiliates/:id` - Delete affiliate
- `GET /api/affiliates/:id/links` - Get affiliate links
- `POST /api/affiliates/:id/links` - Create affiliate link
- `GET /api/affiliates/:id/commissions` - Get affiliate commissions
- `GET /api/affiliates/:id/payouts` - Get affiliate payouts
- `POST /api/affiliates/:id/payouts/request` - Request payout

### Offer Management
- `GET /api/offers` - Get all offers
- `GET /api/offers/:id` - Get offer by ID
- `POST /api/offers` - Create new offer
- `PUT /api/offers/:id` - Update offer
- `DELETE /api/offers/:id` - Delete offer
- `GET /api/offers/:id/applications` - Get offer applications
- `POST /api/offers/:id/apply` - Apply for offer
- `GET /api/offers/:id/creatives` - Get offer creatives
- `POST /api/offers/:id/creatives` - Create offer creative

### Analytics
- `GET /api/analytics/realtime` - Get real-time analytics
- `GET /api/analytics/funnel` - Get funnel analysis
- `GET /api/analytics/cohort` - Get cohort analysis
- `GET /api/analytics/attribution/:conversionId` - Get attribution data
- `GET /api/analytics/performance` - Get performance analytics
- `GET /api/analytics/geographic` - Get geographic analytics
- `GET /api/analytics/devices` - Get device analytics

### Automation
- `GET /api/automation/workflows` - Get workflows
- `POST /api/automation/workflows` - Create workflow
- `POST /api/automation/workflows/:id/trigger` - Trigger workflow
- `GET /api/automation/rules` - Get automation rules
- `POST /api/automation/rules` - Create automation rule

### Integrations
- `GET /api/integrations` - Get integrations
- `POST /api/integrations/shopify/connect` - Connect Shopify
- `POST /api/integrations/mailchimp/connect` - Connect Mailchimp
- `POST /api/integrations/stripe/connect` - Connect Stripe

### Security
- `POST /api/security/2fa/setup` - Setup 2FA
- `POST /api/security/2fa/verify` - Verify 2FA
- `GET /api/security/logs` - Get security logs
- `GET /api/security/audit-trail` - Get audit trail

### Enterprise
- `GET /api/enterprise/white-label` - Get white-label settings
- `PUT /api/enterprise/white-label` - Update white-label settings
- `GET /api/enterprise/tenants` - Get tenants
- `POST /api/enterprise/tenants` - Create tenant

### Mobile & PWA
- `GET /api/mobile/analytics` - Get mobile analytics
- `POST /api/mobile/push/subscribe` - Subscribe to push notifications
- `POST /api/mobile/push/send` - Send push notification
- `GET /api/mobile/pwa/manifest` - Get PWA manifest

### Compliance
- `GET /api/compliance/gdpr` - Get GDPR settings
- `POST /api/compliance/data-export` - Request data export
- `POST /api/compliance/data-deletion` - Request data deletion
- `GET /api/compliance/audit-trail` - Get compliance audit trail

### Webhooks
- `GET /api/webhooks` - Get webhooks
- `POST /api/webhooks` - Create webhook
- `POST /api/webhooks/:id/test` - Test webhook
- `POST /api/webhooks/stripe` - Stripe webhook endpoint
- `POST /api/webhooks/shopify` - Shopify webhook endpoint

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trackdesk_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV="production"
FRONTEND_URL="http://localhost:3000"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@trackdesk.com"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# CDN and File Storage
CDN_BASE_URL="https://cdn.trackdesk.com"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="trackdesk-assets"

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_REAL_TIME=true
ENABLE_PWA=true
ENABLE_WHITE_LABEL=true
ENABLE_MULTI_TENANT=true
ENABLE_2FA=true
ENABLE_AUDIT_LOGS=true
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Database Schema

The database includes the following main entities:

- **Users** - User accounts and authentication
- **AffiliateProfiles** - Affiliate-specific data
- **AdminProfiles** - Admin-specific data
- **Offers** - Affiliate offers and campaigns
- **AffiliateLinks** - Generated tracking links
- **Clicks** - Click tracking data
- **Conversions** - Conversion tracking data
- **Commissions** - Commission calculations
- **Payouts** - Payout processing
- **Creatives** - Marketing materials
- **Coupons** - Discount codes
- **Notifications** - System notifications
- **Activities** - Audit trail
- **Webhooks** - Webhook configurations
- **TrafficRules** - Automation rules

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Granular permission system
- **Two-Factor Authentication** - TOTP-based 2FA
- **Rate Limiting** - API rate limiting and throttling
- **IP Blocking** - Block suspicious IP addresses
- **Input Validation** - Comprehensive input validation
- **SQL Injection Protection** - Prisma ORM protection
- **XSS Protection** - Cross-site scripting protection
- **CSRF Protection** - Cross-site request forgery protection
- **Audit Logging** - Comprehensive audit trail
- **Data Encryption** - Sensitive data encryption
- **Session Management** - Secure session handling

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment-Specific Configurations

- **Development** - Local development with hot reload
- **Staging** - Pre-production testing environment
- **Production** - Live production environment

## 📊 Monitoring & Logging

- **Winston Logging** - Structured logging with multiple transports
- **Error Tracking** - Comprehensive error handling and tracking
- **Performance Monitoring** - API response time monitoring
- **Health Checks** - Application health monitoring
- **Metrics Collection** - Business and technical metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact support@trackdesk.com
- Check the documentation at docs.trackdesk.com

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

---

Built with ❤️ by the Trackdesk Team


