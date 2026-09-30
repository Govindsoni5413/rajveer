import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  inverted?: boolean; // When on dark backgrounds (e.g. top header bar)
}

export function Logo({ className = "", size = "md", inverted = false }: LogoProps) {
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Gold Ring & Diamond SVG */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Diamond gem on top */}
          <polygon
            points="16,3 23,10 16,15 9,10"
            fill="#F5B400"
            stroke="#D99A00"
            strokeWidth="1.2"
          />
          <polygon
            points="16,3 19,10 16,15 13,10"
            fill="#FFF3C4"
            opacity="0.85"
          />
          {/* Luxury Ring Band */}
          <circle
            cx="16"
            cy="19"
            r="10"
            stroke="#F5B400"
            strokeWidth="2.8"
            fill="none"
          />
          <circle
            cx="16"
            cy="19"
            r="7.5"
            stroke="#D99A00"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-heading font-bold tracking-tight uppercase ${textSizes[size]} ${
            inverted ? "text-[#F5B400]" : "text-[#0A0A0A]"
          }`}
          style={{ letterSpacing: "0.08em" }}
        >
          Rajveer
        </span>
      </div>
    </div>
  );
}
