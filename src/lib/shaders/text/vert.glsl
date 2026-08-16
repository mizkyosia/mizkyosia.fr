varying vec3 vPosition;
varying vec2 vUv;

uniform vec2 uScreen;
uniform float uFov;

void main() {
    vPosition = position;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    vUv = uv;

    gl_PointSize = 0.8 *
        uScreen.y /
        (2.0 * tan(uFov * 0.5) * abs(mvPosition.z));
}