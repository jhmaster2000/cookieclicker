/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* =====================================================================================
MISC HELPER FUNCTIONS
=======================================================================================*/
const STUB = (..._) => void 0;
/**
 * @template T
 * @param {T} v
 * @returns {Exclude<T, null | undefined>}
 */
const ASSERT_NOT_NULL = (v) => {
    if (v === null || v === undefined) throw new Error('Non-null assertion failed. Follow stacktrace for location.');
    return /** @type Exclude<T, null | undefined> */(v);
};
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
/**
 * @template T
 * @param {T[]} arr
 */
function choose(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {string} str
 */
function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * @param {number} x
 */
function randomRound(x) {
    if (x % 1 < Math.random()) return Math.floor(x);
    else return Math.ceil(x);
}

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
        index = (Math.random() * counter) | 0;

        // And swap the last element with it
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

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

const LoadScript = function (
    /** @type {string} */ url,
    /** @type {((this: GlobalEventHandlers, ev: Event) => any) | null} */ callback,
    /** @type {OnErrorEventHandler} */ error
) {
    const js = document.createElement('script');
    js.setAttribute('type', 'text/javascript');
    if (callback) js.onload = callback;
    if (error) js.onerror = error;

    js.setAttribute('src', url);
    document.head.appendChild(js);
};

const localStorageGet = function (key) {
    /** @type number | string | null */
    let local = 0;
    try {
        local = localStorage.getItem(key);
    } catch (exception) {
        /* empty */
    }
    return local;
};
const localStorageSet = function (key, str) {
    /** @type number | void */
    let local = 0;
    try {
        local = localStorage.setItem(key, str);
    } catch (exception) {
        /* empty */
    }
    return local;
};

/**
 * @param {number} x
 */
function toFixed(x) {
    if (Math.abs(x) < 1.0) {
        const e = parseInt(x.toString().split('e-')[1]);
        if (e) {
            x *= Math.pow(10, e - 1);
            // @ts-expect-error misery
            x = '0.' + new Array(e).join('0') + x.toString().substring(2);
        }
    } else {
        let e = parseInt(x.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10, e);
            // @ts-expect-error misery 2.0
            x += new Array(e + 1).join('0');
        }
    }
    return x;
}

// Beautify and number-formatting adapted from the Frozen Cookies add-on (http://cookieclicker.wikia.com/wiki/Frozen_Cookies_%28JavaScript_Add-on%29)
/**
 * @param {string | string[]} notations
 */
function formatEveryThirdPower(notations) {
    return function (/** @type {number} */ val) {
        let base = 0;
        let notationValue = '';
        if (!isFinite(val)) return 'Infinity';
        if (val >= 1000000) {
            val /= 1000;
            while (Math.round(val) >= 1000) {
                val /= 1000;
                base++;
            }
            if (base >= notations.length) return 'Infinity';
            else notationValue = notations[base];
        }
        return Math.round(val * 1000) / 1000 + notationValue;
    };
}

/**
 * @param {number} val
 */
function rawFormatter(val) {
    return Math.round(val * 1000) / 1000;
}

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
for (const i in suffixes) {
    for (const ii in prefixes) {
        formatLong.push(' ' + prefixes[ii] + suffixes[i]);
    }
}

const formatShort = ['k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const short_prefixes = ['', 'Un', 'Do', 'Tr', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const short_suffixes = ['D', 'V', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N'];
for (const i in short_suffixes) {
    for (const ii in short_prefixes) {
        formatShort.push(' ' + short_prefixes[ii] + short_suffixes[i]);
    }
}
formatShort[10] = 'Dc';

