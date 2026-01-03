# Quick Deploy Guide - Get Live in 15 Minutes! 🚀

Choose your deployment method below and follow the steps.

---

## 🎯 Option 1: Render (Recommended - Free Tier)

### 1. Create Account & Connect GitHub
- Go to https://render.com
- Sign up with GitHub
- Authorize Render to access your repository

### 2. Deploy Backend + Database
1. Click **"New"** → **"Blueprint"**
2. Select your `impact-gift` repository
3. Render auto-detects `render.yaml`
4. Click **"Apply"**
5. Wait 5-10 minutes for deployment

### 3. Add Stripe Keys
1. Go to **Backend Service** → **Environment**
2. Add these variables:
   ```
   STRIPE_SECRET_KEY = sk_test_... (from Stripe Dashboard)
   STRIPE_WEBHOOK_SECRET = whsec_... (leave blank for now)
   FRONTEND_URL = https://your-app.vercel.app (we'll update this)
   ```
3. Click **"Save Changes"**

### 4. Setup Database
1. Go to **Database** → **Connect** → **External Connection**
2. Copy the PSQL command
3. Run locally:
   ```bash
   # The command will look like:
   psql -h dpg-xxx.oregon-postgres.render.com -U impact_gift impact_gift

   # Then run:
   \i backend/src/database/schema.sql
   \q
   ```

### 5. Deploy Frontend to Vercel
```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

Follow prompts:
- Set up project: **Yes**
- Link to existing: **No**
- Project name: **impact-gift**
- Directory: **./frontend** (IMPORTANT!)

### 6. Configure Frontend Environment
1. Go to **Vercel Dashboard** → **Project Settings** → **Environment Variables**
2. Add:
   ```
   VITE_API_URL = https://your-backend.onrender.com/api
   VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
   ```
3. Redeploy:
   ```bash
   vercel --prod
   ```

### 7. Update Backend with Frontend URL
1. Go back to **Render** → **Backend Service** → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL
3. Save and wait for redeploy

### 8. Configure Stripe Webhook
1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Add endpoint: `https://your-backend.onrender.com/api/donations/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy **Signing Secret**
5. Add to Render as `STRIPE_WEBHOOK_SECRET`

**✅ You're live!** Visit your Vercel URL

---

## 🚂 Option 2: Railway (Fastest)

### 1. Create Account
- Go to https://railway.app
- Sign up with GitHub

### 2. Add Database
1. **New Project**
2. **Add Service** → **Database** → **PostgreSQL**
3. Note the database is provisioned automatically

### 3. Deploy Backend
1. **Add Service** → **GitHub Repo**
2. Select `impact-gift`
3. Configure:
   - **Root Directory**: Leave blank
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`

### 4. Add Environment Variables
1. Click **Variables** tab
2. Add:
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your_random_secret_here
   JWT_EXPIRES_IN=7d
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
3. Railway auto-redeploys

### 5. Initialize Database
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Connect to database
railway run psql $DATABASE_URL

# Import schema
\i backend/src/database/schema.sql
\q
```

### 6. Deploy Frontend (Vercel)
Same as Option 1, Step 5-6

### 7. Get Domain
1. Railway → **Backend Service** → **Settings** → **Generate Domain**
2. Copy the URL (e.g., `your-app.up.railway.app`)
3. Use this as your `VITE_API_URL` in Vercel

**✅ Done!**

---

## 🐳 Option 3: Docker (Local/Self-Hosted)

### Quick Local Setup

```bash
# Create .env file
cat > .env << EOF
DB_PASSWORD=secure_password_123
JWT_SECRET=$(openssl rand -base64 32)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
EOF

# Start everything
docker-compose up
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Database: localhost:5432

**Stop:**
```bash
docker-compose down
```

---

## ⚡ Troubleshooting

### Backend won't start
- ✅ Check `DATABASE_URL` is correct
- ✅ Verify all env vars are set
- ✅ Check logs in platform dashboard

### Frontend can't reach backend
- ✅ Verify `VITE_API_URL` has `/api` at the end
- ✅ Check backend is deployed and running
- ✅ Verify CORS: `FRONTEND_URL` in backend matches frontend URL

### Stripe payments failing
- ✅ Use test card: `4242 4242 4242 4242`
- ✅ Verify `STRIPE_SECRET_KEY` starts with `sk_test_`
- ✅ Check webhook endpoint is accessible

### Database connection error
- ✅ Ensure database is running
- ✅ Check connection string format
- ✅ Verify schema is imported

---

## 📋 Post-Deployment Checklist

- [ ] Can sign up new user
- [ ] Can create event
- [ ] Can view event page
- [ ] Can make test donation
- [ ] Donation appears on dashboard
- [ ] Stripe webhook is working

---

## 🔑 Get Your Stripe Keys

1. Go to https://stripe.com → Sign up
2. **Dashboard** → **Developers** → **API Keys**
3. Toggle **Test Mode** (top right)
4. Copy:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

---

## 📱 Share Your App

Once deployed, share your event page:
```
https://your-frontend-url.vercel.app/event/event-slug
```

People can donate without creating an account!

---

## 💰 Cost

**Free Tier:**
- Render: Free
- Vercel: Free
- Railway: Free for first month
- **Total: $0**

**After Free Tier:**
- Railway: ~$5/month
- Render: ~$7/month (if using paid tier)
- Vercel: Free (unless high traffic)

---

## 🆘 Need Help?

1. Check **DEPLOYMENT.md** for detailed guides
2. Review platform logs
3. Open GitHub issue

Happy deploying! 🎉
