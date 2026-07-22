import type { TokenStream } from "./lexing";
import type { BuiltinType, BuiltinTypeName, Field, Identifier, PointerTypeRef, StructDefinition, StructTypeRef, TypedefDefinition, TypeDefinition, TypeReference, UnionDefinition, UnionTypeRef } from "./types";


export class Parser {
    /// All declared types, structs & unions
    private _structs = new Set<string>();
    private _unions = new Set<string>();
    private _typedefs = new Set<string>();

    public parse(ts: TokenStream): TypeDefinition[] {
        const defs: TypeDefinition[] = [];

        let i = 0;

        while (!ts.eof() && i < 10_000) {

            if (this.isTypedef(ts))
                defs.push(...this.parseTypedef(ts));

            else if (this.isUnionOrStructDef(ts)) {
                const def = this.parseUnionOrStructDef(ts);

                if (ts.match('identifier')) {
                    let ident = ts.consume() as Identifier;
                    if (def.name === '' || def.name === undefined) def.name = "typeof " + ident.value;
                }

                ts.expect('semicolon');
                defs.push(def);
            } else
                this.skipDeclaration(ts);

            i++;
        }

        return defs;
    }

    private parseFields(ts: TokenStream): Field[] {
        // Is this field's type a *named* struct or union *declaration* (like `struct S { ... }`) ?
        let namedUOSDeclaration = false;

        const base: Field = {
            kind: "field",
            name: '',
            type: {
                kind: 'builtin',
                name: []
            }
        };

        // Remove preceding type qualifiers
        while (ts.match('type_qualifier')) ts.consume();

        if (this.isUnionOrStructDef(ts)) {
            // Union|Struct inline definition
            base.type = this.parseUnionOrStructDef(ts);
            namedUOSDeclaration = true;
        } else if (this.isUnionOrStructRef(ts)) {
            // Union|Struct reference
            base.type = this.parseUnionOrStructRef(ts);
        } else if (ts.match('identifier')) {
            // Consume identifier
            const type = ts.consume() as Identifier;

            base.type = {
                kind: 'named',
                name: type.value
            }
        } else if (ts.match('typename')) {
            // Get all identifiers.
            const typenames: BuiltinTypeName[] = [];

            while (ts.match('typename') || ts.match('type_qualifier')) {
                // Ignore type qualifiers for now
                if (ts.match('type_qualifier')) ts.consume()
                else typenames.push(ts.expect('typename').value);
            }

            base.type = {
                kind: 'builtin',
                name: typenames
            }
        }

        const fields: Field[] = [];

        const parseField = () => {
            // Shallow copy base field declaration
            const res: Field = { ...base };

            // TODO: Make function pointers work
            if (ts.match('paren')) throw new Error('Function pointers currently not supported. Sorry !');

            // Match pointers & type qualifiers (const, volatile, restrict, _Atomic)
            else if (ts.match('star')) while (ts.match('star') || ts.match('type_qualifier')) {
                if (ts.consume().type === 'star')
                    res.type = {
                        kind: 'pointer',
                        to: res.type
                    };
            }

            const ident = ts.expect('identifier');

            res.name = ident.value;

            // Try to parse array notation
            while (ts.match('bracket', '[')) {
                ts.consume();

                // TODO: Enable macros & enum constants as array sizes
                const token = ts.expectAny({ type: 'integer' }, { type: 'keyword', value: 'alignof' }, { type: 'keyword', value: 'sizeof' }, { type: 'bracket', value: ']' });
                let length;

                // TODO: Properly implement alignof & sizeof
                if (token.type === 'integer') {
                    length = token.value
                    ts.expect('bracket', ']');
                } else if (token.type === 'bracket') length = undefined;
                else length = 0;

                if (length === undefined) res.type = {
                    kind: 'pointer',
                    to: res.type
                }
                else res.type = {
                    kind: 'array',
                    length,
                    of: res.type
                }
            }

            fields.push(res);
        }

        console.log(ts.peek());

        // If U|S declaration, field is allowed to be anonymous
        if (ts.match('semicolon') && (base.type.kind === 'union' || base.type.kind === 'struct') && base.type.members !== undefined) {
            // However, if the the U|S declaration is named, no field is actually declared
            if (base.type.name === undefined) {
                // If it is unnamed, we simply pass it through
                fields.push(base);
            }
        }
        // Otherwise, parse first field, which is necessarily there
        else parseField();

        // If there are any other fields, consume them as well
        while (ts.match('comma')) {
            ts.consume();
            parseField();
        }

        // Then, we must have a semicolon
        ts.expect('semicolon');

        return fields;
    }

