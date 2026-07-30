// attribute vec3 position;
attribute vec3 velocity;
attribute float density;
attribute float pressure;
attribute vec2 pressureGrad;

// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;

uniform float uPointSize;

varying vec3 vPosition;
varying vec3 vVel;
varying vec2 vPressureGrad;
varying float vDensity;
varying float vPressure;

void main() {
    vVel = velocity;
    vDensity = density;
    vPressure = pressure;
    vPressureGrad = pressureGrad;

    // Transform vertex position to eye coordinates
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Scale point size inversely with distance (-z is distance in front of camera)
    float distance = length(-mvPosition.xyz);
    gl_PointSize = uPointSize / distance;
}