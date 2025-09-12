import { rng, shuffle } from "./util";

const animatedComponents = new Set<HTMLElement>();

export function animateTyping(element: HTMLElement, transitionLength: number, frameLength: number) {
    if (animatedComponents.has(element))
        return;

    const endText = element.innerText;
    let frame = 0;

    animatedComponents.add(element);
    const timer = setInterval(() => {
        const idx = Math.floor(frame / transitionLength);
        if (idx == endText.length) {
            element.innerText = endText;
            animatedComponents.delete(element);
            clearInterval(timer);
            return;
        }

        element.innerText = endText.substring(0, idx) + String.fromCharCode(rng(0x21, 0x7E));
        frame++;
    }, frameLength);
}

export function animateObfuscation(element: HTMLElement, frameLength: number, obfuscatedPercentage: number) {
    if (animatedComponents.has(element))
        return;

    animatedComponents.add(element);
    
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
            animatedComponents.delete(element);
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