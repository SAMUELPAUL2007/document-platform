"use client";

import { useEffect, useRef, useId } from "react";
import { ADS_ENABLED } from "@/lib/constants";

interface MonetagAdProps {
  zoneId: string;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    at?: {
      cmd?: Array<(...args: unknown[]) => void>;
    };
  }
}

export default function MonetagAd({ zoneId, className = "", style }: MonetagAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const safeId = instanceId.replace(/:/g, "m");

  useEffect(() => {
    if (!ADS_ENABLED || !zoneId || !containerRef.current) return;

    const container = containerRef.current;
    const divId = `monetag-zone-${safeId}`;

    let div = container.querySelector<HTMLDivElement>(`#${divId}`);
    if (!div) {
      div = document.createElement("div");
      div.id = divId;
      container.appendChild(div);
    }

    const script = document.createElement("script");
    script.async = true;
    script.dataset.cfasync = "false";
    script.src = `//grolewee.com/${zoneId}/zone.js`;
    script.onerror = () => {
      if (div && div.parentNode) {
        div.style.display = "none";
      }
    };

    div.appendChild(script);

    return () => {
      if (div && div.parentNode) {
        div.innerHTML = "";
      }
    };
  }, [zoneId, safeId]);

  if (!ADS_ENABLED || !zoneId) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`monetag-ad-container ${className}`}
      style={style}
      data-zone-id={zoneId}
      aria-hidden="true"
    />
  );
}
