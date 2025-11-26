"use client";

import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, Users, ChevronRight } from "lucide-react";

interface CreatedCrew {
  id: string;
  name: string;
  avatarUrl: string | null;
  memberCount: number;
}

interface SelectFromCrewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createdCrews: CreatedCrew[];
  onSelectCrew: (crewId: string, crewName: string) => void;
}

export default function SelectFromCrewDialog({
  open,
  onOpenChange,
  createdCrews,
  onSelectCrew,
}: SelectFromCrewDialogProps) {
  if (!open) return null;

  // Use portal to escape PageTransition's transform/filter stacking context
  if (typeof document === "undefined") return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-md rounded-2xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(168,85,247,0.1)] overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-6">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-white">Select Your Crew</h2>
            </div>
            <p className="text-sm text-white/40">Which crew should issue the challenge?</p>
          </div>

          {/* Crew List */}
          <div className="space-y-3">
            {createdCrews.map((crew) => (
              <button
                key={crew.id}
                onClick={() => {
                  onSelectCrew(crew.id, crew.name);
                  handleClose();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]/50 hover:bg-[#0a0a0a] hover:border-[#2a2a2a] transition-all text-left group"
              >
                {crew.avatarUrl ? (
                  <Image
                    src={crew.avatarUrl}
                    alt={crew.name}
                    width={48}
                    height={48}
                    className="rounded-full border-2 border-[#2a2a2a]"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#2a2a2a]">
                    <span className="text-accent font-bold text-lg">
                      {crew.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{crew.name}</p>
                  <p className="text-sm text-white/40">
                    {crew.memberCount} member{crew.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
              </button>
            ))}
          </div>

          {/* Cancel Button */}
          <div className="mt-6">
            <Button
              onClick={handleClose}
              className="w-full h-11 bg-transparent border border-[#2a2a2a] text-white/60 hover:text-white rounded-xl hover:bg-white/5"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
