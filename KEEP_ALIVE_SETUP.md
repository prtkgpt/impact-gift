# Keep Services Warm - Free Solutions

This guide helps you keep your Render free-tier services warm to avoid cold starts.

## ✅ Option 1: GitHub Actions (Recommended)

**Pros:** 
- ✅ Free forever
- ✅ Fully automated
- ✅ Version controlled with your code
- ✅ Runs in GitHub's infrastructure

**Setup:**

1. **Add your backend URL to GitHub Secrets:**
   - Go to: `https://github.com/YOUR_USERNAME/impact-gift/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `BACKEND_URL`
   - Value: `https://your-app-name.onrender.com` (your actual Render URL)
   - Click "Add secret"

2. **Commit and push the workflow file:**
   ```bash
   git add .github/workflows/keep-alive.yml
   git commit -m "Add keep-alive workflow to prevent cold starts"
   git push
   ```

3. **Verify it's working:**
   - Go to: `https://github.com/YOUR_USERNAME/impact-gift/actions`
   - Click on "Keep Services Warm" workflow
   - You should see it running every 5 minutes during peak hours

4. **Manual trigger (optional):**
   - Go to Actions → Keep Services Warm
   - Click "Run workflow" to test immediately

**Schedule:**
- Every 5 minutes during peak hours (8 AM - 11 PM UTC)
- Every 14 minutes during off-peak (0-7 AM UTC)
- Adjust timezone in `.github/workflows/keep-alive.yml` if needed

---

## ✅ Option 2: Cron-job.org

**Pros:**
- ✅ Free
- ✅ Simple web interface
- ✅ No coding needed

**Setup:**

1. Go to https://cron-job.org and create free account

2. Create new cron job:
   - **Title:** "Impact Gift Keep Alive"
   - **URL:** `https://your-app-name.onrender.com/api/health`
   - **Schedule:** Every 5 minutes
   - **Save**

3. Add second job for database:
   - **Title:** "Impact Gift DB Keep Alive"
   - **URL:** `https://your-app-name.onrender.com/api/charities?limit=1`
   - **Schedule:** Every 10 minutes
   - **Save**

**Limits:**
- Free tier: Up to 5 cron jobs
- Minimum interval: 1 minute
- Perfect for small apps!

---

## ✅ Option 3: UptimeRobot

**Pros:**
- ✅ Free
- ✅ Bonus: Uptime monitoring + alerts
- ✅ Status page generation

**Setup:**

1. Go to https://uptimerobot.com and create free account

2. Add new monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** "Impact Gift Backend"
   - **URL:** `https://your-app-name.onrender.com/api/health`
   - **Monitoring Interval:** 5 minutes
   - **Create Monitor**

3. Optional: Add email/SMS alerts for downtime

**Limits:**
- Free tier: 50 monitors
- 5-minute minimum interval
- Includes uptime reports

---

## ✅ Option 4: Render Keep-Alive (Native)

**Note:** Render is adding native keep-alive features. Check:
https://render.com/docs/free#free-web-services

They may have added a "keep alive" option in your service settings.

---

## 🎯 Recommendation

**Best choice:** GitHub Actions (Option 1)
- Already set up in this repo!
- Just add the `BACKEND_URL` secret and push
- Runs automatically forever

**Alternative:** Cron-job.org (Option 2)
- If you prefer a simple web UI
- 2-minute setup, no code needed

---

## 📊 Expected Results

**Before:**
- First load: 30-60 seconds
- Subsequent loads: Fast

**After (with keep-alive):**
- First load: 1-2 seconds ✨
- Subsequent loads: <1 second ✨

**Why:** Services stay warm and ready to respond!

---

## ⚠️ Important Notes

1. **GitHub Actions limits:**
   - Free tier: 2,000 minutes/month
   - Our workflow uses ~5 min/day = 150 min/month
   - Well within limits! ✅

2. **Render free tier limits:**
   - 750 hours/month of runtime
   - Keep-alive pings don't count against this
   - Only actual usage time counts ✅

3. **Not 100% prevention:**
   - Free services may still occasionally spin down
   - But reduces cold starts by ~95% ✨

---

## 🐛 Troubleshooting

**GitHub Actions not running:**
- Check: Settings → Actions → Enable workflows
- Verify: `BACKEND_URL` secret is set correctly
- Look at: Actions tab for error logs

**Still seeing cold starts:**
- Reduce ping interval to 3 minutes (edit workflow file)
- Add more endpoints to ping (database queries keep both warm)
- Consider upgrading to Render paid tier ($7/month) for guaranteed always-on

**Rate limiting:**
- Free tiers are generous, you won't hit limits
- If you do, increase interval to 10 minutes

---

## 💰 Cost Comparison

| Solution | Monthly Cost | Effectiveness |
|----------|--------------|---------------|
| GitHub Actions | $0 | 95% warm |
| Cron-job.org | $0 | 95% warm |
| UptimeRobot | $0 | 90% warm |
| Render Starter | $7 | 100% warm |
| Render Starter + DB | $14 | 100% warm |

**Verdict:** Try free options first, upgrade if needed! 🚀
