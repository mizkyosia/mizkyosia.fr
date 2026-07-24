import { type LexerToken, type LexerAutomaton, type TokenOfType, type BuiltinTypeName, baseTypes, keywords, typeQualifiers, type KeywordValue, type TypeQualifierValue, type Identifier, type ReducedLexerToken, type TokenType } from "./types";

export type LexerError = {
    reason: string,
    index: number
};

export class LexerContext {
    private _input: string;
    private _cursor: number;
    private _tokens: LexerToken[];
    private _errors: LexerError[];

    constructor(input: string, tokenArray: LexerToken[]) {
        this._input = input;
        this._cursor = 0;
        this._tokens = tokenArray;
        this._errors = [];
    }

    public consume(n: number = 1) {
        this._cursor += n;
        return this._input.substring(this._cursor - n, this._cursor);
    }

    public discard(n: number = 1) {
        this._cursor += n;
    }

    public peek(n: number = 1) {
        return this._input.slice(this._cursor, this._cursor + n);
    }

    public error(reason: string, index: number) {

    }

    public eof() {
        return this._cursor >= this._input.length;
    }

    public get cursor() {
        return this._cursor;
    }
}

export class Lexer {

    constructor(private _automata: LexerAutomaton[]) { }

    public async lex(input: string): Promise<TokenStream> {
        return this.lexSync(input);
    }

    public lexSync(input: string): TokenStream {
        if (!input || input === '') return new TokenStream([]);

        const tokens: LexerToken[] = [];

        const ctx = new LexerContext(input, tokens);

        consumeLoop: while (!ctx.eof()) {
            for (let a of this._automata) {
                const start = ctx.cursor;
                const token = a(ctx)
                if (token && token.type != "empty") {
                    tokens.push({ start, end: ctx.cursor, ...token });
                    continue consumeLoop;
                }
            }

            if (!ctx.eof()) console.error(`Error when trying to parse string`, ctx);
            return new TokenStream(tokens);
        }

        return new TokenStream(tokens);
    }
}

export class TokenStream {
    constructor(private _tokens: LexerToken[]) { }

    private _index = 0;

    peek(offset = 0) {
        return this._tokens[this._index + offset] ?? { type: 'empty', value: '' };
    }

    consume() {
        return this._tokens[this._index++] ?? { type: 'empty', value: '' };
    }

    eof() {
        return this._index >= this._tokens.length;
    }

    match<T extends TokenType>(type: T, val?: TokenOfType<T>['value'], offset = 0) {
        const t = this.peek(offset) as TokenOfType<T> | undefined;
        if (!t) return false;
        if (t.type !== type) return false;
        if (val !== undefined && t.value !== val) return false;
        return true;
    }

    expect<T extends TokenType>(type: T, val?: TokenOfType<T>['value']): TokenOfType<T> {
        const t = this.consume();

        if (t.type !== type)
            throw new Error(`Expected ${type}, got ${t.type}`);

        if (val !== undefined && t.value !== val)
            throw new Error(`Expected value ${val}, got ${t.value}`);

        return t as TokenOfType<T>;
    }

    expectAny<T extends LexerTokenMaybeValue>(...tokens: T[]): TokenOfType<T['type']> {
        const t = this.consume()
        for (const tok of tokens) {
            if (t.type === tok.type && (tok.value === undefined || t.value === tok.value)) return t;
        }

        throw new Error(`Expected any of \`${tokens.map(t => `${t.type}${t.value ? '(' + t.value + ')' : ''}`).join('\`, \`')}\` ; got ${t.type} instead`)
    }

    get array() {
        return this._tokens;
    }

    get index() {
        return this._index;
    }

    public *[Symbol.iterator]() {
        for (let t of this._tokens)
            yield t;
    }
}

export function discardAndReturn<T extends TokenType>(ctx: LexerContext, type: T, value: TokenOfType<T>['value'], n: number = 1) {
    ctx.discard(n);
    return {
        type,
        value
    } as TokenOfType<T>;
}

type LexerTokenMaybeValue = Partial<LexerToken> & Pick<LexerToken, 'type'>;

