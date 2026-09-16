# Docvanta

Free online document tools — convert, edit, merge, compress, and share PDF files. No signup required. No watermarks. No AI processing.

## Features

- **PDF Operations:** Merge, split, compress, rotate, reorder, delete/duplicate pages, protect with password
- **PDF Conversion:** PDF to Word, Excel, PowerPoint, JPG, PNG; Office documents to PDF
- **OCR:** Extract text from existing PDF text layers
- **Images to PDF:** Convert multiple images into a single PDF
- **Document Editor:** Rich text editor with export to DOCX

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- pdf-lib, pdfjs-dist, mammoth, docx, xlsx, pptxgenjs

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run test suite |
| `npm run typecheck` | TypeScript type checking |

## Environment Variables

All optional — the application works with zero configuration.

| Variable | Default | Description |
|----------|---------|-------------|
| `TEMP_DIR` | `{cwd}/.tmp` | Temporary file storage directory |
| `MAX_FILE_SIZE` | `104857600` (100MB) | Maximum upload size in bytes |
| `MAX_CONCURRENT_JOBS` | `4` | Maximum parallel processing slots |
| `RATE_LIMIT_HEAVY_MAX` | `10` | Requests per minute for heavy tools |
| `RATE_LIMIT_NORMAL_MAX` | `15` | Requests per minute for normal tools |
| `RATE_LIMIT_DEFAULT_MAX` | `20` | Default rate limit |
| `RATE_LIMIT_DOWNLOAD_MAX` | `60` | Download rate limit |
| `RATE_LIMIT_JOB_STATUS_MAX` | `30` | Job status check rate limit |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `NEXT_PUBLIC_SITE_URL` | `https://docvanta.onrender.com` | Canonical site URL for SEO |

## Optional Dependencies

- **qpdf** — Required for PDF password protection (protect-pdf tool)
- **LibreOffice** — Required for office format conversion (DOCX/XLSX/PPTX to/from PDF)

Without these, the application starts safely and affected tools return clear error messages.

## Deployment

### Requirements

- Node.js 18+
- Writable filesystem (for `.tmp/` directory)
- Long-running Node process (in-memory job state)
- Subprocess support (if qpdf/LibreOffice are installed)

### Architecture

- **Single-instance** — job state and rate limits are in-memory
- **No database** — files are temporary, jobs auto-expire
- **No API keys required** — all processing is local

### Production Start

```bash
npm install
npm run build
npm run start
```

The server starts on port 3000 by default. Override with `PORT` environment variable.

## License

Private — all rights reserved.
