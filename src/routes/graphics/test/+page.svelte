<script lang="ts">
    import Fluid from "$lib/components/Fluid.svelte";
    import { onMount } from "svelte";
    import {
        BoxGeometry,
        Mesh,
        MeshBasicMaterial,
        PerspectiveCamera,
        PlaneGeometry,
        Points,
        Scene,
        ShaderMaterial,
        Vector3,
        WebGLRenderer,
        PointsMaterial,
        AdditiveBlending,
        LineBasicMaterial,
    } from "three";
    import Stats from "stats.js";
    import { gruvbox } from "$lib";

    //! =========== Shaders
    import fragmentShader from "$lib/shaders/test/point.frag?raw";
    import vertexShader from "$lib/shaders/test/point.vert?raw";
    import DragInput from "$lib/components/DragInput.svelte";

    //! =========== States
    let settingsOpen = $state(true);

    let playing = $state(false),
        debugChunks = $state(false),
        debugPoints = $state(false),
        particleSize = $state(600),
        densityRadius = $state(1),
        densityRest = $state(10),
        pressureStiffness = $state(10),
        reboundMult = $state(0.7),
        chunksCount = $state({
            x: 4,
            y: 4,
            z: 1,
        });

    let canvas = $state<HTMLCanvasElement>();

    let renderer = $state.raw<WebGLRenderer>();

    let fluid = $state<Fluid>();

    let boxGeometry = $derived(
        new BoxGeometry(
            chunksCount.x * densityRadius,
            chunksCount.y * densityRadius,
            chunksCount.z * densityRadius,
            chunksCount.x,
            chunksCount.y,
            chunksCount.z,
        ),
    );

    //! ========== Base variables/constants
    const scene = new Scene(),
        camera = new PerspectiveCamera();

    camera.position.set(0, 0, -10);
    camera.lookAt(new Vector3());

    const chunks = new Mesh(
        boxGeometry,
        new MeshBasicMaterial({ color: gruvbox.aquaLight, wireframe: true }),
    );
    scene.add(chunks);

    let step = false;

    $effect(() => {
        chunks.geometry = boxGeometry;
        chunks.visible = debugChunks;
    });

    onMount(async () => {
        const stats = new Stats();

        renderer = new WebGLRenderer({ canvas });
        canvas?.parentElement?.appendChild(stats.dom);
        const controls = new (
            await import("three/examples/jsm/controls/OrbitControls.js")
        ).OrbitControls(camera, renderer.domElement);

        renderer.setClearAlpha(0);

        controls.update();

        const shadedPoints = new Points(
            fluid!.getGeometry(),
            new ShaderMaterial({
                vertexShader,
                fragmentShader,
                depthTest: false,
                depthWrite: false,
                blending: AdditiveBlending,
                uniforms: {
                    uPointSize: { value: particleSize },
                },
            }),
        );
        const rawPoints = new Points(
            fluid!.getGeometry(),
            new PointsMaterial({
                sizeAttenuation: true,
                color: "#ffffff",
                size: 0.1,
            }),
        );
        scene.add(shadedPoints, rawPoints);

        let t = performance.now();

        function update() {
            stats.begin();

            const now = performance.now(),
                dt = now - t;

            if (playing || step) {
                fluid?.tick(dt / 1000);
                step = false;
            }

            t = now;

            shadedPoints.material.uniforms.uPointSize.value = particleSize;
            rawPoints.visible = debugPoints;

            renderer?.render(scene, camera);

            stats.end();
            requestAnimationFrame(update);
        }

        update();

        resizeCanvas(window.innerWidth, window.innerHeight);
    });

    function resizeCanvas(x: number, y: number) {
        if (!renderer) return;
        renderer.setSize(x, y);
        camera.aspect = x / y;
        camera.updateProjectionMatrix();
    }
</script>

<svelte:window
    onresize={(e) =>
        resizeCanvas(e.currentTarget.innerWidth, e.currentTarget.innerHeight)}
/>

<canvas bind:this={canvas} class="bg-[#282828]"></canvas>

{#if renderer !== undefined}
    <Fluid
        {renderer}
        {camera}
        {scene}
        bind:this={fluid}
        {densityRadius}
        {reboundMult}
        {chunksCount}
        {densityRest}
        {pressureStiffness}
    />
{/if}

<div class="absolute right-2 top-2 bg-[#3c3836]/80 text-white">
    <button
        class="text-center bg-[#458588] w-full cursor-pointer"
        onclick={() => (settingsOpen = !settingsOpen)}
        >Settings {settingsOpen ? "▲" : "▼"}</button
    >
    <div
        class={{
            "grid grid-cols-2 gap-1 gap-x-6 p-2 box-border transition-all justify-between content-between items-center": true,
            "h-0 overflow-hidden py-0": !settingsOpen,
        }}
    >
        <button onclick={() => (step = true)} class="col-span-2 bg-[#282828] p-1">Step</button>
        <span>Playing ?</span>
        <input class="h-4" type="checkbox" bind:checked={playing} />
        <span> Debug chunks </span>
        <input class="h-4" type="checkbox" bind:checked={debugChunks} />
        <span> Debug points </span>
        <input class="h-4" type="checkbox" bind:checked={debugPoints} />
        <span> Particle size </span>
        <DragInput
            bind:value={particleSize}
            cssClass={"bg-[#282828] p-1"}
            multiplier={10}
            min={0}
            max={10000}
        />
        <span> Rebound mult </span>
        <DragInput
            bind:value={reboundMult}
            cssClass={"bg-[#282828] p-1"}
            multiplier={0.01}
            min={0}
            max={1}
        />
        <span> Rest density </span>
        <DragInput
            bind:value={densityRest}
            cssClass={"bg-[#282828] p-1"}
            multiplier={0.1}
            min={0.1}
            max={100}
        />
        <span> Pressure stiffness </span>
        <DragInput
            bind:value={pressureStiffness}
            cssClass={"bg-[#282828] p-1"}
            multiplier={1}
            min={1}
            max={1000}
        />
        <span> Chunks count </span>
        <div class="flex flex-row gap-2">
            <DragInput
                bind:value={chunksCount.x}
                cssClass={"bg-[#282828] p-1"}
                multiplier={1}
                min={1}
                max={100}
            />
            <DragInput
                bind:value={chunksCount.y}
                cssClass={"bg-[#282828] p-1"}
                multiplier={1}
                min={1}
                max={100}
            />
        </div>
    </div>
</div>
