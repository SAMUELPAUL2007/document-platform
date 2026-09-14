"use client";

import { useEffect, useRef } from "react";

interface AdsterraBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

export default function AdsterraBanner({ adKey, width, height, className = "" }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !adKey) return;

    const container = containerRef.current;

    window.atOptions = {
      key: adKey,
      format: "iframe",
      height,
      width,
      params: {},
    };

    const script = document.createElement("script");
    script.src = `https://www.highrevenueformat.com/${adKey}/invoke.js`;
    script.async = true;
    script.onerror = () => {
      script.remove();
    };
    container.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [adKey, width, height]);

  return (
    <div
      ref={containerRef}
      className={`adsterra-banner ${className}`}
      style={{ width, height, maxWidth: "100%", overflow: "hidden" }}
      data-ad-key={adKey}
      aria-hidden="true"
    />
  );
}