export const defaultAutomata: LexerAutomaton[] = [
    // Remove whitespace
    (c) => {
        let iter = false;
        while (/[\s]/.test(c.peek())) {
            c.consume();
            iter = true;
        }
        if (iter)
            return {
                type: "empty",
                value: "",
            };
    },
    // Lex comments & directives
    (c) => {
        let current = c.peek(2),
            accumulator = "";

        if (current === "//") {
            c.discard(2);
            while (current !== "\n" && !c.eof()) accumulator += current = c.consume();
        } else if (current === "/*") {
            c.discard(2);
            while (current !== "/" && accumulator.at(-1) !== "*" && !c.eof())
                accumulator += current = c.consume();
        } else if (current[0] === "#") {
            while (c.peek() !== "\n" && !c.eof()) accumulator += c.consume();
            return {
                type: "directive",
                value: accumulator,
            };
        } else return;

        return {
            type: "comment",
            value: accumulator.slice(0, -1),
        };
    },
    // Literals
    (c) => {
        let current = c.peek(),
            accumulator = "";

        if (current === "'" || current === '"') {
            let beginMarker = current;
            c.discard();
            while (
                c.peek() !== beginMarker &&
                c.peek() !== "\n" &&
                !c.eof()
            ) {
                accumulator += c.consume();
            }
            c.discard();
            return {
                type: beginMarker === '"' ? "string" : "char",
                value: accumulator,
            };
        } else if (/[0-9]/.test(current)) {
            let floatMode = 0;
            while (/[0-9\.f]/.test(c.peek())) {
                if (floatMode == 2) {
                    return; // TODO : Should throw an Error
                } else if (c.peek() === ".") {
                    if (floatMode) return;
                    floatMode = 1;
                } else if (c.peek() === "f") {
                    if (floatMode > 1) return;
                    floatMode = 2;
                    c.discard();
                    continue;
                }
                accumulator += c.consume();
            }

            if (floatMode === 0)
                return {
                    type: "integer",
                    value: parseInt(accumulator),
                };
            else
                return {
                    type: "float",
                    value: parseFloat(accumulator),
                    isDouble: floatMode === 1,
                };
        }
    },
    // Basic operations
    (c) => {
        let current = c.peek(2);

        let secondCharEq = current[1] === "=";

        switch (current[0]) {
            case "*":
                if (secondCharEq)
                    return discardAndReturn(c, "multeq", "*=", 2);
                else return discardAndReturn(c, "star", "*");
            case "+":
                if (secondCharEq)
                    return discardAndReturn(c, "pluseq", "+=", 2);
                else return discardAndReturn(c, "plus", "+");
            case "-":
                if (secondCharEq)
                    return discardAndReturn(c, "minuseq", "-=", 2);
                else if (current[1] === ">")
                    return discardAndReturn(c, "arrow", "->", 2);
                else return discardAndReturn(c, "minus", "-");
            case "/":
                if (secondCharEq)
                    return discardAndReturn(c, "diveq", "/=", 2);
                else return discardAndReturn(c, "div", "/");
            case "%":
                if (secondCharEq)
                    return discardAndReturn(c, "modeq", "%=", 2);
                else return discardAndReturn(c, "mod", "%");
            case "!":
                if (secondCharEq)
                    return discardAndReturn(c, "noteq", "!=", 2);
                else return discardAndReturn(c, "not", "!");

            // Bitwise
            case "&":
                if (secondCharEq)
                    return discardAndReturn(c, "bitandeq", "&=", 2);
                else if (current[1] === "&")
                    return discardAndReturn(c, "and", "&&", 2);
                else return discardAndReturn(c, "bitand", "&");
            case "|":
                if (secondCharEq)
                    return discardAndReturn(c, "bitoreq", "|=", 2);
                else if (current[1] === "|")
                    return discardAndReturn(c, "or", "||", 2);
                else return discardAndReturn(c, "bitor", "|");
            case "^":
                if (secondCharEq)
                    return discardAndReturn(c, "bitxoreq", "^=", 2);
                else return discardAndReturn(c, "bitxor", "^");
            case "~":
                if (secondCharEq)
                    return discardAndReturn(c, "bitnoteq", "~=", 2);
                else return discardAndReturn(c, "bitnot", "~");

            // Comparison
            case "=":
                if (secondCharEq) return discardAndReturn(c, "eq", "==", 2);
                else return discardAndReturn(c, "assign", "=");
            case "<":
                if (secondCharEq)
                    return discardAndReturn(c, "lteq", "<=", 2);
                else return discardAndReturn(c, "lt", "<");
            case ">":
                if (secondCharEq)
                    return discardAndReturn(c, "gteq", ">=", 2);
                else return discardAndReturn(c, "gt", ">");

            default:
                return;
        }
    },
    // Punctuation & access
    (c) => {
        let p = c.peek();
        switch (p) {
            case ".":
                return discardAndReturn(c, "dot", ".");
            case ",":
                return discardAndReturn(c, "comma", ",");
            case ";":
                return discardAndReturn(c, "semicolon", ";");
            case ":":
                return discardAndReturn(c, "colon", ":");
            case "(":
            case ")":
                return discardAndReturn(c, "paren", p);
            case "[":
            case "]":
                return discardAndReturn(c, "bracket", p);
            case "{":
            case "}":
                return discardAndReturn(c, "brace", p);
        }
    },
    // Lex keywords & identifiers
    (c) => {
        let accumulator = "",
            index = -1;

        while (/[a-zA-Z0-9_]/.test(c.peek())) accumulator += c.consume();

        if (accumulator !== "") {
            if (
                (index = baseTypes.indexOf(
                    accumulator as BuiltinTypeName,
                )) > -1
            )
                return {
                    type: "typename",
                    value: accumulator as BuiltinTypeName,
                };
            else if (
                (index = keywords.indexOf(accumulator as KeywordValue)) > -1
            )
                return {
                    type: "keyword",
                    value: accumulator as KeywordValue,
                };
            else if (
                (index = typeQualifiers.indexOf(
                    accumulator as TypeQualifierValue,
                )) > -1
            )
                return {
                    type: "type_qualifier",
                    value: accumulator as TypeQualifierValue,
                };
            else
                return {
                    type: "identifier",
                    value: accumulator,
                };
        }
    },
];