export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  href: string;
  accept: string;
  maxFiles?: number;
  /** Primary action button label. E.g. "Convert to Word", "Compress PDF", "Merge files" */
  actionLabel: string;
  /** Whether this tool has configurable options that should appear in a sidebar panel */
  hasOptions?: boolean;
}

export type ToolCategory =
  | "convert"
  | "organize"
  | "optimize";

export interface Category {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
}

export const categories: Category[] = [
  {
    id: "convert",
    name: "Convert",
    description: "Transform your documents between different formats",
    icon: "arrows-right-left",
  },
  {
    id: "organize",
    name: "Organize PDF",
    description: "Manage, merge, split, and reorder pages",
    icon: "folder-open",
  },
  {
    id: "optimize",
    name: "Optimize",
    description: "Compress, protect, and optimize documents",
    icon: "chart-bar",
  },
];

export const tools: Tool[] = [
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    category: "convert",
    icon: "document-arrow-right",
    href: "/pdf-to-word",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Convert to Word",
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert Word documents to PDF format",
    category: "convert",
    icon: "document-arrow-right",
    href: "/word-to-pdf",
    accept: ".doc,.docx",
    maxFiles: 10,
    actionLabel: "Convert to PDF",
  },
  {
    id: "pdf-to-ppt",
    name: "PDF to PowerPoint",
    description: "Convert PDF presentations to PPT slides",
    category: "convert",
    icon: "presentation-chart-line",
    href: "/pdf-to-ppt",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Convert to PowerPoint",
  },
  {
    id: "ppt-to-pdf",
    name: "PowerPoint to PDF",
    description: "Convert PowerPoint presentations to PDF format",
    category: "convert",
    icon: "presentation-chart-line",
    href: "/ppt-to-pdf",
    accept: ".ppt,.pptx",
    maxFiles: 10,
    actionLabel: "Convert to PDF",
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Convert PDF pages to high-quality JPG images",
    category: "convert",
    icon: "photo",
    href: "/pdf-to-jpg",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Convert to JPG",
    hasOptions: true,
  },
  {
    id: "pdf-to-png",
    name: "PDF to PNG",
    description: "Convert PDF pages to high-quality PNG images",
    category: "convert",
    icon: "photo",
    href: "/pdf-to-png",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Convert to PNG",
    hasOptions: true,
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Convert JPG, PNG, and WebP images to PDF documents",
    category: "convert",
    icon: "photo",
    href: "/images-to-pdf",
    accept: ".jpg,.jpeg,.png,.webp",
    maxFiles: 20,
    actionLabel: "Create PDF",
    hasOptions: true,
  },
  {
    id: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDF files into one document",
    category: "organize",
    icon: "document-duplicate",
    href: "/merge-pdf",
    accept: ".pdf",
    maxFiles: 20,
    actionLabel: "Merge files",
  },
  {
    id: "split-pdf",
    name: "Split PDF",
    description: "Separate a PDF into individual pages or ranges",
    category: "organize",
    icon: "scissors",
    href: "/split-pdf",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Split PDF",
    hasOptions: true,
  },
  {
    id: "extract-pages",
    name: "Extract Pages",
    description: "Extract specific pages from a PDF document",
    category: "organize",
    icon: "document-arrow-right",
    href: "/extract-pages",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Extract pages",
    hasOptions: true,
  },
  {
    id: "reorder-pages",
    name: "Reorder Pages",
    description: "Change the order of pages in a PDF document",
    category: "organize",
    icon: "arrows-right-left",
    href: "/reorder-pages",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Reorder pages",
    hasOptions: true,
  },
  {
    id: "duplicate-pages",
    name: "Duplicate Pages",
    description: "Duplicate specific pages within a PDF document",
    category: "organize",
    icon: "document-duplicate",
    href: "/duplicate-pages",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Duplicate pages",
    hasOptions: true,
  },
  {
    id: "rotate-pdf",
    name: "Rotate PDF",
    description: "Rotate PDF pages to the correct orientation",
    category: "organize",
    icon: "arrow-path",
    href: "/rotate-pdf",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Rotate pages",
    hasOptions: true,
  },
  {
    id: "delete-pages",
    name: "Delete Pages",
    description: "Remove specific pages from a PDF document",
    category: "organize",
    icon: "trash",
    href: "/delete-pages",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Delete pages",
    hasOptions: true,
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce PDF file size while preserving useful quality",
    category: "optimize",
    icon: "arrow-down",
    href: "/compress-pdf",
    accept: ".pdf",
    maxFiles: 10,
    actionLabel: "Compress PDF",
    hasOptions: true,
  },
  {
    id: "ocr-pdf",
    name: "OCR PDF",
    description: "Extract text from scanned PDF documents",
    category: "optimize",
    icon: "document-text",
    href: "/ocr-pdf",
    accept: ".pdf",
    maxFiles: 1,
    actionLabel: "Extract text",
  },
];

export const popularTools = tools.filter((tool) =>
  ["images-to-pdf", "pdf-to-word", "merge-pdf", "compress-pdf", "pdf-to-jpg", "ocr-pdf", "word-to-pdf", "ppt-to-pdf"].includes(tool.id)
);

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((tool) => tool.category === category);
}

export function getToolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}
