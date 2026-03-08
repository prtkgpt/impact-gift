# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### "Failed to load charity requests" Error

**Symptoms:**
- Admin Charity Requests page shows error message
- Toast notification: "Failed to load charity requests"
- Network tab shows 404 or failed requests

**Root Cause:**
The `VITE_API_URL` environment variable in Vercel is not correctly configured.

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `VITE_API_URL`
3. Ensure it's set to: `https://impact-gift-backend.onrender.com/api`
   - ⚠️ **CRITICAL**: The `/api` suffix is required!
   - ❌ Wrong: `https://impact-gift-backend.onrender.com`
   - ✅ Correct: `https://impact-gift-backend.onrender.com/api`
4. Save the change
5. Go to Deployments → Click "..." → Redeploy
6. Wait 1-2 minutes for deployment to complete

**Verification:**
```bash
# Open browser console on giftwithimpact.com and run:
console.log(import.meta.env.VITE_API_URL)
# Should output: https://impact-gift-backend.onrender.com/api
```

---

### API Timeout Errors

**Symptoms:**
- Requests fail after 8 seconds
- "Request timed out" errors

**Root Cause:**
The API client has an 8-second timeout configured (see `frontend/src/utils/api.ts:10`)

**Solutions:**

**Option 1: Increase timeout (quick fix)**
```typescript
// frontend/src/utils/api.ts
timeout: 15000 // Increase to 15 seconds
```

**Option 2: Optimize backend (recommended)**
- Check Render logs for slow queries
- Add database indexes
- Enable caching for frequently accessed data

---

### CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" errors in console
- Network requests blocked

**Root Cause:**
Frontend URL not in backend's allowed origins list

**Solution:**
1. Go to Render Dashboard → Backend Service → Environment
2. Verify `FRONTEND_URL` is set to: `https://giftwithimpact.com`
3. Check `backend/src/index.ts` line 38-43 for allowed origins:
   ```typescript
   const allowedOrigins = [
     process.env.FRONTEND_URL || 'http://localhost:5173',
     'https://giftwithimpact.com',
     'https://www.giftwithimpact.com',
     'http://localhost:5173'
   ];
   ```
4. If you're using a different domain, add it to this list
5. Commit and push changes

---

### Database Connection Issues

**Symptoms:**
- Health check fails
- "Database not connected" errors
- API returns 500 errors

**Diagnosis:**
```bash
curl https://impact-gift-backend.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-08...",
  "database": "connected",
  "environment": "production"
}
```

**If database shows "disconnected":**
1. Check Render Dashboard → PostgreSQL → Status
2. Verify `DATABASE_URL` environment variable is set
3. Check Render logs for connection errors
4. Ensure database is not sleeping (free tier limitation)

---

### Missing Tables (42P01 Error)

**Symptoms:**
- Error code 42P01 in logs
- "relation does not exist" errors

**Solution:**
Run database migrations:
```bash
# Step 1: Initialize database
curl https://impact-gift-backend.onrender.com/api/setup/init-database

# Step 2: Run Phase 1 migration
curl https://impact-gift-backend.onrender.com/api/setup/migrate-phase1

# Step 3: Run Phase 2 migration
curl https://impact-gift-backend.onrender.com/api/setup/migrate-phase2-direct-donations

# Step 4: Add curated charities
curl https://impact-gift-backend.onrender.com/api/setup/add-curated-charities

# Step 5: Create charity requests table
curl https://impact-gift-backend.onrender.com/api/setup/create-charity-requests-table

# Step 6: Fix charity requests table (if needed)
curl https://impact-gift-backend.onrender.com/api/setup/fix-charity-requests-table
```

---

### Authentication Issues (401 Errors)

**Symptoms:**
- Redirected to login page unexpectedly
- "Unauthorized" errors
- Token errors in console

**Root Cause:**
JWT token expired or invalid

**Solutions:**

