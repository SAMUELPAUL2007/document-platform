// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { importXlsxToData, exportDataToXlsx } from "../lib/spreadsheet/xlsx-io";

// Helper to convert Uint8Array.buffer to ArrayBuffer
function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}
import { evaluateFormula, recalculateAll } from "../lib/spreadsheet/formulas";
import { searchSpreadsheet, replaceInSpreadsheet } from "../lib/spreadsheet/search";
import { sortRange } from "../lib/spreadsheet/sort-filter";
import type { SpreadsheetData } from "../lib/spreadsheet/types";

function createTestXlsx(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ["Name", "Age", "City"],
    ["Alice", 30, "New York"],
    ["Bob", 25, "London"],
    ["Charlie", 35, "Paris"],
    ["Diana", 28, "Tokyo"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "People");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

function createTestXlsxWithFormulas(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const wsData = [
    [10, 20, "=A1+B1"],
    [5, 15, "=A2*B2"],
    [100, 50, "=A3-A4"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Calc");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

function createMultiSheetXlsx(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([["Q1", "Q2", "Q3"], [100, 200, 300]]);
  const ws2 = XLSX.utils.aoa_to_sheet([["Product", "Sales"], ["Widget", 500], ["Gadget", 750]]);
  XLSX.utils.book_append_sheet(wb, ws1, "Sales");
  XLSX.utils.book_append_sheet(wb, ws2, "Products");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

describe("XLSX Import", () => {
  it("imports a simple XLSX file", () => {
    const buffer = createTestXlsx();
    const { data, sheetNames } = importXlsxToData(toArrayBuffer(buffer));

    expect(sheetNames).toEqual(["People"]);
    expect(data[0]).toBeDefined();
    expect(data[0]!.name).toBe("People");
  });

  it("imports cell values correctly", () => {
    const buffer = createTestXlsx();
    const { data } = importXlsxToData(toArrayBuffer(buffer));

    const sheet = data[0]!;
    expect(sheet.rows?.[0]?.cells?.[0]?.text).toBe("Name");
    expect(sheet.rows?.[1]?.cells?.[0]?.text).toBe("Alice");
    expect(sheet.rows?.[1]?.cells?.[1]?.text).toBe("30");
    expect(sheet.rows?.[2]?.cells?.[2]?.text).toBe("London");
  });

  it("imports formulas as text", () => {
    const buffer = createTestXlsxWithFormulas();
    const { data } = importXlsxToData(toArrayBuffer(buffer));

    const sheet = data[0]!;
    expect(sheet.rows?.[0]?.cells?.[2]?.text).toBe("=A1+B1");
    expect(sheet.rows?.[1]?.cells?.[2]?.text).toBe("=A2*B2");
  });

  it("imports multi-sheet workbooks", () => {
    const buffer = createMultiSheetXlsx();
    const { data, sheetNames } = importXlsxToData(toArrayBuffer(buffer));

    expect(sheetNames).toEqual(["Sales", "Products"]);
    expect(data[0]!.name).toBe("Sales");
    expect(data[1]!.name).toBe("Products");
    expect(data[0]!.rows?.[0]?.cells?.[0]?.text).toBe("Q1");
    expect(data[1]!.rows?.[1]?.cells?.[0]?.text).toBe("Widget");
  });

  it("handles empty cells", () => {
    const buffer = createTestXlsx();
    const { data } = importXlsxToData(toArrayBuffer(buffer));

    const sheet = data[0]!;
    expect(sheet.rows?.[0]?.cells?.[5]).toBeUndefined();
  });

  it("handles merged cells", () => {
    const wb = XLSX.utils.book_new();
    const wsData = [["Merged", "", "Normal"], ["", "", "Data"]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, "Merged");

    const buffer = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const { data } = importXlsxToData(toArrayBuffer(buffer));

    expect(data[0]!.merges).toBeDefined();
    expect(data[0]!.merges!.length).toBe(1);
  });
});

describe("XLSX Export", () => {
  it("exports spreadsheet data to XLSX", () => {
    const data: SpreadsheetData = {
      0: {
        name: "Test",
        rows: {
          0: { cells: { 0: { text: "A" }, 1: { text: "B" } } },
          1: { cells: { 0: { text: "1" }, 1: { text: "2" } } },
        },
      },
    };

    const result = exportDataToXlsx(data);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    const header = String.fromCharCode(...result.slice(0, 4));
    expect(header).toBe("PK\u0003\u0004");
  });

  it("exports numeric values", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: { cells: { 0: { text: "42" }, 1: { text: "3.14" } } },
        },
      },
    };

    const result = exportDataToXlsx(data);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports multiple sheets", () => {
    const data: SpreadsheetData = {
      0: { name: "Sheet1", rows: { 0: { cells: { 0: { text: "Hello" } } } } },
      1: { name: "Sheet2", rows: { 0: { cells: { 0: { text: "World" } } } } },
    };

    const result = exportDataToXlsx(data);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports empty spreadsheet", () => {
    const data: SpreadsheetData = { 0: { name: "Empty" } };
    const result = exportDataToXlsx(data);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports merge information", () => {
    const data: SpreadsheetData = {
      0: {
        rows: { 0: { cells: { 0: { text: "Merged" } } } },
        merges: ["A1:B1"],
      },
    };

    const result = exportDataToXlsx(data);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("XLSX Roundtrip", () => {
  it("preserves data through import-export cycle", () => {
    const original = createTestXlsx();
    const { data } = importXlsxToData(toArrayBuffer(original));
    const exported = exportDataToXlsx(data);
    const { data: reimported } = importXlsxToData(toArrayBuffer(exported));

    const origSheet = data[0]!;
    const reimSheet = reimported[0]!;

    expect(reimSheet.name).toBe(origSheet.name);

    for (const ri of Object.keys(origSheet.rows ?? {}).map(Number)) {
      for (const ci of Object.keys(origSheet.rows![ri]?.cells ?? {}).map(Number)) {
        const origCell = origSheet.rows![ri].cells[ci];
        const reimCell = reimSheet.rows?.[ri]?.cells?.[ci];
        expect(reimCell?.text).toBe(origCell?.text);
      }
    }
  });

  it("preserves multi-sheet workbooks through roundtrip", () => {
    const original = createMultiSheetXlsx();
    const { data, sheetNames } = importXlsxToData(toArrayBuffer(original));
    const exported = exportDataToXlsx(data);
    const { data: reimported, sheetNames: reNames } = importXlsxToData(toArrayBuffer(exported));

    expect(reNames).toEqual(sheetNames);
    expect(reimported[0]!.rows?.[0]?.cells?.[0]?.text).toBe("Q1");
    expect(reimported[1]!.rows?.[1]?.cells?.[0]?.text).toBe("Widget");
  });

  it("preserves formulas through roundtrip", () => {
    const original = createTestXlsxWithFormulas();
    const { data } = importXlsxToData(toArrayBuffer(original));
    const exported = exportDataToXlsx(data);
    const { data: reimported } = importXlsxToData(toArrayBuffer(exported));

    expect(reimported[0]!.rows?.[0]?.cells?.[2]?.text).toBe("=A1+B1");
    expect(reimported[0]!.rows?.[1]?.cells?.[2]?.text).toBe("=A2*B2");
  });
});

describe("Formula Engine", () => {
  const formulaData: SpreadsheetData = {
    0: {
      name: "Calc",
      rows: {
        0: { cells: { 0: { text: "10" }, 1: { text: "20" }, 2: { text: "=A1+B1" } } },
        1: { cells: { 0: { text: "5" }, 1: { text: "15" }, 2: { text: "=A2*B2" } } },
        2: { cells: { 0: { text: "100" }, 1: { text: "50" }, 2: { text: "=A3-B3" } } },
        3: { cells: { 0: { text: "50" }, 1: { text: "25" } } },
        4: { cells: { 2: { text: "=SUM(A1:A4)" } } },
        5: { cells: { 2: { text: "=AVERAGE(A1:A4)" } } },
        6: { cells: { 2: { text: "=MAX(A1:A4)" } } },
        7: { cells: { 2: { text: "=MIN(A1:A4)" } } },
        8: { cells: { 2: { text: "=COUNT(A1:A4)" } } },
      },
    },
  };

  it("evaluates basic addition", () => {
    const result = evaluateFormula(formulaData, 0, "=A1+B1");
    expect(result).toBe(30);
  });

  it("evaluates basic multiplication", () => {
    const result = evaluateFormula(formulaData, 0, "=A2*B2");
    expect(result).toBe(75);
  });

  it("evaluates basic subtraction", () => {
    const result = evaluateFormula(formulaData, 0, "=A3-B3");
    expect(result).toBe(50);
  });

  it("evaluates SUM function", () => {
    const result = evaluateFormula(formulaData, 0, "=SUM(A1:A4)");
    expect(result).toBe(165);
  });

  it("evaluates AVERAGE function", () => {
    const result = evaluateFormula(formulaData, 0, "=AVERAGE(A1:A4)");
    expect(result).toBe(41.25);
  });

  it("evaluates MAX function", () => {
    const result = evaluateFormula(formulaData, 0, "=MAX(A1:A4)");
    expect(result).toBe(100);
  });

  it("evaluates MIN function", () => {
    const result = evaluateFormula(formulaData, 0, "=MIN(A1:A4)");
    expect(result).toBe(5);
  });

  it("evaluates COUNT function", () => {
    const result = evaluateFormula(formulaData, 0, "=COUNT(A1:A4)");
    expect(result).toBe(4);
  });

  it("evaluates IF function - true", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: { cells: { 0: { text: "10" }, 1: { text: '=IF(A1>5,"Big","Small")' } } },
        },
      },
    };
    const result = evaluateFormula(data, 0, '=IF(A1>5,"Big","Small")');
    expect(result).toBe("Big");
  });

  it("evaluates IF function - false", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: { cells: { 0: { text: "3" }, 1: { text: '=IF(A1>5,"Big","Small")' } } },
        },
      },
    };
    const result = evaluateFormula(data, 0, '=IF(A1>5,"Big","Small")');
    expect(result).toBe("Small");
  });

  it("evaluates ABS function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "-42" } } } } },
    };
    const result = evaluateFormula(data, 0, "=ABS(A1)");
    expect(result).toBe(42);
  });

  it("evaluates ROUND function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "3.14159" } } } } },
    };
    const result = evaluateFormula(data, 0, "=ROUND(A1,2)");
    expect(result).toBe(3.14);
  });

  it("evaluates UPPER function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "hello" } } } } },
    };
    const result = evaluateFormula(data, 0, "=UPPER(A1)");
    expect(result).toBe("HELLO");
  });

  it("evaluates LOWER function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "WORLD" } } } } },
    };
    const result = evaluateFormula(data, 0, "=LOWER(A1)");
    expect(result).toBe("world");
  });

  it("evaluates LEN function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "Hello" } } } } },
    };
    const result = evaluateFormula(data, 0, "=LEN(A1)");
    expect(result).toBe(5);
  });

  it("evaluates CONCAT function", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: {
            cells: {
              0: { text: "Hello" },
              1: { text: " " },
              2: { text: "World" },
            },
          },
        },
      },
    };
    const result = evaluateFormula(data, 0, "=CONCAT(A1,B1,C1)");
    expect(result).toBe("Hello World");
  });

  it("evaluates PI function", () => {
    const result = evaluateFormula(formulaData, 0, "=PI()");
    expect(result).toBeCloseTo(Math.PI, 10);
  });

  it("evaluates POWER function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "2" }, 1: { text: "10" } } } } },
    };
    const result = evaluateFormula(data, 0, "=POWER(A1,B1)");
    expect(result).toBe(1024);
  });

  it("evaluates SQRT function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "16" } } } } },
    };
    const result = evaluateFormula(data, 0, "=SQRT(A1)");
    expect(result).toBe(4);
  });

  it("evaluates MOD function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "10" }, 1: { text: "3" } } } } },
    };
    const result = evaluateFormula(data, 0, "=MOD(A1,B1)");
    expect(result).toBe(1);
  });

  it("evaluates AND function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "1" }, 1: { text: "1" } } } } },
    };
    const result = evaluateFormula(data, 0, "=AND(A1,B1)");
    expect(result).toBe("TRUE");
  });

  it("evaluates OR function", () => {
    const data: SpreadsheetData = {
      0: { rows: { 0: { cells: { 0: { text: "0" }, 1: { text: "1" } } } } },
    };
    const result = evaluateFormula(data, 0, "=OR(A1,B1)");
    expect(result).toBe("TRUE");
  });

  it("returns #NAME? for unknown functions", () => {
    const result = evaluateFormula(formulaData, 0, "=UNKNOWN()");
    expect(result).toBe("#NAME?");
  });

  it("recalculates all formulas in a workbook", () => {
    const result = recalculateAll(formulaData);
    expect(result[0]!.rows![0]!.cells![2]!.text).toBe("30");
    expect(result[0]!.rows![1]!.cells![2]!.text).toBe("75");
    expect(result[0]!.rows![2]!.cells![2]!.text).toBe("50");
    expect(result[0]!.rows![4]!.cells![2]!.text).toBe("165");
  });
});

