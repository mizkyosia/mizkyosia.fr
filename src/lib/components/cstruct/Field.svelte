<script lang="ts">
    import { containsUOSDeclaration } from "$lib/compliation/c/parsing";
    import type { Field } from "$lib/compliation/c/types";
    import Type from "./Type.svelte";

    interface Props {
        field: Field;
    }

    const { field }: Props = $props();
</script>

<div
    class="border border-black border-dashed flex {containsUOSDeclaration(
        field.type,
    )
        ? 'flex-col'
        : 'flex-row'} p-2 font-mono"
>
    {#if field.name !== ""}
        <span>{field.name} :&nbsp;</span>
    {/if}
    <Type type={field.type} />
</div>
