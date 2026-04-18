import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { Resend } from 'resend';
import { query } from '../database/db';
import { User, UserPayload } from '../types';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Impact Gift <noreply@giftwithimpact.com>';

// Helper function to link co-host invitations to user account
async function linkCoHostInvitations(userId: number, email: string): Promise<void> {
  try {
    // Link any accepted co-host invitations that match this user's email
    // Only link invitations that have been accepted (accepted_at IS NOT NULL)
    await query(
      `UPDATE co_hosts
       SET user_id = $1
       WHERE email = $2 AND user_id IS NULL AND accepted_at IS NOT NULL`,
      [userId, email]
    );
    console.log(`Linked co-host invitations for ${email} to user ${userId}`);
  } catch (error) {
    console.error('Error linking co-host invitations:', error);
    // Don't throw - this shouldn't block login/signup
  }
}

router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({
          error: errors.array()[0].msg,
          errors: errors.array()
        });
      }

      const { email, password, first_name, last_name } = req.body;

      console.log('Signup attempt for email:', email);

      // Check JWT_SECRET is configured
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET not configured!');
        return res.status(500).json({ error: 'Server configuration error - please contact support' });
      }

      const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        console.log('Email already exists:', email);
        return res.status(400).json({ error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const result = await query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, charity_page_slug',
        [email, password_hash, first_name, last_name]
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } as UserPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Link any pending co-host invitations
      await linkCoHostInvitations(user.id, user.email);

      console.log('User created successfully:', user.email);
      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          charity_page_slug: user.charity_page_slug
        }
      });
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });

      // Provide more specific error messages
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (error.code === '42P01') {
        return res.status(500).json({ error: 'Database not initialized - please contact support' });
      }
      if (error.code === 'ECONNREFUSED') {
        return res.status(500).json({ error: 'Database connection error - please try again later' });
      }

      res.status(500).json({ error: 'Server error - please try again or contact support' });
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

      const result = await query('SELECT id, email, first_name, last_name, password_hash, charity_page_slug FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user: User = result.rows[0];

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } as UserPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Link any pending co-host invitations
      await linkCoHostInvitations(user.id, user.email);

      const userPayload = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        charity_page_slug: user.charity_page_slug
      };

      res.json({ token, user: userPayload });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
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

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      await query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
        [resetToken, resetTokenExpires, email]
      );

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Send email if Resend is configured
      if (resend) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Reset Your Password - Impact Gift',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Reset Your Password</h1>
                    </div>
                    <div class="content">
                      <p>Hi there,</p>
                      <p>We received a request to reset your password for your Impact Gift account. Click the button below to create a new password:</p>

                      <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                      </div>

                      <p>Or copy and paste this link into your browser:</p>
                      <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>

                      <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                          <li>This link will expire in <strong>1 hour</strong></li>
                          <li>If you didn't request this reset, please ignore this email</li>
                          <li>Your password won't change unless you click the link above</li>
                        </ul>
                      </div>

                      <p>Thanks,<br>The Impact Gift Team</p>
                    </div>
                    <div class="footer">
                      <p>Impact Gift - Turn celebrations into charitable contributions</p>
                      <p>This is an automated email. Please do not reply.</p>
                    </div>
                  </div>
                </body>
              </html>
            `
          });
          console.log('Password reset email sent to:', email);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail the request if email fails - user can contact support
        }
      }

      // In development, also return the reset URL
      const response: any = {
        message: 'If that email exists, a password reset link has been sent.'
      };

      if (!resend) {
        response.resetUrl = resetUrl; // Only in dev when email not configured
      }

      res.json(response);
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

// Get current user - used to validate token
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, charity_page_slug FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
