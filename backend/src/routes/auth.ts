import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../database/db';
import { User, UserPayload } from '../types';

const router = Router();

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profilePicture = profile.photos?.[0]?.value || null;

          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          // Check if user exists with this Google ID
          let userResult = await query(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId]
          );

          let user;

          if (userResult.rows.length > 0) {
            // User exists with Google ID
            user = userResult.rows[0];
          } else {
            // Check if user exists with this email
            userResult = await query(
              'SELECT * FROM users WHERE email = $1',
              [email]
            );

            if (userResult.rows.length > 0) {
              // User exists with email, link Google account
              const updateResult = await query(
                'UPDATE users SET google_id = $1, profile_picture = $2 WHERE email = $3 RETURNING *',
                [googleId, profilePicture, email]
              );
              user = updateResult.rows[0];
            } else {
              // Create new user
              const insertResult = await query(
                `INSERT INTO users (email, first_name, last_name, google_id, profile_picture)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [email, firstName, lastName, googleId, profilePicture]
              );
              user = insertResult.rows[0];
            }
          }

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, first_name, last_name } = req.body;

      const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const result = await query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
        [email, password_hash, first_name, last_name]
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } as UserPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(201).json({ token, user });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user: User = result.rows[0];

      // Check if user signed up with Google (no password)
      if (!user.password_hash) {
        return res.status(401).json({ error: 'Please sign in with Google' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } as UserPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      const userPayload = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      };

      res.json({ token, user: userPayload });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        } as UserPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

// Forgot password - generate reset token
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const result = await query('SELECT * FROM users WHERE email = $1', [email]);

      // Always return success to prevent email enumeration
      if (result.rows.length === 0) {
        return res.json({ message: 'If that email exists, a password reset link has been sent.' });
      }

      const user = result.rows[0];

      // Don't allow password reset for Google-only users
      if (!user.password_hash) {
        return res.json({ message: 'If that email exists, a password reset link has been sent.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      await query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
        [resetToken, resetTokenExpires, email]
      );

      // In production, send email here
      // For now, return the reset link (remove this in production)
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      res.json({
        message: 'If that email exists, a password reset link has been sent.',
        resetUrl // Remove this in production when email is set up
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Reset password with token
router.post(
  '/reset-password',
  [
    body('token').trim().notEmpty(),
    body('password').isLength({ min: 6 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;

      const result = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const user = result.rows[0];
      const password_hash = await bcrypt.hash(password, 10);

      await query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
        [password_hash, user.id]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
