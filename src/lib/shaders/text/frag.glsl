#ifdef GL_ES
precision mediump float;
#endif

uniform vec3 uPointer; // Cursor position
uniform float uRadius; // Circle radius
uniform float uTime;

varying vec3 vPosition; // Particle position

void main() {

    float dist = length(vPosition.xy - uPointer.xy);

    float influence = max(0.0, 1.0 - dist / uRadius);

    vec3 color = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), influence);

    vec2 uv = gl_PointCoord * 2.0 - 1.0;

    if(dot(uv, uv) > 1.0)
        discard;

    float r = length(uv);

    float alpha = smoothstep(1.0, 0.9, r);

    gl_FragColor = vec4(color, alpha);
}