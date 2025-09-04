/**
 * Returns a random integer between `min` (inclusive) and `max` (inclusive).
 */
export function rng(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks a random element from the given array.
 */
export function pickRandom<T>(array: T[]) {
    if (array.length == 0)
        throw new Error("Attempted to pick a random element from an empty array.");

    return array[rng(0, array.length - 1)];
}
