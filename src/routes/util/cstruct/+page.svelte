<script lang="ts">
    import { defaultAutomata, Lexer } from "$lib/compliation/c/lexing";
    import { Parser } from "$lib/compliation/c/parsing";
    import { type TypeDefinition } from "$lib/compliation/c/types";
    import Definition from "$lib/components/cstruct/Definition.svelte";

    let lexValue = $state(),
        parseValue: TypeDefinition[] | string = $state([]);

    let prettyPrintLex = $derived(JSON.stringify(lexValue, null, 1)),
        prettyPrintParse = $derived(JSON.stringify(parseValue, null, 1));

    let computeTimeLexing = $state(0),
        computeTimeParsing = $state(0);

    let input = $state("");

    const lexer = new Lexer(defaultAutomata);

    const parser = new Parser();

    function lex() {
        const t1 = performance.now();

        lexer.lex(input).then((v) => {
            const t2 = performance.now();
            computeTimeLexing = t2 - t1;
            lexValue = v.array;

            try {
                parseValue = parser.parse(v);
            } catch (e) {
                console.log(e);
                parseValue = (e as Error).message;
            }
            computeTimeParsing = performance.now() - t2;
        });
    }

    $inspect(lexValue);
</script>

<main class="flex flex-row h-screen">
    <div class="flex flex-col pr-2 h-full">
        <textarea bind:value={input} class="border border-black w-md h-64"
        ></textarea>

        <button onclick={lex} class="border border-gray-600"> Lex C </button>

        <span>Time taken : {computeTimeLexing}ms</span>
        <!-- <br />
        Lexing result :
        <pre class="overflow-scroll">{prettyPrintLex}</pre> -->
    </div>

    <div class="h-full border-l pl-2 border-black flex flex-col">
        <span>Time taken : {computeTimeParsing}ms</span>
        <span>Pretty parsing :</span>
        <div class="overflow-scroll">
            {#if typeof parseValue === "string"}
                <span class="text-red-500">Parsing error : {parseValue}</span>
            {:else}
                {#each parseValue as def}
                    <Definition definition={def} />
                {/each}
            {/if}
        </div>
    </div>
</main>