const numberFormatters = [formatEveryThirdPower(formatShort), formatEveryThirdPower(formatLong), rawFormatter];
const Beautify = function (/** @type {number} */ val, /** @type {number=} */ floats = 0) {
    let negative = val < 0;
    let decimal = '';
    let fixed = Number(val.toFixed(floats));
    if (floats > 0 && Math.abs(val) < 1000 && Math.floor(fixed) !== fixed) decimal = '.' + fixed.toString().split('.')[1];
    val = Math.floor(Math.abs(val));
    if (floats > 0 && fixed == val + 1) val++;
    let format = Game.prefs.format ? 2 : 1;
    let formatter = numberFormatters[format];
    let output =
        val.toString().indexOf('e+') !== -1 && format == 2
            ? val.toPrecision(3).toString()
            : formatter(val)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (output == '0') negative = false;
    return negative ? '-' + output : output + decimal;
};
const shortenNumber = function (val) {
    // if no scientific notation, return as is, else :
    // keep only the 5 first digits (plus dot), round the rest
    // may or may not work properly
    if (val >= 1000000 && isFinite(val)) {
        let num = val.toString();
        let ind = num.indexOf('e+');
        if (ind == -1) return val;
        let str = '';
        for (let i = 0; i < ind; i++) {
            str += i < 6 ? num[i] : '0';
        }
        str += 'e+';
        str += num.split('e+')[1];
        return parseFloat(str);
    }
    return val;
}; shortenNumber; //? externally used

const SimpleBeautify = function (/** @type {number} */ val) {
    let str = val.toString();
    let str2 = '';
    // @ts-expect-error technically valid but sigh...
    for (let i in str) {
        // add commas
        if ((str.length - Number(i)) % 3 == 0 && Number(i) > 0) str2 += ',';
        str2 += str[i];
    }
    return str2;
};

const beautifyInTextFilter = /(([\d]+[,]*)+)/g; // new regex
function BeautifyInTextFunction(str) {
    return Beautify(parseInt(str.replace(/,/g, ''), 10));
}
function BeautifyInText(str) {
    return str.replace(beautifyInTextFilter, BeautifyInTextFunction);
} // reformat every number inside a string
function BeautifyAll() {
    // run through upgrades and achievements to reformat the numbers
    for (let i in Game.UpgradesById) {
        Game.UpgradesById[i].ddesc = BeautifyInText(Game.UpgradesById[i].ddesc);
    }
    for (let i in Game.AchievementsById) {
        Game.AchievementsById[i].ddesc = BeautifyInText(Game.AchievementsById[i].ddesc);
    }
}

// phewie! https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
function utf8_to_b64(str) {
    try {
        return btoa(
            encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            })
        );
    } catch (err) {
        return '';
    }
}

function b64_to_utf8(str) {
    try {
        return decodeURIComponent(
            Array.prototype.map
                .call(atob(str), function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );
    } catch (err) {
        return '';
    }
}

let getUpgradeName = function (name) {
    let it = Game.Upgrades[name];
    let found = FindLocStringByPart('Upgrade name ' + it.id);
    if (found) return loc(found);
    else return name;
};
let getAchievementName = function (name) {
    let it = Game.Achievements[name];
    let found = FindLocStringByPart('Achievement name ' + it.id);
    if (found) return loc(found);
    else return name;
};

//!=====================!\\
//! Prototype Pollution !\\
//!=====================!\\

CanvasRenderingContext2D.prototype.fillPattern = function (img, X, Y, W, H, iW, iH, offX, offY) {
    // for when built-in patterns aren't enough
    if (img.alt != 'blank') {
        offX ||= 0;
        offY ||= 0;
        if (offX < 0) {
            offX -= Math.floor(offX / iW) * iW;
        }
        if (offX > 0) {
            offX = (offX % iW) - iW;
        }
        if (offY < 0) {
            offY -= Math.floor(offY / iH) * iH;
        }
        if (offY > 0) {
            offY = (offY % iH) - iH;
        }
        for (let y = offY; y < H; y += iH) {
            for (let x = offX; x < W; x += iW) {
                this.drawImage(img, X + x, Y + y, iW, iH);
            }
        }
    }
};

const OldCanvasDrawImage = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function () {
    // only draw the image if it's loaded
    if (arguments[0].alt != 'blank') OldCanvasDrawImage.apply(this, arguments);
};
