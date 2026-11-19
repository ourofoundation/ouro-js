// A small formula language for evaluators: arithmetic, comparisons, boolean
// logic and a fixed set of functions over values read from route responses.
// There are no loops, assignments or user-defined functions, so a formula
// always terminates and can't reach anything outside the scope it is given.
//
//   100 * (0.4 * min(mae.k1 / 1.0, 1) + 0.6 * clamp(1 - cost.usd_per_kg / 20, 0, 1))
//   hull.e_above_hull <= 0.075 and not mae.smearing_check.sensitive
//
// A value that is missing, or that an operation can't use, is null, and null
// carries through arithmetic and ordering. `and` / `or` follow three-valued
// logic (false and null is false, true or null is true). `coalesce` replaces
// a null.

export type FormulaValue =
  | number
  | boolean
  | string
  | null
  | FormulaValue[]
  | { [key: string]: FormulaValue };

export type FormulaNode =
  | { type: "literal"; value: number | boolean | string | null }
  | { type: "path"; root: string; segments: (string | number)[] }
  | { type: "unary"; op: "-" | "not"; operand: FormulaNode }
  | { type: "binary"; op: BinaryOp; left: FormulaNode; right: FormulaNode }
  | {
      type: "conditional";
      test: FormulaNode;
      then: FormulaNode;
      otherwise: FormulaNode;
    }
  | { type: "call"; name: string; args: FormulaNode[] };

type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "^"
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "and"
  | "or";

export class FormulaError extends Error {
  /** Character offset in the source, when the error points at one. */
  position: number | null;
  constructor(message: string, position: number | null = null) {
    super(message);
    this.name = "FormulaError";
    this.position = position;
  }
}

export const FORMULA_MAX_LENGTH = 2000;
const MAX_DEPTH = 64;

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const KEYWORDS = new Set(["true", "false", "null", "and", "or", "not"]);

/** [min args, max args] for each function. */
const FUNCTIONS: Record<string, [number, number]> = {
  min: [1, Infinity],
  max: [1, Infinity],
  clamp: [3, 3],
  abs: [1, 1],
  round: [1, 2],
  floor: [1, 1],
  ceil: [1, 1],
  sqrt: [1, 1],
  exp: [1, 1],
  log: [1, 1],
  log10: [1, 1],
  pow: [2, 2],
  coalesce: [1, Infinity],
  if: [3, 3],
};

/** Names a formula can't use for its own values (steps, gates, categories). */
export const FORMULA_RESERVED_NAMES: ReadonlySet<string> = new Set([
  ...KEYWORDS,
  ...Object.keys(FUNCTIONS),
]);

// ── Tokens ─────────────────────────────────────────────────────────────

type Token =
  | { kind: "number"; value: number; at: number }
  | { kind: "string"; value: string; at: number }
  | { kind: "name"; value: string; at: number }
  | { kind: "op"; value: string; at: number }
  | { kind: "end"; at: number };

const OPERATORS = [
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "<",
  ">",
  "!",
  "?",
  ":",
  "(",
  ")",
  "[",
  "]",
  ",",
  ".",
];

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    const rest = source.slice(i);
    const number = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest);
    if (number) {
      tokens.push({ kind: "number", value: Number(number[0]), at: i });
      i += number[0].length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let value = "";
      while (j < source.length && source[j] !== ch) {
        if (source[j] === "\\" && j + 1 < source.length) j += 1;
        value += source[j];
        j += 1;
      }
      if (j >= source.length) {
        throw new FormulaError("This text is missing its closing quote", i);
      }
      tokens.push({ kind: "string", value, at: i });
      i = j + 1;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (name) {
      tokens.push({ kind: "name", value: name[0], at: i });
      i += name[0].length;
      continue;
    }
    const op = OPERATORS.find((candidate) => rest.startsWith(candidate));
    if (op) {
      tokens.push({ kind: "op", value: op, at: i });
      i += op.length;
      continue;
    }
    throw new FormulaError(`Unexpected character "${ch}"`, i);
  }
  tokens.push({ kind: "end", at: source.length });
  return tokens;
}

// ── Parser ─────────────────────────────────────────────────────────────

