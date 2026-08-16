precision highp float;

const float windStrength = 15.;
const float windSpeed = 500.;
const vec2 windDir = normalize(vec2(0.3, 0.7));

uniform float uTime;
uniform vec2 uSeed;

varying vec2 vPos;

float rand(vec2 c) {
    return fract(sin(dot(c.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float hermite(float t) {
    return t * t * (3.0 - 2.0 * t);
}

float noise(vec2 co, float frequency) {
    vec2 v = vec2(co.x * frequency, co.y * frequency);

    float ix1 = floor(v.x);
    float iy1 = floor(v.y);
    float ix2 = floor(v.x + 1.0);
    float iy2 = floor(v.y + 1.0);

    float fx = hermite(fract(v.x));
    float fy = hermite(fract(v.y));

    float fade1 = mix(rand(vec2(ix1, iy1)), rand(vec2(ix2, iy1)), fx);
    float fade2 = mix(rand(vec2(ix1, iy2)), rand(vec2(ix2, iy2)), fx);

    return mix(fade1, fade2, fy);
}

float pnoise(vec2 co, float freq, int steps, float persistence) {
    float value = 0.0;
    float ampl = 1.0;
    float sum = 0.0;
    for(int i = 0; i < steps; i++) {
        sum += ampl;
        value += noise(co, freq) * ampl;
        freq *= 2.0;
        ampl *= persistence;
    }
    return value / sum;
}

void main() {
    vec2 seededPos = vPos + uSeed;

    vec4 noiseValue = vec4(0., // Ignore displacement
    pnoise(seededPos, 0.2, 5, 0.4),                     // Base color variation (independent of time)
    pnoise(uTime * windSpeed * windDir + seededPos, 0.6, 35, 0.5), // Pseudo-light
    1.0);

    gl_FragColor = vec4(noiseValue.y * 0.3, 0.4 + 0.4 * noiseValue.z, (1. - noiseValue.y) * 0.2, 1.);
}