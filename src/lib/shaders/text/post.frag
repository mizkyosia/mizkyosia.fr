#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uScene;
uniform float uTime;
uniform vec2 uScreen;

varying vec2 vUV;

const vec3 purpleDark = vec3(0.561, 0.247, 0.443);
const vec3 purpleLight = vec3(0.447, 0.196, 0.353);
const vec3 white = vec3(0.984, 0.945, 0.78);
const vec3 yellow = vec3(0.98, 0.741, 0.184);
const vec3 gray = vec3(0.125, 0.125, 0.125);

const float resolution = 5.0;
const float frequency = 40.0;
const float speed = 0.1;
const float width = 0.4;

const float speeds[5] = float[5](0.1, 0.05, -0.15, 0.2, -0.12);
const float thicknesses[5] = float[5](0.1, 0.2, 0.08, 0.12, 0.05);

void main() {

    vec4 color = texture2D(uScene, vUV);

    if(color.a > 0.9) {
        // if(color.r > 0.6)
        //     gl_FragColor = vec4(yellow, 1.0);
        // else if(color.b < 0.6)
        //     gl_FragColor = vec4(white, 1.0);
        // else
        //     gl_FragColor = vec4(gray, 1.0);

        if(color.r > 0.6)
            gl_FragColor = vec4(gray, 1.0);
        else if(color.b < 0.6)
            gl_FragColor = vec4(yellow, 1.0);
        else
            gl_FragColor = vec4(white, 1.0);

        return;
    }

    // ============== Compute waves

    vec2 uv = vUV;
    float time = fract(uTime);

    // Infinite scrolling    
    uv.y = fract(uv.y + uTime * speed);

    // resolution number of bands
    vec2 band = floor(uv * resolution) / resolution;
    vec2 bandUv = (uv - band) * resolution;

    int bandIndex = int(band.y * resolution);

    // Change scale based on viewport height
    float mult = 1024. / uScreen.y;

    float yValue = (sin((uv.x * uScreen.x * mult / 2000. + (uTime * speeds[bandIndex])) * frequency) * width + 1.) / 2.;

    float xValue = (cos((uv.x * uScreen.x * mult / 2000. + (uTime * speeds[bandIndex])) * frequency) * width + 1.) / 2.;

    // Final color
    vec3 col = purpleLight;

    if(abs(bandUv.y - yValue) < thicknesses[bandIndex] && abs(bandUv.y - xValue) > thicknesses[bandIndex])
        col = purpleDark;

    // Output to screen
    gl_FragColor = vec4(col, 1.0);
}