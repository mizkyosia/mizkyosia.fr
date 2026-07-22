<script lang="ts">
    import type {
        StructDefinition,
        TypeReference,
        UnionDefinition,
    } from "$lib/compliation/c/types";

    import Type from "./Type.svelte";
    import Definition from "./Definition.svelte";

    interface Props {
        type: TypeReference;
    }

    const { type }: Props = $props();
</script>

{#if type.kind === "struct" || type.kind === "union"}
    {#if type.members !== undefined}
        <Definition definition={type as UnionDefinition | StructDefinition} />
    {:else}
        <i>{type.kind} {type.name}</i>
    {/if}
{:else if type.kind === "builtin"}
    <i>{type.name.join(" ")}</i>
{:else if type.kind === "array"}
    <i><Type type={type.of} />[{type.length}]</i>
{:else if type.kind === "pointer"}
    <i><Type type={type.to} />*</i>
{:else}
    <a href="#type-{type.name}" class="italic underline">{type.name}</a>
{/if}
