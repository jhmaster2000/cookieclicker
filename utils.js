/* =====================================================================================
MISC HELPER FUNCTIONS
=======================================================================================*/
const STUB = (/** @type {unknown[]} */ ..._) => void _; STUB; //!export
/**
 * @template T
 * @param {T} v
 * @returns {Exclude<T, null | undefined>}
 */
const ASSERT_NOT_NULL = (v) => {
    if (v === null || v === undefined) throw new Error('Non-null assertion failed. Follow stacktrace for location.');
    return /** @type Exclude<T, null | undefined> */(v);
}; ASSERT_NOT_NULL; //!export
/**
 * @template {boolean} asserted
 * @param {string} what
 * @param {asserted=} assertNotNull
 * @returns {asserted extends true ? HTMLElement : (HTMLElement | null)}
 */
function $(what, assertNotNull) {
    const el = document.getElementById(what);
    if (assertNotNull && !el) throw new Error(`$() Assertion failed: Requested element ${what} was null.`);
    // @ts-expect-error --- Need proper TS to fix this one, but the external types work and that's what matters
    return el;
}
$; //!export
/**
 * @template T
 * @param {T[] | T} arr
 */
function choose(arr) {
    if (!(arr instanceof Array)) return arr;
    return arr[Math.floor(Math.random() * arr.length)];
}
choose; //!export

/**
 * @param {string} str
 */
function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
cap; //!export

/**
 * @param {number} x
 */
function randomRound(x) {
    return x % 1 < Math.random() ? Math.floor(x) : Math.ceil(x);
}
randomRound; //!export

/**
 * @template T
 * @param {T[]} array
 */
function shuffle(array) {
    let counter = array.length;
    let index = 0;
    /** @type {T} */
    let temp;
    // While there are elements in the array
    while (counter--) {
        // Pick a random index
        index = Math.trunc(Math.random() * counter);

        // And swap the last element with it
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}
shuffle; //!export

const LoadScript = function (
    /** @type {string} */ url,
    /** @type {((this: GlobalEventHandlers, ev: Event) => any) | null} */ callback,
    /** @type {OnErrorEventHandler} */ error
) {
    const js = document.createElement('script');
    js.setAttribute('type', 'text/javascript');
    if (callback) js.addEventListener('load', callback);
    if (error) js.addEventListener('error', error);

    js.setAttribute('src', url);
    document.head.appendChild(js);
};
LoadScript; //!export

const localStorageGet = function (/** @type {string} */ key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}; localStorageGet; //!export
const localStorageSet = function (/** @type {string} */ key, /** @type {string} */ str) {
    try {
        localStorage.setItem(key, str);
    } catch { /* empty */ }
}; localStorageSet; //!export

/**
 * @param {number} x
 */
function toFixed(x) {
    let fixed = '';
    if (Math.abs(x) < 1) {
        const e = Number.parseInt(x.toString().split('e-')[1]);
        if (e) {
            x *= Math.pow(10, e - 1);
            fixed = '0.' + Array.from({length: e}).join('0') + x.toString().slice(2);
        }
    } else {
        let e = Number.parseInt(x.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10, e);
            fixed = String(x) + Array.from({length: e + 1}).join('0');
        }
    }
    return fixed;
}
toFixed; //!export

// Beautify and number-formatting adapted from the Frozen Cookies add-on (http://cookieclicker.wikia.com/wiki/Frozen_Cookies_%28JavaScript_Add-on%29)
/**
 * @param {string | string[]} notations
 */
function formatEveryThirdPower(notations) {
    return function (/** @type {number} */ val) {
        let base = 0;
        let notationValue = '';
        if (!Number.isFinite(Number(val))) return 'Infinity';
        if (val >= 1000000) {
            val /= 1000;
            while (Math.round(val) >= 1000) {
                val /= 1000;
                base++;
            }
            if (base >= notations.length) return 'Infinity';
            else notationValue = notations[base];
        }
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        return Math.round(val * 1000) / 1000 + notationValue;
    };
}
formatEveryThirdPower; //!export

/**
 * @param {number} val
 */
function rawFormatter(val) {
    return Math.round(val * 1000) / 1000;
}
rawFormatter; //!export

