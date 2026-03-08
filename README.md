# Impact Gift 🎁

Transform celebrations into meaningful impact! Impact Gift is a platform that allows people to donate to charity instead of buying traditional gifts for birthdays, weddings, and other special occasions.

## Features

- **User Authentication**: Secure signup and login system with JWT tokens
- **Event Creation**: Create events for birthdays, weddings, anniversaries, graduations, and more
- **Charity Selection**: Choose from a curated list of reputable charities
- **Donation Processing**: Secure payment processing through Stripe
- **Progress Tracking**: Set fundraising goals and track donation progress
- **Public Event Pages**: Shareable links for friends and family to donate
- **Donation Messages**: Donors can leave personal messages
- **Dashboard**: View all your events and total donations raised

## Tech Stack

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **PostgreSQL** database
- **JWT** for authentication
- **Stripe** for payment processing
- **bcryptjs** for password hashing

### Frontend
- **React** with **TypeScript**
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Stripe Elements** for payment forms
- **Axios** for API calls
- **React Hot Toast** for notifications

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Stripe account (for payment processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/impact-gift.git
   cd impact-gift
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

3. **Set up the database**

   Create a PostgreSQL database:
   ```bash
   createdb impact_gift
   ```

   Run the schema to create tables:
   ```bash
   psql impact_gift < backend/src/database/schema.sql
   ```

4. **Configure environment variables**

   **Backend** - Create `backend/.env`:
   ```env
   PORT=5000
   NODE_ENV=development

   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/impact_gift

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRES_IN=7d

   # Stripe
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

   **Frontend** - Create `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

5. **Get Stripe API keys**
   - Sign up at [stripe.com](https://stripe.com)
   - Get your test API keys from the Stripe Dashboard
   - Add them to your `.env` files

### Running the Application

**Development mode** (runs both frontend and backend):
```bash
npm run dev
```

Or run them separately:

**Backend** (http://localhost:5000):
```bash
cd backend
npm run dev
```

**Frontend** (http://localhost:5173):
```bash
cd frontend
npm run dev
```

### Building for Production

**Build both**:
```bash
npm run build
```

**Backend**:
```bash
cd backend
npm run build
npm start
```

**Frontend**:
```bash
cd frontend
npm run build
npm run preview
```

## Project Structure

```
impact-gift/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.ts          # Database connection
│   │   │   └── schema.sql     # Database schema
│   │   ├── middleware/
│   │   │   └── auth.ts        # Authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # Auth endpoints (login/signup)
│   │   │   ├── charities.ts   # Charity endpoints
│   │   │   ├── events.ts      # Event endpoints
│   │   │   └── donations.ts   # Donation/payment endpoints
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript types
│   │   ├── utils/
│   │   │   └── slug.ts        # Slug generation utility
│   │   └── index.ts           # Express app entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DonationForm.tsx  # Stripe payment form
│   │   │   └── Navbar.tsx        # Navigation bar
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # Auth state management
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Landing page
│   │   │   ├── Login.tsx         # Login page
│   │   │   ├── Signup.tsx        # Signup page
│   │   │   ├── Dashboard.tsx     # User dashboard
│   │   │   ├── CreateEvent.tsx   # Event creation form
│   │   │   └── EventPage.tsx     # Public event/donation page
│   │   ├── utils/
│   │   │   └── api.ts            # Axios API client
│   │   ├── types.ts              # TypeScript types
│   │   ├── App.tsx               # Main app component
│   │   ├── main.tsx              # React entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user

### Charities
- `GET /api/charities` - Get all active charities
- `GET /api/charities/:id` - Get specific charity

### Events
- `POST /api/events` - Create new event (authenticated)
- `GET /api/events/my-events` - Get user's events (authenticated)
- `GET /api/events/:slug` - Get public event details
- `GET /api/events/:slug/donations` - Get event donations
- `PUT /api/events/:id` - Update event (authenticated)

### Donations
- `POST /api/donations/create-payment-intent` - Create Stripe payment intent
- `POST /api/donations/webhook` - Stripe webhook handler

## Database Schema

### Users
- id, email, password_hash, first_name, last_name, created_at, updated_at

### Charities
- id, name, description, category, website_url, logo_url, stripe_account_id, is_active, created_at

### Events
- id, user_id, title, description, event_type, event_date, charity_id, goal_amount, slug, is_active, created_at, updated_at

### Donations
- id, event_id, donor_name, donor_email, amount, message, stripe_payment_intent_id, status, created_at

## Deployment

### Backend Deployment (Heroku example)

1. Create a Heroku app:
   ```bash
   heroku create your-app-name
   ```

2. Add PostgreSQL addon:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. Set environment variables:
   ```bash
   heroku config:set JWT_SECRET=your-secret
   heroku config:set STRIPE_SECRET_KEY=sk_live_...
   heroku config:set FRONTEND_URL=https://your-frontend.com
   ```

4. Deploy:
   ```bash
   git subtree push --prefix backend heroku main
   ```

5. Run database migrations:
   ```bash
   heroku run bash
   psql $DATABASE_URL < src/database/schema.sql
   ```

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `dist` folder to Vercel or Netlify

3. Set environment variables in your hosting platform:
   - `VITE_API_URL=https://your-backend.herokuapp.com/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

## Stripe Webhook Setup

1. Install Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:5000/api/donations/webhook
   ```

2. For production, add webhook endpoint in Stripe Dashboard:
   - URL: `https://your-api.com/api/donations/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

## Security Considerations

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Environment variables for sensitive data
- Helmet.js for HTTP header security
- CORS configured for specific origins
- Input validation with express-validator
- Stripe handles payment security (PCI compliant)

## Future Enhancements

- Email notifications for donations
- Social media sharing
- Multiple charity selection per event
- Recurring donations
- Event analytics and reports
- Custom branding for events
- Thank you note automation
- Mobile app (React Native)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

Having issues? Check out our comprehensive [Troubleshooting Guide](TROUBLESHOOTING.md) for solutions to common problems.

For deployment questions, see [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md).

For other questions or issues, please open an issue on GitHub.

---

Built with ❤️ to make celebrations more meaningful
