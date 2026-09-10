import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy | DocFlow",
  description:
    "Learn how DocFlow handles your privacy. Files are processed securely and deleted immediately after processing.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">
        Last updated: January 1, 2025
      </p>

      <div className="prose prose-gray max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">File Processing</h2>
          <p className="text-muted-foreground">
            DocFlow processes your files securely on our servers. Uploaded files and
            results are stored temporarily in isolated processing directories and are
            automatically deleted within one hour of processing completion. We do not
            access, read, or share the contents of your documents beyond what is
            necessary to perform the requested conversion or operation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Data Collection</h2>
          <p className="text-muted-foreground">
            We do not collect, store, or transmit any personal data or document contents
            beyond the temporary processing described above. We may collect anonymous
            usage analytics (page views, tool usage) to improve our service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Cookies</h2>
          <p className="text-muted-foreground">
            DocFlow does not use tracking cookies. We may use essential cookies required
            for the functioning of the website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
          <p className="text-muted-foreground">
            DocFlow does not share your data with any third-party services. All document
            processing occurs on our own infrastructure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about this Privacy Policy, please contact us through
            our{" "}
            <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
