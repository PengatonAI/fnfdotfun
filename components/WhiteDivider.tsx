export function WhiteDivider() {
  return (
    <div className="relative w-full h-[2px] overflow-hidden">
      {/* Base line with faint white glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-[0.5px]" />
      
      {/* Animated shimmer beam - moves left to right */}
      <div className="absolute inset-y-0 w-[50%] bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer blur-[0.5px]" />
      
      {/* Soft pulsating glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse-glow" />
    </div>
  );
}

