# Impact Gift - Deployment Guide

This guide covers multiple deployment options for Impact Gift. Choose the method that best fits your needs.

## Quick Start Options

1. **Render** (Recommended for beginners) - Free tier, easy setup
2. **Railway** - Simple, modern platform with free tier
3. **Vercel + Railway** - Best for production (Vercel for frontend, Railway for backend)
4. **Docker** - Full control, can deploy anywhere
5. **Manual Deployment** - Traditional VPS/cloud deployment

---

## Option 1: Deploy to Render (Easiest)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

### Step 2: Deploy Backend + Database

1. **From Render Dashboard:**
   - Click "New" → "Blueprint"
   - Connect your `impact-gift` repository
   - Render will detect `render.yaml` and create:
     - PostgreSQL database
     - Backend web service

2. **Set Environment Variables:**
   - Go to your backend service
   - Add these environment variables:
     ```
     STRIPE_SECRET_KEY=sk_live_your_stripe_key
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
     FRONTEND_URL=https://your-frontend.vercel.app
     ```

3. **Initialize Database:**
   - Once deployed, go to the database
   - Connect via "External Connection"
   - Run the schema:
     ```bash
     psql -h your-db-host -U impact_gift -d impact_gift < backend/src/database/schema.sql
     ```

### Step 3: Deploy Frontend to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   - `VITE_API_URL` = Your Render backend URL + `/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = Your Stripe publishable key

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Step 4: Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend.onrender.com/api/donations/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret and update in Render

**Your app is live!** 🎉

---

## Option 2: Deploy to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project

### Step 2: Add PostgreSQL Database

1. Click "New" → "Database" → "PostgreSQL"
2. Railway will provision a database
3. Note the connection string

### Step 3: Deploy Backend

1. Click "New" → "GitHub Repo"
2. Select `impact-gift` repository
3. Railway detects `railway.json`

4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<generate-random-string>
   JWT_EXPIRES_IN=7d
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

5. **Custom Build Command:**
   - Settings → Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`

6. **Initialize Database:**
   - Use Railway's PostgreSQL plugin
   - Connect and run schema:
     ```bash
     railway connect Postgres
     \i backend/src/database/schema.sql
     ```

### Step 4: Deploy Frontend to Vercel

Same as Option 1, Step 3.

---

## Option 3: Docker Deployment

Perfect for deploying to any cloud provider (AWS, GCP, DigitalOcean, etc.)

### Local Docker Testing

```bash
# Start all services
docker-compose up

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

### Production Docker Deployment

1. **Build production image:**
   ```bash
   docker build -t impact-gift:latest .
   ```

2. **Run with environment variables:**
   ```bash
   docker run -d \
     -p 5000:5000 \
     -e DATABASE_URL="postgresql://..." \
     -e JWT_SECRET="..." \
     -e STRIPE_SECRET_KEY="..." \
     -e STRIPE_WEBHOOK_SECRET="..." \
     -e FRONTEND_URL="..." \
     --name impact-gift \
     impact-gift:latest
   ```

3. **Deploy to cloud:**
   - **AWS ECS/Fargate**: Push to ECR, create service
   - **Google Cloud Run**: Push to GCR, deploy
   - **DigitalOcean App Platform**: Connect GitHub, auto-deploy

### Docker Compose for Production

1. Create `.env` file:
   ```env
   DB_PASSWORD=secure_password
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

2. Run:
   ```bash
   docker-compose up -d
   ```

---

## Option 4: Manual VPS Deployment

For deploying to your own server (Ubuntu/Debian).

### Prerequisites

- Ubuntu 20.04+ server
- Domain name pointed to server
- SSH access

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (for frontend)
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE impact_gift;
CREATE USER impact_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE impact_gift TO impact_user;
\q

# Import schema
cd /path/to/impact-gift
sudo -u postgres psql impact_gift < backend/src/database/schema.sql
```

### Step 3: Backend Setup

```bash
# Clone repository
git clone https://github.com/yourusername/impact-gift.git
cd impact-gift/backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://impact_user:secure_password@localhost:5432/impact_gift
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://yourdomain.com
EOF

# Build
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start backend
pm2 start dist/index.js --name impact-gift-backend
pm2 startup
pm2 save
```

