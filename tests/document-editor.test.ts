// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { exportDocx } from "../lib/editor/docx-io";
import { exportPdf } from "../lib/editor/pdf-export";

describe("DOCX export", () => {
  it("exports simple HTML to DOCX", async () => {
    const html = "<p>Hello World</p>";
    const result = await exportDocx(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    const header = String.fromCharCode(...result.slice(0, 4));
    expect(header).toBe("PK\u0003\u0004");
  });

  it("exports heading content to DOCX", async () => {
    const html = "<h1>Title</h1><p>Body text</p>";
    const result = await exportDocx(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports with custom title", async () => {
    const html = "<p>Content</p>";
    const result = await exportDocx(html, { title: "My Doc", author: "Test" });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports table content", async () => {
    const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
    const result = await exportDocx(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports bullet list", async () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const result = await exportDocx(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports empty document", async () => {
    const html = "";
    const result = await exportDocx(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports multi-level headings", async () => {
    const html = "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>";
    const result = await exportDocx(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("PDF export", () => {
  it("exports simple HTML to PDF", async () => {
    const html = "<p>Hello World</p>";
    const result = await exportPdf(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    const header = String.fromCharCode(...result.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("exports heading content to PDF", async () => {
    const html = "<h1>Title</h1><p>Body text</p>";
    const result = await exportPdf(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports with letter page size", async () => {
    const html = "<p>Content</p>";
    const result = await exportPdf(html, { pageSize: "letter" });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports with legal page size", async () => {
    const html = "<p>Content</p>";
    const result = await exportPdf(html, { pageSize: "legal" });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports with custom margins", async () => {
    const html = "<p>Content</p>";
    const result = await exportPdf(html, {
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
    });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports bold and italic text", async () => {
    const html = "<p><b>Bold</b> and <i>italic</i> text</p>";
    const result = await exportPdf(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports multiple paragraphs", async () => {
    const html = "<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>";
    const result = await exportPdf(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports empty document", async () => {
    const html = "";
    const result = await exportPdf(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles long text that wraps", async () => {
    const longText = "This is a very long paragraph that should wrap across multiple lines in the PDF output. ".repeat(20);
    const html = `<p>${longText}</p>`;
    const result = await exportPdf(html);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });
});
