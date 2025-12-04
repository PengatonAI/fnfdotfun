"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { 
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleTwitterSignIn = async () => {
    try {
      await signIn("twitter", { 
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Error signing in with Twitter:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full"
            size="lg"
          >
            Sign in with Google
          </Button>
          <Button
            onClick={handleTwitterSignIn}
            className="w-full"
            variant="outline"
            size="lg"
          >
            Sign in with X
          </Button>
        </div>
      </div>
    </div>
  );
}

