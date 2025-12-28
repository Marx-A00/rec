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
        session.user.name = dbUser.name ?? '';
        session.user.email = dbUser.email ?? '';
        session.user.image = dbUser.image ?? '';
        session.user.role = dbUser.role;
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
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials are provided
        if (!credentials?.email || !credentials?.password) {
          console.error(
            '[auth] Sign-in attempt with missing credentials',
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.MISSING_CREDENTIALS);
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user in database
        const user = (await prisma.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
        })) as (User & { hashedPassword?: string | null }) | null;

        // User not found
        if (!user) {
          console.error(
            `[auth] Sign-in attempt for non-existent user: ${email}`,
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.USER_NOT_FOUND);
        }

        // User exists but has no password (OAuth-only account)
        if (!user.hashedPassword) {
          console.error(
            `[auth] Sign-in attempt with password for OAuth-only account: ${email}`,
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
            `[auth] Failed sign-in attempt for user: ${email}`,
            new Date().toISOString()
          );
          throw new CredentialsSignin(AUTH_ERROR_CODES.INVALID_PASSWORD);
        }

        // Success - return user data
        console.log(
          `[auth] Successful sign-in for user: ${email}`,
          new Date().toISOString()
        );
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          profileUpdatedAt: user.profileUpdatedAt,
        };
      },
    }),
  ],
});
