import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Spotify from 'next-auth/providers/spotify';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { CredentialsSignin } from 'next-auth';

import prisma from '@/lib/prisma';
import { AUTH_ERROR_CODES } from '@/types/auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any, // Custom 'role' field not in standard AdapterUser type
  debug: true,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Check if user still exists in database and get latest data
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
        });

        if (!dbUser) {
          return { ...session, user: undefined };
        }

        // Update lastActive timestamp (throttled to once per minute to reduce DB writes)
        const now = new Date();
        const lastActive = dbUser.lastActive;
        const shouldUpdateLastActive =
          !lastActive || now.getTime() - lastActive.getTime() > 60 * 1000; // 1 minute throttle

        if (shouldUpdateLastActive) {
          try {
            await prisma.user.update({
              where: { id: token.sub },
              data: { lastActive: now },
            });
            console.log('[auth] Updated lastActive for user:', token.sub);
          } catch (err) {
            console.error('[auth] Failed to update lastActive:', err);
          }
        }

        // Update session with latest user data from database
        session.user.id = token.sub;
        session.user.name = dbUser.username ?? ''; // Map username to session.user.name
        session.user.email = dbUser.email ?? '';
        session.user.image = dbUser.image ?? '';
        session.user.role = dbUser.role;
        // Pass the ORIGINAL lastActive value (before we updated it above)
        // This allows TourContext to check if user was new (lastActive was null)
        session.user.lastActive = lastActive;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Spotify,
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials are provided
        // Support both 'identifier' (new) and 'email' (legacy) field names
        const rawCredentials = credentials as
          | Record<string, unknown>
          | undefined;
        const identifier = (rawCredentials?.identifier ||
          rawCredentials?.email) as string | undefined;
        if (!identifier || !credentials?.password) {
          console.error(
            '[auth] Sign-in attempt with missing credentials',
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.MISSING_CREDENTIALS);
        }

        const password = credentials.password as string;

        // Determine if identifier is email or username
        const isEmail = identifier.includes('@');

        // Find user in database by email or username
        let user: (User & { hashedPassword?: string | null }) | null;

        if (isEmail) {
          user = (await prisma.user.findUnique({
            where: { email: identifier.toLowerCase() },
          })) as (User & { hashedPassword?: string | null }) | null;
        } else {
          // Case-insensitive username lookup
          user = (await prisma.user.findFirst({
            where: {
              username: {
                equals: identifier,
                mode: 'insensitive',
              },
            },
          })) as (User & { hashedPassword?: string | null }) | null;
        }

        // User not found
        if (!user) {
          console.error(
            `[auth] Sign-in attempt for non-existent user: ${identifier}`,
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.USER_NOT_FOUND);
        }

        // User exists but has no password (OAuth-only account)
        if (!user.hashedPassword) {
          console.error(
            `[auth] Sign-in attempt with password for OAuth-only account: ${identifier}`,
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.NO_PASSWORD_SET);
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(
          password,
          user.hashedPassword
        );

        if (!passwordMatch) {
          console.error(
            `[auth] Failed sign-in attempt for user: ${identifier}`,
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.INVALID_PASSWORD);
        }

        // Success - return user data
        console.log(
          `[auth] Successful sign-in for user: ${identifier}`,
          new Date().toISOString()
        );
        return {
          id: user.id,
          email: user.email,
          name: user.username, // NextAuth expects 'name' in the session
          image: user.image,
          role: user.role,
          profileUpdatedAt: user.profileUpdatedAt,
          lastActive: user.lastActive,
        };
      },
    }),
  ],
});
