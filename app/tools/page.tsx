import Link from "next/link";
import { tools, categories } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Tools",
  description: "Browse all DocFlow document tools — convert, edit, organize, optimize, OCR, and share PDFs and office documents.",
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
};

export default function ToolsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            All Tools
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Everything you need to work with documents — free, no login required.
          </p>
        </div>

        {categories.map((cat) => {
          const catTools = tools.filter((t) => t.category === cat.id);
          if (catTools.length === 0) return null;
          return (
            <section key={cat.id} className="mb-10">
              <h2 className="text-xl font-semibold text-foreground mb-4">{cat.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group p-5 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
