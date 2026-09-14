"use client";

import { ADS_ENABLED } from "@/lib/constants";
import AdsterraBanner from "@/components/ads/AdsterraBanner";

interface AdSlotProps {
  placement: string;
  size?: "300x250" | "728x90";
  className?: string;
}

const ADSTERRA_ADS: Record<string, { key: string; width: number; height: number }> = {
  "tool-bottom": { key: "cc4ff625070796afc5afed58eb610e1c", width: 728, height: 90 },
  "tool-sidebar": { key: "bfd794ff311177b418b0c4fe6b3af600", width: 300, height: 250 },
};

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  "300x250": { width: 300, height: 250 },
  "728x90": { width: 728, height: 90 },
};

function PlaceholderSlot({ placement }: { placement: string }) {
  const ad = ADSTERRA_ADS[placement];
  const width = ad?.width || 300;
  const height = ad?.height || 250;

  return (
    <div
      className="rounded-xl border border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden"
      style={{ width, height, maxWidth: "100%" }}
      role="complementary"
      aria-label={`Advertisement placeholder (${width}x${height})`}
      data-ad-placement={placement}
    >
      <div className="text-center px-4">
        <p className="text-xs text-muted-foreground/60 font-medium">Advertisement</p>
        <p className="text-[10px] text-muted-foreground/40 mt-0.5">{width}x{height}</p>
      </div>
    </div>
  );
}

export default function AdSlot({ placement, size = "300x250", className = "" }: AdSlotProps) {
  const ad = ADSTERRA_ADS[placement];

  if (!ad || !ADS_ENABLED) {
    return (
      <div className={className}>
        <PlaceholderSlot placement={placement} />
      </div>
    );
  }

  return (
    <div
      className={`ad-slot-wrapper ${className}`}
      style={{ maxWidth: "100%", overflow: "hidden" }}
      data-ad-placement={placement}
    >
      <AdsterraBanner
        adKey={ad.key}
        width={ad.width}
        height={ad.height}
      />
    </div>
  );
}
