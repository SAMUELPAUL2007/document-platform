"use client";

import Script from "next/script";
import { ADS_ENABLED, MONETAG_SCRIPT_URL } from "@/lib/constants";

const SCRIPT_ID = "monetag-provider";

export default function MonetagProvider() {
  if (!ADS_ENABLED || !MONETAG_SCRIPT_URL) {
    return null;
  }

  return (
    <Script
      id={SCRIPT_ID}
      src={MONETAG_SCRIPT_URL}
      strategy="afterInteractive"
      async
    />
  );
}
