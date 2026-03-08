# 🔥 QUICK FIX: "Failed to load charity requests" Error

## Problem
The Admin Charity Requests page shows an error: **"Failed to load charity requests"**

## Root Cause
The `VITE_API_URL` environment variable in Vercel is missing the `/api` suffix, causing all API calls to go to the wrong endpoint.

## ✅ Solution (Takes 2 minutes)

### Step 1: Fix Environment Variable in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (impact-gift frontend)
3. Click **Settings** → **Environment Variables**
4. Find `VITE_API_URL`
5. Update the value to: `https://impact-gift-backend.onrender.com/api`
   - ⚠️ **CRITICAL**: Make sure `/api` is at the end!
6. Click **Save**

### Step 2: Redeploy
1. Go to **Deployments** tab
2. Click **"..."** next to the latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes for deployment to complete

### Step 3: Verify the Fix
1. Go to `https://giftwithimpact.com`
2. Log in as admin
3. Navigate to **Dashboard** → **Charity Requests**
4. The page should now load successfully!

## Verification

Open browser console (F12) on `giftwithimpact.com` and run:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

Expected output:
```
https://impact-gift-backend.onrender.com/api
```

If it shows anything else, the environment variable wasn't updated correctly.

## Still Not Working?

Check the [full Troubleshooting Guide](TROUBLESHOOTING.md) for additional debugging steps.

## What Was Fixed

The production deployment documentation previously showed:
```bash
❌ WRONG: VITE_API_URL=https://impact-gift-backend.onrender.com
```

Now corrected to:
```bash
✅ CORRECT: VITE_API_URL=https://impact-gift-backend.onrender.com/api
```

This fix has been committed and the documentation has been updated.

## Files Updated
- `PRODUCTION_DEPLOYMENT.md` - Fixed the API URL configuration
- `TROUBLESHOOTING.md` - Created comprehensive troubleshooting guide
- `README.md` - Added links to troubleshooting resources

## Prevention
Always ensure `VITE_API_URL` includes the `/api` suffix when deploying to production!
