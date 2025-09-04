import { rng } from "./util";

export function animateText(element: HTMLElement, transitionLength: number, frameLength: number) {
    const endText = element.innerText;
    let frame = 0;

    const timer = setInterval(() => {
        const idx = Math.floor(frame / transitionLength);
        if (idx == endText.length) {
            element.innerText = endText;
            clearInterval(timer);
            return;
        }

        element.innerText = endText.substring(0, idx) + String.fromCharCode(rng(0x21, 0x7E));
        frame++;
    }, frameLength);
}