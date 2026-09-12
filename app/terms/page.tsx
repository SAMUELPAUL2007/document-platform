import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service | Docvanta",
  description:
    "Read the terms of service for using Docvanta's free online document tools.",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
      <p className="text-muted-foreground mb-4">
        Last updated: January 1, 2025
      </p>

      <div className="prose prose-gray max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing and using Docvanta, you agree to be bound by these Terms of Service.
            If you do not agree, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Service Description</h2>
          <p className="text-muted-foreground">
            Docvanta provides free online document tools including PDF conversion, editing,
            merging, splitting, and other document processing utilities. Document processing
            occurs on our secure servers. Uploaded files are temporary and are automatically
            deleted within one hour of processing completion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">User Responsibilities</h2>
          <p className="text-muted-foreground">
            You are responsible for the documents you process using Docvanta. You agree not
            to use the service for any illegal purposes. You retain all rights to your
            documents.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
          <p className="text-muted-foreground">
            Docvanta and its original content, features, and functionality are owned by
            Docvanta and are protected by copyright, trademark, and other intellectual
            property laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Disclaimer</h2>
          <p className="text-muted-foreground">
            Docvanta is provided &quot;as is&quot; without warranties of any kind. We are not
            responsible for any loss of data or documents processed through our service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about these Terms, please contact us through our{" "}
            <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
