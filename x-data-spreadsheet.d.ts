declare module "x-data-spreadsheet/dist/xspreadsheet.js" {
  class Spreadsheet {
    constructor(el: HTMLElement, options?: Record<string, unknown>);
    loadData(data: unknown): void;
    getData(): unknown;
    change(cb: (data: unknown) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
    bold(): void;
    italic(): void;
    underline(): void;
    strike(): void;
    align(alignment: string): void;
    fontName(name: string): void;
    fontSize(size: number): void;
    toggle(type: string): void;
    [key: string]: unknown;
  }
  export default Spreadsheet;
}
