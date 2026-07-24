<script lang="ts">
    import { TokenStream } from "$lib/compilation/c/lexing";
    import {
        type TypeDefinition,
    } from "$lib/compilation/c/types";
    import Definition from "$lib/components/cstruct/Definition.svelte";
    import Editor from "$lib/components/cstruct/Editor.svelte";

    let tokens = $state(new TokenStream([])),
        definitions: TypeDefinition[] = $state([]);

    let parseError: string | undefined = $state();

    let input = $state("");
</script>

<main class="flex flex-row h-screen">
    <div class="flex flex-col pr-2 h-full w-md">
        <div class="overflow-scroll">
            {#if typeof definitions === "string"}
                <span class="text-red-500">Parsing error : {definitions}</span>
            {:else}
                {#each definitions as def}
                    <Definition definition={def} />
                {/each}
            {/if}
        </div>
    </div>

    <Editor bind:value={input} bind:tokens bind:definitions />
</main>

<style>
    :global(.cm-editor) {
        height: 100%;
        color: #7c6f64;
    }
</style>
