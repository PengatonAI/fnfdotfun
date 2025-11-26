export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lazy handler creation to prevent build-time initialization
async function getHandlers() {
  const { handlers } = await import("@/lib/auth-config");
  return handlers;
}

export async function GET(request: Request) {
  try {
    const handlers = await getHandlers();
    return handlers.GET(request);
  } catch (error) {
    console.error("NextAuth GET error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  try {
    const handlers = await getHandlers();
    return handlers.POST(request);
  } catch (error) {
    console.error("NextAuth POST error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
