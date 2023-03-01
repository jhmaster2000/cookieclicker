// === LOCALIZATION ===

/** @type {Record<string, string | string[]>} */
let locStrings = {};
/** @type {Record<string, string | string[]>} */
let locStringsFallback = {};
/** @type {keyof typeof Langs} */
let locId;
let EN = true;
/** @type {{ id: number, type: number, title: string, points: string[] }[]} */
let locPatches = [];
let locPlur = 'nplurals=2;plural=(n!=1);'; // see http://docs.translatehouse.org/projects/localization-guide/en/latest/l10n/pluralforms.html
const locPlurFallback = locPlur;
// note : plural index will be downgraded to the last matching, ie. in this case, if we get "0" but don't have a 3rd option, use the 2nd option (or 1st, lacking that too)
/** @type {Record<string, string>} */
const locStringsByPart = {};

const Langs = {
    EN: {
        file: 'EN',
        nameEN: 'English',
        name: 'English',
        changeLanguage: 'Language',
        icon: 0,
        w: 1
    },
    FR: {
        file: 'FR',
        nameEN: 'French',
        name: 'Fran&ccedil;ais',
        changeLanguage: 'Langue',
        icon: 0,
        w: 1
    },
    DE: {
        file: 'DE',
        nameEN: 'German',
        name: 'Deutsch',
        changeLanguage: 'Sprache',
        icon: 0,
        w: 1
    },
    NL: {
        file: 'NL',
        nameEN: 'Dutch',
        name: 'Nederlands',
        changeLanguage: 'Taal',
        icon: 0,
        w: 1
    },
    CS: {
        file: 'CS',
        nameEN: 'Czech',
        name: '&#x10C;e&#x161;tina',
        changeLanguage: 'Jazyk',
        icon: 0,
        w: 1
    },
    PL: {
        file: 'PL',
        nameEN: 'Polish',
        name: 'Polski',
        changeLanguage: 'J&#281;zyk',
        icon: 0,
        w: 1
    },
    IT: {
        file: 'IT',
        nameEN: 'Italian',
        name: 'Italiano',
        changeLanguage: 'Lingua',
        icon: 0,
        w: 1
    },
    ES: {
        file: 'ES',
        nameEN: 'Spanish',
        name: 'Espa&#xF1;ol',
        changeLanguage: 'Idioma',
        icon: 0,
        w: 1
    },
    'PT-BR': {
        file: 'PT-BR',
        nameEN: 'Portuguese',
        name: 'Portugu&#xEA;s',
        changeLanguage: 'Idioma',
        icon: 0,
        w: 1
    },
    JA: {
        file: 'JA',
        nameEN: 'Japanese',
        name: '&#x65E5;&#x672C;&#x8A9E;',
        changeLanguage: '&#35328;&#35486;',
        icon: 0,
        w: 1.5
    },
    'ZH-CN': {
        file: 'ZH-CN',
        nameEN: 'Chinese',
        name: '&#x4E2D;&#x6587;',
        changeLanguage: '&#35821;&#35328;',
        icon: 0,
        w: 1.5
    },
    KO: {
        file: 'KO',
        nameEN: 'Korean',
        name: '&#xD55C;&#xAE00;',
        changeLanguage: '&#xC5B8;&#xC5B4;',
        icon: 0,
        w: 1.5
    },
    RU: {
        file: 'RU',
        nameEN: 'Russian',
        name: '&#x420;&#x443;&#x441;&#x441;&#x43A;&#x438;&#x439;',
        changeLanguage: '&#1071;&#1079;&#1099;&#1082;',
        icon: 0,
        w: 1.2
    }
};

