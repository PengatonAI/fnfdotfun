import { PnLCardRenderer } from "@/components/pnl-card/pnl-card-renderer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PnL Card | FNF.FUN",
  description: "Shared PnL trading card",
};

// Fetch card data from API
async function fetchCardData(cardId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  const res = await fetch(`${baseUrl}/api/pnl-card/${cardId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const data = await fetchCardData(cardId);

  // Handle not found
  if (!data) {
    return (
      <div
        style={{
          backgroundColor: "#0a0a0a",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#666666",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: "32px",
            color: "#A855F7",
            marginBottom: "24px",
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          FNF.FUN
        </div>
        <div style={{ fontSize: "24px" }}>Card not found</div>
      </div>
    );
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

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        minHeight: "100vh",
        paddingTop: "40px",
        paddingBottom: "40px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* SECURITY: Use inline styles instead of dangerouslySetInnerHTML */}
      <style>{`
        .download-btn {
          background-color: #0891b2;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          color: white;
          text-decoration: none;
          box-shadow: 0 0 15px rgba(6,182,212,0.5);
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .download-btn:hover {
          background-color: #0e7490;
          box-shadow: 0 0 25px rgba(6,182,212,0.7);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Download Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <a
          href={`/pnl-card/${cardId}/download`}
          className="download-btn"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PNG
        </a>
      </div>

      {/* Card Container */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            width: "1200px",
            maxWidth: "100%",
          }}
        >
          {PnLCardRenderer({ settings, stats, range })}
        </div>
      </div>
    </div>
  );
}
