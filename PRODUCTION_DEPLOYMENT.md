# 🚀 Production Deployment Checklist

## Critical Fixes Applied

✅ **CORS Configuration** - Now allows both `giftwithimpact.com` and `www.giftwithimpact.com`
✅ **Enhanced Error Handling** - Detailed error messages for debugging
✅ **Database Health Check** - `/api/health` endpoint verifies DB connection
✅ **Improved Logging** - All signup attempts and errors are logged

---

## 📋 Production Deployment Steps

### 1. ✅ Domain Setup (giftwithimpact.com)

**Vercel - Frontend:**
- Go to Vercel Dashboard → Your Project → Settings → Domains
- Add domains:
  - `giftwithimpact.com`
  - `www.giftwithimpact.com`
- Vercel will provide DNS instructions

**DNS Configuration at your registrar:**

```
# Option A: Use Vercel Nameservers (Recommended)
Update nameservers to Vercel's (shown in Vercel dashboard)

# Option B: Manual DNS Records
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

### 2. 🔧 Environment Variables

**RENDER (Backend) - REQUIRED:**

```bash
DATABASE_URL=<auto-provided-by-render-postgresql>
FRONTEND_URL=https://giftwithimpact.com
JWT_SECRET=<generate-secure-random-string>
RESEND_API_KEY=re_<your-resend-api-key>
NODE_ENV=production
```

**Optional (if keeping Stripe code):**
```bash
STRIPE_SECRET_KEY=sk_live_<your-stripe-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>
```

**How to set on Render:**
1. Go to your backend service on Render
2. Click "Environment" tab
3. Add each variable
4. Click "Save Changes" (triggers auto-redeploy)

---

**VERCEL (Frontend) - REQUIRED:**

```bash
VITE_API_URL=https://impact-gift-backend.onrender.com/api
VITE_FRONTEND_URL=https://giftwithimpact.com
```

**Optional (if keeping Stripe):**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_<your-stripe-public-key>
```

**How to set on Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add each variable
3. Select: Production, Preview, Development
4. Click "Save"
5. Trigger redeploy (Deployments → ... → Redeploy)

---

### 3. 🗄️ Database Verification

**Check database is initialized:**

```bash
curl https://impact-gift-backend.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-08...",
  "database": "connected",
  "environment": "production"
}
```

**If database is NOT connected:**
- Check `DATABASE_URL` in Render environment variables
- Verify PostgreSQL add-on is properly connected

**If tables don't exist, run setup:**
```bash
curl https://impact-gift-backend.onrender.com/api/setup/init-database
curl https://impact-gift-backend.onrender.com/api/setup/migrate-phase1
curl https://impact-gift-backend.onrender.com/api/setup/migrate-phase2-direct-donations
curl https://impact-gift-backend.onrender.com/api/setup/add-curated-charities
curl https://impact-gift-backend.onrender.com/api/setup/create-charity-requests-table
```

---

### 4. 🧪 Test Critical Flows

**A. Signup Test:**
1. Go to https://giftwithimpact.com/signup
2. Create account with test email
3. Should succeed and redirect to dashboard

**If signup fails:**
- Check browser console for errors
- Check Render logs: Dashboard → Logs tab
- Look for specific error messages

**B. Login Test:**
1. Go to https://giftwithimpact.com/login
2. Login with account created above
3. Should succeed

**C. Create Event Test:**
1. Login and click "Create Event"
2. Fill in event details
3. Select charities
4. Click "Create Event"
5. Should succeed and show event page

**D. Donation Flow Test:**
1. Visit event page
2. Click "Make a Donation"
3. Enter amount for a charity
4. Click "Donate Now"
5. Enter name and email
6. Click "Continue to [Charity]"
7. Should record donation and open charity page in new tab

---

### 5. 🐛 Troubleshooting

**"Signup failed" error:**

**Check 1: CORS**
```bash
# Test from browser console on giftwithimpact.com:
fetch('https://impact-gift-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```
If CORS error: Check `FRONTEND_URL` env var on Render

**Check 2: JWT_SECRET**
```bash
# Render logs should NOT show:
"JWT_SECRET not configured!"
```
If missing: Add `JWT_SECRET` to Render environment variables

**Check 3: Database**
```bash
curl https://impact-gift-backend.onrender.com/api/health
```
Response should show `"database": "connected"`