class Parser {
  private index = 0;
  private depth = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): FormulaNode {
    const node = this.expression();
    const token = this.peek();
    if (token.kind !== "end") {
      throw new FormulaError(`Unexpected ${describe(token)}`, token.at);
    }
    return node;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private isOp(...values: string[]): boolean {
    const token = this.peek();
    return token.kind === "op" && values.includes(token.value);
  }

  private isWord(value: string): boolean {
    const token = this.peek();
    return token.kind === "name" && token.value === value;
  }

  private expectOp(value: string): void {
    const token = this.peek();
    if (token.kind !== "op" || token.value !== value) {
      throw new FormulaError(
        `Expected "${value}" but found ${describe(token)}`,
        token.at
      );
    }
    this.index += 1;
  }

  private expression(): FormulaNode {
    this.depth += 1;
    if (this.depth > MAX_DEPTH) {
      throw new FormulaError("This formula is nested too deeply");
    }
    const test = this.or();
    let node = test;
    if (this.isOp("?")) {
      this.index += 1;
      const then = this.expression();
      this.expectOp(":");
      const otherwise = this.expression();
      node = { type: "conditional", test, then, otherwise };
    }
    this.depth -= 1;
    return node;
  }

  private or(): FormulaNode {
    let left = this.and();
    while (this.isOp("||") || this.isWord("or")) {
      this.index += 1;
      left = { type: "binary", op: "or", left, right: this.and() };
    }
    return left;
  }

  private and(): FormulaNode {
    let left = this.not();
    while (this.isOp("&&") || this.isWord("and")) {
      this.index += 1;
      left = { type: "binary", op: "and", left, right: this.not() };
    }
    return left;
  }

  private not(): FormulaNode {
    if (this.isOp("!") || this.isWord("not")) {
      this.index += 1;
      return { type: "unary", op: "not", operand: this.not() };
    }
    return this.comparison();
  }

  private comparison(): FormulaNode {
    const left = this.sum();
    if (this.isOp("==", "!=", "<", "<=", ">", ">=")) {
      const op = (this.peek() as { value: BinaryOp }).value;
      this.index += 1;
      return { type: "binary", op, left, right: this.sum() };
    }
    return left;
  }

  private sum(): FormulaNode {
    let left = this.product();
    while (this.isOp("+", "-")) {
      const op = (this.peek() as { value: BinaryOp }).value;
      this.index += 1;
      left = { type: "binary", op, left, right: this.product() };
    }
    return left;
  }

  private product(): FormulaNode {
    let left = this.negation();
    while (this.isOp("*", "/", "%")) {
      const op = (this.peek() as { value: BinaryOp }).value;
      this.index += 1;
      left = { type: "binary", op, left, right: this.negation() };
    }
    return left;
  }

  private negation(): FormulaNode {
    if (this.isOp("-")) {
      this.index += 1;
      return { type: "unary", op: "-", operand: this.negation() };
    }
    return this.power();
  }

  private power(): FormulaNode {
    const base = this.primary();
    if (this.isOp("^")) {
      this.index += 1;
      // Right-associative, and the exponent may carry its own sign
      return { type: "binary", op: "^", left: base, right: this.negation() };
    }
    return base;
  }

  private primary(): FormulaNode {
    const token = this.peek();
    if (token.kind === "number" || token.kind === "string") {
      this.index += 1;
      return { type: "literal", value: token.value };
    }
    if (token.kind === "op" && token.value === "(") {
      this.index += 1;
      const node = this.expression();
      this.expectOp(")");
      return node;
    }
    if (token.kind === "name") {
      this.index += 1;
      if (token.value === "true") return { type: "literal", value: true };
      if (token.value === "false") return { type: "literal", value: false };
      if (token.value === "null") return { type: "literal", value: null };
      if (KEYWORDS.has(token.value)) {
        throw new FormulaError(`Unexpected "${token.value}"`, token.at);
      }
      if (this.isOp("(")) return this.call(token.value, token.at);
      return this.path(token.value);
    }
    throw new FormulaError(`Unexpected ${describe(token)}`, token.at);
  }

  private call(name: string, at: number): FormulaNode {
    const arity = FUNCTIONS[name];
    if (!arity) {
      throw new FormulaError(
        `Unknown function "${name}". Available: ${Object.keys(FUNCTIONS).join(", ")}`,
        at
      );
    }
    this.expectOp("(");
    const args: FormulaNode[] = [];
    if (!this.isOp(")")) {
      args.push(this.expression());
      while (this.isOp(",")) {
        this.index += 1;
        args.push(this.expression());
      }
    }
    this.expectOp(")");
    if (args.length < arity[0] || args.length > arity[1]) {
      const wanted =
        arity[0] === arity[1]
          ? `${arity[0]}`
          : arity[1] === Infinity
            ? `at least ${arity[0]}`
            : `${arity[0]} to ${arity[1]}`;
      throw new FormulaError(
        `${name}() takes ${wanted} argument${wanted === "1" ? "" : "s"}, got ${args.length}`,
        at
      );
    }
    return { type: "call", name, args };
  }

  private path(root: string): FormulaNode {
    const segments: (string | number)[] = [];
    for (;;) {
      if (this.isOp(".")) {
        this.index += 1;
        const token = this.peek();
        if (token.kind !== "name") {
          throw new FormulaError(
            `Expected a field name after "." but found ${describe(token)}`,
            token.at
          );
        }
        this.index += 1;
        segments.push(token.value);
        continue;
      }
      if (this.isOp("[")) {
        this.index += 1;
        const token = this.peek();
        if (token.kind === "string") {
          segments.push(token.value);
        } else if (token.kind === "number" && Number.isInteger(token.value)) {
          segments.push(token.value);
        } else {
          throw new FormulaError(
            `Expected a quoted field name or a whole number inside [ ] but found ${describe(token)}`,
            token.at
          );
        }
        this.index += 1;
        this.expectOp("]");
        continue;
      }
      break;
    }
    return { type: "path", root, segments };
  }
}

