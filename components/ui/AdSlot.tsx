"use client";

import { ADS_ENABLED, MONETAG_BOTTOM_ZONE_ID, MONETAG_SIDEBAR_ZONE_ID } from "@/lib/constants";
import MonetagAd from "@/components/ads/MonetagAd";

interface AdSlotProps {
  placement: string;
  size?: "300x250" | "728x90" | "160x600";
  className?: string;
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  "300x250": { width: 300, height: 250 },
  "728x90": { width: 728, height: 90 },
  "160x600": { width: 160, height: 600 },
};

function getZoneId(placement: string): string {
  if (placement === "tool-bottom") return MONETAG_BOTTOM_ZONE_ID;
  if (placement === "tool-sidebar") return MONETAG_SIDEBAR_ZONE_ID;
  return "";
}

function PlaceholderSlot({ size, placement }: { size: string; placement: string }) {
  const dims = SIZE_MAP[size] || SIZE_MAP["300x250"];

  return (
    <div
      className="rounded-xl border border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden"
      style={{ width: dims.width, height: dims.height, maxWidth: "100%" }}
      role="complementary"
      aria-label={`Advertisement placeholder (${size})`}
      data-ad-placement={placement}
    >
      <div className="text-center px-4">
        <p className="text-xs text-muted-foreground/60 font-medium">Advertisement</p>
        <p className="text-[10px] text-muted-foreground/40 mt-0.5">{size}</p>
      </div>
    </div>
  );
}

export default function AdSlot({ placement, size = "300x250", className = "" }: AdSlotProps) {
  const zoneId = getZoneId(placement);
  const dims = SIZE_MAP[size] || SIZE_MAP["300x250"];
  const useRealAds = ADS_ENABLED && !!zoneId;

  if (!useRealAds) {
    return (
      <div className={className}>
        <PlaceholderSlot size={size} placement={placement} />
      </div>
    );
  }

  return (
    <div
      className={`ad-slot-wrapper ${className}`}
      style={{ maxWidth: "100%", overflow: "hidden" }}
      data-ad-placement={placement}
    >
      <MonetagAd
        zoneId={zoneId}
        style={{
          minWidth: dims.width,
          minHeight: dims.height,
          maxWidth: "100%",
        }}
      />
    </div>
  );
}
