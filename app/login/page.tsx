"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Spline Background */}
      <div className="absolute inset-0 -z-10">
        <iframe
          src="https://my.spline.design/orb-64udLSM0uSMRG1INH7hPLDLV/"
          frameBorder="0"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
          title="FNFDOTFUN 3D Orb"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 right-0 z-50 h-[60px] w-[150px] bg-black" />
      </div>

      {/* Foreground Login Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
