import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChallengesClient from "./challenges-client";

export default async function ChallengesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-main">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <ChallengesClient userId={session.user.id} />
        </div>
      </div>
    </>
  );
}
