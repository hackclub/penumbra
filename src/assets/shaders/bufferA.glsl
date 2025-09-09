/*---[ penumbra.hackclub.com ]---------------------------*\
|                                                         |
|  This shader was created for Hack Club Penumbra.        |
|  Create a shader, get a free poster of it in return!    |
|  For teenagers 18 and under.                            |
|                                                         |
\*-------------------------------------------------------*/

/*----------------------*\
|  > Constants           |
\*----------------------*/

const float RAYMARCH_MIN_DIST   = 0.3;
const float RAYMARCH_MAX_DIST   = 50.0;
const float RAYMARCH_HIT_CUTOFF = 0.001;
const int   RAYMARCH_MAX_ITERS  = 32;

const float CAMERA_FOV = 0.3;
const vec3  LIGHT_POS  = vec3(-2.0, 2.0, -1.0);

const float DEG2RAD     = PI / 180.0;
const float MAX_ANIM_SPEED  = 1.0;
const float MIN_ANIM_SPEED  = 0.1;

/*----------------------------*\
|  > Custom uniforms           |
\*----------------------------*/
uniform float iScrollProgress;

/*----------------------*\
|  > Utilities           |
\*----------------------*/

float clamp01(float x) { return clamp(x, 0.0, 1.0); }
vec3 clamp01(vec3 x)   { return clamp(x, 0.0, 1.0); }

vec3 rotateX(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotateY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotateZ(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

void partialLerp(inout vec3 current, vec3 to, inout float t) {
    if (t > 1.0) {
        t -= 1.0;
        current = to;
        return;
    }

    if (t < 0.0) {
        return;
    }

    current = mix(current, to, t);
    t = -1.0;
}

/*----------------------*\
|  > Rendering           |
\*----------------------*/

float sdSphere(vec3 p, float scale) {
    p /= scale;
    return (length(p) - 1.0) * scale;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdDisplacement(vec3 p) {
    return (
        sin(2.0 * p.x) *
        sin(2.4 * p.y) *
        sin(2.0 * p.z)
    );
}

vec3 transformTwist(vec3 p, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 q = vec3(m * p.xz, p.y);
    return q;
}

// Gets the signed distance of the scene.
float sdScene(vec3 p) {
    
    //float t = iTime / 10.0;
    // -iMouse.z / 640.0
    float t = iScrollProgress;
    float animSpeed = mix(MAX_ANIM_SPEED, MIN_ANIM_SPEED, clamp01(t)); 

    vec2 normMouse = iMouse.xy / iResolution.xy;
    float mouseDivisor = 12.0 + (t * 10000.0);

    // Torus offset based on scroll position
    vec3 torusPagePos = vec3(0.0, 0.0, 0.0);
    partialLerp(torusPagePos, vec3(4.0, 0.0, 0.0), t);
    partialLerp(torusPagePos, vec3(4.5, 0.0, 0.0), t);

    vec3 torusPos = p;
    torusPos -= vec3(
        normMouse.x / mouseDivisor + torusPagePos.x,
        normMouse.y / mouseDivisor + torusPagePos.y,
        torusPagePos.z
    );
    
    torusPos = rotateX(torusPos, DEG2RAD * 20.0);
    torusPos = rotateZ(torusPos, DEG2RAD * mod( (-25.0 + (iTime * animSpeed)), 360.0 ));
    torusPos = transformTwist(torusPos, 1.00 + (87.0 / 15.0));
    
    float torusDist = sdTorus(torusPos, vec2(2.5, 1.0));
    float displacement = sdDisplacement(torusPos);

    return torusDist - (displacement / 5.0);
}

// Determines the distance to the scene, starting from the origin, in the given direction.
// If nothing was hit, a value higher than RAYMARCH_MAX_DIST is returned.
// out_minDist holds the smallest distance from the ray to the scene. This variable can be used to e.g. create glow.
float raymarch(vec3 rayOrigin, vec3 rayDir, out float out_minDist) {
    float totalDist = 0.3;

    out_minDist = 1e9; // arbitrarily large value

    for (int i = 0; i < RAYMARCH_MAX_ITERS; i++) {
        vec3 p = rayOrigin + (rayDir * totalDist); // position along the ray

        float dist = sdScene(p); // current distance to the scene
        totalDist += dist;

        out_minDist = min(dist, out_minDist);

        if (dist < RAYMARCH_HIT_CUTOFF)
            break; // early stop if close enough

        if (totalDist > RAYMARCH_MAX_DIST)
            break; // early stop if too far
    }

    return totalDist;
}

vec3 palette(float t) {
  const vec3 a = vec3(0.350, 0.350, 0.350);
  const vec3 b = vec3(0.500, 0.500, 0.500);
  const vec3 c = vec3(0.300, 0.500, 0.700);
  const vec3 d = vec3(0.000, 0.200, 0.400);

  return a + b * cos(2.0*PI * (c * t + d));
}

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 screenUv = fragCoord.xy / iResolution.xy;

    vec3 ro = vec3(0, 0, -3);
    vec3 rd = normalize(vec3(uv * CAMERA_FOV, 1));

    float minDist;
    float dist = raymarch(ro, rd, /* out */ minDist);
    
    if (dist > RAYMARCH_MAX_DIST) {
        // We didn't hit anything.
        float glowStrength = 1.0 - clamp01(minDist);
        out_fragColor = vec4(palette(minDist) * glowStrength, 1.00);
        return;
    }
    
    vec3 p = ro + (rd * dist);
    vec3 color = palette(dist / 16.0);
  
    out_fragColor = vec4(color, 1);
}
