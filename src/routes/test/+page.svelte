<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import * as THREE from "three";

    import { FontLoader } from "three/addons/loaders/FontLoader.js";
    import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
    import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

    import fontJson from "$lib/fonts/helvetiker_regular.typeface.json";
    import heavyDataFont from "$lib/fonts/HeavyDataNerdFont-Regular.ttf?url";
    import { getContext } from "svelte";

    const movingParticles = new Set<number>();
    const chunks = new Map<`${number},${number}`, Set<number>>();
    const font = new FontLoader().parse(fontJson);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const depth = 0,
        pointCount = 5000,
        chunkSize = 1,
        colorDistance = 1,
        rippleDistance = 0.5,
        rippleStrength = 1,
        effectStrength = 10;

    const { camera, renderer } = useThrelte();

    let pointerPos = $state(new THREE.Vector3()),
        pointerPreviousPos = new THREE.Vector3(),
        pointerDelta = new THREE.Vector3(),
        pointerNDC = new THREE.Vector3();

    //
    // Create the text geometry
    //
    const textGeometry = new TextGeometry("COMING SOON", {
        font,
        size: 2,
        depth,
        curveSegments: 12,
        bevelEnabled: false,
        steps: 1,
    });

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
    let tries = 0;

    const ctx = getContext("deltaTime");

    //
    // ////////// BUFFER/TEMP VARIABLES FOR OPTIMIZATION
    //

    const __pos = new THREE.Vector3(),
        __delta = new THREE.Vector3(),
        __zero = new THREE.Vector3();

    // Raycast
    const ray = new THREE.Ray(camera.current.position, __pos);

    while (accepted.length < pointCount && tries < 2 * pointCount) {
        sampler.sample(candidate);

        let valid = true;

        forEachNearbyPoint(candidate, (p) => {
            if (
                accepted[p].distanceToSquared(candidate) <
                minDistance * minDistance
            ) {
                valid = false;
                return true; // Early return
            }
        });

        if (valid) {
            chunks
                .getOrInsertComputed(
                    getChunkCoordsString(candidate),
                    () => new Set(),
                )
                .add(accepted.length);
            accepted.push(candidate.clone());
        } else {
            tries++;
        }
    }

    //
    // Geometry for the points
    //
    const particles = new THREE.BufferGeometry();
    const particlesPosition = new THREE.BufferAttribute(
        new Float32Array(accepted.flatMap((v) => v.toArray())),
        3,
    );
    const particlesColor = new THREE.BufferAttribute(
        new Float32Array(accepted.length * 3).map((_, i) =>
            i % 3 == 2 ? 0.5 : 0,
        ),
        3,
    );

    particles.setAttribute("color", particlesColor);
    particles.setAttribute("position", particlesPosition);

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

        const coords = getChunkCoords(pos);

        for (let x = coords.x - chunkSpan; x <= coords.x + chunkSpan; x++)
            for (let y = coords.y - chunkSpan; y <= coords.y + chunkSpan; y++) {
                const chunk = chunks.get(`${x},${y}`);
                // Early return if needed
                if (chunk) for (const p of chunk) if (callback(p)) return;
            }
    }

    function getChunkCoords(pos: THREE.Vector3): THREE.Vector3 {
        return __pos.copy(pos).divideScalar(chunkSize).floor();
    }

    function getChunkCoordsString(
        pos: THREE.Vector3 | [number, number, number] | [number, number],
    ): `${number},${number}` {
        if (pos instanceof THREE.Vector3)
            return `${Math.floor(pos.x / chunkSize)},${Math.floor(pos.y / chunkSize)}`;
        return `${Math.floor(pos[0] / chunkSize)},${Math.floor(pos[1] / chunkSize)}`;
    }

    function movePoint(
        p: number,
        delta: THREE.Vector3,
        absolute: boolean = false,
    ) {
        const x = particlesPosition.getX(p),
            y = particlesPosition.getY(p);

        const chunkPos = getChunkCoordsString([x, y]);

        const newX = delta.x + (absolute ? 0 : x),
            newY = delta.y + (absolute ? 0 : y);

        particlesPosition.setXY(p, newX, newY);

        // Update chunk position
        const newChunkPos = getChunkCoordsString([newX, newY]);
        if (chunkPos !== newChunkPos) {
            chunks.get(chunkPos)?.delete(p);
            chunks.getOrInsertComputed(newChunkPos, () => new Set()).add(p);
        }
    }

    function moveBackPoints(dt: number) {
        // Lerp particles back to their origin spots
        for (const p of movingParticles) {
            const startPos = accepted[p],
                x = particlesPosition.getX(p),
                y = particlesPosition.getY(p);

            __pos.set(x, y);

            const dist = Math.sqrt(
                Math.pow(x - pointerPos.x, 2) + Math.pow(y - pointerPos.y, 2),
            );

            // Color normalized to [0, 1]
            const color = Math.max(0, colorDistance - dist) / colorDistance;
            particlesColor.setXYZ(p, color, 0, (1 - color) / 2);

            // If we're back to start, remove it from the moving particles
            if (__pos.set(x, y).distanceToSquared(startPos) < 1e-6) {
                movingParticles.delete(p);
                continue;
            }

            movePoint(p, __pos.lerp(startPos, effectStrength * dt), true);
        }
    }

    // For average FPS calculations
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

        forEachNearbyPoint(
            pointerPreviousPos,
            (p) => {
                particlesColor.setXYZ(p, 0, 0, 0.5);
            },
            colorDistance,
        );

        forEachNearbyPoint(
            pointerPos,
            (p) => {
                const x = particlesPosition.getX(p),
                    y = particlesPosition.getY(p);

                const distSquared =
                        Math.pow(x - pointerPos.x, 2) +
                        Math.pow(y - pointerPos.y, 2),
                    dist = Math.sqrt(distSquared);

                const t = THREE.MathUtils.clamp(1 - dist / colorDistance, 0, 1);

                const influence = THREE.MathUtils.smoothstep(t, 0, 1);

                particlesColor.setXYZ(p, influence, 0, (1 - influence) / 2);

                __delta
                    .copy(pointerDelta)
                    .multiplyScalar(
                        Math.max(0, rippleDistance - dist) * rippleStrength,
                    );

                // Move point
                movePoint(p, __delta);
                movingParticles.add(p);
            },
            colorDistance,
        );

        ctx.deltaTime[ctx.nextIndex] = dt;
        ctx.nextIndex = (ctx.nextIndex + 1) % ctx.deltaTime.length;

        particlesPosition.needsUpdate = true;
        particlesColor.needsUpdate = true;
    });
</script>

<svelte:document onpointermove={movePointer} />

<T.Mesh scale={10}>
    <T.PlaneGeometry />
    <T.MeshBasicMaterial color={"#000000"} />
</T.Mesh>

<T.Points position={[0, 0, 0.01]} geometry={particles}>
    <T.PointsMaterial size={0.08} sizeAttenuation vertexColors />
</T.Points>

<T.Mesh position={pointerPos.toArray()} scale={0.1}>
    <T.SphereGeometry />

    <T.MeshBasicMaterial color={"#ff0000"} />
</T.Mesh>
