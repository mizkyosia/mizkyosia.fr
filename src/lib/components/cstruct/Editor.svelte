<script lang="ts">
    import {
        history,
        defaultKeymap,
        historyKeymap,
    } from "@codemirror/commands";
    import {
        EditorState,
        RangeSetBuilder,
        StateField,
    } from "@codemirror/state";
    import { onMount } from "svelte";
    import { oneDark } from "@codemirror/theme-one-dark";
    import {
        bracketMatching,
        indentOnInput,
        indentUnit,
    } from "@codemirror/language";
    import {
        closeBrackets,
        autocompletion,
        closeBracketsKeymap,
        completionKeymap,
    } from "@codemirror/autocomplete";
    import {
        EditorView,
        Decoration,
        drawSelection,
        lineNumbers,
        highlightActiveLine,
        keymap,
        highlightSpecialChars,
        type DecorationSet,
    } from "@codemirror/view";
    import type { TokenType, TypeDefinition } from "$lib/compilation/c/types";
    import {
        defaultAutomata,
        Lexer,
        TokenStream,
    } from "$lib/compilation/c/lexing";
    import { Parser } from "$lib/compilation/c/parsing";

    interface Props {
        value: string;
        tokens: TokenStream;
        definitions: TypeDefinition[];
    }

    let {
        value = $bindable(""),
        tokens = $bindable(),
        definitions = $bindable([]),
    }: Props = $props();

    let editorDiv: HTMLDivElement;
    let editor: EditorView;

    /// For parser polling
    let valueChanged = false;

    const lexer = new Lexer(defaultAutomata);

    const parser = new Parser();

    onMount(() => {
        editor = new EditorView({
            parent: editorDiv,

            state: EditorState.create({
                doc: "// Write your type definitions here",

                extensions: [
                    oneDark,
                    lineNumbers(),
                    bracketMatching(),
                    closeBrackets(),
                    indentOnInput(),
                    highlightActiveLine(),
                    drawSelection(),
                    autocompletion(),
                    highlightActiveLine(),
                    highlightSpecialChars(),
                    indentUnit.of("    "),
                    indentOnInput(),
                    history(),
                    keymap.of([
                        ...defaultKeymap,
                        ...closeBracketsKeymap,
                        ...completionKeymap,
                        ...historyKeymap,
                    ]),
                    syntaxHighlightField,
                ],
            }),
        });
    });

    function dec(cssClass: string) {
        return Decoration.mark({ class: cssClass });
    }

    const orange = dec("text-[#fe8019]"),
        purple = dec("text-[#d3869b]"),
        red = dec("text-[#fb4934]"),
        yellow = dec("text-[#fabd2f] aaa"),
        aqua = dec("text-[#8ec07c]"),
        green = dec("text-[#b8bb26]"),
        blue = dec("text-[#83a598]"),
        white = dec("text-[#fbf1c7]"),
        comment = dec("italic");

    const syntaxHighlightField = StateField.define<DecorationSet>({
        create(state) {
            return buildDecorations();
        },

        update(decorations, tr) {
            if (!tr.docChanged) return decorations;

            value = tr.state.doc.toString();

            tokens = lexer.lexSync(value);

            try {
                definitions = parser.parse(tokens);
                const { typedefs } = parser.getTypes();

                for (const t of tokens)
                    if (t.type === "identifier" && typedefs.has(t.value))
                        t.isType = true;
            } catch (e) {
                console.log((e as Error).message);
                definitions = [];
            }

            return buildDecorations();
        },

        provide: (f) => EditorView.decorations.from(f),
    });

    function buildDecorations(): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        for (const token of tokens) {
            switch (token.type) {
                case "identifier":
                    if (token.isType)
                        builder.add(token.start, token.end, yellow);
                    else if (token.isField)
                        builder.add(token.start, token.end, blue);
                    else builder.add(token.start, token.end, white);
                    break;

                case "not":
                case "and":
                case "or":
                case "keyword":
                    builder.add(token.start, token.end, red);
                    break;

                case "typename":
                case "type_qualifier":
                    builder.add(token.start, token.end, orange);
                    break;

                case "integer":
                case "float":
                    builder.add(token.start, token.end, purple);
                    break;

                case "string":
                case "char":
                    builder.add(token.start + 1, token.end - 1, green);
                    break;

                case "comment":
                    builder.add(token.start, token.end, comment);
                    break;

                case "comment":
                case "comma":
                case "semicolon":
                case "colon":
                case "arrow":
                case "brace":
                case "bracket":
                case "paren":
                case "dot":
                    break;

                default:
                    builder.add(token.start, token.end, aqua);
            }
        }

        return builder.finish();
    }
</script>

<div bind:this={editorDiv} class="border-black border w-full h-full"></div>