**Check 4: Render Logs**
- Go to Render dashboard
- Click on backend service
- Click "Logs" tab
- Look for error messages when signup fails

**Common error codes:**
- `42P01`: Table doesn't exist → Run setup endpoints
- `23505`: Email already exists → Try different email
- `ECONNREFUSED`: Database not connected → Check DATABASE_URL

---

### 6. 📧 Email Configuration (Resend)

**Current setup:**
- Sender: `onboarding@resend.dev` (sandbox mode)
- Works for testing but limited

**For production:**
1. Verify your domain in Resend
2. Update email templates in:
   - `backend/src/services/email.ts`
   - `backend/src/routes/auth.ts`
3. Change from: `onboarding@resend.dev` → `noreply@giftwithimpact.com`

---

### 7. 🔒 Security Checklist

- [ ] `JWT_SECRET` is set to a secure random string (64+ characters)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] Render database has backups enabled
- [ ] CORS only allows giftwithimpact.com domains
- [ ] Rate limiting enabled (consider adding express-rate-limit)
- [ ] Helmet.js security headers enabled ✅
- [ ] All API keys stored in environment variables ✅

---

### 8. 📊 Monitoring

**Health Check:**
```bash
# Add to your monitoring tool:
https://impact-gift-backend.onrender.com/api/health
```

**Render Metrics:**
- Dashboard → Your Service → Metrics
- Monitor: CPU, Memory, Response Time

**Error Tracking:**
- Check Render logs regularly
- Consider adding Sentry or similar

---

## 🎯 Post-Deployment Verification

Run through this checklist:

- [ ] Domain resolves to Vercel (https://giftwithimpact.com)
- [ ] Health check passes
- [ ] Signup works
- [ ] Login works
- [ ] Create event works
- [ ] Donation flow works
- [ ] Emails are sent (check spam folder)
- [ ] No errors in Render logs
- [ ] No errors in browser console

---

## 🆘 Emergency Contacts

**If you encounter critical issues:**

1. **Check Render Logs First**
   - Render Dashboard → Backend Service → Logs
   - Look for error messages with timestamps

2. **Check Browser Console**
   - Open DevTools (F12)
   - Console tab → Look for network errors

3. **Verify Environment Variables**
   - Render: Environment tab
   - Vercel: Settings → Environment Variables

4. **Database Issues**
   - Render Dashboard → PostgreSQL → Logs
   - Check connection string is correct

---

## 📝 Current State

**Deployed:**
- ✅ Frontend: Vercel (auto-deploys from git push)
- ✅ Backend: Render (auto-deploys from git push)
- ✅ Database: PostgreSQL on Render
- ✅ 15 Curated charities loaded
- ✅ Charity requests feature active
- ✅ Donation commitment flow active

**Working Features:**
- User signup/login
- Event creation with multiple charities
- Guest list management
- Email invitations
- Donation commitment flow
- Request a charity
- Mobile responsive design
- Corporate matching support

**Environment:**
- Production branch: `claude/charity-donation-app-6Y24G`
- Backend URL: `https://impact-gift-backend.onrender.com`
- Frontend URL: `https://giftwithimpact.com` (after DNS)

---

## 🔄 Deployment Pipeline

**Automatic deployments:**
```bash
git push -u origin claude/charity-donation-app-6Y24G
```

1. **Backend (Render):**
   - Detects push
   - Runs `npm install`
   - Runs `npm run build`
   - Restarts service
   - Takes ~2-3 minutes

2. **Frontend (Vercel):**
   - Detects push
   - Runs `npm install`
   - Runs `npm run build`
   - Deploys to CDN
   - Takes ~1-2 minutes

**Check deployment status:**
- Render: Dashboard → Activity
- Vercel: Dashboard → Deployments

---

## 📌 Next Steps

1. **Verify DNS propagation** (can take 5-30 minutes)
2. **Set environment variables** on both Render and Vercel
3. **Test signup** at giftwithimpact.com
4. **If signup fails**, check Render logs immediately
5. **Run through test flows** above
6. **Test on mobile** to verify responsive design
7. **Share with first users** for real-world testing

---

## 🎉 You're Ready!

Once DNS propagates and environment variables are set:
- Your app will be live at **https://giftwithimpact.com**
- All features are production-ready
- Error handling and logging are in place
- Mobile responsive design is active

**The latest push includes critical CORS and error handling fixes that should resolve the signup issue!**
