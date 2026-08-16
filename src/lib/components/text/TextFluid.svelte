<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import * as THREE from "three";
    import { onMount, type Snippet } from "svelte";

    import vertexShader from "$lib/shaders/text/vert.glsl?raw";
    import fragmentShader from "$lib/shaders/text/frag.glsl?raw";
    import postVertexShader from "$lib/shaders/text/post.vert?raw";
    import postFragmentShader from "$lib/shaders/text/post.frag?raw";
    import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
    import { useFBO } from "@threlte/extras";
    import { getPointsEvenly } from "$lib/text";

    interface Props {
        chunkSize?: number;
        colorDistance?: number;
        rippleDistance?: number;
        rippleStrength?: number;
        effectStrength?: number;
        pushbackStrength?: number;

        size?: THREE.Vector3;
    }

    const {
        chunkSize = 1,
        colorDistance = 1.2,
        rippleDistance = 0.6,
        rippleStrength = 100,
        effectStrength = 10,
        pushbackStrength = 25,

        size = $bindable(new THREE.Vector3()),
    }: Props = $props();

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const movingParticles = new Set<number>();
    const chunks: Set<number>[][] = [];

    const { camera, renderer, renderStage, scene } = useThrelte();
    const target = useFBO();

    const uScene = new THREE.Uniform(target.texture);
    const uTime = new THREE.Uniform(0);
    const uScreen = new THREE.Uniform(new THREE.Vector2());
    const uFov = new THREE.Uniform(0);

    let accepted: number[] = [];
    let bounds: THREE.Box3;

    let pointerPos = $state(new THREE.Vector3()),
        pointerPreviousPos = new THREE.Vector3(),
        pointerDelta = new THREE.Vector3(),
        pointerNDC = new THREE.Vector3();

    //
    // ////////// BUFFER/TEMP VARIABLES FOR OPTIMIZATION
    //
    const __pos = new THREE.Vector3(),
        __delta = new THREE.Vector3(),
        __zero = new THREE.Vector3();

    // Raycast
    const ray = new THREE.Ray(camera.current.position, __pos);

    //
    // Geometry for the points
    //
    const particles = new THREE.BufferGeometry();
    let particlesPosition: THREE.BufferAttribute;

    const shaderMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uPointer: {
                value: pointerPos,
            },
            uRadius: {
                value: 2,
            },
            uPointSize: {
                value: 0.5,
            },
            uTime: uTime.clone(),
            uScreen,
            uFov,
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
    });

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

    function forEachNearbyPoint(
        pos: THREE.Vector3,
        callback: (p: number) => void | boolean,
        chunkSpan: number = 1,
    ) {
        chunkSpan = Math.ceil(chunkSpan);

        for (
            let x = pos.x - chunkSpan * chunkSize;
            x <= pos.x + chunkSpan * chunkSize;
            x += chunkSize
        )
            for (
                let y = pos.y - chunkSpan * chunkSize;
                y <= pos.y + chunkSpan * chunkSize;
                y += chunkSize
            ) {
                // Early return if needed
                for (const p of getChunk(x, y)) if (callback(p)) return;
            }
    }

    function getChunk(x: number, y: number): Set<number> {
        const cx = Math.floor((x - bounds.min.x) / chunkSize),
            cy = Math.floor((y - bounds.min.y) / chunkSize);

        let row = chunks[cy];
        if (row === undefined) {
            row = [];
            chunks[cy] = row;
        }

        let col = row[cx];
        if (col === undefined) {
            col = new Set();
            row[cx] = col;
        }

        return col;
    }

    function moveBackPoints(dt: number) {
        // Lerp particles back to their origin spots
        for (const p of movingParticles) {
            const startX = accepted[3 * p],
                startY = accepted[3 * p + 1],
                x = particlesPosition.getX(p),
                y = particlesPosition.getY(p),
                dx = x - startX,
                dy = y - startY;

            __pos.set(x, y);

            // If we're back to start, remove it from the moving particles
            if (dx * dx + dy * dy < 1e-6) {
                movingParticles.delete(p);
                continue;
            }

            particlesPosition.setXY(
                p,
                THREE.MathUtils.lerp(x, startX, effectStrength * dt),
                THREE.MathUtils.lerp(y, startY, effectStrength * dt),
            );
        }
    }

    useTask((dt) => {
        moveBackPoints(dt);

        // Fetch new delta + position
        // Transfer old value
        pointerPreviousPos.copy(pointerPos);

        ray.set(camera.current.position, pointerNDC);

        // Intersection with plane (z=0), or fallback to old value
        pointerPos = ray.intersectPlane(plane, __zero)?.clone() ?? pointerPos;

        // Update delta position
        pointerDelta.subVectors(pointerPos, pointerPreviousPos);

        const pointerVel = pointerDelta.length();

        forEachNearbyPoint(
            pointerPos,
            (p) => {
                const x = particlesPosition.getX(p),
                    y = particlesPosition.getY(p);

                __pos.set(x - pointerPos.x, y - pointerPos.y, 0);

                const distSquared = __pos.lengthSq(),
                    dist = Math.sqrt(distSquared);

                __delta
                    .copy(pointerDelta)
                    // Ripple effect
                    .multiplyScalar(rippleStrength)
                    // Pointer avoidance effect (multiplied by pointer pseudo-velocity)
                    .add(
                        __pos.multiplyScalar(
                            pushbackStrength * (1 + 10 * pointerVel),
                        ),
                    )
                    .multiplyScalar(
                        THREE.MathUtils.smoothstep(
                            Math.max(0, 1 - dist / rippleDistance),
                            0,
                            1,
                        ) * dt,
                    );

                // Move point
                particlesPosition.setXY(p, __delta.x + x, __delta.y + y);
                movingParticles.add(p);
            },
            colorDistance,
        );

        shaderMat.uniforms.uTime.value = Date.now() / 1000;
        shaderMat.uniforms.uPointer.value.copy(pointerPos);

        particlesPosition.needsUpdate = true;

        uTime.value += dt;
    });

    const material = new THREE.ShaderMaterial({
        fragmentShader: postFragmentShader,
        uniforms: {
            uScene,
            uTime,
            uScreen,
        },
        vertexShader: postVertexShader,
    });

    const quad = new FullScreenQuad(material);

    useTask(
        () => {
            const last = renderer.getRenderTarget();
            renderer.setRenderTarget(target);
            renderer.render(scene, camera.current);
            renderer.setRenderTarget(last);
            quad.render(renderer);
        },
        {
            stage: renderStage,
        },
    );

    function resize() {
        // Update shader uniform
        uScreen.value.set(window.innerWidth, window.innerHeight);

        const cam = camera.current as THREE.PerspectiveCamera;

        bounds.getSize(size);

        // Add margin
        size.multiplyScalar(1.2);

        const aspect = window.innerWidth / window.innerHeight;
        const vFov = THREE.MathUtils.degToRad(cam.fov);

        // Horizontal FOV derived from vertical FOV and aspect ratio
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

        // Distance required to fit height and width
        const distanceForHeight = size.y / 2 / Math.tan(vFov / 2);
        const distanceForWidth = size.x / 2 / Math.tan(hFov / 2);

        const distance = Math.max(distanceForHeight, distanceForWidth);

        cam.position.z = distance;
        uFov.value = vFov;
    }

    onMount(() => {
        accepted = getPointsEvenly(0.1, "HELLO:3");
        particlesPosition = new THREE.BufferAttribute(
            new Float32Array(accepted),
            3,
        );
        particles.setAttribute("position", particlesPosition);

        // Compute bounds
        particles.computeBoundingBox();
        bounds = particles.boundingBox!;

        // Put particles in chunks
        for (let p = 0; p < particlesPosition.count; p++)
            getChunk(particlesPosition.getX(p), particlesPosition.getY(p)).add(
                p,
            );

        // Position camera correctly
        resize();

        // Cleanup on component destruction
        return () => {
            quad.dispose();
            material.dispose();
            particles.dispose();
            shaderMat.dispose();
        };
    });
</script>

<svelte:document onpointermove={movePointer} />
<svelte:window onresize={resize} />

<T.Points geometry={particles} material={shaderMat}></T.Points>
