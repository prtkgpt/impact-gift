# Impact Gift - Complete Setup Guide

This guide will walk you through setting up the Impact Gift application from scratch.

## Step 1: System Requirements

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- A code editor (VS Code recommended)

## Step 2: Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/impact-gift.git
cd impact-gift

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

## Step 3: PostgreSQL Setup

### Create Database

**Option 1: Using psql command line**
```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE impact_gift;

# Create a user (optional)
CREATE USER impact_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE impact_gift TO impact_user;

# Exit psql
\q
```

**Option 2: Using createdb command**
```bash
createdb impact_gift
```

### Run Database Schema

```bash
# Navigate to backend
cd backend

# Run the schema file
psql impact_gift < src/database/schema.sql

# Or if using a custom user:
psql -U impact_user -d impact_gift < src/database/schema.sql
```

This will create all necessary tables and insert sample charities.

## Step 4: Stripe Setup

### Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Click "Sign up"
3. Complete the registration process

### Get API Keys

1. Log into Stripe Dashboard
2. Make sure you're in **Test Mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy your:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Set Up Webhook (for local development)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows (using Scoop)
   scoop install stripe

   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/donations/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`)

## Step 5: Environment Variables

### Backend Environment (.env)

Create `backend/.env` file:

```env
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/impact_gift

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Generate a secure JWT secret:**
```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend Environment (.env)

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Step 6: Verify Setup

### Check Database Connection

```bash
# From backend directory
cd backend

# Try connecting to database
psql impact_gift -c "SELECT * FROM charities LIMIT 1;"
```

You should see one charity entry.

### Check Tables

```bash
psql impact_gift -c "\dt"
```

You should see: `users`, `charities`, `events`, `donations` tables.

## Step 7: Run the Application

### Option 1: Run Everything Together (Recommended)

From the root directory:
```bash
npm run dev
```

This starts both backend and frontend concurrently.

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Stripe Webhooks:**
```bash
stripe listen --forward-to localhost:5000/api/donations/webhook
```

## Step 8: Test the Application

1. **Open Browser**: Navigate to http://localhost:5173

2. **Create Account**:
   - Click "Sign Up"
   - Fill in your details
   - Create account

3. **Create Event**:
   - Click "Create Event"
   - Fill in event details
   - Select a charity
   - Set optional goal
   - Create event

4. **View Event**:
   - You'll be redirected to your event page
   - Copy the URL to share

5. **Make Test Donation**:
   - Click "Make a Donation"
   - Fill in donor details
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC
   - Submit donation

6. **View Dashboard**:
   - Go to Dashboard
   - See your event with updated donation amount

## Troubleshooting

### Database Connection Error

**Error**: `ECONNREFUSED` or `password authentication failed`

**Solution**:
1. Check PostgreSQL is running:
   ```bash
   # macOS
   brew services list

   # Ubuntu
   sudo service postgresql status
   ```

2. Verify DATABASE_URL in `.env`:
   ```env
   DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/impact_gift
   ```

3. Test connection:
   ```bash
   psql impact_gift
   ```

### Port Already in Use

**Error**: `Port 5000 is already in use`

**Solution**:
1. Find and kill the process:
   ```bash
   # macOS/Linux
   lsof -ti:5000 | xargs kill -9

   # Or change port in backend/.env
   PORT=5001
   ```

### Stripe Webhook Error

**Error**: `No signatures found matching the expected signature`

**Solution**:
1. Ensure Stripe CLI is running:
   ```bash
   stripe listen --forward-to localhost:5000/api/donations/webhook
   ```

2. Copy the webhook secret from CLI output and update `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_new_secret_here
   ```

3. Restart backend server

### Frontend Build Errors

**Error**: Module not found or TypeScript errors

**Solution**:
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

### CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
1. Verify `FRONTEND_URL` in backend `.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

2. Check frontend is running on correct port (5173)

## Development Tips

### Database Reset

To reset your database:
```bash
# Drop and recreate database
dropdb impact_gift
createdb impact_gift

# Re-run schema
cd backend
psql impact_gift < src/database/schema.sql
```

### View Database

```bash
# Connect to database
psql impact_gift

# Useful commands:
\dt              # List tables
\d users         # Describe users table
SELECT * FROM events;
SELECT * FROM donations;
\q               # Quit
```

### API Testing

Use tools like:
- **Postman** - [Download](https://www.postman.com/)
- **Insomnia** - [Download](https://insomnia.rest/)
- **curl** (command line)

Example:
```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Hot Reload

Both frontend and backend support hot reload:
- **Backend**: Changes to `.ts` files auto-restart server
- **Frontend**: Changes to `.tsx` files auto-refresh browser

## Next Steps

1. **Customize Charities**: Edit `backend/src/database/schema.sql` to add your own charities
2. **Styling**: Modify `frontend/tailwind.config.js` for custom colors
3. **Email Notifications**: Integrate with SendGrid or similar
4. **Analytics**: Add Google Analytics or Mixpanel
5. **Deployment**: Follow production deployment guide in README

## Getting Help

- **GitHub Issues**: Report bugs or ask questions
- **Documentation**: See README.md for API details
- **Stripe Docs**: https://stripe.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

Happy coding! 🚀
