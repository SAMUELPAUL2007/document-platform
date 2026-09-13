"use client";

import { useRouter } from "next/navigation";
import DropZone from "@/components/upload/DropZone";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-light via-white to-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            100% Free &middot; No Signup Required
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
            Every document tool
            <br />
            <span className="text-primary">you&apos;ll ever need</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Convert, merge, compress, and protect your documents.
            Fast, secure, and completely free — right in your browser.
          </p>
        </div>

        <div className="max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <DropZone
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
            maxFiles={5}
            onFilesSelected={(files) => {
              const file = files[0];
              const ext = file.name.split(".").pop()?.toLowerCase();
              if (ext === "pdf") {
                router.push("/pdf-to-word");
              } else if (ext === "doc" || ext === "docx") {
                router.push("/word-to-pdf");
              } else if (ext === "ppt" || ext === "pptx") {
                router.push("/ppt-to-pdf");
              } else if (ext === "jpg" || ext === "jpeg" || ext === "png") {
                router.push("/images-to-pdf");
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
