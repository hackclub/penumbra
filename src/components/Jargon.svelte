<script lang="ts">
  import type { Snippet } from "svelte";

  let { description, children }: {
    description: string,
    children: Snippet
  } = $props();

  let definitionShown = $state(false);
  let definitionClass = $derived(`definition ${definitionShown ? "shown" : "hidden"}`);

  function handleEnter() {
    definitionShown = true;
  }

  function handleLeave() {
    definitionShown = false;
  }
</script>

<span class="jargon" role="term" onmouseenter={handleEnter} onmouseleave={handleLeave}>
  {@render children()}
  
  <span class={definitionClass} role="definition">
    {description}
  </span>
</span>

<style lang="scss">
  .jargon {
    position: relative;

    > .definition {
      position: absolute;
      display: block;
      background: black;
      padding: .5em;

      top: 100%;
      left: 100%;
      width: max-content;

      &.hidden {
        display: none;
      }
    }
  }
</style>
