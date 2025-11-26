import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Crew not found
        </p>
        <Link href="/crews">
          <Button>Back to Crews</Button>
        </Link>
      </div>
    </>
  );
}

