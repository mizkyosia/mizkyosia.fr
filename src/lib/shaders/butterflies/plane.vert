
varying vec2 vPos;

void main() {
    vec4 pos = vec4(position, 1.0);

    vPos = pos.xy;

    gl_Position = projectionMatrix * modelViewMatrix * pos;
}