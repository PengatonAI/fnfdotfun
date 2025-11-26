// Server-side PnL Card Renderer
// Compatible with: @vercel/og, PNG export, SSR
// NO Tailwind, NO hooks, NO client components
// Pure inline styles for deterministic output

interface PnLCardSettings {
  theme: string;
  backgroundColor: string;
  accentColor: string;
  showAvatar?: boolean;
  showUsername?: boolean;
  showPnl?: boolean;
  showVolume?: boolean;
  showWinRate?: boolean;
  showTotalTrades?: boolean;
  font?: string;
  frame?: string;
  badges?: string[];
}

interface PnLCardRendererProps {
  settings: PnLCardSettings;
  stats: any;
  range: string;
  username?: string;
}

// Format currency with K/M suffixes
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

// Format number with commas
function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

// Get range display text
function getRangeText(range: string): string {
  switch (range) {
    case "24h":
      return "24h Performance";
    case "7d":
      return "7 Day Performance";
    case "30d":
      return "30 Day Performance";
    case "all":
    default:
      return "All Time Performance";
  }
}

// Badge icon mapping
const BADGE_ICONS: Record<string, string> = {
  og: "🏆",
  "season-winner": "👑",
  "top-1": "💎",
  "no-liquidations": "🛡️",
  "crew-mvp": "⭐",
};

const BADGE_LABELS: Record<string, string> = {
  og: "OG",
  "season-winner": "Season Winner",
  "top-1": "Top 1%",
  "no-liquidations": "No Liquidations",
  "crew-mvp": "Crew MVP",
};

// Frame styles
function getFrameStyles(frame: string): React.CSSProperties {
  switch (frame) {
    case "neon-purple":
      return {
        boxShadow:
          "0 0 40px rgba(168,85,247,0.5), 0 0 80px rgba(168,85,247,0.3), inset 0 0 40px rgba(168,85,247,0.1)",
        border: "3px solid rgba(168,85,247,0.8)",
      };
    case "neon-cyan":
      return {
        boxShadow:
          "0 0 40px rgba(6,182,212,0.5), 0 0 80px rgba(6,182,212,0.3), inset 0 0 40px rgba(6,182,212,0.1)",
        border: "3px solid rgba(6,182,212,0.8)",
      };
    case "gold":
      return {
        boxShadow:
          "0 0 40px rgba(234,179,8,0.4), 0 0 60px rgba(234,179,8,0.2), inset 0 0 30px rgba(234,179,8,0.1)",
        border: "3px solid rgba(234,179,8,0.8)",
      };
    case "holo":
      return {
        background:
          "linear-gradient(135deg, rgba(168,85,247,0.3) 0%, rgba(6,182,212,0.3) 50%, rgba(236,72,153,0.3) 100%)",
        border: "3px solid transparent",
        boxShadow: "0 0 30px rgba(168,85,247,0.3)",
      };
    case "mythic":
      return {
        boxShadow:
          "0 0 50px rgba(249,115,22,0.6), 0 0 100px rgba(249,115,22,0.3), inset 0 0 40px rgba(249,115,22,0.1)",
        border: "3px solid rgba(249,115,22,0.8)",
      };
    case "none":
    default:
      return {
        boxShadow: "0 0 20px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)",
        border: "2px solid rgba(255,255,255,0.1)",
      };
  }
}

// Theme background styles
function getThemeBackground(
  theme: string,
  backgroundColor: string
): React.CSSProperties {
  switch (theme) {
    case "neon":
      return {
        background: `radial-gradient(circle at 30% 30%, rgba(168,85,247,0.15), transparent 50%), 
                     radial-gradient(circle at 70% 70%, rgba(6,182,212,0.1), transparent 50%),
                     linear-gradient(180deg, ${backgroundColor} 0%, #0f0f23 100%)`,
      };
    case "cyber":
      return {
        background: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(6,182,212,0.03) 50px, rgba(6,182,212,0.03) 51px),
                     repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(6,182,212,0.03) 50px, rgba(6,182,212,0.03) 51px),
                     linear-gradient(180deg, #0a0a0f 0%, #0d1117 50%, #161b22 100%)`,
      };
    case "clean":
      return {
        background: `linear-gradient(180deg, ${backgroundColor} 0%, #18181b 50%, #27272a 100%)`,
      };
    case "dark":
    default:
      return {
        background: `linear-gradient(180deg, ${backgroundColor} 0%, #0a0a0a 100%)`,
      };
  }
}

