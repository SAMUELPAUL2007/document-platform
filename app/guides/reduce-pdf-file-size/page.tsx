import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

const PAGE_URL = `${SITE_URL}/guides/reduce-pdf-file-size`;

export const metadata: Metadata = {
  title: "How to Reduce PDF File Size — 4 Simple Methods",
  description:
    "Learn practical ways to reduce PDF file size for email, uploads, and storage. Covers compression, image optimization, recreating from source, and removing pages.",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "How to Reduce PDF File Size — 4 Simple Methods",
    description:
      "Practical methods to make your PDF files smaller without sacrificing readability.",
    url: PAGE_URL,
    type: "article",
  },
};

const faqs = [
  {
    question: "How much can I reduce a PDF file size?",
    answer:
      "It depends on the contents of the PDF. Documents with large embedded images typically see the most reduction. Text-heavy PDFs compress less because text is already compact. There is no guaranteed percentage — the result varies by file.",
  },
  {
    question: "Will compressing a PDF reduce its quality?",
    answer:
      "Docvanta's Compress PDF tool offers three levels. Maximum Quality preserves visual fidelity and metadata. Balanced provides a meaningful size reduction with minimal visual change. Maximum Compression produces the smallest file but may show slight quality reduction on image-heavy pages.",
  },
  {
    question: "Is it better to compress a PDF or recreate it from the original?",
    answer:
      "If you still have the original Word document or images, recreating the PDF often produces a smaller file with better quality. Compression is best when you only have the PDF and no access to the source files.",
  },
  {
    question: "Can I compress a PDF that is over 100 MB?",
    answer:
      "Docvanta's Compress PDF tool accepts files up to 100 MB. If your file is larger, consider removing unnecessary pages first using the Delete Pages tool, or recreating the PDF from the original source at a lower resolution.",
  },
  {
    question: "Does compressing a PDF remove metadata?",
    answer:
      "The Maximum Compression setting removes metadata to achieve the smallest file size. The Balanced and Maximum Quality settings retain metadata. Choose the setting that matches your needs.",
  },
];

