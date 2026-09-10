import Hero from "@/components/home/Hero";
import PopularTools from "@/components/home/PopularTools";
import FeatureCategories from "@/components/home/FeatureCategories";
import RecentActivity from "@/components/home/RecentActivity";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DocFlow — Free Online Document Tools | Convert, Edit, Merge PDFs",
  description:
    "Convert, edit, merge, compress, OCR, and share your PDF documents for free. No signup required. Fast, secure, and works right in your browser.",
  keywords: [
    "PDF converter",
    "PDF to Word",
    "merge PDF",
    "compress PDF",
    "OCR PDF",
    "free document tools",
    "online PDF editor",
  ],
  openGraph: {
    title: "DocFlow — Free Online Document Tools",
    description:
      "Convert, edit, merge, compress, and share your PDF documents. 100% free, no signup required.",
    url: SITE_URL,
    type: "website",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DocFlow",
    url: SITE_URL,
    description:
      "Convert, edit, merge, compress, OCR, and share your PDF documents for free. No signup required. Fast, secure, and works right in your browser.",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "PDF to Word conversion",
      "Word to PDF conversion",
      "PDF to Excel conversion",
      "PDF to PowerPoint conversion",
      "Merge PDF files",
      "Split PDF files",
      "Compress PDF",
      "OCR PDF",
      "Password protect PDF",
      "Images to PDF",
      "PDF to JPG/PNG",
      "Online document editor",
      "Online spreadsheet editor",
      "Online presentation editor",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <PopularTools />
      <RecentActivity />
      <FeatureCategories />

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Why DocFlow?
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                title: "100% Free",
                desc: "No hidden fees, no watermarks, no limitations. Use every tool completely free.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Secure & Private",
                desc: "Files are processed securely and deleted within one hour. We never store or share your documents.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
              },
              {
                title: "No Signup Needed",
                desc: "Jump straight in. Upload a file, pick a tool, and get results in seconds.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="text-center p-6 rounded-2xl bg-surface border border-border animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
