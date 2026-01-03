# Deploy Impact Gift to Render + Vercel - Step by Step

Follow these exact steps to get your app live in 15 minutes!

---

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] GitHub repository with all code pushed ✓ (you have this!)
- [ ] Stripe account (we'll create this if needed)
- [ ] A few minutes to complete the setup

---

## STEP 1: Get Your Stripe Keys (5 minutes)

### 1.1 Create Stripe Account

1. Go to https://stripe.com
2. Click **"Start now"** or **"Sign in"**
3. Fill in your details (use test mode for now)
4. Verify your email

### 1.2 Get API Keys

1. Once logged in, you'll be in the **Dashboard**
2. Make sure **"Test mode"** toggle is ON (top right corner)
3. Go to **Developers** → **API keys** (left sidebar)
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (click "Reveal test key", starts with `sk_test_`)

5. **COPY THESE** somewhere safe (we'll use them soon):
   ```
   Publishable key: pk_test_xxxxxxxxxxxxx
   Secret key: sk_test_xxxxxxxxxxxxx
   ```

**Important:** We'll add the webhook secret later after deployment.

---

## STEP 2: Deploy Backend + Database to Render (5 minutes)

### 2.1 Create Render Account

1. Go to https://render.com
2. Click **"Get Started"**
3. Choose **"Sign in with GitHub"**
4. Authorize Render to access your GitHub

### 2.2 Deploy Using Blueprint

1. From Render Dashboard, click **"New +"** (top right)
2. Select **"Blueprint"**
3. Connect your repository:
   - If first time: Click **"Connect account"** → Authorize GitHub
   - Select **"impact-gift"** repository
   - Click **"Connect"**

4. Render will detect `render.yaml` file
5. You'll see:
   - **impact-gift-backend** (Web Service)
   - **impact-gift-db** (PostgreSQL Database)

6. Click **"Apply"** button

### 2.3 Configure Environment Variables

While it's deploying (will show "Creating..."):

1. Click on **"impact-gift-backend"** service (it will open in new tab)
2. Go to **"Environment"** tab (left sidebar)
3. Click **"Add Environment Variable"**

Add these THREE variables:

**Variable 1:**
```
Key: STRIPE_SECRET_KEY
Value: sk_test_your_key_from_step_1
```

**Variable 2:**
```
Key: STRIPE_WEBHOOK_SECRET
Value: leave_blank_for_now
```

**Variable 3:**
```
Key: FRONTEND_URL
Value: https://temporary-url.vercel.app
```
(We'll update this after deploying frontend)

4. Click **"Save Changes"**
5. Service will auto-redeploy (takes 2-3 minutes)

### 2.4 Get Your Backend URL

1. Once deployed (status shows green "Live"), scroll to top
2. You'll see a URL like: `https://impact-gift-backend-xxxx.onrender.com`
3. **COPY THIS URL** - we need it for frontend!

Test it by visiting: `https://your-backend-url.onrender.com/api/health`

You should see: `{"status":"ok","timestamp":"..."}`

### 2.5 Initialize the Database

1. Go back to Render Dashboard
2. Click on **"impact-gift-db"** (the database)
3. Scroll down to **"Connections"**
4. Copy the **"External Database URL"** (starts with `postgres://`)

5. Open your terminal and run:
   ```bash
   # On Mac/Linux:
   psql "postgres://impact_gift:long_password@..." -f backend/src/database/schema.sql

   # If you don't have psql installed, use Render's shell:
   # Click "Shell" tab in database dashboard and run:
   \i /opt/render/project/src/backend/src/database/schema.sql
   ```

6. You should see:
   ```
   CREATE TABLE
   CREATE TABLE
   CREATE TABLE
   CREATE TABLE
   ...
   INSERT 0 8
   ```

**✅ Backend is LIVE!**

---

## STEP 3: Deploy Frontend to Vercel (3 minutes)

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Login to Vercel

```bash
vercel login
```

Choose your login method (GitHub recommended).

### 3.3 Deploy Frontend

```bash
cd frontend
vercel
```

**Answer the prompts:**

```
? Set up and deploy "~/impact-gift/frontend"? [Y/n] Y

? Which scope do you want to deploy to? [Your account]

? Link to existing project? [y/N] N

? What's your project's name? impact-gift

? In which directory is your code located? ./
(just press Enter - we're already in frontend/)

? Want to modify these settings? [y/N] N
```

Vercel will:
1. Build your app
2. Deploy to a preview URL
3. Show you the URL

**BUT WAIT!** We need to add environment variables first.

### 3.4 Add Environment Variables

1. Go to https://vercel.com/dashboard
2. Find your **"impact-gift"** project
3. Click on it
4. Go to **"Settings"** tab (top)
5. Click **"Environment Variables"** (left sidebar)

Add these TWO variables:

**Variable 1:**
```
Key: VITE_API_URL
Value: https://your-backend-url.onrender.com/api
(Use the Render URL from Step 2.4, add /api at the end!)
```

**Variable 2:**
```
Key: VITE_STRIPE_PUBLISHABLE_KEY
Value: pk_test_your_key_from_step_1
```

6. Click **"Save"** for each

### 3.5 Redeploy with Environment Variables

```bash
# Still in frontend directory
vercel --prod
```

This deploys to production with your environment variables.

### 3.6 Get Your Frontend URL

Vercel will show:
```
✅  Production: https://impact-gift-xxxx.vercel.app
```

**COPY THIS URL!**

Visit it in your browser - you should see the Impact Gift homepage! 🎉

---

## STEP 4: Update Backend with Frontend URL (1 minute)

Now we need to tell the backend about the frontend URL for CORS:

1. Go back to **Render Dashboard**
2. Click **"impact-gift-backend"**
3. Go to **"Environment"** tab
4. Find **FRONTEND_URL**
5. Click **"Edit"** (pencil icon)
6. Change value to: `https://your-app.vercel.app` (your actual Vercel URL)
7. Click **"Save Changes"**

Service will auto-redeploy (takes 1-2 minutes).

---

## STEP 5: Configure Stripe Webhook (2 minutes)

### 5.1 Add Webhook Endpoint

1. Go to **Stripe Dashboard**: https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle top right)
3. Go to **Developers** → **Webhooks** (left sidebar)
4. Click **"Add endpoint"**

5. Enter endpoint URL:
   ```
   https://your-backend.onrender.com/api/donations/webhook
   ```
   (Use your actual Render backend URL!)

6. Click **"Select events"**
7. Search and select these TWO events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

8. Click **"Add events"** → **"Add endpoint"**

### 5.2 Get Webhook Secret

1. Click on the webhook you just created
2. Scroll to **"Signing secret"**
3. Click **"Reveal"** or **"Copy"**
4. Copy the secret (starts with `whsec_`)

### 5.3 Add to Render

1. Go back to **Render** → **impact-gift-backend** → **Environment**
2. Find **STRIPE_WEBHOOK_SECRET**
3. Edit and paste the webhook secret: `whsec_xxxxx`
4. **Save Changes**

Wait for redeploy (~1 minute).

---

## STEP 6: Test Your Deployment! 🎉

### 6.1 Create an Account

1. Visit your Vercel URL: `https://impact-gift-xxxx.vercel.app`
2. Click **"Sign Up"**
3. Fill in details:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: password123
4. Click **"Sign Up"**

You should be redirected to the Dashboard!

### 6.2 Create an Event

1. Click **"Create Event"** (or **"Create New Event"**)
2. Fill in:
   - Title: "My Birthday Fundraiser"
   - Description: "Please donate instead of gifts!"
   - Event Type: Birthday
   - Date: Pick a date
   - Charity: Choose any (e.g., Red Cross)
   - Goal: 100 (optional)
3. Click **"Create Event"**

You'll be redirected to your event page!

### 6.3 Make a Test Donation

1. On the event page, click **"Make a Donation"**
2. Fill in:
   - Your Name: John Doe
   - Email: john@example.com (optional)
   - Amount: 25.00
   - Message: "Happy Birthday!" (optional)

3. **Card Details** - Use Stripe test card:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/34 (any future date)
   CVC: 123 (any 3 digits)
   ZIP: 12345 (any 5 digits)
   ```

4. Click **"Donate Now"**

You should see a success message! 🎉

### 6.4 Verify Everything Works

1. Go back to **Dashboard**
2. You should see:
   - Total raised: $25.00
   - 1 donation
   - Progress bar updated

3. Click **"View Event Page"**
4. Scroll down - you should see the donation in "Recent Donations"

**✅ EVERYTHING WORKS!**

---

## 🎊 Congratulations! Your App is LIVE!

### Your URLs:

- **Frontend**: https://impact-gift-xxxx.vercel.app
- **Backend**: https://impact-gift-backend-xxxx.onrender.com
- **API Health**: https://your-backend.onrender.com/api/health

### Share Your Event:

Create an event and share the URL:
```
https://impact-gift-xxxx.vercel.app/event/your-event-slug
```

Anyone can donate without creating an account!

---

## 📝 Important Notes

### Free Tier Limitations:

**Render Free Tier:**
- ⚠️ Backend goes to sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- **Solution**: Upgrade to paid plan ($7/month) or use a service like UptimeRobot to ping it

**Vercel:**
- ✅ No sleep issues
- ✅ Always fast and available

### Going to Production:

When ready for real donations:

1. **Switch to Stripe Live Mode:**
   - Get live API keys (starts with `pk_live_` and `sk_live_`)
   - Update environment variables in Render and Vercel
   - Update webhook to use live mode keys

2. **Custom Domain** (optional):
   - Vercel: Settings → Domains → Add domain
   - Update FRONTEND_URL in Render
   - Update Stripe webhook URL

---

## 🆘 Troubleshooting

### Frontend shows "Network Error"
- ✅ Check VITE_API_URL in Vercel has `/api` at end
- ✅ Verify backend is deployed and "Live" in Render
- ✅ Check browser console for errors

### Donation fails
- ✅ Use test card: 4242 4242 4242 4242
- ✅ Check Stripe webhook is configured
- ✅ Verify STRIPE_WEBHOOK_SECRET in Render

### Backend is slow
- ⚠️ Free tier sleeps - first request takes 30 seconds
- ✅ This is normal for Render free tier
- ✅ Upgrade to paid plan to avoid sleep

---

## 🎯 Next Steps

1. **Share your app** with friends and family
2. **Create real events** for upcoming birthdays/celebrations
3. **Customize charities** (add your favorites to database)
4. **Set up custom domain** (optional)
5. **Upgrade to paid tier** when ready for production

---

## 💡 Pro Tips

- **Test Mode**: Always test donations first before going live
- **Webhooks**: Check Stripe Dashboard → Webhooks → Events to debug
- **Logs**: Render → Logs tab shows all backend activity
- **Monitoring**: Set up UptimeRobot to keep backend awake (free)

---

Need help? Check DEPLOYMENT.md for detailed troubleshooting!

Enjoy your deployed app! 🚀