function describe(token: Token): string {
  if (token.kind === "end") return "the end of the formula";
  if (token.kind === "string") return `"${token.value}"`;
  return `"${token.value}"`;
}

/** Parse a formula. Throws `FormulaError` with a message fit to show its author. */
export function parseFormula(source: string): FormulaNode {
  if (typeof source !== "string" || !source.trim()) {
    throw new FormulaError("The formula is empty");
  }
  if (source.length > FORMULA_MAX_LENGTH) {
    throw new FormulaError(
      `The formula is longer than ${FORMULA_MAX_LENGTH} characters`
    );
  }
  return new Parser(tokenize(source)).parse();
}

// ── Inspection ─────────────────────────────────────────────────────────

/** The first name of every value a formula reads, e.g. `["hull", "mae"]`. */
export function formulaRoots(node: FormulaNode): string[] {
  const roots = new Set<string>();
  const visit = (current: FormulaNode) => {
    switch (current.type) {
      case "path":
        roots.add(current.root);
        break;
      case "unary":
        visit(current.operand);
        break;
      case "binary":
        visit(current.left);
        visit(current.right);
        break;
      case "conditional":
        visit(current.test);
        visit(current.then);
        visit(current.otherwise);
        break;
      case "call":
        current.args.forEach(visit);
        break;
      default:
        break;
    }
  };
  visit(node);
  return [...roots];
}

