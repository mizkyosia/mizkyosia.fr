import * as THREE from "three";


let v0 = new THREE.Vector2(),
    v1 = new THREE.Vector2(),
    v2 = new THREE.Vector2();

// place files you want to import through the `$lib` alias in this folder.
export function pointInTriangle(
    p: THREE.Vector2,
    a: THREE.Vector2,
    b: THREE.Vector2,
    c: THREE.Vector2
) {
    v0.subVectors(c, a);
    v1.subVectors(b, a);
    v2.subVectors(p, a);

    const dot00 = v0.dot(v0);
    const dot01 = v0.dot(v1);
    const dot02 = v0.dot(v2);
    const dot11 = v1.dot(v1);
    const dot12 = v1.dot(v2);

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);

    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return u >= 0 && v >= 0 && u + v <= 1;
}