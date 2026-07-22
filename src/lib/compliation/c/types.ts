import type { LexerContext } from "./lexing";

interface SimpleToken<T, V> {
    type: T,
    value: V
}

export const keywords = <const>["alignas",
    "alignof",
    "auto",
    "break",
    "case",
    "constexpr",
    "continue",
    "default",
    "do",
    "else",
    "enum",
    "extern",
    "false",
    "for",
    "goto",
    "if",
    "inline",
    "nullptr",
    "register",
    "restrict",
    "return",
    "sizeof",
    "static",
    "static_assert",
    "struct",
    "switch",
    "thread_local",
    "true",
    "typedef",
    "typeof",
    "typeof_unqual",
    "union",
    "while"];

export const typeQualifiers = <const>[
    "const",
    "volatile",
    "restrict",
    "_Atomic"
]

export const baseTypes = <const>[
    "char",
    "int",
    "signed",
    "unsigned",
    "short",
    "long",
    "float",
    "double",
    "void"
];

export type KeywordValue = typeof keywords[number];
export type TypeQualifierValue = typeof typeQualifiers[number];
export type BuiltinTypeName = typeof baseTypes[number];

// Operators
export type Star = SimpleToken<"star", '*'>;
export type Plus = SimpleToken<"plus", '+'>;
export type Minus = SimpleToken<"minus", '-'>;
export type Div = SimpleToken<"div", '/'>;
export type Modulo = SimpleToken<"mod", '%'>;
export type Not = SimpleToken<"not", '!'>;
export type Or = SimpleToken<"or", '||'>;
export type And = SimpleToken<"and", '&&'>;
export type BitOr = SimpleToken<"bitor", '|'>;
export type BitAnd = SimpleToken<"bitand", '&'>;
export type BitNot = SimpleToken<"bitnot", '~'>;
export type BitXor = SimpleToken<"bitxor", '^'>;

// Assign + operators
export type Assign = SimpleToken<"assign", '='>;
export type MultEq = SimpleToken<"multeq", '*='>;
export type PlusEq = SimpleToken<"pluseq", '+='>;
export type MinusEq = SimpleToken<"minuseq", '-='>;
export type DivEq = SimpleToken<"diveq", '/='>;
export type ModuloEq = SimpleToken<"modeq", '%='>;
export type BitOrEq = SimpleToken<"bitoreq", '|='>;
export type BitAndEq = SimpleToken<"bitandeq", '&='>;
export type BitNotEq = SimpleToken<"bitnoteq", '~='>;
export type BitXorEq = SimpleToken<"bitxoreq", '^='>;

// Comparison
export type LessThan = SimpleToken<"lt", '<'>;
export type LessThanEq = SimpleToken<"lteq", '<='>;
export type GreaterThan = SimpleToken<"gt", '>'>;
export type GreaterThanEq = SimpleToken<"gteq", '>='>;
export type Equals = SimpleToken<"eq", '=='>;
export type NotEquals = SimpleToken<"noteq", '!='>;


// Punctuation
export type Dot = SimpleToken<"dot", '.'>;
export type Colon = SimpleToken<"colon", ':'>;
export type Semicolon = SimpleToken<"semicolon", ';'>;
export type Comma = SimpleToken<"comma", ','>;
export type Arrow = SimpleToken<"arrow", '->'>;

// Code blocks
export type Bracket = SimpleToken<"paren", '(' | ')'>;
export type SqrBracket = SimpleToken<"bracket", '[' | ']'>;
export type CurlyBracket = SimpleToken<"brace", '{' | '}'>;

// Literals
export type CharLiteral = SimpleToken<"char", string>;
export type StringLiteral = SimpleToken<"string", string>;
export type IntegerLiteral = SimpleToken<"integer", number>;
export type FloatLiteral = SimpleToken<"float", number> & { isDouble: boolean };

// Other
export type Keyword = SimpleToken<"keyword", KeywordValue>;
export type TypeQualifier = SimpleToken<"type_qualifier", TypeQualifierValue>;
export type BuiltinType = SimpleToken<"typename", BuiltinTypeName>;
export type Identifier = SimpleToken<"identifier", string>;
export type Comment = SimpleToken<"comment", string>;
export type Directive = SimpleToken<"directive", string>;

// Empty token
export type Empty = SimpleToken<"empty", "">;

export type LexerTokenList = [Star,
    Plus,
    Minus,
    Div,
    Not,
    Or,
    And,
    Modulo,
    BitNot,
    BitOr,
    BitAnd,
    BitXor,
    Assign,
    MultEq,
    PlusEq,
    MinusEq,
    DivEq,
    ModuloEq,
    BitOrEq,
    BitAndEq,
    BitNotEq,
    BitXorEq,
    LessThan,
    LessThanEq,
    GreaterThan,
    GreaterThanEq,
    Equals,
    NotEquals,
    Dot,
    Colon,
    Semicolon,
    Comma,
    Arrow,
    Bracket,
    SqrBracket,
    CurlyBracket,
    CharLiteral,
    StringLiteral,
    IntegerLiteral,
    FloatLiteral,
    Keyword,
    TypeQualifier,
    BuiltinType,
    Identifier,
    Comment,
    Directive,
    Empty];

export type LexerToken = LexerTokenList[number];

// Utility: map a token `type` literal to the corresponding token shape
export type TokenOfType<T extends LexerToken['type']> = Extract<LexerToken, { type: T }>;

export type LexerAutomaton = (ctx: LexerContext) => LexerToken | void;

//! ======================== TYPE DEFS ======================== 

export interface StructDefinition {
    kind: "struct";
    name?: string;
    members: Field[];
}

export interface UnionDefinition {
    kind: "union";
    name?: string;
    members: Field[];
}

export interface TypedefDefinition {
    kind: "typedef";
    name: string;
    target: TypeReference;
}

export type TypeDefinition =
    | StructDefinition
    | UnionDefinition
    | TypedefDefinition;


//! ======================== TYPE REFS ======================== 

export type TypeReference =
    | BuiltinTypeRef
    | NamedTypeRef
    | PointerTypeRef
    | ArrayTypeRef
    | StructTypeRef
    | UnionTypeRef;

export interface BuiltinTypeRef {
    kind: "builtin";
    name: BuiltinTypeName[];
}

export interface NamedTypeRef {
    kind: "named";
    name: string;
}

export interface PointerTypeRef {
    kind: "pointer";
    to: TypeReference;
}

export interface ArrayTypeRef {
    kind: "array";
    of: TypeReference;
    length: number;
}

export interface StructTypeRef {
    kind: "struct";
    name?: string;
    members?: Field[];
}

export interface UnionTypeRef {
    kind: "union";
    name?: string;
    members?: Field[];
}

//! ======================== MISC ======================== 

export interface Field {
    kind: "field";
    name: string;
    type: TypeReference;
}