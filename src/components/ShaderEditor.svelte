<script lang="ts">
  import * as THREE from "three";
  import { glsl } from "codemirror-lang-glsl";

  import { EditorView, basicSetup } from "codemirror";
  import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
  import { tags } from "@lezer/highlight";

  let { initialCode }: {
    initialCode: string
  } = $props();

  let editorElement: HTMLElement;
  let previewElement: HTMLCanvasElement;

  $effect(() => {
    function buildShader(code: string) {
      return /*glsl*/`
        #include <common>
        
        uniform vec3 iResolution;
        
        ${code}

        void main() {
          gl_FragColor = vec4(fn(gl_FragCoord.xy / iResolution.xy), 1.0);
        }
      `;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: previewElement });
    renderer.autoClear = false;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const scene = new THREE.Scene();
    const plane = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      iResolution: { value: new THREE.Vector3(previewElement.width, previewElement.height, 0) }
    };

    const mesh = new THREE.Mesh(plane);

    scene.add(mesh);
    
    function refresh(code: string) {
      mesh.material = new THREE.ShaderMaterial({
        uniforms,
        fragmentShader: buildShader(code)
      });

      renderer.render(scene, camera);
    }

    refresh(initialCode);

    const editor = new EditorView({
      parent: editorElement,
      doc: initialCode,
      extensions: [
        basicSetup,
        glsl(),
        syntaxHighlighting(HighlightStyle.define([
          { tag: tags.comment, class: "code-tag-comment" },
          { tag: tags.keyword, class: "code-tag-keyword" },
          { tag: tags.typeName, class: "code-tag-keyword" }
        ])),
        EditorView.theme({
          "&": {
            fontSize: "1.25em"
          }
        }),
        EditorView.updateListener.of(ev => {
          if (!ev.docChanged)
            return;

          refresh(ev.state.doc.toString().trim());
        })
      ],
    });
  });
</script>

<div class="shader-editor">
  <div bind:this={editorElement} class="editor"></div>
  <canvas bind:this={previewElement} class="preview" width="600" height="200"></canvas>
</div>

<style lang="scss">
  .shader-editor {
    display: flex;
    flex-direction: column;
    gap: 1em;

    > .editor {
      color: #FFFFFF;

      :global {
        * {
          font-family: Nothing, monospace !important;
        }

        .cm-editor .cm-cursor {
          border-left: 2px solid white;
          transform: translateX(-2px);
        }

        .code-tag-comment { color: #A4A4A4; }
        .code-tag-keyword { color: #FFA352; }
      }
    }

    > .preview {
      border: 2px solid white;
      background: black;
    }
  }
</style>

