<script lang="ts">
    import { spiky } from "$lib/kernels";
    import {
        Box3,
        BufferAttribute,
        BufferGeometry,
        Camera,
        Scene,
        Vector3,
        WebGLRenderer,
    } from "three";

    interface Props {
        particleCount?: number;
        particleSize?: number;

        densityRadius?: number;
        densityRest?: number;

        gravity?: number;

        pressureStiffness?: number;

        chunksCount?: Vector3;
        chunkSize?: number;

        reboundMult?: number;

        // ThreeJS
        renderer: WebGLRenderer;
        scene: Scene;
        camera: Camera;
    }

    type Chunk = Set<number>;

    let {
        particleCount = 100,
        particleSize = $bindable(0.1),

        chunkSize = $bindable(1),

        densityRadius = $bindable(chunkSize),
        densityRest = $bindable(10),

        gravity = $bindable(-9.8),

        pressureStiffness = $bindable(4),

        chunksCount = $bindable(new Vector3(4, 4, 1)),

        reboundMult = $bindable(0.7),
    }: Props = $props();

    $effect(() => {
        particleCount;

        console.warn(
            "Do not change particle count on the fly, it will not be applied",
        );
    });

    // Instantiate buffers
    let position = new Float32Array(particleCount * 3),
        positionNext = new Float32Array(particleCount * 3),
        velocity = new Float32Array(particleCount * 3),
        velocityNext = new Float32Array(particleCount * 3),
        density = new Float32Array(particleCount),
        pressure = new Float32Array(particleCount);

    const positionAttribute = new BufferAttribute(position, 3),
        velocityAttribute = new BufferAttribute(velocity, 3);

    const particlesGeometry = new BufferGeometry();
    particlesGeometry
        .setAttribute("position", positionAttribute)
        .setAttribute("velocity", velocityAttribute)
        .setAttribute("density", new BufferAttribute(density, 1))
        .setAttribute("pressure", new BufferAttribute(pressure, 1));

    // Constants
    const chunks: Chunk[][] = [];
    const bounds = new Box3(
        chunksCount
            .clone()
            .multiplyScalar(densityRadius / 2)
            .negate(),
        chunksCount.clone().multiplyScalar(densityRadius / 2),
    );

    // Variables
    let densityRadiusPrev = $state.snapshot(densityRadius);

    // States
    const densityRadiusSqr = $derived(densityRadius * densityRadius);

    // Setup particles
    for (let i = 0; i < particleCount; i++) {
        let x = Math.random() * (bounds.max.x - bounds.min.x) + bounds.min.x;
        let y = Math.random() * (bounds.max.y - bounds.min.y) + bounds.min.x;

        position[3 * i] = x;
        position[3 * i + 1] = y;

        getChunk(x, y).add(i);
    }

    //! =============== Functions

    export function getGeometry() {
        return particlesGeometry;
    }

    function updateBuffers() {
        // Swap position
        let tmp = position;
        positionAttribute.array = positionNext;
        position = positionNext;
        positionNext = tmp;

        // Swap velocity
        tmp = velocity;
        velocityAttribute.array = velocityNext;
        velocity = velocityNext;
        velocityNext = tmp;

        // Trigger updates
        particlesGeometry.attributes.position.needsUpdate = true;
        particlesGeometry.attributes.velocity.needsUpdate = true;
        particlesGeometry.attributes.density.needsUpdate = true;
        particlesGeometry.attributes.pressure.needsUpdate = true;
    }

    function getChunk(x: number, y: number): Chunk {
        let cx = Math.floor((x - bounds.min.x) / chunkSize),
            cy = Math.floor((y - bounds.min.y) / chunkSize);

        let chunk = chunks[cy]?.[cx];

        if (chunk === undefined) {
            if (chunks[cy] === undefined) chunks[cy] = [];
            chunk = new Set();
            chunks[cy][cx] = chunk;
            return chunk;
        } else return chunk;
    }

    function eachNearbyParticle(
        x: number,
        y: number,
        callback: (j: number) => any,
    ) {
        let cx = Math.floor((x - bounds.min.x) / densityRadius),
            cy = Math.floor((y - bounds.min.y) / densityRadius);

        for (let y = Math.max(cy - 1, 0); y < cy + 1; y++) {
            if (chunks[y] === undefined) continue;
            for (let x = Math.max(cx - 1, 0); x < cx + 1; x++) {
                if (chunks[y][x] === undefined) continue;
                for (let j of chunks[y][x]) callback(j);
            }
        }
    }

    function computeDensity(x: number, y: number) {
        let dens = 0;
        eachNearbyParticle(x, y, (j) => {
            let dx = position[3 * j] - x,
                dy = position[3 * j + 1] - y,
                distSq = dx * dx + dy * dy;

            if (distSq < densityRadiusSqr) {
                const influence = spiky(distSq, densityRadiusSqr);
                dens += influence;
            }
        });
        return dens;
    }

    export function tick(dt: number) {
        // Compute densities
        for (let i = 0; i < particleCount; i++) {
            density[i] = computeDensity(position[3 * i], position[3 * i + 1]);
        }

        // Update position
        for (let i = 0; i < particleCount; i++) {
            positionNext[3 * i] = position[3 * i];
            positionNext[3 * i + 1] = position[3 * i + 1];
        }

        updateBuffers();
    }

    //! ============== Effects
    $effect(() => {
        densityRadiusPrev = $state.snapshot(densityRadius);
    });
</script>
