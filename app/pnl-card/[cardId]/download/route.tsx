import { ImageResponse } from "next/og";
import { PnLCardRenderer } from "@/components/pnl-card/pnl-card-renderer";

export const runtime = "edge";

// Fetch card data from API
async function fetchCardData(cardId: string) {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/pnl-card/${cardId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

// Fallback image for errors
function FallbackImage({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        backgroundColor: "#0a0a0a",
        color: "#666666",
        fontSize: 48,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: "#A855F7",
          marginBottom: 24,
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        FNF.FUN
      </div>
      <div style={{ display: "flex" }}>{message}</div>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;

    // Fetch card data
    const data = await fetchCardData(cardId);

    // Handle not found
    if (!data) {
      const fallbackResponse = new ImageResponse(
        FallbackImage({ message: "Card not found" }),
        {
          width: 1200,
          height: 630,
        }
      );

      // Convert to downloadable response
      const imageBuffer = await fallbackResponse.arrayBuffer();

      return new Response(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="pnl-card-not-found.png"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    // Extract data with defaults
    const settings = data.settings ?? {
      theme: "dark",
      backgroundColor: "#111111",
      accentColor: "#A855F7",
      showPnl: true,
      showVolume: true,
      showWinRate: true,
      showTotalTrades: true,
      frame: "none",
      badges: [],
    };
    const stats = data.stats ?? { pnl: {} };
    const range = data.range ?? "all";
    const username = data.username;

    // Generate the image using ImageResponse
    const imageResponse = new ImageResponse(
      PnLCardRenderer({
        settings,
        stats,
        range,
        username,
      }),
      {
        width: 1200,
        height: 630,
      }
    );

    // Convert ImageResponse to downloadable response with proper headers
    const imageBuffer = await imageResponse.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="pnl-card-${cardId}.png"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PNG download error:", error);

    // Return error image
    const errorResponse = new ImageResponse(
      FallbackImage({ message: "Error generating card" }),
      {
        width: 1200,
        height: 630,
      }
    );

    const imageBuffer = await errorResponse.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="pnl-card-error.png"`,
        "Cache-Control": "no-cache",
      },
    });
  }
}

