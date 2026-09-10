import type { SpreadsheetData } from "./types";

const FORMULA_PREFIX = "=";

function getCellValue(
  data: SpreadsheetData,
  sheetIdx: number,
  ri: number,
  ci: number
): string {
  return data[sheetIdx]?.rows?.[ri]?.cells?.[ci]?.text ?? "";
}

function parseCellRef(ref: string): { ri: number; ci: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const colStr = match[1].toUpperCase();
  let ci = 0;
  for (let i = 0; i < colStr.length; i++) {
    ci = ci * 26 + (colStr.charCodeAt(i) - 64);
  }
  ci -= 1;
  const ri = parseInt(match[2], 10) - 1;
  return { ri, ci };
}

function parseRange(
  rangeStr: string
): { start: { ri: number; ci: number }; end: { ri: number; ci: number } } | null {
  const parts = rangeStr.split(":");
  if (parts.length !== 2) return null;
  const start = parseCellRef(parts[0].trim());
  const end = parseCellRef(parts[1].trim());
  if (!start || !end) return null;
  return { start, end };
}

function resolveRangeValues(
  data: SpreadsheetData,
  sheetIdx: number,
  rangeStr: string
): number[] {
  const range = parseRange(rangeStr);
  if (!range) return [];

  const values: number[] = [];
  const { start, end } = range;
  const rMin = Math.min(start.ri, end.ri);
  const rMax = Math.max(start.ri, end.ri);
  const cMin = Math.min(start.ci, end.ci);
  const cMax = Math.max(start.ci, end.ci);

  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const val = getCellValue(data, sheetIdx, r, c);
      const n = Number(val);
      if (!isNaN(n)) values.push(n);
    }
  }

  return values;
}

