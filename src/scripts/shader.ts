import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";

import shaderBufferA from "../assets/shaders/bufferA.glsl?raw";
import shaderBufferB from "../assets/shaders/bufferB.glsl?raw";
import shaderImage from "../assets/shaders/image.glsl?raw";

const MOUSE_REACTIVITY = 0.15;
const TARGET_FPS = 50;
const FPS_SAMPLE_SIZE = 60;
const RESOLUTION_SCALE_MIN = 0.3;
const RESOLUTION_SCALE_MAX = 1.0;

const canvas = document.querySelector<HTMLCanvasElement>("#shader")!;
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
const gl = renderer.getContext();
renderer.autoClear = false;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const quad = new THREE.PlaneGeometry(2, 2);

const sceneA = new THREE.Scene();
const sceneB = new THREE.Scene();
const sceneImage = new THREE.Scene();

/**
 * Wraps a ShaderToy `mainImage` into a complete fragment shader, declaring exactly
 * the uniforms the pass needs.
 */
function buildFrag(opts: {
    needsMouse?: boolean;
    needsChannel0?: boolean;
    needsTime?: boolean;
    source: string;
}) {
    const lines = [
        "#include <common>",
        "precision highp float;"
    ];

    lines.push("uniform vec3 iResolution;");
    if (opts.needsMouse) lines.push("uniform vec4 iMouse;");
    if (opts.needsChannel0) lines.push("uniform sampler2D iChannel0;");
    if (opts.needsTime) lines.push("uniform float iTime;");

    lines.push(opts.source.trim());
    lines.push("void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }");

    return lines.join('\n');
}

const uniformsA = {
    iResolution: { value: new THREE.Vector3() },
    iMouse: { value: new THREE.Vector4() },
    iTime: { value: 0 },
    iScrollProgress: { value: 0 }
};

const uniformsB = {
    iResolution: { value: new THREE.Vector3() },
    iChannel0: { value: null as unknown as THREE.Texture },
    iTime: { value: 0 },
    iScrollProgress: { value: 0 }
};

const uniformsImage = {
    iResolution: { value: new THREE.Vector3() },
    iChannel0: { value: null as unknown as THREE.Texture },
    iScrollProgress: { value: 0 }
};

let fpsHistory = new Array(FPS_SAMPLE_SIZE).fill(0);
let fpsHistoryIndex = 0;
let fpsHistoryCount = 0;
let lastFrameTime = 0;
let currentResolutionScale = 1.0;

let usingMobileGpu = false;
const dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
if (dbgRenderInfo) {
    const model = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
    
    const mobileVendors = [
        "ARM",
        "QUALCOMM"
    ];

    const mobileModels = [
        "MALI-",
        "LLVMPIPE",
        "SWIFTSHADER",
        "ADRENO",
        "XCLIPSE",
        "HD GRAPHICS",
        "UHD GRAPHICS"
    ];

    if (
        (typeof vendor === "string" && mobileVendors.includes(vendor.trim().toUpperCase())) ||
        (typeof model === "string" && mobileModels.includes(model.trim().toUpperCase()))
    ) {
        console.log("Mobile GPU detected. Using low detail mode.");
        usingMobileGpu = true;
    }
}

if (usingMobileGpu) {
    currentResolutionScale = 0.5;
}

const shaderBufferAProlog = (
    !usingMobileGpu ? (/*glsl*/`
        const float RAYMARCH_MIN_DIST = 0.3;
        const float RAYMARCH_MAX_DIST = 50.0;
        const float RAYMARCH_HIT_CUTOFF = 0.001;
        const int RAYMARCH_MAX_ITERS = 32;
    `) : (/*glsl*/`
        const float RAYMARCH_MIN_DIST = 0.3;
        const float RAYMARCH_MAX_DIST = 10.0;
        const float RAYMARCH_HIT_CUTOFF = 0.01;
        const int RAYMARCH_MAX_ITERS = 16;
    `)
);

const shaderImageProlog = (
    !usingMobileGpu ? (/*glsl*/`
        const float BLOOM_SAMPLES = 16.0;
    `) : (/*glsl*/`
        const float BLOOM_SAMPLES = 32.0;
    `)
);

const matA = new THREE.ShaderMaterial({
    fragmentShader: buildFrag({ needsMouse: true, needsTime: true, source: shaderBufferAProlog + shaderBufferA }),
    uniforms: uniformsA,
});

const matB = new THREE.ShaderMaterial({
    fragmentShader: buildFrag({ needsChannel0: true, needsTime: true, source: shaderBufferB }),
    uniforms: uniformsB,
});

const matImage = new THREE.ShaderMaterial({
    fragmentShader: buildFrag({ needsChannel0: true, source: shaderImageProlog + shaderImage }),
    uniforms: uniformsImage,
});

sceneA.add(new THREE.Mesh(quad, matA));
sceneB.add(new THREE.Mesh(quad, matB));
sceneImage.add(new THREE.Mesh(quad, matImage));

let rtA = makeRenderTarget();
let rtB = makeRenderTarget();

uniformsB.iChannel0.value = rtA.texture;
uniformsImage.iChannel0.value = rtB.texture;

let actualMouseX = 0, actualMouseY = 0;
let lerpedMouseX = 0, lerpedMouseY = 0;

let lastTime = 0, timeBasis = 0;

window.addEventListener("pointermove", e => {
    const rect = canvas.getBoundingClientRect();
    actualMouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    actualMouseY = (rect.bottom - e.clientY) * (canvas.height / rect.height);
});

