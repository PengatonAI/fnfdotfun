import { Navbar } from "@/components/navbar";
import CreateTournamentForm from "./create-tournament-form";

export const dynamic = "force-dynamic";

function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminSeasonsPage() {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="p-4 text-[#ff4a4a]">Access denied</div>
        </div>
      </>
    );
  }

  // Admin authorization: only X user with username "nanoxbt" can access
  if (!session?.user?.username || session.user.username !== "nanoxbt") {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="p-4 text-[#ff4a4a]">Access denied</div>
        </div>
      </>
    );
  }

  // Fetch all tournaments
  const tournaments = await prisma.season.findMany({
    where: { isTournament: true },
    orderBy: { startAt: "asc" },
  });

  const now = new Date();

  // Split tournaments
  const active = tournaments.filter((t) => {
    const start = new Date(t.startAt);
    const end = new Date(t.endAt);
    return now >= start && now <= end;
  });

  const upcoming = tournaments.filter((t) => {
    const start = new Date(t.startAt);
    return start > now;
  });

  const past = tournaments.filter((t) => {
    const end = new Date(t.endAt);
    return end < now;
  });

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Admin — Seasons & Tournaments</h1>

        {/* SECTION A — CREATE TOURNAMENT FORM */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Create Tournament</h2>
          <CreateTournamentForm />
        </section>

        {/* SECTION B — ACTIVE & UPCOMING TOURNAMENTS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Active & Upcoming Tournaments</h2>

          {active.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-medium mb-3 text-[#00d57a]">Active</h3>
              <div className="space-y-3">
                {active.map((tournament) => {
                  let allowedChains: string[] = [];
                  try {
                    if (tournament.allowedChains) {
                      allowedChains = JSON.parse(tournament.allowedChains);
                    }
                  } catch {
                    // Ignore parse errors
                  }

                  return (
                    <div
                      key={tournament.id}
                      className="rounded-lg border bg-card p-4 border-[#00d57a]/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            {tournament.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(tournament.startAt)} → {formatDate(tournament.endAt)}
                          </p>
                          <div className="flex gap-4 text-sm">
                            <span>
                              <span className="text-muted-foreground">Visibility: </span>
                              {tournament.visibility || "public"}
                            </span>
                            {allowedChains.length > 0 && (
                              <span>
                                <span className="text-muted-foreground">Chains: </span>
                                {allowedChains.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xl font-medium mb-3 text-muted-foreground">Upcoming</h3>
              <div className="space-y-3">
                {upcoming.map((tournament) => {
                  let allowedChains: string[] = [];
                  try {
                    if (tournament.allowedChains) {
                      allowedChains = JSON.parse(tournament.allowedChains);
                    }
                  } catch {
                    // Ignore parse errors
                  }

                  return (
                    <div
                      key={tournament.id}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            {tournament.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(tournament.startAt)} → {formatDate(tournament.endAt)}
                          </p>
                          <div className="flex gap-4 text-sm">
                            <span>
                              <span className="text-muted-foreground">Visibility: </span>
                              {tournament.visibility || "public"}
                            </span>
                            {allowedChains.length > 0 && (
                              <span>
                                <span className="text-muted-foreground">Chains: </span>
                                {allowedChains.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {active.length === 0 && upcoming.length === 0 && (
            <p className="text-muted-foreground">No active or upcoming tournaments.</p>
          )}
        </section>

        {/* SECTION C — PAST TOURNAMENTS */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Past Tournaments</h2>

          {past.length > 0 ? (
            <div className="space-y-3">
              {past.map((tournament) => {
                let allowedChains: string[] = [];
                try {
                  if (tournament.allowedChains) {
                    allowedChains = JSON.parse(tournament.allowedChains);
                  }
                } catch {
                  // Ignore parse errors
                }

                return (
                  <div
                    key={tournament.id}
                    className="rounded-lg border bg-card p-4 opacity-60"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg mb-1">
                          {tournament.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatDate(tournament.startAt)} → {formatDate(tournament.endAt)}
                        </p>
                        <div className="flex gap-4 text-sm">
                          <span>
                            <span className="text-muted-foreground">Visibility: </span>
                            {tournament.visibility || "public"}
                          </span>
                          {allowedChains.length > 0 && (
                            <span>
                              <span className="text-muted-foreground">Chains: </span>
                              {allowedChains.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No past tournaments.</p>
          )}
        </section>
      </div>
    </>
  );
}

