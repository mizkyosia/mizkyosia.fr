<script lang="ts">
    import Butterflies from "$lib/components/text/Butterflies.svelte";
    import TextFluid from "$lib/components/text/TextFluid.svelte";
    import { Canvas, T } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";

    const elements = [TextFluid, Butterflies];

    let chosenElement = $state(0);
</script>

<main class="bg-stone-800 h-dvh">
    <Canvas renderMode="always">
        <T.PerspectiveCamera position={[0, 0, 10]} makeDefault>
            <OrbitControls />
        </T.PerspectiveCamera>
        {@const Element = elements[chosenElement]}

        <Element />
    </Canvas>
</main>

<button
    class="absolute top-1 right-1 bg-gray-700 rounded-md p-1 text-white cursor-pointer"
    onclick={() => {
        chosenElement++;
        if (chosenElement >= elements.length) chosenElement -= elements.length;
    }}
>
    Change scene
</button>
