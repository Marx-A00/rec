import NextAuth from "next-auth";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Spotify from "next-auth/providers/spotify";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { handlers } from "@/../auth"
import type { User } from "@prisma/client";

export const { GET, POST } = handlers

// export const {
//   handlers: { GET, POST },
//   auth,
//   signIn,
//   signOut,
// } = NextAuth({
//   // adapter: PrismaAdapter(prisma),
//   session: { strategy: "jwt" },
//   pages: {
//     signIn: "/auth/signin",
//     error: "/auth/error"
//   },
//   callbacks: {
//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.sub!;
//       }
//       return session;
//     }
//   },
//   providers: [
//     Google({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//     Spotify({
//       clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
//       clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
//       authorization: {
//         params: {
//           scope: 'user-read-email user-top-read user-read-recently-played'
//         }
//       }
//     }),
//     Credentials({
//       name: "credentials",
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" }
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: {
//             email: credentials.email
//           }
//         }) as (User & { hashedPassword: string }) | null;

//         if (!user?.hashedPassword) {
//           return null;
//         }

//         const passwordMatch = await bcrypt.compare(credentials.password, user.hashedPassword);

//         if (!passwordMatch) {
//           return null;
//         }

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           image: user.image
//         };
//       }
//     })
//   ],
// }); 