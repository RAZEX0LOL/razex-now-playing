import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { secretsEqual } from "@/lib/secret-box";

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@razexlabs.local";

/**
 * Single-tenant deploy: one owner account, gated by a password from the env.
 * (Spotify OAuth login is gone — the official Web API now requires a Premium app
 * owner, so the music source is the saved `sp_dc` cookie, not an OAuth login.)
 */
async function ensureOwner() {
  let user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: OWNER_EMAIL, name: "Razex Labs" },
    });
    await prisma.widget.create({ data: { userId: user.id } });
  }
  // Make sure both source rows exist (idempotent).
  const have = await prisma.connection.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });
  const providers = new Set(have.map((c) => c.provider));
  if (!providers.has("spotify")) {
    await prisma.connection.create({
      data: { userId: user.id, provider: "spotify" },
    });
  }
  if (!providers.has("ytmusic")) {
    await prisma.connection.create({
      data: {
        userId: user.id,
        provider: "ytmusic",
        ingestKey: globalThis.crypto.randomUUID().replace(/-/g, ""),
      },
    });
  }
  return user;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { password: { label: "Password", type: "password" } },
      async authorize(creds) {
        const expected = process.env.DASHBOARD_PASSWORD;
        if (!secretsEqual(creds?.password, expected)) return null;
        const user = await ensureOwner();
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