/** `[root, ...segments]` when the formula is nothing but one value read. */
export function formulaAsPath(node: FormulaNode): (string | number)[] | null {
  return node.type === "path" ? [node.root, ...node.segments] : null;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Write a value read as formula text: `pathToFormula(["eval", "f-1"])` is `eval["f-1"]`. */
export function pathToFormula(path: (string | number)[]): string {
  const [root, ...segments] = path;
  return segments.reduce<string>((text, segment) => {
    if (typeof segment === "number") return `${text}[${segment}]`;
    if (IDENTIFIER.test(segment) && !KEYWORDS.has(segment)) {
      return `${text}.${segment}`;
    }
    return `${text}[${JSON.stringify(segment)}]`;
  }, String(root));
}

// ── Evaluation ─────────────────────────────────────────────────────────

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/** Read `[root, ...segments]` from a scope; anything missing is null. */
export function readFormulaPath(
  scope: Record<string, unknown>,
  path: (string | number)[]
): unknown {
  let current: unknown = scope;
  for (const segment of path) {
    if (current == null || typeof current !== "object") return null;
    if (Array.isArray(current)) {
      if (typeof segment !== "number") return null;
      current = current[segment < 0 ? current.length + segment : segment];
      continue;
    }
    const key = String(segment);
    if (BLOCKED_KEYS.has(key)) return null;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined ? null : current;
}

function looseEquals(left: unknown, right: unknown): boolean {
  if (left == null || right == null) return left == null && right == null;
  if (typeof left === "boolean" || typeof right === "boolean") {
    return left === right;
  }
  const a = toNumber(left);
  const b = toNumber(right);
  if (a != null && b != null) return a === b;
  return left === right;
}

function evaluate(node: FormulaNode, scope: Record<string, unknown>): unknown {
  switch (node.type) {
    case "literal":
      return node.value;
    case "path":
      return readFormulaPath(scope, [node.root, ...node.segments]);
    case "unary": {
      const operand = evaluate(node.operand, scope);
      if (node.op === "-") {
        const value = toNumber(operand);
        return value == null ? null : -value;
      }
      const value = toBoolean(operand);
      return value == null ? null : !value;
    }
    case "conditional": {
      const test = toBoolean(evaluate(node.test, scope));
      if (test == null) return null;
      return evaluate(test ? node.then : node.otherwise, scope);
    }
    case "binary":
      return evaluateBinary(node, scope);
    case "call":
      return evaluateCall(node, scope);
    default:
      return null;
  }
}

function evaluateBinary(
  node: Extract<FormulaNode, { type: "binary" }>,
  scope: Record<string, unknown>
): unknown {
  if (node.op === "and" || node.op === "or") {
    const left = toBoolean(evaluate(node.left, scope));
    if (node.op === "and" && left === false) return false;
    if (node.op === "or" && left === true) return true;
    const right = toBoolean(evaluate(node.right, scope));
    if (node.op === "and") {
      if (right === false) return false;
      return left == null || right == null ? null : true;
    }
    if (right === true) return true;
    return left == null || right == null ? null : false;
  }

  const left = evaluate(node.left, scope);
  const right = evaluate(node.right, scope);
  if (node.op === "==") return looseEquals(left, right);
  if (node.op === "!=") return !looseEquals(left, right);

  const a = toNumber(left);
  const b = toNumber(right);
  if (a == null || b == null) return null;
  switch (node.op) {
    case "+":
      return finite(a + b);
    case "-":
      return finite(a - b);
    case "*":
      return finite(a * b);
    case "/":
      return b === 0 ? null : finite(a / b);
    case "%":
      return b === 0 ? null : finite(a % b);
    case "^":
      return finite(Math.pow(a, b));
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    default:
      return null;
  }
}

function evaluateCall(
  node: Extract<FormulaNode, { type: "call" }>,
  scope: Record<string, unknown>
): unknown {
  if (node.name === "if") {
    const test = toBoolean(evaluate(node.args[0], scope));
    if (test == null) return null;
    return evaluate(node.args[test ? 1 : 2], scope);
  }
  if (node.name === "coalesce") {
    for (const arg of node.args) {
      const value = evaluate(arg, scope);
      if (value != null) return value;
    }
    return null;
  }

  const numbers: number[] = [];
  for (const arg of node.args) {
    const value = toNumber(evaluate(arg, scope));
    if (value == null) return null;
    numbers.push(value);
  }
  const [x, y, z] = numbers;
  switch (node.name) {
    case "min":
      return Math.min(...numbers);
    case "max":
      return Math.max(...numbers);
    case "clamp":
      return y > z ? null : Math.min(Math.max(x, y), z);
    case "abs":
      return Math.abs(x);
    case "round": {
      const digits = y === undefined ? 0 : Math.trunc(y);
      if (digits < -15 || digits > 15) return null;
      const scale = Math.pow(10, digits);
      return finite(Math.round(x * scale) / scale);
    }
    case "floor":
      return Math.floor(x);
    case "ceil":
      return Math.ceil(x);
    case "sqrt":
      return x < 0 ? null : Math.sqrt(x);
    case "exp":
      return finite(Math.exp(x));
    case "log":
      return x <= 0 ? null : Math.log(x);
    case "log10":
      return x <= 0 ? null : Math.log10(x);
    case "pow":
      return finite(Math.pow(x, y));
    default:
      return null;
  }
}

/** Evaluate a parsed formula against named values. Never throws. */
export function evaluateFormula(
  node: FormulaNode,
  scope: Record<string, unknown>
): unknown {
  return evaluate(node, scope);
}

/** A formula's result as a finite number, or null. */
export function formulaNumber(value: unknown): number | null {
  return toNumber(value);
}
