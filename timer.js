/* eslint-disable no-undef */

class Timer {
    /** @type {Record<string, string>} */
    static labels = {};
    /** @type {Record<string, number>} */
    static #smoothed = {};
    static #time = Date.now();

    static reset() {
        Timer.labels = {};
        Timer.#time = Date.now();
    }
    static track(/** @type {string} */ label) {
        if (!Game.sesame) return;
        const now = Date.now();
        Timer.#smoothed[label] ||= 0;
        Timer.#smoothed[label] += (now - Timer.#time - Timer.#smoothed[label]) * 0.1;
        Timer.labels[label] = `<div style="padding-left:8px;">${label} : ${Math.round(Timer.#smoothed[label])}ms</div>`;
        Timer.#time = now;
    }
    static clean() {
        if (!Game.sesame) return;
        Timer.#time = Date.now();
    }
    static say(/** @type {string} */ label) {
        if (!Game.sesame) return;
        Timer.labels[label] = `<div style="border-top:1px solid #ccc;">${label}</div>`;
    }
}
Timer; //! export
