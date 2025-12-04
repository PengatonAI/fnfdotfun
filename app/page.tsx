"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Spline Background */}
      <div className="absolute inset-0 z-0">
        <iframe
          src="https://my.spline.design/orb-64udLSM0uSMRG1INH7hPLDLV/"
          frameBorder="0"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
          title="FNFDOTFUN 3D Orb"
        />
        {/* 40% Black Overlay */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Black box to cover Spline watermark */}
      <div className="absolute bottom-0 right-0 z-50 h-[60px] w-[150px] bg-black" />

      {/* Fixed Navbar */}
      <nav className="fixed left-0 top-0 z-20 w-full">
        <div className="container mx-auto flex items-center px-4 py-4">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
          >
            fnfdotfun
          </Link>
        </div>
      </nav>

      {/* Centered Hero Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-6 text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#F5F5F5] text-shadow-hero sm:text-5xl lg:text-6xl xl:text-7xl">
          The World&apos;s First
          <br />
          Crew-Based Trading League
        </h1>

        <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl">
          Join elite 5-person crews and enter the next era of trading.
          <br />
          Compete using verified on-chain performance.
        </p>

        <div className="flex justify-center gap-4">
          <Button asChild size="lg" className="tricolor-hover-border">
            <Link href="/login">Launch App</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#">Learn More</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

