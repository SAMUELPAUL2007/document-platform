"use client";

import Script from "next/script";
import { ADS_ENABLED } from "@/lib/constants";

const SCRIPT_ID = "adsterra-social-bar";

const ADSTERRA_SOCIAL_BAR_URL =
  "https://pl31340126.profitableratecpmnetwork.com/f0/04/e6/f004e6f82ed191757729b95f4a581b4d.js";

export default function AdsterraProvider() {
  if (!ADS_ENABLED) {
    return null;
  }

  return (
    <Script
      id={SCRIPT_ID}
      src={ADSTERRA_SOCIAL_BAR_URL}
      strategy="afterInteractive"
      async
    />
  );
}
