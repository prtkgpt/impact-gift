import { UserPayload } from '../types';

declare global {
  namespace Express {
    interface User extends UserPayload {}
  }
}

export {};
