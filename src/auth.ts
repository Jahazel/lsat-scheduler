import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        await connectDB();
        const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Google accounts don't go through authorize() — upsert the User row on
    // first sign-in so the jwt callback below always has one to look up.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      await connectDB();
      const existing = await UserModel.findOne({ email });
      if (!existing) {
        await UserModel.create({ email, name: user.name ?? email, role: "student" });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (!user) return token;

      if (account?.provider === "google") {
        await connectDB();
        const dbUser = await UserModel.findOne({ email: user.email?.toLowerCase().trim() });
        if (dbUser) {
          token.id = String(dbUser._id);
          token.role = dbUser.role;
        }
      } else {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as "student" | "admin";
      }
      return session;
    },
  },
});
