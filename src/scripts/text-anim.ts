import { rng, shuffle } from "./util";

export function animateTyping(element: HTMLElement, transitionLength: number, frameLength: number) {
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

export function animateObfuscation(element: HTMLElement, frameLength: number, obfuscatedPercentage: number) {
    const endText = element.innerText;

    let obfuscatedIndices = [...Array(endText.length).keys()]
        .filter(i => endText[i] != "\n" && endText[i] != " ");

    shuffle(obfuscatedIndices);

    const toRemove = Math.floor((1.0 - obfuscatedPercentage) * obfuscatedIndices.length);
    for (let i = 0; i < toRemove; i++) {
        obfuscatedIndices.pop();
    }

    const timer = setInterval(() => {
        if (obfuscatedIndices.length == 0) {
            element.innerText = endText;
            clearInterval(timer);
            return;
        }

        let str = [...endText];
        for (const idx of obfuscatedIndices) {
            str[idx] = String.fromCharCode(rng(0x21, 0x7E));
        }

        element.innerText = str.join("");
        obfuscatedIndices.pop();
    }, frameLength);
}