<script lang="ts">
    import { containsUOSDeclaration } from "$lib/compliation/c/parsing";
    import type { TypeDefinition } from "$lib/compliation/c/types";
    import type { Snippet } from "svelte";
    import Type from "./Type.svelte";
    import Field from "./Field.svelte";

    interface Props {
        definition: TypeDefinition;
    }

    const { definition }: Props = $props();

    const isMultiline = $derived(containsUOSDeclaration(definition));
</script>

<div
    class="border border-black flex {isMultiline
        ? 'flex-col'
        : 'flex-row'} p-2 font-mono"
    id="type-{definition.kind === 'typedef'
        ? ''
        : definition.kind + '-'}{definition.name}"
>
    {#if definition.kind === "typedef"}
            <span
                ><span class="text-gray-500 italic">(type)</span>
                {definition.name} :&nbsp;
            </span>
        <Type type={definition.target} />
    {:else}
        <span
            ><span class="text-gray-500 italic">({definition.kind})</span>
            {definition.name}
        </span>

        {#each definition.members as field}
            <Field {field} />
        {/each}
    {/if}
</div>