export function PnLCardRenderer({
  settings,
  stats,
  range,
  username,
}: PnLCardRendererProps) {
  const pnl = stats?.pnl;
  const totalPnl = pnl?.totalPnl ?? 0;
  const isPositive = totalPnl >= 0;
  const showPnl = settings.showPnl !== false;
  const showVolume = settings.showVolume !== false;
  const showWinRate = settings.showWinRate !== false;
  const showTotalTrades = settings.showTotalTrades !== false;
  const badges = settings.badges || [];

  const frameStyles = getFrameStyles(settings.frame || "none");
  const themeBackground = getThemeBackground(
    settings.theme,
    settings.backgroundColor
  );

  // Container styles
  const containerStyle: React.CSSProperties = {
    width: "1200px",
    height: "630px",
    position: "relative",
    borderRadius: "24px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: settings.font || "Inter, system-ui, sans-serif",
    ...themeBackground,
    ...frameStyles,
  };

  // Header styles
  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 32px",
  };

  const logoStyle: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: 700,
    color: settings.accentColor,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
  };

  const rangeStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 500,
    color: "rgba(255,255,255,0.6)",
  };

  // Main content styles
  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 48px",
  };

  // PnL display styles
  const pnlContainerStyle: React.CSSProperties = {
    textAlign: "center" as const,
    marginBottom: "32px",
  };

  const pnlLabelStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 500,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.2em",
    marginBottom: "8px",
  };

  const pnlValueStyle: React.CSSProperties = {
    fontSize: "88px",
    fontWeight: 700,
    color: isPositive ? "#22c55e" : "#ef4444",
    textShadow: isPositive
      ? "0 0 40px rgba(34,197,94,0.5), 0 0 80px rgba(34,197,94,0.3)"
      : "0 0 40px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.3)",
    lineHeight: 1,
  };

  // Stats grid styles
  const statsGridStyle: React.CSSProperties = {
    display: "flex",
    gap: "24px",
    marginBottom: "24px",
  };

  const statBoxStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    padding: "18px 32px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
    textAlign: "center" as const,
    minWidth: "160px",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 500,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: "4px",
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: "32px",
    fontWeight: 700,
    color: settings.accentColor,
  };

  // Realized/Unrealized styles
  const subStatsStyle: React.CSSProperties = {
    display: "flex",
    gap: "32px",
    marginBottom: "24px",
    fontSize: "16px",
  };

  const subStatStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
  };

  const subStatValueStyle = (value: number): React.CSSProperties => ({
    color: value >= 0 ? "#22c55e" : "#ef4444",
    fontWeight: 600,
  });

  // Badges styles
  const badgesContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "20px",
    border: "1px solid rgba(168,85,247,0.5)",
    background: "rgba(168,85,247,0.1)",
    boxShadow: "0 0 15px rgba(168,85,247,0.2)",
    fontSize: "18px",
    color: "white",
  };

  // Corner accent styles - ORIGINAL diagonal (top-left & bottom-right)
  const cornerTopLeftStyle: React.CSSProperties = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "200px",
    height: "200px",
    background: `linear-gradient(135deg, ${settings.accentColor}20 0%, transparent 50%)`,
    pointerEvents: "none" as const,
  };

  const cornerBottomRightStyle: React.CSSProperties = {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    width: "200px",
    height: "200px",
    background: `linear-gradient(-45deg, ${settings.accentColor}20 0%, transparent 50%)`,
    pointerEvents: "none" as const,
  };

  // Bottom-left logo styles (icon only, no text)
  const bottomLogoStyle: React.CSSProperties = {
    position: "absolute" as const,
    bottom: "20px",
    left: "24px",
    display: "flex",
    alignItems: "center",
    opacity: 0.75,
    pointerEvents: "none" as const,
  };

  const logoImageStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
  };

  // Bottom-right username styles
  const usernameStyle: React.CSSProperties = {
    position: "absolute" as const,
    bottom: "20px",
    right: "24px",
    fontSize: "14px",
    fontWeight: 500,
    color: "rgba(255,255,255,0.5)",
    opacity: 0.85,
    pointerEvents: "none" as const,
  };

  return (
    <div style={containerStyle}>
      {/* Corner accents - original diagonal */}
      <div style={cornerTopLeftStyle} />
      <div style={cornerBottomRightStyle} />

      {/* Header */}
      <div style={headerStyle}>
        <div style={logoStyle}>FNF.FUN</div>
        <div style={rangeStyle}>{getRangeText(range)}</div>
      </div>

      {/* Main Content */}
      <div style={mainStyle}>
        {/* PnL Display */}
        {showPnl && (
          <div style={pnlContainerStyle}>
            <div style={pnlLabelStyle}>Total P&L</div>
            <div style={pnlValueStyle}>
              {isPositive ? "+" : ""}${formatCurrency(totalPnl)}
            </div>
          </div>
        )}

        {/* Realized / Unrealized */}
        <div style={subStatsStyle}>
          <div style={subStatStyle}>
            Realized:{" "}
            <span style={subStatValueStyle(pnl?.realizedPnl ?? 0)}>
              {(pnl?.realizedPnl ?? 0) >= 0 ? "+" : ""}$
              {formatCurrency(pnl?.realizedPnl ?? 0)}
            </span>
          </div>
          <div style={subStatStyle}>
            Unrealized:{" "}
            <span style={subStatValueStyle(pnl?.unrealizedPnl ?? 0)}>
              {(pnl?.unrealizedPnl ?? 0) >= 0 ? "+" : ""}$
              {formatCurrency(pnl?.unrealizedPnl ?? 0)}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={statsGridStyle}>
          {showVolume && (
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Volume</div>
              <div style={statValueStyle}>
                ${formatCurrency(pnl?.volume ?? 0)}
              </div>
            </div>
          )}
          {showWinRate && (
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Win Rate</div>
              <div style={statValueStyle}>
                {((pnl?.winRate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
          )}
          {showTotalTrades && (
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Trades</div>
              <div style={statValueStyle}>
                {formatNumber(pnl?.totalTrades ?? 0)}
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div style={badgesContainerStyle}>
            {badges.map((badge) => (
              <div key={badge} style={badgeStyle}>
                <span>{BADGE_ICONS[badge] || "🏅"}</span>
                <span>{BADGE_LABELS[badge] || badge}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom-left: Logo icon only */}
      <div style={bottomLogoStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://fnf.fun/favicon.png"
          alt=""
          style={logoImageStyle}
        />
      </div>

      {/* Bottom-right: Username */}
      {username && (
        <div style={usernameStyle}>@{username}</div>
      )}
    </div>
  );
}

export default PnLCardRenderer;
