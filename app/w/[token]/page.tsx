import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Player from "@/components/player";
import type { WidgetSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const widget = await prisma.widget.findUnique({ where: { token } });
  if (!widget) notFound();

  return (
    <Player
      token={widget.token}
      style={widget.style}
      settings={(widget.settings ?? {}) as WidgetSettings}
    />
  );
}
