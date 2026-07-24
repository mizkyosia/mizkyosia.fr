<script lang="ts">
    import { containsUOSDeclaration } from "$lib/compilation/c/parsing";
    import type { TypeDefinition } from "$lib/compilation/c/types";
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
    id="{definition.kind}-{definition.name}"
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