window.addEventListener("blur", () => {
    // The shader goes kinda crazy with large values of t, reset them when the user switches tabs
    if (lastTime > timeBasis + 30) {
        console.log(`Time basis fast-forwarded to ${lastTime}`);
        timeBasis = lastTime;
    }
});

function resizeRendererToDisplaySize(r: THREE.WebGLRenderer) {
    const c = r.domElement;
    const width = Math.floor(c.clientWidth * devicePixelRatio * currentResolutionScale);
    const height = Math.floor(c.clientHeight * devicePixelRatio * currentResolutionScale);
    const needResize = c.width !== width || c.height !== height;

    if (needResize) {
        r.setSize(width, height, false);
    }

    return needResize;
}

function makeRenderTarget() {
    const { width, height } = renderer.domElement;
    const rt = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType,
    });

    rt.texture.generateMipmaps = false;
    return rt;
}

function updateResUniforms() {
    const { width, height } = renderer.domElement;
    const res = new THREE.Vector3(width, height, 1);
    uniformsA.iResolution.value.copy(res);
    uniformsB.iResolution.value.copy(res);
    uniformsImage.iResolution.value.copy(res);
}

function onResize() {
    if (resizeRendererToDisplaySize(renderer)) {
        rtA.dispose();
        rtB.dispose();
        rtA = makeRenderTarget();
        rtB = makeRenderTarget();
        uniformsB.iChannel0.value = rtA.texture;
        uniformsImage.iChannel0.value = rtB.texture;
        updateResUniforms();
    }
}

function measureFPS(currentTime: number) {
    if (lastFrameTime > 0) {
        const frameDelta = currentTime - lastFrameTime;
        const currentFPS = 1000 / frameDelta;
        
        fpsHistory[fpsHistoryIndex] = currentFPS;
        fpsHistoryIndex = (fpsHistoryIndex + 1) % FPS_SAMPLE_SIZE;
        if (fpsHistoryCount < FPS_SAMPLE_SIZE) {
            fpsHistoryCount++;
        }
        
        if (fpsHistoryCount >= 10) {
            let sum = 0;
            for (let i = 0; i < fpsHistoryCount; i++) {
                sum += fpsHistory[i];
            }

            const averageFPS = sum / fpsHistoryCount;
            adjustResolution(averageFPS);
        }
    }

    lastFrameTime = currentTime;
}

function adjustResolution(averageFPS: number) {
    let targetScale = currentResolutionScale;
    
    if (averageFPS < TARGET_FPS * 0.9) {
        targetScale = Math.max(currentResolutionScale * 0.95, RESOLUTION_SCALE_MIN);
    }
    else if (averageFPS > TARGET_FPS * 1.1 && currentResolutionScale < RESOLUTION_SCALE_MAX) {
        targetScale = Math.min(currentResolutionScale * 1.02, RESOLUTION_SCALE_MAX);
    }
    
    if (Math.abs(targetScale - currentResolutionScale) > 0.02) {
        currentResolutionScale = targetScale;
        console.log(`Resolution scale adjusted to ${currentResolutionScale.toFixed(2)} (FPS: ${averageFPS.toFixed(1)})`);
        
        onResize();
        fpsHistoryCount = 0;
        fpsHistoryIndex = 0;
    }
}

const scrollAnchors = document.querySelectorAll<HTMLElement>(".bg-scroll-anchor");

let scrollAnchorPositions: number[] | null = null;
let smoothedScrollProgress = 0;

function render(timeMs: number) {
    measureFPS(timeMs);
    
    lastTime = timeMs;
    const timeSeconds = (timeMs - timeBasis) * 0.001

    onResize();
    updateResUniforms();

    uniformsA.iTime.value = timeSeconds;
    uniformsB.iTime.value = timeSeconds;

    let t = NaN;

    if (scrollAnchorPositions == null) {
        scrollAnchorPositions = [...scrollAnchors].map(x => x.getBoundingClientRect().top);
        scrollAnchorPositions[0] = 0;
        scrollAnchorPositions[scrollAnchors.length - 1] = document.body.scrollHeight;
    }

    for (let i = 0; i < scrollAnchors.length - 1; i++) {
        const a = scrollAnchorPositions[i];
        const b = scrollAnchorPositions[i + 1];
        const scrollY = document.body.scrollTop;

        if (!(scrollY >= a && scrollY <= b))
            continue;

        const height = b - a;
        const scroll = scrollY - a;

        t = (scroll / height) + i;
        break;
    }

    if (isNaN(t)) {
        console.error(`No scroll anchors found for y=${window.scrollY}.`, scrollAnchors, scrollAnchorPositions);
        t = scrollAnchors.length;
    }
    else {
        smoothedScrollProgress = lerp(smoothedScrollProgress, t, 0.05);
    }

    uniformsA.iScrollProgress.value = smoothedScrollProgress;
    uniformsB.iScrollProgress.value = smoothedScrollProgress;
    uniformsImage.iScrollProgress.value = smoothedScrollProgress;
    
    lerpedMouseX = lerp(lerpedMouseX, actualMouseX, MOUSE_REACTIVITY);
    lerpedMouseY = lerp(lerpedMouseY, actualMouseY, MOUSE_REACTIVITY);

    uniformsA.iMouse.value.set(lerpedMouseX, lerpedMouseY, 0, 0);

    // Pass A -> rtA
    renderer.setRenderTarget(rtA);
    renderer.render(sceneA, camera);

    // Pass B (reads A) -> rtB
    renderer.setRenderTarget(rtB);
    renderer.render(sceneB, camera);

    // Final Image (reads B) -> screen
    renderer.setRenderTarget(null);
    renderer.render(sceneImage, camera);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
