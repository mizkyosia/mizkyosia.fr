<script lang="ts">
    import vertexShader from "$lib/shaders/butterflies/grass.vert?raw";
    import fragmentShader from "$lib/shaders/butterflies/grass.frag?raw";
    import planeVertexShader from "$lib/shaders/butterflies/plane.vert?raw";
    import planeFragmentShader from "$lib/shaders/butterflies/plane.frag?raw";

    import noiseTexturePath from "$lib/assets/noise.png";

    import { getVisibleSize } from "$lib";
    import { T, useTask, useThrelte } from "@threlte/core";
    import { onMount } from "svelte";
    import {
        BufferAttribute,
        BufferGeometry,
        DoubleSide,
        InstancedMesh,
        MathUtils,
        Object3D,
        PerspectiveCamera,
        PlaneGeometry,
        ShaderMaterial,
        TextureLoader,
        Uniform,
        Vector2,
    } from "three";

    interface Props {
        grassWidth?: number;
        grassHeight?: number;
        grassSizeVariation?: number;
        grassCount?: number;

        butterfliesDistance?: number;

        text?: string;
    }

    const {
        grassCount = 20000,
        grassHeight = 0.4,
        grassWidth = 0.1,
        grassSizeVariation = 0.8,

        butterfliesDistance = 0.15,

        text = "HELLO:3",
    }: Props = $props();

    // Grass blade
    const vertices = [
        -grassWidth / 2,
        0,
        0, // Bottom left
        grassWidth / 2,
        0,
        0, // Bottom right
        0,
        0,
        grassHeight, // Top
    ];
    const indices = [0, 1, 2];

    const textureLoader = new TextureLoader();
    const noiseTexture = textureLoader.load(noiseTexturePath);

    const screenSize = new Vector2(),
        cameraSize = new Vector2();
    const uTime = new Uniform(0),
        uSeed = new Uniform(
            new Vector2(Math.random(), Math.random()).multiplyScalar(4096),
        );

    const { camera, scene } = useThrelte();

    let plane: PlaneGeometry;

    const geometry = new BufferGeometry();
    geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(vertices), 3),
    );
    geometry.setIndex(indices);

    // Shaders
    const material = new ShaderMaterial({
        side: DoubleSide,
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime,
            uSeed,
        },
    });

    const mesh = new InstancedMesh(geometry, material, grassCount);

    // For alignment
    const dummy = new Object3D();

    onMount(() => {
        screenSize.set(window.innerWidth, window.innerHeight);
        getVisibleSize(camera.current as PerspectiveCamera, cameraSize);

        plane.scale(cameraSize.x, cameraSize.y, 1);

        dummy.scale.set(1, 1);

        // Scatter grass blades
        for (let i = 0; i < grassCount; i++) {
            // Random position inside the field
            dummy.position.set(
                MathUtils.mapLinear(
                    Math.random(),
                    0,
                    1,
                    -cameraSize.x / 2,
                    cameraSize.x / 2,
                ),
                MathUtils.mapLinear(
                    Math.random(),
                    0,
                    1,
                    -cameraSize.y / 2,
                    cameraSize.y / 2,
                ),
            );
            dummy.rotateZ(Math.random() * Math.PI * 2);
            dummy.scale.z = MathUtils.mapLinear(
                Math.random(),
                0,
                1,
                grassSizeVariation,
                1,
            );

            dummy.updateMatrix();

            mesh.setMatrixAt(i, dummy.matrix);
        }

        // Notify GPU of update
        mesh.instanceMatrix.needsUpdate = true;

        scene.add(mesh);

        // Cleanup
        return () => {
            scene.remove(mesh);
            geometry.dispose();
            mesh.dispose();
        };
    });

    useTask((dt) => {
        uTime.value += dt / 1000;
    });
</script>

<T.Mesh>
    <T.ShaderMaterial
        vertexShader={planeVertexShader}
        fragmentShader={planeFragmentShader}
        uniforms={{
            uTime,
            uSeed
        }}
    />
    <T.PlaneGeometry bind:ref={plane} />
</T.Mesh>
