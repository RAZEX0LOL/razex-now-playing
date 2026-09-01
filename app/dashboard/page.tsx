import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WidgetSettings } from "@/lib/types";
import DashboardClient, { type WidgetDTO } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  let widgets = await prisma.widget.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (widgets.length === 0) {
    widgets = [await prisma.widget.create({ data: { userId } })];
  }

  const [spotifyConn, ytmusic] = await Promise.all([
    prisma.connection.findFirst({ where: { userId, provider: "spotify" } }),
    prisma.connection.findFirst({ where: { userId, provider: "ytmusic" } }),
  ]);

  const dto: WidgetDTO[] = widgets.map((w) => ({
    id: w.id,
    token: w.token,
    name: w.name,
    style: w.style,
    source: w.source,
    settings: (w.settings ?? {}) as WidgetSettings,
  }));

  return (
    <DashboardClient
      widgets={dto}
      spotifyName={session.user.name ?? null}
      spotifyConnected={Boolean(spotifyConn?.spDc)}
      ytIngestKey={ytmusic?.ingestKey ?? null}
      appUrl={process.env.APP_URL ?? ""}
      signOut={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}
