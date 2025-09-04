import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";

import shaderBufferA from "../assets/shaders/bufferA.glsl?raw";
import shaderBufferB from "../assets/shaders/bufferB.glsl?raw";
import shaderImage from "../assets/shaders/image.glsl?raw";

const MOUSE_REACTIVITY = 0.15;

const canvas = document.querySelector<HTMLCanvasElement>("#shader")!;
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
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
    const lines = ["#include <common>", "precision highp float;"];

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
    iTime: { value: 0 }
};

const uniformsImage = {
    iResolution: { value: new THREE.Vector3() },
    iChannel0: { value: null as unknown as THREE.Texture },
};

const matA = new THREE.ShaderMaterial({
    fragmentShader: buildFrag({ needsMouse: true, needsTime: true, source: shaderBufferA }),
    uniforms: uniformsA,
});

const matB = new THREE.ShaderMaterial({
    fragmentShader: buildFrag({ needsChannel0: true, needsTime: true, source: shaderBufferB }),
    uniforms: uniformsB,
});

const matImage = new THREE.ShaderMaterial({
    fragmentShader: buildFrag({ needsChannel0: true, source: shaderImage }),
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

window.addEventListener("pointermove", e => {
    const rect = canvas.getBoundingClientRect();
    actualMouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    actualMouseY = (rect.bottom - e.clientY) * (canvas.height / rect.height);
});

function resizeRendererToDisplaySize(r: THREE.WebGLRenderer) {
    const c = r.domElement;
    const width = Math.floor(c.clientWidth * devicePixelRatio);
    const height = Math.floor(c.clientHeight * devicePixelRatio);
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

function render(timeSecs: number) {
    const timeMs = timeSecs * 0.001;

    onResize();
    updateResUniforms();

    uniformsA.iTime.value = timeMs;
    uniformsB.iTime.value = timeMs;
    uniformsA.iScrollProgress.value = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
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