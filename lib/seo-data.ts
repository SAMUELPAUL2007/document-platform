export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolSeoContent {
  intro: string;
  howToUse: string[];
  features: string[];
  faqs: ToolFaq[];
}

export const toolSeoData: Record<string, ToolSeoContent> = {
  "pdf-to-word": {
    intro:
      "Convert PDF to Word documents you can edit directly. Whether you need to update a resume, fix a typo in a report, or repurpose content from a shared PDF, this converter preserves your original layout, fonts, and images so you can start editing right away in Microsoft Word or Google Docs.",
    howToUse: [
      "Drag and drop your PDF file into the upload area, or click to browse your files.",
      "Click \"Convert to Word\" and wait a few seconds while the document is processed.",
      "Download your editable DOCX file when the conversion is complete.",
    ],
    features: [
      "Preserves headings, paragraphs, tables, and images from the original PDF.",
      "Handles multi-page documents of any size up to 100 MB.",
      "Output files open in Microsoft Word, Google Docs, and LibreOffice.",
    ],
    faqs: [
      {
        question: "Will my formatting stay the same after converting PDF to Word?",
        answer:
          "The converter preserves text formatting, images, tables, and basic layout. Complex multi-column designs may shift slightly, but headings, fonts, and paragraph structure are maintained so you can edit without starting from scratch.",
      },
      {
        question: "Can I convert a scanned PDF to an editable Word document?",
        answer:
          "Standard PDF-to-Word conversion works on text-based PDFs. For scanned documents, use the Docvanta OCR PDF tool first to extract the text layer, then convert the result to Word.",
      },
      {
        question: "Is there a limit on file size?",
        answer:
          "You can convert PDFs up to 100 MB. Most documents fall well within this limit. Larger files may take a bit longer to process depending on page count and complexity.",
      },
      {
        question: "Do I need to install any software?",
        answer:
          "No. The conversion happens entirely in your browser and on our servers. There is nothing to install — just upload, convert, and download.",
      },
    ],
  },

  "word-to-pdf": {
    intro:
      "Convert Word documents to PDF files that look the same on every device and operating system. This is especially useful when sharing contracts, resumes, or reports where consistent formatting matters — the recipient sees exactly what you intended, regardless of whether they have Word installed.",
    howToUse: [
      "Upload your DOCX or DOC file by dragging it into the drop zone or clicking to browse.",
      "Click \"Convert to PDF\" to start the conversion.",
      "Download your PDF file once processing finishes.",
    ],
    features: [
      "Accepts both DOCX and legacy DOC formats.",
      "Retains fonts, images, tables, headers, and footers from your original document.",
      "Converts multiple Word files at once — upload up to 10 files in a batch.",
      "Output PDFs are compatible with all major PDF readers.",
    ],
    faqs: [
      {
        question: "Will my Word document look the same as a PDF?",
        answer:
          "Yes. The converter renders your document exactly as it appears in Word, preserving fonts, images, spacing, and page breaks so the PDF matches your original layout.",
      },
      {
        question: "Can I convert multiple Word files at once?",
        answer:
          "Absolutely. Upload up to 10 Word files at the same time and each will be converted to a separate PDF for individual download.",
      },
      {
        question: "Does it support password-protected Word files?",
        answer:
          "If your DOCX file is password-protected for opening, you will need to remove the password first before uploading. The converter does not currently handle encrypted Word documents.",
      },
      {
        question: "What version of Word do I need?",
        answer:
          "You do not need Word at all. The conversion is handled online. The tool accepts DOCX files from Word 2007 and later, as well as older DOC files.",
      },
    ],
  },

  "pdf-to-ppt": {
    intro:
      "Turn PDF presentations into editable PowerPoint slides you can refine, restyle, and present. This is ideal when you receive a PDF from a colleague or download a slide deck from the web and need to make changes before your next meeting.",
    howToUse: [
      "Drop your PDF file into the upload area.",
      "Click \"Convert to PowerPoint\" and wait while each page becomes a slide.",
      "Download the resulting PPTX file and open it in PowerPoint or Google Slides.",
    ],
    features: [
      "Each PDF page becomes a separate, editable PowerPoint slide.",
      "Preserves text, images, and basic layout from the original document.",
      "Supports presentations of any page count.",
      "Output PPTX files work in Microsoft PowerPoint, Google Slides, and Keynote.",
    ],
    faqs: [
      {
        question: "Will each page become its own slide?",
        answer:
          "Yes. Every page in the PDF is converted to a separate slide in the PowerPoint file, maintaining the original page order.",
      },
      {
        question: "Can I edit the slides after conversion?",
        answer:
          "Absolutely. The output is a standard PPTX file. You can move text, replace images, add animations, and apply new themes just like any PowerPoint presentation.",
      },
      {
        question: "What happens to animations or transitions in the PDF?",
        answer:
          "PDF-to-PPT conversion captures the static content of each page. Animations, transitions, and embedded videos from the original PDF are not carried over, but you can add them back in PowerPoint.",
      },
      {
        question: "Can I choose which pages to convert?",
        answer:
          "The tool converts all pages in the PDF by default. If you need only specific pages, use the Extract Pages tool first to create a smaller PDF, then convert that file to PowerPoint.",
      },
    ],
  },

  "ppt-to-pdf": {
    intro:
      "Convert PowerPoint presentations to PDF files for easy sharing, printing, and archiving. When you send a PDF, the recipient sees your slides exactly as intended — no compatibility issues, no missing fonts, and no need for presentation software.",
    howToUse: [
      "Upload your PPTX or PPT file by dragging it into the tool.",
      "Click \"Convert to PDF\" to process each slide.",
      "Download your PDF once the conversion finishes.",
    ],
    features: [
      "Accepts both PPTX and legacy PPT formats.",
      "Preserves slide layouts, images, text, and backgrounds.",
      "Supports batch conversion of up to 10 presentations at once.",
      "Output PDFs print cleanly at any resolution.",
    ],
    faqs: [
      {
        question: "Will speaker notes be included in the PDF?",
        answer:
          "By default, the converter produces a standard PDF of your slides. Speaker notes, animations, and transitions are not included in the PDF output.",
      },
      {
        question: "Can I convert a Google Slides presentation?",
        answer:
          "Yes — first download your Google Slides file as a PPTX (File → Download → Microsoft PowerPoint), then upload the PPTX to this tool.",
      },
      {
        question: "Does the PDF keep my slide aspect ratio?",
        answer:
          "Yes. The converter respects the original slide dimensions, whether you are using widescreen (16:9), standard (4:3), or a custom size.",
      },
      {
        question: "Is there a page limit?",
        answer:
          "There is no strict page limit. The tool handles short decks and long presentations alike. Very large files may take slightly longer to process.",
      },
    ],
  },

  "pdf-to-jpg": {
    intro:
      "Extract pages from a PDF as high-quality JPG images. This is useful when you need to share a single page from a document on social media, embed it in a blog post, or use it in a design project where JPG is the required format.",
    howToUse: [
      "Upload your PDF file by dragging it into the drop zone.",
      "Select which pages to convert, or leave blank for all pages.",
      "Choose a quality preset — Low, High, or Ultra.",
      "Click \"Convert to JPG\" and download your images once processing is complete.",
    ],
    features: [
      "Converts selected pages or all pages of the PDF into separate JPG images.",
      "Three quality presets: Low, High, and Ultra.",
      "Works with single-page and multi-page documents.",
    ],
    faqs: [
      {
        question: "What resolution are the output JPG images?",
        answer:
          "The converter offers three quality presets. Low produces smaller files, High is suitable for most uses, and Ultra provides the highest detail for print or design work.",
      },
      {
        question: "Can I convert just one page from a multi-page PDF?",
        answer:
          "Yes. Use the page selector to choose specific pages before converting. You can enter page numbers or ranges to convert only the pages you need.",
      },
      {
        question: "Is JPG or PNG better for my use case?",
        answer:
          "JPG works best for photographs and complex images where file size matters. If you need transparent backgrounds or crisp text and line art, choose the PDF to PNG tool instead.",
      },
      {
        question: "Will the images look as good as the original PDF?",
        answer:
          "The converter preserves the visual quality of your document. Text-heavy pages render clearly, and images retain their original detail at the selected quality level.",
      },
    ],
  },

  "pdf-to-png": {
    intro:
      "Convert PDF pages into crisp PNG images with transparent background support. PNG is ideal when you need lossless quality for presentations, documentation, or design work where every pixel matters and compression artifacts are unacceptable.",
    howToUse: [
      "Drag your PDF file into the upload area or click to select it.",
      "Select which pages to convert, or leave blank for all pages.",
      "Choose a quality preset — Low, High, or Ultra.",
      "Click \"Convert to PNG\" and download the resulting images.",
    ],
    features: [
      "Produces lossless PNG images that preserve exact text and graphic detail.",
      "Ideal for diagrams, charts, and documents with sharp lines and text.",
      "Three quality presets: Low, High, and Ultra.",
      "Select specific pages or convert all pages.",
    ],
    faqs: [
      {
        question: "When should I choose PNG over JPG?",
        answer:
          "Choose PNG when you need lossless quality, transparent backgrounds, or when the document contains text, line art, or diagrams. JPG is better for photographs where smaller file size is a priority.",
      },
      {
        question: "Can I control the image resolution?",
        answer:
          "Yes. Choose from three quality presets: Low for smaller files, High for general use, and Ultra for maximum detail. Higher settings produce larger, sharper images suitable for print or detailed viewing.",
      },
      {
        question: "Are the PNG files suitable for web use?",
        answer:
          "Absolutely. PNG files are universally supported in web browsers, design tools, and content management systems. They are perfect for embedding in websites and documentation.",
      },
      {
        question: "How is this different from the PDF to JPG tool?",
        answer:
          "PNG uses lossless compression, so there are no quality artifacts. JPG uses lossy compression which reduces file size but may introduce subtle visual degradation. Use PNG for precision, JPG for smaller files.",
      },
    ],
  },

  "images-to-pdf": {
    intro:
      "Combine JPG, PNG, and WebP images into a single PDF document. This is useful for creating photo albums, compiling scanned documents, submitting image portfolios, or packaging multiple images into one shareable file.",
    howToUse: [
      "Upload your images by dragging them into the drop zone — JPG, PNG, and WebP files are all accepted.",
      "Choose a page size (A4, Letter, or Original), fit mode, and margin settings.",
      "Click \"Create PDF\" and download the merged document when it is ready.",
    ],
    features: [
      "Supports JPG, PNG, and WebP image formats.",
      "Upload up to 20 images in a single conversion.",
      "Choose page size: A4, Letter, or Original image dimensions.",
      "Fit options: Fit (contain), Fill (cover), or Stretch to fill the page.",
      "Adjustable margins: None, Small, or Medium.",
    ],
    faqs: [
      {
        question: "How many images can I combine into one PDF?",
        answer:
          "You can upload up to 20 images at once. Each image becomes a separate page in the resulting PDF document.",
      },
      {
        question: "What fit mode should I choose?",
        answer:
          "Fit keeps the entire image visible with possible borders. Fill covers the full page but may crop edges. Stretch distorts the image to fill the page exactly.",
      },
      {
        question: "Can I combine images of different sizes and formats?",
        answer:
          "Yes. You can mix JPG, PNG, and WebP files in a single upload. Each image is placed on its own page regardless of its original dimensions.",
      },
      {
        question: "Can I choose the page size for the output PDF?",
        answer:
          "Yes. Select A4, Letter, or keep the original image dimensions. This lets you match the output to your printing or sharing needs.",
      },
    ],
  },

  "merge-pdf": {
    intro:
      "Combine multiple PDF files into a single document. This is essential when you receive separate PDFs that belong together — invoices and receipts, chapters of a report, or signed pages that need to be joined into one cohesive file.",
    howToUse: [
      "Upload two or more PDF files by dragging them into the drop zone.",
      "Arrange the files in the order you want them to appear in the merged document.",
      "Click \"Merge files\" and download the combined PDF when processing finishes.",
    ],
    features: [
      "Merge up to 20 PDF files in a single operation.",
      "Drag to reorder files before merging.",
      "Preserves the formatting and content of each source file.",
      "Output PDFs open in any standard PDF reader.",
    ],
    faqs: [
      {
        question: "Is there a limit to how many PDFs I can merge?",
        answer:
          "You can merge up to 20 PDF files at once. If you have more, merge them in batches and then merge the resulting files.",
      },
      {
        question: "Will bookmarks and annotations be preserved?",
        answer:
          "The converter preserves the content and formatting of each source PDF. Bookmarks from individual files are not carried into the merged document, but page structure and content remain intact.",
      },
      {
        question: "What happens to the page order?",
        answer:
          "Pages appear in the order you arrange the files in the upload area. You can drag files up or down to control the exact sequence before merging.",
      },
    ],
  },

  "split-pdf": {
    intro:
      "Split a PDF into separate files by page ranges, individual pages, or at regular intervals. This is useful when you only need specific sections of a large document — extracting a chapter, separating signed pages, or dividing a long report for different recipients.",
    howToUse: [
      "Upload your PDF file by dragging it into the drop zone.",
      "Choose a split mode: split every N pages, split by page ranges, or extract all individual pages.",
      "Enter your page ranges if applicable (e.g. 1-5, 8-10).",
      "Click \"Split PDF\" and download the resulting files.",
    ],
    features: [
      "Split by page ranges, every N pages, or extract all pages individually.",
      "Preview page count before splitting.",
      "Supports large documents with hundreds of pages.",
      "Each output file is a valid, standalone PDF.",
    ],
    faqs: [
      {
        question: "Can I split a 100-page PDF into individual pages?",
        answer:
          "Yes. Select the option to extract all pages and each page will become its own separate PDF file.",
      },
      {
        question: "How do I split by page range?",
        answer:
          "Choose the ranges option and enter comma-separated ranges like 1-5, 8-10, 15. Each range becomes a separate PDF file.",
      },
      {
        question: "Can I split a PDF into equal parts?",
        answer:
          "Use the \"every N pages\" option. For example, entering 2 will split the document into files of 2 pages each (except possibly the last file).",
      },
      {
        question: "Will the split files look identical to the original?",
        answer:
          "Yes. Each output PDF retains the exact content, formatting, and layout of the corresponding pages from the original document.",
      },
    ],
  },

  "extract-pages": {
    intro:
      "Pull specific pages out of a PDF without affecting the rest of the document. This is perfect when you need to isolate a single page from a large file — extracting a contract signature page, a specific chart, or a particular section for reference.",
    howToUse: [
      "Upload your PDF file by dragging it into the upload area.",
      "Enter the page numbers or ranges you want to extract (e.g. 3, 7-12).",
      "Click \"Extract pages\" and download the new PDF containing only your selected pages.",
    ],
    features: [
      "Extract any combination of individual pages and page ranges.",
      "The original PDF remains unchanged — extraction creates a new file.",
      "Supports documents of any length.",
      "Output is a clean, standalone PDF with only the pages you selected.",
    ],
    faqs: [
      {
        question: "Does extracting pages modify the original PDF?",
        answer:
          "No. Your original PDF is never altered. The tool creates a new PDF file containing only the pages you selected.",
      },
      {
        question: "Can I extract non-contiguous pages?",
        answer:
          "Yes. Enter page numbers separated by commas, such as 1, 5, 12-15, to extract any combination of pages from the document.",
      },
      {
        question: "How is this different from the Split PDF tool?",
        answer:
          "Extract Pages creates a single output file with your selected pages. Split PDF divides the entire document into multiple files. Use Extract when you want one file with specific pages.",
      },
      {
        question: "Will extracted pages include headers and footers?",
        answer:
          "Yes. Each extracted page retains all its original content including headers, footers, page numbers, images, and text exactly as they appear in the source document.",
      },
    ],
  },

  "reorder-pages": {
    intro:
      "Rearrange the page order of a PDF without any other editing. This is useful when pages arrive out of order from a scanner, when you need to reorganize a document for a presentation, or when combining scanned pages into the correct sequence.",
    howToUse: [
      "Upload your PDF file to the tool.",
      "Enter the pages in your desired order as a comma-separated list (e.g. 3, 1, 2, 5, 4).",
      "Click \"Reorder pages\" to generate the new PDF with updated page sequence.",
    ],
    features: [
      "Enter any page order using comma-separated page numbers.",
      "Works with documents of any page count.",
      "Preserves all content, formatting, and page dimensions.",
      "The original file is not modified.",
    ],
    faqs: [
      {
        question: "Can I reverse the page order?",
        answer:
          'Use the "Reverse" preset to quickly flip the entire document page order without typing each number.',
      },
      {
        question: "Will reordering affect page numbers in the document?",
        answer:
          "The physical page order changes, but any page numbers printed on the pages themselves remain as they were in the original. The tool reorders pages, it does not renumber printed page numbers.",
      },
      {
        question: "Is the original file changed?",
        answer:
          "No. The tool creates a new PDF with the updated page order. Your original file remains untouched.",
      },
      {
        question: "Can I use this to put scanned pages in order?",
        answer:
          "Yes. This is one of the most common uses. Upload your scanned PDF, enter the pages in the correct sequence, and download the reorganized file.",
      },
    ],
  },

  "duplicate-pages": {
    intro:
      "Duplicate specific pages within a PDF document. This is useful when you need repeated copies of a particular page — printing multiple copies of a form, repeating an informational page in different sections, or creating backup copies of an important page within a document.",
    howToUse: [
      "Upload your PDF file to the tool.",
      "Enter the pages you want to duplicate using page numbers or ranges (e.g. 1-3, 5, 7).",
      "Choose how many copies of each selected page to create.",
      "Click \"Duplicate pages\" and download the modified PDF.",
    ],
    features: [
      "Select individual pages, multiple pages, or page ranges to duplicate.",
      "Choose exactly how many copies of the selected pages to insert.",
      "Duplicated pages appear immediately after the originals.",
      "All content and formatting are preserved in each copy.",
    ],
    faqs: [
      {
        question: "Where do the duplicated pages appear?",
        answer:
          "Each duplicated page is inserted immediately after the original page in the document.",
      },
      {
        question: "Can I duplicate multiple different pages at once?",
        answer:
          "Yes. Enter multiple page numbers or ranges separated by commas, such as 1-3, 5, 7, and all selected pages will be duplicated together.",
      },
      {
        question: "Will page numbers be updated after duplication?",
        answer:
          "The tool does not modify printed page numbers within the document. If your PDF has manually typed page numbers, they will not be automatically updated.",
      },
      {
        question: "Can I duplicate the first and last pages?",
        answer:
          "Yes. You can duplicate any page or combination of pages in the document by entering their page numbers.",
      },
    ],
  },

  "rotate-pdf": {
    intro:
      "Fix the orientation of PDF pages that are sideways or upside down. This commonly happens when scanning documents or when PDFs are created from mobile phone photos. Rotating pages ensures your document reads correctly without tilting your head or rotating your screen.",
    howToUse: [
      "Upload your PDF file by dragging it into the tool.",
      "Select the rotation angle for your pages — 90°, 180°, or 270°.",
      "Click \"Rotate pages\" and download the corrected PDF.",
    ],
    features: [
      "Rotate all pages or select specific pages to rotate.",
      "Choose 90°, 180°, or 270° rotation.",
      "Preserves all content and formatting after rotation.",
    ],
    faqs: [
      {
        question: "Can I rotate only some pages and not others?",
        answer:
          "Yes. The tool lets you select which pages to rotate, so you can fix orientation issues on specific pages without affecting the rest of the document.",
      },
      {
        question: "What if some pages have different orientations?",
        answer:
          "You can rotate each page individually to the correct orientation. This is common with scanned documents where some pages were fed through the scanner differently.",
      },
      {
        question: "Will rotating change the PDF file size?",
        answer:
          "Rotation does not meaningfully change file size. The content remains identical — only the display orientation is updated.",
      },
      {
        question: "Can I rotate pages from a scanned document?",
        answer:
          "Yes. This is one of the most common use cases. Scanned documents often arrive with incorrect orientation, and this tool fixes that quickly.",
      },
    ],
  },

  "delete-pages": {
    intro:
      "Remove unwanted pages from a PDF document. Whether you need to strip out blank pages, remove a cover sheet, delete confidential sections, or trim a document down to its essential parts, this tool lets you select and remove pages without affecting the rest of the file.",
    howToUse: [
      "Upload your PDF file to the tool.",
      "Enter the page numbers or ranges you want to delete (e.g. 1, 5-8).",
      "Click \"Delete pages\" and download the shortened PDF.",
    ],
    features: [
      "Delete individual pages or entire page ranges at once.",
      "The original PDF is not modified — a new file is created.",
      "Works with documents of any size.",
    ],
    faqs: [
      {
        question: "Can I delete multiple non-contiguous pages?",
        answer:
          "Yes. Enter page numbers separated by commas, such as 1, 5, 12-15, to delete any combination of pages in a single operation.",
      },
      {
        question: "Does this change the file size?",
        answer:
          "Yes, removing pages reduces the file size proportionally. The resulting PDF contains only the pages you chose to keep.",
      },
      {
        question: "Can I undo the deletion?",
        answer:
          "The original PDF is preserved and not modified. If you need the deleted pages back, simply re-upload the original file.",
      },
      {
        question: "Can I delete the last page of a PDF?",
        answer:
          "Yes. Enter the total page count (or the page number of the last page) to remove it.",
      },
    ],
  },

  "compress-pdf": {
    intro:
      "Reduce the file size of your PDF without noticeably affecting quality. This is essential when you need to email a large document, upload a file to a portal with size limits, or store PDFs more efficiently without sacrificing readability.",
    howToUse: [
      "Upload your PDF file by dragging it into the drop zone.",
      "Choose a compression level — maximum compression for the smallest size, balanced for a good mix, or maximum quality to preserve metadata.",
      "Click \"Compress PDF\" and download the smaller file when processing finishes.",
    ],
    features: [
      "Three compression levels to balance file size and quality.",
      "Maximum compression produces the smallest file with some quality trade-off.",
      "Balanced mode preserves good visual quality with meaningful size reduction.",
      "Maximum quality mode reduces size while retaining all metadata.",
    ],
    faqs: [
      {
        question: "How much smaller will my PDF be after compression?",
        answer:
          "It depends on the original content. PDFs with large images typically see the most reduction. Text-heavy documents compress less but still benefit from metadata cleanup.",
      },
      {
        question: "Will compression reduce the visual quality?",
        answer:
          "At balanced and maximum quality settings, visual quality differences are imperceptible for most documents. Maximum compression may show slight quality reduction on image-heavy pages.",
      },
      {
        question: "What is the difference between the three compression levels?",
        answer:
          "Maximum compression produces the smallest file with some quality trade-off. Balanced offers a good middle ground. Maximum quality preserves metadata and highest visual fidelity with a smaller size reduction.",
      },
    ],
  },

  "ocr-pdf": {
    intro:
      "Extract text from scanned PDF documents and image-based files using optical character recognition. This makes scanned documents searchable and allows you to copy, edit, and work with text that was previously locked inside images.",
    howToUse: [
      "Upload your scanned PDF or image-based document.",
      "Click \"Extract text\" and wait while the OCR engine processes each page.",
      "Download the resulting PDF with an embedded searchable text layer.",
    ],
    features: [
      "Adds a searchable text layer to scanned documents.",
      "Extracted text can be selected, copied, and searched in any PDF reader.",
      "Works with documents of any page count.",
      "Preserves the original visual appearance of the scanned pages.",
    ],
    faqs: [
      {
        question: "What types of documents can OCR process?",
        answer:
          "OCR works on scanned documents, photos of text, and any PDF where the content is an image rather than selectable text. It reads printed English text from clear, well-scanned documents.",
      },
      {
        question: "Will the OCR be 100% accurate?",
        answer:
          "OCR accuracy depends on scan quality, font clarity, and document condition. Clear, well-scanned documents with standard fonts produce the best results. Handwritten text is not supported.",
      },
      {
        question: "Can I then convert the OCR'd PDF to Word?",
        answer:
          "Yes. Once the text layer is added, use the Docvanta PDF to Word tool to convert the document into an editable Word file.",
      },
      {
        question: "Does OCR change how the document looks?",
        answer:
          "No. The original scan remains visually identical. The text layer is added invisibly underneath, making the text searchable and selectable without altering the appearance.",
      },
    ],
  },
};
