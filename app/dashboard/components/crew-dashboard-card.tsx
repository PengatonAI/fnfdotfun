"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./sparkline";
import { getUserInitial } from "@/lib/user-utils";
import { Users, Shield, Crown, ChevronRight } from "lucide-react";

interface CrewMember {
  id: string;
  user: {
    id: string;
    image: string | null;
    username: string | null;
    name: string | null;
    email: string | null;
  };
}

interface Crew {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CrewDashboardCardProps {
  crew: Crew | null;
  crewLeaderName?: string;
  crewMembers: CrewMember[];
  sparklineData?: number[];
}

// Format PnL value for display
function formatPnL(value: number): string {
  const absValue = Math.abs(value);
  const prefix = value >= 0 ? "+" : "-";
  if (absValue >= 1000000) {
    return `${prefix}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${prefix}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${prefix}$${absValue.toFixed(0)}`;
}

export function CrewDashboardCard({ 
  crew, 
  crewLeaderName,
  crewMembers,
  sparklineData 
}: CrewDashboardCardProps) {
  // Empty state - no crew
  if (!crew) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-full flex flex-col">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Your Crew</h2>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-accent" />
            </div>
            <p className="text-white/40 text-sm mb-6 max-w-[280px]">
              You&apos;re not in a crew yet. Join or create one to compete together!
            </p>
            <Link href="/crews" className="w-full max-w-[200px]">
              <div className="relative rounded-lg overflow-hidden">
                <div 
                  className="absolute inset-0 rounded-lg p-[1px]"
                  style={{
                    background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
                  }}
                >
                  <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
                </div>
                <Button className="relative w-full bg-transparent border-none text-white font-medium hover:bg-white/5">
                  Join or Create Crew
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determine sparkline color based on trend
  const sparklineColor = sparklineData && sparklineData.length > 1 
    ? (sparklineData[sparklineData.length - 1] >= sparklineData[0] ? "#00d57a" : "#ff4a4a")
    : "#ffffff";

  return (
    <Link 
      href={`/crews/${crew.id}`}
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-full flex flex-col transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] group"
    >
      {/* Decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-[#00d57a]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative p-6 flex flex-col h-full">
        {/* Header Row with Title and Members */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Your Crew</h2>
          </div>
          
          {/* Members Avatars - Top Right */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Members</span>
            <div className="flex -space-x-2">
              {crewMembers.slice(0, 5).map((member, idx) => (
                <div
                  key={member.id}
                  className="w-7 h-7 rounded-full border-2 border-[#0a0a0a] overflow-hidden bg-[#1a1a1a]"
                  style={{ zIndex: crewMembers.length - idx }}
                >
                  {member.user.image ? (
                    <Image
                      src={member.user.image}
                      alt="Member"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/10 text-[10px] font-medium text-accent">
                      {getUserInitial(member.user)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {crewMembers.length > 5 && (
              <span className="text-xs text-white/30">
                +{crewMembers.length - 5}
              </span>
            )}
          </div>
        </div>
        
        {/* Crew Info */}
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar with glow */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/40 via-purple-500/40 to-pink-500/40 rounded-full blur-sm opacity-60" />
            {crew.avatarUrl ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#2a2a2a]">
                <Image
                  src={crew.avatarUrl}
                  alt={crew.name}
                  width={56}
                  height={56}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center">
                <span className="text-xl font-bold text-accent">
                  {crew.name[0].toUpperCase()}
                </span>
              </div>
            )}
            {crewLeaderName && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 border-2 border-[#0a0a0a] flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{crew.name}</p>
            {crewLeaderName && (
              <p className="text-xs text-white/40">Led by {crewLeaderName}</p>
            )}
          </div>
        </div>

        {/* Sparkline Chart - Crew All-Time PnL */}
        <div className="flex-1 flex flex-col mb-4">
          {/* PnL Value Labels */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="flex justify-between mb-1">
              <span className="text-xs text-white/30">
                {formatPnL(sparklineData[0])}
              </span>
              <span className={`text-xs ${sparklineData[sparklineData.length - 1] >= 0 ? 'text-[#00d57a]' : 'text-[#ff4a4a]'}`}>
                {formatPnL(sparklineData[sparklineData.length - 1])}
              </span>
            </div>
          )}
          
          {/* Chart */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-[60px]">
            {sparklineData && sparklineData.length > 1 ? (
              <Sparkline 
                data={sparklineData} 
                width={320} 
                height={60} 
                color={sparklineColor}
                className="w-full"
              />
            ) : (
              <div className="w-full h-[60px] flex items-center justify-center border border-dashed border-[#1a1a1a] rounded-lg">
                <span className="text-xs text-white/20">No trend data</span>
              </div>
            )}
            {/* Decorative dashed line */}
            {sparklineData && sparklineData.length > 1 && (
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#1a1a1a] pointer-events-none" />
            )}
          </div>
        </div>

        {/* View Crew Button - FNFDOTFUN Tri-Colour Border */}
        <div 
          className="relative w-full rounded-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tricolor border using gradient */}
          <div 
            className="absolute inset-0 rounded-lg p-[1px]"
            style={{
              background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
            }}
          >
            <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
          </div>
          {/* Button content */}
          <Button 
            className="relative w-full bg-transparent border-none text-white font-medium hover:bg-white/5 transition-all"
          >
            View Crew
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Link>
  );
}