### Step 4: Frontend Setup

```bash
cd ../frontend

# Create .env
cat > .env << EOF
VITE_API_URL=https://api.yourdomain.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
EOF

# Build
npm install
npm run build

# Copy to nginx directory
sudo cp -r dist /var/www/impact-gift
```

### Step 5: Nginx Configuration

```bash
# Backend reverse proxy
sudo nano /etc/nginx/sites-available/impact-gift-api

# Add:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
sudo nano /etc/nginx/sites-available/impact-gift

# Add:
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/impact-gift;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Enable sites
sudo ln -s /etc/nginx/sites-available/impact-gift /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/impact-gift-api /etc/nginx/sites-enabled/

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Setup

```bash
# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal (should be automatic)
sudo certbot renew --dry-run
```

---

## Post-Deployment Checklist

### 1. Stripe Configuration

- [ ] Update Stripe webhook URL to production endpoint
- [ ] Switch to live API keys (not test keys)
- [ ] Test donation flow with real card
- [ ] Verify webhook events are received

### 2. Security

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS origins
- [ ] Review environment variables (no secrets in code)
- [ ] Enable database backups

### 3. Testing

- [ ] Test user signup/login
- [ ] Create test event
- [ ] Make test donation
- [ ] Verify webhook processing
- [ ] Check email notifications (if implemented)
- [ ] Test on mobile devices

### 4. Monitoring

- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Enable database monitoring
- [ ] Set up analytics (Google Analytics, Plausible)

### 5. Domain & DNS

- [ ] Configure custom domain
- [ ] Set up DNS records (A, CNAME)
- [ ] Verify SSL certificate
- [ ] Test both www and non-www

---

## Environment Variables Reference

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-chars
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# CORS
FRONTEND_URL=https://yourdomain.com
```

### Frontend (.env)

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
```

---

## Updating Your Deployment

### Git-based Deployments (Render, Railway, Vercel)

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Auto-deploys on push to main branch.

### Docker Deployments

```bash
# Rebuild image
docker build -t impact-gift:latest .

# Stop old container
docker stop impact-gift
docker rm impact-gift

# Start new container
docker run -d -p 5000:5000 --env-file .env --name impact-gift impact-gift:latest
```

### Manual VPS

```bash
# Backend
cd /path/to/impact-gift/backend
git pull
npm install
npm run build
pm2 restart impact-gift-backend

# Frontend
cd ../frontend
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/impact-gift/
```

---

## Troubleshooting

### Database Connection Error

- Check `DATABASE_URL` format
- Verify database is running
- Check firewall rules
- Ensure SSL mode if required

### Stripe Webhook Failing

- Verify webhook URL is correct
- Check `STRIPE_WEBHOOK_SECRET` matches
- Ensure endpoint is publicly accessible
- Review Stripe webhook logs

### CORS Errors

- Verify `FRONTEND_URL` in backend matches actual frontend URL
- Check for trailing slashes
- Ensure HTTPS is used in production

### Build Failures

- Check Node.js version (18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`

---

## Cost Estimates

### Free Tier (Development/MVP)

- **Render**: Free PostgreSQL + Web Service
- **Vercel**: Free frontend hosting
- **Total**: $0/month

### Production (Small Scale)

- **Railway**: $5-10/month (backend + database)
- **Vercel**: Free - $20/month
- **Total**: $5-30/month

### Production (Medium Scale)

- **Render**: $7 (database) + $7 (backend) = $14/month
- **Vercel Pro**: $20/month
- **Total**: $34/month

### Self-Hosted VPS

- **DigitalOcean Droplet**: $6-12/month
- **Domain**: $10-15/year
- **Total**: $7-13/month

---

## Support

Need help with deployment?

1. Check troubleshooting section
2. Review platform-specific docs:
   - [Render Docs](https://render.com/docs)
   - [Railway Docs](https://docs.railway.app)
   - [Vercel Docs](https://vercel.com/docs)
3. Open GitHub issue

Happy deploying! 🚀
