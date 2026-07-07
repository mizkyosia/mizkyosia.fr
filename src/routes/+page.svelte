<script lang="ts">
    import { T, useLoader } from "@threlte/core";
    import {
        interactivity,
        Grid,
        Text,
        OrbitControls,
        Align,
        Environment,
    } from "@threlte/extras";
    import { Spring } from "svelte/motion";
    import { BufferAttribute, BufferGeometry, Color, Mesh } from "three";
    import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
    import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

    interactivity({
        filter: (events) => {
            return events.filter((event) => {
                event;
            });
        },
    });

    const scale = new Spring(1);
    let test = $state();

    // Setup point geometry
    const pointGeometry = new BufferGeometry();
    const positions = new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]);
    pointGeometry.setAttribute("position", new BufferAttribute(positions, 3));

    const textGeometry = $state<TextGeometry | undefined>(new TextGeometry("T"));
    const textMesh = $state(new Mesh(textGeometry));

    const sample = $state(new MeshSurfaceSampler(textMesh));
</script>

<Align>
    {#snippet children({ align })}
        
        <T is={textMesh}>
            <T.MeshStandardMaterial
                color={"#00ff00"}
                toneMapped={false}
                metalness={1.0}
                roughness={0.1}
            />
        </T>
    {/snippet}
</Align>

<Text
    text="Threlte"
    fontSize={0.5}
    color={new Color().setRGB(0.5, 1, 0.5)}
    position={[0, -1, 0]}
/>

<T.Points position={[0, 0, 0]}>
    <T is={pointGeometry} />
    <T.PointsMaterial color={new Color().setRGB(1, 0.5, 0)} size={1} />
</T.Points>

<T.AmbientLight />
