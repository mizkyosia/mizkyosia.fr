<script lang="ts">
    import { useThrelte } from "@threlte/core";
    import { onMount } from "svelte";
    import { Vector3 } from "three";

    const { renderer, camera } = useThrelte();

    // Stats
    const stats = new Stats();

    let pointerPos = $state(new Vector3()),
        pointerPreviousPos = new Vector3(),
        pointerDelta = new Vector3(),
        pointerNDC = new Vector3();

    //
    // Pointer 3D position
    //
    function movePointer(event: PointerEvent) {
        const rect = renderer.domElement.getBoundingClientRect();

        // Compute position
        pointerNDC
            .set(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1,
                0.5,
            )
            .unproject(camera.current)
            .sub(camera.current.position)
            .normalize();
    }

    onMount(() => {
        renderer.domElement.parentElement!.appendChild(stats.dom);
    });
</script>

<svelte:document onpointermove={movePointer} />
