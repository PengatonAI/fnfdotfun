import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/web3modal";
import { WalletRegistrar } from "@/components/wallet-registrar";
import { FaviconLink } from "@/components/FaviconLink";
import { PageTransition } from "@/components/PageTransition";
import "@/lib/web3modal"; // Initialize Web3Modal

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "fnfdotfun",
  description: "FNF Dot Fun Application",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

/**
 * Root Layout - Contains global providers
 * AuthSessionProvider is always available (needed for useSession hooks)
 * WagmiProvider provides EVM wallet functionality
 * Web3Modal is initialized in lib/web3modal.ts
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FaviconLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            <WagmiProvider config={wagmiConfig}>
              <WalletRegistrar />
              <PageTransition>
                {children}
              </PageTransition>
            </WagmiProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
