"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CreateChallengeDialog from "./create-challenge-dialog";
import SelectFromCrewDialog from "./select-from-crew-dialog";
import InfoDialog from "./info-dialog";
import { 
  Swords, 
  Clock, 
  History, 
  Send, 
  Inbox,
  Trophy
} from "lucide-react";

interface User {
  id: string;
  username: string | null;
  xHandle: string | null;
  image: string | null;
}

interface CrewMember {
  userId: string;
  user?: User;
}

interface Crew {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdByUserId: string;
  createdBy: User;
  members: CrewMember[];
}

interface UserCrew {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdByUserId: string;
  members: CrewMember[];
}

interface Challenge {
  id: string;
  fromCrewId: string;
  toCrewId: string;
  fromCrew: Crew;
  toCrew: Crew;
  createdById: string;
  createdBy: User;
  status: string;
  type: string;
  durationHours: number;
  visibility: string;
  startAt: string | null;
  endAt: string | null;
  decidedAt: string | null;
  decidedById: string | null;
  decidedBy: User | null;
  winnerCrewId: string | null;
  winnerCrew: Crew | null;
  createdAt: string;
  updatedAt: string;
}

interface ChallengesClientProps {
  userId: string;
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function PageHeader({ onChallengeClick }: { onChallengeClick: () => void }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-white text-2xl font-semibold">Challenges</h1>
        <p className="text-white/60 text-sm mt-1">
          Crew battles and head-to-head competitions. Track your active and past challenges.
        </p>
      </div>
      {/* Tricolor Challenge Button */}
      <div className="relative rounded-lg overflow-hidden flex-shrink-0">
        <div 
          className="absolute inset-0 rounded-lg p-[1px]"
          style={{
            background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
          }}
        >
          <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
        </div>
        <Button 
          onClick={onChallengeClick}
          className="relative bg-transparent border-none text-white font-medium hover:bg-white/5 px-6 py-2.5"
        >
          <Swords className="w-4 h-4 mr-2" />
          Challenge Another Crew
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function SectionHeader({
  title,
  icon: Icon,
  count,
  accentColor,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-10 mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-5 h-5 ${accentColor || 'text-white/40'}`} />}
        <h2 className="text-white text-lg font-semibold">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-sm font-medium rounded-full ${
            accentColor?.includes('green') 
              ? 'bg-[#00d57a]/20 text-[#00d57a]' 
              : accentColor?.includes('red') 
                ? 'bg-[#ff4a4a]/20 text-[#ff4a4a]'
                : accentColor?.includes('yellow')
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : 'bg-white/10 text-white/60'
          }`}>
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function EmptyState({ 
  title, 
  message,
  icon: Icon = Swords,
}: { 
  title: string;
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8">
      {/* Decorative purple glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="relative flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-accent/60" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/40 text-sm max-w-sm">{message}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CHALLENGE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function ChallengeCard({
  challenge,
  type,
  userId,
  processingId,
  onDecision,
  formatDate,
  formatDuration,
  getTimeRemaining,
  getUserDisplayName,
}: {
  challenge: Challenge;
  type: "incoming" | "outgoing" | "active" | "completed";
  userId: string;
  processingId: string | null;
  onDecision: (challengeId: string, action: "accept" | "decline") => void;
  formatDate: (date: string) => string;
  formatDuration: (hours: number) => string;
  getTimeRemaining: (endAt: string) => string;
  getUserDisplayName: (user: User) => string;
}) {
  if (type === "active") {
    return (
      <Link
        href={`/challenges/${challenge.id}`}
        className="block relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#00d57a]/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,213,122,0.1)] transition-all duration-300 group"
      >
        {/* Green glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#00d57a]/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="relative p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center -space-x-2">
                {challenge.fromCrew.avatarUrl ? (
                  <img
                    src={challenge.fromCrew.avatarUrl}
                    alt={challenge.fromCrew.name}
                    className="h-10 w-10 rounded-full border-2 border-[#0a0a0a]"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#0a0a0a]">
                    <span className="text-accent font-medium">
                      {challenge.fromCrew.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {challenge.toCrew.avatarUrl ? (
                  <img
                    src={challenge.toCrew.avatarUrl}
                    alt={challenge.toCrew.name}
                    className="h-10 w-10 rounded-full border-2 border-[#0a0a0a]"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#0a0a0a]">
                    <span className="text-accent font-medium">
                      {challenge.toCrew.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-white">
                  {challenge.fromCrew.name}
                  <span className="text-white/40 mx-2">vs</span>
                  {challenge.toCrew.name}
                </p>
                <p className="text-sm text-white/40">
                  Type: {challenge.type.toUpperCase()} • Duration: {formatDuration(challenge.durationHours)}
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-[#00d57a]/20 text-[#00d57a] border border-[#00d57a]/30">
                Live
              </span>
              <span className="text-white/30">→</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm pt-3 border-t border-[#1a1a1a]">
            <span className="text-white/40">
              Started: {challenge.startAt && formatDate(challenge.startAt)}
            </span>
            <span className="text-[#00d57a] font-medium">
              {challenge.endAt && getTimeRemaining(challenge.endAt)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (type === "completed") {
    return (
      <Link
        href={`/challenges/${challenge.id}`}
        className="block relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#2a2a2a] transition-all duration-300 group opacity-80 hover:opacity-100"
      >
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center -space-x-2">
                {challenge.fromCrew.avatarUrl ? (
                  <img
                    src={challenge.fromCrew.avatarUrl}
                    alt={challenge.fromCrew.name}
                    className="h-10 w-10 rounded-full border-2 border-[#0a0a0a]"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#0a0a0a]">
                    <span className="text-accent font-medium">
                      {challenge.fromCrew.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {challenge.toCrew.avatarUrl ? (
                  <img
                    src={challenge.toCrew.avatarUrl}
                    alt={challenge.toCrew.name}
                    className="h-10 w-10 rounded-full border-2 border-[#0a0a0a]"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#0a0a0a]">
                    <span className="text-accent font-medium">
                      {challenge.toCrew.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-white">
                  {challenge.fromCrew.name}
                  <span className="text-white/40 mx-2">vs</span>
                  {challenge.toCrew.name}
                </p>
                <p className="text-sm text-white/40">
                  Ended {challenge.endAt && formatDate(challenge.endAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {challenge.winnerCrew ? (
                <div className="text-right">
                  <span className="text-xs text-white/40">Winner</span>
                  <p className="font-medium text-[#00d57a]">{challenge.winnerCrew.name}</p>
                </div>
              ) : (
                <span className="px-3 py-1 text-xs font-medium bg-white/10 text-white/60 rounded-full">
                  Draw
                </span>
              )}
              <span className="text-white/30">→</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (type === "incoming") {
    return (
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#ff4a4a]/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {/* Red glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#ff4a4a]/10 to-transparent rounded-full blur-2xl" />
        </div>

        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {challenge.fromCrew.avatarUrl ? (
                <img
                  src={challenge.fromCrew.avatarUrl}
                  alt={challenge.fromCrew.name}
                  className="h-12 w-12 rounded-full border-2 border-[#2a2a2a]"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#2a2a2a]">
                  <span className="text-accent font-medium text-lg">
                    {challenge.fromCrew.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-white">
                  <span className="text-[#ff4a4a]">{challenge.fromCrew.name}</span>
                  <span className="text-white/40 mx-2">→</span>
                  <span>{challenge.toCrew.name}</span>
                </p>
                <div className="flex items-center gap-3 text-sm text-white/40">
                  <span>Duration: {formatDuration(challenge.durationHours)}</span>
                  <span>•</span>
                  <span>Sent {formatDate(challenge.createdAt)}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">
                  From {getUserDisplayName(challenge.createdBy)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onDecision(challenge.id, "accept")}
                disabled={processingId === challenge.id}
                className="bg-[#00d57a] hover:bg-[#00d57a]/90 text-white font-medium"
              >
                {processingId === challenge.id ? "..." : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDecision(challenge.id, "decline")}
                disabled={processingId === challenge.id}
                className="bg-transparent border-[#2a2a2a] text-white/60 hover:text-white hover:bg-white/5"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Outgoing
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {challenge.toCrew.avatarUrl ? (
              <img
                src={challenge.toCrew.avatarUrl}
                alt={challenge.toCrew.name}
                className="h-12 w-12 rounded-full border-2 border-[#2a2a2a]"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#2a2a2a]">
                <span className="text-accent font-medium text-lg">
                  {challenge.toCrew.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-white">
                <span>{challenge.fromCrew.name}</span>
                <span className="text-white/40 mx-2">→</span>
                <span className="text-accent">{challenge.toCrew.name}</span>
              </p>
              <div className="flex items-center gap-3 text-sm text-white/40">
                <span>Duration: {formatDuration(challenge.durationHours)}</span>
                <span>•</span>
                <span>Sent {formatDate(challenge.createdAt)}</span>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
            Pending
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChallengesClient({ userId }: ChallengesClientProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSelectCrewDialog, setShowSelectCrewDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogType, setInfoDialogType] = useState<"member-not-creator" | "no-crew">("no-crew");
  const [selectedFromCrew, setSelectedFromCrew] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  // Fetch user's crews
  const { data: userCrews } = useSWR<UserCrew[]>("/api/crews", fetcher);

  const { data: challenges, error, isLoading, mutate } = useSWR<Challenge[]>(
    "/api/challenges?scope=all",
    fetcher,
    { refreshInterval: 15000 }
  );

  // Determine user's crew status
  const isInAnyCrew = userCrews && userCrews.length > 0;
  const createdCrews = userCrews?.filter((c) => c.createdByUserId === userId) || [];
  const hasCreatedCrew = createdCrews.length > 0;
  const hasMultipleCreatedCrews = createdCrews.length > 1;

  // Handle "Challenge Another Crew" button click
  const handleChallengeClick = () => {
    if (!isInAnyCrew) {
      // User is not in any crew
      setInfoDialogType("no-crew");
      setShowInfoDialog(true);
    } else if (!hasCreatedCrew) {
      // User is member but not creator
      setInfoDialogType("member-not-creator");
      setShowInfoDialog(true);
    } else if (hasMultipleCreatedCrews) {
      // User has multiple crews - ask which one
      setShowSelectCrewDialog(true);
    } else {
      // User has exactly one created crew
      const crew = createdCrews[0];
      setSelectedFromCrew({ id: crew.id, name: crew.name });
      setShowCreateDialog(true);
    }
  };

  // Handle crew selection from SelectFromCrewDialog
  const handleSelectCrew = (crewId: string, crewName: string) => {
    setSelectedFromCrew({ id: crewId, name: crewName });
    setShowSelectCrewDialog(false);
    setShowCreateDialog(true);
  };

  // Split challenges into categories
  const incomingPending = challenges?.filter(
    (c) => c.status === "pending" && c.toCrew.createdByUserId === userId
  ) || [];

  const outgoingPending = challenges?.filter(
    (c) => c.status === "pending" && c.fromCrew.createdByUserId === userId
  ) || [];

  const activeChallenges = challenges?.filter(
    (c) => c.status === "active"
  ) || [];

  const completedChallenges = challenges?.filter(
    (c) => c.status === "completed"
  ) || [];

  const handleDecision = async (challengeId: string, action: "accept" | "decline") => {
    setProcessingId(challengeId);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} challenge`);
      }

      // Refresh data
      mutate();
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days}d`;
    }
    return `${days}d ${remainingHours}h`;
  };

  const getTimeRemaining = (endAt: string) => {
    const end = new Date(endAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return "Ended";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours < 1) {
      return `${diffMinutes}m remaining`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ${diffMinutes}m remaining`;
    }
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    return `${days}d ${hours}h remaining`;
  };

  const getUserDisplayName = (user: User) => {
    if (user.username) return user.username;
    if (user.xHandle) return `@${user.xHandle}`;
    return "Unknown";
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader onChallengeClick={handleChallengeClick} />
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-8">
          <p className="text-white/40 text-center">Loading challenges...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader onChallengeClick={handleChallengeClick} />
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#ff4a4a]/30 p-8">
          <p className="text-[#ff4a4a] text-center">Failed to load challenges. Please try again.</p>
        </div>
      </div>
    );
  }

  const hasNoChallenges = 
    incomingPending.length === 0 && 
    outgoingPending.length === 0 && 
    activeChallenges.length === 0 &&
    completedChallenges.length === 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader onChallengeClick={handleChallengeClick} />

      {/* Active Challenges Section */}
      <SectionHeader 
        title="Active Challenges" 
        icon={Trophy}
        count={activeChallenges.length}
        accentColor="text-[#00d57a]"
      />
      {activeChallenges.length > 0 ? (
        <div className="space-y-4">
          {activeChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              type="active"
              userId={userId}
              processingId={processingId}
              onDecision={handleDecision}
              formatDate={formatDate}
              formatDuration={formatDuration}
              getTimeRemaining={getTimeRemaining}
              getUserDisplayName={getUserDisplayName}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No active battles" 
          message="Start a challenge to see live competitions here."
          icon={Trophy}
        />
      )}

      {/* Incoming Challenges Section */}
      <SectionHeader 
        title="Incoming Challenges" 
        icon={Inbox}
        count={incomingPending.length}
        accentColor="text-[#ff4a4a]"
      />
      {incomingPending.length > 0 ? (
        <div className="space-y-4">
          {incomingPending.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              type="incoming"
              userId={userId}
              processingId={processingId}
              onDecision={handleDecision}
              formatDate={formatDate}
              formatDuration={formatDuration}
              getTimeRemaining={getTimeRemaining}
              getUserDisplayName={getUserDisplayName}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No incoming challenges" 
          message="When another crew challenges you, it will appear here."
          icon={Inbox}
        />
      )}

      {/* Outgoing Challenges Section */}
      <SectionHeader 
        title="Outgoing Challenges" 
        icon={Send}
        count={outgoingPending.length}
        accentColor="text-yellow-500"
      />
      {outgoingPending.length > 0 ? (
        <div className="space-y-4">
          {outgoingPending.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              type="outgoing"
              userId={userId}
              processingId={processingId}
              onDecision={handleDecision}
              formatDate={formatDate}
              formatDuration={formatDuration}
              getTimeRemaining={getTimeRemaining}
              getUserDisplayName={getUserDisplayName}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No outgoing challenges" 
          message="Challenges you've sent will appear here while awaiting response."
          icon={Send}
        />
      )}

      {/* Past Challenges Section */}
      <SectionHeader 
        title="Past Challenges" 
        icon={History}
        count={completedChallenges.length}
      />
      {completedChallenges.length > 0 ? (
        <div className="space-y-4">
          {completedChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              type="completed"
              userId={userId}
              processingId={processingId}
              onDecision={handleDecision}
              formatDate={formatDate}
              formatDuration={formatDuration}
              getTimeRemaining={getTimeRemaining}
              getUserDisplayName={getUserDisplayName}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No past challenges" 
          message="Completed battles will be recorded here."
          icon={History}
        />
      )}

      {/* Modals */}
      <CreateChallengeDialog
        fromCrewId={selectedFromCrew?.id || ""}
        fromCrewName={selectedFromCrew?.name || ""}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <SelectFromCrewDialog
        open={showSelectCrewDialog}
        onOpenChange={setShowSelectCrewDialog}
        createdCrews={createdCrews.map((c) => ({
          id: c.id,
          name: c.name,
          avatarUrl: c.avatarUrl,
          memberCount: c.members.length,
        }))}
        onSelectCrew={handleSelectCrew}
      />
      <InfoDialog
        open={showInfoDialog}
        onOpenChange={setShowInfoDialog}
        type={infoDialogType}
      />
    </div>
  );
}