const formatLong = [' thousand', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion', ' sextillion', ' septillion', ' octillion', ' nonillion'];
const prefixes = ['', 'un', 'duo', 'tre', 'quattuor', 'quin', 'sex', 'septen', 'octo', 'novem'];
const suffixes = [
    'decillion',
    'vigintillion',
    'trigintillion',
    'quadragintillion',
    'quinquagintillion',
    'sexagintillion',
    'septuagintillion',
    'octogintillion',
    'nonagintillion'
];
for (const suffix of suffixes) {
    for (const prefix of prefixes) {
        formatLong.push(' ' + prefix + suffix);
    }
}

const formatShort = ['k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const short_prefixes = ['', 'Un', 'Do', 'Tr', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const short_suffixes = ['D', 'V', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N'];
for (const short_suffix of short_suffixes) {
    for (const short_prefix of short_prefixes) {
        formatShort.push(' ' + short_prefix + short_suffix);
    }
}
formatShort[10] = 'Dc';

const numberFormatters = [formatEveryThirdPower(formatShort), formatEveryThirdPower(formatLong), rawFormatter];
const Beautify = (/** @type {number} */ val, /** @type {number=} */ floats = 0) => {
    let negative = val < 0;
    let decimal = '';
    const fixed = Number(val.toFixed(floats));
    if (floats > 0 && Math.abs(val) < 1000 && Math.floor(fixed) !== fixed)
        decimal = '.' + fixed.toString().split('.')[1];
    val = Math.floor(Math.abs(val));
    if (floats > 0 && fixed === val + 1) val++;
    const format = Game.prefs.format ? 2 : 1;
    const formatter = numberFormatters[format];
    const output = val.toString().includes('e+') && format === 2
        ? val.toPrecision(3).toString()
        : formatter(val)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (output === '0') negative = false;
    return negative ? '-' + output : output + decimal;
};
const shortenNumber = (/** @type {number} */ val) => {
    // if no scientific notation, return as is, else :
    // keep only the 5 first digits (plus dot), round the rest
    // may or may not work properly
    if (val >= 1000000 && Number.isFinite(Number(val))) {
        let num = val.toString();
        let ind = num.indexOf('e+');
        if (ind === -1)
            return val;
        let str = '';
        for (let i = 0; i < ind; i++) {
            str += i < 6 ? num[i] : '0';
        }
        str += 'e+';
        str += num.split('e+')[1];
        return Number.parseFloat(str);
    }
    return val;
}; shortenNumber; //? externally used

const SimpleBeautify = function (/** @type {number} */ val) {
    const str = val.toString();
    let str2 = '';
    let i = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of str) {
        // add commas
        if ((str.length - Number(i)) % 3 === 0 && Number(i) > 0) str2 += ',';
        str2 += str[i];
        i++;
    }
    return str2;
}; SimpleBeautify; //? externally used

const beautifyInTextFilter = /((\d+,*)+)/g; // new regex
/**
 * @param {string} str
 */
function BeautifyInTextFunction(str) {
    return Beautify(Number.parseInt(str.replace(/,/g, ''), 10));
}
/**
 * @param {string} str
 */
function BeautifyInText(str) {
    return str.replace(beautifyInTextFilter, BeautifyInTextFunction);
} // reformat every number inside a string
function BeautifyAll() {
    // run through upgrades and achievements to reformat the numbers
    for (let i in Game.UpgradesById) {
        Game.UpgradesById[i].ddesc = BeautifyInText(Game.UpgradesById[i].ddesc);
    }
    for (let i in Game.AchievementsById) {
        // @ts-expect-error for now x2
        Game.AchievementsById[i].ddesc = BeautifyInText(Game.AchievementsById[i].ddesc);
    }
}
BeautifyAll; //! export

// phewie! https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
/**
 * @param {string | number | boolean} str
 */
function utf8_to_b64(str) {
    try {
        return btoa(
            encodeURIComponent(str).replace(/%([\dA-F]{2})/g, function (match, p1) {
                return String.fromCodePoint(Number.parseInt(p1, 16));
            })
        );
    } catch {
        return '';
    }
}
utf8_to_b64; //! export

/**
 * @param {string} str
 */
function b64_to_utf8(str) {
    try {
        return decodeURIComponent(
            Array.prototype.map
                .call(atob(str), function (c) {
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    return '%' + (`00${c.codePointAt(0).toString(16)}`).slice(-2);
                })
                .join('')
        );
    } catch {
        return '';
    }
}
b64_to_utf8; //! export

const getUpgradeName = (/** @type {string} */ name) => {
    const it = Game.Upgrades[name];
    const found = locStringsByPart[`Upgrade name ${it.id}`] || undefined;
    return found ? String(loc(found)) : name;
}; getUpgradeName; //! export

/**
 * returns CSS for an icon's background image, for use in CSS strings
 * @param {[number, number, string?]} icon
 */
