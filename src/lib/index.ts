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

export const gruvbox = {
    redLight: '#fb4934',
    greenLight: '#b8bb26',
    yellowLight: '#fabd2f',
    blueLight: '#83a598',
    purpleLight: '#d3869b',
    aquaLight: '#8ec07c',
    orangeLight: '#fe8019',

    gray: '#928374',

    grayDark0: '#282828',
    grayDark1: '#3c3836',
    grayDark2: '#504945',
    grayDark3: '#665c54',
    grayDark4: '#7c6f64',

    grayLight0: '#fbf1c7',
    grayLight1: '#ebdbb2',
    grayLight2: '#d5c4a1',
    grayLight3: '#bdae93',
    grayLight4: '#a89984',
}

export function getVisibleSize(camera: THREE.PerspectiveCamera, size: THREE.Vector2) {
    // Source - https://stackoverflow.com/a/13351534
    // Posted by WestLangley, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-08-12, License - CC BY-SA 4.0

    const vFOV = THREE.MathUtils.degToRad(camera.fov); // convert vertical fov to radians

    const height = 2 * Math.tan(vFOV / 2) * Math.abs(camera.position.z); // visible height

    const width = height * camera.aspect;           // visible width

    size.set(width, height);
}