export default function ReducePdfFileSizeGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
        How to Reduce PDF File Size — 4 Simple Methods
      </h1>

      <p className="text-muted-foreground mb-8 leading-relaxed">
        PDF files are everywhere — contracts, reports, scanned documents, presentations.
        But large PDFs can be difficult to share. They slow down email attachments,
        exceed upload limits, and consume unnecessary storage. Here are four practical
        methods to reduce PDF file size, depending on your situation.
      </p>

      <div className="prose prose-gray max-w-none space-y-8 text-foreground">
        {/* Why PDFs get large */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Why PDF Files Become Large</h2>
          <p className="text-muted-foreground leading-relaxed">
            Understanding why a PDF is large helps you choose the right reduction method.
            The most common causes are:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
            <li>
              <strong className="text-foreground">High-resolution images.</strong> Photos
              and scanned pages stored at 300 DPI or higher add significant bulk. A single
              scanned page can easily be several megabytes.
            </li>
            <li>
              <strong className="text-foreground">Embedded fonts.</strong> PDFs sometimes
              embed entire font families to ensure consistent rendering, which increases file
              size even in text-only documents.
            </li>
            <li>
              <strong className="text-foreground">Multiple combined files.</strong> Merging
              several PDFs into one document accumulates the size of every source file.
            </li>
            <li>
              <strong className="text-foreground">Unnecessary pages.</strong> Blank pages,
              cover sheets, or outdated sections that are no longer needed still take up
              space.
            </li>
          </ul>
        </section>

        {/* Method 1: Compress */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Method 1 — Compress the PDF</h2>
          <p className="text-muted-foreground leading-relaxed">
            Compression is the fastest way to reduce PDF file size when you only have the
            PDF and no access to the original source files. A compression tool analyzes
            the document and reduces its size by optimizing images, removing unnecessary
            data, and streamlining the internal structure.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Docvanta offers a free{" "}
            <Link href="/compress-pdf" className="text-primary hover:underline">
              Compress PDF
            </Link>{" "}
            tool with three compression levels:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
            <li>
              <strong className="text-foreground">Maximum Compression</strong> — produces
              the smallest file. Removes metadata. Best when file size is the top priority.
            </li>
            <li>
              <strong className="text-foreground">Balanced</strong> — offers a good mix of
              size reduction and visual quality. A solid default choice for most documents.
            </li>
            <li>
              <strong className="text-foreground">Maximum Quality</strong> — reduces file
              size while preserving metadata and the highest visual fidelity. Best for
              presentations or documents where appearance matters most.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            The amount of reduction depends on the contents of the PDF. Documents with
            large images typically shrink the most. Text-heavy documents see less reduction
            because text is already compact.
          </p>
        </section>

        {/* Method 2: Reduce image size */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Method 2 — Reduce Image Size</h2>
          <p className="text-muted-foreground leading-relaxed">
            Images are often the biggest contributor to PDF file size. If your PDF contains
            high-resolution photographs or scanned pages, the images alone can account for
            most of the file weight.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            If you created the PDF from images, consider converting them at a lower
            resolution before creating the PDF. Docvanta&apos;s{" "}
            <Link href="/images-to-pdf" className="text-primary hover:underline">
              Images to PDF
            </Link>{" "}
            tool supports JPG, PNG, and WebP images. When creating a PDF from images,
            using the &quot;Original&quot; page size option avoids adding unnecessary
            padding, and choosing appropriately sized source images keeps the final PDF
            compact.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            If the PDF already exists and you cannot access the original images, the{" "}
            <Link href="/compress-pdf" className="text-primary hover:underline">
              Compress PDF
            </Link>{" "}
            tool can still reduce image sizes within the document.
          </p>
        </section>

        {/* Method 3: Recreate from source */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Method 3 — Recreate the PDF from the Source
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            When you have the original file used to create the PDF, recreating the document
            often produces a smaller, cleaner result than compressing an existing PDF. This
            approach works especially well when the original was a Word document, a
            presentation, or a set of images.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            For example, if you have a Word document, you can convert it directly to PDF
            using Docvanta&apos;s{" "}
            <Link href="/word-to-pdf" className="text-primary hover:underline">
              Word to PDF
            </Link>{" "}
            tool. The resulting PDF is generated from the source content rather than being
            re-compressed from an existing file, which typically yields a smaller file with
            better text clarity.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Similarly, if your PDF was created from a presentation, converting the original{" "}
            <Link href="/ppt-to-pdf" className="text-primary hover:underline">
              PowerPoint to PDF
            </Link>{" "}
            produces a fresh, optimized file.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            This method is not always practical — you may not have the original files, or
            the original may have been modified since the PDF was created. In those cases,
            direct compression is the better option.
          </p>
        </section>

        {/* Method 4: Remove pages */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Method 4 — Remove Unnecessary Pages
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Sometimes the simplest way to reduce a PDF&apos;s file size is to remove pages
            that are not needed. Blank pages, outdated appendix sections, cover sheets,
            or duplicate content all add weight to the document.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Docvanta offers two tools for this. Use{" "}
            <Link href="/delete-pages" className="text-primary hover:underline">
              Delete Pages
            </Link>{" "}
            when you know which specific pages to remove. Use{" "}
            <Link href="/extract-pages" className="text-primary hover:underline">
              Extract Pages
            </Link>{" "}
            when you want to keep only certain pages and discard the rest.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            After removing pages, you can optionally compress the remaining document for
            further size reduction.
          </p>
        </section>

        {/* Which method should you use? */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Which Method Should You Use?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The right approach depends on your situation:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
            <li>
              <strong className="text-foreground">You only have the PDF, no source files</strong>{" "}
              — use <Link href="/compress-pdf" className="text-primary hover:underline">Compress PDF</Link>.
            </li>
            <li>
              <strong className="text-foreground">You have the original Word or PowerPoint file</strong>{" "}
              — recreate the PDF from source for the best results.
            </li>
            <li>
              <strong className="text-foreground">The PDF has pages you do not need</strong>{" "}
              — remove them first with{" "}
              <Link href="/delete-pages" className="text-primary hover:underline">Delete Pages</Link>,
              then compress if needed.
            </li>
            <li>
              <strong className="text-foreground">The PDF was created from images</strong>{" "}
              — consider recreating from the original images at a lower resolution, or
              compress the existing PDF.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            In many cases, combining methods works best. For example, removing unnecessary
            pages and then compressing the result can produce a significantly smaller file
            than either approach alone.
          </p>
        </section>

        {/* How to compress with Docvanta */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            How to Compress a PDF with Docvanta
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Docvanta&apos;s Compress PDF tool is free, requires no signup, and works
            online. Here is how to use it:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground mt-3">
            <li>
              Go to the{" "}
              <Link href="/compress-pdf" className="text-primary hover:underline">
                Compress PDF
              </Link>{" "}
              page.
            </li>
            <li>
              Drag your PDF file into the upload area, or click to browse your files.
            </li>
            <li>
              Choose a compression level: Maximum Compression for the smallest file,
              Balanced for a good mix, or Maximum Quality to preserve metadata.
            </li>
            <li>
              Click &quot;Compress PDF&quot; and wait while the file is processed.
            </li>
            <li>
              Download your compressed PDF when processing is complete.
            </li>
          </ol>
          <p className="text-muted-foreground leading-relaxed mt-3">
            You can upload multiple PDFs at once — the tool accepts up to 10 files in a
            single batch. Each file is compressed individually and can be downloaded
            separately.
          </p>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-white p-4"
              >
                <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
                  {faq.question}
                  <svg
                    className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* JSON-LD: Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "How to Reduce PDF File Size — 4 Simple Methods",
            description:
              "Learn practical ways to reduce PDF file size for email, uploads, and storage.",
            url: PAGE_URL,
            author: {
              "@type": "Organization",
              name: "Docvanta",
            },
            publisher: {
              "@type": "Organization",
              name: "Docvanta",
            },
          }),
        }}
      />

      {/* JSON-LD: FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
