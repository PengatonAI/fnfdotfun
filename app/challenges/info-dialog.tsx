"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { X, AlertCircle, Users } from "lucide-react";

interface InfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "member-not-creator" | "no-crew";
}

export default function InfoDialog({
  open,
  onOpenChange,
  type,
}: InfoDialogProps) {
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
          {type === "member-not-creator" && (
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-yellow-500/10 to-transparent rounded-full blur-3xl" />
          )}
        </div>

        <div className="relative p-6">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {type === "member-not-creator" ? (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Only Crew Leaders Can Challenge
                </h2>
                <p className="text-sm text-white/40">
                  Tell your crew leader to challenge another crew!
                </p>
              </div>

              {/* Button */}
              <Button
                onClick={handleClose}
                className="w-full h-11 bg-[#0a0a0a] border border-white/10 text-white rounded-xl tricolor-hover-border"
              >
                Got it
              </Button>
            </>
          ) : (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-accent" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Join a Crew First
                </h2>
                <p className="text-sm text-white/40">
                  You must join or create a crew before you can challenge others.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleClose}
                  className="flex-1 h-11 bg-transparent border border-[#2a2a2a] text-white/60 hover:text-white rounded-xl hover:bg-white/5"
                >
                  Close
                </Button>
                <Link href="/crews" className="flex-1">
                  <div className="relative rounded-xl overflow-hidden w-full">
                    <div 
                      className="absolute inset-0 rounded-xl p-[1px]"
                      style={{
                        background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
                      }}
                    >
                      <div className="w-full h-full rounded-[11px] bg-[#0a0a0a]" />
                    </div>
                    <Button 
                      className="relative w-full h-11 bg-transparent border-none text-white font-medium hover:bg-white/5"
                    >
                      Go to Crews
                    </Button>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
