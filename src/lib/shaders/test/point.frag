#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vPressureGrad;
varying float vDensity;
varying float vPressure;

uniform float uRestDensity;

float pressureThreshold = 2.0;

void main() {

    vec3 blue = vec3(0.0, 0.5, 0.8);
    vec3 orange = vec3(1.0, 0.5, 0.0);

    vec3 color = mix(blue, orange, vDensity / uRestDensity);
    // vec3 color = mix(black, white, vDensity);
    // vec3 color = vec3(vPressure);

    // if(abs(vPressure) < pressureThreshold)
    //     color = mix(blue, orange, (1.0 + vPressure / pressureThreshold) / 2.0);
    // else if(vPressure > 0.0)
    //     color = orange;
    // else if(vPressure < 0.0)
    //     color = blue;

    vec2 uv = gl_PointCoord * 2.0 - 1.0;

    float r2 = dot(uv, uv);

    if(r2 > 1.0)
        discard;

    float alpha = exp(-4.0 * r2);

    gl_FragColor = vec4(color, alpha);
}