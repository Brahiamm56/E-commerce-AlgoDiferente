import { compare } from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/schemas/auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          console.error("[auth] Invalid credentials schema:", parsed.error.issues);
          return null;
        }

        // Brute-force throttle: 5 attempts per minute per email.
        // Note: in-memory limiter; in multi-instance deployments switch to Redis.
        const rl = rateLimit({
          key: `login:${parsed.data.email.toLowerCase()}`,
          limit: 5,
          windowMs: 60_000,
        });
        if (!rl.success) {
          console.error("[auth] Rate limit exceeded for:", parsed.data.email);
          return null;
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          });
        } catch (err) {
          console.error("[auth] DB query failed:", err);
          return null;
        }

        if (!user) {
          console.error("[auth] User not found:", parsed.data.email);
          return null;
        }

        const isValid = await compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          console.error("[auth] Invalid password for:", parsed.data.email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "Administrador",
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = typeof token.role === "string" ? token.role : "owner";
      }

      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}