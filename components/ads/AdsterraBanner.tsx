"use client";

import { useEffect, useRef } from "react";

interface AdsterraBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

export default function AdsterraBanner({ adKey, width, height, className = "" }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !adKey) return;

    const container = containerRef.current;

    // Isolate each banner's window.atOptions in its own iframe
    // to prevent cross-banner config overwrites when multiple
    // banners render on the same page.
    const iframe = document.createElement("iframe");
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.border = "none";
    iframe.style.maxWidth = "100%";
    iframe.style.overflow = "hidden";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", "Advertisement");

    const scriptUrl = `https://www.highrevenueformat.com/${adKey}/invoke.js`;
    iframe.srcdoc = `<html><head></head><body style="margin:0;padding:0;overflow:hidden"><script>window.atOptions={key:"${adKey}",format:"iframe",height:${height},width:${width},params:{}};</script><script src="${scriptUrl}" async></script></body></html>`;

    container.appendChild(iframe);

    return () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
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
