import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  /**
   * Extends the built-in session types
   */
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      image: string;
      role: UserRole;
      lastActive: Date | null;
    };
  }

  interface User {
    role: UserRole;
    profileUpdatedAt: Date | null;
    lastActive: Date | null;
  }
}
