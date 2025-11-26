import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST - Generate downloadable card image (placeholder)
export async function POST(request: Request) {
  try {
    // Dynamic import to avoid build-time initialization
    const { auth } = await import("@/lib/auth");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse body (not used yet, but accept it for future use)
    const body = await request.json().catch(() => ({}));
    const { cardId } = body;

    // Log for debugging (will be used later)
    console.log("Download requested for cardId:", cardId);

    // Return placeholder 1x1 transparent PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pXlMAAAAASUVORK5CYII=",
      "base64"
    );

    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": png.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating card image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
