"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";

const tool = getToolById("protect-pdf");
const MIN_PASSWORD_LENGTH = 4;

export default function ProtectPdfClient() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordsMatch = password === confirm || confirm === "";
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const hasError = !passwordsMatch || passwordTooShort;

  const options = password.length > 0 ? { password } : undefined;

  if (!tool) return null;

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={options} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto w-80 space-y-3">
          <div>
            <label htmlFor="protect-password" className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <input
              id="protect-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password"
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {passwordTooShort && (
              <p className="mt-1 text-xs text-danger" role="alert">
                Password must be at least {MIN_PASSWORD_LENGTH} characters.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="protect-confirm" className="block text-sm font-medium text-foreground mb-1.5">
              Confirm Password
            </label>
            <input
              id="protect-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {confirm.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-danger" role="alert">
                Passwords do not match.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            This password will be required to open the protected PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