function resolveValue(
  data: SpreadsheetData,
  sheetIdx: number,
  expr: string
): string | number {
  const trimmed = expr.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== "") return num;

  const cellRef = parseCellRef(trimmed);
  if (cellRef) {
    const val = getCellValue(data, sheetIdx, cellRef.ri, cellRef.ci);
    if (val.startsWith(FORMULA_PREFIX)) {
      return evaluateFormula(data, sheetIdx, val);
    }
    if (val === "" || val.trim() === "") return val;
    const n = Number(val);
    return isNaN(n) ? val : n;
  }

  return trimmed;
}

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]!;

    if (ch === '"') {
      inString = !inString;
      current += ch;
      continue;
    }
    if (inString) {
      current += ch;
      continue;
    }

    if (ch === " ") {
      if (current) tokens.push(current);
      current = "";
      continue;
    }

    if (ch === "(" || ch === ")") {
      if (current) tokens.push(current);
      current = "";
      tokens.push(ch);
      continue;
    }

    if (ch === "," || ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      if (current) tokens.push(current);
      current = "";
      tokens.push(ch);
      continue;
    }

    if (ch === "<" || ch === ">" || ch === "=") {
      if (current) tokens.push(current);
      current = "";
      if (i + 1 < expr.length && (expr[i + 1] === "=")) {
        tokens.push(ch + "=");
        i++;
      } else {
        tokens.push(ch);
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

function evalTokens(
  data: SpreadsheetData,
  sheetIdx: number,
  tokens: string[],
  pos: { i: number }
): string | number {
  return parseComparison(data, sheetIdx, tokens, pos);
}

function parseComparison(
  data: SpreadsheetData,
  sheetIdx: number,
  tokens: string[],
  pos: { i: number }
): string | number {
  let left = parseAddSub(data, sheetIdx, tokens, pos);

  while (pos.i < tokens.length) {
    const op = tokens[pos.i];
    if (op === "=" || op === "<>" || op === "<" || op === ">" || op === "<=" || op === ">=") {
      pos.i++;
      const right = parseAddSub(data, sheetIdx, tokens, pos);
      const ln = typeof left === "number" ? left : Number(left);
      const rn = typeof right === "number" ? right : Number(right);
      const useNum = !isNaN(ln) && !isNaN(rn);
      switch (op) {
        case "=": left = useNum ? (ln === rn ? "TRUE" : "FALSE") : (String(left) === String(right) ? "TRUE" : "FALSE"); break;
        case "<>": left = useNum ? (ln !== rn ? "TRUE" : "FALSE") : (String(left) !== String(right) ? "TRUE" : "FALSE"); break;
        case "<": left = (useNum && ln < rn) ? "TRUE" : "FALSE"; break;
        case ">": left = (useNum && ln > rn) ? "TRUE" : "FALSE"; break;
        case "<=": left = (useNum && ln <= rn) ? "TRUE" : "FALSE"; break;
        case ">=": left = (useNum && ln >= rn) ? "TRUE" : "FALSE"; break;
      }
    } else {
      break;
    }
  }

  return left;
}

function parseAddSub(
  data: SpreadsheetData,
  sheetIdx: number,
  tokens: string[],
  pos: { i: number }
): string | number {
  let left = parseMulDiv(data, sheetIdx, tokens, pos);

  while (pos.i < tokens.length && (tokens[pos.i] === "+" || tokens[pos.i] === "-")) {
    const op = tokens[pos.i]!;
    pos.i++;
    const right = parseMulDiv(data, sheetIdx, tokens, pos);
    const ln = typeof left === "number" ? left : Number(left);
    const rn = typeof right === "number" ? right : Number(right);
    if (!isNaN(ln) && !isNaN(rn)) {
      left = op === "+" ? ln + rn : ln - rn;
    } else if (op === "+") {
      left = String(left) + String(right);
    } else {
      left = NaN;
    }
  }

  return left;
}

function parseMulDiv(
  data: SpreadsheetData,
  sheetIdx: number,
  tokens: string[],
  pos: { i: number }
): string | number {
  let left = parseUnary(data, sheetIdx, tokens, pos);

  while (pos.i < tokens.length && (tokens[pos.i] === "*" || tokens[pos.i] === "/" || tokens[pos.i] === "^")) {
    const op = tokens[pos.i]!;
    pos.i++;
    const right = parseUnary(data, sheetIdx, tokens, pos);
    const ln = typeof left === "number" ? left : Number(left);
    const rn = typeof right === "number" ? right : Number(right);
    if (!isNaN(ln) && !isNaN(rn)) {
      if (op === "*") left = ln * rn;
      else if (op === "/") left = rn !== 0 ? ln / rn : NaN;
      else left = Math.pow(ln, rn);
    } else {
      left = NaN;
    }
  }

  return left;
}

function parseUnary(
  data: SpreadsheetData,
  sheetIdx: number,
  tokens: string[],
  pos: { i: number }
): string | number {
  if (pos.i < tokens.length && tokens[pos.i] === "-") {
    pos.i++;
    const val = parsePrimary(data, sheetIdx, tokens, pos);
    if (typeof val === "number") return -val;
    return NaN;
  }
  return parsePrimary(data, sheetIdx, tokens, pos);
}

function parsePrimary(
  data: SpreadsheetData,
  sheetIdx: number,
  tokens: string[],
  pos: { i: number }
): string | number {
  if (pos.i >= tokens.length) return 0;

  const token = tokens[pos.i]!;

  if (token === "(") {
    pos.i++;
    const val = evalTokens(data, sheetIdx, tokens, pos);
    if (pos.i < tokens.length && tokens[pos.i] === ")") pos.i++;
    return val;
  }

  pos.i++;
  return resolveValue(data, sheetIdx, token);
}

function evaluateExpression(
  data: SpreadsheetData,
  sheetIdx: number,
  expr: string
): string | number {
  const trimmed = expr.trim();
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return 0;
  const pos = { i: 0 };
  return evalTokens(data, sheetIdx, tokens, pos);
}

function evaluateFunction(
  data: SpreadsheetData,
  sheetIdx: number,
  funcName: string,
  argsStr: string
): string | number {
  const name = funcName.toUpperCase();

  const args = splitFunctionArgs(argsStr);

  const resolveArg = (arg: string): string | number => {
    const trimmed = arg.trim();
    if (trimmed.includes(":")) {
      const rangeVals = resolveRangeValues(data, sheetIdx, trimmed);
      return rangeVals.length > 0 ? rangeVals[0]! : NaN;
    }
    if (trimmed.startsWith(FORMULA_PREFIX)) {
      return evaluateFormula(data, sheetIdx, trimmed);
    }
    return evaluateExpression(data, sheetIdx, trimmed);
  };

  switch (name) {
    case "SUM": {
      let total = 0;
      for (const arg of args) {
        const trimmed = arg.trim();
        if (trimmed.includes(":")) {
          const vals = resolveRangeValues(data, sheetIdx, trimmed);
          total += vals.reduce((s, v) => s + v, 0);
        } else {
          const val = resolveArg(arg);
          if (typeof val === "number" && !isNaN(val)) total += val;
        }
      }
      return total;
    }
    case "AVERAGE": {
      const allVals: number[] = [];
      for (const arg of args) {
        const trimmed = arg.trim();
        if (trimmed.includes(":")) {
          allVals.push(...resolveRangeValues(data, sheetIdx, trimmed));
        } else {
          const val = resolveArg(arg);
          if (typeof val === "number" && !isNaN(val)) allVals.push(val);
        }
      }
      return allVals.length > 0 ? allVals.reduce((s, v) => s + v, 0) / allVals.length : 0;
    }
    case "COUNT": {
      let count = 0;
      for (const arg of args) {
        const trimmed = arg.trim();
        if (trimmed.includes(":")) {
          const range = parseRange(trimmed);
          if (range) {
            const { start, end } = range;
            for (let r = Math.min(start.ri, end.ri); r <= Math.max(start.ri, end.ri); r++) {
              for (let c = Math.min(start.ci, end.ci); c <= Math.max(start.ci, end.ci); c++) {
                const val = getCellValue(data, sheetIdx, r, c);
                if (val !== "" && !isNaN(Number(val))) count++;
              }
            }
          }
        } else {
          const val = resolveArg(arg);
          if (typeof val === "number" && !isNaN(val)) count++;
        }
      }
      return count;
    }
    case "MAX": {
      let max = -Infinity;
      for (const arg of args) {
        const trimmed = arg.trim();
        if (trimmed.includes(":")) {
          const vals = resolveRangeValues(data, sheetIdx, trimmed);
          for (const v of vals) if (v > max) max = v;
        } else {
          const val = resolveArg(arg);
          if (typeof val === "number" && val > max) max = val;
        }
      }
      return max === -Infinity ? 0 : max;
    }
    case "MIN": {
      let min = Infinity;
      for (const arg of args) {
        const trimmed = arg.trim();
        if (trimmed.includes(":")) {
          const vals = resolveRangeValues(data, sheetIdx, trimmed);
          for (const v of vals) if (v < min) min = v;
        } else {
          const val = resolveArg(arg);
          if (typeof val === "number" && val < min) min = val;
        }
      }
      return min === Infinity ? 0 : min;
    }
    case "IF": {
      if (args.length < 2) return "#VALUE!";
      const condition = evaluateExpression(data, sheetIdx, args[0]);
      const isTruthy =
        condition === "TRUE" ||
        (typeof condition === "number" && condition !== 0);
      if (isTruthy) {
        return args.length > 1 ? resolveArg(args[1]) : "TRUE";
      }
      return args.length > 2 ? resolveArg(args[2]) : "FALSE";
    }
    case "ABS": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      return typeof val === "number" ? Math.abs(val) : 0;
    }
    case "ROUND": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      const decimals = args.length > 1 ? Number(resolveArg(args[1])) : 0;
      if (typeof val !== "number") return 0;
      const factor = Math.pow(10, decimals);
      return Math.round(val * factor) / factor;
    }
    case "UPPER": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      return String(val).toUpperCase();
    }
    case "LOWER": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      return String(val).toLowerCase();
    }
    case "TRIM": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      return String(val).trim();
    }
    case "LEN": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      return String(val).length;
    }
    case "LEFT": {
      if (args.length < 1) return "#VALUE!";
      const val = String(resolveArg(args[0]));
      const count = args.length > 1 ? Number(resolveArg(args[1])) : 1;
      return val.substring(0, count);
    }
    case "RIGHT": {
      if (args.length < 1) return "#VALUE!";
      const val = String(resolveArg(args[0]));
      const count = args.length > 1 ? Number(resolveArg(args[1])) : 1;
      return val.substring(val.length - count);
    }
    case "MID": {
      if (args.length < 3) return "#VALUE!";
      const val = String(resolveArg(args[0]));
      const start = Number(resolveArg(args[1])) - 1;
      const len = Number(resolveArg(args[2]));
      return val.substring(start, start + len);
    }
    case "CONCAT":
    case "CONCATENATE": {
      return args.map((a) => String(resolveArg(a))).join("");
    }
    case "NOW": {
      return new Date().toLocaleString();
    }
    case "TODAY": {
      return new Date().toLocaleDateString();
    }
    case "PI": {
      return Math.PI;
    }
    case "POWER": {
      if (args.length < 2) return "#VALUE!";
      const base = Number(resolveArg(args[0]));
      const exp = Number(resolveArg(args[1]));
      return Math.pow(base, exp);
    }
    case "SQRT": {
      if (args.length < 1) return "#VALUE!";
      const val = Number(resolveArg(args[0]));
      return val >= 0 ? Math.sqrt(val) : "#NUM!";
    }
    case "MOD": {
      if (args.length < 2) return "#VALUE!";
      const num = Number(resolveArg(args[0]));
      const divisor = Number(resolveArg(args[1]));
      return divisor !== 0 ? num % divisor : "#DIV/0!";
    }
    case "INT": {
      if (args.length < 1) return "#VALUE!";
      const val = Number(resolveArg(args[0]));
      return Math.floor(val);
    }
    case "NOT": {
      if (args.length < 1) return "#VALUE!";
      const val = resolveArg(args[0]);
      const boolVal =
        val === "TRUE" || (typeof val === "number" && val !== 0);
      return !boolVal ? "TRUE" : "FALSE";
    }
    case "AND": {
      for (const arg of args) {
        const val = resolveArg(arg);
        const boolVal =
          val === "TRUE" || (typeof val === "number" && val !== 0);
        if (!boolVal) return "FALSE";
      }
      return args.length > 0 ? "TRUE" : "#VALUE!";
    }
    case "OR": {
      for (const arg of args) {
        const val = resolveArg(arg);
        const boolVal =
          val === "TRUE" || (typeof val === "number" && val !== 0);
        if (boolVal) return "TRUE";
      }
      return args.length > 0 ? "FALSE" : "#VALUE!";
    }
    default:
      return `#NAME?`;
  }
}

function splitFunctionArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];

    if (ch === '"') {
      inString = !inString;
      current += ch;
      continue;
    }
    if (inString) {
      current += ch;
      continue;
    }
    if (ch === "(") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")") {
      depth--;
      current += ch;
      continue;
    }
    if (depth === 0 && ch === ",") {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

export function evaluateFormula(
  data: SpreadsheetData,
  sheetIdx: number,
  formula: string
): string | number {
  if (!formula.startsWith(FORMULA_PREFIX)) return formula;

  const expr = formula.substring(1).trim();

  const funcMatch = expr.match(/^([A-Z]+)\((.*)\)$/i);
  if (funcMatch) {
    return evaluateFunction(data, sheetIdx, funcMatch[1], funcMatch[2]);
  }

  return evaluateExpression(data, sheetIdx, expr);
}

export function recalculateAll(
  data: SpreadsheetData
): SpreadsheetData {
  const result = JSON.parse(JSON.stringify(data)) as SpreadsheetData;

  for (const sheetIdx of Object.keys(result).map(Number)) {
    const sheet = result[sheetIdx];
    if (!sheet.rows) continue;

    for (const ri of Object.keys(sheet.rows).map(Number)) {
      const row = sheet.rows[ri];
      if (!row?.cells) continue;

      for (const ci of Object.keys(row.cells).map(Number)) {
        const cell = row.cells[ci];
        if (cell?.text?.startsWith(FORMULA_PREFIX)) {
          const val = evaluateFormula(result, sheetIdx, cell.text);
          cell.text = String(val);
        }
      }
    }
  }

  return result;
}

export function recalculateSheet(
  data: SpreadsheetData,
  sheetIdx: number
): SpreadsheetData {
  const result = JSON.parse(JSON.stringify(data)) as SpreadsheetData;
  const sheet = result[sheetIdx];
  if (!sheet?.rows) return result;

  for (const ri of Object.keys(sheet.rows).map(Number)) {
    const row = sheet.rows[ri];
    if (!row?.cells) continue;

    for (const ci of Object.keys(row.cells).map(Number)) {
      const cell = row.cells[ci];
      if (cell?.text?.startsWith(FORMULA_PREFIX)) {
        const val = evaluateFormula(result, sheetIdx, cell.text);
        cell.text = String(val);
      }
    }
  }

  return result;
}
