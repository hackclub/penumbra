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

const float MASK_INTENSITY = 1.0;
const float MASK_SIZE      = 12.0; // Mask size (in pixels)
const float MASK_BORDER    = 0.8; // Border intensity (0 to 1)

// Chromatic abberration offset in texels (0 = no aberration)
const vec2 ABERRATION_OFFSET = vec2(2, 0);

const float SCREEN_CURVATURE = 0.08;
const float SCREEN_VIGNETTE  = 0.4;

const float PULSE_INTENSITY = 0.03; // Intensity of pulsing animation
const float PULSE_WIDTH = 60.0; // Pulse width in pixels (times tau)
const float PULSE_RATE = 20.0; // Pulse animation speed

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    //float t = min(1.00, iTime / 10.0);
    float t = 0.00;

    float maskIntensity = mix(0.0, MASK_INTENSITY, t);
    float maskBorder = mix(0.0, MASK_BORDER, t);
    vec2 aberrationOffset = mix(vec2(0, 0), ABERRATION_OFFSET, t);
    float screenCurvature = mix(0.0, SCREEN_CURVATURE, t);
    float screenVignette = mix(0.0, SCREEN_VIGNETTE, t);
    float pulseIntensity = mix(0.0, PULSE_INTENSITY, t);
    float maskSize = mix(1.0, MASK_SIZE, t);

	vec2 res = iResolution.xy;
	vec2 uv = (fragCoord / res) * 2.0 - 1.0;

    // Scale inward using the square of the distance
	uv *= 1.0 + (dot(uv,uv) - 1.0) * screenCurvature;
    // Convert back to pixel coordinates
	vec2 pixel = (uv * 0.5 + 0.5) * res;
    
    // Square distance to the edge
    vec2 edge = max(1.0 - uv*uv, 0.0);
    // Compute vignette from x/y edges
    float vignette = pow(edge.x * edge.y, screenVignette);
	
    // RGB cell and subcell coordinates
    vec2 coord = pixel / maskSize;
    vec2 subcoord = coord * vec2(3,1);

    // Offset for staggering every other cell
	vec2 cellOffset = vec2(0, fract(floor(coord.x) * 0.5));
    
    // Pixel coordinates rounded to the nearest cell
    vec2 maskCoord = floor(coord + cellOffset) * maskSize;
    
    // Chromatic aberration
	vec4 aberration = texture(iChannel0, (maskCoord - aberrationOffset) / res);
	aberration.g    = texture(iChannel0, (maskCoord + aberrationOffset) / res).g;
   
	vec4 color = aberration;
    
    // Compute the RGB color index from 0 to 2
    float ind = mod(floor(subcoord.x), 3.0);

    // Convert that value to an RGB color (multiplied to maintain brightness)
    vec3 maskColor = vec3(ind == 0.0, ind == 1.0, ind == 2.0) * 3.0;
    
    // Signed subcell uvs (ranging from -1 to +1)
    vec2 cellUv = fract(subcoord + cellOffset) * 2.0 - 1.0;

    // X and y borders
    vec2 border = 1.0 - cellUv * cellUv * maskBorder;

    // Blend x and y mask borders
    maskColor.rgb *= border.x * border.y;

    // Blend with color mask
	color.rgb *= 1.0 + (maskColor - 1.0) * maskIntensity;  
    
    // Apply vignette
    color.rgb *= vignette;

    // Apply pulsing glow
	color.rgb *= 1.0 + pulseIntensity * cos(pixel.x / PULSE_WIDTH + iTime * PULSE_RATE);
    
    out_fragColor = color;
}