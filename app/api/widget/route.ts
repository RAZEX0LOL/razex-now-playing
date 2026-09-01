import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseWidgetPatch } from "@/lib/widget-input";

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Create a new widget (profile) for the current user. */
export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const widget = await prisma.widget.create({
    data: { userId, name: body.name?.slice(0, 60) || "New widget" },
  });
  return Response.json({ ok: true, widget });
}

/** Update a widget by id (name / style / source / settings). */
export async function PATCH(req: NextRequest) {
  const userId = await requireUser();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = parseWidgetPatch(await req.json().catch(() => null));
  if (!body) return Response.json({ error: "invalid payload" }, { status: 400 });

  const owned = await prisma.widget.findFirst({ where: { id: body.id, userId } });
  if (!owned) return Response.json({ error: "not found" }, { status: 404 });

  const widget = await prisma.widget.update({
    where: { id: body.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.style ? { style: body.style } : {}),
      ...(body.source ? { source: body.source } : {}),
      ...(body.settings ? { settings: body.settings } : {}),
    },
  });
  return Response.json({ ok: true, widget });
}

/** Delete a widget by id (keeps at least one). */
export async function DELETE(req: NextRequest) {
  const userId = await requireUser();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const count = await prisma.widget.count({ where: { userId } });
  if (count <= 1) return Response.json({ error: "keep at least one" }, { status: 400 });

  const owned = await prisma.widget.findFirst({ where: { id, userId } });
  if (!owned) return Response.json({ error: "not found" }, { status: 404 });
  await prisma.widget.delete({ where: { id } });
  return Response.json({ ok: true });
}
