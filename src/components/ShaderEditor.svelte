<script lang="ts">
  import * as THREE from "three";
  import { glsl } from "codemirror-lang-glsl";

  import { EditorView } from "codemirror";
  import { drawSelection, highlightActiveLine, dropCursor, highlightSpecialChars, keymap, rectangularSelection, crosshairCursor, lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
  import { EditorState } from "@codemirror/state";
  import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, HighlightStyle } from "@codemirror/language";
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
  import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
  import { tags } from "@lezer/highlight";

  import { onMount } from "svelte";

  let { initialCode }: {
    initialCode: string
  } = $props();

  let editorElement: HTMLElement;
  let previewElement: HTMLCanvasElement;
  let shaderErrors: string[] = $state([]);

  onMount(() => {
    function buildShader(code: string) {
      return /*glsl*/`
        #include <common>
        
        uniform vec3 iResolution;
        
        // ${Math.random()}
        ${code}

        void main() {
          gl_FragColor = vec4(fn(gl_FragCoord.xy / iResolution.xy), 1.0);
        }
      `;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: previewElement });
    renderer.autoClear = false;
    renderer.debug.onShaderError = (gl, program, glVertShader, glFragShader) => {
      const errors = gl.getShaderInfoLog(glFragShader)!.trim();
      
      shaderErrors = errors.split("\n")
        .filter(x => !x.includes("\0"))
        .map(x => {
          const matches = /^ERROR: ([0-9]+):([0-9]+): (.+)/.exec(x);
          if (!matches)
            return x;

          return `ERROR at line ${parseInt(matches[2]) - 137}: ${matches[3]}`;
        });
        
      console.error(`Shader compilation failed!\n\n${errors}`);
    };

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const scene = new THREE.Scene();
    const plane = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      iResolution: { value: new THREE.Vector3(previewElement.width, previewElement.height, 0) }
    };

    const mesh = new THREE.Mesh(plane);

    scene.add(mesh);
    
    function refresh(code: string) {
      shaderErrors = [];
      mesh.material = new THREE.ShaderMaterial({
        uniforms,
        fragmentShader: buildShader(code)
      });

      renderer.render(scene, camera);
    }

    refresh(initialCode);

    new EditorView({
      parent: editorElement,
      doc: initialCode,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          indentWithTab
        ]),
        glsl(),
        syntaxHighlighting(HighlightStyle.define([
          { tag: tags.comment, class: "code-tag-comment" },
          { tag: tags.keyword, class: "code-tag-keyword" },
          { tag: tags.typeName, class: "code-tag-keyword" }
        ])),
        // EditorView.theme({
        //   "&": {
        //     fontSize: "1.25em"
        //   }
        // }),
        EditorView.updateListener.of(ev => {
          if (!ev.docChanged)
            return;

          refresh(ev.state.doc.toString().trim());
        })
      ]
    });
  });
</script>

<div class="shader-editor">
  <div class="editor-container">
    <div bind:this={editorElement} class="editor"></div>
    <div class="errors">
      {#each shaderErrors as error}
        <div class="error">{error}</div>
      {/each}
    </div>
  </div>

  <canvas bind:this={previewElement} class="preview" width="300" height="200"></canvas>
</div>

<style lang="scss">
  .shader-editor {
    display: flex;
    flex-direction: row;
    gap: 1em;

    > .editor-container {
      width: 100%;

      > .errors {
        display: flex;
        flex-direction: column;
        background: #fff;
        color: #000;
        
        > * {
          width: 100%;
          padding: 0 1em;

          &:first-child { padding-top: 1em; }
          &:last-child { padding-bottom: 1em; }
        }
      }

      > .editor {
        color: #FFFFFF;
        background: #0009;
        border: 1px solid #fff;
        width: 100%;

        :global {
          * {
            font-family: Nothing, monospace !important;
          }

          .cm-content { padding: .5em; }
          .cm-gutter {
            padding-left: .5em;
          }

          .cm-editor .cm-cursor {
            border-left: 2px solid white;
            transform: translateX(2px);
          }

          .code-tag-comment { color: #A4A4A4; }
          .code-tag-keyword { color: #FFA352; }
        }
    }
    }

    > .preview {
      border: 1px solid white;
      background: black;
    }
  }
</style>

