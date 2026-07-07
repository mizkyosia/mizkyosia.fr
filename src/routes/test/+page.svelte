<script lang="ts">
    import { T } from "@threlte/core";
    import * as THREE from "three";

    import { FontLoader } from "three/addons/loaders/FontLoader.js";
    import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
    import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

    import fontJson from "$lib/assets/helvetiker_regular.typeface.json";

    const font = new FontLoader().parse(fontJson);

    const depth = 0;
    const pointCount = 1000;

    //
    // Create the text geometry
    //
    const textGeometry = new TextGeometry("Test", {
        font,
        size: 2,
        depth,
        curveSegments: 12,
        bevelEnabled: false,
        steps: 1,
    });

    console.log("Text geometry : ", textGeometry);

    textGeometry.center();

    //
    // Build the sampler
    //
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(textGeometry))
        .setWeightAttribute("weight")
        .build();

    //
    // Sample points
    //
    const accepted: THREE.Vector3[] = [];
    const candidate = new THREE.Vector3();

    const minDistance = 0.05;

    while (accepted.length < pointCount) {
        sampler.sample(candidate);

        let valid = true;

        for (const p of accepted) {
            if (p.distanceToSquared(candidate) < minDistance * minDistance) {
                valid = false;
                break;
            }
        }

        if (valid) {
            accepted.push(candidate.clone());
        }
    }

    //
    // Geometry for the points
    //
    const particles = new THREE.BufferGeometry();

    particles.setAttribute(
        "position",
        new THREE.BufferAttribute(
            new Float32Array(accepted.flatMap((v) => v.toArray())),
            3,
        ),
    );
</script>

<T.Mesh scale={10}>
    <T.PlaneGeometry />
    <T.MeshStandardMaterial
        color={"#00ff00"}
        toneMapped={false}
        metalness={1.0}
        roughness={0.1}
    />
</T.Mesh>

<T.Points geometry={particles}>
    <T.PointsMaterial color="white" size={0.03} sizeAttenuation />
</T.Points>
