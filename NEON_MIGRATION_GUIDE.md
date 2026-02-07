# Neon Database Migration Guide

## Overview
Migrating from Render managed PostgreSQL to Neon.tech PostgreSQL (free tier).

## Current Status
✅ Updated render.yaml to use external database instead of Render managed database
✅ Removed old database configuration from render.yaml

## Next Steps - Manual Actions Required

### Step 1: Update Render Environment Variable

1. Go to Render Dashboard: https://dashboard.render.com/
2. Navigate to your **impact-gift-backend** service
3. Go to **Environment** tab
4. Find the `DATABASE_URL` variable
5. Update its value to:
   ```
   postgresql://neondb_owner:npg_7krjPRX2KnFt@ep-fancy-night-aiyph41o-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Click **Save Changes**

### Step 2: Trigger Deployment

After saving the DATABASE_URL:
- Render will automatically trigger a new deployment
- OR manually trigger via **Manual Deploy** → **Deploy latest commit**

### Step 3: Monitor Deployment

Watch the deployment logs for:
1. ✅ `npm install` - Installing dependencies
2. ✅ `npm run build` - Building TypeScript
3. ✅ `npm run migrate:prod` - **IMPORTANT: Running migrations on Neon**
   - This will create all tables, indexes, and schema on Neon
   - Watch for "✅ Migration complete" messages
4. ✅ `npm start` - Starting the server

### Step 4: Verify Application

1. Test login at https://www.giftwithimpact.com/login
2. Create a test event
3. Check that all pages load quickly (should be 5-10x faster with new indexes)
4. Verify favorite charities page works
5. Test creating donations

### Step 5: Clean Up (Optional)

Once verified working:
1. Go to Render Dashboard → Databases
2. Delete the old **impact-gift-db** database to stop any potential charges

## What Happens During Migration

The `preDeployCommand: cd backend && npm run migrate:prod` in render.yaml will:
1. Connect to Neon database using new DATABASE_URL
2. Create `schema_migrations` tracking table
3. Run all migrations in order:
   - Create base schema (users, events, charities, donations, etc.)
   - Add performance indexes (15+ new indexes for speed)
   - Add all feature tables (potluck, guests, event_charities, etc.)

## Database Performance Improvements

The new migration includes critical performance indexes:
- `idx_users_email` - Fast login lookups
- `idx_events_slug` - Fast event page loads
- `idx_favorite_charities_user_id` - Fast dashboard loads
- `idx_events_user_id` - Fast "My Events" page
- And 10+ more indexes for optimal performance

## Expected Results

- Login: ~100ms (vs 2-3 seconds before)
- Dashboard: ~150ms (vs 3-5 seconds before)
- Event pages: ~120ms (vs 2-4 seconds before)
- Favorite charities: ~100ms (vs 2-3 seconds before)

## Troubleshooting

### If deployment fails:
1. Check Render logs for specific error
2. Verify DATABASE_URL was copied correctly (no extra spaces)
3. Ensure Neon database is active at neon.tech dashboard

### If migrations fail:
1. Migrations are idempotent (use `IF NOT EXISTS`)
2. Safe to re-run deployment
3. Check Neon dashboard for connection limits

### If app doesn't connect:
1. Verify DATABASE_URL includes `?sslmode=require`
2. Check Neon project is not suspended
3. Verify Render service is running

## Contact Info

- Neon Dashboard: https://console.neon.tech/
- Render Dashboard: https://dashboard.render.com/
- Database: `neondb` on endpoint `ep-fancy-night-aiyph41o-pooler`

## Fresh Start Approach

Since this is a new migration with 1-3 users:
- No data backup needed
- Users will need to re-register
- Create test events to verify functionality
- This gives us a clean, optimized database from the start
