export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  href: string;
  accept: string;
  maxFiles?: number;
}

export type ToolCategory =
  | "convert"
  | "edit"
  | "organize"
  | "optimize"
  | "ocr"
  | "share";

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
    id: "edit",
    name: "Edit",
    description: "Modify and annotate your PDF documents",
    icon: "pencil",
  },
  {
    id: "organize",
    name: "Organize",
    description: "Manage, merge, split, and reorder pages",
    icon: "folder-open",
  },
  {
    id: "optimize",
    name: "Optimize",
    description: "Compress and optimize documents for web",
    icon: "chart-bar",
  },
  {
    id: "ocr",
    name: "OCR",
    description: "Extract and work with text from PDF documents",
    icon: "document-text",
  },
  {
    id: "share",
    name: "Share",
    description: "Protect and share your documents securely",
    icon: "arrow-up-tray",
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
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Convert PDF documents to editable Excel spreadsheets",
    category: "convert",
    icon: "table-cells",
    href: "/pdf-to-excel",
    accept: ".pdf",
    maxFiles: 1,
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert Excel spreadsheets to PDF format",
    category: "convert",
    icon: "table-cells",
    href: "/excel-to-pdf",
    accept: ".xls,.xlsx",
    maxFiles: 10,
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
  },
  {
    id: "delete-pages",
    name: "Delete Pages",
    description: "Remove specific pages from a PDF document",
    category: "edit",
    icon: "trash",
    href: "/delete-pages",
    accept: ".pdf",
    maxFiles: 1,
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    description: "Optimize PDF files by removing metadata and applying compression settings",
    category: "optimize",
    icon: "arrow-down",
    href: "/compress-pdf",
    accept: ".pdf",
    maxFiles: 10,
  },
  {
    id: "ocr-pdf",
    name: "OCR PDF",
    description: "Extract embedded text layers from PDF documents",
    category: "ocr",
    icon: "document-text",
    href: "/ocr-pdf",
    accept: ".pdf",
    maxFiles: 1,
  },
  {
    id: "protect-pdf",
    name: "Protect PDF",
    description: "Add password protection to your PDF files",
    category: "share",
    icon: "lock-closed",
    href: "/protect-pdf",
    accept: ".pdf",
    maxFiles: 1,
  },
  {
    id: "spreadsheet",
    name: "Spreadsheet Editor",
    description: "Edit XLSX files online with a full-featured spreadsheet editor",
    category: "edit",
    icon: "table-cells",
    href: "/spreadsheet",
    accept: ".xlsx,.xls",
    maxFiles: 1,
  },
  {
    id: "presentation",
    name: "Presentation Editor",
    description: "Create and edit PowerPoint presentations in your browser",
    category: "edit",
    icon: "presentation-chart-line",
    href: "/presentation",
    accept: ".pptx,.ppt",
    maxFiles: 1,
  },
];

export const popularTools = tools.filter((tool) =>
  ["images-to-pdf", "pdf-to-word", "merge-pdf", "compress-pdf", "pdf-to-jpg", "ocr-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"].includes(tool.id)
);

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((tool) => tool.category === category);
}

export function getToolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}