    private isTypedef(ts: TokenStream) { return ts.match('keyword', 'typedef'); }
    private parseTypedef(ts: TokenStream): TypedefDefinition[] {
        ts.expect('keyword', 'typedef');

        // Technically, a typedef is a field whose identifier is a typename
        let fields = this.parseFields(ts);

        return fields.map(f => {
            return {
                kind: 'typedef',
                name: f.name,
                target: f.type
            }
        })
    }

    private isUnionOrStructDef(ts: TokenStream) {
        return (ts.match('keyword', 'union') || ts.match('keyword', 'struct'))
            && (
                ts.match('brace', '{', 1)
                || (ts.match('identifier', undefined, 1) && ts.match('brace', '{', 2))
            );
    }
    private parseUnionOrStructDef(ts: TokenStream): UnionDefinition | StructDefinition {
        const tok = ts.expectAny({ type: 'keyword', value: 'struct' }, { type: 'keyword', value: 'union' });

        const res: UnionDefinition | StructDefinition = {
            kind: (tok.value as ("union" | "struct")),
            members: []
        };

        if (ts.match('identifier')) {
            res.name = ts.consume().value as string;
        }

        // Expect opening brace
        ts.expect('brace', '{');

        while (!ts.match('brace', '}')) {
            res.members.push(...this.parseFields(ts));
        }

        // Remove closing brace
        ts.consume();

        return res;
    }

    /**
     * Is the next structure a reference to a previously declared struct ?
     * 
     * e.g. `struct S;`
     *  */
    private isUnionOrStructRef(ts: TokenStream) { return (ts.match('keyword', 'struct') || ts.match('keyword', 'union')) && ts.match('identifier', undefined, 1) && !ts.match('brace', '{', 2) }
    private parseUnionOrStructRef(ts: TokenStream): StructTypeRef | UnionTypeRef {
        const kind = ts.expectAny({ type: 'keyword', value: 'union' }, { type: 'keyword', value: 'struct' }).value as ("union" | "struct");
        const ident = ts.expect('identifier');

        return {
            kind,
            name: ident.value,
        }
    }

    private skipDeclaration(ts: TokenStream) {
        let braceLevel = 0, bracketLevel = 0, parenLevel = 0, initialIndex = ts.index;

        while (braceLevel > 0 || bracketLevel > 0 || parenLevel > 0 || !(ts.match('keyword', 'typedef') || ts.match('keyword', 'union') || ts.match('keyword', 'struct'))) {
            const t = ts.consume();

            switch (t.type) {
                case 'paren':
                    if (t.value === '(') parenLevel++;
                    else parenLevel--;
                    continue;
                case 'bracket':
                    if (t.value === '[') bracketLevel++;
                    else bracketLevel--;
                    continue;
                case 'brace':
                    if (t.value === '{') braceLevel++;
                    else braceLevel--;
                    continue;
                case 'empty':
                    let message = '';
                    if (braceLevel > 0) message = `${braceLevel} unclosed braces`;
                    else if (braceLevel < 0) message = `${braceLevel} too many closing braces`;
                    else if (bracketLevel > 0) message = `${bracketLevel} unclosed brackets`;
                    else if (bracketLevel < 0) message = `${bracketLevel} too many closing brackets`;
                    else if (parenLevel > 0) message = `${parenLevel} unclosed parentheses`;
                    else if (parenLevel < 0) message = `${parenLevel} too many closing parentheses`;
                    else return;
                    throw new Error(`Reached end of file : ${message}`);
                default:
                    continue;
            }
        }

        console.log('')
    }

}

export function containsUOSDeclaration(type: TypeDefinition | TypeReference): boolean {
    if ((type.kind === 'struct' || type.kind === 'union') && type.members !== undefined) return true;
    else if (type.kind === 'array') return containsUOSDeclaration(type.of);
    else if (type.kind === 'pointer') return containsUOSDeclaration(type.to);
    else if (type.kind === 'typedef') return containsUOSDeclaration(type.target);
    else return false;
}