// note : baseline should be the original english text
// in several instances, the english text will be quite different from the other languages,
// as this game was initially never meant to be translated and the translation process doesn't always play well with complex sentence structures
/* use:
    loc('Plain text')
    loc('Text where %1 is a parameter','something')
    loc('Text where %1 and %2 are parameters',['a thing','another thing'])
    loc('There is %1 apple',5)
         ...if the localized string is an array, this is parsed as a pluralized string; for instance, the localized string could be
        "There is %1 apple":[
            "There is %1 apple",
            "There are %1 apples"
        ]
    loc('There is %1 apple and also, %2!',[5,'hello'])
    loc('This string is localized.',0,'This is the string displayed in the english version.')
    loc('You have %1.','<b>'+loc('%1 apple',LBeautify(amount))+'</b>')
        ...you may nest localized strings, and use LBeautify() to pack Beautified values
*/
const locBlink = false;
const loc = (
    /** @type {string} */ id,
    /** @type {{ n: Number, b: string | number } | number | string | any[] | undefined} */ params,
    /** @type {string | undefined} */ baseline
) => {
    let fallback = false;
    let found = locStrings[id];
    if (!found) {
        found = locStringsFallback[id];
        fallback = true;
    }
    /** @type {string | string[]} */
    let str = '';
    if (found) {
        str = parseLoc(/** @type string */(found), params);
        if (str instanceof Array) return str;
        const noBlink = ['Buildings', 'Switches', 'Upgrades', 'Store', 'Other versions', 'Ascending', '%1 cookie'];
        if (locBlink && !fallback && !noBlink.includes(id)) return '<span class="blinking">' + str + '</span>'; // will make every localized text blink on screen, making omissions obvious; will not work for elements filled with textContent
    }

    if (found) return str;
    return baseline || id;
};
const locStr = (
    /** @type {string} */ id,
    /** @type {{ n: Number, b: string | number } | number | string | any[] | undefined} */ params,
    /** @type {string | undefined} */ baseline
) => {
    const locRet = loc(id, params, baseline);
    if (locRet instanceof Array) return locRet[0];
    return locRet;
}; locStr; //! export

const parseLoc = (
    /** @type {string | string[]} */ str,
    /** @type {string | number | any[] | { n: number; b: string | number; }} */ params = []
) => {
    /*
        parses localization strings
        -there can only be 1 plural per string and it MUST be at index %1
        -a pluralized string is detected if we have at least 1 param and the matching localized string is an array
    */
    if (!str) return '';
    if (!(params instanceof Array)) params = [params];
    if (params.length === 0) return str;

    if (str instanceof Array) {
        if (typeof params[0] === 'object') {
            // an object containing a beautified number
            // @ts-expect-error this will be pain
            let plurIndex = locPlur(params[0].n);
            plurIndex = Math.min(str.length - 1, plurIndex);
            str = str[plurIndex];
            str = str.replaceAll('%1', params[0].b);
        } else {
            // @ts-expect-error this IS pain
            let plurIndex = locPlur(params[0]);
            plurIndex = Math.min(str.length - 1, plurIndex);
            str = str[plurIndex];
            str = str.replaceAll('%1', params[0]);
        }
    }

    const len = str.length;
    let out = '', inPercent = false;
    for (let i = 0; i < len; i++) {
        const it = str[i];
        if (inPercent) {
            inPercent = false;
            if (!isNaN(Number(it)) && params.length >= Number(it) - 1) out += params[Number(it) - 1];
            else out += '%' + it;
        } else if (it === '%') inPercent = true;
        else out += it;
    }
    return out;
};

/** returns an object in the form `{ n: original value floored, b: beautified value as string }` for localization purposes */
const LBeautify = (
    /** @type {number} */ val, /** @type {number | undefined} */ floats
) => {
    return { n: Math.floor(Math.abs(val)), b: Beautify(val, floats) };
}; LBeautify; //! export

/** used in loc files.
 * 
 * if mod is true, this file is augmenting the current language */
