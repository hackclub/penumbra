/*---[ penumbra.hackclub.com ]---------------------------*\
|                                                         |
|  This shader was created for Hack Club Penumbra.        |
|  Create a shader, get a free poster of it in return!    |
|  For teenagers 18 and under.                            |
|                                                         |
\*-------------------------------------------------------*/

//
// This pass was adapted from Xor's CRT shader implementation.
// You can find it over at https://www.shadertoy.com/view/DtscRf! <3
//
// Bloom based on Xor's 1-pass blur: https://github.com/XorDev/1PassBlur
//

const float BLOOM_RADIUS  = 16.0; // Bloom radius in pixels
const float BLOOM_SAMPLES = 32.0; // Bloom texture samples
const float BLOOM_BASE    = 0.50; // Bloom base brightness
const float BLOOM_GLOW    = 3.00; // Bloom glow brightness

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    //float t = min(1.00, iTime / 10.0);
    float t = 0.00;
 
    float bloomBase = mix(1.00, BLOOM_BASE, t);
    float bloomGlow = mix(0.00, BLOOM_GLOW, t);

    // Resolution and texel size
    vec2 res = iResolution.xy;
    vec2 texel = 1.0 / res;
    
   	vec4 bloom = vec4(0);
    vec2 point = vec2(BLOOM_RADIUS, 0) * inversesqrt(BLOOM_SAMPLES);

    for (float i = 0.0; i < BLOOM_SAMPLES; i++) {
        // Rotate by golden angle
        point *= -mat2(0.7374, 0.6755, -0.6755, 0.7374);

        // Compute sample coordinates from rotated sample point
        vec2 coord = (fragCoord + point * sqrt(i)) * texel;

        // Add bloom samples
        bloom += texture(iChannel0, coord) * (1.0 - i / BLOOM_SAMPLES);
    }

    bloom *= bloomGlow / BLOOM_SAMPLES;
    bloom += texture(iChannel0, fragCoord / res) * bloomBase;

    out_fragColor = bloom;
}
