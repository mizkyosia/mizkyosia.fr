varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vPosition = position;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    vUv = uv;

    gl_PointSize = -100.0/mvPosition.z;
}