import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to check if authenticated user is an admin
 * Admins are defined by ADMIN_EMAILS environment variable (comma-separated)
 * Example: ADMIN_EMAILS=admin@example.com,owner@example.com
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

  if (adminEmails.length === 0) {
    console.error('SECURITY WARNING: No admin emails configured in ADMIN_EMAILS environment variable');
    return res.status(403).json({ error: 'Admin access not configured' });
  }

  const userEmail = req.user.email.toLowerCase();

  if (!adminEmails.includes(userEmail)) {
    console.warn(`Unauthorized admin access attempt by: ${userEmail}`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
