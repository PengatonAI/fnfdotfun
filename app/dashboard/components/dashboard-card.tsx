"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DashboardCard({ href, children, className, onClick }: DashboardCardProps) {
  const cardStyles = cn(
    "rounded-xl bg-bg-card border border-border-soft p-6",
    "shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
    "transition-all duration-200",
    "hover:border-border-mid hover:shadow-[0_4px_30px_rgba(0,0,0,0.4)]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardStyles}>
        {children}
      </Link>
    );
  }

  return (
    <div className={cardStyles} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-lg font-semibold text-white", className)}>
      {children}
    </h2>
  );
}

