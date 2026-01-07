import { DefaultSession } from 'next-auth';
import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  /**
   * Extends the built-in session types
   */
  interface Session {
    user: {
      id: string;
      role: UserRole;
      lastActive: Date | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    profileUpdatedAt: Date | null;
    lastActive: Date | null;
  }
}