function writeIcon(icon) {
    return (
        `${
            icon[2]
                ? `background-image:url('${icon[2].replace(/'/g, '\\\'')}');`
                : ''
        }background-position:${
            -icon[0] * 48
        }px ${
            -icon[1] * 48
        }px;`
    );
}
/**
 * returns HTML displaying an icon, with optional extra CSS
 * @param {[number, number]} icon
 * @param {string=} css
 */
function tinyIcon(icon, css) {
    return (
        `<div class="icon tinyIcon" style="vertical-align:middle;display:inline-block;${
            writeIcon(icon)
        }transform:scale(0.5);margin:-16px;${css || ''}"></div>`
    );
}
tinyIcon; //! export

/** easter is a pain goddamn
 * @param {number} year Full year */
function getEasterDay(year) {
    const C = Math.floor(year / 100);
    const N = year - 19 * Math.floor(year / 19);
    const K = Math.floor((C - 17) / 25);
    let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
    I = I - 30 * Math.floor(I / 30);
    I = I - Math.floor(I / 28) * (1 - Math.floor(I / 28) * Math.floor(29 / (I + 1)) * Math.floor((21 - N) / 11));
    let J = year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4);
    J = J - 7 * Math.floor(J / 7);
    const L = I - J;
    const M = 3 + Math.floor((L + 40) / 44);
    const D = L + 28 - 31 * Math.floor(M / 4);
    const easterDay = new Date(year, M - 1, D);
    const easterDayNum = Math.floor((+easterDay - +new Date(easterDay.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    return easterDayNum;
}
getEasterDay; //! export

const triggerAnim = (/** @type {HTMLElement | null} */ element, /** @type {string} */ anim) => {
    if (!element) return;
    element.classList.remove(anim);
    void element.offsetWidth;
    element.classList.add(anim);
}; triggerAnim; //! export

//!=====================!\\
//! Prototype Pollution !\\
//!=====================!\\

/** Variant of `decodeURIComponent` which is backwards compatible with `unescape` semantics. */
const decode = (/** @type string */ encodedURIComponent) => {
    const input = [...encodedURIComponent].map((curr, i, arr) => {
        const nextTwo = arr.slice(i + 1, i + 3).join('');
        const nextTwoNum = Number('0x' + nextTwo);
        if (curr === '%') {
            if (nextTwo.trim().length !== 2 || Number.isNaN(nextTwoNum)) return '%25';
            if (nextTwoNum > 0x7F) {
                arr[i + 1] = ''; arr[i + 2] = '';
                return String.fromCodePoint(nextTwoNum);
            }
        }
        return curr;
    }).join('');
    try {
        return decodeURIComponent(input);
    } catch (error) {
        console.log('decode() error with input: ' + input);
        throw error;
    }
}; decode; //! export

Element.prototype.getBounds = function () {
    const bounds = this.getBoundingClientRect();
    const s = Game.scale;
    bounds.x /= s;
    bounds.y /= s;
    bounds.width /= s;
    bounds.height /= s;
    Reflect.set(bounds, 'top', bounds.top / s);
    Reflect.set(bounds, 'bottom', bounds.bottom / s);
    Reflect.set(bounds, 'left', bounds.left / s);
    Reflect.set(bounds, 'right', bounds.right / s);
    return bounds;
};

CanvasRenderingContext2D.prototype.fillPattern = function (
    /** @type {HTMLImageElement} */ img,
    /** @type {number} */ X, /** @type {number} */ Y,
    /** @type {number} */ W, /** @type {number} */ H,
    /** @type {number} */ iW, /** @type {number} */ iH,
    /** @type {number} */ offX, /** @type {number} */ offY
) {
    // for when built-in patterns aren't enough
    if (img.alt !== 'blank') {
        offX ||= 0;
        offY ||= 0;
        if (offX < 0) offX -= Math.floor(offX / iW) * iW;
        if (offX > 0) offX = (offX % iW) - iW;
        if (offY < 0) offY -= Math.floor(offY / iH) * iH;
        if (offY > 0) offY = (offY % iH) - iH;
        for (let y = offY; y < H; y += iH) {
            for (let x = offX; x < W; x += iW) {
                this.drawImage(img, X + x, Y + y, iW, iH);
            }
        }
    }
};

const OldCanvasDrawImage = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = /** @type {typeof OldCanvasDrawImage} */ (
    function (/** @type {Parameters<typeof OldCanvasDrawImage>} */ ...args) {
        // only draw the image if it's loaded
        if (/** @type {HTMLImageElement} */ (args[0]).alt !== 'blank') OldCanvasDrawImage.call(this, ...args);
    }
);