const AddLanguage = (
    /** @type {keyof typeof Langs} */ id,
    /** @type {Record<string, string | string[]> & { '': Record<string, string> }} */ json,
    /** @type {boolean=} */ mod = false
) => {
    if (id === locId && !mod) return false; // don't load twice
    if (!Langs[id]) return false;
    locId = id;
    EN = locId === 'EN' ? true : false;
    const locName = Langs[id].nameEN;

    if (mod) {
        for (let i in json) {
            locStrings[i] = json[i];
        }
        for (let i in locStrings) {
            let bit = i.split(']');
            if (bit[1] && bit[0].indexOf('[COMMENT:') != 0 && !locStringsByPart[bit[0].substring(1)]) locStringsByPart[bit[0].substring(1)] = i;
        }
        console.log('Augmented language "' + locName + '".');
    } else {
        locStrings = json;
        locPlur = json['']['plural-forms'] || locPlurFallback;
        delete locStrings[''];
        for (let i in locStrings) {
            if (locStrings[i] === '/') locStrings[i] = i;
        }

        // @ts-expect-error WHY SO MUCH VARIABLE REUSE
        locPlur = (function (plural_form) {
            // lifted and modified from gettext.js
            let pf_re = new RegExp('^\\s*nplurals\\s*=\\s*[0-9]+\\s*;\\s*plural\\s*=\\s*(?:\\s|[-\\?\\|&=!<>+*/%:;n0-9_()])+');
            if (!pf_re.test(plural_form)) throw new Error('The plural form "' + plural_form + '" is not valid');
            return new Function('n', 'let plural, nplurals; ' + plural_form + ' return plural;');
        })(locPlur);

        locPatches = [];
        for (let i in locStrings) {
            if (i.split('|')[0] === 'Update notes') {
                const patch = i.split('|');
                const patchTranslated = String(locStrings[i]).split('|');
                locPatches.push({
                    id: parseInt(patch[1]),
                    type: 1,
                    title: patchTranslated[2],
                    points: patchTranslated.slice(3)
                });
            }
        }
        let sortMap = function (/** @type {{ id: number; }} */ a, /** @type {{ id: number; }} */ b) {
            if (a.id < b.id) return 1;
            else return -1;
        };
        locPatches.sort(sortMap);

        for (let i in locStrings) {
            let bit = i.split(']');
            if (bit[1] && bit[0].indexOf('[COMMENT:') != 0 && !locStringsByPart[bit[0].substring(1)]) locStringsByPart[bit[0].substring(1)] = i;
        }

        console.log('Loaded language "' + locName + '".');
    }
    return true;
}; AddLanguage; //! export

const LocalizeUpgradesAndAchievs = function () {
    if (!Game.UpgradesById) return false;

    let allThings = [];
    for (let i in Game.UpgradesById) {
        allThings.push(Game.UpgradesById[i]);
    }
    for (let i in Game.AchievementsById) {
        allThings.push(Game.AchievementsById[i]);
    }
    for (let i = 0; i < allThings.length; i++) {
        let it = allThings[i];
        let type = it.getType();
        let found;
        found = locStringsByPart[type + ' name ' + it.id] || undefined;
        if (found) it.dname = String(loc(found));

        if (!EN) it.baseDesc = it.baseDesc.replace(/<q>.*/, ''); // strip quote section
        it.ddesc = BeautifyInText(it.baseDesc);

        found = locStringsByPart[type + ' desc ' + it.id] || undefined;
        if (found) it.ddesc = loc(found);
        found = locStringsByPart[type + ' quote ' + it.id] || undefined;
        if (found) it.ddesc += '<q>' + loc(found) + '</q>';
    }
    BeautifyAll();
    return true;
}; LocalizeUpgradesAndAchievs; //! export

/* localization utils */

const strCookieProductionMultiplierPlus = locStr('Cookie production multiplier <b>+%1%</b>.', '[x]');
const getStrCookieProductionMultiplierPlus = (/** @type {string | number} */ x) => {
    return strCookieProductionMultiplierPlus.replace('[x]', String(x));
};
getStrCookieProductionMultiplierPlus; //! export
const getStrThousandFingersGain = (/** @type {string | number} */ x) => {
    return loc('Multiplies the gain from %1 by <b>%2</b>.', [getUpgradeName('Thousand fingers'), x]);
};
getStrThousandFingersGain; //! export
const strKittenDesc = loc('You gain <b>more CpS</b> the more milk you have.');
strKittenDesc; //! export
const getStrClickingGains = (/** @type {string | number} */ x) => {
    return loc('Clicking gains <b>+%1% of your CpS</b>.', x);
};
getStrClickingGains; //! export
