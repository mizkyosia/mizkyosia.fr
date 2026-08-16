precision highp float;

uniform float uTime;

varying vec4 vColor;

void main() {

    gl_FragColor = vec4(vColor.y * 0.3, 0.4 + 0.4 * vColor.z, (1. - vColor.y) * 0.2, 1.);
}