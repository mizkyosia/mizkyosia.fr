<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { Canvas, T, useTask } from "@threlte/core";
	import { Environment, Grid, OrbitControls } from "@threlte/extras";
	import { setContext } from "svelte";

	let { children } = $props();
	let ctx = $state({ deltaTime: new Array(10).fill(1 / 60), nextIndex: 0 });
	setContext("deltaTime", ctx);

	let averageFps = $derived(
		Math.floor(
			ctx.deltaTime.length / ctx.deltaTime.reduce((a, b) => a + b),
		),
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<main class="bg-stone-800 h-dvh">
	<Canvas renderMode="always">
		{@render children()}

		<T.PerspectiveCamera
			makeDefault
			position={[0, 0, 5]}
			// zoom={100}
			oncreate={(ref) => {
				ref.lookAt(0, 0, 0);
			}}
		>
			<OrbitControls />
		</T.PerspectiveCamera>

		<Environment url="/shanghai_riverside_1k.hdr" />

		<Grid
			position.y={-1}
			rotation.x={Math.PI / 2}
			cellColor="#ffffff"
			sectionColor="#ffffff"
			sectionThickness={0}
			fadeDistance={75}
			infiniteGrid
			cellSize={1}
		/>

		<T.PointLight position={[10, 10, 10]} intensity={1} />
	</Canvas>

	<div class="text-orange-500 absolute z-50 top-0">
		Average FPS : {averageFps}
	</div>
</main>
