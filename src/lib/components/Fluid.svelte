<script lang="ts">
    import { spiky, spikyGrad } from "$lib/kernels";
    import {
        Box3,
        BufferAttribute,
        BufferGeometry,
        Camera,
        Scene,
        Vector3,
        WebGLRenderer,
        type Vector3Like,
    } from "three";

    interface Props {
        particleCount?: number;
        particleSize?: number;

        densityRadius?: number;
        densityRest?: number;

        gravity?: number;

        pressureStiffness?: number;

        chunksCount?: Vector3Like;
        chunkSize?: number;

        reboundMult?: number;

        // ThreeJS
        renderer: WebGLRenderer;
        scene: Scene;
        camera: Camera;
    }

    type Chunk = Set<number>;
    interface ChunkUpdate {
        old: Chunk;
        new: Chunk;
        particle: number;
    }

    let {
        particleCount = 100,
        particleSize = $bindable(0.1),

        chunkSize = $bindable(1),

        densityRadius = $bindable(chunkSize),
        densityRest = $bindable(10),

        gravity = $bindable(9.8),

        pressureStiffness = $bindable(4),

        chunksCount = { x: 4, y: 4, z: 1 },

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
    const chunkUpdates: ChunkUpdate[] = [];
    const bounds = new Box3(
        new Vector3(chunksCount.x, chunksCount.y, chunksCount.z)
            .multiplyScalar(densityRadius / 2)
            .negate(),
        new Vector3(chunksCount.x, chunksCount.y, chunksCount.z).multiplyScalar(
            densityRadius / 2,
        ),
    );

    $effect(() => {
        chunksCount;
        bounds.min
            .set(chunksCount.x, chunksCount.y, chunksCount.z)
            .multiplyScalar(densityRadius / 2)
            .negate();
        bounds.max
            .set(chunksCount.x, chunksCount.y, chunksCount.z)
            .multiplyScalar(densityRadius / 2);
    });

    // Variables

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

        // Compute pressure
        for (let i = 0; i < particleCount; i++) {
            pressure[i] = pressureStiffness * (density[i] - densityRest);
        }

        // console.log(density);

        // Update position
        for (let i = 0; i < particleCount; i++) {
            let x = position[3 * i],
                y = position[3 * i + 1],
                vx = velocity[3 * i],
                vy = velocity[3 * i + 1],
                ax = 0,
                ay = 0; // Add gravity later

            const oldChunk = getChunk(x, y);

            // Calculate forces
            eachNearbyParticle(x, y, (j) => {
                let dx = x - position[3 * j],
                    dy = y - position[3 * j + 1];

                let r2 = dx * dx + dy * dy,
                    r;

                // Pick random direction
                if (r2 === 0) {
                    let a = Math.random() * Math.PI * 2;
                    dx = Math.cos(a);
                    dy = Math.sin(a);
                    r = 1;
                    r2 = 1;
                } else r = Math.sqrt(r2);

                const influence =
                    (spikyGrad(r, densityRadius) *
                        (pressure[i] + pressure[j])) /
                    (2 * Math.max(density[j], 1e-12));

                if (isNaN(density[j]) || density[j] === 0) console.log("test");

                // Add normalized direction
                ax += (-influence * dx) / r;
                ay += (-influence * dy) / r;
            });

            vx += ax * dt;
            vy += ay * dt;
            x += vx * dt;
            y += vy * dt;

            // Check out of bounds
            if (x < bounds.min.x + particleSize) {
                x = bounds.min.x + particleSize;
                vx = reboundMult * Math.abs(vx);
            } else if (x > bounds.max.x - particleSize) {
                x = bounds.max.x - particleSize;
                vx = -reboundMult * Math.abs(vx);
            }
            if (y < bounds.min.y + particleSize) {
                y = bounds.min.y + particleSize;
                vy = reboundMult * Math.abs(vy);
            } else if (y > bounds.max.y - particleSize) {
                y = bounds.max.y - particleSize;
                vy = -reboundMult * Math.abs(vy);
            }

            positionNext[3 * i] = x;
            positionNext[3 * i + 1] = y;
            velocityNext[3 * i] = vx;
            velocityNext[3 * i + 1] = vy;

            // Chunk change
            const newChunk = getChunk(x, y);
            if (newChunk !== oldChunk)
                chunkUpdates.push({
                    old: oldChunk,
                    new: newChunk,
                    particle: i,
                });
        }

        updateBuffers();

        // Update chunks
        for (let update of chunkUpdates.splice(0)) {
            update.old.delete(update.particle);
            update.new.add(update.particle);
        }
    }

    //! ============== Effects
</script>
