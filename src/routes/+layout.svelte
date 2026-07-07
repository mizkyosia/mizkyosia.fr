<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { Canvas, T } from "@threlte/core";
	import { Environment, Grid, OrbitControls } from "@threlte/extras";

	let { children } = $props();
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
			cellColor="#ffffff"
			sectionColor="#ffffff"
			sectionThickness={0}
			fadeDistance={75}
			infiniteGrid
			cellSize={1}
		/>

		<T.PointLight position={[10, 10, 10]} intensity={1} />
	</Canvas>
</main>
