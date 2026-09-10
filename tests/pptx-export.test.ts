import { describe, it, expect } from "vitest";
import { exportToPptx } from "../lib/presentation/export";
import type { Presentation, Slide, TextObject } from "../lib/presentation/types";

function makeSlide(text = "Hello"): Slide {
  return {
    id: "slide-1",
    order: 0,
    layout: "blank",
    background: "#ffffff",
    objects: [
      {
        id: "obj-1",
        type: "text",
        x: 100,
        y: 100,
        width: 400,
        height: 50,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        text,
        fontSize: 24,
        fontFamily: "Arial",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        textAlign: "left" as const,
        color: "#000000",
        lineHeight: 1.2,
        data: { editing: false },
      } as TextObject,
    ],
    transition: { type: "none", duration: 0 },
    notes: { text: "" },
  };
}

function makePresentation(slides: Slide[]): Presentation {
  return {
    id: "test",
    title: "Test Presentation",
    description: "Test",
    slides,
    theme: {
      id: "default",
      name: "Default",
      colors: {
        primary: "#0066cc",
        secondary: "#666666",
        accent: "#0066cc",
        background: "#ffffff",
        text: "#000000",
        textLight: "#666666",
        border: "#e0e0e0",
      },
      fonts: {
        heading: "Arial",
        body: "Arial",
        mono: "Courier New",
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    fileSize: 0,
    format: "pptx",
  };
}

describe("exportToPptx", () => {
  it("returns a Blob with correct MIME type", () => {
    const pres = makePresentation([makeSlide()]);
    const blob = exportToPptx(pres);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
  });

  it("produces valid zip structure with required files", async () => {
    const pres = makePresentation([makeSlide("Slide 1"), makeSlide("Slide 2")]);
    const blob = exportToPptx(pres);

    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Check for PK zip signature (first 2 bytes: 0x50, 0x4B)
    expect(uint8[0]).toBe(0x50);
    expect(uint8[1]).toBe(0x4b);

    const text = new TextDecoder().decode(uint8);

    // Must contain Content_Types
    expect(text).toContain("[Content_Types].xml");
    // Must contain presentation.xml
    expect(text).toContain("ppt/presentation.xml");
    // Must contain slide files
    expect(text).toContain("ppt/slides/slide1.xml");
    expect(text).toContain("ppt/slides/slide2.xml");
    // Must contain core metadata
    expect(text).toContain("docProps/core.xml");
  });

  it("does not produce concatenated XML documents", async () => {
    const pres = makePresentation([makeSlide()]);
    const blob = exportToPptx(pres);
    const text = new TextDecoder().decode(await blob.arrayBuffer());

    // The old bug: XML docs were concatenated with "# Relationships" markers
    expect(text).not.toContain("# Relationships");
    expect(text).not.toContain("# Presentation");
  });
});
