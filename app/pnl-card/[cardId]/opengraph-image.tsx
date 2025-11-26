/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { PnLCardRenderer } from "@/components/pnl-card/pnl-card-renderer";

export const runtime = "edge";
export const revalidate = 60;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Fallback image for errors/not found
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

export default async function OGImage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  try {
    const { cardId } = await params;

    // Fetch card data from API
    // Using absolute URL construction for edge runtime
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    
    const response = await fetch(`${baseUrl}/api/pnl-card/${cardId}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      // Card not found - return fallback
      return new ImageResponse(
        FallbackImage({ message: "Card not found" }),
        {
          width: size.width,
          height: size.height,
        }
      );
    }

    const data = await response.json();

    // Extract settings and stats from API response
    const settings = data.settings || {
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

    const stats = data.stats || { pnl: {} };
    const range = data.range || "all";
    const username = data.username;

    // Render the card
    return new ImageResponse(
      PnLCardRenderer({
        settings,
        stats,
        range,
        username,
      }),
      {
        width: size.width,
        height: size.height,
      }
    );
  } catch (error) {
    console.error("OG Image generation error:", error);
    
    // Return error fallback
    return new ImageResponse(
      FallbackImage({ message: "Error generating card" }),
      {
        width: size.width,
        height: size.height,
      }
    );
  }
}
