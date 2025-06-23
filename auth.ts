import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Spotify from 'next-auth/providers/spotify';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

import prisma from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  debug: true,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Check if user still exists in database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
        });

        if (!dbUser) {
          return { ...session, user: undefined };
        }

        session.user.id = token.sub;
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
    Google,
    Spotify,
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = (await prisma.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
        })) as (User & { hashedPassword: string }) | null;

        if (!user?.hashedPassword) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          password,
          user.hashedPassword
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});
