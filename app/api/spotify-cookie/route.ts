import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret, tryDecryptSecret } from "@/lib/secret-box";
import { clearWebToken, getWebToken } from "@/lib/spotify-cookie";

export const runtime = "nodejs";

/** Save (or clear) the user's Spotify `sp_dc` web-player cookie. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { spDc?: unknown };
  const value = typeof body.spDc === "string" ? body.spDc.trim() : "";

  const existing = await prisma.connection.findFirst({
    where: { userId: session.user.id, provider: "spotify" },
  });
  if (existing?.spDc) {
    const previousValue = tryDecryptSecret(existing.spDc);
    if (previousValue) clearWebToken(previousValue);
  }

  if (value && !(await getWebToken(value))) {
    return Response.json(
      { connected: Boolean(existing?.spDc), valid: false },
      { status: 400 },
    );
  }

  const encryptedValue = value ? encryptSecret(value) : null;

  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: { spDc: encryptedValue },
    });
  } else {
    await prisma.connection.create({
      data: { userId: session.user.id, provider: "spotify", spDc: encryptedValue },
    });
  }

  return Response.json({ connected: Boolean(value), valid: Boolean(value) });
}
