import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us | DocFlow",
  description:
    "Get in touch with the DocFlow team. We'd love to hear your feedback, suggestions, or bug reports.",
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-foreground mb-6">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Have questions, feedback, or need help? We&apos;d love to hear from you.
      </p>

      <div className="space-y-8">
        <section className="bg-card rounded-2xl border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Email</h2>
          <p className="text-muted-foreground mb-4">
            For general inquiries, feedback, or support:
          </p>
            <a href="mailto:support@docflow.app" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">support@docflow.app</a>
        </section>

        <section className="bg-card rounded-2xl border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Bug Reports</h2>
          <p className="text-muted-foreground mb-4">
            Found a bug or have a feature request? Let us know and we&apos;ll look into it.
          </p>
            <a href="mailto:bugs@docflow.app" className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">Report a Bug</a>
        </section>

        <section className="bg-card rounded-2xl border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Response Time</h2>
          <p className="text-muted-foreground">
            We typically respond within 24-48 hours. For urgent issues, please include
            &quot;Urgent&quot; in the subject line.
          </p>
        </section>
      </div>
    </div>
  );
}