**Option 1: Clear local storage**
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Delete `token` and `user` entries
4. Refresh page and log in again

**Option 2: Check JWT_SECRET**
1. Verify `JWT_SECRET` is set in Render environment variables
2. Ensure it's the same across deployments
3. Never commit JWT_SECRET to git

---

### Environment Variables Not Loading

**Symptoms:**
- `import.meta.env.VITE_API_URL` is undefined
- Features not working correctly

**Root Cause:**
Environment variables must be prefixed with `VITE_` to be exposed to the frontend

**Solution:**
1. Verify all frontend env vars start with `VITE_`
2. After changing env vars in Vercel, trigger a new deployment
3. Build-time env vars require rebuild to take effect

**Vercel Environment Variables:**
```bash
VITE_API_URL=https://impact-gift-backend.onrender.com/api
VITE_FRONTEND_URL=https://giftwithimpact.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

### Render Backend Not Waking Up

**Symptoms:**
- First request takes 30+ seconds
- Subsequent requests are fast

**Root Cause:**
Render free tier puts inactive services to sleep after 15 minutes

**Solutions:**

**Option 1: Use Render's paid tier**
- No cold starts
- Always running

**Option 2: Keep-alive ping**
- Set up external monitoring (UptimeRobot, Pingdom)
- Ping health endpoint every 10 minutes

**Option 3: Show loading state**
- Display message: "Backend is waking up, please wait..."

---

## Debugging Checklist

When something goes wrong, check these in order:

### 1. Frontend
- [ ] Browser console for errors (F12)
- [ ] Network tab for failed requests
- [ ] Environment variables in Vercel
- [ ] Latest deployment succeeded
- [ ] Correct API URL with `/api` suffix

### 2. Backend
- [ ] Render logs for errors
- [ ] Health endpoint returns 200 OK
- [ ] Environment variables set correctly
- [ ] Latest deployment succeeded
- [ ] Database is connected

### 3. Database
- [ ] PostgreSQL service is running
- [ ] Tables exist (run migrations if needed)
- [ ] No connection errors in logs
- [ ] Sufficient disk space

### 4. Network
- [ ] CORS headers allow your domain
- [ ] No firewall blocking requests
- [ ] DNS resolves correctly
- [ ] SSL certificate is valid

---

## Quick Diagnostic Commands

```bash
# Check backend health
curl https://impact-gift-backend.onrender.com/api/health

# Check frontend is deployed
curl -I https://giftwithimpact.com

# Test API endpoint directly
curl https://impact-gift-backend.onrender.com/api/charities/requests

# Check DNS resolution
nslookup giftwithimpact.com

# Test CORS from browser console
fetch('https://impact-gift-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## Getting Help

If you've tried all the above and still have issues:

1. **Check Render Logs:**
   - Render Dashboard → Backend Service → Logs
   - Look for error messages with timestamps
   - Search for specific error codes

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Console tab → Look for red errors
   - Network tab → Check failed requests

3. **Document the Issue:**
   - What were you trying to do?
   - What error message did you see?
   - What have you tried so far?
   - Screenshots of errors

4. **Check Status Pages:**
   - [Vercel Status](https://www.vercel-status.com/)
   - [Render Status](https://status.render.com/)

---

## Prevention Tips

- **Always test after deploying:** Run through critical user flows
- **Monitor regularly:** Set up uptime monitoring
- **Keep logs:** Review Render logs weekly
- **Version environment variables:** Document changes
- **Test in staging first:** Use Vercel preview deployments
- **Have rollback plan:** Keep previous deployment available

---

## Emergency Rollback

If a deployment breaks production:

**Vercel (Frontend):**
1. Go to Deployments tab
2. Find the last working deployment
3. Click "..." → "Promote to Production"

**Render (Backend):**
1. Go to your service → Deployments
2. Find last working deployment
3. Click "Redeploy"

**Database:**
- Render PostgreSQL has automatic backups
- Can restore from backup in dashboard