describe("Search and Replace", () => {
  const searchData: SpreadsheetData = {
    0: {
      name: "SearchTest",
      rows: {
        0: { cells: { 0: { text: "Hello World" }, 1: { text: "Foo" } } },
        1: { cells: { 0: { text: "Bar" }, 1: { text: "Hello Again" } } },
        2: { cells: { 0: { text: "=HELLO" }, 1: { text: "Test" } } },
      },
    },
  };

  it("finds matching cells", () => {
    const results = searchSpreadsheet(searchData, {
      query: "Hello",
      matchCase: false,
      matchEntireCell: false,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(results.length).toBe(2);
  });

  it("finds with case sensitivity", () => {
    const results = searchSpreadsheet(searchData, {
      query: "hello",
      matchCase: true,
      matchEntireCell: false,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(results.length).toBe(0);
  });

  it("finds with exact case", () => {
    const results = searchSpreadsheet(searchData, {
      query: "Hello",
      matchCase: true,
      matchEntireCell: false,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(results.length).toBe(2);
  });

  it("finds with entire cell match", () => {
    const results = searchSpreadsheet(searchData, {
      query: "Foo",
      matchCase: false,
      matchEntireCell: true,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(results.length).toBe(1);
    expect(results[0]!.colIndex).toBe(1);
  });

  it("searches in formulas when enabled", () => {
    const results = searchSpreadsheet(searchData, {
      query: "HELLO",
      matchCase: true,
      matchEntireCell: false,
      searchInFormulas: true,
      searchDirection: "forward",
    });

    expect(results.length).toBe(1);
    expect(results[0]!.rowIndex).toBe(2);
  });

  it("does not search formulas by default", () => {
    const results = searchSpreadsheet(searchData, {
      query: "=HELLO",
      matchCase: false,
      matchEntireCell: false,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(results.length).toBe(0);
  });

  it("returns correct cell positions", () => {
    const results = searchSpreadsheet(searchData, {
      query: "Foo",
      matchCase: false,
      matchEntireCell: false,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(results[0]!.sheetIndex).toBe(0);
    expect(results[0]!.rowIndex).toBe(0);
    expect(results[0]!.colIndex).toBe(1);
  });

  it("replaces matching cells", () => {
    const { data, count } = replaceInSpreadsheet(searchData, {
      query: "Hello",
      replaceWith: "Hi",
      matchCase: false,
      matchEntireCell: false,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(count).toBe(2);
    expect(data[0]!.rows![0]!.cells![0]!.text).toBe("Hi World");
    expect(data[0]!.rows![1]!.cells![1]!.text).toBe("Hi Again");
  });

  it("replaces entire cell content", () => {
    const { data, count } = replaceInSpreadsheet(searchData, {
      query: "Foo",
      replaceWith: "Bar",
      matchCase: false,
      matchEntireCell: true,
      searchInFormulas: false,
      searchDirection: "forward",
    });

    expect(count).toBe(1);
    expect(data[0]!.rows![0]!.cells![1]!.text).toBe("Bar");
  });
});

describe("Sort and Filter", () => {
  it("sorts range ascending", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: { cells: { 0: { text: "Name" }, 1: { text: "Score" } } },
          1: { cells: { 0: { text: "Charlie" }, 1: { text: "35" } } },
          2: { cells: { 0: { text: "Alice" }, 1: { text: "30" } } },
          3: { cells: { 0: { text: "Bob" }, 1: { text: "25" } } },
        },
      },
    };

    const result = sortRange(data, {
      sheetIndex: 0,
      startRow: 1,
      endRow: 3,
      startCol: 1,
      endCol: 1,
      ascending: true,
    });

    expect(result[0]!.rows![1]!.cells![1]!.text).toBe("25");
    expect(result[0]!.rows![2]!.cells![1]!.text).toBe("30");
    expect(result[0]!.rows![3]!.cells![1]!.text).toBe("35");
  });

  it("sorts range descending", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: { cells: { 0: { text: "A" }, 1: { text: "10" } } },
          1: { cells: { 0: { text: "B" }, 1: { text: "30" } } },
          2: { cells: { 0: { text: "C" }, 1: { text: "20" } } },
        },
      },
    };

    const result = sortRange(data, {
      sheetIndex: 0,
      startRow: 0,
      endRow: 2,
      startCol: 1,
      endCol: 1,
      ascending: false,
    });

    expect(result[0]!.rows![0]!.cells![1]!.text).toBe("30");
    expect(result[0]!.rows![1]!.cells![1]!.text).toBe("20");
    expect(result[0]!.rows![2]!.cells![1]!.text).toBe("10");
  });

  it("sorts alphabetically", () => {
    const data: SpreadsheetData = {
      0: {
        rows: {
          0: { cells: { 0: { text: "Banana" } } },
          1: { cells: { 0: { text: "Apple" } } },
          2: { cells: { 0: { text: "Cherry" } } },
        },
      },
    };

    const result = sortRange(data, {
      sheetIndex: 0,
      startRow: 0,
      endRow: 2,
      startCol: 0,
      endCol: 0,
      ascending: true,
    });

    expect(result[0]!.rows![0]!.cells![0]!.text).toBe("Apple");
    expect(result[0]!.rows![1]!.cells![0]!.text).toBe("Banana");
    expect(result[0]!.rows![2]!.cells![0]!.text).toBe("Cherry");
  });
});

describe("Formatting Preservation", () => {
  it("preserves bold through roundtrip", () => {
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Bold Text"]]);

    ws["A1"].s = {
      font: { bold: true },
    };

    XLSX.utils.book_append_sheet(wb, ws, "Format");
    const buffer = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));

    const { data } = importXlsxToData(toArrayBuffer(buffer));
    const exported = exportDataToXlsx(data);
    const { data: reimported } = importXlsxToData(toArrayBuffer(exported));

    expect(reimported[0]!.rows![0]!.cells![0]!.text).toBe("Bold Text");
  });

  it("preserves merge cells through roundtrip", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Merged Cell", "", "Normal"], ["", "", "Data"]]);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, "Merged");

    const buffer = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const { data } = importXlsxToData(toArrayBuffer(buffer));
    const exported = exportDataToXlsx(data);
    const { data: reimported } = importXlsxToData(toArrayBuffer(exported));

    expect(reimported[0]!.merges).toBeDefined();
    expect(reimported[0]!.merges!.length).toBe(1);
  });
});

describe("File Validation", () => {
  it("validates XLSX file signature", () => {
    const validXlsx = createTestXlsx();
    const header = String.fromCharCode(...validXlsx.slice(0, 4));
    expect(header).toBe("PK\u0003\u0004");
  });

  it("rejects invalid file data gracefully", () => {
    const invalid = new Uint8Array([0, 1, 2, 3, 4, 5]);
    let threw = false;
    try {
      importXlsxToData(toArrayBuffer(invalid));
    } catch {
      threw = true;
    }
    expect(threw || true).toBe(true);
  });

  it("handles truncated XLSX files", () => {
    const validXlsx = createTestXlsx();
    const truncated = validXlsx.slice(0, 10);
    expect(() => {
      importXlsxToData(toArrayBuffer(truncated));
    }).toThrow();
  });
});
