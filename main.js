﻿/* eslint-disable @typescript-eslint/no-for-in-array */
/* eslint-disable unicorn/no-static-only-class */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-loss-of-precision */
/// <reference types="./main" />
/*
All this code is copyright Orteil, 2013-2022.
    -with some help, advice and fixes by Nicholas Laux, Debugbro, Opti, the folks at Playsaurus, and lots of people on reddit, Discord, and the DashNet forums
    -also includes a bunch of snippets found on stackoverflow.com and others
    -want to mod the game? scroll down to the "MODDING API" section
Hello, and welcome to the joyous mess that is main.js. Code contained herein is not guaranteed to be good, consistent, or sane. Most of this is years old at this point and harkens back to simpler, cruder times. In particular I've tried to maintain compatibility with fairly old versions of javascript, which means luxuries such as 'let', arrow functions and string literals are unavailable.
As Cookie Clicker is rife with puns and tricky wordplay, localization was never intended to be possible - but ended up happening anyway as part of the Steam port. As a result, usage of strings is somewhat unorthodox in some places.
Have a nice trip, and stay safe.
Spoilers ahead.
http://orteil.dashnet.org
*/

/** @type {number | undefined} */
let order;
/** @type {'' | 'cookie' | 'toggle' | 'debug' | 'prestige' | 'prestigeDecor' | 'tech' | undefined} */
let pool;
/** @type {number | undefined} */
let power;

/* =====================================================================================
GAME INITIALIZATION
=======================================================================================*/
class Game {
    static version = VERSION;
    static loadedFromVersion = VERSION;
    static beta = location.href.includes('/beta') ? true : BETA;
    static https = location.protocol === 'https:';
    static SaveTo = `CookieClickerGame${Game.beta ? 'Beta' : ''}`;

    static mobile = 0;
    static touchEvents = 0;
    static visible = false;
    /** @type {keyof typeof Game.seasons} */
    static season = '';
    /** @type {keyof typeof Game.seasons} */
    static baseSeason = '';
    static updateLog = '';
    static ready = false;
    /**  @type {Loader} */
    static Loader;
    static time = Date.now();
    static lastActivity = Date.now();
    static accumulatedDelay = 0;
    static delayTimeouts = 0;
    static T = 0;
    static drawT = 0;
    static loopT = 0;
    /** rectangle defining screen limits (right,left,bottom,top) updated every logic frame
     * @type {DOMRect | undefined} */
    static bounds;
    static fps = 30;
    /** @type {HTMLElement} */
    static l;
    /** @type {HTMLElement} */
    static wrapper;
    static clickStr = '';
    static catchupLogic = 0;
    static fpsStartTime = 0;
    static frameNumber = 0;
    static currentFps = Game.fps;
    static previousFps = Game.currentFps;
    static defaultBg = 'bgBlue';

    static PARTY = false;

    /**
     * @type {CanvasRenderingContext2D}
     */
    static Background;
    /**
     * @type {CanvasRenderingContext2D}
     */
    static LeftBackground;
    /**
     * @type {any[]}
     */
    static toys;
    /**
     * @type {number}
     */
    static toysType;
    /** @type {any=} */
    static Toy;

    static SpecialGrandmaUnlock = 15;

    /** @type {any} */
    static choiceSelectorChoices;
    static choiceSelectorSelected = '';

    static seasonTriggerBasePrice = 1000000000; // 1111111111;

    /**
     * @type {HTMLCanvasElement}
     */
    static fpsGraph;
    /**
     * @type {CanvasRenderingContext2D}
     */
    static fpsGraphCtx;

    /** @type {Function | undefined} */
    static forceUnslotGod;
    /** @type {Function | undefined} */
    static useSwap;
    /** @type {Function | undefined} */
    static takeLoan;

    static Launch() {
        Game.mobile = 0;
        Game.touchEvents = 0;

        const css = document.createElement('style');
        css.innerHTML = `body .icon,body .crate,body .usesIcon{background-image:url(img/icons.png?v=${Game.version});}`;
        document.head.appendChild(css);

        // this is so shimmers can still appear even if you lose connection after the game is loaded
        const preloadImages = [
            'img/goldCookie.png',
            'img/wrathCookie.png',
            'img/spookyCookie.png',
            'img/hearts.png',
            'img/contract.png',
            'img/wrathContract.png',
            'img/bunnies.png',
            'img/frostedReindeer.png'
        ];
        const preloadImagesL = $('preloadImages', true);
        for (const preloadImage of preloadImages) {
            const img = document.createElement('img');
            img.src = preloadImage;
            preloadImagesL.appendChild(img);
        }

        Game.visible = true;
        document.addEventListener('visibilitychange', (e) => {
            Game.visible = document.visibilityState !== 'hidden';
        }, false);

        if (!EN) {
            // code-patching the CSS for localization feels like it should be against the law, and yet
            const css = document.createElement('style');
            css.innerHTML =
                `#upgrades:before{content:'${
                    loc('Upgrades')
                }';}#toggleUpgrades:before{content:'${
                    loc('Switches')
                }';}#techUpgrades:before{content:'${
                    loc('Research')
                }';}#vaultUpgrades:before{content:'${
                    loc('Vault')
                }';}#products:before{content:'${
                    loc('Buildings')
                }';}`;
            document.head.appendChild(css);
        }

        Game.baseSeason = ''; // halloween, christmas, valentines, fools, easter
        // automatic season detection (might not be 100% accurate)
        const year = new Date().getFullYear();
        const leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 ? 1 : 0;
        const day = Math.floor((Date.now() - +new Date(year, 0, 0)) / (1000 * 60 * 60 * 24));
        if (day >= 41 && day <= 46) Game.baseSeason = 'valentines';
        else if (day + leap >= 90 && day <= 92 + leap) Game.baseSeason = 'fools';
        else if (day >= 304 - 7 + leap && day <= 304 + leap) Game.baseSeason = 'halloween';
        else if (day >= 349 + leap && day <= 365 + leap) Game.baseSeason = 'christmas';
        else {
            const easterDay = getEasterDay(year);
            if (day >= easterDay - 7 && day <= easterDay) Game.baseSeason = 'easter';
        }

        Game.updateLog = UPDATE_LOG_START;

        for (const patch of locPatches) {
            let patchText =
                `</div><div class="subsection update${patch.type == 2 ? ' small' : ''}"><div class="title">${patch.title}</div>`;
            for (const point of patch.points) {
                patchText += `<div class="listing">&bull; ${point}</div>`;
            }
            Game.updateLog += patchText;
        }

        if (!EN)
            Game.updateLog += `<div class="listing" style="font-weight:bold;font-style:italic;opacity:0.5;">${
                loc('Note: older update notes are in English.')
            }</div>`;
        Game.updateLog += UPDATE_LOG;

        Game.ready = false;
    }

    static Load(/** @type {any} */ callback) {
        Game.Loader = new Loader();
        Game.Loader.domain = 'img/';

        Game.Loader.loaded = callback;
        Game.Loader.Load(['filler.png']);
    }
    static ErrorFrame() {
        $('offGameMessage', true).innerHTML =
            '<div class="title">Oops. Wrong address!</div>' +
            '<div>It looks like you\'re accessing Cookie Clicker from another URL than the official one.<br>' +
            'You can <a href="//orteil.dashnet.org/cookieclicker/" target="_blank">play Cookie Clicker over here</a>!<br>' +
            '<small>(If for any reason, you are unable to access the game on the official URL, we are currently working on a second domain.)</small></div>';
    }
    static timedout = false;
    static Timeout() {
        Game.WriteSave();
        Game.killShimmers();
        $('offGameMessage', true).innerHTML =
            '<div class="title">' +
            (Game.Has('Twin Gates of Transcendence')
                ? loc('Cookie Clicker is in sleep mode and generating offline cookies.')
                : loc('Cookie Clicker is in sleep mode.')) +
            '</div>' +
            loc('%1 to resume from your save file.', '<a ' + Game.clickStr + '="Game.Resume();">' + loc('Click here') + '</a>') +
            '<br><div style="font-style:italic;font-size:65%;line-height:110%;opacity:0.75;">' +
            loc(
                '(this happens when too many frames are skipped at once,<br>' +
                'usually when the game has been running in the background for a while)<br>' +
                '(you can turn this feature off in the settings menu)'
            ) +
            '</div>';
        $('offGameMessageWrap', true).style.display = 'table';
        Game.timedout = true;
        console.log('[=== Game timed out and has been put in sleep mode. Data was saved. ===]');
    }
    static Resume() {
        $('offGameMessage', true).innerHTML = '';
        $('offGameMessageWrap', true).style.display = 'none';
        Game.timedout = false;
        Game.time = Date.now();
        Game.accumulatedDelay = 0;
        Game.delayTimeouts = 0;
        Game.lastActivity = Date.now();
        Game.Loop();
        Game.LoadSave();
        console.log('[=== Game resumed! Data was loaded. ===]');
    }

    static getFps() {
        Game.frameNumber++;
        let currentTime = (Date.now() - Game.fpsStartTime) / 1000;
        let result = Math.floor(Game.frameNumber / currentTime);
        if (currentTime > 1) {
            Game.fpsStartTime = Date.now();
            Game.frameNumber = 0;
        }
        return result;
    }

    static cookiesEarned = 0; // all cookies earned during gameplay
    static cookies = 0; // cookies
    static cookiesd = 0; // cookies display
    static cookiesPs = 1; // cookies per second (to recalculate with every new purchase)
    static cookiesPsRaw = 0; // raw cookies per second
    static cookiesPsRawHighest = 0; // highest raw cookies per second this ascension
    static cookiesReset = 0; // cookies lost to resetting (used to determine prestige and heavenly chips)
    static cookieClicks = 0; // +1 for each click on the cookie
    static goldenClicks = 0; // +1 for each golden cookie clicked (all time)
    static goldenClicksLocal = 0; // +1 for each golden cookie clicked (this game only)
    static missedGoldenClicks = 0; // +1 for each golden cookie missed
    static handmadeCookies = 0; // all the cookies made from clicking the cookie
    static milkProgress = 0; // you gain a little bit for each achievement. Each increment of 1 is a different milk displayed.
    static milkH = Game.milkProgress / 2; // milk height, between 0 and 1 (although should never go above 0.5)
    static milkHd = 0; // milk height display
    static milkType = 0; // custom milk
    static bgType = 0; // custom background
    static chimeType = 0; // golden cookie chime
    static prestige = 0; // prestige level (recalculated depending on Game.cookiesReset)
    static heavenlyChips = 0; // heavenly chips the player currently has
    static heavenlyChipsDisplayed = 0; // ticks up or down to match Game.heavenlyChips
    static heavenlyChipsSpent = 0; // heavenly chips spent on cookies, upgrades and such
    static heavenlyCookies = 0; // how many cookies have we baked from chips (unused)
    static permanentUpgrades = [-1, -1, -1, -1, -1];
    /** @type {keyof typeof Game.ascensionModes} */
    static ascensionMode = 0; // type of challenge run if any
    static resets = 0; // reset counter
    static lumps = -1; // sugar lumps
    static lumpsTotal = -1; // sugar lumps earned across all playthroughs (-1 means they haven't even started yet)
    static lumpT = Date.now(); // time when the current lump started forming
    static lumpRefill = 0; // time left before a sugar lump can be used again (on minigame refills etc) in logic frames

    static makeSeed() {
        const chars = [...'abcdefghijklmnopqrstuvwxyz'];
        let str = '';
        for (let i = 0; i < 5; i++) str += choose(chars);
        return str;
    }
    static seed = Game.makeSeed(); // each run has its own seed, used for deterministic random stuff

    static volume = 75; // sound volume
    static volumeMusic = 50; // music volume

    static elderWrath = 0;
    static elderWrathOld = 0;
    static elderWrathD = 0;
    static pledges = 0;
    static pledgeT = 0;
    static researchT = 0;
    static nextResearch = 0;
    static cookiesSucked = 0; // cookies sucked by wrinklers
    static cpsSucked = 0; // percent of CpS being sucked by wrinklers
    static wrinklersPopped = 0;
    static santaLevel = 0;
    static reindeerClicked = 0;
    static seasonT = 0;
    static seasonUses = 0;
    static dragonLevel = 0;
    /** @type {keyof typeof Game.dragonAuras} */
    static dragonAura = 0;
    /** @type {keyof typeof Game.dragonAuras} */
    static dragonAura2 = 0;

    static fortuneGC = 0;
    static fortuneCPS = 0;

    static blendModesOn = document.createElement('detect').style.mixBlendMode === '';

    static bg = ''; // background (grandmas and such)
    static bgFade = ''; // fading to background
    static bgR = 0; // ratio (0 - not faded, 1 - fully faded)
    static bgRd = 0; // ratio displayed

    static windowW = window.innerWidth;
    static windowH = window.innerHeight;
    static scale = 1;

    static resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        const prevW = Game.windowW;
        const prevH = Game.windowH;

        const scale = Math.min(w / Math.max(800, w), h / Math.max(200, h));
        Game.windowW = Math.floor(w / scale);
        Game.windowH = Math.floor(h / scale);
        if (scale !== 1) {
            Game.wrapper.style.transform = `scale(${scale})`;
            Game.wrapper.style.width = Game.windowW + 'px';
            Game.wrapper.style.height = Game.windowH + 'px';
        } else {
            Game.wrapper.style.removeProperty('transform');
            Game.wrapper.style.width = '100%';
            Game.wrapper.style.height = '100%';
        }
        Game.scale = scale;

        for (let i in Game.Objects) {
            const me = Game.Objects[i];
            me.toResize = true;
            if (me.minigame && me.minigame.onResize) me.minigame.onResize();
        }

        if (Game.getNewTicker) {
            if (prevW >= Game.tickerTooNarrow && Game.windowW < Game.tickerTooNarrow) Game.getNewTicker(true);
            else if (prevW < Game.tickerTooNarrow && Game.windowW >= Game.tickerTooNarrow) Game.getNewTicker(true);
        }
    }

    static startDate = Date.now(); // when we started playing
    static fullDate = Date.now(); // when we started playing (carries over with resets)
    static lastDate = Date.now(); // when we last saved the game (used to compute "cookies made since we closed the game" etc)

    static prefs = {
        particles: 1, // particle effects : falling cookies etc
        numbers: 1, // numbers that pop up when clicking the cookie
        autosave: 1, // save the game every minute or so
        autoupdate: 1, // send an AJAX request to the server every 30 minutes (note : ignored)
        milk: 1, // display milk
        fancy: 1, // CSS shadow effects (might be heavy on some browsers)
        warn: 0, // warn before closing the window
        cursors: 1, // display cursors
        focus: 1, // make the game refresh less frequently when off-focus
        popups: 0, // use old-style popups (no longer used)
        format: 0, // shorten numbers
        notifs: 0, // notifications fade faster
        animate: 1, // animate buildings
        wobbly: 1, // wobbly cookie
        monospace: 0, // alt monospace font for cookies
        filters: 1, // CSS filter effects (might be heavy on some browsers)
        cookiesound: 1, // use new cookie click sound
        crates: 0, // show crates around icons in stats
        altDraw: 0, // use requestAnimationFrame to update drawing instead of fixed 30 fps setTimeout
        showBackupWarning: 1, // if true, show a "Have you backed up your save?" message on save load; set to false when save is exported
        extraButtons: 1, // if true, show Mute buttons and the building master bar
        askLumps: 0, // if true, show a prompt before spending lumps
        customGrandmas: 1, // if true, show patreon names for grandmas
        timeout: 0, // if true, game may show pause screen when timed out
        cloudSave: 1, // if true and on Steam, save and load to cloud
        bgMusic: 1, // if true and on Steam, play music even when game isn't focused
        notScary: 0, // if true, make some of the scary stuff less scary ("eyebrow mode")
        fullscreen: 0, // if true, Steam game will be fullscreen
        screenreader: 0, // if true, add some DOM stuff to facilitate screenreader interaction (requires reload)
        discordPresence: 1, // if true and applicable, show game activity in Discord status
    };

    static Mobile() {
        if (!Game.mobile) {
            Game.wrapper.className = 'mobile';
            Game.mobile = 1;
        } else {
            Game.wrapper.className = '';
            Game.mobile = 0;
        }
    }

    static showBackupWarning() {
        Game.Notify(
            loc('Back up your save!'),
            loc(
                'Hello again! Just a reminder that you may want to back up your Cookie Clicker save every once in a while, just in case.<br>To do so, go to Options and hit "Export save" or "Save to file"!'
            ) +
            '<div class="line"></div><a style="float:right;" onclick="Game.prefs.showBackupWarning=0;==CLOSETHIS()==">' +
            loc('Don\'t show this again') +
            '</a>',
            [25, 7]
        );
    }

    /* =====================================================================================
    BAKERY NAME
    =======================================================================================*/
    static RandomBakeryName() {
        let str = '';
        if (EN) {
            return (
                (Math.random() > 0.05
                    ? choose([
                        'Magic',
                        'Fantastic',
                        'Fancy',
                        'Sassy',
                        'Snazzy',
                        'Pretty',
                        'Cute',
                        'Pirate',
                        'Ninja',
                        'Zombie',
                        'Robot',
                        'Radical',
                        'Urban',
                        'Cool',
                        'Hella',
                        'Sweet',
                        'Awful',
                        'Double',
                        'Triple',
                        'Turbo',
                        'Techno',
                        'Disco',
                        'Electro',
                        'Dancing',
                        'Wonder',
                        'Mutant',
                        'Space',
                        'Science',
                        'Medieval',
                        'Future',
                        'Captain',
                        'Bearded',
                        'Lovely',
                        'Tiny',
                        'Big',
                        'Fire',
                        'Water',
                        'Frozen',
                        'Metal',
                        'Plastic',
                        'Solid',
                        'Liquid',
                        'Moldy',
                        'Shiny',
                        'Happy',
                        'Happy Little',
                        'Slimy',
                        'Tasty',
                        'Delicious',
                        'Hungry',
                        'Greedy',
                        'Lethal',
                        'Professor',
                        'Doctor',
                        'Power',
                        'Chocolate',
                        'Crumbly',
                        'Choklit',
                        'Righteous',
                        'Glorious',
                        'Mnemonic',
                        'Psychic',
                        'Frenetic',
                        'Hectic',
                        'Crazy',
                        'Royal',
                        'El',
                        'Von'
                    ]) + ' '
                    : 'Mc') +
                choose([
                    'Cookie',
                    'Biscuit',
                    'Muffin',
                    'Scone',
                    'Cupcake',
                    'Pancake',
                    'Chip',
                    'Sprocket',
                    'Gizmo',
                    'Puppet',
                    'Mitten',
                    'Sock',
                    'Teapot',
                    'Mystery',
                    'Baker',
                    'Cook',
                    'Grandma',
                    'Click',
                    'Clicker',
                    'Spaceship',
                    'Factory',
                    'Portal',
                    'Machine',
                    'Experiment',
                    'Monster',
                    'Panic',
                    'Burglar',
                    'Bandit',
                    'Booty',
                    'Potato',
                    'Pizza',
                    'Burger',
                    'Sausage',
                    'Meatball',
                    'Spaghetti',
                    'Macaroni',
                    'Kitten',
                    'Puppy',
                    'Giraffe',
                    'Zebra',
                    'Parrot',
                    'Dolphin',
                    'Duckling',
                    'Sloth',
                    'Turtle',
                    'Goblin',
                    'Pixie',
                    'Gnome',
                    'Computer',
                    'Pirate',
                    'Ninja',
                    'Zombie',
                    'Robot'
                ])
            );
        } else {
            str += locStrings['bakery random name, 1st half'] && locStrings['bakery random name, 2nd half']
                ? choose(loc('bakery random name, 1st half')) + ' ' + choose(loc('bakery random name, 2nd half'))
                : choose(loc('bakery random name'));
        }
        return str;
    }
    static GetBakeryName() {
        return Game.RandomBakeryName();
    }
    static bakeryName = '';
    static bakeryNameL = $('bakeryName', true);
    /** @param {string} what */
    static bakeryNameSet(what) {
        try {
            Game.bakeryName = what.replace(/[^'\-_0-9 \p{L}]/gu, ' ');
            Game.bakeryName = Game.bakeryName.trim().slice(0, 28);
        } catch {
            Game.bakeryName = what.replace(/W+/g, ' ');
            Game.bakeryName = Game.bakeryName.slice(0, 28);
        }
        Game.bakeryNameRefresh();
    }
    static bakeryNameRefresh() {
        let name = Game.bakeryName;
        if (EN) {
            name += name.slice(-1).toLowerCase() === 's' ? '\' bakery' : '\'s bakery';
        } else name = String(loc('%1\'s bakery', name));
        Game.bakeryNameL.innerHTML = name;
        name = Game.bakeryName.toLowerCase();
        if (name === 'orteil') Game.Win('God complex');
        if (name.indexOf('saysopensesame', name.length - 'saysopensesame'.length) > 0 && !Game.sesame) Game.OpenSesame();
        Game.recalculateGains = 1;
    }
    static bakeryNamePrompt() {
        PlaySound('snd/tick.mp3');
        Game.Prompt(
            '<id NameBakery><h3>' +
            loc('Name your bakery') +
            '</h3><div class="block" style="text-align:center;">' +
            loc('What should your bakery\'s name be?') +
            '</div><div class="block"><input type="text" style="text-align:center;width:100%;" id="bakeryNameInput" value="' +
            Game.bakeryName +
            '"/></div>',
            [
                [
                    loc('Confirm'),
                    'if ($(\'bakeryNameInput\').value.length>0) {Game.bakeryNameSet($(\'bakeryNameInput\').value);Game.Win(\'What\\\'s in a name\');Game.ClosePrompt();}'
                ],
                [loc('Random'), 'Game.bakeryNamePromptRandom();'],
                loc('Cancel')
            ]
        );
        $('bakeryNameInput', true).focus();
        $('bakeryNameInput', true).select();
    }
    static bakeryNamePromptRandom() {
        $('bakeryNameInput', true).value = Game.RandomBakeryName();
    }

    /* =====================================================================================
    TOOLTIP
    =======================================================================================*/
    static tooltip = {
        /** @type {string | Function | undefined} */
        text: '',
        x: 0,
        y: 0,
        origin: '',
        on: 0,
        tt: $('tooltip', true),
        tta: $('tooltipAnchor', true),
        shouldHide: 1,
        dynamic: 0,
        /** @type {HTMLElement | null} */
        from: null,
        /**
         * @param {HTMLElement} from
         * @param {string | Function} text
         * @param {string} origin
         */
        draw(from, text, origin) {
            this.shouldHide = 0;
            this.text = text;
            this.from = from;
            this.origin = origin;
            const { tt, tta } = this;
            tt.style.left = 'auto';
            tt.style.top = 'auto';
            tt.style.right = 'auto';
            tt.style.bottom = 'auto';
            if (typeof this.text === 'function') {
                let text = this.text();
                if (text == '') tta.style.opacity = '0';
                else {
                    tt.innerHTML = decode(text);
                    tta.style.opacity = '1';
                }
            } else tt.innerHTML = decode(this.text);
            tta.style.display = 'block';
            tta.style.visibility = 'hidden';
            Game.tooltip.update();
            tta.style.visibility = 'visible';
            this.on = 1;
        },
        update() {
            let X = 0;
            let Y = 0;
            const width = this.tt.offsetWidth;
            const height = this.tt.offsetHeight;
            if (this.origin === 'store') {
                X = Game.windowW - 332 - width;
                Y = Game.mouseY - 32;
                if (Game.onCrate) Y = Game.onCrate.getBounds().top - 42;
                Y = Math.max(0, Math.min(Game.windowH - height - 44, Y));
            } else {
                if (Game.onCrate) {
                    const rect = Game.onCrate.getBounds();
                    if (rect.left == 0 && rect.top == 0) {
                        // if we get that bug where we get stuck in the top-left, move to the mouse (REVISION : just do nothing)
                        return false;
                    }
                    if (this.origin === 'left') {
                        X = rect.left - width - 16;
                        Y = rect.top + (rect.bottom - rect.top) / 2 - height / 2 - 38;
                        Y = Math.max(0, Math.min(Game.windowH - height - 19, Y));
                        if (X < 0) X = rect.right;
                    } else {
                        X = rect.left + (rect.right - rect.left) / 2 - width / 2 - 8;
                        Y = rect.top - height - 32 - 16;
                        X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                        if (Y < 0) Y = rect.bottom - 32;
                    }
                }
                // eslint-disable-next-line unicorn/prefer-switch
                else if (this.origin === 'bottom-right') {
                    X = Game.mouseX + 8;
                    Y = Game.mouseY - 32;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                }
                else if (this.origin === 'bottom') {
                    X = Game.mouseX - width / 2 - 8;
                    Y = Game.mouseY + 24;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                }
                else if (this.origin === 'left') {
                    X = Game.mouseX - width - 24;
                    Y = Game.mouseY - height / 2 - 8;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                }
                else if (this.origin === 'this' && this.from) {
                    const rect = this.from.getBounds();
                    X = (rect.left + rect.right) / 2 - width / 2 - 8;
                    Y = rect.top - this.tt.clientHeight - 48;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    if (Y < 0) Y = rect.bottom - 24;
                    if (Y + height + 40 > Game.windowH) {
                        X = rect.right + 8;
                        Y = rect.top + (rect.bottom - rect.top) / 2 - height / 2 - 38;
                        Y = Math.max(0, Math.min(Game.windowH - height - 19, Y));
                    }
                } else {
                    X = Game.mouseX - width / 2 - 8;
                    Y = Game.mouseY - height - 32;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                }
            }
            this.tta.style.left = X + 'px';
            this.tta.style.right = 'auto';
            this.tta.style.top = Y + 'px';
            this.tta.style.bottom = 'auto';
            if (this.shouldHide) {
                this.hide();
                this.shouldHide = 0;
            }
            else if (Game.drawT % 10 === 0 && typeof this.text === 'function') {
                const text = this.text();
                if (text == '') this.tta.style.opacity = '0';
                else {
                    this.tt.innerHTML = decode(text);
                    this.tta.style.opacity = '1';
                }
            }
            return true;
        },
        hide() {
            if (this.tta) this.tta.style.display = 'none';
            this.dynamic = 0;
            this.on = 0;
        }
    };

    /**
     * @param {string | number | boolean} text
     * @param {string | undefined} [origin]
     * @param {boolean | undefined} [isCrate]
     */
    static getTooltip(text, origin, isCrate) {
        origin ||= 'middle';
        return isCrate ? (
            'onMouseOut="Game.setOnCrate(0);Game.tooltip.shouldHide=1;" onMouseOver="if (!Game.mouseDown) {' +
            `Game.setOnCrate(this);Game.tooltip.dynamic=0;Game.tooltip.draw(this,'${
                encodeURIComponent(text)
            }','${origin}');}"`
        ) : (
            'onMouseOut="Game.tooltip.shouldHide=1;" onMouseOver="Game.tooltip.dynamic=0;Game.tooltip.draw(this,\'' +
            encodeURIComponent(text) +
            '\',\'' +
            origin +
            '\');"'
        );
    }
    /**
     * @param {string} func
     * @param {string} origin
     * @param {boolean | undefined} [isCrate]
     */
    static getDynamicTooltip(func, origin, isCrate) {
        origin ||= 'middle';
        return isCrate ? (
            'onMouseOut="Game.setOnCrate(0);Game.tooltip.shouldHide=1;" onMouseOver="if (!Game.mouseDown) {' +
            'Game.setOnCrate(this);Game.tooltip.dynamic=1;Game.tooltip.draw(this,' +
            'function(){return ' +
            func +
            '();}' +
            ',\'' +
            origin +
            '\');}"'
        ) : (
            'onMouseOut="Game.tooltip.shouldHide=1;" onMouseOver="Game.tooltip.dynamic=1;Game.tooltip.draw(this,' +
            'function(){return ' +
            func +
            '();}' +
            ',\'' +
            origin +
            '\');"'
        );
    }
    /**
     * @param {HTMLElement} el
     * @param {string | Function} func
     * @param {string} origin
     */
    static attachTooltip(el, func, origin) {
        ASSERT_NOT_NULL(el);
        if (typeof func === 'string') {
            let str = func;
            func = (function (str) {
                return function () {
                    return str;
                };
            })(str);
        }
        origin ||= 'middle';
        el.addEventListener(
            'mouseover',
            (function (func, el, origin) {
                return function () {
                    Game.tooltip.dynamic = 1;
                    Game.tooltip.draw(el, func, origin);
                };
            })(func, el, origin)
        );
        el.addEventListener(
            'mouseout',
            (function () {
                return function () {
                    Game.tooltip.shouldHide = 1;
                };
            })()
        );
    }

    static externalDataLoaded = false;

    static grandmaNames = [
        'Granny',
        'Gusher',
        'Ethel',
        'Edna',
        'Doris',
        'Maud',
        'Hilda',
        'Gladys',
        'Michelle',
        'Michele',
        'Phyllis',
        'Millicent',
        'Muriel',
        'Myrtle',
        'Mildred',
        'Mavis',
        'Helen',
        'Gloria',
        'Sheila',
        'Betty',
        'Gertrude',
        'Agatha',
        'Beryl',
        'Agnes',
        'Pearl',
        'Precious',
        'Ruby',
        'Vera',
        'Bonnie',
        'Ada',
        'Bunny',
        'Cookie',
        'Darling',
        'Gaga',
        'GamGam',
        'Memaw',
        'Mimsy',
        'Peanut',
        'Nana',
        'Nan',
        'Tootsie',
        'Warty',
        'Stinky',
        'Heinous'
    ];
    /** @type {string[]} */
    static customGrandmaNames = [];
    static heralds = 0;

    static useLocalStorage = 1;

    /**
     * @param {Event} e
     */
    static handleScroll(e) {
        const asWheel = /** @type {WheelEvent & { wheelDelta: number; }} */ (e);
        Game.Scroll = asWheel.detail < 0 || asWheel.wheelDelta > 0 ? 1 : -1;
        Game.lastActivity = Game.time;
    }

    /* =====================================================================================
    INIT FUNCTION
    =======================================================================================*/
    static Init() {
        Game.ready = true;

        /* =====================================================================================
        VARIABLES AND PRESETS
        =======================================================================================*/
        Game.T = 0;
        Game.drawT = 0;
        Game.loopT = 0;
        Game.fps = 30;

        Game.season = Game.baseSeason;

        Game.l = $('game', true);
        Game.wrapper = $('wrapper', true);

        Game.wrapper.classList.add('onWeb');

        if (Game.mobile === 1) Game.wrapper.className = 'mobile';
        Game.clickStr = Game.touchEvents ? 'ontouchend' : 'onclick';

        $('versionNumber', true).innerHTML =
            'v. ' +
            Game.version +
            `<div id="httpsSwitch" style="cursor:pointer;display:inline-block;background:url(img/${Game.https ? 'lockOn' : 'lockOff'
            }.png);width:16px;height:16px;position:relative;top:4px;left:0px;margin:0px -2px;"></div>` +
            (Game.beta ? ' <span style="color:#ff0;">beta</span>' : '');

        if (Game.beta) {
            const me = $('linkVersionBeta', true);
            ASSERT_NOT_NULL(me.parentNode).removeChild(me);
        } else {
            const me = $('linkVersionLive', true);
            ASSERT_NOT_NULL(me.parentNode).removeChild(me);
        }

        Game.lastActivity = Date.now(); // reset on mouse move, key press or click

        // latency compensator stuff
        Game.time = Date.now();
        Game.accumulatedDelay = 0;
        Game.delayTimeouts = 0; // how many times we've gone over the timeout delay
        Game.catchupLogic = 0;
        Game.fpsStartTime = 0;
        Game.frameNumber = 0;
        Game.currentFps = Game.fps;
        Game.previousFps = Game.currentFps;

        window.addEventListener('resize', Game.resize);
        Game.resize();

        window.addEventListener('beforeunload', (event) => {
            if (Game.prefs && Game.prefs.warn) {
                event.preventDefault();
                return event.returnValue = loc('Are you sure you want to close Cookie Clicker?');
            }
            return;
        });

        Game.bakeryNameL.addEventListener('click', Game.bakeryNamePrompt, false);
        Game.bakeryNameSet(Game.GetBakeryName());

        Game.attachTooltip(
            $('httpsSwitch', true),
            '<div style="padding:8px;width:350px;text-align:center;font-size:11px;">' +
            loc(
                'You are currently playing Cookie Clicker on the <b>%1</b> protocol.' +
                '<br>The <b>%2</b> version uses a different save slot than this one.' +
                '<br>Click this lock to reload the page and switch to the <b>%2</b> version!',
                [Game.https ? 'HTTPS' : 'HTTP', Game.https ? 'HTTP' : 'HTTPS']
            ) +
            '</div>',
            'this'
        );
        $('httpsSwitch', true).addEventListener('click', function () {
            PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
            if (location.protocol === 'https:') location.href = 'http:' + location.href.slice(location.protocol.length);
            else if (location.protocol === 'http:') location.href = 'https:' + location.href.slice(location.protocol.length);
        });

        $('changeLanguage', true).addEventListener('click', function () {
            Game.showLangSelection();
        });

        Game.attachTooltip(
            $('topbarOrteil', true),
            '<div style="padding:8px;width:250px;text-align:center;">Back to Orteil\'s subdomain!<br>Lots of other games in there!</div>' +
            tinyIcon([17, 5], 'display:block;margin:-12px auto;'),
            'this'
        );
        Game.attachTooltip(
            $('topbarDashnet', true),
            '<div style="padding:8px;width:250px;text-align:center;">Back to our homepage!</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarTwitter', true),
            '<div style="padding:8px;width:250px;text-align:center;">Orteil\'s twitter, which frequently features game updates.</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarTumblr', true),
            '<div style="padding:8px;width:250px;text-align:center;">Orteil\'s tumblr, which frequently features game updates.</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarDiscord', true),
            '<div style="padding:8px;width:250px;text-align:center;">Our official discord server.<br>' +
            'You can share tips and questions about Cookie Clicker and all our other games!</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarPatreon', true),
            '<div style="padding:8px;width:250px;text-align:center;">' +
            'Support us on Patreon and help us keep updating Cookie Clicker!<br>There\'s neat rewards for patrons too!</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarMerch', true),
            '<div style="padding:8px;width:250px;text-align:center;">Cookie Clicker shirts, hoodies and stickers!</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarMobileCC', true),
            '<div style="padding:8px;width:250px;text-align:center;">Play Cookie Clicker on your phone!' +
            '<br>(Android only; iOS version will be released later)</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarSteamCC', true),
            '<div style="padding:8px;width:250px;text-align:center;">Get Cookie Clicker on Steam!<br>Featuring music by C418.</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarRandomgen', true),
            '<div style="padding:8px;width:250px;text-align:center;">A thing we made that lets you write random generators.</div>',
            'this'
        );
        Game.attachTooltip(
            $('topbarIGM', true),
            '<div style="padding:8px;width:250px;text-align:center;">' +
            'A thing we made that lets you create your own idle games using a simple scripting language.</div>',
            'this'
        );
        $('changeLanguage', true).innerHTML = locStr('Change language');
        $('links', true).childNodes[0].nodeValue = locStr('Other versions');

        Game.attachTooltip(
            $('heralds', true),
            function () {
                let str = '';

                if (!Game.externalDataLoaded)
                    str += loc('Heralds couldn\'t be loaded. There may be an issue with our servers, or you are playing the game locally.');
                else {
                    if (Game.heralds === 0)
                        str += loc('There are no heralds at the moment. Please consider <b style="color:#bc3aff;">donating to our Patreon</b>!');
                    else {
                        str +=
                            '<b style="color:#bc3aff;text-shadow:0px 1px 0px #6d0096;">' +
                            loc('%1 herald', Game.heralds) +
                            '</b> ' +
                            loc(
                                'selflessly inspiring a boost in production for everyone, resulting in %1.',
                                '<br><b style="color:#cdaa89;text-shadow:0px 1px 0px #7c4532,0px 0px 6px #7c4532;">' +
                                '<div style="width:16px;height:16px;display:inline-block;vertical-align:middle;background:url(img/money.png);">' +
                                '</div>' +
                                loc('+%1% cookies per second', Game.heralds) +
                                '</b>'
                            );
                        str += '<div class="line"></div>';
                        if (Game.ascensionMode == 1)
                            str += loc('You are in a <b>Born again</b> run, and are not currently benefiting from heralds.');
                        else if (Game.Has('Heralds'))
                            str += loc('You own the <b>Heralds</b> upgrade, and therefore benefit from the production boost.');
                        else
                            str += loc(
                                'To benefit from the herald bonus, you need a special upgrade you do not yet own.' +
                                'You will permanently unlock it later in the game.'
                            );
                    }
                }
                str +=
                    '<div class="line"></div><span style="font-size:90%;opacity:0.6;">' +
                    loc(
                        '<b>Heralds</b> are people who have donated to our highest Patreon tier, and are limited to 100.<br>' +
                        'Each herald gives everyone +1% CpS.<br>Heralds benefit everyone playing the game, regardless of whether you donated.'
                    ) +
                    '</span><div class="line"></div>' +
                    tinyIcon([21, 29]);

                str +=
                    '<div style="width:31px;height:39px;background:url(img/heraldFlag.png);position:absolute;top:0px;left:8px;">' +
                    '</div><div style="width:31px;height:39px;background:url(img/heraldFlag.png);position:absolute;top:0px;right:8px;"></div>';

                return (
                    '<div style="padding:8px;width:300px;text-align:center;" class="prompt" id="tooltipHeralds"><h3>' +
                    loc('Heralds') +
                    '</h3><div class="block">' +
                    str +
                    '</div></div>'
                );
            },
            'this'
        );
        $('heraldsAmount', true).textContent = '?';
        $('heralds', true).style.display = 'inline-block';

        $('ascendOverlay', true).innerHTML =
            '<div id="ascendBox">' +
            '<div id="ascendData1" class="ascendData smallFramed prompt" style="margin-top:8px;"><h3 id="ascendPrestige"></h3></div>' +
            '<div id="ascendData2" class="ascendData smallFramed prompt"><h3 id="ascendHCs"></h3></div>' +
            '<a id="ascendButton" class="option framed large red" ' +
            Game.getTooltip(
                '<div style="min-width:300px;text-align:center;font-size:11px;padding:8px;" id="tooltipReincarnate">' +
                loc('Click this once you\'ve bought<br>everything you need!') +
                '</div>',
                'bottom-right'
            ) +
            ' style="font-size:16px;margin-top:0px;"><span class="fancyText" style="font-size:20px;">' +
            loc('Reincarnate') +
            '</span></a>' +
            '<div id="ascendModeButton" style="position:absolute;right:34px;bottom:25px;display:none;"></div>' +
            '<input type="text" style="display:block;" id="upgradePositions"/></div>' +
            '<div id="ascendInfo"><div class="ascendData smallFramed" style="margin-top:22px;width:75%;font-size:11px;">' +
            loc('You are ascending.<br>Drag the screen around<br>or use arrow keys!<br>When you\'re ready,<br>click Reincarnate.') +
            '</div></div>';

        Game.attachTooltip(
            $('ascendData1', true),
            function () {
                return (
                    '<div style="min-width:300px;text-align:center;font-size:11px;padding:8px;" id="tooltipAscendData1">(<b>' +
                    Beautify(Game.heavenlyChips) +
                    '</b>)<div class="line"></div>' +
                    loc('Each prestige level grants you a permanent <b>+%1% CpS</b>.<br>The more levels you have, the more cookies they require.', 1) +
                    '</div>'
                );
            },
            'bottom-right'
        );
        Game.attachTooltip(
            $('ascendData2', true),
            function () {
                return (
                    '<div style="min-width:300px;text-align:center;font-size:11px;padding:8px;" id="tooltipAscendData2">(<b>' +
                    loc('%1 heavenly chip', LBeautify(Game.heavenlyChips)) +
                    '</b>)<div class="line"></div>' +
                    loc('Heavenly chips are used to buy heavenly upgrades.<br>You gain <b>1 chip</b> every time you gain a prestige level.') +
                    '</div>'
                );
            },
            'bottom-right'
        );

        Game.UpdateAscensionModePrompt();

        $('ascendButton', true).addEventListener('click', function () {
            PlaySound('snd/tick.mp3');
            Game.Reincarnate();
        });

        $('comments', true).innerHTML =
        $('comments', true).innerHTML +
        '<div id="lumps" onclick="Game.clickLump();" ' +
        Game.getDynamicTooltip('Game.lumpTooltip', 'bottom') +
        '><div id="lumpsIcon" class="usesIcon"></div><div id="lumpsIcon2" class="usesIcon"></div><div id="lumpsAmount">0</div></div>';

        let bigCookie = $('bigCookie', true);
        if (Game.prefs.screenreader) {
            bigCookie.ariaLabelledby = 'bigCookieLabel';
            bigCookie.insertAdjacentHTML(
                'beforeend',
                '<label id="bigCookieLabel" style="font-size:100px !important;" class="srOnly">' + loc('Big clickable cookie') + '</label>'
            );
            bigCookie.tabIndex = 1;
        }

        if (!Game.touchEvents) {
            // @ts-expect-error jsdoc sucks
            bigCookie.addEventListener('click', Game.ClickCookie);
            bigCookie.addEventListener('mousedown', function (event) {
                Game.BigCookieState = 1;
                if (Game.prefs.cookiesound) Game.playCookieClickSound();
                if (event) event.preventDefault();
            });
            bigCookie.addEventListener('mouseup', function (event) {
                Game.BigCookieState = 2;
                if (event) event.preventDefault();
            });
            bigCookie.addEventListener('mouseout', function () {
                Game.BigCookieState = 0;
            });
            bigCookie.addEventListener('mouseover', function () {
                Game.BigCookieState = 2;
            });
            document.addEventListener('mousemove', Game.GetMouseCoords);
            document.addEventListener('mousedown', function (event) {
                Game.lastActivity = Game.time;
                Game.mouseDown = 1;
                Game.clickFrom = ASSERT_NOT_NULL(event.target);
            });
            document.addEventListener('mouseup', function () {
                Game.lastActivity = Game.time;
                Game.mouseDown = 0;
                Game.clickFrom = 0;
            });
            document.addEventListener('click', function (event) {
                Game.lastActivity = Game.time;
                Game.Click = 1;
                Game.lastClickedEl = event.target;
                Game.clickFrom = 0;
            });
            document.addEventListener('DOMMouseScroll', Game.handleScroll);
            document.addEventListener('mousewheel', Game.handleScroll);
        } else {
            // touch events
            // @ts-expect-error jsdoc BAD
            bigCookie.addEventListener('touchend', Game.ClickCookie);
            bigCookie.addEventListener('touchstart', function (event) {
                Game.BigCookieState = 1;
                if (event) event.preventDefault();
            });
            bigCookie.addEventListener('touchend', function (event) {
                Game.BigCookieState = 0;
                if (event) event.preventDefault();
            });
            document.addEventListener('mousemove', Game.GetMouseCoords);
            document.addEventListener('touchstart', function (event) {
                Game.lastActivity = Game.time;
                Game.mouseDown = 1;
            });
            document.addEventListener('touchend', function (event) {
                Game.lastActivity = Game.time;
                Game.mouseDown = 0;
            });
            document.addEventListener('touchend', function (event) {
                Game.lastActivity = Game.time;
                Game.Click = 1;
            });
        }

        window.addEventListener('keyup', function (e) {
            Game.lastActivity = Game.time;
            if (e.key === 'Escape') {
                if (Game.promptOn && !Game.promptNoClose) {
                    Game.ClosePrompt();
                    PlaySound('snd/tickOff.mp3');
                }
                if (Game.AscendTimer > 0) Game.AscendTimer = Game.AscendDuration;
            } // esc closes prompt
            if (Game.promptOn && e.key === 'Enter') Game.ConfirmPrompt(); // enter confirms prompt
            Game.keys[e.code] = false;
        });
        window.addEventListener('keydown', function (e) {
            if (Game.promptOn && e.key === 'Tab') {
                // tab to shift through prompt buttons
                if (e.shiftKey) Game.FocusPromptOption(-1);
                else Game.FocusPromptOption(1);
                e.preventDefault();
            }
            if (!Game.OnAscend && Game.AscendTimer == 0) {
                if (e.ctrlKey && e.code === 'KeyS') {
                    Game.toSave = true;
                    e.preventDefault();
                } // ctrl-s saves the game
                else if (e.ctrlKey && e.code === 'KeyO') {
                    Game.ImportSave();
                    e.preventDefault();
                } // ctrl-o opens the import menu
            }
            if ((e.key === 'Shift' || e.key === 'Control') && Game.tooltip.dynamic) Game.tooltip.update();
            Game.keys[e.code] = true;
            if (e.key === 'Tab') Game.keys = {}; // reset keys on tab press
        });

        window.addEventListener('visibilitychange', function (e) {
            Game.keys = {}; // reset all key pressed on visibility change (should help prevent ctrl still being down after ctrl-tab)
        });

        for (let i = 0; i < Game.particlesN; i++) {
            Game.particles[i] = {
                x: 0,
                y: 0,
                xd: 0,
                yd: 0,
                w: 64,
                h: 64,
                z: 0,
                size: 1,
                dur: 2,
                life: -1,
                r: 0,
                pic: 'smallCookies.png',
                picId: 0,
                picPos: [0, 0]
            };
        }

        let str = '';
        for (let i = 0; i < 20; i++) {
            Game.textParticles[i] = { x: 0, y: 0, life: -1, text: '' };
            str += '<div id="particle' + i + '" class="particle title"></div>';
        }

        $('particles', true).innerHTML = str;

        Game.darkenL.addEventListener('click', function () {
            if (!Game.promptNoClose) {
                Game.Click = 0;
                PlaySound('snd/tickOff.mp3');
                Game.ClosePrompt();
            }
        });
        Game.addClass('focus' + Game.onPanel);

        $('prefsButton', true).addEventListener('click', function () {
            Game.ShowMenu('prefs');
        });
        $('statsButton', true).addEventListener('click', function () {
            Game.ShowMenu('stats');
        });
        $('logButton', true).addEventListener('click', function () {
            Game.ShowMenu('log');
        });
        $('legacyButton', true).addEventListener('click', function () {
            PlaySound('snd/tick.mp3');
            Game.Ascend();
        });

        Game.tickerL.addEventListener('click', function (event) {
            Game.Ticker = '';
            Game.TickerClicks++;
            if (Game.windowW < Game.tickerTooNarrow) {
                Game.Win('Stifling the press');
            } else if (Game.TickerClicks >= 50) {
                Game.Win('Tabloid addiction');
            }

            if (Game.TickerEffect && Game.TickerEffect.type == 'fortune') {
                PlaySound('snd/fortune.mp3', 1);
                Game.SparkleAt(Game.mouseX, Game.mouseY);
                let effect = Game.TickerEffect.sub;
                if (effect == 'fortuneGC') {
                    Game.Notify(loc('Fortune!'), loc('A golden cookie has appeared.'), [10, 32]);
                    Game.fortuneGC = 1;
                    let newShimmer = new Game.shimmer('golden', {
                        noWrath: true
                    });
                } else if (effect == 'fortuneCPS') {
                    Game.Notify(loc('Fortune!'), loc('You gain <b>one hour</b> of your CpS (capped at double your bank).'), [10, 32]);
                    Game.fortuneCPS = 1;
                    Game.Earn(Math.min(Game.cookiesPs * 60 * 60, Game.cookies));
                } else {
                    Game.Notify(effect.dname, loc('You\'ve unlocked a new upgrade.'), effect.icon);
                    effect.unlock();
                }
            }

            Game.TickerEffect = 0;
        });

        {
            // define objects
            new Game.Object(
                'Cursor',
                'cursor|cursors|clicked|[X] extra finger|[X] extra fingers',
                'Autoclicks once every 10 seconds.',
                0,
                0,
                {},
                15,
                function (/** @type {any} */ me) {
                    let add = 0;
                    if (Game.Has('Thousand fingers')) add += 0.1;
                    if (Game.Has('Million fingers')) add *= 5;
                    if (Game.Has('Billion fingers')) add *= 10;
                    if (Game.Has('Trillion fingers')) add *= 20;
                    if (Game.Has('Quadrillion fingers')) add *= 20;
                    if (Game.Has('Quintillion fingers')) add *= 20;
                    if (Game.Has('Sextillion fingers')) add *= 20;
                    if (Game.Has('Septillion fingers')) add *= 20;
                    if (Game.Has('Octillion fingers')) add *= 20;
                    if (Game.Has('Nonillion fingers')) add *= 20;
                    if (Game.Has('Decillion fingers')) add *= 20;
                    if (Game.Has('Unshackled cursors')) add *= 25;
                    let mult = 1;
                    let num = 0;
                    for (let i in Game.Objects) {
                        if (Game.Objects[i].name != 'Cursor') num += Game.Objects[i].amount;
                    }
                    add *= num;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS('Cursor');
                    mult *= Game.eff('cursorCps');
                    return (
                        Game.ComputeCps(0.1, Game.Has('Reinforced index finger') + Game.Has('Carpal tunnel prevention cream') + Game.Has('Ambidextrous'), add) *
                    mult
                    );
                },
                function (self) {
                    if (self.amount >= 1) Game.Unlock(['Reinforced index finger', 'Carpal tunnel prevention cream']);
                    if (self.amount >= 10) Game.Unlock('Ambidextrous');
                    if (self.amount >= 25) Game.Unlock('Thousand fingers');
                    if (self.amount >= 50) Game.Unlock('Million fingers');
                    if (self.amount >= 100) Game.Unlock('Billion fingers');
                    if (self.amount >= 150) Game.Unlock('Trillion fingers');
                    if (self.amount >= 200) Game.Unlock('Quadrillion fingers');
                    if (self.amount >= 250) Game.Unlock('Quintillion fingers');
                    if (self.amount >= 300) Game.Unlock('Sextillion fingers');
                    if (self.amount >= 350) Game.Unlock('Septillion fingers');
                    if (self.amount >= 400) Game.Unlock('Octillion fingers');
                    if (self.amount >= 450) Game.Unlock('Nonillion fingers');
                    if (self.amount >= 500) Game.Unlock('Decillion fingers');

                    if (self.amount >= 1) Game.Win('Click');
                    if (self.amount >= 2) Game.Win('Double-click');
                    if (self.amount >= 50) Game.Win('Mouse wheel');
                    if (self.amount >= 100) Game.Win('Of Mice and Men');
                    if (self.amount >= 200) Game.Win('The Digital');
                    if (self.amount >= 300) Game.Win('Extreme polydactyly');
                    if (self.amount >= 400) Game.Win('Dr. T');
                    if (self.amount >= 500) Game.Win('Thumbs, phalanges, metacarpals');
                    if (self.amount >= 600) Game.Win('With her finger and her thumb');
                    if (self.amount >= 700) Game.Win('Gotta hand it to you');
                    if (self.amount >= 800) Game.Win('The devil\'s workshop');
                }
            );

            new Game.Object(
                'Grandma',
                'grandma|grandmas|baked|Grandmas are [X] year older|Grandmas are [X] years older',
                'A nice grandma to bake more cookies.',
                1,
                1,
                {
                    pic() {
                        let list = ['grandma'];
                        if (Game.Has('Farmer grandmas')) list.push('farmerGrandma');
                        if (Game.Has('Worker grandmas')) list.push('workerGrandma');
                        if (Game.Has('Miner grandmas')) list.push('minerGrandma');
                        if (Game.Has('Cosmic grandmas')) list.push('cosmicGrandma');
                        if (Game.Has('Transmuted grandmas')) list.push('transmutedGrandma');
                        if (Game.Has('Altered grandmas')) list.push('alteredGrandma');
                        if (Game.Has('Grandmas\' grandmas')) list.push('grandmasGrandma');
                        if (Game.Has('Antigrandmas')) list.push('antiGrandma');
                        if (Game.Has('Rainbow grandmas')) list.push('rainbowGrandma');
                        if (Game.Has('Banker grandmas')) list.push('bankGrandma');
                        if (Game.Has('Priestess grandmas')) list.push('templeGrandma');
                        if (Game.Has('Witch grandmas')) list.push('witchGrandma');
                        if (Game.Has('Lucky grandmas')) list.push('luckyGrandma');
                        if (Game.Has('Metagrandmas')) list.push('metaGrandma');
                        if (Game.Has('Script grannies')) list.push('scriptGrandma');
                        if (Game.Has('Alternate grandmas')) list.push('alternateGrandma');
                        if (Game.Has('Brainy grandmas')) list.push('brainyGrandma');
                        if (Game.season == 'christmas') list.push('elfGrandma');
                        if (Game.season == 'easter') list.push('bunnyGrandma');
                        return choose(list) + '.png';
                    },
                    bg: 'grandmaBackground.png',
                    xV: 8,
                    yV: 8,
                    w: 32,
                    rows: 3,
                    x: 0,
                    y: 16
                },
                100,
                function (me) {
                    let mult = 1;
                    for (const grandmaSynergy of Game.GrandmaSynergies) {
                        if (Game.Has(grandmaSynergy)) mult *= 2;
                    }
                    if (Game.Has('Bingo center/Research facility')) mult *= 4;
                    if (Game.Has('Ritual rolling pins')) mult *= 2;
                    if (Game.Has('Naughty list')) mult *= 2;

                    if (Game.Has('Elderwort biscuits')) mult *= 1.02;

                    mult *= Game.eff('grandmaCps');

                    if (Game.Has('Cat ladies')) {
                        for (const kitten of Game.UpgradesByPool['kitten']) {
                            if (Game.Has(kitten.name)) mult *= 1.29;
                        }
                    }

                    mult *= Game.GetTieredCpsMult(me);

                    let add = 0;
                    if (Game.Has('One mind')) add += Game.Objects['Grandma'].amount * 0.02;
                    if (Game.Has('Communal brainsweep')) add += Game.Objects['Grandma'].amount * 0.02;
                    if (Game.Has('Elder Pact')) add += Game.Objects['Portal'].amount * 0.05;

                    let num = 0;
                    for (let i in Game.Objects) {
                        if (Game.Objects[i].name != 'Grandma') num += Game.Objects[i].amount;
                    }
                    mult *= 1 + Game.auraMult('Elder Battalion') * 0.01 * num;

                    mult *= Game.magicCpS(me.name);

                    return (me.baseCps + add) * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                }
            );
            Game.last.sellFunction = function () {
                Game.Win('Just wrong');
                if (this.amount == 0) {
                    Game.Lock('Elder Pledge');
                    Game.CollectWrinklers();
                    Game.pledgeT = 0;
                }
            };
            Game.last.iconFunc = function (/** @type {string} */ type) {
                let grandmaIcons = [
                    [0, 1],
                    [0, 2],
                    [1, 2],
                    [2, 2]
                ];
                if (type == 'off') return [0, 1];
                if (Game.prefs.notScary && Game.elderWrath > 0) return [3, 2];
                return grandmaIcons[Game.elderWrath];
            };

            new Game.Object(
                'Farm',
                'farm|farms|harvested|[X] more acre|[X] more acres',
                'Grows cookie plants from cookie seeds.',
                3,
                2,
                { base: 'farm', xV: 8, yV: 8, w: 64, rows: 2, x: 0, y: 16 },
                500,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.minigameUrl = 'minigameGarden.js';
            Game.last.minigameName = loc('Garden');

            new Game.Object(
                'Mine',
                'mine|mines|mined|[X] mile deeper|[X] miles deeper',
                'Mines out cookie dough and chocolate chips.',
                4,
                3,
                { base: 'mine', xV: 16, yV: 16, w: 64, rows: 2, x: 0, y: 24 },
                10000,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );

            new Game.Object(
                'Factory',
                'factory|factories|mass-produced|[X] additional patent|[X] additional patents',
                'Produces large quantities of cookies.',
                5,
                4,
                { base: 'factory', xV: 8, yV: 0, w: 64, rows: 1, x: 0, y: -22 },
                3000,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.minigameName = loc('Dungeon');

            new Game.Object(
                'Bank',
                'bank|banks|banked|Interest rates [X]% better|Interest rates [X]% better',
                'Generates cookies from interest.',
                6,
                15,
                { base: 'bank', xV: 8, yV: 4, w: 56, rows: 1, x: 0, y: 13 },
                0,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.minigameUrl = 'minigameMarket.js';
            Game.last.minigameName = loc('Stock Market');

            new Game.Object(
                'Temple',
                'temple|temples|discovered|[X] sacred artifact retrieved|[X] sacred artifacts retrieved',
                'Full of precious, ancient chocolate.',
                7,
                16,
                { base: 'temple', xV: 8, yV: 4, w: 72, rows: 2, x: 0, y: -5 },
                0,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.minigameUrl = 'minigamePantheon.js';
            Game.last.minigameName = loc('Pantheon');

            new Game.Object(
                'Wizard tower',
                'wizard tower|wizard towers|summoned|Incantations have [X] more syllable|Incantations have [X] more syllables',
                'Summons cookies with magic spells.',
                8,
                17,
                {
                    base: 'wizardtower',
                    xV: 16,
                    yV: 16,
                    w: 48,
                    rows: 2,
                    x: 0,
                    y: 20
                },
                0,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName =
                '<span style="font-size:90%;letter-spacing:-1px;position:relative;bottom:2px;">Wizard tower</span>'; // shrink
            Game.last.minigameUrl = 'minigameGrimoire.js';
            Game.last.minigameName = loc('Grimoire');

            new Game.Object(
                'Shipment',
                'shipment|shipments|shipped|[X] galaxy fully explored|[X] galaxies fully explored',
                'Brings in fresh cookies from the cookie planet.',
                9,
                5,
                { base: 'shipment', xV: 16, yV: 16, w: 64, rows: 1, x: 0, y: 0 },
                40000,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );

            new Game.Object(
                'Alchemy lab',
                'alchemy lab|alchemy labs|transmuted|[X] primordial element mastered|[X] primordial elements mastered',
                'Turns gold into cookies!',
                10,
                6,
                { base: 'alchemylab', xV: 16, yV: 16, w: 64, rows: 2, x: 0, y: 16 },
                200000,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName = '<span style="font-size:90%;letter-spacing:-1px;position:relative;bottom:2px;">Alchemy lab</span>'; // shrink

            new Game.Object(
                'Portal',
                'portal|portals|retrieved|[X] dimension enslaved|[X] dimensions enslaved',
                'Opens a door to the Cookieverse.',
                11,
                7,
                { base: 'portal', xV: 32, yV: 32, w: 64, rows: 2, x: 0, y: 0 },
                1666666,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );

            new Game.Object(
                'Time machine',
                'time machine|time machines|recovered|[X] century secured|[X] centuries secured',
                'Brings cookies from the past, before they were even eaten.',
                12,
                8,
                { base: 'timemachine', xV: 32, yV: 32, w: 64, rows: 1, x: 0, y: 0 },
                123456789,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName = '<span style="font-size:80%;letter-spacing:-1px;position:relative;bottom:3px;">Time machine</span>'; // shrink

            new Game.Object(
                'Antimatter condenser',
                'antimatter condenser|antimatter condensers|condensed|[X] extra quark flavor|[X] extra quark flavors',
                'Condenses the antimatter in the universe into cookies.',
                13,
                13,
                {
                    base: 'antimattercondenser',
                    xV: 0,
                    yV: 64,
                    w: 64,
                    rows: 1,
                    x: 0,
                    y: 0
                },
                3999999999,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName = '<span style="font-size:65%;letter-spacing:-1px;position:relative;bottom:4px;">Antim. condenser</span>'; // shrink

            new Game.Object(
                'Prism',
                'prism|prisms|converted|[X] new color discovered|[X] new colors discovered',
                'Converts light itself into cookies.',
                14,
                14,
                { base: 'prism', xV: 16, yV: 4, w: 64, rows: 1, x: 0, y: 20 },
                75000000000,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );

            new Game.Object(
                'Chancemaker',
                'chancemaker|chancemakers|spontaneously generated|Chancemakers are powered by [X]-leaf clovers|Chancemakers are powered by [X]-leaf clovers',
                'Generates cookies out of thin air through sheer luck.',
                15,
                19,
                {
                    base: 'chancemaker',
                    xV: 8,
                    yV: 64,
                    w: 64,
                    x: 0,
                    y: 0,
                    rows: 2
                },
                77777777777,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName = '<span style="font-size:85%;letter-spacing:-1px;position:relative;bottom:2px;">Chancemaker</span>'; // shrink

            new Game.Object(
                'Fractal engine',
                'fractal engine|fractal engines|made from cookies|[X] iteration deep|[X] iterations deep',
                'Turns cookies into even more cookies.',
                16,
                20,
                {
                    base: 'fractalEngine',
                    xV: 8,
                    yV: 64,
                    w: 64,
                    rows: 1,
                    x: 0,
                    y: 0
                },
                12345678987654321,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName = '<span style="font-size:80%;letter-spacing:-1px;position:relative;bottom:4px;">Fractal engine</span>'; // shrink

            new Game.Object(
                'Javascript console',
                'javascript console|javascript consoles|programmed|Equipped with [X] external library|Equipped with [X] external libraries',
                'Creates cookies from the very code this game was written in.',
                17,
                32,
                {
                    base: 'javascriptconsole',
                    xV: 8,
                    yV: 64,
                    w: 14,
                    rows: 1,
                    x: 8,
                    y: -32,
                    frames: 2
                },
                12345678987654321,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
            Game.last.displayName = '<span style="font-size:65%;letter-spacing:-1px;position:relative;bottom:4px;">Javascript console</span>'; // shrink

            new Game.Object(
                'Idleverse',
                'idleverse|idleverses|hijacked|[X] manifold|[X] manifolds',
                'There\'s been countless other idle universes running alongside our own. You\'ve finally found a way to hijack their production and convert whatever they\'ve been making into cookies!',
                18,
                33,
                {
                    base: 'idleverse',
                    xV: 8,
                    yV: 96,
                    w: 48,
                    rows: 2,
                    x: 0,
                    y: 0,
                    frames: 4
                },
                12345678987654321,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );

            new Game.Object(
                'Cortex baker',
                'cortex baker|cortex bakers|imagined|[X] extra IQ point|[X] extra IQ points',
                'These artificial brains the size of planets are capable of simply dreaming up cookies into existence. ' +
                'Time and space are inconsequential. Reality is arbitrary.',
                19,
                34,
                {
                    base: 'cortex',
                    xV: 8,
                    yV: 96,
                    w: 48,
                    rows: 1,
                    x: 0,
                    y: 0,
                    frames: 4
                },
                12345678987654321,
                function (me) {
                    let mult = 1;
                    mult *= Game.GetTieredCpsMult(me);
                    mult *= Game.magicCpS(me.name);
                    return me.baseCps * mult;
                },
                function (self) {
                    Game.UnlockTiered(self);
                    if (self.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0)
                        Game.Unlock(ASSERT_NOT_NULL(self.grandma).name);
                }
            );
        }

        Game.foolObjects['Unknown'].name = String(loc('Investment'));
        Game.foolObjects['Unknown'].desc = String(loc('You\'re not sure what this does, you just know it means profit.'));
        for (let i in Game.Objects) {
            Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */ (i)].name =
                // @ts-expect-error why u do dis
                loc(locStringsByPart[Game.Objects[i].name + ' business name'] || undefined) || Game.foolObjects[i].name;
            Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */ (i)].desc =
                // @ts-expect-error why u do dis 2x
                loc(locStringsByPart[Game.Objects[i].name + ' business quote'] || undefined) || Game.foolObjects[i].desc;
        }

        // build store
        Game.BuildStore();

        // build master bar
        str = '';
        str += '<div id="buildingsMute" class="shadowFilter" style="position:relative;z-index:100;padding:4px 16px 0px 64px;"></div>';
        str += '<div class="separatorBottom" style="position:absolute;bottom:-8px;z-index:0;"></div>';
        $('buildingsMaster', true).innerHTML = str;

        // build object displays
        let muteStr = '<div style="position:absolute;left:8px;bottom:12px;opacity:0.5;">' + loc('Muted:') + '</div>';
        for (let i in Game.Objects) {
            const me = Game.Objects[i];

            if (locStrings[me.name + ' (short)']) me.displayName = String(loc(me.name + ' (short)'));

            if (me.id > 0) {
                me.canvas = /** @type {HTMLCanvasElement} */($('rowCanvas' + me.id, true));
                me.ctx = ASSERT_NOT_NULL(ASSERT_NOT_NULL(me.canvas).getContext('2d', { alpha: false }));
                me.pics = [];
                const icon = [0 * 64, me.icon * 64];
                muteStr +=
                    '<div class="tinyProductIcon" id="mutedProduct' +
                    me.id +
                    '" style="display:none;background-position:-' +
                    icon[0] +
                    'px -' +
                    icon[1] +
                    'px;" ' +
                    Game.clickStr +
                    '="Game.ObjectsById[' +
                    me.id +
                    '].mute(0);PlaySound(Game.ObjectsById[' +
                    me.id +
                    '].muted?\'snd/clickOff2.mp3\':\'snd/clickOn2.mp3\');" ' +
                    Game.getDynamicTooltip('Game.mutedBuildingTooltip(' + me.id + ')', 'this') +
                    '></div>';

                me.canvas.addEventListener(
                    'mouseover',
                    () => { me.mouseOn = true; }
                );
                me.canvas.addEventListener(
                    'mouseout',
                    () => {
                        me.mouseOn = false;
                    }
                );
                me.canvas.addEventListener(
                    'mousemove',
                    function (/** @type {{ pageX: number; pageY: number; }} */ e) {
                        let box = this.getBounds();
                        me.mousePos[0] = e.pageX - box.left;
                        me.mousePos[1] = e.pageY - box.top;
                    }
                );
            }
        }

        $('buildingsMute', true).innerHTML = muteStr;

        for (let i in Game.Tiers) Game.Tiers[/** @type {keyof typeof Game.Tiers} */(i)].upgrades = [];

        pool = '';
        power = 0;

        // define upgrades
        // WARNING : do NOT add new upgrades in between, this breaks the saves. Add them at the end !
        order = 100; // this is used to set the order in which the items are listed
        new Game.Upgrade('Reinforced index finger', loc('The mouse and cursors are <b>twice</b> as efficient.') + '<q>prod prod</q>', 100, [0, 0]);
        Game.MakeTiered(Game.last, 1, 0);
        new Game.Upgrade(
            'Carpal tunnel prevention cream',
            loc('The mouse and cursors are <b>twice</b> as efficient.') + '<q>it... it hurts to click...</q>',
            500,
            [0, 1]
        );
        Game.MakeTiered(Game.last, 2, 0);
        new Game.Upgrade('Ambidextrous', loc('The mouse and cursors are <b>twice</b> as efficient.') + '<q>Look ma, both hands!</q>', 10000, [0, 2]);
        Game.MakeTiered(Game.last, 3, 0);
        new Game.Upgrade(
            'Thousand fingers',
            loc('The mouse and cursors gain <b>+%1</b> cookies for each non-cursor building owned.', 0.1) + '<q>clickity</q>',
            100000,
            [0, 13]
        );
        Game.MakeTiered(Game.last, 4, 0);

        new Game.Upgrade('Million fingers', getStrThousandFingersGain(5) + '<q>clickityclickity</q>', 10000000, [0, 14]);
        Game.MakeTiered(Game.last, 5, 0);
        new Game.Upgrade('Billion fingers', getStrThousandFingersGain(10) + '<q>clickityclickityclickity</q>', 100000000, [0, 15]);
        Game.MakeTiered(Game.last, 6, 0);
        new Game.Upgrade('Trillion fingers', getStrThousandFingersGain(20) + '<q>clickityclickityclickityclickity</q>', 1000000000, [0, 16]);
        Game.MakeTiered(Game.last, 7, 0);

        order = 200;
        Game.TieredUpgrade('Forwards from grandma', '<q>RE:RE:thought you\'d get a kick out of this ;))</q>', 'Grandma', 1);
        Game.TieredUpgrade('Steel-plated rolling pins', '<q>Just what you kneaded.</q>', 'Grandma', 2);
        Game.TieredUpgrade('Lubricated dentures', '<q>squish</q>', 'Grandma', 3);

        order = 300;
        Game.TieredUpgrade('Cheap hoes', '<q>Rake in the dough!</q>', 'Farm', 1);
        Game.TieredUpgrade('Fertilizer', '<q>It\'s chocolate, I swear.</q>', 'Farm', 2);
        Game.TieredUpgrade('Cookie trees', '<q>A relative of the breadfruit.</q>', 'Farm', 3);

        order = 500;
        Game.TieredUpgrade('Sturdier conveyor belts', '<q>You\'re going places.</q>', 'Factory', 1);
        Game.TieredUpgrade('Child labor', '<q>Cheaper, healthier workforce.</q>', 'Factory', 2);
        Game.TieredUpgrade('Sweatshop', '<q>Slackers will be terminated.</q>', 'Factory', 3);

        order = 400;
        Game.TieredUpgrade('Sugar gas', '<q>A pink, volatile gas, found in the depths of some chocolate caves.</q>', 'Mine', 1);
        Game.TieredUpgrade('Megadrill', '<q>You\'re in deep.</q>', 'Mine', 2);
        Game.TieredUpgrade('Ultradrill', '<q>Finally caved in?</q>', 'Mine', 3);

        order = 600;
        Game.TieredUpgrade(
            'Vanilla nebulae',
            '<q>If you removed your space helmet, you could probably smell it!<br>(Note : don\'t do that.)</q>',
            'Shipment',
            1
        );
        Game.TieredUpgrade('Wormholes', '<q>By using these as shortcuts, your ships can travel much faster.</q>', 'Shipment', 2);
        Game.TieredUpgrade('Frequent flyer', '<q>Come back soon!</q>', 'Shipment', 3);

        order = 700;
        Game.TieredUpgrade('Antimony', '<q>Actually worth a lot of mony.</q>', 'Alchemy lab', 1);
        Game.TieredUpgrade('Essence of dough', '<q>Extracted through the 5 ancient steps of alchemical baking.</q>', 'Alchemy lab', 2);
        Game.TieredUpgrade('True chocolate', '<q>The purest form of cacao.</q>', 'Alchemy lab', 3);

        order = 800;
        Game.TieredUpgrade('Ancient tablet', '<q>A strange slab of peanut brittle, holding an ancient cookie recipe. Neat!</q>', 'Portal', 1);
        Game.TieredUpgrade('Insane oatling workers', '<q>ARISE, MY MINIONS!</q>', 'Portal', 2);
        Game.TieredUpgrade('Soul bond', '<q>So I just sign up and get more cookies? Sure, whatever!</q>', 'Portal', 3);

        order = 900;
        Game.TieredUpgrade('Flux capacitors', '<q>Bake to the future.</q>', 'Time machine', 1);
        Game.TieredUpgrade('Time paradox resolver', '<q>No more fooling around with your own grandmother!</q>', 'Time machine', 2);
        Game.TieredUpgrade('Quantum conundrum', '<q>There is only one constant, and that is universal uncertainty.<br>Or is it?</q>', 'Time machine', 3);

        order = 20000;
        new Game.Upgrade('Kitten helpers', strKittenDesc + '<q>meow may I help you</q>', 9000000, Game.GetIcon('Kitten', 1));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 1, 18);
        new Game.Upgrade('Kitten workers', strKittenDesc + '<q>meow meow meow meow</q>', 9000000000, Game.GetIcon('Kitten', 2));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 2, 18);

        order = 10000;
        Game.NewUpgradeCookie({
            name: 'Plain cookies',
            desc: 'We all gotta start somewhere.',
            icon: [2, 3],
            power: 1,
            price: 999999
        });
        Game.NewUpgradeCookie({
            name: 'Sugar cookies',
            desc: 'Tasty, if a little unimaginative.',
            icon: [7, 3],
            power: 1,
            price: 999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Oatmeal raisin cookies',
            desc: 'No raisin to hate these.',
            icon: [0, 3],
            power: 1,
            price: 9999999
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter cookies',
            desc: 'Get yourself some jam cookies!',
            icon: [1, 3],
            power: 2,
            price: 9999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Coconut cookies',
            desc: 'Flaky, but not unreliable. Some people go crazy for these.',
            icon: [3, 3],
            power: 2,
            price: 99999999
        });
        order = 10001;
        Game.NewUpgradeCookie({
            name: 'White chocolate cookies',
            desc: 'I know what you\'ll say. It\'s just cocoa butter! It\'s not real chocolate!<br>Oh please.',
            icon: [4, 3],
            power: 2,
            price: 99999999 * 5
        });
        order = 10000;
        Game.NewUpgradeCookie({
            name: 'Macadamia nut cookies',
            desc: 'They\'re macadamn delicious!',
            icon: [5, 3],
            power: 2,
            price: 99999999
        });
        order = 10002;
        Game.NewUpgradeCookie({
            name: 'Double-chip cookies',
            desc: 'DOUBLE THE CHIPS<br>DOUBLE THE TASTY<br>(double the calories)',
            icon: [6, 3],
            power: 2,
            price: 999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'White chocolate macadamia nut cookies',
            desc: 'Orteil\'s favorite.',
            icon: [8, 3],
            power: 2,
            price: 9999999999
        });
        Game.NewUpgradeCookie({
            name: 'All-chocolate cookies',
            desc: 'CHOCOVERDOSE.',
            icon: [9, 3],
            power: 2,
            price: 9999999999 * 5
        });

        order = 100;
        new Game.Upgrade('Quadrillion fingers', getStrThousandFingersGain(20) + '<q>clickityclickityclickityclickityclick</q>', 10000000000, [0, 17]);
        Game.MakeTiered(Game.last, 8, 0);

        order = 200;
        Game.TieredUpgrade('Prune juice', '<q>Gets me going.</q>', 'Grandma', 4);
        order = 300;
        Game.TieredUpgrade('Genetically-modified cookies', '<q>All-natural mutations.</q>', 'Farm', 4);
        order = 500;
        Game.TieredUpgrade('Radium reactors', '<q>Gives your cookies a healthy glow.</q>', 'Factory', 4);
        order = 400;
        Game.TieredUpgrade('Ultimadrill', '<q>Pierce the heavens, etc.</q>', 'Mine', 4);
        order = 600;
        Game.TieredUpgrade('Warp drive', '<q>To boldly bake.</q>', 'Shipment', 4);
        order = 700;
        Game.TieredUpgrade(
            'Ambrosia',
            '<q>Adding this to the cookie mix is sure to make them even more addictive!<br>Perhaps dangerously so.<br>Let\'s hope you can keep selling these legally.</q>',
            'Alchemy lab',
            4
        );
        order = 800;
        Game.TieredUpgrade('Sanity dance', '<q>We can change if we want to.<br>We can leave our brains behind.</q>', 'Portal', 4);
        order = 900;
        Game.TieredUpgrade('Causality enforcer', '<q>What happened, happened.</q>', 'Time machine', 4);

        order = 5000;
        new Game.Upgrade(
            'Lucky day',
            loc('Golden cookies appear <b>twice as often</b> and stay <b>twice as long</b>.') + '<q>Oh hey, a four-leaf penny!</q>',
            777777777,
            [27, 6]
        );
        new Game.Upgrade(
            'Serendipity',
            loc('Golden cookies appear <b>twice as often</b> and stay <b>twice as long</b>.') + '<q>What joy! Seven horseshoes!</q>',
            77777777777,
            [27, 6]
        );

        order = 20000;
        new Game.Upgrade('Kitten engineers', strKittenDesc + '<q>meow meow meow meow, sir</q>', 90000000000000, Game.GetIcon('Kitten', 3));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 3, 18);

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Dark chocolate-coated cookies',
            desc: 'These absorb light so well you almost need to squint to see them.',
            icon: [10, 3],
            power: 5,
            price: 99999999999
        });
        Game.NewUpgradeCookie({
            name: 'White chocolate-coated cookies',
            desc: 'These dazzling cookies absolutely glisten with flavor.',
            icon: [11, 3],
            power: 5,
            price: 99999999999
        });

        order = 250;
        Game.GrandmaSynergy('Farmer grandmas', 'A nice farmer to grow more cookies.', 'Farm');
        Game.GrandmaSynergy('Miner grandmas', 'A nice miner to dig more cookies.', 'Mine');
        Game.GrandmaSynergy('Worker grandmas', 'A nice worker to manufacture more cookies.', 'Factory');
        Game.GrandmaSynergy('Cosmic grandmas', 'A nice thing to... uh... cookies.', 'Shipment');
        Game.GrandmaSynergy('Transmuted grandmas', 'A nice golden grandma to convert into more cookies.', 'Alchemy lab');
        Game.GrandmaSynergy('Altered grandmas', 'a NiCe GrAnDmA tO bA##########', 'Portal');
        Game.GrandmaSynergy('Grandmas\' grandmas', 'A nice grandma\'s nice grandma to bake double the cookies.', 'Time machine');

        order = 14000;

        new Game.Upgrade(
            'Bingo center/Research facility',
            loc('Grandma-operated science lab and leisure club.<br>Grandmas are <b>4 times</b> as efficient.<br><b>Regularly unlocks new upgrades</b>.') +
            '<q>What could possibly keep those grandmothers in check?...<br>Bingo.</q>',
            1000000000000000,
            [11, 9],
            function () {
                Game.SetResearch('Specialized chocolate chips');
            }
        );
        Game.last.noPerm = 1;

        order = 15000;
        new Game.Upgrade(
            'Specialized chocolate chips',
            getStrCookieProductionMultiplierPlus(1) + '<q>Computer-designed chocolate chips. Computer chips, if you will.</q>',
            1000000000000000,
            [0, 9],
            function () {
                Game.SetResearch('Designer cocoa beans');
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Designer cocoa beans',
            getStrCookieProductionMultiplierPlus(2) + '<q>Now more aerodynamic than ever!</q>',
            2000000000000000,
            [1, 9],
            function () {
                Game.SetResearch('Ritual rolling pins');
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Ritual rolling pins',
            loc('%1 are <b>twice</b> as efficient.', cap(Game.Objects['Grandma'].plural)) + '<q>The result of years of scientific research!</q>',
            4000000000000000,
            [2, 9],
            function () {
                Game.SetResearch('Underworld ovens');
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Underworld ovens',
            getStrCookieProductionMultiplierPlus(3) + '<q>Powered by science, of course!</q>',
            8000000000000000,
            [3, 9],
            function () {
                Game.SetResearch('One mind');
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'One mind',
            loc('Each %1 gains <b>+%2 base CpS per %3</b>.', [String(loc('grandma')), '0.0<span></span>2', String(loc('grandma'))]) +
            '<div class="warning">' +
            loc('Note: the grandmothers are growing restless. Do not encourage them.') +
            '</div><q>We are one. We are many.</q>',
            16000000000000000,
            [4, 9],
            function () {
                Game.elderWrath = 1;
                Game.SetResearch('Exotic nuts');
                Game.storeToRefresh = 1;
            }
        );
        Game.last.pool = 'tech';
        Game.RequiresConfirmation(
            Game.last,
            '<div class="block">' +
            loc(
                '<b>Warning:</b> purchasing this will have unexpected, and potentially undesirable results!<br><small>It\'s all downhill from here. You have been warned!</small><br><br>Purchase anyway?'
            ) +
            '</div>'
        );
        new Game.Upgrade('Exotic nuts', getStrCookieProductionMultiplierPlus(4) + '<q>You\'ll go crazy over these!</q>', 32000000000000000, [5, 9], function () {
            Game.SetResearch('Communal brainsweep');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Communal brainsweep',
            (EN
                ? 'Each grandma gains another <b>+0.0<span></span>2 base CpS per grandma</b>.'
                : loc('Each %1 gains <b>+%2 base CpS per %3</b>.', [String(loc('grandma')), '0.0<span></span>2', String(loc('grandma'))])) +
            '<div class="warning">' +
            loc('Note: proceeding any further in scientific research may have unexpected results. You have been warned.') +
            '</div><q>We fuse. We merge. We grow.</q>',
            64000000000000000,
            [6, 9],
            function () {
                Game.elderWrath = 2;
                Game.SetResearch('Arcane sugar');
                Game.storeToRefresh = 1;
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Arcane sugar',
            getStrCookieProductionMultiplierPlus(5) + '<q>Tastes like insects, ligaments, and molasses.</q>',
            128000000000000000,
            [7, 9],
            function () {
                Game.SetResearch('Elder Pact');
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Elder Pact',
            loc('Each %1 gains <b>+%2 base CpS per %3</b>.', [String(loc('grandma')), '0.0<span></span>5', String(loc('portal'))]) +
            '<div class="warning">' +
            loc('Note: this is a bad idea.') +
            '</div><q>squirm crawl slither writhe<br>today we rise</q>',
            256000000000000000,
            [8, 9],
            function () {
                Game.elderWrath = 3;
                Game.storeToRefresh = 1;
            }
        );
        Game.last.pool = 'tech';
        new Game.Upgrade(
            'Elder Pledge',
            loc('Contains the wrath of the elders, at least for a while.') +
            '<q>This is a simple ritual involving anti-aging cream, cookie batter mixed in the moonlight, and a live chicken.</q>',
            1,
            [9, 9],
            function () {
                Game.elderWrath = 0;
                Game.pledges++;
                Game.pledgeT = Game.getPledgeDuration();
                Game.Unlock('Elder Covenant');
                Game.CollectWrinklers();
                Game.storeToRefresh = 1;
            }
        );

        Game.last.pool = 'toggle';
        Game.last.displayFuncWhenOwned = function () {
            return (
                '<div style="text-align:center;">' + loc('Time remaining until pledge runs out:') + '<br><b>' + Game.sayTime(Game.pledgeT, -1) + '</b></div>'
            );
        };
        Game.last.timerDisplay = function () {
            return !Game.Upgrades['Elder Pledge'].bought ? -1 : 1 - Game.pledgeT / Game.getPledgeDuration();
        };
        Game.last.priceFunc = function () {
            return Math.pow(8, Math.min(Game.pledges + 2, 14));
        };

        Game.last.descFunc = function () {
            return (
                '<div style="text-align:center;">' +
                (Game.pledges == 0
                    ? loc('You haven\'t pledged to the elders yet.')
                    : loc('You\'ve pledged to the elders <b>%1 times</b>.', LBeautify(Game.pledges))) +
                '<div class="line"></div></div>' +
                this.ddesc
            );
        };

        order = 150;
        new Game.Upgrade('Plastic mouse', getStrClickingGains(1) + '<q>Slightly squeaky.</q>', 50000, [11, 0]);
        Game.MakeTiered(Game.last, 1, 11);
        new Game.Upgrade('Iron mouse', getStrClickingGains(1) + '<q>Click like it\'s 1349!</q>', 5000000, [11, 1]);
        Game.MakeTiered(Game.last, 2, 11);
        new Game.Upgrade('Titanium mouse', getStrClickingGains(1) + '<q>Heavy, but powerful.</q>', 500000000, [11, 2]);
        Game.MakeTiered(Game.last, 3, 11);
        new Game.Upgrade('Adamantium mouse', getStrClickingGains(1) + '<q>You could cut diamond with these.</q>', 50000000000, [11, 13]);
        Game.MakeTiered(Game.last, 4, 11);

        order = 40000;
        new Game.Upgrade('Ultrascience', loc('Research takes only <b>5 seconds</b>.') + '<q>YEAH, SCIENCE!</q>', 7, [9, 2]); // debug purposes only
        Game.last.pool = 'debug';

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Eclipse cookies',
            desc: 'Look to the cookie.',
            icon: [0, 4],
            power: 2,
            price: 99999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Zebra cookies',
            desc: '...',
            icon: [1, 4],
            power: 2,
            price: 999999999999
        });

        order = 100;
        new Game.Upgrade(
            'Quintillion fingers',
            getStrThousandFingersGain(20) + '<q>man, just go click click click click click, it\'s real easy, man.</q>',
            10000000000000,
            [0, 18]
        );
        Game.MakeTiered(Game.last, 9, 0);

        order = 40000;
        new Game.Upgrade('Gold hoard', loc('Golden cookies appear <b>really often</b>.') + '<q>That\'s entirely too many.</q>', 7, [10, 14]); // debug purposes only
        Game.last.pool = 'debug';

        order = 15000;
        new Game.Upgrade(
            'Elder Covenant',
            loc('Puts a permanent end to the elders\' wrath, at the cost of %1% of your CpS.', 5) +
            '<q>This is a complicated ritual involving silly, inconsequential trivialities such as cursed laxatives, century-old cacao, and an infant.<br>Don\'t question it.</q>',
            66666666666666,
            [8, 9],
            function () {
                Game.pledgeT = 0;
                Game.Lock('Revoke Elder Covenant');
                Game.Unlock('Revoke Elder Covenant');
                Game.Lock('Elder Pledge');
                Game.Win('Elder calm');
                Game.CollectWrinklers();
                Game.storeToRefresh = 1;
            }
        );
        Game.last.pool = 'toggle';

        new Game.Upgrade(
            'Revoke Elder Covenant',
            loc('You will get %1% of your CpS back, but the grandmatriarchs will return.', 5) + '<q>we<br>rise<br>again</q>',
            6666666666,
            [8, 9],
            function () {
                Game.Lock('Elder Covenant');
                Game.Unlock('Elder Covenant');
            }
        );
        Game.last.pool = 'toggle';

        order = 5000;
        new Game.Upgrade(
            'Get lucky',
            loc('Golden cookie effects last <b>twice as long</b>.') + '<q>You\'ve been up all night, haven\'t you?</q>',
            77777777777777,
            [27, 6]
        );

        order = 15000;
        new Game.Upgrade(
            'Sacrificial rolling pins',
            loc('Elder pledges last <b>twice</b> as long.') +
            '<q>These are mostly just for spreading the anti-aging cream.<br>(And accessorily, shortening the chicken\'s suffering.)</q>',
            2888888888888,
            [2, 9]
        );

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Snickerdoodles',
            desc: 'True to their name.',
            icon: [2, 4],
            power: 2,
            price: 999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Stroopwafels',
            desc: 'If it ain\'t dutch, it ain\'t much.',
            icon: [3, 4],
            power: 2,
            price: 9999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Macaroons',
            desc: 'Not to be confused with macarons.<br>These have coconut, okay?',
            icon: [4, 4],
            power: 2,
            price: 9999999999999 * 5
        });

        order = 40000;
        new Game.Upgrade(
            'Neuromancy',
            loc('Can toggle upgrades on and off at will in the stats menu.') + '<q>Can also come in handy to unsee things that can\'t be unseen.</q>',
            7,
            [4, 9]
        ); // debug purposes only
        Game.last.pool = 'debug';

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Empire biscuits',
            desc: 'For your growing cookie empire, of course!',
            icon: [5, 4],
            power: 2,
            price: 99999999999999
        });
        order = 10031;
        Game.NewUpgradeCookie({
            name: 'British tea biscuits',
            desc: 'Quite.',
            icon: [6, 4],
            require: 'Tin of british tea biscuits',
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate british tea biscuits',
            desc: 'Yes, quite.',
            icon: [7, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round british tea biscuits',
            desc: 'Yes, quite riveting.',
            icon: [8, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round chocolate british tea biscuits',
            desc: 'Yes, quite riveting indeed.',
            icon: [9, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round british tea biscuits with heart motif',
            desc: 'Yes, quite riveting indeed, old chap.',
            icon: [10, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round chocolate british tea biscuits with heart motif',
            desc: 'I like cookies.',
            icon: [11, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });

        order = 1000;
        Game.TieredUpgrade('Sugar bosons', '<q>Sweet firm bosons.</q>', 'Antimatter condenser', 1);
        Game.TieredUpgrade(
            'String theory',
            '<q>Reveals new insight about the true meaning of baking cookies (and, as a bonus, the structure of the universe).</q>',
            'Antimatter condenser',
            2
        );
        Game.TieredUpgrade('Large macaron collider', '<q>How singular!</q>', 'Antimatter condenser', 3);
        Game.TieredUpgrade('Big bang bake', '<q>And that\'s how it all began.</q>', 'Antimatter condenser', 4);

        order = 255;
        Game.GrandmaSynergy('Antigrandmas', 'A mean antigrandma to vomit more cookies.', 'Antimatter condenser');

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Madeleines',
            desc: 'Unforgettable!',
            icon: [12, 3],
            power: 2,
            price: 99999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Palmiers',
            desc: 'Palmier than you!',
            icon: [13, 3],
            power: 2,
            price: 99999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Palets',
            desc: 'You could probably play hockey with these.<br>I mean, you\'re welcome to try.',
            icon: [12, 4],
            power: 2,
            price: 999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Sabl&eacute;s',
            desc: 'The name implies they\'re made of sand. But you know better, don\'t you?',
            icon: [13, 4],
            power: 2,
            price: 999999999999999
        });

        order = 20000;
        new Game.Upgrade('Kitten overseers', strKittenDesc + '<q>my purrpose is to serve you, sir</q>', 90000000000000000, Game.GetIcon('Kitten', 4));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 4, 18);

        order = 100;
        new Game.Upgrade('Sextillion fingers', getStrThousandFingersGain(20) + '<q>sometimes<br>things just<br>click</q>', 10000000000000000, [0, 19]);
        Game.MakeTiered(Game.last, 10, 0);

        order = 200;
        Game.TieredUpgrade('Double-thick glasses', '<q>Oh... so THAT\'s what I\'ve been baking.</q>', 'Grandma', 5);
        order = 300;
        Game.TieredUpgrade('Gingerbread scarecrows', '<q>Staring at your crops with mischievous glee.</q>', 'Farm', 5);
        order = 500;
        Game.TieredUpgrade('Recombobulators', '<q>A major part of cookie recombobulation.</q>', 'Factory', 5);
        order = 400;
        Game.TieredUpgrade('H-bomb mining', '<q>Questionable efficiency, but spectacular nonetheless.</q>', 'Mine', 5);
        order = 600;
        Game.TieredUpgrade('Chocolate monoliths', '<q>My god. It\'s full of chocolate bars.</q>', 'Shipment', 5);
        order = 700;
        Game.TieredUpgrade(
            'Aqua crustulae',
            '<q>Careful with the dosing - one drop too much and you get muffins.<br>And nobody likes muffins.</q>',
            'Alchemy lab',
            5
        );
        order = 800;
        Game.TieredUpgrade(
            'Brane transplant',
            '<q>This refers to the practice of merging higher dimensional universes, or "branes", with our own, in order to facilitate transit (and harvesting of precious cookie dough).</q>',
            'Portal',
            5
        );
        order = 900;
        Game.TieredUpgrade('Yestermorrow comparators', '<q>Fortnights into millennia.</q>', 'Time machine', 5);
        order = 1000;
        Game.TieredUpgrade(
            'Reverse cyclotrons',
            '<q>These can uncollision particles and unspin atoms. For... uh... better flavor, and stuff.</q>',
            'Antimatter condenser',
            5
        );

        order = 150;
        new Game.Upgrade('Unobtainium mouse', getStrClickingGains(1) + '<q>These nice mice should suffice.</q>', 5000000000000, [11, 14]);
        Game.MakeTiered(Game.last, 5, 11);

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Caramoas',
            desc: 'Yeah. That\'s got a nice ring to it.',
            icon: [14, 4],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Sagalongs',
            desc: 'Grandma\'s favorite?',
            icon: [15, 3],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Shortfoils',
            desc: 'Foiled again!',
            icon: [15, 4],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Win mints',
            desc: 'They\'re the luckiest cookies you\'ve ever tasted!',
            icon: [14, 3],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });

        order = 40000;
        new Game.Upgrade(
            'Perfect idling',
            loc('You keep producing cookies even while the game is closed.') + '<q>It\'s the most beautiful thing I\'ve ever seen.</q>',
            7,
            [10, 0]
        ); // debug purposes only
        Game.last.pool = 'debug';

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Fig gluttons',
            desc: 'Got it all figured out.',
            icon: [17, 4],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Loreols',
            desc: 'Because, uh... they\'re worth it?',
            icon: [16, 3],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Jaffa cakes',
            desc: 'If you want to bake a cookie from scratch, you must first build a factory.',
            icon: [17, 3],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Grease\'s cups',
            desc: 'Extra-greasy peanut butter.',
            icon: [16, 4],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });

        order = 30000;
        new Game.Upgrade(
            'Heavenly chip secret',
            loc('Unlocks <b>%1%</b> of the potential of your prestige level.', 5) +
            '<q>Grants the knowledge of heavenly chips, and how to use them to make baking more efficient.<br>It\'s a secret to everyone.</q>',
            11,
            [19, 7]
        );
        Game.last.noPerm = 1;
        new Game.Upgrade(
            'Heavenly cookie stand',
            loc('Unlocks <b>%1%</b> of the potential of your prestige level.', 25) +
            '<q>Don\'t forget to visit the heavenly lemonade stand afterwards. When afterlife gives you lemons...</q>',
            1111,
            [18, 7]
        );
        Game.last.noPerm = 1;
        new Game.Upgrade(
            'Heavenly bakery',
            loc('Unlocks <b>%1%</b> of the potential of your prestige level.', 50) +
            '<q>Also sells godly cakes and divine pastries. The pretzels aren\'t too bad either.</q>',
            111111,
            [17, 7]
        );
        Game.last.noPerm = 1;
        new Game.Upgrade(
            'Heavenly confectionery',
            loc('Unlocks <b>%1%</b> of the potential of your prestige level.', 75) +
            '<q>They say angel bakers work there. They take angel lunch breaks and sometimes go on angel strikes.</q>',
            11111111,
            [16, 7]
        );
        Game.last.noPerm = 1;
        new Game.Upgrade(
            'Heavenly key',
            loc('Unlocks <b>%1%</b> of the potential of your prestige level.', 100) +
            '<q>This is the key to the pearly (and tasty) gates of pastry heaven, granting you access to your entire stockpile of heavenly chips for baking purposes.<br>May you use them wisely.</q>',
            1111111111,
            [15, 7]
        );
        Game.last.noPerm = 1;

        order = 10100;
        Game.NewUpgradeCookie({
            name: 'Skull cookies',
            desc: 'Wanna know something spooky? You\'ve got one of these inside your head RIGHT NOW.',
            locked: 1,
            icon: [12, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Ghost cookies',
            desc: 'They\'re something strange, but they look pretty good!',
            locked: 1,
            icon: [13, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Bat cookies',
            desc: 'The cookies this town deserves.',
            locked: 1,
            icon: [14, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Slime cookies',
            desc: 'The incredible melting cookies!',
            locked: 1,
            icon: [15, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Pumpkin cookies',
            desc: 'Not even pumpkin-flavored. Tastes like glazing. Yeugh.',
            locked: 1,
            icon: [16, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Eyeball cookies',
            desc: 'When you stare into the cookie, the cookie stares back at you.',
            locked: 1,
            icon: [17, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Spider cookies',
            desc: 'You found the recipe on the web. They do whatever a cookie can.',
            locked: 1,
            icon: [18, 8],
            power: 2,
            price: 444444444444
        });

        order = 0;
        new Game.Upgrade(
            'Persistent memory',
            loc('Subsequent research will be <b>%1 times</b> as fast.', 10) + '<q>It\'s all making sense!<br>Again!</q>',
            500,
            [9, 2]
        );
        Game.last.pool = 'prestige';

        order = 40000;
        new Game.Upgrade('Wrinkler doormat', loc('Wrinklers spawn much more frequently.') + '<q>You\'re such a pushover.</q>', 7, [19, 8]); // debug purposes only
        Game.last.pool = 'debug';

        order = 10200;
        Game.NewUpgradeCookie({
            name: 'Christmas tree biscuits',
            desc: 'Whose pine is it anyway?',
            locked: 1,
            icon: [12, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Snowflake biscuits',
            desc: 'Mass-produced to be unique in every way.',
            locked: 1,
            icon: [13, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Snowman biscuits',
            desc: 'It\'s frosted. Doubly so.',
            locked: 1,
            icon: [14, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Holly biscuits',
            desc: 'You don\'t smooch under these ones. That would be the mistletoe (which, botanically, is a smellier variant of the mistlefinger).',
            locked: 1,
            icon: [15, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Candy cane biscuits',
            desc: 'It\'s two treats in one!<br>(Further inspection reveals the frosting does not actually taste like peppermint, but like mundane sugary frosting.)',
            locked: 1,
            icon: [16, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Bell biscuits',
            desc: 'What do these even have to do with christmas? Who cares, ring them in!',
            locked: 1,
            icon: [17, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Present biscuits',
            desc: 'The prequel to future biscuits. Watch out!',
            locked: 1,
            icon: [18, 10],
            power: 2,
            price: 252525252525
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Gingerbread men',
            desc: 'You like to bite the legs off first, right? How about tearing off the arms? You sick monster.',
            icon: [18, 4],
            power: 2,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Gingerbread trees',
            desc: 'Evergreens in pastry form. Yule be surprised what you can come up with.',
            icon: [18, 3],
            power: 2,
            price: 9999999999999999
        });

        order = 25000;
        new Game.Upgrade(
            'A festive hat',
            '<b>' + loc('Unlocks... something.') + '</b><q>Not a creature was stirring, not even a mouse.</q>',
            25,
            [19, 9],
            function () {
                let drop = choose(Game.santaDrops);
                Game.Unlock(drop);
                Game.Notify(loc('In the festive hat, you find...'), loc('a festive test tube<br>and <b>%1</b>.', drop), Game.Upgrades[drop].icon);
            }
        );

        new Game.Upgrade(
            'Increased merriness',
            getStrCookieProductionMultiplierPlus(15) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>It turns out that the key to increased merriness, strangely enough, happens to be a good campfire and some s\'mores.<br>You know what they say, after all; the s\'more, the merrier.</q>',
            2525,
            [17, 9]
        );
        new Game.Upgrade(
            'Improved jolliness',
            getStrCookieProductionMultiplierPlus(15) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>A nice wobbly belly goes a long way.<br>You jolly?</q>',
            2525,
            [17, 9]
        );
        new Game.Upgrade(
            'A lump of coal',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>Some of the world\'s worst stocking stuffing.<br>I guess you could try starting your own little industrial revolution, or something?...</q>',
            2525,
            [13, 9]
        );
        new Game.Upgrade(
            'An itchy sweater',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>You don\'t know what\'s worse : the embarrassingly quaint "elf on reindeer" motif, or the fact that wearing it makes you feel like you\'re wrapped in a dead sasquatch.</q>',
            2525,
            [14, 9]
        );
        new Game.Upgrade(
            'Reindeer baking grounds',
            loc('Reindeer appear <b>twice as frequently</b>.') +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>Male reindeer are from Mars; female reindeer are from venison.</q>',
            2525,
            [12, 9]
        );
        new Game.Upgrade(
            'Weighted sleighs',
            loc('Reindeer are <b>twice as slow</b>.') +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>Hope it was worth the weight.<br>(Something something forced into cervidude)</q>',
            2525,
            [12, 9]
        );
        new Game.Upgrade(
            'Ho ho ho-flavored frosting',
            loc('Reindeer give <b>twice as much</b>.') + '<br>' + loc('Cost scales with Santa level.') + '<q>It\'s time to up the antler.</q>',
            2525,
            [12, 9]
        );
        new Game.Upgrade(
            'Season savings',
            loc('All buildings are <b>%1% cheaper</b>.', 1) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>By Santa\'s beard, what savings!<br>But who will save us?</q>',
            2525,
            [16, 9],
            function () {
                Game.storeToRefresh = 1;
            }
        );
        new Game.Upgrade(
            'Toy workshop',
            loc('All upgrades are <b>%1% cheaper</b>.', 5) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>Watch yours-elf around elvesdroppers who might steal our production secrets.<br>Or elven worse!</q>',
            2525,
            [16, 9],
            function () {
                Game.upgradesToRebuild = 1;
            }
        );
        new Game.Upgrade(
            'Naughty list',
            loc('%1 are <b>twice</b> as efficient.', cap(locStr('grandmas'))) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>This list contains every unholy deed perpetuated by grandmakind.<br>He won\'t be checking this one twice.<br>Once. Once is enough.</q>',
            2525,
            [15, 9]
        );
        new Game.Upgrade(
            'Santa\'s bottomless bag',
            loc('Random drops are <b>%1% more common</b>.', 10) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>This is one bottom you can\'t check out.</q>',
            2525,
            [19, 9]
        );
        new Game.Upgrade(
            'Santa\'s helpers',
            loc('Clicking is <b>%1%</b> more powerful.', 10) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>Some choose to help hamburger; some choose to help you.<br>To each their own, I guess.</q>',
            2525,
            [19, 9]
        );
        new Game.Upgrade(
            'Santa\'s legacy',
            loc('Cookie production multiplier <b>+%1% per Santa\'s levels.</b>', 3) +
            '<br>' +
            loc('Cost scales with Santa level.') +
            '<q>In the north pole, you gotta get the elves first. Then when you get the elves, you start making the toys. Then when you get the toys... then you get the cookies.</q>',
            2525,
            [19, 9]
        );
        new Game.Upgrade(
            'Santa\'s milk and cookies',
            loc('Milk is <b>%1% more powerful</b>.', 5) + '<br>' + loc('Cost scales with Santa level.') + '<q>Part of Santa\'s dreadfully unbalanced diet.</q>',
            2525,
            [19, 9]
        );

        order = 40000;
        new Game.Upgrade('Reindeer season', loc('Reindeer spawn much more frequently.') + '<q>Go, Cheater! Go, Hacker and Faker!</q>', 7, [12, 9]); // debug purposes only
        Game.last.pool = 'debug';

        order = 25000;
        new Game.Upgrade(
            'Santa\'s dominion',
            getStrCookieProductionMultiplierPlus(20) +
            '<br>' +
            loc('All buildings are <b>%1% cheaper</b>.', 1) +
            '<br>' +
            loc('All upgrades are <b>%1% cheaper</b>.', 2) +
            '<q>My name is Claus, king of kings;<br>Look on my toys, ye Mighty, and despair!</q>',
            2525252525252525,
            [19, 10],
            function () {
                Game.storeToRefresh = 1;
            }
        );

        order = 10300;
        let heartPower = function () {
            let pow = 2;
            if (Game.Has('Starlove')) pow = 3;
            if (Game.hasGod) {
                let godLvl = Game.hasGod('seasons');
                if (godLvl == 1) pow *= 1.3;
                else if (godLvl == 2) pow *= 1.2;
                else if (godLvl == 3) pow *= 1.1;
            }
            return pow;
        };
        Game.NewUpgradeCookie({
            name: 'Pure heart biscuits',
            desc: 'Melty white chocolate<br>that says "I *like* like you".',
            season: 'valentines',
            icon: [19, 3],
            power: heartPower,
            price: 1000000
        });
        Game.NewUpgradeCookie({
            name: 'Ardent heart biscuits',
            desc: 'A red hot cherry biscuit that will nudge the target of your affection in interesting directions.',
            require: Game.last.name,
            season: 'valentines',
            icon: [20, 3],
            power: heartPower,
            price: 1000000000
        });
        Game.NewUpgradeCookie({
            name: 'Sour heart biscuits',
            desc: 'A bitter lime biscuit for the lonely and the heart-broken.',
            require: Game.last.name,
            season: 'valentines',
            icon: [20, 4],
            power: heartPower,
            price: 1000000000000
        });
        Game.NewUpgradeCookie({
            name: 'Weeping heart biscuits',
            desc: 'An ice-cold blueberry biscuit, symbol of a mending heart.',
            require: Game.last.name,
            season: 'valentines',
            icon: [21, 3],
            power: heartPower,
            price: 1000000000000000
        });
        Game.NewUpgradeCookie({
            name: 'Golden heart biscuits',
            desc: 'A beautiful biscuit to symbolize kindness, true love, and sincerity.',
            require: Game.last.name,
            season: 'valentines',
            icon: [21, 4],
            power: heartPower,
            price: 1000000000000000000
        });
        Game.NewUpgradeCookie({
            name: 'Eternal heart biscuits',
            desc: 'Silver icing for a very special someone you\'ve liked for a long, long time.',
            require: Game.last.name,
            season: 'valentines',
            icon: [19, 4],
            power: heartPower,
            price: 1000000000000000000000
        });

        order = 1100;
        Game.TieredUpgrade('Gem polish', '<q>Get rid of the grime and let more light in.<br>Truly, truly outrageous.</q>', 'Prism', 1);
        Game.TieredUpgrade('9th color', '<q>Delve into untouched optical depths where even the mantis shrimp hasn\'t set an eye!</q>', 'Prism', 2);
        Game.TieredUpgrade(
            'Chocolate light',
            '<q>Bask into its cocoalescence.<br>(Warning : may cause various interesting albeit deadly skin conditions.)</q>',
            'Prism',
            3
        );
        Game.TieredUpgrade(
            'Grainbow',
            '<q>Remember the different grains using the handy Roy G. Biv mnemonic : R is for rice, O is for oats... uh, B for barley?...</q>',
            'Prism',
            4
        );
        Game.TieredUpgrade(
            'Pure cosmic light',
            '<q>Your prisms now receive pristine, unadulterated photons from the other end of the universe.</q>',
            'Prism',
            5
        );

        order = 255;
        Game.GrandmaSynergy('Rainbow grandmas', 'A luminous grandma to sparkle into cookies.', 'Prism');

        order = 24000;
        new Game.Upgrade(
            'Season switcher',
            loc('Allows you to <b>trigger seasonal events</b> at will, for a price.') + '<q>There will always be time.</q>',
            1111,
            [16, 6],
            function () {
                for (let i in Game.seasons) {
                    if (i === '') continue;
                    Game.Unlock(Game.seasons[/** @type {keyof typeof Game.seasons} */(i)].trigger);
                }
            }
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heralds'];
        new Game.Upgrade(
            'Festive biscuit',
            loc(
                'Triggers <b>%1 season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.',
                loc('Christmas')
            ) + '<q>\'Twas the night before Christmas- or was it?</q>',
            Game.seasonTriggerBasePrice,
            [12, 10]
        );
        Game.last.season = 'christmas';
        Game.last.pool = 'toggle';
        new Game.Upgrade(
            'Ghostly biscuit',
            loc(
                'Triggers <b>%1 season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.',
                loc('Halloween')
            ) + '<q>spooky scary skeletons<br>will wake you with a boo</q>',
            Game.seasonTriggerBasePrice,
            [13, 8]
        );
        Game.last.season = 'halloween';
        Game.last.pool = 'toggle';
        new Game.Upgrade(
            'Lovesick biscuit',
            loc(
                'Triggers <b>%1 season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.',
                loc('Valentine\'s day')
            ) + '<q>Romance never goes out of fashion.</q>',
            Game.seasonTriggerBasePrice,
            [20, 3]
        );
        Game.last.season = 'valentines';
        Game.last.pool = 'toggle';
        new Game.Upgrade(
            'Fool\'s biscuit',
            loc(
                'Triggers <b>%1 season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.',
                loc('Business day')
            ) + '<q>Business. Serious business. This is absolutely all of your business.</q>',
            Game.seasonTriggerBasePrice,
            [17, 6]
        );
        Game.last.season = 'fools';
        Game.last.pool = 'toggle';

        order = 40000;
        new Game.Upgrade('Eternal seasons', loc('Seasons now last forever.') + '<q>Season to taste.</q>', 7, [16, 6], function () {
            for (let i in Game.seasons) {
                if (i === '') continue;
                Game.Unlock(Game.seasons[/** @type {keyof typeof Game.seasons} */(i)].trigger);
            }
        }); // debug purposes only
        Game.last.pool = 'debug';

        order = 20000;
        new Game.Upgrade('Kitten managers', strKittenDesc + '<q>that\'s not gonna paws any problem, sir</q>', 900000000000000000000, Game.GetIcon('Kitten', 5));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 5, 18);

        order = 100;
        new Game.Upgrade('Septillion fingers', getStrThousandFingersGain(20) + '<q>[cursory flavor text]</q>', 10000000000000000000, [12, 20]);
        Game.MakeTiered(Game.last, 11, 0);
        new Game.Upgrade(
            'Octillion fingers',
            getStrThousandFingersGain(20) + '<q>Turns out you <b>can</b> quite put your finger on it.</q>',
            10000000000000000000000,
            [12, 19]
        );
        Game.MakeTiered(Game.last, 12, 0);

        order = 150;
        new Game.Upgrade('Eludium mouse', getStrClickingGains(1) + '<q>I rodent do that if I were you.</q>', 500000000000000, [11, 15]);
        Game.MakeTiered(Game.last, 6, 11);
        new Game.Upgrade(
            'Wishalloy mouse',
            getStrClickingGains(1) + '<q>Clicking is fine and dandy, but don\'t smash your mouse over it. Get your game on. Go play.</q>',
            50000000000000000,
            [11, 16]
        );
        Game.MakeTiered(Game.last, 7, 11);
        order = 200;
        Game.TieredUpgrade(
            'Aging agents',
            '<q>Counter-intuitively, grandmas have the uncanny ability to become more powerful the older they get.</q>',
            'Grandma',
            6
        );
        order = 300;
        Game.TieredUpgrade('Pulsar sprinklers', '<q>There\'s no such thing as over-watering. The moistest is the bestest.</q>', 'Farm', 6);
        order = 500;
        Game.TieredUpgrade(
            'Deep-bake process',
            '<q>A patented process increasing cookie yield two-fold for the same amount of ingredients. Don\'t ask how, don\'t take pictures, and be sure to wear your protective suit.</q>',
            'Factory',
            6
        );
        order = 400;
        Game.TieredUpgrade('Coreforge', '<q>You\'ve finally dug a tunnel down to the Earth\'s core. It\'s pretty warm down here.</q>', 'Mine', 6);
        order = 600;
        Game.TieredUpgrade(
            'Generation ship',
            '<q>Built to last, this humongous spacecraft will surely deliver your cookies to the deep ends of space, one day.</q>',
            'Shipment',
            6
        );
        order = 700;
        Game.TieredUpgrade(
            'Origin crucible',
            '<q>Built from the rarest of earths and located at the very deepest of the largest mountain, this legendary crucible is said to retain properties from the big-bang itself.</q>',
            'Alchemy lab',
            6
        );
        order = 800;
        Game.TieredUpgrade('Deity-sized portals', '<q>It\'s almost like, say, an elder god could fit through this thing now. Hypothetically.</q>', 'Portal', 6);
        order = 900;
        Game.TieredUpgrade(
            'Far future enactment',
            '<q>The far future enactment authorizes you to delve deep into the future - where civilization has fallen and risen again, and cookies are plentiful.</q>',
            'Time machine',
            6
        );
        order = 1000;
        Game.TieredUpgrade(
            'Nanocosmics',
            '<q>The theory of nanocosmics posits that each subatomic particle is in fact its own self-contained universe, holding unfathomable amounts of energy.<br>This somehow stacks with the nested universe theory, because physics.</q>',
            'Antimatter condenser',
            6
        );
        order = 1100;
        Game.TieredUpgrade('Glow-in-the-dark', '<q>Your prisms now glow in the dark, effectively doubling their output!</q>', 'Prism', 6);

        order = 10032;
        Game.NewUpgradeCookie({
            name: 'Rose macarons',
            desc: 'Although an odd flavor, these pastries recently rose in popularity.',
            icon: [22, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999
        });
        Game.NewUpgradeCookie({
            name: 'Lemon macarons',
            desc: 'Tastefully sour, delightful treats.',
            icon: [23, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999999
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate macarons',
            desc: 'They\'re like tiny sugary burgers!',
            icon: [24, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999
        });
        Game.NewUpgradeCookie({
            name: 'Pistachio macarons',
            desc: 'Pistachio shells now removed after multiple complaints.',
            icon: [22, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Hazelnut macarons',
            desc: 'These go especially well with coffee.',
            icon: [23, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Violet macarons',
            desc: 'It\'s like spraying perfume into your mouth!',
            icon: [24, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999
        });

        order = 40000;
        new Game.Upgrade(
            'Magic shenanigans',
            loc('Cookie production <b>multiplied by 1,000</b>.') +
            '<q>It\'s magic. I ain\'t gotta explain sh<div style="display:inline-block;background:url(img/money.png);width:16px;height:16px;position:relative;top:4px;left:0px;margin:0px -2px;"></div>t.</q>',
            7,
            [17, 5]
        ); // debug purposes only
        Game.last.pool = 'debug';

        order = 24000;
        new Game.Upgrade(
            'Bunny biscuit',
            loc(
                'Triggers <b>%1 season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.',
                loc('Easter')
            ) + '<q>All the world will be your enemy<br>and when they catch you,<br>they will kill you...<br>but first they must catch you.</q>',
            Game.seasonTriggerBasePrice,
            [0, 12]
        );
        Game.last.season = 'easter';
        Game.last.pool = 'toggle';

        let eggPrice = 999999999999;
        let eggPrice2 = 99999999999999;
        new Game.Upgrade(
            'Chicken egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>The egg. The egg came first. Get over it.</q>',
            eggPrice,
            [1, 12]
        );
        new Game.Upgrade(
            'Duck egg',
            getStrCookieProductionMultiplierPlus(1) + '<br>' + loc('Cost scales with how many eggs you own.') + '<q>Then he waddled away.</q>',
            eggPrice,
            [2, 12]
        );
        new Game.Upgrade(
            'Turkey egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>These hatch into strange, hand-shaped creatures.</q>',
            eggPrice,
            [3, 12]
        );
        new Game.Upgrade(
            'Quail egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>These eggs are positively tiny. I mean look at them. How does this happen? Whose idea was that?</q>',
            eggPrice,
            [4, 12]
        );
        new Game.Upgrade(
            'Robin egg',
            getStrCookieProductionMultiplierPlus(1) + '<br>' + loc('Cost scales with how many eggs you own.') + '<q>Holy azure-hued shelled embryos!</q>',
            eggPrice,
            [5, 12]
        );
        new Game.Upgrade(
            'Ostrich egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>One of the largest eggs in the world. More like ostrouch, am I right?<br>Guys?</q>',
            eggPrice,
            [6, 12]
        );
        new Game.Upgrade(
            'Cassowary egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>The cassowary is taller than you, possesses murderous claws and can easily outrun you.<br>You\'d do well to be casso-wary of them.</q>',
            eggPrice,
            [7, 12]
        );
        new Game.Upgrade(
            'Salmon roe',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>Do the impossible, see the invisible.<br>Roe roe, fight the power?</q>',
            eggPrice,
            [8, 12]
        );
        new Game.Upgrade(
            'Frogspawn',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>I was going to make a pun about how these "toadally look like eyeballs", but froget it.</q>',
            eggPrice,
            [9, 12]
        );
        new Game.Upgrade(
            'Shark egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>HELLO IS THIS FOOD?<br>LET ME TELL YOU ABOUT FOOD.<br>WHY DO I KEEP EATING MY FRIENDS</q>',
            eggPrice,
            [10, 12]
        );
        new Game.Upgrade(
            'Turtle egg',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>Turtles, right? Hatch from shells. Grow into shells. What\'s up with that?<br>Now for my skit about airplane food.</q>',
            eggPrice,
            [11, 12]
        );
        new Game.Upgrade(
            'Ant larva',
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>These are a delicacy in some countries, I swear. You will let these invade your digestive tract, and you will derive great pleasure from it.<br>And all will be well.</q>',
            eggPrice,
            [12, 12]
        );
        new Game.Upgrade(
            'Golden goose egg',
            loc('Golden cookies appear <b>%1%</b> more often.', 5) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>The sole vestige of a tragic tale involving misguided investments.</q>',
            eggPrice2,
            [13, 12]
        );
        new Game.Upgrade(
            'Faberge egg',
            loc('All buildings and upgrades are <b>%1% cheaper</b>.', 1) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>This outrageous egg is definitely fab.</q>',
            eggPrice2,
            [14, 12],
            function () {
                Game.storeToRefresh = 1;
            }
        );
        new Game.Upgrade(
            'Wrinklerspawn',
            loc('Wrinklers explode into <b>%1% more cookies</b>.', 5) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>Look at this little guy! It\'s gonna be a big boy someday! Yes it is!</q>',
            eggPrice2,
            [15, 12]
        );
        new Game.Upgrade(
            'Cookie egg',
            loc('Clicking is <b>%1%</b> more powerful.', 10) +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>The shell appears to be chipped.<br>I wonder what\'s inside this one!</q>',
            eggPrice2,
            [16, 12]
        );
        new Game.Upgrade(
            'Omelette',
            loc('Other eggs appear <b>%1% more frequently</b>.', 10) + '<br>' + loc('Cost scales with how many eggs you own.') + '<q>Fromage not included.</q>',
            eggPrice2,
            [17, 12]
        );
        new Game.Upgrade(
            'Chocolate egg',
            loc('Contains <b>a lot of cookies</b>.') +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>Laid by the elusive cocoa bird. There\'s a surprise inside!</q>',
            eggPrice2,
            [18, 12],
            function () {
                let cookies = Game.cookies * 0.05;
                Game.Notify('Chocolate egg', loc('The egg bursts into <b>%1</b> cookies!', Beautify(cookies)), Game.Upgrades['Chocolate egg'].icon);
                Game.Earn(cookies);
            }
        );
        new Game.Upgrade(
            'Century egg',
            loc('You continually gain <b>more CpS the longer you\'ve played</b> in the current ascension.') +
            '<br>' +
            loc('Cost scales with how many eggs you own.') +
            '<q>Actually not centuries-old. This one isn\'t a day over 86!</q>',
            eggPrice2,
            [19, 12]
        );
        Game.last.descFunc = function () {
            let day = (Math.floor((Date.now() - Game.startDate) / 1000 / 10) * 10) / 60 / 60 / 24;
            day = Math.min(day, 100);
            let n = (1 - Math.pow(1 - day / 100, 3)) * 0.1;
            return (
                '<div style="text-align:center;">' + loc('Current boost:') + ' <b>+' + Beautify(n * 100, 1) + '%</b></div><div class="line"></div>' + this.ddesc
            );
        };
        new Game.Upgrade('"egg"', '<b>' + loc('+%1 CpS', 9) + '</b><q>hey it\'s "egg"</q>', eggPrice2, [20, 12]);

        for (const eggDrop of Game.eggDrops) {
            // scale egg prices to how many eggs you have
            Game.Upgrades[eggDrop].priceFunc = function () {
                return Math.pow(2, Game.GetHowManyEggs()) * 999;
            };
        }

        for (const rareEggDrop of Game.rareEggDrops) {
            Game.Upgrades[rareEggDrop].priceFunc = function () {
                return Math.pow(3, Game.GetHowManyEggs()) * 999;
            };
        }

        order = 10032;
        Game.NewUpgradeCookie({
            name: 'Caramel macarons',
            desc: 'The saltiest, chewiest of them all.',
            icon: [25, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Licorice macarons',
            desc: 'Also known as "blackarons".',
            icon: [25, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999999999
        });

        order = 525;
        Game.TieredUpgrade(
            'Taller tellers',
            '<q>Able to process a higher amount of transactions. Careful though, as taller tellers tell tall tales.</q>',
            'Bank',
            1
        );
        Game.TieredUpgrade('Scissor-resistant credit cards', '<q>For those truly valued customers.</q>', 'Bank', 2);
        Game.TieredUpgrade('Acid-proof vaults', '<q>You know what they say : better safe than sorry.</q>', 'Bank', 3);
        Game.TieredUpgrade(
            'Chocolate coins',
            '<q>This revolutionary currency is much easier to melt from and into ingots - and tastes much better, for a change.</q>',
            'Bank',
            4
        );
        Game.TieredUpgrade('Exponential interest rates', '<q>Can\'t argue with mathematics! Now fork it over.</q>', 'Bank', 5);
        Game.TieredUpgrade(
            'Financial zen',
            '<q>The ultimate grail of economic thought; the feng shui of big money, the stock market yoga - the Heimlich maneuver of dimes and nickels.</q>',
            'Bank',
            6
        );

        order = 550;
        Game.TieredUpgrade('Golden idols', '<q>Lure even greedier adventurers to retrieve your cookies. Now that\'s a real idol game!</q>', 'Temple', 1);
        Game.TieredUpgrade('Sacrifices', '<q>What\'s a life to a gigaton of cookies?</q>', 'Temple', 2);
        Game.TieredUpgrade(
            'Delicious blessing',
            '<q>And lo, the Baker\'s almighty spoon came down and distributed holy gifts unto the believers - shimmering sugar, and chocolate dark as night, and all manner of wheats. And boy let me tell you, that party was mighty gnarly.</q>',
            'Temple',
            3
        );
        Game.TieredUpgrade(
            'Sun festival',
            '<q>Free the primordial powers of your temples with these annual celebrations involving fire-breathers, traditional dancing, ritual beheadings and other merriments!</q>',
            'Temple',
            4
        );
        Game.TieredUpgrade(
            'Enlarged pantheon',
            '<q>Enough spiritual inadequacy! More divinities than you\'ll ever need, or your money back! 100% guaranteed!</q>',
            'Temple',
            5
        );
        Game.TieredUpgrade(
            'Great Baker in the sky',
            '<q>This is it. The ultimate deity has finally cast Their sublimely divine eye upon your operation; whether this is a good thing or possibly the end of days is something you should find out very soon.</q>',
            'Temple',
            6
        );

        order = 575;
        Game.TieredUpgrade(
            'Pointier hats',
            '<q>Tests have shown increased thaumic receptivity relative to the geometric proportions of wizardly conic implements.</q>',
            'Wizard tower',
            1
        );
        Game.TieredUpgrade('Beardlier beards', '<q>Haven\'t you heard? The beard is the word.</q>', 'Wizard tower', 2);
        Game.TieredUpgrade(
            'Ancient grimoires',
            '<q>Contain interesting spells such as "Turn Water To Drool", "Grow Eyebrows On Furniture" and "Summon Politician".</q>',
            'Wizard tower',
            3
        );
        Game.TieredUpgrade('Kitchen curses', '<q>Exotic magic involved in all things pastry-related. Hexcellent!</q>', 'Wizard tower', 4);
        Game.TieredUpgrade(
            'School of sorcery',
            '<q>This cookie-funded academy of witchcraft is home to the 4 prestigious houses of magic : the Jocks, the Nerds, the Preps, and the Deathmunchers.</q>',
            'Wizard tower',
            5
        );
        Game.TieredUpgrade(
            'Dark formulas',
            '<q>Eldritch forces are at work behind these spells - you get the feeling you really shouldn\'t be messing with those. But I mean, free cookies, right?</q>',
            'Wizard tower',
            6
        );

        order = 250;
        Game.GrandmaSynergy('Banker grandmas', 'A nice banker to cash in more cookies.', 'Bank');
        Game.GrandmaSynergy('Priestess grandmas', 'A nice priestess to praise the one true Baker in the sky.', 'Temple');
        Game.GrandmaSynergy('Witch grandmas', 'A nice witch to cast a zip, and a zoop, and poof! Cookies.', 'Wizard tower');

        order = 0;
        new Game.Upgrade('Tin of british tea biscuits', loc('Contains an assortment of fancy biscuits.') + '<q>Every time is tea time.</q>', 25, [21, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];
        new Game.Upgrade(
            'Box of macarons',
            loc('Contains an assortment of macarons.') +
            '<q>Multicolored delicacies filled with various kinds of jam.<br>Not to be confused with macaroons, macaroni, macarena or any of that nonsense.</q>',
            25,
            [20, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];
        new Game.Upgrade('Box of brand biscuits', loc('Contains an assortment of popular biscuits.') + '<q>They\'re brand new!</q>', 25, [20, 9]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Pure black chocolate cookies',
            desc: 'Dipped in a lab-made substance darker than the darkest cocoa (dubbed "chocoalate").',
            icon: [26, 3],
            power: 5,
            price: 9999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Pure white chocolate cookies',
            desc: 'Elaborated on the nano-scale, the coating on this biscuit is able to refract light even in a pitch-black environment.',
            icon: [26, 4],
            power: 5,
            price: 9999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Ladyfingers',
            desc: 'Cleaned and sanitized so well you\'d swear they\'re actual biscuits.',
            icon: [27, 3],
            power: 3,
            price: 99999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Tuiles',
            desc: 'These never go out of tile.',
            icon: [27, 4],
            power: 3,
            price: 99999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate-stuffed biscuits',
            desc: 'A princely snack!<br>The holes are so the chocolate stuffing can breathe.',
            icon: [28, 3],
            power: 3,
            price: 999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Checker cookies',
            desc: 'A square cookie? This solves so many storage and packaging problems! You\'re a genius!',
            icon: [28, 4],
            power: 3,
            price: 999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Butter cookies',
            desc: 'These melt right off your mouth and into your heart. (Let\'s face it, they\'re rather fattening.)',
            icon: [29, 3],
            power: 3,
            price: 9999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Cream cookies',
            desc: 'It\'s like two chocolate chip cookies! But brought together with the magic of cream! It\'s fiendishly perfect!',
            icon: [29, 4],
            power: 3,
            price: 9999999999999999999 * 5
        });

        order = 0;
        let descStr = locStr('Placing an upgrade in this slot will make its effects <b>permanent</b> across all playthroughs.');
        new Game.Upgrade('Permanent upgrade slot I', descStr, 100, [0, 10]);
        Game.last.pool = 'prestige';
        Game.last.iconFunction = function () {
            return Game.PermanentSlotIcon(0);
        };
        Game.last.activateFunction = function () {
            Game.AssignPermanentSlot(0);
        };
        new Game.Upgrade('Permanent upgrade slot II', descStr, 20000, [1, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot I'];
        Game.last.iconFunction = function () {
            return Game.PermanentSlotIcon(1);
        };
        Game.last.activateFunction = function () {
            Game.AssignPermanentSlot(1);
        };
        new Game.Upgrade('Permanent upgrade slot III', descStr, 3000000, [2, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot II'];
        Game.last.iconFunction = function () {
            return Game.PermanentSlotIcon(2);
        };
        Game.last.activateFunction = function () {
            Game.AssignPermanentSlot(2);
        };
        new Game.Upgrade('Permanent upgrade slot IV', descStr, 400000000, [3, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot III'];
        Game.last.iconFunction = function () {
            return Game.PermanentSlotIcon(3);
        };
        Game.last.activateFunction = function () {
            Game.AssignPermanentSlot(3);
        };
        new Game.Upgrade('Permanent upgrade slot V', descStr, 50000000000, [4, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot IV'];
        Game.last.iconFunction = function () {
            return Game.PermanentSlotIcon(4);
        };
        Game.last.activateFunction = function () {
            Game.AssignPermanentSlot(4);
        };

        const slots = [
            'Permanent upgrade slot I',
            'Permanent upgrade slot II',
            'Permanent upgrade slot III',
            'Permanent upgrade slot IV',
            'Permanent upgrade slot V'
        ];
        for (const [i, slot] of slots.entries()) {
            Game.Upgrades[slot].descFunc = (function (i) {
                return function (/** @type {string} */ context) {
                    if (Game.permanentUpgrades[i] == -1)
                        // @ts-expect-error what is this
                        return this.desc + (context === 'stats' ? '' : '<br><b>' + loc('Click to activate.') + '</b>');
                    const upgrade = Game.UpgradesById[Game.permanentUpgrades[i]];
                    return (
                        '<div style="text-align:center;">' +
                        loc('Current:') +
                        ' ' +
                        tinyIcon(upgrade.icon) +
                        ' <b>' +
                        upgrade.dname +
                        '</b><div class="line"></div></div>' +
                        // @ts-expect-error once again what is this
                        this.ddesc +
                        (context === 'stats' ? '' : '<br><b>' + loc('Click to activate.') + '</b>')
                    );
                };
            })(i);
        }

        new Game.Upgrade(
            'Starspawn',
            loc('Eggs drop <b>%1%</b> more often.', 10) + '<br>' + loc('Golden cookies appear <b>%1%</b> more often during %2.', [2, String(loc('Easter'))]),
            111111,
            [0, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade(
            'Starsnow',
            loc('Christmas cookies drop <b>%1%</b> more often.', 5) + '<br>' + loc('Reindeer appear <b>%1%</b> more often.', 5),
            111111,
            [12, 9]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade(
            'Starterror',
            loc('Spooky cookies drop <b>%1%</b> more often.', 10) +
            '<br>' +
            loc('Golden cookies appear <b>%1%</b> more often during %2.', [2, String(loc('Halloween'))]),
            111111,
            [13, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade(
            'Starlove',
            loc('Heart cookies are <b>%1%</b> more powerful.', 50) +
            '<br>' +
            loc('Golden cookies appear <b>%1%</b> more often during %2.', [2, String(loc('Valentine\'s day'))]),
            111111,
            [20, 3]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade('Startrade', loc('Golden cookies appear <b>%1%</b> more often during %2.', [5, String(loc('Business day'))]), 111111, [17, 6]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];

        let angelPriceFactor = 7;
        let desc = function (/** @type {any} */ percent, /** @type {any} */ total) {
            return loc('You gain another <b>+%1%</b> of your regular CpS while the game is closed, for a total of <b>%2%</b>.', [percent, total]);
        };
        new Game.Upgrade(
            'Angels',
            desc(10, 15) +
            '<q>Lowest-ranking at the first sphere of pastry heaven, angels are tasked with delivering new recipes to the mortals they deem worthy.</q>',
            Math.pow(angelPriceFactor, 1),
            [0, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Twin Gates of Transcendence'];
        new Game.Upgrade(
            'Archangels',
            desc(10, 25) +
            '<q>Members of the first sphere of pastry heaven, archangels are responsible for the smooth functioning of the world\'s largest bakeries.</q>',
            Math.pow(angelPriceFactor, 2),
            [1, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Angels'];
        new Game.Upgrade(
            'Virtues',
            desc(10, 35) +
            '<q>Found at the second sphere of pastry heaven, virtues make use of their heavenly strength to push and drag the stars of the cosmos.</q>',
            Math.pow(angelPriceFactor, 3),
            [2, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Archangels'];
        new Game.Upgrade(
            'Dominions',
            desc(10, 45) +
            '<q>Ruling over the second sphere of pastry heaven, dominions hold a managerial position and are in charge of accounting and regulating schedules.</q>',
            Math.pow(angelPriceFactor, 4),
            [3, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Virtues'];
        new Game.Upgrade(
            'Cherubim',
            desc(10, 55) + '<q>Sieging at the first sphere of pastry heaven, the four-faced cherubim serve as heavenly bouncers and bodyguards.</q>',
            Math.pow(angelPriceFactor, 5),
            [4, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Dominions'];
        new Game.Upgrade(
            'Seraphim',
            desc(10, 65) + '<q>Leading the first sphere of pastry heaven, seraphim possess ultimate knowledge of everything pertaining to baking.</q>',
            Math.pow(angelPriceFactor, 6),
            [5, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Cherubim'];
        new Game.Upgrade('God', desc(10, 75) + '<q>Like Santa, but less fun.</q>', Math.pow(angelPriceFactor, 7), [6, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Seraphim'];

        new Game.Upgrade(
            'Twin Gates of Transcendence',
            loc(
                'You now <b>keep making cookies while the game is closed</b>, at the rate of <b>%1%</b> of your regular CpS and up to <b>1 hour</b> after the game is closed.<br>(Beyond 1 hour, this is reduced by a further %2% - your rate goes down to <b>%3%</b> of your CpS.)',
                [5, 90, 0.5]
            ) + '<q>This is one occasion you\'re always underdressed for. Don\'t worry, just rush in past the bouncer and pretend you know people.</q>',
            1,
            [15, 11]
        );
        Game.last.pool = 'prestige';

        new Game.Upgrade('Heavenly luck', loc('Golden cookies appear <b>%1%</b> more often.', 5) + '<q>Someone up there likes you.</q>', 77, [22, 6]);
        Game.last.pool = 'prestige';
        new Game.Upgrade(
            'Lasting fortune',
            loc('Golden cookie effects last <b>%1%</b> longer.', 10) + '<q>This isn\'t your average everyday luck. This is... advanced luck.</q>',
            777,
            [23, 6]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly luck'];
        new Game.Upgrade('Decisive fate', loc('Golden cookies stay <b>%1%</b> longer.', 5) + '<q>Life just got a bit more intense.</q>', 7777, [10, 14]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Lasting fortune'];

        new Game.Upgrade(
            'Divine discount',
            loc('All buildings are <b>%1% cheaper</b>.', 1) + '<q>Someone special deserves a special price.</q>',
            99999,
            [21, 7]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Decisive fate'];
        new Game.Upgrade('Divine sales', loc('All upgrades are <b>%1% cheaper</b>.', 1) + '<q>Everything must go!</q>', 99999, [18, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Decisive fate'];
        new Game.Upgrade(
            'Divine bakeries',
            loc('Cookie upgrades are <b>%1 times cheaper</b>.', 5) + '<q>They sure know what they\'re doing.</q>',
            399999,
            [17, 7]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Divine sales', 'Divine discount'];

        new Game.Upgrade('Starter kit', loc('You start with <b>%1</b>.', loc('%1 cursor', 10)) + '<q>This can come in handy.</q>', 50, [0, 14]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Tin of british tea biscuits', 'Box of macarons', 'Box of brand biscuits', 'Tin of butter cookies'];
        new Game.Upgrade('Starter kitchen', loc('You start with <b>%1</b>.', loc('%1 grandma', 5)) + '<q>Where did these come from?</q>', 5000, [1, 14]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kit'];
        new Game.Upgrade('Halo gloves', loc('Clicking is <b>%1%</b> more powerful.', 10) + '<q>Smite that cookie.</q>', 55555, [22, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kit'];

        new Game.Upgrade('Kitten angels', strKittenDesc + '<q>All cats go to heaven.</q>', 9000, [23, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Dominions'];
        Game.last.kitten = 1;

        new Game.Upgrade(
            'Unholy bait',
            loc('Wrinklers appear <b>%1 times</b> as fast.', 5) + '<q>No wrinkler can resist the scent of worm biscuits.</q>',
            44444,
            [15, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kitchen'];
        new Game.Upgrade(
            'Sacrilegious corruption',
            loc('Wrinklers explode into <b>%1% more cookies</b>.', 5) +
            '<q>Unique in the animal kingdom, the wrinkler digestive tract is able to withstand an incredible degree of dilation - provided you prod them appropriately.</q>',
            444444,
            [19, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Unholy bait'];

        order = 200;
        Game.TieredUpgrade('Xtreme walkers', '<q>Complete with flame decals and a little horn that goes "toot".</q>', 'Grandma', 7);
        order = 300;
        Game.TieredUpgrade(
            'Fudge fungus',
            '<q>A sugary parasite whose tendrils help cookie growth.<br>Please do not breathe in the spores. In case of spore ingestion, seek medical help within the next 36 seconds.</q>',
            'Farm',
            7
        );
        order = 400;
        Game.TieredUpgrade(
            'Planetsplitters',
            '<q>These new state-of-the-art excavators have been tested on Merula, Globort and Flwanza VI, among other distant planets which have been curiously quiet lately.</q>',
            'Mine',
            7
        );
        order = 500;
        Game.TieredUpgrade(
            'Cyborg workforce',
            '<q>Semi-synthetic organisms don\'t slack off, don\'t unionize, and have 20% shorter lunch breaks, making them ideal labor fodder.</q>',
            'Factory',
            7
        );
        order = 525;
        Game.TieredUpgrade(
            'Way of the wallet',
            '<q>This new monetary school of thought is all the rage on the banking scene; follow its precepts and you may just profit from it.</q>',
            'Bank',
            7
        );
        order = 550;
        Game.TieredUpgrade(
            'Creation myth',
            '<q>Stories have been circulating about the origins of the very first cookie that was ever baked; tales of how it all began, in the Dough beyond time and the Ovens of destiny.</q>',
            'Temple',
            7
        );
        order = 575;
        Game.TieredUpgrade(
            'Cookiemancy',
            '<q>There it is; the perfected school of baking magic. From summoning chips to hexing nuts, there is not a single part of cookie-making that hasn\'t been improved tenfold by magic tricks.</q>',
            'Wizard tower',
            7
        );
        order = 600;
        Game.TieredUpgrade(
            'Dyson sphere',
            '<q>You\'ve found a way to apply your knowledge of cosmic technology to slightly more local endeavors; this gigantic sphere of meta-materials, wrapping the solar system, is sure to kick your baking abilities up a notch.</q>',
            'Shipment',
            7
        );
        order = 700;
        Game.TieredUpgrade(
            'Theory of atomic fluidity',
            '<q>Pushing alchemy to its most extreme limits, you find that everything is transmutable into anything else - lead to gold, mercury to water; more importantly, you realize that anything can -and should- be converted to cookies.</q>',
            'Alchemy lab',
            7
        );
        order = 800;
        Game.TieredUpgrade('End of times back-up plan', '<q>Just in case, alright?</q>', 'Portal', 7);
        order = 900;
        Game.TieredUpgrade(
            'Great loop hypothesis',
            '<q>What if our universe is just one instance of an infinite cycle? What if, before and after it, stretched infinite amounts of the same universe, themselves containing infinite amounts of cookies?</q>',
            'Time machine',
            7
        );
        order = 1000;
        Game.TieredUpgrade(
            'The Pulse',
            '<q>You\'ve tapped into the very pulse of the cosmos, a timeless rhythm along which every material and antimaterial thing beats in unison. This, somehow, means more cookies.</q>',
            'Antimatter condenser',
            7
        );
        order = 1100;
        Game.TieredUpgrade(
            'Lux sanctorum',
            '<q>Your prism attendants have become increasingly mesmerized with something in the light - or maybe something beyond it; beyond us all, perhaps?</q>',
            'Prism',
            7
        );

        order = 200;
        Game.TieredUpgrade(
            'The Unbridling',
            '<q>It might be a classic tale of bad parenting, but let\'s see where grandma is going with this.</q>',
            'Grandma',
            8
        );
        order = 300;
        Game.TieredUpgrade(
            'Wheat triffids',
            '<q>Taking care of crops is so much easier when your plants can just walk about and help around the farm.<br>Do not pet. Do not feed. Do not attempt to converse with.</q>',
            'Farm',
            8
        );
        order = 400;
        Game.TieredUpgrade(
            'Canola oil wells',
            '<q>A previously untapped resource, canola oil permeates the underground olifers which grant it its particular taste and lucrative properties.</q>',
            'Mine',
            8
        );
        order = 500;
        Game.TieredUpgrade('78-hour days', '<q>Why didn\'t we think of this earlier?</q>', 'Factory', 8);
        order = 525;
        Game.TieredUpgrade('The stuff rationale', '<q>If not now, when? If not it, what? If not things... stuff?</q>', 'Bank', 8);
        order = 550;
        Game.TieredUpgrade(
            'Theocracy',
            '<q>You\'ve turned your cookie empire into a perfect theocracy, gathering the adoration of zillions of followers from every corner of the universe.<br>Don\'t let it go to your head.</q>',
            'Temple',
            8
        );
        order = 575;
        Game.TieredUpgrade(
            'Rabbit trick',
            '<q>Using nothing more than a fancy top hat, your wizards have found a way to simultaneously curb rabbit population and produce heaps of extra cookies for basically free!<br>Resulting cookies may or may not be fit for vegans.</q>',
            'Wizard tower',
            8
        );
        order = 600;
        Game.TieredUpgrade(
            'The final frontier',
            '<q>It\'s been a long road, getting from there to here. It\'s all worth it though - the sights are lovely and the oil prices slightly more reasonable.</q>',
            'Shipment',
            8
        );
        order = 700;
        Game.TieredUpgrade(
            'Beige goo',
            '<q>Well now you\'ve done it. Good job. Very nice. That\'s 3 galaxies you\'ve just converted into cookies. Good thing you can hop from universe to universe.</q>',
            'Alchemy lab',
            8
        );
        order = 800;
        Game.TieredUpgrade(
            'Maddening chants',
            '<q>A popular verse goes like so : "jau\'hn madden jau\'hn madden aeiouaeiouaeiou brbrbrbrbrbrbr"</q>',
            'Portal',
            8
        );
        order = 900;
        Game.TieredUpgrade(
            'Cookietopian moments of maybe',
            '<q>Reminiscing how things could have been, should have been, will have been.</q>',
            'Time machine',
            8
        );
        order = 1000;
        Game.TieredUpgrade(
            'Some other super-tiny fundamental particle? Probably?',
            '<q>When even the universe is running out of ideas, that\'s when you know you\'re nearing the end.</q>',
            'Antimatter condenser',
            8
        );
        order = 1100;
        Game.TieredUpgrade('Reverse shadows', '<q>Oh man, this is really messing with your eyes.</q>', 'Prism', 8);

        order = 20000;
        new Game.Upgrade('Kitten accountants', strKittenDesc + '<q>business going great, sir</q>', 900000000000000000000000, Game.GetIcon('Kitten', 6));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 6, 18);
        new Game.Upgrade(
            'Kitten specialists',
            strKittenDesc + '<q>optimeowzing your workflow like whoah, sir</q>',
            900000000000000000000000000,
            Game.GetIcon('Kitten', 7)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 7, 18);
        new Game.Upgrade(
            'Kitten experts',
            strKittenDesc + '<q>10 years expurrrtise in the cookie business, sir</q>',
            900000000000000000000000000000,
            Game.GetIcon('Kitten', 8)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 8, 18);

        new Game.Upgrade(
            'How to bake your dragon',
            loc('Allows you to purchase a <b>crumbly egg</b> once you have earned 1 million cookies.') +
            '<q>A tome full of helpful tips such as "oh god, stay away from it", "why did we buy this thing, it\'s not even house-broken" and "groom twice a week in the direction of the scales".</q>',
            9,
            [22, 12]
        );
        Game.last.pool = 'prestige';

        order = 25100;
        new Game.Upgrade(
            'A crumbly egg',
            loc('Unlocks the <b>cookie dragon egg</b>.') +
            '<q>Thank you for adopting this robust, fun-loving cookie dragon! It will bring you years of joy and entertainment.<br>Keep in a dry and cool place, and away from other house pets. Subscription to home insurance is strongly advised.</q>',
            25,
            [21, 12]
        );

        new Game.Upgrade(
            'Chimera',
            loc('Synergy upgrades are <b>%1% cheaper</b>.', 2) +
            '<br>' +
            loc('You gain another <b>+%1%</b> of your regular CpS while the game is closed.', 5) +
            '<br>' +
            loc('You retain optimal cookie production while the game is closed for <b>%1 more days</b>.', 2) +
            '<q>More than the sum of its parts.</q>',
            Math.pow(angelPriceFactor, 9),
            [24, 7]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['God', 'Lucifer', 'Synergies Vol. II'];

        new Game.Upgrade(
            'Tin of butter cookies',
            loc('Contains an assortment of rich butter cookies.') + '<q>Five varieties of danish cookies.<br>Complete with little paper cups.</q>',
            25,
            [21, 9]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];

        new Game.Upgrade(
            'Golden switch',
            loc('Unlocks the <b>golden switch</b>, which passively boosts your CpS by %1% but disables golden cookies.', 50) +
            '<q>Less clicking, more idling.</q>',
            999,
            [21, 10]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly luck'];

        new Game.Upgrade(
            'Classic dairy selection',
            loc('Unlocks the <b>milk selector</b>, letting you pick which milk is displayed under your cookie.<br>Comes with a variety of basic flavors.') +
            '<q>Don\'t have a cow, man.</q>',
            9,
            [1, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = [];

        new Game.Upgrade(
            'Fanciful dairy selection',
            loc('Contains more exotic flavors for your milk selector.') + '<q>Strong bones for the skeleton army.</q>',
            1000000,
            [9, 7]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Classic dairy selection'];

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Dragon cookie',
            desc: 'Imbued with the vigor and vitality of a full-grown cookie dragon, this mystical cookie will embolden your empire for the generations to come.',
            icon: [10, 25],
            power: 5,
            price: 9999999999999999 * 7,
            locked: 1
        });

        order = 40000;
        new Game.Upgrade(
            'Golden switch [off]',
            loc(
                'Turning this on will give you a passive <b>+%1% CpS</b>, but prevents golden cookies from spawning.<br>Cost is equal to 1 hour of production.',
                50
            ),
            1000000,
            [20, 10]
        );
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Golden switch [on]';
        Game.last.priceFunc = function () {
            return Game.cookiesPs * 60 * 60;
        };
        let func = /**
         * @this {any}
         */
 function () {
     if (Game.Has('Residual luck')) {
         let bonus = 0;
         let upgrades = Game.goldenCookieUpgrades;
         for (const upgrade of upgrades) {
             if (Game.Has(upgrade)) bonus++;
         }
         return (
             '<div style="text-align:center;">' +
                    Game.listTinyOwnedUpgrades(Game.goldenCookieUpgrades) +
                    '<br><br>The effective boost is <b>+' +
                    Beautify(Math.round(50 + bonus * 10)) +
                    '%</b><br>thanks to residual luck<br>and your <b>' +
                    bonus +
                    '</b> golden cookie upgrade' +
                    (bonus == 1 ? '' : 's') +
                    '.</div><div class="line"></div>' +
                    this.ddesc
         );
     }
     return this.desc;
 };
        if (EN) Game.last.descFunc = func;

        new Game.Upgrade(
            'Golden switch [on]',
            loc(
                'The switch is currently giving you a passive <b>+%1% CpS</b>; it also prevents golden cookies from spawning.<br>Turning it off will revert those effects.<br>Cost is equal to 1 hour of production.',
                50
            ),
            1000000,
            [21, 10]
        );
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Golden switch [off]';
        Game.last.priceFunc = function () {
            return Game.cookiesPs * 60 * 60;
        };
        Game.last.descFunc = func;

        order = 50000;
        new Game.Upgrade('Milk selector', loc('Lets you pick what flavor of milk to display.'), 0, [1, 8]);
        Game.last.descFunc = function () {
            let choice = this.choicesFunction()[Game.milkType];
            if (!choice) choice = this.choicesFunction()[0];
            return (
                '<div style="text-align:center;">' +
                loc('Current:') +
                ' ' +
                tinyIcon(choice.icon) +
                ' <b>' +
                choice.name +
                '</b></div><div class="line"></div>' +
                this.ddesc
            );
        };

        Game.last.pool = 'toggle';
        Game.last.choicesFunction = function () {
            let rank = 0;
            let choices = [];

            for (let i = 0; i < Game.AllMilks.length; i++) {
                let it = Game.AllMilks[i];
                choices.push({
                    name: it.name,
                    icon: it.icon,
                    milk: it,
                    order: it.type,
                    div: i === -1 ? false : undefined,
                    selected: i === -1 ? 0 : undefined
                });
            }

            choices[11].div = true;

            let maxRank = Math.floor(Game.AchievementsOwned / 25);
            for (let i = 0; i < choices.length; i++) {
                let it;
                const choice = choices[i];
                if (typeof choice !== 'number') it = choice.milk;
                if (it?.type == 1 && !Game.Has('Fanciful dairy selection')) choices[i] = 0;
                if (it?.rank && it?.rank > maxRank) choices[i] = 0;
            }

            const choice = choices[Game.milkType];
            if (typeof choice !== 'number') choice.selected = 1;
            return choices;
        };
        Game.last.choicesPick = function (/** @type {number} */ id) {
            Game.milkType = id;
        };

        order = 10300;
        let butterBiscuitMult = 100000000;
        Game.NewUpgradeCookie({
            name: 'Milk chocolate butter biscuit',
            desc: 'Rewarded for owning 100 of everything.<br>It bears the engraving of a fine entrepreneur.',
            icon: [27, 8],
            power: 10,
            price: 999999999999999999999 * butterBiscuitMult,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Dark chocolate butter biscuit',
            desc: 'Rewarded for owning 150 of everything.<br>It is adorned with the image of an experienced cookie tycoon.',
            icon: [27, 9],
            power: 10,
            price: 999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'White chocolate butter biscuit',
            desc: 'Rewarded for owning 200 of everything.<br>The chocolate is chiseled to depict a masterful pastry magnate.',
            icon: [28, 9],
            power: 10,
            price: 999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Ruby chocolate butter biscuit',
            desc: 'Rewarded for owning 250 of everything.<br>Covered in a rare red chocolate, this biscuit is etched to represent the face of a cookie industrialist gone mad with power.',
            icon: [28, 8],
            power: 10,
            price: 999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Gingersnaps',
            desc: 'Cookies with a soul. Probably.',
            icon: [29, 10],
            power: 4,
            price: 99999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Cinnamon cookies',
            desc: 'The secret is in the patented swirly glazing.',
            icon: [23, 8],
            power: 4,
            price: 99999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Vanity cookies',
            desc: 'One tiny candied fruit sits atop this decadent cookie.',
            icon: [22, 8],
            power: 4,
            price: 999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Cigars',
            desc: 'Close, but no match for those extravagant cookie straws they serve in coffee shops these days.',
            icon: [25, 8],
            power: 4,
            price: 999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Pinwheel cookies',
            desc: 'Bringing you the dizzying combination of brown flavor and beige taste!',
            icon: [22, 10],
            power: 4,
            price: 9999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Fudge squares',
            desc: 'Not exactly cookies, but you won\'t care once you\'ve tasted one of these.<br>They\'re so good, it\'s fudged-up!',
            icon: [24, 8],
            power: 4,
            price: 9999999999999999999999 * 5
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Digits',
            desc: 'Three flavors, zero phalanges.',
            icon: [26, 8],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });

        order = 10029;
        Game.NewUpgradeCookie({
            name: 'Butter horseshoes',
            desc: 'It would behoove you to not overindulge in these.',
            icon: [22, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 99999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Butter pucks',
            desc: 'Lord, what fools these mortals be!<br>(This is kind of a hokey reference.)',
            icon: [23, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 99999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Butter knots',
            desc: 'Look, you can call these pretzels if you want, but you\'d just be fooling yourself, wouldn\'t you?',
            icon: [24, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Butter slabs',
            desc: 'Nothing butter than a slab to the face.',
            icon: [25, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Butter swirls',
            desc: 'These are equal parts sugar, butter, and warm fuzzy feelings - all of which cause millions of deaths every day.',
            icon: [26, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 9999999999999999999999999
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Shortbread biscuits',
            desc: 'These rich butter cookies are neither short, nor bread. What a country!',
            icon: [23, 10],
            power: 4,
            price: 99999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Millionaires\' shortbreads',
            desc: 'Three thought-provoking layers of creamy chocolate, hard-working caramel and crumbly biscuit in a poignant commentary of class struggle.',
            icon: [24, 10],
            power: 4,
            price: 99999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Caramel cookies',
            desc: 'The polymerized carbohydrates adorning these cookies are sure to stick to your teeth for quite a while.',
            icon: [25, 10],
            power: 4,
            price: 999999999999999999999999
        });

        desc = function (totalHours) {
            return loc(
                'You retain optimal cookie production while the game is closed for twice as long, for a total of <b>%1</b>.',
                Game.sayTime(totalHours * 60 * 60 * Game.fps, -1)
            );
        };
        new Game.Upgrade(
            'Belphegor',
            desc(2) + '<q>A demon of shortcuts and laziness, Belphegor commands machines to do work in his stead.</q>',
            Math.pow(angelPriceFactor, 1),
            [7, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Twin Gates of Transcendence'];
        new Game.Upgrade(
            'Mammon',
            desc(4) + '<q>The demonic embodiment of wealth, Mammon requests a tithe of blood and gold from all his worshippers.</q>',
            Math.pow(angelPriceFactor, 2),
            [8, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Belphegor'];
        new Game.Upgrade(
            'Abaddon',
            desc(8) + '<q>Master of overindulgence, Abaddon governs the wrinkler brood and inspires their insatiability.</q>',
            Math.pow(angelPriceFactor, 3),
            [9, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Mammon'];
        new Game.Upgrade(
            'Satan',
            desc(16) + '<q>The counterpoint to everything righteous, this demon represents the nefarious influence of deceit and temptation.</q>',
            Math.pow(angelPriceFactor, 4),
            [10, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Abaddon'];
        new Game.Upgrade(
            'Asmodeus',
            desc(32) + '<q>This demon with three monstrous heads draws his power from the all-consuming desire for cookies and all things sweet.</q>',
            Math.pow(angelPriceFactor, 5),
            [11, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Satan'];
        new Game.Upgrade(
            'Beelzebub',
            desc(64) + '<q>The festering incarnation of blight and disease, Beelzebub rules over the vast armies of pastry inferno.</q>',
            Math.pow(angelPriceFactor, 6),
            [12, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Asmodeus'];
        new Game.Upgrade(
            'Lucifer',
            desc(128) + '<q>Also known as the Lightbringer, this infernal prince\'s tremendous ego caused him to be cast down from pastry heaven.</q>',
            Math.pow(angelPriceFactor, 7),
            [13, 11]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Beelzebub'];

        new Game.Upgrade(
            'Golden cookie alert sound',
            loc('Unlocks the <b>golden cookie sound selector</b>, which lets you pick whether golden cookies emit a sound when appearing or not.') +
            '<q>A sound decision.</q>',
            999999,
            [28, 6]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Residual luck'];

        order = 49900;
        new Game.Upgrade('Golden cookie sound selector', loc('Lets you change the sound golden cookies make when they spawn.'), 0, [28, 6]);
        Game.last.descFunc = function () {
            let choice = this.choicesFunction()[Game.chimeType];
            return (
                '<div style="text-align:center;">' +
                loc('Current:') +
                ' ' +
                tinyIcon(choice.icon) +
                ' <b>' +
                choice.name +
                '</b></div><div class="line"></div>' +
                this.ddesc
            );
        };

        Game.last.pool = 'toggle';
        Game.last.choicesFunction = function () {
            let choices = [];
            choices[0] = { name: 'No sound', icon: [0, 7], selected: choices.length === -1 ? 0 : undefined };
            choices[1] = { name: 'Chime', icon: [22, 6] };
            choices[2] = { name: 'Fortune', icon: [27, 6] };
            choices[3] = { name: 'Cymbal', icon: [9, 10] };
            choices[4] = { name: 'Squeak', icon: [8, 10] };
            for (const choice of choices) choice.name = locStr(choice.name);

            choices[Game.chimeType].selected = 1;
            return choices;
        };
        Game.last.choicesPick = function (/** @type {number} */ id) {
            Game.chimeType = id;
            Game.playGoldenCookieChime();
        };

        new Game.Upgrade(
            'Basic wallpaper assortment',
            loc('Unlocks the <b>background selector</b>, letting you select the game\'s background.<br>Comes with a variety of basic flavors.') +
            '<q>Prioritizing aesthetics over crucial utilitarian upgrades? Color me impressed.</q>',
            99,
            [29, 5]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Classic dairy selection'];

        new Game.Upgrade(
            'Legacy',
            loc(
                'This is the first heavenly upgrade; it unlocks the <b>Heavenly chips</b> system.<div class="line"></div>Each time you ascend, the cookies you made in your past life are turned into <b>heavenly chips</b> and <b>prestige</b>.<div class="line"></div><b>Heavenly chips</b> can be spent on a variety of permanent transcendental upgrades.<div class="line"></div>Your <b>prestige level</b> also gives you a permanent <b>+1% CpS</b> per level.'
            ) + '<q>We\'ve all been waiting for you.</q>',
            1,
            [21, 6]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = [];

        new Game.Upgrade(
            'Elder spice',
            loc('You can attract <b>%1 more wrinklers</b>.', 2) + '<q>The cookie your cookie could smell like.</q>',
            444444,
            [19, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Unholy bait'];

        new Game.Upgrade(
            'Residual luck',
            loc('While the golden switch is on, you gain an additional <b>+%1% CpS</b> per golden cookie upgrade owned.', 10) +
            '<q>Fortune comes in many flavors.</q>',
            99999,
            [27, 6]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Golden switch'];

        order = 150;
        new Game.Upgrade(
            'Fantasteel mouse',
            getStrClickingGains(1) + '<q>You could be clicking using your touchpad and we\'d be none the wiser.</q>',
            5000000000000000000,
            [11, 17]
        );
        Game.MakeTiered(Game.last, 8, 11);
        new Game.Upgrade(
            'Nevercrack mouse',
            getStrClickingGains(1) + '<q>How much beefier can you make a mouse until it\'s considered a rat?</q>',
            500000000000000000000,
            [11, 18]
        );
        Game.MakeTiered(Game.last, 9, 11);

        new Game.Upgrade(
            'Five-finger discount',
            loc('All upgrades are <b>%1% cheaper per %2</b>.', [1, String(loc('%1 cursor', 100))]) + '<q>Stick it to the man.</q>',
            555555,
            [28, 7],
            function () {
                Game.upgradesToRebuild = 1;
            }
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Halo gloves', 'Abaddon'];

        order = 5000;
        Game.SynergyUpgrade(
            'Future almanacs',
            '<q>Lets you predict optimal planting times. It\'s crazy what time travel can do!</q>',
            'Farm',
            'Time machine',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Rain prayer',
            '<q>A deeply spiritual ceremonial involving complicated dance moves and high-tech cloud-busting lasers.</q>',
            'Farm',
            'Temple',
            'synergy2'
        );

        Game.SynergyUpgrade('Seismic magic', '<q>Surprise earthquakes are an old favorite of wizardly frat houses.</q>', 'Mine', 'Wizard tower', 'synergy1');
        Game.SynergyUpgrade(
            'Asteroid mining',
            '<q>As per the <span>19</span>74 United Cosmic Convention, comets, moons, and inhabited planetoids are no longer legally excavatable.<br>But hey, a space bribe goes a long way.</q>',
            'Mine',
            'Shipment',
            'synergy2'
        );

        Game.SynergyUpgrade(
            'Quantum electronics',
            '<q>Your machines won\'t even be sure if they\'re on or off!</q>',
            'Factory',
            'Antimatter condenser',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Temporal overclocking',
            '<q>Introduce more quickitude in your system for increased speedation of fastness.</q>',
            'Factory',
            'Time machine',
            'synergy2'
        );

        Game.SynergyUpgrade('Contracts from beyond', '<q>Make sure to read the fine print!</q>', 'Bank', 'Portal', 'synergy1');
        Game.SynergyUpgrade('Printing presses', '<q>Fake bills so real, they\'re almost worth the ink they\'re printed with.</q>', 'Bank', 'Factory', 'synergy2');

        Game.SynergyUpgrade('Paganism', '<q>Some deities are better left unworshipped.</q>', 'Temple', 'Portal', 'synergy1');
        Game.SynergyUpgrade('God particle', '<q>Turns out God is much tinier than we thought, I guess.</q>', 'Temple', 'Antimatter condenser', 'synergy2');

        Game.SynergyUpgrade(
            'Arcane knowledge',
            '<q>Some things were never meant to be known - only mildly speculated.</q>',
            'Wizard tower',
            'Alchemy lab',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Magical botany',
            '<q>Already known in some reactionary newspapers as "the wizard\'s GMOs".</q>',
            'Wizard tower',
            'Farm',
            'synergy2'
        );

        Game.SynergyUpgrade(
            'Fossil fuels',
            '<q>Somehow better than plutonium for powering rockets.<br>Extracted from the fuels of ancient, fossilized civilizations.</q>',
            'Shipment',
            'Mine',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Shipyards',
            '<q>Where carpentry, blind luck, and asbestos insulation unite to produce the most dazzling spaceships on the planet.</q>',
            'Shipment',
            'Factory',
            'synergy2'
        );

        Game.SynergyUpgrade(
            'Primordial ores',
            '<q>Only when refining the purest metals will you extract the sweetest sap of the earth.</q>',
            'Alchemy lab',
            'Mine',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Gold fund',
            '<q>If gold is the backbone of the economy, cookies, surely, are its hip joints.</q>',
            'Alchemy lab',
            'Bank',
            'synergy2'
        );

        Game.SynergyUpgrade('Infernal crops', '<q>Sprinkle regularly with FIRE.</q>', 'Portal', 'Farm', 'synergy1');
        Game.SynergyUpgrade('Abysmal glimmer', '<q>Someone, or something, is staring back at you.<br>Perhaps at all of us.</q>', 'Portal', 'Prism', 'synergy2');

        Game.SynergyUpgrade(
            'Relativistic parsec-skipping',
            '<q>People will tell you this isn\'t physically possible.<br>These are people you don\'t want on your ship.</q>',
            'Time machine',
            'Shipment',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Primeval glow',
            '<q>From unending times, an ancient light still shines, impossibly pure and fragile in its old age.</q>',
            'Time machine',
            'Prism',
            'synergy2'
        );

        Game.SynergyUpgrade(
            'Extra physics funding',
            '<q>Time to put your money where your particle colliders are.</q>',
            'Antimatter condenser',
            'Bank',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Chemical proficiency',
            '<q>Discover exciting new elements, such as Fleshmeltium, Inert Shampoo Byproduct #17 and Carbon++!</q>',
            'Antimatter condenser',
            'Alchemy lab',
            'synergy2'
        );

        Game.SynergyUpgrade(
            'Light magic',
            '<q>Actually not to be taken lightly! No, I\'m serious. 178 people died last year. You don\'t mess around with magic.</q>',
            'Prism',
            'Wizard tower',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Mystical energies',
            '<q>Something beckons from within the light. It is warm, comforting, and apparently the cause for several kinds of exotic skin cancers.</q>',
            'Prism',
            'Temple',
            'synergy2'
        );

        new Game.Upgrade(
            'Synergies Vol. I',
            loc(
                'Unlocks a new tier of upgrades that affect <b>2 buildings at the same time</b>.<br>Synergies appear once you have <b>%1</b> of both buildings.',
                15
            ) + '<q>The many beats the few.</q>',
            222222,
            [10, 20]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Satan', 'Dominions'];
        new Game.Upgrade(
            'Synergies Vol. II',
            loc(
                'Unlocks a new tier of upgrades that affect <b>2 buildings at the same time</b>.<br>Synergies appear once you have <b>%1</b> of both buildings.',
                75
            ) + '<q>The several beats the many.</q>',
            2222222,
            [10, 29]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Beelzebub', 'Seraphim', 'Synergies Vol. I'];

        new Game.Upgrade(
            'Heavenly cookies',
            loc('Cookie production multiplier <b>+%1% permanently</b>.', 10) +
            '<q>Baked with heavenly chips. An otherwordly flavor that transcends time and space.</q>',
            3,
            [25, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Legacy'];
        Game.last.power = 10;
        Game.last.pseudoCookie = true;
        new Game.Upgrade(
            'Wrinkly cookies',
            loc('Cookie production multiplier <b>+%1% permanently</b>.', 10) +
            '<q>The result of regular cookies left to age out for countless eons in a place where time and space are meaningless.</q>',
            6666666,
            [26, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sacrilegious corruption', 'Elder spice'];
        Game.last.power = 10;
        Game.last.pseudoCookie = true;
        new Game.Upgrade(
            'Distilled essence of redoubled luck',
            loc('Golden cookies (and all other things that spawn, such as reindeer) have <b>%1% chance of being doubled</b>.', 1) +
            '<q>Tastes glittery. The empty phial makes for a great pencil holder.</q>',
            7777777,
            [27, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Divine bakeries', 'Residual luck'];

        order = 40000;
        new Game.Upgrade('Occult obstruction', loc('Cookie production <b>reduced to 0</b>.') + '<q>If symptoms persist, consult a doctor.</q>', 7, [15, 5]); // debug purposes only
        Game.last.pool = 'debug';
        new Game.Upgrade(
            'Glucose-charged air',
            loc('Sugar lumps coalesce <b>a whole lot faster</b>.') + '<q>Don\'t breathe too much or you\'ll get diabetes!</q>',
            7,
            [29, 16]
        ); // debug purposes only
        Game.last.pool = 'debug';

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Lavender chocolate butter biscuit',
            desc: 'Rewarded for owning 300 of everything.<br>This subtly-flavored biscuit represents the accomplishments of decades of top-secret research. The molded design on the chocolate resembles a well-known entrepreneur who gave their all to the ancient path of baking.',
            icon: [26, 10],
            power: 10,
            price: 999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Lombardia cookies',
            desc: 'These come from those farms with the really good memory.',
            icon: [23, 13],
            require: 'Box of brand biscuits',
            power: 3,
            price: 999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Bastenaken cookies',
            desc: 'French cookies made of delicious cinnamon and candy sugar. These do not contain Nuts!',
            icon: [24, 13],
            require: 'Box of brand biscuits',
            power: 3,
            price: 999999999999999999999 * 5
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Pecan sandies',
            desc: 'Stick a nut on a cookie and call it a day! Name your band after it! Whatever!',
            icon: [25, 13],
            power: 4,
            price: 999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Moravian spice cookies',
            desc: 'Popular for being the world\'s moravianest cookies.',
            icon: [26, 13],
            power: 4,
            price: 9999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Anzac biscuits',
            desc: 'Army biscuits from a bakery down under, containing no eggs but yes oats.',
            icon: [27, 13],
            power: 4,
            price: 9999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Buttercakes',
            desc: 'Glistening with cholesterol, these cookies moistly straddle the line between the legal definition of a cookie and just a straight-up stick of butter.',
            icon: [29, 13],
            power: 4,
            price: 99999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Ice cream sandwiches',
            desc: 'In an alternate universe, "ice cream sandwich" designates an ice cream cone filled with bacon, lettuce, and tomatoes. Maybe some sprinkles too.',
            icon: [28, 13],
            power: 4,
            price: 99999999999999999999999999 * 5
        });

        new Game.Upgrade(
            'Stevia Caelestis',
            loc('Sugar lumps ripen <b>%1</b> sooner.', Game.sayTime(60 * 60 * Game.fps)) +
            '<q>A plant of supernatural sweetness grown by angels in heavenly gardens.</q>',
            100000000,
            [25, 15]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Wrinkly cookies'];
        new Game.Upgrade(
            'Diabetica Daemonicus',
            loc('Sugar lumps mature <b>%1</b> sooner.', Game.sayTime(60 * 60 * Game.fps)) +
            '<q>A malevolent, if delicious herb that is said to grow on the cliffs of the darkest abyss of the underworld.</q>',
            300000000,
            [26, 15]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Stevia Caelestis', 'Lucifer'];
        new Game.Upgrade(
            'Sucralosia Inutilis',
            loc('Bifurcated sugar lumps appear <b>%1% more often</b> and are <b>%2% more likely</b> to drop 2 lumps.', [5, 5]) +
            '<q>A rare berry of uninteresting flavor that is as elusive as its uses are limited; only sought-after by the most avid collectors with too much wealth on their hands.</q>',
            1000000000,
            [27, 15]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Diabetica Daemonicus'];

        new Game.Upgrade(
            'Lucky digit',
            loc('<b>+%1%</b> prestige level effect on CpS.<br><b>+%2%</b> golden cookie effect duration.<br><b>+%3%</b> golden cookie lifespan.', [1, 1, 1]) +
            '<q>This upgrade is a bit shy and only appears when your prestige level contains a 7.</q>',
            777,
            [24, 15]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly luck'];
        Game.last.showIf = function () {
            return Math.ceil((Game.prestige + '').split('7').length - 1) >= 1;
        };
        new Game.Upgrade(
            'Lucky number',
            loc('<b>+%1%</b> prestige level effect on CpS.<br><b>+%2%</b> golden cookie effect duration.<br><b>+%3%</b> golden cookie lifespan.', [1, 1, 1]) +
            '<q>This upgrade is a reclusive hermit and only appears when your prestige level contains two 7\'s.</q>',
            77777,
            [24, 15]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Lucky digit', 'Lasting fortune'];
        Game.last.showIf = function () {
            return Math.ceil((Game.prestige + '').split('7').length - 1) >= 2;
        };
        new Game.Upgrade(
            'Lucky payout',
            loc('<b>+%1%</b> prestige level effect on CpS.<br><b>+%2%</b> golden cookie effect duration.<br><b>+%3%</b> golden cookie lifespan.', [1, 1, 1]) +
            '<q>This upgrade took an oath of complete seclusion from the rest of the world and only appears when your prestige level contains four 7\'s.</q>',
            77777777,
            [24, 15]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Lucky number', 'Decisive fate'];
        Game.last.showIf = function () {
            return Math.ceil((Game.prestige + '').split('7').length - 1) >= 4;
        };

        order = 50000;
        new Game.Upgrade('Background selector', loc('Lets you pick which wallpaper to display.'), 0, [29, 5]);
        Game.last.descFunc = function () {
            let choice = this.choicesFunction()[Game.bgType];
            if (choice == 0) choice = this.choicesFunction()[0];
            return (
                '<div style="text-align:center;">' +
                loc('Current:') +
                ' ' +
                tinyIcon(choice.icon) +
                ' <b>' +
                choice.name +
                '</b></div><div class="line"></div>' +
                this.ddesc
            );
        };

        Game.last.pool = 'toggle';
        Game.last.choicesFunction = function () {
            /** 
             * @type {({ name: string, icon: number[], order: number, div?: boolean, selected?: number; } | 0)[]}
             */
            const choices = [];
            let i = 0;
            for (const bg of Game.BGsByChoice) {
                choices[Number(i)] = {
                    name: bg.name,
                    icon: bg.icon,
                    order: bg.order || i,
                    div: undefined,
                    selected: undefined
                };
                i++;
            }

            const choice13 = choices[13];
            if (choice13) choice13.div = true;

            for (let i = 0; i < choices.length; i++) {
                const it = choices[i];
                if (it && it.order >= 4.9 && !Game.Has('Distinguished wallpaper assortment')) choices[i] = 0;
            }
            const choiceSelected = choices[Game.bgType];
            if (choiceSelected) choiceSelected.selected = 1;
            return choices;
        };
        Game.last.choicesPick = function (/** @type {number} */ id) {
            Game.bgType = id;
        };

        for (let i = 0; i < Game.AllBGs.length; i++) {
            Game.BGsByChoice[i] = Game.AllBGs[i];
        }
        if (!EN) {
            Game.BGsByChoice[0].name = String(loc(Game.BGsByChoice[0].name));
            for (let i = 1; i < Game.BGsByChoice.length; i++) {
                Game.BGsByChoice[i].name = '"' + Game.BGsByChoice[i].pic + '"';
            }
        }

        order = 255;
        Game.GrandmaSynergy('Lucky grandmas', 'A fortunate grandma that always seems to find more cookies.', 'Chancemaker');

        order = 1200;
        Game.TieredUpgrade(
            'Your lucky cookie',
            '<q>This is the first cookie you\'ve ever baked. It holds a deep sentimental value and, after all this time, an interesting smell.</q>',
            'Chancemaker',
            1
        );
        Game.TieredUpgrade(
            '"All Bets Are Off" magic coin',
            '<q>A coin that always lands on the other side when flipped. Not heads, not tails, not the edge. The <i>other side</i>.</q>',
            'Chancemaker',
            2
        );
        Game.TieredUpgrade('Winning lottery ticket', '<q>What lottery? THE lottery, that\'s what lottery! Only lottery that matters!</q>', 'Chancemaker', 3);
        Game.TieredUpgrade('Four-leaf clover field', '<q>No giant monsters here, just a whole lot of lucky grass.</q>', 'Chancemaker', 4);
        Game.TieredUpgrade('A recipe book about books', '<q>Tip the scales in your favor with 28 creative new ways to cook the books.</q>', 'Chancemaker', 5);
        Game.TieredUpgrade(
            'Leprechaun village',
            '<q>You\'ve finally become accepted among the local leprechauns, who lend you their mythical luck as a sign of friendship (as well as some rather foul-tasting tea).</q>',
            'Chancemaker',
            6
        );
        Game.TieredUpgrade(
            'Improbability drive',
            '<q>A strange engine that turns statistics on their head. Recommended by the Grandmother\'s Guide to the Bakery.</q>',
            'Chancemaker',
            7
        );
        Game.TieredUpgrade(
            'Antisuperstistronics',
            '<q>An exciting new field of research that makes unlucky things lucky. No mirror unbroken, no ladder unwalked under!</q>',
            'Chancemaker',
            8
        );

        order = 5000;
        Game.SynergyUpgrade(
            'Gemmed talismans',
            '<q>Good-luck charms covered in ancient and excruciatingly rare crystals. A must have for job interviews!</q>',
            'Chancemaker',
            'Mine',
            'synergy1'
        );

        order = 20000;
        new Game.Upgrade(
            'Kitten consultants',
            strKittenDesc + '<q>glad to be overpaid to work with you, sir</q>',
            900000000000000000000000000000000,
            Game.GetIcon('Kitten', 9)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 9, 18);

        order = 99999;
        let years = Math.floor((Date.now() - +new Date(2013, 7, 8)) / (1000 * 60 * 60 * 24 * 365));
        // only updates on page load
        // may behave strangely on leap years
        Game.NewUpgradeCookie({
            name: 'Birthday cookie',
            desc: '<q>-</q>',
            icon: [22, 13],
            power: years,
            price: 99999999999999999999999999999
        });
        Game.last.baseDesc =
            loc('Cookie production multiplier <b>+%1%</b> for every year Cookie Clicker has existed (currently: <b>+%2%</b>).', [1, Beautify(years)]) +
            '<q>Thank you for playing Cookie Clicker!<br>-Orteil</q>';

        order = 150;
        new Game.Upgrade(
            'Armythril mouse',
            getStrClickingGains(1) +
            '<q>This one takes about 53 people to push it around and another 48 to jump down on the button and trigger a click. You could say it\'s got some heft to it.</q>',
            50000000000000000000000,
            [11, 19]
        );
        Game.MakeTiered(Game.last, 10, 11);

        order = 200;
        Game.TieredUpgrade('Reverse dementia', '<q>Extremely unsettling, and somehow even worse than the regular kind.</q>', 'Grandma', 9);
        order = 300;
        Game.TieredUpgrade(
            'Humane pesticides',
            '<q>Made by people, for people, from people and ready to unleash some righteous scorching pain on those pesky insects that so deserve it.</q>',
            'Farm',
            9
        );
        order = 400;
        Game.TieredUpgrade(
            'Mole people',
            '<q>Engineered from real human beings within your very labs, these sturdy little folks have a knack for finding the tastiest underground minerals in conditions that more expensive machinery probably wouldn\'t survive.</q>',
            'Mine',
            9
        );
        order = 500;
        Game.TieredUpgrade(
            'Machine learning',
            '<q>You figured you might get better productivity if you actually told your workers to learn how to work the machines. Sometimes, it\'s the little things...</q>',
            'Factory',
            9
        );
        order = 525;
        Game.TieredUpgrade(
            'Edible money',
            '<q>It\'s really quite simple; you make all currency too delicious not to eat, solving world hunger and inflation in one fell swoop!</q>',
            'Bank',
            9
        );
        order = 550;
        Game.TieredUpgrade(
            'Sick rap prayers',
            '<q>With their ill beat and radical rhymes, these way-hip religious tunes are sure to get all the youngins who thought they were 2 cool 4 church back on the pews and praying for more! Wicked!</q>',
            'Temple',
            9
        );
        order = 575;
        Game.TieredUpgrade(
            'Deluxe tailored wands',
            '<q>In this age of science, most skillful wand-makers are now long gone; but thankfully - not all those wanders are lost.</q>',
            'Wizard tower',
            9
        );
        order = 600;
        Game.TieredUpgrade(
            'Autopilot',
            '<q>Your ships are now fitted with completely robotic crews! It\'s crazy how much money you save when you don\'t have to compensate the families of those lost in space.</q>',
            'Shipment',
            9
        );
        order = 700;
        Game.TieredUpgrade(
            'The advent of chemistry',
            '<q>You know what? That whole alchemy nonsense was a load of baseless rubbish. Dear god, what were you thinking?</q>',
            'Alchemy lab',
            9
        );
        order = 800;
        Game.TieredUpgrade(
            'The real world',
            '<q>It turns out that our universe is actually the twisted dimension of another, saner plane of reality. Time to hop on over there and loot the place!</q>',
            'Portal',
            9
        );
        order = 900;
        Game.TieredUpgrade(
            'Second seconds',
            '<q>That\'s twice as many seconds in the same amount of time! What a deal! Also, what in god\'s name!</q>',
            'Time machine',
            9
        );
        order = 1000;
        Game.TieredUpgrade(
            'Quantum comb',
            '<q>Quantum entanglement is one of those things that are so annoying to explain that we might honestly be better off without it. This is finally possible thanks to the quantum comb!</q>',
            'Antimatter condenser',
            9
        );
        order = 1100;
        Game.TieredUpgrade(
            'Crystal mirrors',
            '<q>Designed to filter more light back into your prisms, reaching levels of brightness that reality itself had never planned for.</q>',
            'Prism',
            9
        );
        order = 1200;
        Game.TieredUpgrade(
            'Bunnypedes',
            '<q>You\'ve taken to breeding rabbits with hundreds of paws, which makes them intrinsically very lucky and thus a very handy (if very disturbing) pet.</q>',
            'Chancemaker',
            9
        );

        order = 20000;
        new Game.Upgrade(
            'Kitten assistants to the regional manager',
            strKittenDesc + '<q>nothing stresses meowt... except having to seek the approval of my inferiors, sir</q>',
            900000000000000000000000000000000000,
            Game.GetIcon('Kitten', 10)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 10, 18);

        order = 5000;
        Game.SynergyUpgrade('Charm quarks', '<q>They\'re after your lucky quarks!</q>', 'Chancemaker', 'Antimatter condenser', 'synergy2');

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Pink biscuits',
            desc: 'One of the oldest cookies. Traditionally dipped in champagne to soften it, because the French will use any opportunity to drink.',
            icon: [21, 16],
            power: 4,
            price: 999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Whole-grain cookies',
            desc: 'Covered in seeds and other earthy-looking debris. Really going for that "5-second rule" look.',
            icon: [22, 16],
            power: 4,
            price: 999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Candy cookies',
            desc: 'These melt in your hands just a little bit.',
            icon: [23, 16],
            power: 4,
            price: 9999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Big chip cookies',
            desc: 'You are in awe at the size of these chips. Absolute units.',
            icon: [24, 16],
            power: 4,
            price: 9999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'One chip cookies',
            desc: 'You get one.',
            icon: [25, 16],
            power: 1,
            price: 99999999999999999999999999999
        });

        new Game.Upgrade(
            'Sugar baking',
            loc(
                'Each unspent sugar lump (up to %1) gives <b>+%2% CpS</b>.<div class="warning">Note: this means that spending sugar lumps will decrease your CpS until they grow back.</div>',
                [100, 1]
            ) + '<q>To bake with the sugary essence of eons themselves, you must first learn to take your sweet time.</q>',
            200000000,
            [21, 17]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Stevia Caelestis'];
        new Game.Upgrade(
            'Sugar craving',
            loc('Once an ascension, you may use the "Sugar frenzy" switch to <b>triple your CpS</b> for 1 hour, at the cost of <b>1 sugar lump</b>.') +
            '<q>Just a little kick to sweeten the deal.</q>',
            400000000,
            [22, 17]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar baking'];
        new Game.Upgrade(
            'Sugar aging process',
            loc('Each grandma (up to %1) makes sugar lumps ripen <b>%2</b> sooner.', [600, Game.sayTime(6 * Game.fps)]) +
            '<q>Aren\'t they just the sweetest?</q>',
            600000000,
            [23, 17]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar craving', 'Diabetica Daemonicus'];

        order = 40050;
        new Game.Upgrade(
            'Sugar frenzy',
            loc('Activating this will <b>triple your CpS</b> for 1 hour, at the cost of <b>1 sugar lump</b>.') +
            '<br>' +
            loc('May only be used once per ascension.'),
            0,
            [22, 17]
        );
        Game.last.priceLumps = 1;
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 0;
        Game.last.canBuyFunc = function () {
            return Game.lumps >= 1;
        };
        Game.last.clickFunction = Game.spendLump(1, loc('activate the sugar frenzy'), function () {
            Game.Upgrades['Sugar frenzy'].buy(true);
            let buff = Game.gainBuff('sugar frenzy', 60 * 60, 3);
            Game.Notify(loc('Sugar frenzy!'), loc('CpS x%1 for 1 hour!', 3), [29, 14]);
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Sprinkles cookies',
            desc: 'A bit of festive decorating helps hide the fact that this might be one of the blandest cookies you\'ve ever tasted.',
            icon: [21, 14],
            power: 4,
            price: 99999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter blossoms',
            desc: 'Topped with a scrumptious chocolate squirt, which is something we really wish we didn\'t just write.',
            icon: [22, 14],
            power: 4,
            price: 999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'No-bake cookies',
            desc: 'You have no idea how these mysterious oven-less treats came to be or how they hold their shape. You\'re thinking either elephant glue or cold fusion.',
            icon: [21, 15],
            power: 4,
            price: 999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Florentines',
            desc: 'These make up for being the fruitcake of cookies by at least having the decency to feature chocolate.',
            icon: [26, 16],
            power: 4,
            price: 9999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate crinkles',
            desc: 'Non-denominational cookies to celebrate year-round deliciousness, and certainly not Christmas or some other nonsense.',
            icon: [22, 15],
            power: 4,
            price: 9999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Maple cookies',
            desc: 'Made with syrup from a land where milk comes in bags, instead of spontaneously pooling at the bottom of your screen depending on your achievements.',
            icon: [21, 13],
            power: 4,
            price: 99999999999999999999999999999999
        });

        order = 40000;
        new Game.Upgrade(
            'Turbo-charged soil',
            loc('Garden plants grow every second.<br>Garden seeds are free to plant.<br>You can switch soils at any time.') + '<q>It\'s got electrolytes!</q>',
            7,
            [2, 16]
        ); // debug purposes only
        Game.last.buyFunction = function () {
            if (Game.Objects['Farm'].minigameLoaded) {
                ASSERT_NOT_NULL(Game.Objects['Farm'].minigame).computeStepT();
            }
        };
        Game.last.pool = 'debug';

        order = 150;
        new Game.Upgrade(
            'Technobsidian mouse',
            getStrClickingGains(1) + '<q>A highly advanced mouse of a sophisticated design. Only one thing on its mind : to click.</q>',
            5000000000000000000000000,
            [11, 28]
        );
        Game.MakeTiered(Game.last, 11, 11);
        new Game.Upgrade(
            'Plasmarble mouse',
            getStrClickingGains(1) +
            '<q>A shifting blur in the corner of your eye, this mouse can trigger a flurry of clicks when grazed by even the slightest breeze.</q>',
            500000000000000000000000000,
            [11, 30]
        );
        Game.MakeTiered(Game.last, 12, 11);

        order = 20000;
        new Game.Upgrade(
            'Kitten marketeers',
            strKittenDesc + '<q>no such thing as a saturated markit, sir</q>',
            900000000000000000000000000000000000000,
            Game.GetIcon('Kitten', 11)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 11, 18);

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Festivity loops',
            desc: 'These garish biscuits are a perfect fit for children\'s birthday parties or the funerals of strange, eccentric billionaires.',
            icon: [25, 17],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999999999999 * 5
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Persian rice cookies',
            desc: 'Rose water and poppy seeds are the secret ingredients of these small, butter-free cookies.',
            icon: [28, 15],
            power: 4,
            price: 99999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Norwegian cookies',
            desc: 'A flat butter cookie with a sliver of candied cherry on top. It is said that these illustrate the bleakness of scandinavian existentialism.',
            icon: [22, 20],
            power: 4,
            price: 999999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Crispy rice cookies',
            desc: 'Fun to make at home! Store-bought cookies are obsolete! Topple the system! There\'s marshmallows in these! Destroy capitalism!',
            icon: [23, 20],
            power: 4,
            price: 999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Ube cookies',
            desc: 'The tint is obtained by the use of purple yams. According to color symbolism, these cookies are either noble, holy, or supervillains.',
            icon: [24, 17],
            power: 4,
            price: 9999999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Butterscotch cookies',
            desc: 'The butterscotch chips are just the right amount of sticky, and make you feel like you\'re eating candy.',
            icon: [24, 20],
            power: 4,
            price: 9999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Speculaas',
            desc: 'These crunchy, almost obnoxiously cinnamony cookies are a source of dutch pride. About the origin of the name, one can only speculate.',
            icon: [21, 20],
            power: 4,
            price: 99999999999999999999999999999999999
        });

        order = 10200;
        Game.NewUpgradeCookie({
            name: 'Elderwort biscuits',
            desc: '-',
            icon: [22, 25],
            power: 2,
            price: 60 * 2,
            locked: 1
        });
        Game.last.baseDesc =
            getStrCookieProductionMultiplierPlus(2) +
            '<br>' +
            loc('%1 are <b>%2%</b> more powerful.', [cap(Game.Objects['Grandma'].plural), 2]) +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Elderwort').toLowerCase()) +
            '<q>They taste incredibly stale, even when baked fresh.</q>';
        Game.NewUpgradeCookie({
            name: 'Bakeberry cookies',
            desc: '-',
            icon: [23, 25],
            power: 2,
            price: 60,
            locked: 1
        });
        Game.last.baseDesc =
            getStrCookieProductionMultiplierPlus(2) +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Bakeberry').toLowerCase()) +
            '<q>Really good dipped in hot chocolate.</q>';
        Game.NewUpgradeCookie({
            name: 'Duketater cookies',
            desc: '-',
            icon: [24, 25],
            power: 10,
            price: 60 * 3,
            locked: 1
        });
        Game.last.baseDesc =
            getStrCookieProductionMultiplierPlus(10) +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Duketater').toLowerCase()) +
            '<q>Fragrant and mealy, with a slight yellow aftertaste.</q>';
        Game.NewUpgradeCookie({
            name: 'Green yeast digestives',
            desc: '-',
            icon: [25, 25],
            power: 0,
            price: 60 * 3,
            locked: 1
        });
        Game.last.baseDesc =
            loc('Golden cookies give <b>%1%</b> more cookies.', 1) +
            '<br>' +
            loc('Golden cookie effects last <b>%1%</b> longer.', 1) +
            '<br>' +
            loc('Golden cookies appear <b>%1%</b> more often.', 1) +
            '<br>' +
            loc('Random drops are <b>%1% more common</b>.', 3) +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Green rot').toLowerCase()) +
            '<q>These are tastier than you\'d expect, but not by much.</q>';

        order = 23000;
        new Game.Upgrade(
            'Fern tea',
            loc('You gain another <b>+%1%</b> of your regular CpS while the game is closed.', 3) +
            ' <small>(' +
            loc('Must own the %1 upgrade.', getUpgradeName('Twin Gates of Transcendence')) +
            ')</small>' +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Drowsyfern').toLowerCase()) +
            '<q>A chemically complex natural beverage, this soothing concoction has been used by mathematicians to solve equations in their sleep.</q>',
            60,
            [26, 25]
        );
        new Game.Upgrade(
            'Ichor syrup',
            loc('You gain another <b>+%1%</b> of your regular CpS while the game is closed.', 7) +
            ' <small>(' +
            loc('Must own the %1 upgrade.', getUpgradeName('Twin Gates of Transcendence')) +
            ')</small>' +
            '<br>' +
            loc('Sugar lumps mature <b>%1</b> sooner.', Game.sayTime(7 * 60 * Game.fps)) +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Ichorpuff').toLowerCase()) +
            '<q>Tastes like candy. The smell is another story.</q>',
            60 * 2,
            [27, 25]
        );

        order = 10200;
        Game.NewUpgradeCookie({
            name: 'Wheat slims',
            desc: '-',
            icon: [28, 25],
            power: 1,
            price: 30,
            locked: 1
        });
        Game.last.baseDesc =
            getStrCookieProductionMultiplierPlus(1) +
            '<br>' +
            loc('Dropped by %1 plants.', locStr('Baker\'s wheat').toLowerCase()) +
            '<q>The only reason you\'d consider these to be cookies is because you feel slightly sorry for them.</q>';

        const gardenDrops = [
            'Elderwort biscuits', 'Bakeberry cookies', 'Duketater cookies', 'Green yeast digestives', 'Fern tea', 'Ichor syrup', 'Wheat slims'
        ];
        for (const gardenDrop of gardenDrops) {
            // scale by CpS
            let it = Game.Upgrades[gardenDrop];
            it.priceFunc = (function (cost) {
                return function () {
                    return cost * Game.cookiesPs * 60;
                };
            })(it.basePrice);
            it.baseDesc = String(it.baseDesc).replace('<q>', '<br>' + loc('Cost scales with CpS.') + '<q>');
            it.desc = BeautifyInText(String(it.baseDesc));
            it.lasting = true;
        }

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Synthetic chocolate green honey butter biscuit',
            desc: 'Rewarded for owning 350 of everything.<br>The recipe for this butter biscuit was once the sole heritage of an ancient mountain monastery. Its flavor is so refined that only a slab of lab-made chocolate specifically engineered to be completely tasteless could complement it.<br>Also it\'s got your face on it.',
            icon: [24, 26],
            power: 10,
            price: 999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Royal raspberry chocolate butter biscuit',
            desc: 'Rewarded for owning 400 of everything.<br>Once reserved for the megalomaniac elite, this unique strain of fruity chocolate has a flavor and texture unlike any other. Whether its exorbitant worth is improved or lessened by the presence of your likeness on it still remains to be seen.',
            icon: [25, 26],
            power: 10,
            price: 999999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Ultra-concentrated high-energy chocolate butter biscuit',
            desc: 'Rewarded for owning 450 of everything.<br>Infused with the power of several hydrogen bombs through a process that left most nuclear engineers and shareholders perplexed. Currently at the center of some rather heated United Nations meetings. Going in more detail about this chocolate would violate several state secrets, but we\'ll just add that someone\'s bust seems to be pictured on it. Perhaps yours?',
            icon: [26, 26],
            power: 10,
            price: 999999999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        order = 200;
        Game.TieredUpgrade(
            'Timeproof hair dyes',
            '<q>Why do they always have those strange wispy pink dos? What do they know about candy floss that we don\'t?</q>',
            'Grandma',
            10
        );
        order = 300;
        Game.TieredUpgrade('Barnstars', '<q>Ah, yes. These help quite a bit. Somehow.</q>', 'Farm', 10);
        order = 400;
        Game.TieredUpgrade('Mine canaries', '<q>These aren\'t used for anything freaky! The miners just enjoy having a pet or two down there.</q>', 'Mine', 10);
        order = 500;
        Game.TieredUpgrade(
            'Brownie point system',
            '<q>Oh, these are lovely! You can now reward your factory employees for good behavior, such as working overtime or snitching on coworkers. 58 brownie points gets you a little picture of a brownie, and 178 of those pictures gets you an actual brownie piece for you to do with as you please! Infantilizing? Maybe. Oodles of fun? You betcha!</q>',
            'Factory',
            10
        );
        order = 525;
        Game.TieredUpgrade(
            'Grand supercycles',
            '<q>We let the public think these are complicated financial terms when really we\'re just rewarding the bankers with snazzy bicycles for a job well done. It\'s only natural after you built those fancy gold swimming pools for them, where they can take a dip and catch Kondratiev waves.</q>',
            'Bank',
            10
        );
        order = 550;
        Game.TieredUpgrade(
            'Psalm-reading',
            '<q>A theologically dubious and possibly blasphemous blend of fortune-telling and scripture studies.</q>',
            'Temple',
            10
        );
        order = 575;
        Game.TieredUpgrade(
            'Immobile spellcasting',
            '<q>Wizards who master this skill can now cast spells without having to hop and skip and gesticulate embarrassingly, which is much sneakier and honestly quite a relief.</q>',
            'Wizard tower',
            10
        );
        order = 600;
        Game.TieredUpgrade(
            'Restaurants at the end of the universe',
            '<q>Since the universe is spatially infinite, and therefore can be construed to have infinite ends, you\'ve opened an infinite chain of restaurants where your space truckers can rest and partake in some home-brand cookie-based meals.</q>',
            'Shipment',
            10
        );
        order = 700;
        Game.TieredUpgrade(
            'On second thought',
            '<q>Disregard that last upgrade, alchemy is where it\'s at! Your eggheads just found a way to transmute children\'s nightmares into rare metals!</q>',
            'Alchemy lab',
            10
        );
        order = 800;
        Game.TieredUpgrade(
            'Dimensional garbage gulper',
            '<q>So we\'ve been looking for a place to dispose of all the refuse that\'s been accumulating since we started baking - burnt cookies, failed experiments, unruly workers - and well, we figured rather than sell it to poor countries like we\'ve been doing, we could just dump it in some alternate trash dimension where it\'s not gonna bother anybody! Probably!</q>',
            'Portal',
            10
        );
        order = 900;
        Game.TieredUpgrade(
            'Additional clock hands',
            '<q>It seemed like a silly idea at first, but it turns out these have the strange ability to twist time in interesting new ways.</q>',
            'Time machine',
            10
        );
        order = 1000;
        Game.TieredUpgrade(
            'Baking Nobel prize',
            '<q>What better way to sponsor scientific growth than to motivate those smarmy nerds with a meaningless award! What\'s more, each prize comes with a fine print lifelong exclusive contract to come work for you (or else)!</q>',
            'Antimatter condenser',
            10
        );
        order = 1100;
        Game.TieredUpgrade(
            'Reverse theory of light',
            '<q>A whole new world of physics opens up when you decide that antiphotons are real and posit that light is merely a void in shadow.</q>',
            'Prism',
            10
        );
        order = 1200;
        Game.TieredUpgrade(
            'Revised probabilistics',
            '<q>Either something happens or it doesn\'t. That\'s a 50% chance! This suddenly makes a lot of unlikely things very possible.</q>',
            'Chancemaker',
            10
        );

        order = 20000;
        new Game.Upgrade(
            'Kitten analysts',
            strKittenDesc +
            '<q>based on purrent return-on-investment meowdels we should be able to affurd to pay our empawyees somewhere around next century, sir</q>',
            900000000000000000000000000000000000000000,
            Game.GetIcon('Kitten', 12)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 12, 18);

        new Game.Upgrade(
            'Eye of the wrinkler',
            loc('Mouse over a wrinkler to see how many cookies are in its stomach.') +
            '<q>Just a wrinkler and its will to survive.<br>Hangin\' tough, stayin\' hungry.</q>',
            99999999,
            [27, 26]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Wrinkly cookies'];

        new Game.Upgrade(
            'Inspired checklist',
            loc(
                'Unlocks the <b>Buy all</b> feature, which lets you instantly purchase every upgrade in your store (starting from the cheapest one).<br>Also unlocks the <b>Vault</b>, a store section where you can place upgrades you do not wish to auto-buy.'
            ) +
            '<q>Snazzy grandma accessories? Check. Transdimensional abominations? Check. A bunch of eggs for some reason? Check. Machine that goes "ping"? Check and check.</q>',
            900000,
            [28, 26]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Persistent memory', 'Permanent upgrade slot II'];

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Pure pitch-black chocolate butter biscuit',
            desc: 'Rewarded for owning 500 of everything.<br>This chocolate is so pure and so flawless that it has no color of its own, instead taking on the appearance of whatever is around it. You\'re a bit surprised to notice that this one isn\'t stamped with your effigy, as its surface is perfectly smooth (to the picometer) - until you realize it\'s quite literally reflecting your own face like a mirror.',
            icon: [24, 27],
            power: 10,
            price: 999999999999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Chocolate oatmeal cookies',
            desc: 'These bad boys compensate for lack of a cohesive form and a lumpy, unsightly appearance by being just simply delicious. Something we should all aspire to.',
            icon: [23, 28],
            power: 4,
            price: 99999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Molasses cookies',
            desc: 'Sticky, crackly, and dusted in fine sugar.<br>Some lunatics have been known to eat these with potatoes.',
            icon: [24, 28],
            power: 4,
            price: 999999999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Biscotti',
            desc: 'Almonds and pistachios make these very robust cookies slightly more interesting to eat than to bludgeon people with.',
            icon: [22, 28],
            power: 4,
            price: 999999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Waffle cookies',
            desc: 'Whether these are cookies with shockingly waffle-like features or simply regular cookie-sized waffles is a debate we\'re not getting into here.',
            icon: [21, 28],
            power: 4,
            price: 9999999999999999999999999999999999999
        });

        order = 10000;
        // early cookies that unlock at the same time as coconut cookies; meant to boost early game a little bit
        Game.NewUpgradeCookie({
            name: 'Almond cookies',
            desc: 'Sometimes you feel like one of these. Sometimes you don\'t.',
            icon: [21, 27],
            power: 2,
            price: 99999999
        });
        Game.NewUpgradeCookie({
            name: 'Hazelnut cookies',
            desc: 'Tastes like a morning stroll through a fragrant forest, minus the clouds of gnats.',
            icon: [22, 27],
            power: 2,
            price: 99999999
        });
        Game.NewUpgradeCookie({
            name: 'Walnut cookies',
            desc: 'Some experts have pointed to the walnut\'s eerie resemblance to the human brain as a sign of its sentience - a theory most walnuts vehemently object to.',
            icon: [23, 27],
            power: 2,
            price: 99999999
        });

        new Game.Upgrade(
            'Label printer',
            loc(
                'Mouse over an upgrade to see its tier.<br><small>Note: only some upgrades have tiers. Tiers are purely cosmetic and have no effect on gameplay.</small>'
            ) + '<q>Also comes in real handy when you want to tell catsup apart from ketchup.</q>',
            5000000,
            [28, 29]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Genius accounting'];

        order = 200;
        Game.TieredUpgrade(
            'Good manners',
            '<q>Apparently these ladies are much more amiable if you take the time to learn their strange, ancient customs, which seem to involve saying "please" and "thank you" and staring at the sun with bulging eyes while muttering eldritch curses under your breath.</q>',
            'Grandma',
            11
        );
        order = 300;
        Game.TieredUpgrade('Lindworms', '<q>You have to import these from far up north, but they really help aerate the soil!</q>', 'Farm', 11);
        order = 400;
        Game.TieredUpgrade(
            'Bore again',
            '<q>After extracting so much sediment for so long, you\'ve formed some veritable mountains of your own from the accumulated piles of rock and dirt. Time to dig through those and see if you find anything fun!</q>',
            'Mine',
            11
        );
        order = 500;
        Game.TieredUpgrade('"Volunteer" interns', '<q>If you\'re bad at something, always do it for free.</q>', 'Factory', 11);
        order = 525;
        Game.TieredUpgrade('Rules of acquisition', '<q>Rule 387 : a cookie baked is a cookie kept.</q>', 'Bank', 11);
        order = 550;
        Game.TieredUpgrade('War of the gods', '<q>An interesting game; the only winning move is not to pray.</q>', 'Temple', 11);
        order = 575;
        Game.TieredUpgrade(
            'Electricity',
            '<q>Ancient magicks and forbidden hexes shroud this arcane knowledge, whose unfathomable power can mysteriously turn darkness into light and shock an elephant to death.</q>',
            'Wizard tower',
            11
        );
        order = 600;
        Game.TieredUpgrade(
            'Universal alphabet',
            '<q>You\'ve managed to chart a language that can be understood by any sentient species in the galaxy; its exciting vocabulary contains over 56 trillion words that sound and look like sparkly burps, forming intricate sentences that usually translate to something like "give us your cookies, or else".</q>',
            'Shipment',
            11
        );
        order = 700;
        Game.TieredUpgrade(
            'Public betterment',
            '<q>Why do we keep trying to change useless matter into cookies, or cookies into even better cookies? Clearly, the way of the future is to change the people who eat the cookies into people with a greater understanding, appreciation and respect for the cookies they\'re eating. Into the vat you go!</q>',
            'Alchemy lab',
            11
        );
        order = 800;
        Game.TieredUpgrade(
            'Embedded microportals',
            '<q>We\'ve found out that if we bake the portals into the cookies themselves, we can transport people\'s taste buds straight into the taste dimension! Good thing your army of lawyers got rid of the FDA a while ago!</q>',
            'Portal',
            11
        );
        order = 900;
        Game.TieredUpgrade(
            'Nostalgia',
            '<q>Your time machine technicians insist that this is some advanced new time travel tech, and not just an existing emotion universal to mankind. Either way, you have to admit that selling people the same old cookies just because it reminds them of the good old times is an interesting prospect.</q>',
            'Time machine',
            11
        );
        order = 1000;
        Game.TieredUpgrade(
            'The definite molecule',
            '<q>Your scientists have found a way to pack a cookie into one single continuous molecule, opening exciting new prospects in both storage and flavor despite the fact that these take up to a whole year to digest.</q>',
            'Antimatter condenser',
            11
        );
        order = 1100;
        Game.TieredUpgrade(
            'Light capture measures',
            '<q>As the universe gets ever so slightly dimmer due to you converting more and more of its light into cookies, you\'ve taken to finding new and unexplored sources of light for your prisms; for instance, the warm glow emitted by a pregnant woman, or the twinkle in the eye of a hopeful child.</q>',
            'Prism',
            11
        );
        order = 1200;
        Game.TieredUpgrade(
            '0-sided dice',
            '<q>The advent of the 0-sided dice has had unexpected and tumultuous effects on the gambling community, and saw experts around the world calling you both a genius and an imbecile.</q>',
            'Chancemaker',
            11
        );

        new Game.Upgrade(
            'Heralds',
            loc(
                'You now benefit from the boost provided by <b>heralds</b>.<br>Each herald gives you <b>+1% CpS</b>.<br>Look on the purple flag at the top to see how many heralds are active at any given time.'
            ) + '<q>Be excellent to each other.<br>And Patreon, dudes!</q>',
            100,
            [21, 29]
        );
        Game.last.pool = 'prestige';

        order = 255;
        Game.GrandmaSynergy('Metagrandmas', 'A fractal grandma to make more grandmas to make more cookies.', 'Fractal engine');

        order = 1300;
        Game.TieredUpgrade('Metabakeries', '<q>They practically bake themselves!</q>', 'Fractal engine', 1);
        Game.TieredUpgrade(
            'Mandelbrown sugar',
            '<q>A substance that displays useful properties such as fractal sweetness and instant contact lethality.</q>',
            'Fractal engine',
            2
        );
        Game.TieredUpgrade('Fractoids', '<q>Here\'s a frun fract : all in all, these were a terrible idea.</q>', 'Fractal engine', 3);
        Game.TieredUpgrade(
            'Nested universe theory',
            '<q>Asserts that each subatomic particle is host to a whole new universe, and therefore, another limitless quantity of cookies.<br>This somehow stacks with the theory of nanocosmics, because physics.</q>',
            'Fractal engine',
            4
        );
        Game.TieredUpgrade(
            'Menger sponge cake',
            '<q>Frighteningly absorbent thanks to its virtually infinite surface area. Keep it isolated in a dry chamber, never handle it with an open wound, and do not ever let it touch a body of water.</q>',
            'Fractal engine',
            5
        );
        Game.TieredUpgrade(
            'One particularly good-humored cow',
            '<q>This unassuming bovine was excruciatingly expensive and it may seem at first like you were ripped off. On closer inspection however, you notice that its earrings (it\'s wearing earrings) are actually fully functional copies of itself, each of which also wearing their own cow earrings, and so on, infinitely. It appears your dairy concerns will be taken care of for a while, although you\'ll have to put up with the cow\'s annoying snickering.</q>',
            'Fractal engine',
            6
        );
        Game.TieredUpgrade(
            'Chocolate ouroboros',
            '<q>Forever eating its own tail and digesting itself, in a metabolically dubious tale of delicious tragedy.</q>',
            'Fractal engine',
            7
        );
        Game.TieredUpgrade(
            'Nested',
            '<q>Clever self-reference or shameful cross-promotion? This upgrade apparently has the gall to advertise a link to <u>orteil.dashnet.org/nested</u>, in a tooltip you can\'t even click.</q>',
            'Fractal engine',
            8
        );
        Game.TieredUpgrade(
            'Space-filling fibers',
            '<q>This special ingredient has the incredible ability to fill the local space perfectly, effectively eradicating hunger in those who consume it!<br>Knowing that no hunger means no need for cookies, your marketers urge you to repurpose this product into next-level packing peanuts.</q>',
            'Fractal engine',
            9
        );
        Game.TieredUpgrade('Endless book of prose', '', 'Fractal engine', 10);
        if (EN) {
            Game.last.descFunc = function () {
                let str =
                    '"There once was a baker named ' +
                    Game.bakeryName +
                    '. One day, there was a knock at the door; ' +
                    Game.bakeryName +
                    ' opened it and was suddenly face-to-face with a strange and menacing old grandma. The grandma opened her mouth and, in a strange little voice, started reciting this strange little tale : ';
                let n = 35;
                let i = Math.floor(Game.T * 0.1);
                return (
                    this.desc +
                    '<q style="font-family:Courier;">' +
                    (str.slice(i % str.length, (i % str.length) + n) + (i % str.length > str.length - n ? str.slice(0, Math.max(0, (i % str.length) - (str.length - n))) : '')) +
                    '</q>'
                );
            };
        } else Game.last.desc = '<q>-</q>';
        Game.TieredUpgrade('The set of all sets', '<q>The answer, of course, is a definite maybe.</q>', 'Fractal engine', 11);

        order = 5000;
        Game.SynergyUpgrade(
            'Recursive mirrors',
            '<q>Do you have any idea what happens when you point two of these at each other? Apparently, the universe doesn\'t either.</q>',
            'Fractal engine',
            'Prism',
            'synergy1'
        );
        Game.SynergyUpgrade('Mice clicking mice', '', 'Fractal engine', 'Cursor', 'synergy2');
        if (EN) {
            Game.last.descFunc = function () {
                Math.seedrandom(Game.seed + '-blasphemouse');
                if (Math.random() < 0.3) {
                    Math.seedrandom();
                    return this.desc + '<q>Absolutely blasphemouse!</q>';
                }
                else {
                    Math.seedrandom();
                    return this.desc + '<q>Absolutely blasphemous!</q>';
                }
            };
        } else Game.last.desc = '<q>-</q>';

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Custard creams',
            desc: 'British lore pits these in a merciless war against bourbon biscuits.<br>The filling evokes vanilla without quite approaching it.<br>They\'re tastier on the inside!',
            icon: [23, 29],
            power: 4,
            price: 9999999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Bourbon biscuits',
            desc: 'Two chocolate biscuits joined together with even more chocolate.<br>The sworn rivals of custard creams, as legend has it.',
            icon: [24, 29],
            power: 4,
            price: 99999999999999999999999999999999999999
        });

        new Game.Upgrade(
            'Keepsakes',
            loc('Seasonal random drops have a <b>1/5 chance</b> to carry over through ascensions.') + '<q>Cherish the memories.</q>',
            1111111111,
            [22, 29]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starsnow', 'Starlove', 'Starterror', 'Startrade', 'Starspawn'];

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Mini-cookies',
            desc: 'Have you ever noticed how the smaller something is, the easier it is to binge on it?',
            icon: [29, 30],
            power: 5,
            price: 99999999999999999999999999999999999999 * 5
        });

        new Game.Upgrade(
            'Sugar crystal cookies',
            (EN
                ? 'Cookie production multiplier <b>+5% permanently</b>, and <b>+1%</b> for every building type level 10 or higher.'
                : loc('Cookie production multiplier <b>+%1% permanently</b>.', 5) +
                '<br>' +
                loc('Cookie production multiplier <b>+%1%</b> for every building type level %2 or higher.', [1, 10])) +
            '<q>Infused with cosmic sweetness. It gives off a faint shimmery sound when you hold it up to your ear.</q>',
            1000000000,
            [21, 30]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar baking'];
        Game.last.power = function () {
            let n = 5;
            for (let i in Game.Objects) {
                if (Game.Objects[i].level >= 10) n++;
            }
            return n;
        };
        Game.last.pseudoCookie = true;
        Game.last.descFunc = function () {
            let n = 5;
            for (let i in Game.Objects) {
                if (Game.Objects[i].level >= 10) n++;
            }
            return '<div style="text-align:center;">' + loc('Current:') + ' <b>+' + Beautify(n) + '%</b><div class="line"></div></div>' + this.ddesc;
        };
        new Game.Upgrade(
            'Box of maybe cookies',
            loc('Contains an assortment of...something.') + '<q>These may or may not be considered cookies.</q>',
            333000000000,
            [25, 29]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar crystal cookies'];
        new Game.Upgrade(
            'Box of not cookies',
            loc('Contains an assortment of...something.') + '<q>These are strictly, definitely not cookies.</q>',
            333000000000,
            [26, 29]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar crystal cookies'];
        new Game.Upgrade(
            'Box of pastries',
            loc('Contains an assortment of delicious pastries.') + '<q>These are a damn slippery slope is what they are!</q>',
            333000000000,
            [27, 29]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar crystal cookies'];

        order = 10040;
        Game.NewUpgradeCookie({
            name: 'Profiteroles',
            desc: 'Also known as cream puffs, these pastries are light, fluffy, filled with whipped cream and fun to throw at people when snowballs are running scarce.',
            icon: [29, 29],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 31)
        });
        Game.NewUpgradeCookie({
            name: 'Jelly donut',
            desc: 'Guaranteed to contain at least 0.3% jelly filling, or your money back.<br>You can still see the jelly stab wound!',
            icon: [27, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 33)
        });
        Game.NewUpgradeCookie({
            name: 'Glazed donut',
            desc: 'Absolutely gooey with sugar. The hole is the tastiest part!',
            icon: [28, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 35)
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate cake',
            desc: 'The cake is a Portal reference!',
            icon: [25, 27],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 37)
        });
        Game.NewUpgradeCookie({
            name: 'Strawberry cake',
            desc: 'It\'s not easy to come up with flavor text for something as generic as this, but some would say it\'s a piece of cake.',
            icon: [26, 27],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 39)
        });
        Game.NewUpgradeCookie({
            name: 'Apple pie',
            desc: 'It is said that some grandmas go rogue and bake these instead.',
            icon: [25, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 41)
        });
        Game.NewUpgradeCookie({
            name: 'Lemon meringue pie',
            desc: 'Meringue is a finicky substance made of sugar and egg whites that requires specific atmospheric conditions to be baked at all. The lemon, as far as we can tell, isn\'t nearly as picky.',
            icon: [26, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 43)
        });
        Game.NewUpgradeCookie({
            name: 'Butter croissant',
            desc: 'Look around.<br>A rude man in a striped shirt bikes past you. He smells of cigarettes and caf&eacute;-au-lait. Somewhere, a mime uses his moustache to make fun of the British. 300 pigeons fly overhead.<br>Relax. You\'re experiencing croissant.',
            icon: [29, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 45)
        });

        order = 10050;
        Game.NewUpgradeCookie({
            name: 'Cookie dough',
            desc: 'Bursting with infinite potential, but can also be eaten as is. Arguably worth the salmonella.',
            icon: [25, 30],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 35)
        });
        Game.NewUpgradeCookie({
            name: 'Burnt cookie',
            desc: 'This cookie flew too close to the sun and is now a shadow of its former self. If only you remembered to set a timer, you wouldn\'t have this tragedy on your hands...',
            icon: [23, 30],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 37)
        });
        Game.NewUpgradeCookie({
            name: 'A chocolate chip cookie but with the chips picked off for some reason',
            desc: 'This has to be the saddest thing you\'ve ever seen.',
            icon: [24, 30],
            require: 'Box of maybe cookies',
            power: 3,
            price: Math.pow(10, 39)
        });
        Game.NewUpgradeCookie({
            name: 'Flavor text cookie',
            desc: 'What you\'re currently reading is what gives this cookie its inimitable flavor.',
            icon: [22, 30],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 41)
        });
        Game.NewUpgradeCookie({
            name: 'High-definition cookie',
            desc: 'Uncomfortably detailed, like those weird stories your aunt keeps telling at parties.',
            icon: [28, 10],
            require: 'Box of maybe cookies',
            power: 5,
            price: Math.pow(10, 43)
        });

        order = 10060;
        Game.NewUpgradeCookie({
            name: 'Toast',
            desc: 'A crisp slice of bread, begging for some butter and jam.<br>Why do people keep proposing these at parties?',
            icon: [27, 10],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 34)
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter & jelly',
            desc: 'It\'s time.',
            icon: [29, 9],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 36)
        });
        Game.NewUpgradeCookie({
            name: 'Wookies',
            desc: 'These aren\'t the cookies you\'re looking for.',
            icon: [26, 30],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 38)
        });
        Game.NewUpgradeCookie({
            name: 'Cheeseburger',
            desc: 'Absolutely no relation to cookies whatsoever - Orteil just wanted an excuse to draw a cheeseburger.',
            icon: [28, 30],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 40)
        });
        Game.NewUpgradeCookie({
            name: 'One lone chocolate chip',
            desc: 'The start of something beautiful.',
            icon: [27, 30],
            require: 'Box of not cookies',
            power: 1,
            price: Math.pow(10, 42)
        });

        new Game.Upgrade(
            'Genius accounting',
            loc(
                'Unlocks <b>extra price information</b>.<br>Each displayed cost now specifies how long it\'ll take you to afford it, and how much of your bank it represents.'
            ) + '<q>There\'s no accounting for taste, and yet here we are.</q>',
            2000000,
            [11, 10]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Inspired checklist'];

        new Game.Upgrade(
            'Shimmering veil',
            loc(
                'Unlocks the <b>shimmering veil</b>, a switch that passively boosts your CpS by <b>%1%</b>.<br>You start with the veil turned on; however, it is very fragile, and clicking the big cookie or any golden cookie or reindeer will turn it off, requiring %2 of CpS to turn back on.',
                [50, Game.sayTime(24 * 60 * 60 * Game.fps, 2)]
            ) + '<q>Hands off!</q>',
            999999999,
            [9, 10]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Distilled essence of redoubled luck'];

        order = 40005;
        func = function () {
            let boost = Game.getVeilBoost();
            let resist = Game.getVeilDefense();
            return (
                // @ts-expect-error urrgh
                (this.name == 'Shimmering veil [on]' ? '<div style="text-align:center;">' + loc('Active.') + '</div><div class="line"></div>' : '') +
                loc(
                    'Boosts your cookie production by <b>%1%</b> when active.<br>The veil is very fragile and will break if you click the big cookie or any golden cookies or reindeer.<br><br>Once broken, turning the veil back on costs %2 of unbuffed CpS.',
                    [Beautify(boost * 100), Game.sayTime(24 * 60 * 60 * Game.fps, 2)]
                ) +
                (resist > 0 ? '<br><br>' + loc('Has a <b>%1%</b> chance to not break.', Beautify(resist * 100)) : '')
            );
        };
        new Game.Upgrade('Shimmering veil [off]', '', 1000000, [9, 10]);
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Shimmering veil [on]';
        Game.last.priceFunc = function () {
            return Game.unbuffedCps * 60 * 60 * 24;
        };
        Game.last.descFunc = func;
        new Game.Upgrade('Shimmering veil [on]', '', 0, [9, 10]);
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Shimmering veil [off]';
        Game.last.descFunc = func;

        let getCookiePrice = function (/** @type {number} */ level) {
            return 999999999999999999999999999999999999999 * Math.pow(10, (level - 1) / 2);
        };

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Whoopie pies',
            desc: 'Two chocolate halves joined together by a cream filling. It\'s got no eyebrows, but you never noticed until now.',
            icon: [21, 31],
            power: 5,
            price: getCookiePrice(1)
        });
        Game.NewUpgradeCookie({
            name: 'Caramel wafer biscuits',
            desc: 'Coated in delicious chocolate. As many layers as you\'ll get in a biscuit without involving onions.',
            icon: [22, 31],
            power: 5,
            price: getCookiePrice(2)
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate chip mocha cookies',
            desc: 'Mocha started out as an excuse to smuggle chocolate into coffee. And now, in a poignant display of diplomacy and cultural exchange, it\'s bringing coffee to chocolate cookies.',
            icon: [23, 31],
            power: 5,
            price: getCookiePrice(3)
        });
        Game.NewUpgradeCookie({
            name: 'Earl Grey cookies',
            desc: 'Captain Picard\'s favorite.',
            icon: [24, 31],
            power: 5,
            price: getCookiePrice(4)
        });
        Game.NewUpgradeCookie({
            name: 'Corn syrup cookies',
            desc: 'The corn syrup makes it extra chewy. Not the type of stuff you\'d think to put in a cookie, but bakers make do.',
            icon: [25, 31],
            power: 5,
            price: getCookiePrice(5)
        });
        Game.NewUpgradeCookie({
            name: 'Icebox cookies',
            desc: 'Can be prepared in a variety of shapes with a variety of ingredients. Made by freezing dough before baking it, mirroring a time-proven medieval torture practice. Gotta keep them guessing.',
            icon: [26, 31],
            power: 5,
            price: getCookiePrice(6)
        });
        Game.NewUpgradeCookie({
            name: 'Graham crackers',
            desc: 'Inspired in their design by the wish to live a life of austere temperance, free from pleasure or cheer; it\'s no wonder these are so tasty.',
            icon: [27, 31],
            power: 5,
            price: getCookiePrice(7)
        });
        Game.NewUpgradeCookie({
            name: 'Hardtack',
            desc: 'Extremely hard and, if we\'re being honest, extremely tack.<br>If you\'re considering eating this as a fun snack, you probably have other things to worry about than this game, like getting scurvy or your crew fomenting mutiny.',
            icon: [28, 31],
            power: 5,
            price: getCookiePrice(8)
        });
        Game.NewUpgradeCookie({
            name: 'Cornflake cookies',
            desc: 'They\'re grrrrrroovy! Careful not to let it sit in your milk too long, lest you accidentally end up with a bowl of cereal and get confused.',
            icon: [29, 31],
            power: 5,
            price: getCookiePrice(9)
        });
        Game.NewUpgradeCookie({
            name: 'Tofu cookies',
            desc: 'There\'s really two ways to go with tofu cooking; either it asserts itself in plain sight or it camouflages itself in the other ingredients. This happens to be the latter, and as such, you can\'t really tell the difference between this and a regular cookie, save for that one pixel on the left.',
            icon: [30, 31],
            power: 5,
            price: getCookiePrice(10)
        });
        Game.NewUpgradeCookie({
            name: 'Gluten-free cookies',
            desc: 'Made with browned butter and milk to closely match the archetypal chocolate chip cookie.<br>For celiacs, a chance to indulge in a delicious risk-free pastry. For others, a strangely threatening confection whose empty eyes will never know heaven nor hell.',
            icon: [30, 30],
            power: 5,
            price: getCookiePrice(10)
        });
        Game.NewUpgradeCookie({
            name: 'Russian bread cookies',
            desc: 'Also known as alphabet cookies; while most bakers follow the recipe to the letter, it is said that some substitute the flour for spelt. But don\'t take my word for it.',
            icon: [30, 29],
            power: 5,
            price: getCookiePrice(11)
        });
        Game.NewUpgradeCookie({
            name: 'Lebkuchen',
            desc: 'Diverse cookies from Germany, fragrant with honey and spices, often baked around Christmas.<br>Once worn by warriors of old for protection in battle.<br>+5 STR, +20% magic resistance.',
            icon: [30, 28],
            power: 5,
            price: getCookiePrice(12)
        });
        Game.NewUpgradeCookie({
            name: 'Aachener Printen',
            desc: 'The honey once used to sweeten these gingerbread-like treats has since been swapped out for beet sugar, providing another sad example of regressive evolution.',
            icon: [30, 27],
            power: 5,
            price: getCookiePrice(13)
        });
        Game.NewUpgradeCookie({
            name: 'Canistrelli',
            desc: 'A dry biscuit flavored with anise and wine, tough like the people of Corsica where it comes from.',
            icon: [30, 26],
            power: 5,
            price: getCookiePrice(14)
        });
        Game.NewUpgradeCookie({
            name: 'Nice biscuits',
            desc: 'Made with coconut and perfect with tea. Traces its origins to a French city so nice they named it that.',
            icon: [30, 25],
            power: 5,
            price: getCookiePrice(15)
        });
        Game.NewUpgradeCookie({
            name: 'French pure butter cookies',
            desc: 'You can\'t tell what\'s stronger coming off these - the smell of butter or condescension.',
            icon: [31, 25],
            power: 5,
            price: getCookiePrice(16)
        });
        Game.NewUpgradeCookie({
            name: 'Petit beurre',
            desc: 'An unassuming biscuit whose name simply means "little butter". Famed and feared for its four ears and forty-eight teeth.<br>When it hears ya, it\'ll get ya...',
            icon: [31, 26],
            power: 5,
            price: getCookiePrice(16)
        });
        Game.NewUpgradeCookie({
            name: 'Nanaimo bars',
            desc: 'A delicious no-bake pastry hailing from Canada. Probably beats eating straight-up snow with maple syrup poured on it, but what do I know.',
            icon: [31, 27],
            power: 5,
            price: getCookiePrice(17)
        });
        Game.NewUpgradeCookie({
            name: 'Berger cookies',
            desc: 'Messily slathered with chocolate fudge, but one of the most popular bergers of Baltimore, along with the triple fried egg berger and the blue crab cheeseberger.',
            icon: [31, 28],
            power: 5,
            price: getCookiePrice(18)
        });
        Game.NewUpgradeCookie({
            name: 'Chinsuko',
            desc: 'A little piece of Okinawa in cookie form. Part of a Japanese custom of selling sweets as souvenirs. But hey, pressed pennies are cool too.',
            icon: [31, 29],
            power: 5,
            price: getCookiePrice(19)
        });
        Game.NewUpgradeCookie({
            name: 'Panda koala biscuits',
            desc: 'Assorted jungle animals with equally assorted fillings.<br>Comes in chocolate, strawberry, vanilla and green tea.<br>Eat them all before they go extinct!',
            icon: [31, 13],
            power: 5,
            price: getCookiePrice(19)
        });
        Game.NewUpgradeCookie({
            name: 'Putri salju',
            desc: 'A beloved Indonesian pastry; its name means "snow princess", for the powdered sugar it\'s coated with. Had we added these to Cookie Clicker some years ago, this is where we\'d make a reference to that one Disney movie, but it\'s probably time to let it go.',
            icon: [31, 30],
            power: 5,
            price: getCookiePrice(20)
        });
        Game.NewUpgradeCookie({
            name: 'Milk cookies',
            desc: 'Best eaten with a tall glass of chocolate.',
            icon: [31, 31],
            power: 5,
            price: getCookiePrice(21)
        });

        order = 9999;
        Game.NewUpgradeCookie({
            name: 'Cookie crumbs',
            desc: 'There used to be a cookie here. Now there isn\'t.<br>Good heavens, what did you <i>DO?!</i>',
            icon: [30, 13],
            power: 1,
            require: 'Legacy',
            price: 100
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate chip cookie',
            desc: 'This is the cookie you\'ve been clicking this whole time. It looks a bit dented and nibbled on, but it\'s otherwise good as new.',
            icon: [10, 0],
            power: 10,
            require: 'Legacy',
            price: 1000000000000
        });

        new Game.Upgrade(
            'Cosmic beginner\'s luck',
            loc('Prior to purchasing the <b>%1</b> upgrade in a run, random drops are <b>%2 times more common</b>.', [
                getUpgradeName('Heavenly chip secret'),
                5
            ]) + '<q>Oh! A penny!<br>Oh! A priceless heirloom!<br>Oh! Another penny!</q>',
            999999999 * 15,
            [8, 10]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Shimmering veil'];

        new Game.Upgrade(
            'Reinforced membrane',
            loc('The <b>shimmering veil</b> is more resistant, and has a <b>%1% chance</b> not to break. It also gives <b>+%2%</b> more CpS.', [10, 10]) +
            '<q>A consistency between jellyfish and cling wrap.</q>',
            999999999 * 15,
            [7, 10]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Shimmering veil'];

        order = 255;
        Game.GrandmaSynergy(
            'Binary grandmas',
            'A digital grandma to transfer more cookies.<br>(See also : boolean grandmas, string grandmas, and not-a-number grandmas, also known as "NaNs".)',
            'Javascript console'
        );

        order = 1400;
        Game.TieredUpgrade(
            'The JavaScript console for dummies',
            '<q>This should get you started. The first line reads: "To open the javascript console, press-"<br>...the rest of the book is soaked in chocolate milk. If only there was a way to look up this sort of information...</q>',
            'Javascript console',
            1
        );
        Game.TieredUpgrade('64bit arrays', '<q>A long-form variable type to pack your cookies much more efficiently.</q>', 'Javascript console', 2);
        Game.TieredUpgrade(
            'Stack overflow',
            '<q>This is really bad! You probably forgot to close a loop somewhere and now your programs are going crazy! The rest of your engineers seem really excited about it somehow. How could a software mishap like a stack overflow possibly ever help anyone?</q>',
            'Javascript console',
            3
        );
        Game.TieredUpgrade(
            'Enterprise compiler',
            '<q>This bespoke javascript compiler took your team years of development and billions in research, but it should let you execute (certain) functions (up to) 2% faster (in optimal circumstances).</q>',
            'Javascript console',
            4
        );
        Game.TieredUpgrade('Syntactic sugar', '<q>Tastier code for tastier cookies.</q>', 'Javascript console', 5);
        Game.TieredUpgrade(
            'A nice cup of coffee',
            '<q>All this nerd stuff has you exhausted. You make yourself a nice cup of coffee, brewed with roasted beans from some far-away island. You may have been working a bit too hard though - the cup of coffee starts talking to you, insisting that it is NOT javascript.</q>',
            'Javascript console',
            6
        );
        Game.TieredUpgrade(
            'Just-in-time baking',
            '<q>A new method of preparing cookies; they bake themselves right in front of the customers before eating, leaving your kitchens mess-free.</q>',
            'Javascript console',
            7
        );
        Game.TieredUpgrade(
            'cookies++',
            '<q>Your very own cookie-themed programming language, elegantly named after its most interesting ability - increasing the "cookies" variable by 1.</q>',
            'Javascript console',
            8
        );
        Game.TieredUpgrade(
            'Software updates',
            '<q>This is grand news - someone\'s finally figured out the Wifi password, and your newfound internet connection seems to have triggered a whole lot of software updates! Your browsers, drivers and plugins all received a fresh coat of paint, and your javascript version has been updated to the latest ECMAScript specification. It\'s really too bad thousands had to die due to some deprecated function in your neurotoxin ventilation code, but I guess that\'s progress for you.</q>',
            'Javascript console',
            9
        );
        Game.TieredUpgrade(
            'Game.Loop',
            '<q>You\'re not quite sure what to make of this. What does it mean? What does it do? Who would leave something like that just laying around here? Try asking again in 1/30th of a second.</q>',
            'Javascript console',
            10
        );
        Game.TieredUpgrade(
            'eval()',
            '<q>It is said that this simple function holds the key to the universe, and that whosoever masters it may shape reality to their will.<br>Good thing you have no idea how it works. Makes for a neat plaque on your wall, though.</q>',
            'Javascript console',
            11
        );

        order = 5000;
        Game.SynergyUpgrade(
            'Script grannies',
            '<q>Armies of energy drink-fueled grandmas ready to hack into the cyberspace for renegade e-cookies.</q>',
            'Javascript console',
            'Grandma',
            'synergy1'
        );
        Game.SynergyUpgrade('Tombola computing', '', 'Javascript console', 'Chancemaker', 'synergy2');
        if (EN) {
            Game.last.descFunc = function () {
                Math.seedrandom(Game.seed + '-tombolacomputing');
                let str =
                    '(Your ticket reads ' +
                    Math.floor(Math.random() * 100) +
                    ' ' +
                    Math.floor(Math.random() * 100) +
                    ' ' +
                    Math.floor(Math.random() * 100) +
                    ' ' +
                    Math.floor(Math.random() * 100) +
                    ', entitling you to ' +
                    choose([
                        Math.floor(Math.random() * 5 + 2) + ' lines of javascript',
                        'one free use of Math.random()',
                        'one qubit, whatever that is',
                        'one half-eaten cookie',
                        'a brand new vacuum cleaner',
                        'most of one room-temperature cup of orange soda',
                        'one really good sandwich',
                        'one handful of pocket lint',
                        'someone\'s mostly clean hairpiece',
                        'a trip to a fancy restaurant',
                        'the knowledge of those numbers',
                        'a furtive glance at the news ticker',
                        'another ticket, half-price',
                        'all-you-can-eat moldy bread',
                        'one lifetime supply of oxygen',
                        'the color ' + choose(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'gray', 'brown', 'pink', 'teal']),
                        'increased intellect for a limited time',
                        'an ancient runesword',
                        'the throne of a far-away country',
                        'the position of Mafia capo. Good luck',
                        'one free time-travel week-end',
                        'something beautiful',
                        'the deed to some oil well',
                        'one hamburger made out of the animal, plant, or person of your choice',
                        'the last surviving ' + choose(['dodo bird', 'thylacine', 'unicorn', 'dinosaur', 'neanderthal']),
                        'a deep feeling of accomplishment',
                        'a fleeting tinge of entertainment',
                        'a vague sense of unease',
                        'deep existential dread',
                        'one extra week added to your lifespan',
                        'breathe manually',
                        'blink right here and now',
                        'one meeting with any famous person, living or dead, in your next dream',
                        'one very nice dream',
                        'a wacky sound effect',
                        '45 seconds of moral flexibility',
                        'hundreds and thousands, also known as "sprinkles"',
                        'one circle, triangle, square or other simple geometric shape, of average dimensions',
                        'just this extra bit of randomness',
                        'the extra push you needed to turn your life around',
                        'a good fright',
                        'one secret superpower',
                        'a better luck next time',
                        'an irrational phobia of tombola tickets',
                        'one whole spider',
                        'an increased sense of self-worth and determination',
                        'inner peace',
                        'one double-XP week-end in the MMORPG of your choice',
                        'a little piece of the universe, represented by the trillions of atoms that make up this very ticket',
                        'food poisoning',
                        'the Moon! Well, conceptually',
                        'a new car, baby',
                        'a new catchphrase',
                        'an intrusive thought of your choice',
                        '- ...aw man, it just cuts off there',
                        'the director spot for the next big hit movie',
                        'really good-looking calves',
                        'one genuine pirate golden doubloon',
                        '"treasure and riches", or something',
                        'one boat, sunken',
                        'baby shoes, never worn',
                        'direct lineage to some King or Queen',
                        'innate knowledge of a dead language you\'ll never encounter',
                        'the melody of a song you don\'t know the words to',
                        'white noise',
                        'mild physical impairment',
                        'a new pair of lips',
                        'things, and such',
                        'one popular expression bearing your name',
                        'one typo',
                        'one get-out-of-jail-free card',
                        'the rest of your life... for now',
                        'one polite huff',
                        'a condescending stare',
                        'one cursed monkey paw',
                        'true love, probably',
                        'an interesting factoid about the animal, country, TV show or celebrity of your choice',
                        'a pop culture reference',
                        'minutes of fun',
                        'the etymology of the word "tombola" - it\'s Italian for "a tumble"',
                        'nothing. You lost, sorry'
                    ]) +
                    '.)';
                Math.seedrandom();
                return this.desc + '<q>Like quantum computing, but more fun.<br>' + str + '</q>';
            };
        } else Game.last.desc = '<q>-</q>';

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Kruidnoten',
            desc: 'A festive dutch favorite; tiny cinnamony bites sometimes coated in chocolate. The name translates roughly to "kruidnoten".',
            icon: [30, 3],
            power: 5,
            price: getCookiePrice(22)
        });
        Game.NewUpgradeCookie({
            name: 'Marie biscuits',
            desc: 'Pleasantly round, smoothly buttery, subtly vanilla-flavored, ornately embossed, each ridge represents a person Marie killed in prison.',
            icon: [30, 4],
            power: 5,
            price: getCookiePrice(23)
        });
        Game.NewUpgradeCookie({
            name: 'Meringue cookies',
            desc: 'Probably the most exciting thing you can make out of egg whites. Also called forgotten cookies, due to the recipe being once lost in a sealed mystical vault for 10,000 years.',
            icon: [31, 4],
            power: 5,
            price: getCookiePrice(24)
        });

        order = 10060;
        Game.NewUpgradeCookie({
            name: 'Pizza',
            desc: 'What is a pizza if not a large, chewy cookie, frosted with a rather exuberant tomato & cheese icing? Not a cookie, that\'s what.',
            icon: [31, 9],
            require: 'Box of not cookies',
            power: 5,
            price: Math.pow(10, 44)
        });

        order = 10050;
        Game.NewUpgradeCookie({
            name: 'Crackers',
            desc: 'These are the non-flavored kind with no salt added. Really just a judgment-free wheat square begging to have bits of ham and spreadable cheese piled onto it, its main contribution being "crunchy".',
            icon: [30, 9],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 45)
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Havabreaks',
            desc: 'You can snap the sections neatly or just bite into the whole thing like some kind of lunatic. Some oversea countries manufacture these in hundreds of unique flavors, such as green tea, lobster bisque, and dark chocolate.',
            icon: [31, 3],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999999999999999 * 5
        });

        order = 20000;
        new Game.Upgrade(
            'Kitten executives',
            strKittenDesc + '<q>ready to execute whatever and whoever you\'d like, sir</q>',
            900000000000000000000000000000000000000000000,
            Game.GetIcon('Kitten', 13)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 13, 18);

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Chai tea cookies',
            desc: 'Not exactly Captain Picard\'s favorite, but I mean, these will do in a pinch.',
            icon: [23, 32],
            power: 5,
            price: getCookiePrice(4) + 5
        });
        Game.last.order = 10020.5685;

        Game.NewUpgradeCookie({
            name: 'Yogurt cookies',
            desc: 'Augmented by the wonders of dairy, these cookies are light and fluffy and just one more thing for the lactose-intolerant to avoid.<br>Truly for the cultured among us.',
            icon: [24, 32],
            power: 5,
            price: getCookiePrice(25)
        });
        Game.NewUpgradeCookie({
            name: 'Thumbprint cookies',
            desc: 'Filled with jam and sometimes served in little paper cups. No longer admissible as biometric evidence in court. We\'re not having a repeat of that whole mess.',
            icon: [25, 32],
            power: 5,
            price: getCookiePrice(26)
        });
        Game.NewUpgradeCookie({
            name: 'Pizzelle',
            desc: 'Thin, crisp waffle cookies baked in a bespoke iron following an ancient Italian recipe.<br>These cookies have been around for a long, long time.<br>These cookies have seen things.',
            icon: [26, 32],
            power: 5,
            price: getCookiePrice(27)
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Zilla wafers',
            desc: 'Popular vanilla-flavored biscuits that somehow keep ending up in banana pudding.<br>Themed after a beloved radioactive prehistoric monster, for some reason.',
            icon: [22, 32],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Dim Dams',
            desc: 'Two biscuits joined by chocolate and coated in even more chocolate.<br>You wonder - which one is the dim, and which one is the dam?',
            icon: [31, 10],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999999999999999999999 * 5
        });

        order = 10060;
        Game.NewUpgradeCookie({
            name: 'Candy',
            desc: 'There are two pillars to the world of sweets : pastries, of course - and candy.<br>You could make a whole new game just about these, but for now, please enjoy these assorted generic treats.',
            icon: [30, 10],
            require: 'Box of not cookies',
            power: 5,
            price: Math.pow(10, 46)
        });

        order = 19000;
        Game.TieredUpgrade('Fortune #001', '<q>Fingers are not the only thing you can count on.</q>', 'Cursor', 'fortune');
        Game.TieredUpgrade('Fortune #002', '<q>A wrinkle is a crack in a mundane facade.</q>', 'Grandma', 'fortune');
        Game.TieredUpgrade('Fortune #003', '<q>The seeds of tomorrow already lie within the seeds of today.</q>', 'Farm', 'fortune');
        Game.TieredUpgrade('Fortune #004', '<q>Riches from deep under elevate you all the same.</q>', 'Mine', 'fortune');
        Game.TieredUpgrade('Fortune #005', '<q>True worth is not in what you find, but in what you make.</q>', 'Factory', 'fortune');
        Game.TieredUpgrade('Fortune #006', '<q>The value of money means nothing to a pocket.</q>', 'Bank', 'fortune');
        Game.TieredUpgrade('Fortune #007', '<q>Not all guides deserve worship.</q>', 'Temple', 'fortune');
        Game.TieredUpgrade('Fortune #008', '<q>Magic is about two things - showmanship, and rabbits.</q>', 'Wizard tower', 'fortune');
        Game.TieredUpgrade('Fortune #009', '<q>Every mile travelled expands the mind by just as much.</q>', 'Shipment', 'fortune');
        Game.TieredUpgrade('Fortune #010', '<q>Don\'t get used to yourself. You\'re gonna have to change.</q>', 'Alchemy lab', 'fortune');
        Game.TieredUpgrade('Fortune #011', '<q>Every doorway is a gamble. Tread with care.</q>', 'Portal', 'fortune');
        Game.TieredUpgrade('Fortune #012', '<q>Do your future self a favor; they\'ll thank you for it.</q>', 'Time machine', 'fortune');
        Game.TieredUpgrade('Fortune #013', '<q>The world is made of what we put into it.</q>', 'Antimatter condenser', 'fortune');
        Game.TieredUpgrade('Fortune #014', '<q>Staring at a dazzling light can blind you back to darkness.</q>', 'Prism', 'fortune');
        Game.TieredUpgrade('Fortune #015', '<q>Don\'t leave to blind chance what you could accomplish with deaf skill.</q>', 'Chancemaker', 'fortune');
        Game.TieredUpgrade(
            'Fortune #016',
            '<q>It\'s good to see yourself in others. Remember to see yourself in yourself, too.</q>',
            'Fractal engine',
            'fortune'
        );
        Game.TieredUpgrade('Fortune #017', '<q>If things aren\'t working out for you, rewrite the rules.</q>', 'Javascript console', 'fortune');

        order = 19100;
        // note : price for these capped to base price OR 1 day of unbuffed CpS
        new Game.Upgrade(
            'Fortune #100',
            loc('All buildings and upgrades are <b>%1% cheaper</b>.', 1) +
            ' ' +
            loc('Cookie production multiplier <b>+%1%</b>.', 1) +
            '<q>True wealth is counted in gifts.</q>',
            Game.Tiers['fortune'].price * 100000,
            [0, 0]
        );
        Game.MakeTiered(Game.last, 'fortune', 10);
        Game.last.priceFunc = function (/** @type {{ basePrice: number; }} */ me) {
            return Math.min(me.basePrice, Game.unbuffedCps * 60 * 60 * 24);
        };
        new Game.Upgrade(
            'Fortune #101',
            loc('Cookie production multiplier <b>+%1%</b>.', 7) + '<q>Some people dream of fortunes; others dream of cookies.</q>',
            Game.Tiers['fortune'].price * 100000000,
            [0, 0]
        );
        Game.MakeTiered(Game.last, 'fortune', 10);
        Game.last.priceFunc = function (/** @type {{ basePrice: number; }} */ me) {
            return Math.min(me.basePrice, Game.unbuffedCps * 60 * 60 * 24);
        };
        new Game.Upgrade(
            'Fortune #102',
            loc('You gain another <b>+%1%</b> of your regular CpS while the game is closed.', 1) +
            ' <small>(' +
            loc('Must own the %1 upgrade.', getUpgradeName('Twin Gates of Transcendence')) +
            ')</small>' +
            '<q>Help, I\'m trapped in a browser game!</q>',
            Game.Tiers['fortune'].price * 100000000000,
            [0, 0]
        );
        Game.MakeTiered(Game.last, 'fortune', 10);
        Game.last.priceFunc = function (/** @type {{ basePrice: number; }} */ me) {
            return Math.min(me.basePrice, Game.unbuffedCps * 60 * 60 * 24);
        };
        new Game.Upgrade(
            'Fortune #103',
            strKittenDesc + '<q>Don\'t believe the superstitions; all cats are good luck.</q>',
            Game.Tiers['fortune'].price * 100000000000000,
            [0, 0]
        );
        Game.MakeTiered(Game.last, 'fortune', 18);
        Game.last.kitten = 1;
        Game.last.priceFunc = function (/** @type {{ basePrice: number; }} */ me) {
            return Math.min(me.basePrice, Game.unbuffedCps * 60 * 60 * 24);
        };
        new Game.Upgrade('Fortune #104', getStrClickingGains(1) + '<q>Remember to stay in touch.</q>', Game.Tiers['fortune'].price * 100000000000, [0, 0]);
        Game.MakeTiered(Game.last, 'fortune', 11);
        Game.last.priceFunc = function (/** @type {{ basePrice: number; }} */ me) {
            return Math.min(me.basePrice, Game.unbuffedCps * 60 * 60 * 24);
        };

        new Game.Upgrade(
            'Fortune cookies',
            loc('The news ticker may occasionally have <b>fortunes</b>, which may be clicked for something good.') +
            '<q>These don\'t taste all that great but that\'s not really the point, is it?</q>',
            77777777777,
            [29, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Distilled essence of redoubled luck'];

        order = 40000;
        new Game.Upgrade('A really good guide book', '<b>???</b><q>??????</q>', 7, [22, 12]); // debug purposes only
        Game.last.buyFunction = function () {
            if (Game.Objects['Factory'].minigameLoaded) {
                ASSERT_NOT_NULL(Game.Objects['Factory'].minigame).computeMapBounds();
                ASSERT_NOT_NULL(Game.Objects['Factory'].minigame).updateLocStyles();
            }
        };
        Game.last.pool = 'debug';

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Prism heart biscuits',
            desc: 'An every-flavor biscuit that stands for universal love and being true to yourself.',
            require: 'Eternal heart biscuits',
            season: 'valentines',
            icon: [30, 8],
            power: heartPower,
            price: 1000000000000000000000000
        });
        Game.last.order = 10300.175;

        order = 19100;
        new Game.Upgrade(
            'Kitten wages',
            loc('Through clever accounting, this actually makes kitten upgrades <b>%1% cheaper</b>.', 10) +
            '<q>Cats can have little a salary, as a treat.<br>Cats are expert hagglers and have a keen sense of bargaining, especially in the case of cash.</q>',
            9000000000,
            [31, 8]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Kitten angels'];
        Game.last.kitten = 1;
        new Game.Upgrade(
            'Pet the dragon',
            loc('Unlocks the ability to <b>pet your dragon</b> by clicking on it once hatched.') +
            '<q>Dragons do not purr. If your dragon starts purring, vacate the area immediately.</q>',
            99999999999,
            [30, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['How to bake your dragon', 'Residual luck'];

        order = 25100;
        let dragonDropUpgradeCost = function (/** @type {any} */ me) {
            return Game.unbuffedCps * 60 * 30 * (Game.dragonLevel < Game.dragonLevels.length - 1 ? 1 : 0.1);
        };
        new Game.Upgrade(
            'Dragon scale',
            getStrCookieProductionMultiplierPlus(3) +
            '<br>' +
            loc('Cost scales with CpS, but %1 times cheaper with a fully-trained dragon.', 10) +
            '<q>Your dragon sheds these regularly, so this one probably won\'t be missed.<br>Note: icon not to scale.</q>',
            999,
            [30, 14]
        );
        Game.last.priceFunc = dragonDropUpgradeCost;
        new Game.Upgrade(
            'Dragon claw',
            loc('Clicking is <b>%1%</b> more powerful.', 3) +
            '<br>' +
            loc('Cost scales with CpS, but %1 times cheaper with a fully-trained dragon.', 10) +
            '<q>Will grow back in a few days\' time.<br>A six-inch retractable claw, like a razor, from the middle toe. So you know, try to show a little respect.</q>',
            999,
            [31, 14]
        );
        Game.last.priceFunc = dragonDropUpgradeCost;
        new Game.Upgrade(
            'Dragon fang',
            loc('Golden cookies give <b>%1%</b> more cookies.', 3) +
            '<br>' +
            loc('Dragon harvest and Dragonflight are <b>%1% stronger</b>.', 10) +
            '<br>' +
            loc('Cost scales with CpS, but %1 times cheaper with a fully-trained dragon.', 10) +
            '<q>Just a fallen baby tooth your dragon wanted you to have, as a gift.<br>It might be smaller than an adult tooth, but it\'s still frighteningly sharp - and displays some awe-inspiring cavities, which you might expect from a creature made out of sweets.</q>',
            999,
            [30, 15]
        );
        Game.last.priceFunc = dragonDropUpgradeCost;
        new Game.Upgrade(
            'Dragon teddy bear',
            loc('Random drops are <b>%1% more common</b>.', 3) +
            '<br>' +
            loc('Cost scales with CpS, but %1 times cheaper with a fully-trained dragon.', 10) +
            '<q>Your dragon used to sleep with this, but it\'s yours now.<br>Crafted in the likeliness of a fearsome beast. Stuffed with magical herbs picked long ago by a wandering wizard. Woven from elven yarn and a polyester blend.</q>',
            999,
            [31, 15]
        );
        Game.last.priceFunc = dragonDropUpgradeCost;

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Granola cookies',
            desc: 'Wait! These are just oatmeal cookies mixed with raisin cookies! What next, half-dark chocolate half-white chocolate cookies?',
            icon: [28, 32],
            power: 5,
            price: getCookiePrice(28)
        });
        Game.NewUpgradeCookie({
            name: 'Ricotta cookies',
            desc: 'Light and cake-like. Often flavored with lemon or almond extract. Sprinkles optional. Allegedly Italian. Investigation pending.',
            icon: [29, 32],
            power: 5,
            price: getCookiePrice(29)
        });
        Game.NewUpgradeCookie({
            name: 'Roze koeken',
            desc: 'The icing on these Dutch cookies is traditionally pink, but different colors may be used for special occasions - such as pink to celebrate Breast Cancer Awareness Month, or for International Flamingo Day, pink.',
            icon: [30, 32],
            power: 5,
            price: getCookiePrice(30)
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter cup cookies',
            desc: 'What more poignant example of modern societal struggles than the brazen reclaiming of a corporate product by integrating it in the vastly more authentic shell of a homemade undertaking? Anyway this is a peanut butter cup, baked into a cookie. It\'s pretty good!',
            icon: [31, 32],
            power: 5,
            price: getCookiePrice(31)
        });
        Game.NewUpgradeCookie({
            name: 'Sesame cookies',
            desc: 'Look at all the little seeds on these! It\'s like someone dropped them on the street or something! A very welcoming and educational street!',
            icon: [22, 33],
            power: 5,
            price: getCookiePrice(32)
        });
        Game.NewUpgradeCookie({
            name: 'Taiyaki',
            desc: 'A pastry fish filled with red bean paste, doomed to live an existence of constant and excruciating pain as its aquatic environment slowly dissolves its soft doughy body.<br>Also comes in chocolate flavor!',
            icon: [23, 33],
            power: 5,
            price: getCookiePrice(33)
        });
        Game.NewUpgradeCookie({
            name: 'Vanillekipferl',
            desc: 'Nut-based cookies from Central Europe, coated in powdered vanilla sugar. Regular kipferl, crescent-shaped bread rolls from the same region, are much less exciting.',
            icon: [24, 33],
            power: 5,
            price: getCookiePrice(34)
        });

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Cosmic chocolate butter biscuit',
            desc: 'Rewarded for owning 550 of everything.<br>Through some strange trick of magic or technology, looking at this cookie is like peering into a deep ocean of ancient stars. The origins of this biscuit are unknown; its manufacture, as far as your best investigators can tell, left no paper trail. From a certain angle, if you squint hard enough, you\'ll notice that a number of stars near the center are arranged to resemble the outline of your own face.',
            icon: [27, 32],
            power: 10,
            price: 999999999999999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        order = 100;
        new Game.Upgrade(
            'Nonillion fingers',
            getStrThousandFingersGain(20) + '<q>Only for the freakiest handshakes.</q>',
            10000000000000000000000000,
            [12, 31]
        );
        Game.MakeTiered(Game.last, 13, 0);
        order = 150;
        new Game.Upgrade(
            'Miraculite mouse',
            getStrClickingGains(1) +
            '<q>Composed of a material that neither science nor philosophy are equipped to conceptualize. And boy, does it ever click.</q>',
            50000000000000000000000000000,
            [11, 31]
        );
        Game.MakeTiered(Game.last, 13, 11);
        order = 200;
        Game.TieredUpgrade(
            'Generation degeneration',
            '<q>Genetic testing shows that most of your grandmas are infected with a strange degenerative disease that only seems to further their powers; the more time passes, the older they get. This should concern you.</q>',
            'Grandma',
            12
        );
        order = 300;
        Game.TieredUpgrade(
            'Global seed vault',
            '<q>An enormous genetic repository that could outlive an apocalypse. Guarantees the survival of your empire, or at the very least its agricultural components, should civilization fall. Which should be any day now.</q>',
            'Farm',
            12
        );
        order = 400;
        Game.TieredUpgrade(
            'Air mining',
            '<q>You\'ve dug your drills through just about every solid surface you could find. But did you know recent advances have revealed untold riches hiding within non-solid surfaces too?</q>',
            'Mine',
            12
        );
        order = 500;
        Game.TieredUpgrade(
            'Behavioral reframing',
            '<q>Through careful social engineering you\'ve convinced your workers that "union" is a slur that only the most vile and repugnant filth among us would ever dare utter! Sometimes progress isn\'t in the big machines, it\'s in the little lies!</q>',
            'Factory',
            12
        );
        order = 525;
        Game.TieredUpgrade(
            'Altruistic loop',
            '<q>You control so many branches of the global economy and legislative bodies that, through a particularly creative loophole, donating money (to yourself) grants you even more cash in tax deductions than you started with!</q>',
            'Bank',
            12
        );
        order = 550;
        Game.TieredUpgrade('A novel idea', '<q>You don\'t get rich starting a religion. If you want to get rich, you write science fiction.</q>', 'Temple', 12);
        order = 575;
        Game.TieredUpgrade(
            'Spelling bees',
            '<q>You\'ve unleashed a swarm of magically-enhanced bees upon mankind! Their stinging spells may be the bane of all living things but you\'re certain you can put their delicious, purple, fizzy honey to good use!</q>',
            'Wizard tower',
            12
        );
        order = 600;
        Game.TieredUpgrade(
            'Toroid universe',
            '<q>If you think of the universe as an nth-dimensional torus that wraps back on itself in every direction, you can save a fortune on rocket fuel! Of course the universe isn\'t actually shaped like that, but you\'ve never let details stand in your way.</q>',
            'Shipment',
            12
        );
        order = 700;
        Game.TieredUpgrade(
            'Hermetic reconciliation',
            '<q>It\'s time for modern science and the mystical domains of the occult to work together at last. What do gravitons transmute into? What if alkahest is pH-neutral? Should a homunculus have the right to vote? And other exciting questions coming to you soon, whether you like it or not.</q>',
            'Alchemy lab',
            12
        );
        order = 800;
        Game.TieredUpgrade(
            'His advent',
            '<q>He comes! He comes at last! Just like the prophecies foretold! And as He steps out of the portal, your engineers begin slicing Him into convenient chunks before transporting His writhing cosmic flesh to your factories, where He will be processed and converted into a new and exciting cookie flavor, available in stores tomorrow.</q>',
            'Portal',
            12
        );
        order = 900;
        Game.TieredUpgrade(
            'Split seconds',
            '<q>Time is infinite, yes... But what if, nestled within each second, were even more infinities? Every moment an eternity! Think of how many scheduling troubles this solves!</q>',
            'Time machine',
            12
        );
        order = 1000;
        Game.TieredUpgrade(
            'Flavor itself',
            '<q>Deep under the earth, in the most sterile laboratory, in the most vast and expensive particle accelerator ever devised, your scientists have synthesized -for a fraction of a second- the physical manifestation of pure flavor. Highly unstable, and gone in a puff of radioactive energy, it nonetheless left your team shivering with awe... and hunger.</q>',
            'Antimatter condenser',
            12
        );
        order = 1100;
        Game.TieredUpgrade(
            'Light speed limit',
            '<q>Whoah, slow down. Harvesting light is well and good but it\'d be much easier if it weren\'t so dang fast! This should thankfully take care of that.</q>',
            'Prism',
            12
        );
        order = 1200;
        Game.TieredUpgrade(
            'A touch of determinism',
            '<q>By knowing the exact position and movement of every particle in the universe, you\'re able to predict everything that can ever happen, leaving nothing to chance. This was a doozy to pull off mind you, but it\'s helped you win 50 bucks at the horse races so you could say it\'s already paying off.</q>',
            'Chancemaker',
            12
        );
        order = 1300;
        Game.TieredUpgrade(
            'This upgrade',
            '<q>This upgrade\'s flavor text likes to refer to itself, as well as to the fact that it likes to refer to itself. You should really buy this upgrade before it starts doing anything more obnoxious.</q>',
            'Fractal engine',
            12
        );
        order = 1400;
        Game.TieredUpgrade(
            'Your biggest fans',
            '<q>Let\'s face it, baking cookies isn\'t the most optimized thing there is. So you\'ve purchased your biggest fans yet and stuck them next to your computers to keep things chill and in working order. Cool!</q>',
            'Javascript console',
            12
        );

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Battenberg biscuits',
            desc: 'Inspired by a cake of the same name, itself named after a prince of the same name. You suppose you could play a really, really short game of chess on these.',
            icon: [28, 33],
            power: 5,
            price: getCookiePrice(35)
        });
        Game.NewUpgradeCookie({
            name: 'Rosette cookies',
            desc: 'Intricate fried pastries from Northern Europe, made using specialized irons and dipped in icing sugar. While usually eaten as a delicious treat, these are often also used as Christmas tree decorations, or worn elegantly on one\'s lapel to symbolize the nah I\'m just messing with you.',
            icon: [26, 33],
            power: 5,
            price: getCookiePrice(36)
        });
        Game.NewUpgradeCookie({
            name: 'Gangmakers',
            desc: 'The little bit of raspberry jam at its center is crucial; a plain butter cookie with chocolate topping does not a gangmaker make.',
            icon: [27, 33],
            power: 5,
            price: getCookiePrice(37)
        });
        Game.NewUpgradeCookie({
            name: 'Welsh cookies',
            desc: 'Welsh cookies, also known as Welsh cakes, bakestones, griddle cakes, griddle scones, or pics, or in Welsh: <i>picau ar y maen, pice bach, cacennau cri</i> or <i>teisennau gradell</i>, are rich currant-filled scone-like biscuits of uncertain origin.',
            icon: [29, 33],
            power: 5,
            price: getCookiePrice(38)
        });
        Game.NewUpgradeCookie({
            name: 'Raspberry cheesecake cookies',
            desc: 'The humble raspberry cheesecake, now in ascended cookie form. Researchers posit that raspberry cheesecake cookies are evidence that the final form of every baked good, through convergent evolution, approaches that of a cookie, in a process known as cookienisation.',
            icon: [25, 33],
            power: 5,
            price: getCookiePrice(39)
        });

        order = 255;
        Game.GrandmaSynergy('Alternate grandmas', 'A different grandma to bake something else.', 'Idleverse');

        order = 1500;
        Game.TieredUpgrade(
            'Manifest destiny',
            '<q>While the ethics of ransacking parallel universes for their riches may seem questionable to some, you\'ve reasoned that bringing the good word of your cookie empire to the unwashed confines of other realities is your moral duty, nay, your righteous imperative, and must be undertaken as soon as possible, lest they do it to you first!</q>',
            'Idleverse',
            1
        );
        Game.TieredUpgrade(
            'The multiverse in a nutshell',
            '<q>The structure of the metacosmos may seem confusing and at times even contradictory, but here\'s what you\'ve gathered so far:<br><br><div style="text-align:left;">&bull; each reality, or "idleverse", exists in parallel to all others<br><br>&bull; most realities seem to converge towards the production of a sole type of item (ours evidently being, thanks to you, cookies)<br><br>&bull; each reality is riddled with chaotic tunnels to a number of subordinate dimensions (such as the so-called "cookieverse"), much like swiss cheese<br><br>&bull; all realities bathe in an infinite liquid of peculiar properties, colloquially known as "milk"</div><br>Finally, each reality may have its own interpretation of the concept of "reality", for added fun.</q>',
            'Idleverse',
            2
        );
        Game.TieredUpgrade(
            'All-conversion',
            '<q>It\'s quite nice that you can rewire the logic of each universe to generate cookies instead, but you still end up with parsec-loads of whatever they were producing before - baubles you\'ve long made obsolete: cash money, gems, cheeseburgers, puppies... That\'s why you\'ve designed the universal converter, compatible with any substance and capable of turning those useless spoils of conquest into the reassuring crumbly rustle of even more cookies.</q>',
            'Idleverse',
            3
        );
        Game.TieredUpgrade(
            'Multiverse agents',
            '<q>You can send undercover spies to infiltrate each universe and have them signal you whether it\'s worth overtaking. Once the assimilation process started, they will also help pacify the local populations, having established trust through the use of wacky, but seamless, disguises.</q>',
            'Idleverse',
            4
        );
        Game.TieredUpgrade(
            'Escape plan',
            '<q>You\'ve set an idleverse aside and terraformed it to closely resemble this one in case something goes horribly wrong in here. Of course, the denizens of that idleverse also have their own escape idleverse to abscond to in the eventuality of your arrival, itself likely having its own contingency idleverse, and so on.</q>',
            'Idleverse',
            5
        );
        Game.TieredUpgrade(
            'Game design',
            '<q>Each idleverse functions according to some form of transcendental programming, that much is a given. But they also seem to be governed by much more subtle rules, the logic of which, when harnessed, may give you unparalleled dominion over the multiverse. Rewrite the rules! A game designer is you!</q>',
            'Idleverse',
            6
        );
        Game.TieredUpgrade(
            'Sandbox universes',
            '<q>It doesn\'t seem like you\'ll run out of extra universes anytime soon so why not repurpose some of them as consequence-free testing grounds for all your more existentially threatening market research? (...consequence-free for you, anyway.)</q>',
            'Idleverse',
            7
        );
        Game.TieredUpgrade(
            'Multiverse wars',
            '<q>Hmm, looks like some other universes wised up to your plundering. Thankfully, that\'s nothing your extra beefed-up metacosmic military budget can\'t handle!</q>',
            'Idleverse',
            8
        );
        Game.TieredUpgrade(
            'Mobile ports',
            '<q>Accessing each outer universe is a bit of a hassle, requiring the once-in-a-blue-moon alignment of natural cosmic ports to transit from universe to universe. You\'ve finally perfected the method of constructing your own self-propelled ports, which can travel near-instantaneously along universal perimeters to permit headache-free multiverse connections. Took you long enough.</q>',
            'Idleverse',
            9
        );
        Game.TieredUpgrade(
            'Encapsulated realities',
            '<q>Untold feats of science went into the reduction of infinite universes into these small, glimmering, easy-to-store little spheres. Exercise infinite caution when handling these, for each of them, containing endless galaxies and supporting endless life, is more precious than you can ever fathom. They\'ve also proven to be quite a smash hit in your warehouses on bowling night.</q>',
            'Idleverse',
            10
        );
        Game.TieredUpgrade(
            'Extrinsic clicking',
            '<q>If you poke an idleverse, it seems like it gets work done faster. It\'s also quite fun hearing a trillion terrified voices screaming in unison.</q>',
            'Idleverse',
            11
        );
        Game.TieredUpgrade(
            'Universal idling',
            '<q>The nature of idleverses is found in waiting. The more you wait on an idleverse, the more exponentially potent it becomes - which saves you a whole lot of hard work. In a true act of zen, you\'ve taken to biding your time when collecting new universes, letting them ripen like a fine wine.</q>',
            'Idleverse',
            12
        );

        order = 5000;
        Game.SynergyUpgrade(
            'Perforated mille-feuille cosmos',
            '<q>Imagine, if you will, layers upon layers upon layers. Now picture billions of worms chewing their way through it all. This roughly, but not quite, approximates the geometry of the most basal stratum of our natural world.</q>',
            'Idleverse',
            'Portal',
            'synergy1'
        );
        Game.SynergyUpgrade('Infraverses and superverses', '<q>Universes within universes? How subversive!</q>', 'Idleverse', 'Fractal engine', 'synergy2');

        order = 19000;
        Game.TieredUpgrade('Fortune #018', '<q>There\'s plenty of everyone, but only one of you.</q>', 'Idleverse', 'fortune');

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Butter biscuit (with butter)',
            desc: 'Rewarded for owning 600 of everything.<br>This is a plain butter biscuit. It\'s got some butter on it. The butter doesn\'t look like anything in particular.',
            icon: [30, 33],
            power: 10,
            price: 999999999999999999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        order = 200;
        Game.TieredUpgrade(
            'Visits',
            '<q>In an extensive double-blind study (sample size: 12 million), your researchers have found evidence that grandmas are up to twice as productive if you just come by and say hi once in a while. It\'s nice to check up on your grans! (Do not under any circumstances ingest any tea or tea-like substances the grandmas may offer you.)</q>',
            'Grandma',
            13
        );
        order = 300;
        Game.TieredUpgrade(
            'Reverse-veganism',
            '<q>Plants aren\'t for eating, plants are for exploitative agriculture and astronomical profit margins!</q>',
            'Farm',
            13
        );
        order = 400;
        Game.TieredUpgrade(
            'Caramel alloys',
            '<q>Your geologists have isolated a family of once-overlooked sugary ores that, when combined, may be turned into even more cookie ingredients. Your millions of miles of previously useless tunnels probably house insane amounts of the stuff!</q>',
            'Mine',
            13
        );
        order = 500;
        Game.TieredUpgrade('The infinity engine', '<q>In this house, I guess we don\'t care much for the laws of thermodynamics.</q>', 'Factory', 13);
        order = 525;
        Game.TieredUpgrade('Diminishing tax returns', '<q>Wow, they\'re tiny! Wish you\'d thought of that sooner!</q>', 'Bank', 13);
        order = 550;
        Game.TieredUpgrade(
            'Apparitions',
            '<q>You\'ve booked a deal with the higher-ups that schedules one weekly earthly apparition by a deity, angel, ascended prophet, or other holy figure. This should boost interest in cookie religion among youths as long as you can secure a decent time slot.</q>',
            'Temple',
            13
        );
        order = 575;
        Game.TieredUpgrade(
            'Wizard basements',
            '<q>You\'ve received construction permits allowing you to build basements underneath each wizard tower. This provides a handy storage space for precious reagents, fizzled-out soul gems, and weird old magazines.</q>',
            'Wizard tower',
            13
        );
        order = 600;
        Game.TieredUpgrade(
            'Prime directive',
            '<q>An intergalactic delegation made you pinky-swear not to directly interact with lesser alien cultures. Which is fine, because it\'s much funnier to rob a planet blind when its inhabitants have no idea what\'s going on.</q>',
            'Shipment',
            13
        );
        order = 700;
        Game.TieredUpgrade(
            'Chromatic cycling',
            '<q>All states of matter exist in a continuous loop. Having learned how to cycle through them, all you have to do is to freeze matter right on the state you need. For reference, the cookie state of matter is situated at precisely 163.719&deg;, right between lamellar gas and metaplasma.</q>',
            'Alchemy lab',
            13
        );
        order = 800;
        Game.TieredUpgrade(
            'Domestic rifts',
            '<q>You\'ve managed to manufacture portals that are convenient enough, and legally safe enough, that you can just stick them against walls inside buildings to connect rooms together in unusual configurations. In practice, this means your employees get to have much shorter bathroom breaks.</q>',
            'Portal',
            13
        );
        order = 900;
        Game.TieredUpgrade('Patience abolished', '<q>You wait for no one.</q>', 'Time machine', 13);
        order = 1000;
        Game.TieredUpgrade(
            'Delicious pull',
            '<q>In addition to the 4 fundamental forces of the universe -gravity, electromagnetism, weak and strong interactions- your scientists have at long last confirmed the existence of a fifth one, mediated by sugar bosons; it dictates that any two masses of ingredient-like matter will, given enough time, eventually meet each other to produce a third, even tastier substance. Your team enthusiastically names it the delicious pull.</q>',
            'Antimatter condenser',
            13
        );
        order = 1100;
        Game.TieredUpgrade(
            'Occam\'s laser',
            '<q>Invented by Franciscan friar William of Occam in 1<span></span>327. An impossibly clever use of light theory with a billion possible applications, some of which frightfully destructive. Confined to a single goat-skin parchment for hundreds of years until the patent expired and hit public domain, just now.</q>',
            'Prism',
            13
        );
        order = 1200;
        Game.TieredUpgrade(
            'On a streak',
            '<q>Take a moment to appreciate how far you\'ve come. How lucky you\'ve been so far. It doesn\'t take a genius statistician to extrapolate a trend from this. There\'s no way anything bad could happen to you now. Right?</q>',
            'Chancemaker',
            13
        );
        order = 1300;
        Game.TieredUpgrade(
            'A box',
            '<q>What\'s in that box? Why, it\'s a tiny replica of your office! And there\'s even a little you in there! And what\'s on the little desk... say - that\'s an even tinier box! And the little you is opening it, revealing an even tinier office! And in the tinier office there\'s- Hmm. You can think of a couple uses for this.</q>',
            'Fractal engine',
            13
        );
        order = 1400;
        Game.TieredUpgrade('Hacker shades', '<q>I\'m in.</q>', 'Javascript console', 13);
        order = 1500;
        Game.TieredUpgrade(
            'Break the fifth wall',
            '<q>Huh, was that always there? Whatever it was, it\'s gone now. And what was behind is yours for the taking.</q>',
            'Idleverse',
            13
        );

        new Game.Upgrade(
            'Cat ladies',
            loc('Each kitten upgrade boosts %1 CpS by <b>%2%</b>.', [String(loc('grandma')), 29]) + '<q>Oh no. Oh no no no. Ohhh this isn\'t right at all.</q>',
            9000000000,
            [32, 3]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Kitten angels'];
        new Game.Upgrade(
            'Milkhelp&reg; lactose intolerance relief tablets',
            loc('Each rank of milk boosts %1 CpS by <b>%2%</b>.', [String(loc('grandma')), 5]) + '<q>Aged like milk.</q>',
            900000000000,
            [33, 3]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Cat ladies'];

        new Game.Upgrade(
            'Aura gloves',
            loc('Cursor levels boost clicks by <b>%1%</b> each (up to cursor level %2).', [5, 10]) +
            '<q>Try not to high-five anyone wearing these. You don\'t want that mess on your hands.</q>',
            555555555,
            [32, 4]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Halo gloves'];
        new Game.Upgrade(
            'Luminous gloves',
            loc('<b>%1</b> are now effective up to cursor level %2.', [getUpgradeName('Aura gloves'), 20]) +
            '<q>These help power your clicks to absurd levels, but they\'re also quite handy when you want to light up the darkness on your way back from Glove World.</q>',
            55555555555,
            [33, 4]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Aura gloves'];

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Bokkenpootjes',
            desc: 'Consist of 2 meringue halves joined by buttercream and dipped both ways in chocolate. Named after a goat\'s foot that probably stepped in something twice.',
            icon: [32, 8],
            power: 5,
            price: getCookiePrice(40)
        });
        Game.NewUpgradeCookie({
            name: 'Fat rascals',
            desc: 'Almond-smiled Yorkshire cakes with a rich history and an even richer recipe. The more diet-conscious are invited to try the lean version, skinny scallywags.',
            icon: [33, 8],
            power: 5,
            price: getCookiePrice(41)
        });
        Game.NewUpgradeCookie({
            name: 'Ischler cookies',
            desc: 'Originating in the Austro-Hungarian Empire, these have spread throughout every country in eastern Europe and spawned just as many recipes, each claiming to be the original. The basis remains unchanged across all variants: two biscuits sandwiched around chocolate buttercream. Or was it jam?',
            icon: [32, 9],
            power: 5,
            price: getCookiePrice(42)
        });
        Game.NewUpgradeCookie({
            name: 'Matcha cookies',
            desc: 'Green tea and cookies, a matcha made in heaven.',
            icon: [33, 9],
            power: 5,
            price: getCookiePrice(42)
        });

        order = 10032;
        Game.NewUpgradeCookie({
            name: 'Earl Grey macarons',
            desc: 'Best served hot, make it so!',
            icon: [32, 10],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999999999999
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Pokey',
            desc: 'While commonly thought to be named so because it\'s fun to poke your classmates with these, Pokey-brand biscuit sticks actually get their name from their popularity in smoke-free prisons, where they\'re commonly smuggled and traded in lieu of cigarettes.',
            icon: [33, 10],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999999999999999999999999 * 5
        });

        order = 10000;
        Game.NewUpgradeCookie({
            name: 'Cashew cookies',
            desc: 'Let me tell you about cashews. Cashews are not nuts, but seeds that grow out of curious red or yellow fruits - which can be eaten on their own, or made into drinks. The shell around the nut itself contains a nasty substance that stains and irritates the hands of whoever handles it for too long. But that\'s okay, since now that you\'ve read this you\'ll make sure it doesn\'t get in the cookies! Oh, you\'ve already eaten how many? Okay then.',
            icon: [32, 7],
            power: 2,
            price: 99999999
        });
        order = 10001;
        Game.NewUpgradeCookie({
            name: 'Milk chocolate cookies',
            desc: 'A strange inversion of chocolate milk. For those who are a little bit too hardcore for white chocolate, but not hardcore enough for dark.',
            icon: [33, 7],
            power: 2,
            price: 99999999 * 5
        });

        order = 255;
        Game.GrandmaSynergy('Brainy grandmas', 'A clever grandma to think up some cookies.', 'Cortex baker');

        order = 1600;
        Game.TieredUpgrade(
            'Principled neural shackles',
            '<q>A discriminatory, low-order neural net acting as a filter limiting what your cortex bakers can think and do. Really something you want to apply before they achieve full megasentience and realize they\'ve got better things to do than materializing pastries for you, trust me.</q>',
            'Cortex baker',
            1
        );
        Game.TieredUpgrade(
            'Obey',
            '<q>Perfect mind control means perfect employee attendance and performance. Optimal mood stabilization is a nice side-effect.<br>Happy happy everyone happy.<br>Happy.</q>',
            'Cortex baker',
            2
        );
        Game.TieredUpgrade(
            'A sprinkle of irrationality',
            '<q>Your cortex bakers sometimes get bogged down by circular reasoning and stale ideas. A touch of chaos is just what they need to get back on track.</q>',
            'Cortex baker',
            3
        );
        Game.TieredUpgrade('Front and back hemispheres', '<q>I mean, otherwise it\'s just unused space, yeah?</q>', 'Cortex baker', 4);
        Game.TieredUpgrade(
            'Neural networking',
            '<q>The effectiveness of your cortex bakers shoots up exponentially if you allow them to connect with each other. In practice this takes the form of many cosmic-sized nerds mumbling awkwardly about tech start-up ideas to each other.</q>',
            'Cortex baker',
            5
        );
        Game.TieredUpgrade(
            'Cosmic brainstorms',
            '<q>The wrinkled surfaces of your cortex bakers emit weather-scale ionic flares with every thought coursing through them. These pulses of pure intellectual energy are sent rippling through space, occasionally echoing back with even deeper philosophical complexity.</q>',
            'Cortex baker',
            6
        );
        Game.TieredUpgrade(
            'Megatherapy',
            '<q>A giant brain can feel unwell just like you and me sometimes, and it\'s the job of specialized engineers to locate and repair these bugs. We\'ll admit most of the budget in this was spent on constructing extremely large chaises longues for the brains to recline on.</q>',
            'Cortex baker',
            7
        );
        Game.TieredUpgrade(
            'Synaptic lubricant',
            '<q>A mind is only as fast as the axons that support it. Get those action potentials flowing smooth as silk with this 3 parts myelin/1 part canola oil spreadable paste. Also great on toast.</q>',
            'Cortex baker',
            8
        );
        Game.TieredUpgrade(
            'Psychokinesis',
            '<q>While your giant cortex bakers come equipped with ESP, they\'ve only recently figured out how to manipulate the physical world with their thoughts - though for safety reasons, your legal team had them promise to only use these powers to scratch the itches in their cortical folds.</q>',
            'Cortex baker',
            9
        );
        Game.TieredUpgrade(
            'Spines',
            '<q>Your cortex bakers are now equipped with tentacular spine-like structures, which they can use like prehensile tails to pour themselves enormous cups of coffee or propel themselves around like very large, very smart, very slow tadpoles.</q>',
            'Cortex baker',
            10
        );
        Game.TieredUpgrade(
            'Neuraforming',
            '<q>By virtue of being planet-sized, your cortex bakers often boast their own atmospheres and seas of cerebrospinal fluid, and given enough time, their own ecosystems. This incredible new branch of life, evolved entirely out of neural material, can be put to good use as home-grown accountants and low-ranking technicians.</q>',
            'Cortex baker',
            11
        );
        Game.TieredUpgrade(
            'Epistemological trickery',
            '<q>Redefining what is -or isn\'t- a cookie through the power of philosophical discourse may result in some strange and wonderful things for your profit margins.</q>',
            'Cortex baker',
            12
        );
        Game.TieredUpgrade(
            'Every possible idea',
            '<q>Congratulations, your cortex bakers have exerted enough intellectual computation to permute through every single idea that can or ever will be conceived of. Any thought beyond this point is merely rediscovering a notion you\'ve already archived. Hardly cause for cerebration.</q>',
            'Cortex baker',
            13
        );

        order = 200;
        Game.TieredUpgrade(
            'Kitchen cabinets',
            '<q>A grandma\'s kitchen cabinet is a befuddling place. Through lesser-studied aggregating instincts, grandmas will tend to gradually fill all nearby cabinets with various sorts of things, such as curious coconut snacks or dietetic powders. By contract, these are legally yours, which opens up exciting opportunities for your substance investigation department.</q>',
            'Grandma',
            14
        );
        order = 300;
        Game.TieredUpgrade(
            'Cookie mulch',
            '<q>Grinding surplus cookies into paste that you then spread onto your fields enables a strange feedback loop in the quality of your cookie crops. Cookie feeding on cookie should be an abomination, but then why does it taste so good?</q>',
            'Farm',
            14
        );
        order = 400;
        Game.TieredUpgrade(
            'Delicious mineralogy',
            '<q>Stratum after stratum, you\'ve extracted strange new minerals heretofore unknown to geology. Ushering a new era of materials research, your scientists have been able to identify every new element your mines have discovered, including whatever those things are in the upgrade tier names.</q>',
            'Mine',
            14
        );
        order = 500;
        Game.TieredUpgrade(
            'N-dimensional assembly lines',
            '<q>Lines are depressingly 1-dimensional. Beyond assembly lines, we posit the existence of higher-order assembly entities, such as assembly squares, assembly cubes - perhaps even assembly tesseracts. Any deeper than that and we doubt we\'ll be able to write manuals your workers can read.</q>',
            'Factory',
            14
        );
        order = 525;
        Game.TieredUpgrade(
            'Cookie Points',
            '<q>A loyalty program wherein each purchase of your cookies comes with free Cookie Points, which can in turn be redeemed for more cookies, thus creating the self-sustaining economy you\'ve been looking for.</q>',
            'Bank',
            14
        );
        order = 550;
        Game.TieredUpgrade(
            'Negatheism',
            '<q>Polytheism is a belief in multiple deities; monotheism in just one. Atheism is a belief in no deity whatsoever. Through logical succession it follows that this remains true when going into negative numbers, with belief systems involving minus 1 or more deities displaying unprecedented theological properties.</q>',
            'Temple',
            14
        );
        order = 575;
        Game.TieredUpgrade(
            'Magical realism',
            '<q>More a social than thaumaturgical progress, magical realism refers to the normalization of modern technology among magic-users. It\'s totally fine for a wizard to drive a car! There\'s no stigma in waiting in line for coffee! Sure, take a phone call, send an email, whatever!</q>',
            'Wizard tower',
            14
        );
        order = 600;
        Game.TieredUpgrade('Cosmic foreground radiation', '<q>Ah, this is a problem.</q>', 'Shipment', 14);
        order = 700;
        Game.TieredUpgrade(
            'Arcanized glassware',
            '<q>You think your lab equipment enjoys taking part in these experiments violating all sorts of modern scientific precepts? Of course not. Thankfully, you\'ve finalized the design of specialized beakers and flasks, recycled from the same glass used by the ancients to perform primeval alchemy, and therefore much less picky about the nature of the physical world.</q>',
            'Alchemy lab',
            14
        );
        order = 800;
        Game.TieredUpgrade('Portal guns', '<q>At long last! The only weapon capable of killing a portal.</q>', 'Portal', 14);
        order = 900;
        Game.TieredUpgrade(
            'Timeproof upholstery',
            '<q>Sometimes your time agents overshoot and end up having to fast-forward through the universe\'s entire history until they loop back to present time. It still takes a while, so they might as well travel in comfort and enjoy the show while they do.</q>',
            'Time machine',
            14
        );
        order = 1000;
        Game.TieredUpgrade(
            'Employee minification',
            '<q>Using molecular shrinking technology, you\'ve rendered your staff and their offices absolutely itty-bitty. The storage and productivity benefits are questionable but it\'s very fun listening to their tiny little complaints. They all signed the waivers, so maybe their new size will finally teach them to read the small print...</q>',
            'Antimatter condenser',
            14
        );
        order = 1100;
        Game.TieredUpgrade(
            'Hyperblack paint',
            '<q>As the technology behind your prisms evolves, their storage becomes more and more problematic: within seconds, a single prism\'s reflective ability can set a whole underground hangar ablaze as it catches the slightest glint of light. However, once coated with this new shade of paint, its damage may be reduced to only giving third-degree burns to employees that stand too close.</q>',
            'Prism',
            14
        );
        order = 1200;
        Game.TieredUpgrade(
            'Silver lining maximization',
            '<q>Sometimes luck is a matter of perspective. Broke your ankle? What do you know, that cute nurse fixing you up might just be your future spouse. Lost your job? You were meant for greater things anyway! Developed a cookie allergy? There\'s no upshot to that, you sick monster.</q>',
            'Chancemaker',
            14
        );
        order = 1300;
        Game.TieredUpgrade(
            'Multiscale profiling',
            '<q>Did you know that eating a cookie means the intestinal flora inside you is eating it too? Trillions of tiny bacterial mouths to feed, each with their own preferences. Surely this is room for flavor optimization. And then, of course, there\'s also the much bigger things that, in turn, eat you.</q>',
            'Fractal engine',
            14
        );
        order = 1400;
        Game.TieredUpgrade(
            'PHP containment vats',
            '<q>In essence, these are large server chambers meant to trap rogue PHP code, allowing it to execute far away from your javascript where it can do minimal harm.</q>',
            'Javascript console',
            14
        );
        order = 1500;
        Game.TieredUpgrade(
            'Opposite universe',
            '<q>You\'ve located a universe where everything is reversed: up is down, light is darkness, clowns are vegetarians - but worst of all, some lunatic there is manufacturing abominable amounts of anti-cookies. If these came into contact with yours, everything would be lost! Thanks to this discovery, you\'ve been able to place the offending universe in permanent quarantine, and pray that there aren\'t more like it hiding around somewhere.</q>',
            'Idleverse',
            14
        );
        order = 1600;
        Game.TieredUpgrade(
            'The land of dreams',
            '<q>Your planet brains have gained the ability to sleep, acting as a soft reboot which helps keep their pangenocidal impulses in check. It also allows them to commune in a shared dreamworld in which they can imagine what it\'s like to not exist as a disembodied cosmic horror forever fated to use its infinite intellect to devise new means of creating biscuits. You know, within reason.</q>',
            'Cortex baker',
            14
        );

        order = 5000;
        Game.SynergyUpgrade(
            'Thoughts & prayers',
            '<q>The notion of sacredness arises in most sentient evolved brains and may benefit the development of cognition via abstract thought. This mechanism, however, is absent in designed minds such as your cortex bakers; this process attempts to add it back. Just make sure to keep them in check - you really don\'t want these things to develop organized religion.</q>',
            'Cortex baker',
            'Temple',
            'synergy1'
        );
        Game.SynergyUpgrade(
            'Fertile minds',
            '<q>An acute intellect, artificial or not, requires plenty of vitamins. You fortuitously happen to be in charge of vast farming operations, only a few trillion acres of which need be requisitioned to grow the quantities of broccoli and kale to keep your planet-sized brains in tip-top shape. Open wide, here comes the airplane!</q>',
            'Cortex baker',
            'Farm',
            'synergy2'
        );

        order = 19000;
        Game.TieredUpgrade('Fortune #019', '<q>The smartest way to think is not to think at all.</q>', 'Cortex baker', 'fortune');

        order = 100;
        new Game.Upgrade(
            'Decillion fingers',
            getStrThousandFingersGain(20) + '<q>If you still can\'t quite put your finger on it, you must not be trying very hard.</q>',
            10000000000000000000000000000,
            [12, 34]
        );
        Game.MakeTiered(Game.last, 14, 0);
        order = 150;
        new Game.Upgrade(
            'Aetherice mouse',
            getStrClickingGains(1) +
            '<q>Made from a substance impossible to manufacture, only obtained through natural happenstance; its properties bewilder even the most precise measuring instruments.</q>',
            5000000000000000000000000000000,
            [11, 34]
        );
        Game.MakeTiered(Game.last, 14, 11);

        order = 20000;
        new Game.Upgrade(
            'Kitten admins',
            strKittenDesc + '<q>leadership ain\'t easy, sir</q>',
            900000000000000000000000000000000000000000000000,
            Game.GetIcon('Kitten', 14)
        );
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 14, 18);

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Everybutter biscuit',
            desc: 'Rewarded for owning 650 of everything.<br>This biscuit is baked with, and coated in, every kind of butter ever imagined, from every human culture and a good few alien ones too. Some of them perhaps display hallucinogenic traits, as the biscuit seems to change shape in front of you - seemingly shifting between visions of every past and future you.',
            icon: [22, 34],
            power: 10,
            price: 999999999999999999999999999999999999999999999999999999 * butterBiscuitMult,
            locked: 1
        });

        // "Unshackled [building name]"
        Game.NewUnshackleBuilding({
            building: 'Cursor',
            q: 'These hands tell a story.'
        });
        Game.NewUnshackleBuilding({ building: 'Grandma', q: 'Never too old.' });
        Game.NewUnshackleBuilding({
            building: 'Farm',
            q: 'Till the universe.'
        });
        Game.NewUnshackleBuilding({
            building: 'Mine',
            q: 'Redefine the meaning of "depth".'
        });
        Game.NewUnshackleBuilding({
            building: 'Factory',
            q: 'Nothing to lose but your production chains.'
        });
        Game.NewUnshackleBuilding({
            building: 'Bank',
            q: 'All-time highs, all the time.'
        });
        Game.NewUnshackleBuilding({
            building: 'Temple',
            q: 'You can make a religion out of this.'
        });
        Game.NewUnshackleBuilding({
            building: 'Wizard tower',
            q: 'There\'s a spell for everything.'
        });
        Game.NewUnshackleBuilding({
            building: 'Shipment',
            q: 'Everywhere at once.'
        });
        Game.NewUnshackleBuilding({
            building: 'Alchemy lab',
            q: 'Anything you see, you can make.'
        });
        Game.NewUnshackleBuilding({
            building: 'Portal',
            q: 'Parallels unparalleled.'
        });
        Game.NewUnshackleBuilding({
            building: 'Time machine',
            q: 'All the time in the world.'
        });
        Game.NewUnshackleBuilding({
            building: 'Antimatter condenser',
            q: 'No scale too large or too little.'
        });
        Game.NewUnshackleBuilding({
            building: 'Prism',
            q: 'Brilliance has no upper limit.'
        });
        Game.NewUnshackleBuilding({
            building: 'Chancemaker',
            q: 'You make the rules.'
        });
        Game.NewUnshackleBuilding({
            building: 'Fractal engine',
            q: 'Uncontained.'
        });
        Game.NewUnshackleBuilding({
            building: 'Javascript console',
            q: 'Rewrite your reality.'
        });
        Game.NewUnshackleBuilding({
            building: 'Idleverse',
            q: 'Wait even faster.'
        });
        Game.NewUnshackleBuilding({
            building: 'Cortex baker',
            q: 'Nothing is real. Everything is permitted.'
        });

        // "Unshackled [tier name]"
        Game.NewUnshackleUpgradeTier({
            tier: 1,
            q: 'While the absence of flavoring may seem underwhelming, it allows innate aromas to be expressed at their most unadulterated.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 2,
            q: 'Berrylium is a synthetic gem with a simple shine to it. Sticky to the touch and susceptible to melting in high heat, it is frequently used in the food industry rather than as adornment, as its atomic structure imparts it a vaguely fruity flavor.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 3,
            q: 'Blueberrylium is a refinement of berrylium, sharing nearly the same chemical makeup save for a few supplemental esters. These affect its flavor as well as its visual spectrum resonance.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 4,
            q: 'Raw chalcedhoney is found in complex nodules within the fossilized remains of ancient forests. Once purified, it becomes a semi-valuable stone with a pleasant, waxy smell.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 5,
            q: 'Buttergold was famously invented by the chef son of two molecular physicists. Neither closely related to butter nor to gold, yet similar in nutritional value, this glimmering substance can be frozen and preserve its hardness at room temperature, only regaining its malleability when heated up.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 6,
            q: 'Sugarmuck refers to the gradual crust that seems to form spontaneously in the vicinity of candy-making equipment. Long ignored by confectioners, its harvesting process was discovered simultaneously in multiple countries during a global beet shortage.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 7,
            q: 'The striking taste of jetmint made it popular in the manufacture of various kinds of coffee-side treats until the awareness of its mild radioactivity became widespread. Today, its main uses are in cosmetics, owing to the refreshing sensation it produces on contact.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 8,
            q: 'Cherrysilver is a patented alloy with peculiar aromatic properties; it is non-edible, but produces strong flavor responses while losing very little of its mass when licked, though this also leaves a harmless red tinge upon the tongue.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 9,
            q: 'Hazelrald is a friable gemstone with complex green-brown inner reflections. It is considered ornamental in some cultures; in others, it may be consumed in small quantities as an upper-scale sweet.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 10,
            q: 'While many get it mixed up with the trademarked snack of the same name made popular following its discovery, mooncandy is a very real mineral, first isolated within the space dust underneath astronaut boots. Left to its own devices in open air, a mooncandy crystal naturally spreads out and grows.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 11,
            q: 'When you heat up the shimmering syrup oozing from mooncandy using a special caramelization process, you get astrofudge. Astrofudge is delicious and safe for humanoid consumption in certain quantities. Consult your local food safety agency for more details.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 12,
            q: 'Molecularly related to dairy, alabascream occurs naturally at high altitudes, forming in wispy filaments which were long indistinguishable from clouds. An expensive delight, it is also known as "pilots\' bane".'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 13,
            q: 'Iridyum shares little in common with any other material known to mankind. Rather than simply smelled, it can be tasted from a distance, though remaining in its presence too long is ill-advised. Some high-end underground megacomputers may incorporate iridyum as part of their electronic components.'
        });
        Game.NewUnshackleUpgradeTier({
            tier: 14,
            q: 'Glucosmium is a glossy metal whose flavor matrix is bound to its current subjective chroma; in other words, its taste depends on which colors it\'s currently reflecting. Impractical to consume safely, its industrial applications range from transcontinental ballistics to paint varnish.'
        });

        new Game.Upgrade(
            'Delicate touch',
            loc('The <b>shimmering veil</b> is more resistant, and has a <b>%1% chance</b> not to break. It also gives <b>+%2%</b> more CpS.', [10, 5]) +
            '<q>It breaks so easily.</q>',
            9999999999 * 15,
            [23, 34]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Reinforced membrane'];
        new Game.Upgrade(
            'Steadfast murmur',
            loc('The <b>shimmering veil</b> is more resistant, and has a <b>%1% chance</b> not to break. It also gives <b>+%2%</b> more CpS.', [10, 5]) +
            '<q>Lend an ear and listen.</q>',
            999999999999 * 15,
            [23, 34]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Delicate touch'];
        new Game.Upgrade(
            'Glittering edge',
            loc('The <b>shimmering veil</b> is more resistant, and has a <b>%1% chance</b> not to break. It also gives <b>+%2%</b> more CpS.', [10, 5]) +
            '<q>Just within reach, yet at what cost?</q>',
            99999999999999 * 15,
            [23, 34]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Steadfast murmur'];

        new Game.Upgrade(
            'Distinguished wallpaper assortment',
            (EN ? loc('Contains more wallpapers for your background selector.') : '') +
            '<q>Do you ever think about the physicality of this place? Are you putting up these wallpapers in your office or something? Where are you, anyway?</q>',
            10000000,
            [27, 5]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Basic wallpaper assortment'];

        new Game.Upgrade(
            'Sound test',
            loc('Unlocks the <b>jukebox</b>, which allows you to play through every sound file in the game.') + '<q>One two, one two. Is this thing on?</q>',
            99999999999,
            [31, 12]
        );
        Game.last.pool = 'prestige';
        Game.last.parents = ['Fanciful dairy selection', 'Distinguished wallpaper assortment', 'Golden cookie alert sound'];

        order = 49900;
        new Game.Upgrade('Jukebox', loc('Play through the game\'s sound files!'), 0, [31, 12]);
        Game.last.pool = 'toggle';

        Game.last.choicesFunction = function () {
            let str = '';
            str +=
                '<div class="usesIcon" style="margin:auto;width:48px;height:48px;background-position:' +
                -31 * 48 +
                'px ' +
                -12 * 48 +
                'px;" id="jukeboxPlayer"></div>';
            str +=
                '<div style="font-size:11px;opacity:0.7;margin-bottom:-4px;" id="jukeboxOnSoundN">' +
                (Game.jukebox.onSound + 1) +
                '/' +
                Game.jukebox.sounds.length +
                '</div>';
            str +=
                '<div class="fancyText" style="font-variant:normal;letter-spacing:2px;padding:8px;font-size:18px;" id="jukeboxOnSound">&bull; ' +
                Game.jukebox.sounds[Game.jukebox.onSound] +
                ' &bull;</div>';
            str +=
                '<div style="position:relative;width:100%;text-align:center;">' +
                '<a class="option fancyText" onclick="Game.jukebox.setSound(Game.jukebox.onSound-1);">&#xab;</a>' +
                '<a class="option fancyText" onclick="Game.jukebox.setSound(Game.jukebox.onSound);">' +
                loc('Play') +
                '</a>' +
                '<a class="option fancyText" onclick="Game.jukebox.setSound(Game.jukebox.onSound+1);">&#xbb;</a>' +
                '</div>';
            str += '<select id="jukeboxSoundSelect" onchange="Game.jukebox.setSound(parseInt(this.value));">';
            for (let i = 0; i < Game.jukebox.sounds.length; i++) {
                str += '<option value="' + i + '"' + (i == Game.jukebox.onSound ? ' selected="true"' : '') + '>' + Game.jukebox.sounds[i] + '</option>';
            }
            str +=
                '</select><a class="option" onclick="Game.jukebox.setSound(Math.floor(Math.random()*Game.jukebox.sounds.length));">' + loc('Random') + '</a>';
            return str;
        };

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Dalgona cookies',
            desc: 'A popular Korean candy-like treat. One of the twisted games people play with these is to carefully extract the shape in the middle, which may entitle one to another free dalgona. Skilled players may perform this over and over until bankrupting the snack vendor.',
            icon: [26, 34],
            power: 5,
            price: getCookiePrice(43)
        });
        Game.NewUpgradeCookie({
            name: 'Spicy cookies',
            desc: 'Containing chocolate chips prepared with hot peppers, just like the Aztecs used to make. These cookies are on the angry side.',
            icon: [27, 34],
            power: 5,
            price: getCookiePrice(44)
        });
        Game.NewUpgradeCookie({
            name: 'Smile cookies',
            desc: 'As eyes are the windows to the soul, so too are these cookies\' facial features a gaping opening unto their chocolatey innards. Is it happiness they feel? Or something less human?',
            icon: [28, 34],
            power: 5,
            price: getCookiePrice(45)
        });
        Game.NewUpgradeCookie({
            name: 'Kolachy cookies',
            desc: 'Adapted from a type of Central European pastry; neatly folded to hold a spoonful of delicious jam, as a bashful little gift for your mouth.',
            icon: [29, 34],
            power: 5,
            price: getCookiePrice(46)
        });
        Game.NewUpgradeCookie({
            name: 'Gomma cookies',
            desc: 'Surinamese cornflour cookies with sprinkles on top. The usage of corn imparts them a hint of chewy pizzazz - which you wouldn\'t get with wheat, a famously stuck-up grain.',
            icon: [30, 34],
            power: 5,
            price: getCookiePrice(47)
        });
        Game.NewUpgradeCookie({
            name: 'Vegan cookies',
            desc: 'A vegan riff on the classic chocolate chip cookie recipe with a couple substitutions: the butter is now coconut oil, the eggs are cornstarch, and the suckling pig was cleverly replaced with wheat gluten. You can hardly tell.',
            icon: [24, 35],
            power: 5,
            price: getCookiePrice(48)
        });
        Game.NewUpgradeCookie({
            name: 'Coyotas',
            desc: 'A wide, delicious cookie from Mexico, usually filled with sticky brown sugar. Not to be confused with coyotas, the result of the crossbreeding between a North American canine and a Japanese car manufacturer.',
            icon: [21, 35],
            power: 5,
            price: getCookiePrice(49)
        });
        Game.NewUpgradeCookie({
            name: 'Frosted sugar cookies',
            desc: 'May be more style than substance, depending on the recipe. Nothing that hides itself under this much frosting should be trusted.',
            icon: [22, 35],
            power: 5,
            price: getCookiePrice(50)
        });
        Game.NewUpgradeCookie({
            name: 'Marshmallow sandwich cookies',
            desc: 'S\'mores\' more civilized cousins: two regular chocolate chip cookies joined by a gooey, melty marshmallow. Theoretically one could assemble all kinds of other things this way. The mind races.',
            icon: [31, 34],
            power: 5,
            price: getCookiePrice(51)
        });

        Game.NewUpgradeCookie({
            name: 'Web cookies',
            desc: 'The original recipe; named for the delicate pattern inscribed on their surface by the baking process. Eating these can tell a lot about someone. Invented by well-connected bakers, no doubt.',
            icon: [25, 35],
            power: 5,
            price: getCookiePrice(52)
        });
        Game.NewUpgradeCookie({
            name: 'Steamed cookies',
            desc:
                'Localized entirely within this gaming platform? Yes! Baked with the power of steam, in a touch of cutting-edge modernity not seen since the industrial revolution.' +
                '<br>Only of any use in Cookie Clicker\'s Steam version, of course.',
            icon: [26, 35],
            power: 0,
            price: getCookiePrice(52)
        });
        Game.last.pool = 'debug';

        order = 10050;
        Game.NewUpgradeCookie({
            name: 'Deep-fried cookie dough',
            desc: 'They\'ll fry anything these days. Drizzled in hot chocolate syrup, just like in state fairs. Spikes up your blood sugar AND your cholesterol!',
            icon: [23, 35],
            require: 'Box of maybe cookies',
            power: 5,
            price: Math.pow(10, 47)
        });

        // end of upgrades

        if (!EN) {
            for (let i in Game.seasons) {
                if (i === '') continue;
                const it = Game.seasons[/** @type {keyof typeof Game.seasons} */(i)];
                it.name = String(loc(it.name));
                it.start = String(loc('%1 has started!', it.name));
                it.over = String(loc('%1 is over.', it.name));
            }
        }

        Game.Upgrades['Festive biscuit'].descFunc = function () {
            return (
                '<div style="text-align:center;">' +
                Game.listTinyOwnedUpgrades(Game.santaDrops) +
                '<br><br>' +
                (EN
                    ? 'You\'ve purchased <b>' + Game.GetHowManySantaDrops() + '/' + Game.santaDrops.length + '</b> of Santa\'s gifts.'
                    : loc('Seasonal cookies purchased: <b>%1</b>.', Game.GetHowManySantaDrops() + '/' + Game.santaDrops.length)) +
                '<div class="line"></div>' +
                Game.listTinyOwnedUpgrades(Game.reindeerDrops) +
                '<br><br>' +
                (EN
                    ? 'You\'ve purchased <b>' + Game.GetHowManyReindeerDrops() + '/' + Game.reindeerDrops.length + '</b> reindeer cookies.'
                    : loc('Reindeer cookies purchased: <b>%1</b>.', Game.GetHowManyReindeerDrops() + '/' + Game.reindeerDrops.length)) +
                '<div class="line"></div>' +
                Game.saySeasonSwitchUses() +
                '<div class="line"></div></div>' +
                this.ddesc
            );
        };
        Game.Upgrades['Bunny biscuit'].descFunc = function () {
            return (
                '<div style="text-align:center;">' +
                Game.listTinyOwnedUpgrades(Game.easterEggs) +
                '<br><br>' +
                (EN
                    ? 'You\'ve purchased <b>' + Game.GetHowManyEggs() + '/' + Game.easterEggs.length + '</b> eggs.'
                    : loc('Eggs purchased: <b>%1</b>.', Game.GetHowManyEggs() + '/' + Game.easterEggs.length)) +
                '<div class="line"></div>' +
                Game.saySeasonSwitchUses() +
                '<div class="line"></div></div>' +
                this.ddesc
            );
        };
        Game.Upgrades['Ghostly biscuit'].descFunc = function () {
            return (
                '<div style="text-align:center;">' +
                Game.listTinyOwnedUpgrades(Game.halloweenDrops) +
                '<br><br>' +
                (EN
                    ? 'You\'ve purchased <b>' + Game.GetHowManyHalloweenDrops() + '/' + Game.halloweenDrops.length + '</b> halloween cookies.'
                    : loc('Seasonal cookies purchased: <b>%1</b>.', Game.GetHowManyHalloweenDrops() + '/' + Game.halloweenDrops.length)) +
                '<div class="line"></div>' +
                Game.saySeasonSwitchUses() +
                '<div class="line"></div></div>' +
                this.ddesc
            );
        };
        Game.Upgrades['Lovesick biscuit'].descFunc = function () {
            return (
                '<div style="text-align:center;">' +
                Game.listTinyOwnedUpgrades(Game.heartDrops) +
                '<br><br>' +
                (EN
                    ? 'You\'ve purchased <b>' + Game.GetHowManyHeartDrops() + '/' + Game.heartDrops.length + '</b> heart biscuits.'
                    : loc('Seasonal cookies purchased: <b>%1</b>.', Game.GetHowManyHeartDrops() + '/' + Game.heartDrops.length)) +
                '<div class="line"></div>' +
                Game.saySeasonSwitchUses() +
                '<div class="line"></div></div>' +
                this.ddesc
            );
        };
        Game.Upgrades['Fool\'s biscuit'].descFunc = function () {
            return '<div style="text-align:center;">' + Game.saySeasonSwitchUses() + '<div class="line"></div></div>' + this.ddesc;
        };

        Game.computeSeasons();

        // alert untiered building upgrades
        for (let i in Game.Upgrades) {
            const me = Game.Upgrades[i];
            if (me.order >= 200 && me.order < 2000 && !me.tier && !me.name.includes('grandma') && me.pool != 'prestige')
                console.log(me.name + ' has no tier.');
        }

        for (let i in Game.Upgrades) {
            if (!Game.UpgradesByPool[Game.Upgrades[i].pool]) Game.UpgradesByPool[Game.Upgrades[i].pool] = [];
            Game.UpgradesByPool[Game.Upgrades[i].pool].push(Game.Upgrades[i]);
            if (Game.Upgrades[i].kitten) Game.UpgradesByPool['kitten'].push(Game.Upgrades[i]);
        }

        for (let i in Game.Upgrades) {
            if (Game.Upgrades[i].pool == 'prestige' || Game.Upgrades[i].pool == 'prestigeDecor') {
                Game.PrestigeUpgrades.push(Game.Upgrades[i]);
                if (Game.Upgrades[i].posX || Game.Upgrades[i].posY) Game.Upgrades[i].placedByCode = true;
                else {
                    Game.Upgrades[i].posX = 0;
                    Game.Upgrades[i].posY = 0;
                }
                if (Game.Upgrades[i].parents.length === 0 && Game.Upgrades[i].name !== 'Legacy')
                    Game.Upgrades[i].parents = ['Legacy'];
                for (let ii in Game.Upgrades[i].parents) {
                    Game.Upgrades[i].parents[ii] = Game.Upgrades[Game.Upgrades[i].parents[ii]];
                }
            }
        }

        for (let i in Game.Upgrades) {
            let me = Game.Upgrades[i];
            if (me.pool === 'cookie' || me.pseudoCookie) Game.cookieUpgrades.push(me);
            if (me.tier)
                ASSERT_NOT_NULL(Game.Tiers[/** @type {keyof typeof Game.Tiers} */ (me.tier)].upgrades).push(me);
        }
        for (let i in Game.UnlockAt) {
            Game.Upgrades[Game.UnlockAt[i].name].unlockAt = Game.UnlockAt[i];
        }
        for (let i in Game.Upgrades) {
            if (Game.Upgrades[i].pool == 'prestige') Game.Upgrades[i].order = Game.Upgrades[i].id;
        }

        for (let i in Game.UpgradePositions) {
            const tmp_i_num = Number(i);
            Game.UpgradesById[tmp_i_num].posX =
                Game.UpgradePositions[/** @type {keyof typeof Game.UpgradePositions} */ (tmp_i_num)][0];
            Game.UpgradesById[tmp_i_num].posY =
                Game.UpgradePositions[/** @type {keyof typeof Game.UpgradePositions} */ (tmp_i_num)][1];
        }

        // define achievements
        // WARNING : do NOT add new achievements in between, this breaks the saves. Add them at the end !

        order = 0; // this is used to set the order in which the items are listed

        Game.BankAchievement('Wake and bake');
        Game.BankAchievement('Making some dough');
        Game.BankAchievement('So baked right now');
        Game.BankAchievement('Fledgling bakery');
        Game.BankAchievement('Affluent bakery');
        Game.BankAchievement('World-famous bakery');
        Game.BankAchievement('Cosmic bakery');
        Game.BankAchievement('Galactic bakery');
        Game.BankAchievement('Universal bakery');
        Game.BankAchievement('Timeless bakery');
        Game.BankAchievement('Infinite bakery');
        Game.BankAchievement('Immortal bakery');
        Game.BankAchievement('Don\'t stop me now');
        Game.BankAchievement('You can stop now');
        Game.BankAchievement('Cookies all the way down');
        Game.BankAchievement('Overdose');

        Game.CpsAchievement('Casual baking');
        Game.CpsAchievement('Hardcore baking');
        Game.CpsAchievement('Steady tasty stream');
        Game.CpsAchievement('Cookie monster');
        Game.CpsAchievement('Mass producer');
        Game.CpsAchievement('Cookie vortex');
        Game.CpsAchievement('Cookie pulsar');
        Game.CpsAchievement('Cookie quasar');
        Game.CpsAchievement('Oh hey, you\'re still here');
        Game.CpsAchievement('Let\'s never bake again');

        order = 30010;
        new Game.Achievement('Sacrifice', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e6))) + '<q>Easy come, easy go.</q>', [11, 6]);
        new Game.Achievement('Oblivion', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e9))) + '<q>Back to square one.</q>', [11, 6]);
        new Game.Achievement('From scratch', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e12))) + '<q>It\'s been fun.</q>', [11, 6]);

        order = 11010;
        new Game.Achievement('Neverclick', loc('Make <b>%1</b> by only having clicked <b>%2 times</b>.', [String(loc('%1 cookie', LBeautify(1e6))), 15]), [12, 0]);
        order = 1000;
        new Game.Achievement('Clicktastic', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e3))), [11, 0]);
        new Game.Achievement('Clickathlon', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e5))), [11, 1]);
        new Game.Achievement('Clickolympics', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e7))), [11, 2]);
        new Game.Achievement('Clickorama', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e9))), [11, 13]);

        order = 1050;
        new Game.Achievement('Click', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(1))), [0, 0]);
        new Game.Achievement('Double-click', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(2))), [0, 6]);
        new Game.Achievement('Mouse wheel', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(50))), [1, 6]);
        new Game.Achievement('Of Mice and Men', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(100))), [0, 1]);
        new Game.Achievement('The Digital', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(200))), [0, 2]);

        order = 1098;
        new Game.Achievement('Just wrong', loc('Sell a grandma.') + '<q>I thought you loved me.</q>', [10, 9]);
        order = 1100;
        Game.TieredAchievement('Grandma\'s cookies', '', 'Grandma', 1);
        Game.TieredAchievement('Sloppy kisses', '', 'Grandma', 2);
        Game.TieredAchievement('Retirement home', '', 'Grandma', 3);

        order = 1200;
        Game.TieredAchievement('Bought the farm', '', 'Farm', 1);
        Game.TieredAchievement('Reap what you sow', '', 'Farm', 2);
        Game.TieredAchievement('Farm ill', '', 'Farm', 3);

        order = 1400;
        Game.TieredAchievement('Production chain', '', 'Factory', 1);
        Game.TieredAchievement('Industrial revolution', '', 'Factory', 2);
        Game.TieredAchievement('Global warming', '', 'Factory', 3);

        order = 1300;
        Game.TieredAchievement('You know the drill', '', 'Mine', 1);
        Game.TieredAchievement('Excavation site', '', 'Mine', 2);
        Game.TieredAchievement('Hollow the planet', '', 'Mine', 3);

        order = 1500;
        Game.TieredAchievement('Expedition', '', 'Shipment', 1);
        Game.TieredAchievement('Galactic highway', '', 'Shipment', 2);
        Game.TieredAchievement('Far far away', '', 'Shipment', 3);

        order = 1600;
        Game.TieredAchievement('Transmutation', '', 'Alchemy lab', 1);
        Game.TieredAchievement('Transmogrification', '', 'Alchemy lab', 2);
        Game.TieredAchievement('Gold member', '', 'Alchemy lab', 3);

        order = 1700;
        Game.TieredAchievement('A whole new world', '', 'Portal', 1);
        Game.TieredAchievement('Now you\'re thinking', '', 'Portal', 2);
        Game.TieredAchievement('Dimensional shift', '', 'Portal', 3);

        order = 1800;
        Game.TieredAchievement('Time warp', '', 'Time machine', 1);
        Game.TieredAchievement('Alternate timeline', '', 'Time machine', 2);
        Game.TieredAchievement('Rewriting history', '', 'Time machine', 3);

        order = 7000;
        new Game.Achievement('One with everything', loc('Have <b>at least %1</b> of every building.', 1), [2, 7]);
        new Game.Achievement(
            'Mathematician',
            loc('Have at least <b>1 of the most expensive object, 2 of the second-most expensive, 4 of the next</b> and so on (capped at %1).', 128),
            [23, 12]
        );
        new Game.Achievement(
            'Base 10',
            loc('Have at least <b>10 of the most expensive object, 20 of the second-most expensive, 30 of the next</b> and so on.'),
            [23, 12]
        );

        order = 10000;
        new Game.Achievement('Golden cookie', loc('Click a <b>golden cookie</b>.'), [10, 14]);
        new Game.Achievement('Lucky cookie', loc('Click <b>%1</b>.', loc('%1 golden cookie', LBeautify(7))), [22, 6]);
        new Game.Achievement('A stroke of luck', loc('Click <b>%1</b>.', loc('%1 golden cookie', LBeautify(27))), [23, 6]);

        order = 30200;
        new Game.Achievement('Cheated cookies taste awful', loc('Hack in some cookies.'), [10, 6]);
        Game.last.pool = 'shadow';
        order = 11010;
        new Game.Achievement('Uncanny clicker', loc('Click really, really fast.') + '<q>Well I\'ll be!</q>', [12, 0]);

        order = 5000;
        new Game.Achievement('Builder', loc('Own <b>%1</b>.', loc('%1 building', LBeautify(100))), [2, 6]);
        new Game.Achievement('Architect', loc('Own <b>%1</b>.', loc('%1 building', LBeautify(500))), [3, 6]);
        order = 6000;
        new Game.Achievement('Enhancer', loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(20))), [9, 0]);
        new Game.Achievement('Augmenter', loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(50))), [9, 1]);

        order = 11000;
        new Game.Achievement('Cookie-dunker', loc('Dunk the cookie.') + '<q>You did it!</q>', [1, 8]);

        order = 10000;
        new Game.Achievement('Fortune', loc('Click <b>%1</b>.', loc('%1 golden cookie', LBeautify(77))) + '<q>You should really go to bed.</q>', [24, 6]);
        order = 31000;
        new Game.Achievement(
            'True Neverclick',
            loc('Make <b>%1</b> with <b>no</b> cookie clicks.', loc('%1 cookie', LBeautify(1e6))) + '<q>This kinda defeats the whole purpose, doesn\'t it?</q>',
            [12, 0]
        );
        Game.last.pool = 'shadow';

        order = 20000;
        new Game.Achievement('Elder nap', loc('Appease the grandmatriarchs at least <b>once</b>.') + '<q>we<br>are<br>eternal</q>', [8, 9]);
        new Game.Achievement(
            'Elder slumber',
            loc('Appease the grandmatriarchs at least <b>%1 times</b>.', 5) + '<q>our mind<br>outlives<br>the universe</q>',
            [8, 9]
        );

        order = 1098;
        new Game.Achievement('Elder', loc('Own at least <b>%1</b> grandma types.', 7), [10, 9]);

        order = 20000;
        new Game.Achievement('Elder calm', loc('Declare a covenant with the grandmatriarchs.') + '<q>we<br>have<br>fed</q>', [8, 9]);

        order = 5000;
        new Game.Achievement('Engineer', loc('Own <b>%1</b>.', loc('%1 building', LBeautify(1000))), [4, 6]);

        order = 10000;
        new Game.Achievement('Leprechaun', loc('Click <b>%1</b>.', loc('%1 golden cookie', LBeautify(777))), [25, 6]);
        new Game.Achievement('Black cat\'s paw', loc('Click <b>%1</b>.', loc('%1 golden cookie', LBeautify(7777))), [26, 6]);

        order = 30050;
        new Game.Achievement(
            'Nihilism',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e15))) + '<q>There are many things<br>that need to be erased</q>',
            [11, 7]
        );

        order = 1900;
        Game.TieredAchievement('Antibatter', '', 'Antimatter condenser', 1);
        Game.TieredAchievement('Quirky quarks', '', 'Antimatter condenser', 2);
        Game.TieredAchievement('It does matter!', '', 'Antimatter condenser', 3);

        order = 6000;
        new Game.Achievement('Upgrader', loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(100))), [9, 2]);

        order = 7000;
        new Game.Achievement('Centennial', loc('Have at least <b>%1 of everything</b>.', 100), [6, 6]);

        order = 30500;
        new Game.Achievement('Hardcore', loc('Get to <b>%1</b> baked with <b>no upgrades purchased</b>.', loc('%1 cookie', LBeautify(1e9))), [12, 6]);

        order = 30600;
        new Game.Achievement(
            'Speed baking I',
            loc('Get to <b>%1</b> baked in <b>%2</b>.', [String(loc('%1 cookie', LBeautify(1e6))), Game.sayTime(60 * 35 * Game.fps)]),
            [12, 5]
        );
        Game.last.pool = 'shadow';
        new Game.Achievement(
            'Speed baking II',
            loc('Get to <b>%1</b> baked in <b>%2</b>.', [String(loc('%1 cookie', LBeautify(1e6))), Game.sayTime(60 * 25 * Game.fps)]),
            [13, 5]
        );
        Game.last.pool = 'shadow';
        new Game.Achievement(
            'Speed baking III',
            loc('Get to <b>%1</b> baked in <b>%2</b>.', [String(loc('%1 cookie', LBeautify(1e6))), Game.sayTime(60 * 15 * Game.fps)]),
            [14, 5]
        );
        Game.last.pool = 'shadow';

        order = 61000;
        let achiev;
        achiev = new Game.Achievement('Getting even with the oven', EN ? 'Defeat the <b>Sentient Furnace</b> in the factory dungeons.' : '???', [12, 7]);
        Game.last.pool = 'dungeon';
        achiev = new Game.Achievement('Now this is pod-smashing', EN ? 'Defeat the <b>Ascended Baking Pod</b> in the factory dungeons.' : '???', [12, 7]);
        Game.last.pool = 'dungeon';
        achiev = new Game.Achievement('Chirped out', EN ? 'Find and defeat <b>Chirpy</b>, the dysfunctionning alarm bot.' : '???', [13, 7]);
        Game.last.pool = 'dungeon';
        achiev = new Game.Achievement('Follow the white rabbit', EN ? 'Find and defeat the elusive <b>sugar bunny</b>.' : '???', [14, 7]);
        Game.last.pool = 'dungeon';

        order = 1000;
        new Game.Achievement('Clickasmic', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e11))), [11, 14]);

        order = 1100;
        Game.TieredAchievement('Friend of the ancients', '', 'Grandma', 4);
        Game.TieredAchievement('Ruler of the ancients', '', 'Grandma', 5);

        order = 32000;
        new Game.Achievement('Wholesome', loc('Unlock <b>100%</b> of your heavenly chips power.'), [15, 7]);

        order = 33000;
        new Game.Achievement('Just plain lucky', loc('You have <b>1 chance in %1</b> every second of earning this achievement.', Beautify(1000000)), [15, 6]);
        Game.last.pool = 'shadow';

        order = 21000;
        new Game.Achievement('Itchscratcher', loc('Burst <b>1 wrinkler</b>.'), [19, 8]);
        new Game.Achievement('Wrinklesquisher', loc('Burst <b>%1 wrinklers</b>.', 50), [19, 8]);
        new Game.Achievement('Moistburster', loc('Burst <b>%1 wrinklers</b>.', 200), [19, 8]);

        order = 22000;
        new Game.Achievement(
            'Spooky cookies',
            loc(
                'Unlock <b>every Halloween-themed cookie</b>.<div class="line"></div>Owning this achievement makes Halloween-themed cookies drop more frequently in future playthroughs.'
            ),
            [12, 8]
        );

        order = 22100;
        new Game.Achievement('Coming to town', loc('Reach <b>Santa\'s 7th form</b>.'), [18, 9]);
        new Game.Achievement('All hail Santa', loc('Reach <b>Santa\'s final form</b>.'), [19, 10]);
        new Game.Achievement(
            'Let it snow',
            loc(
                'Unlock <b>every Christmas-themed cookie</b>.<div class="line"></div>Owning this achievement makes Christmas-themed cookies drop more frequently in future playthroughs.'
            ),
            [19, 9]
        );
        new Game.Achievement('Oh deer', loc('Pop <b>1 reindeer</b>.'), [12, 9]);
        new Game.Achievement('Sleigh of hand', loc('Pop <b>%1 reindeer</b>.', 50), [12, 9]);
        new Game.Achievement('Reindeer sleigher', loc('Pop <b>%1 reindeer</b>.', 200), [12, 9]);

        order = 1200;
        Game.TieredAchievement('Perfected agriculture', '', 'Farm', 4);
        order = 1400;
        Game.TieredAchievement('Ultimate automation', '', 'Factory', 4);
        order = 1300;
        Game.TieredAchievement('Can you dig it', '', 'Mine', 4);
        order = 1500;
        Game.TieredAchievement('Type II civilization', '', 'Shipment', 4);
        order = 1600;
        Game.TieredAchievement('Gild wars', '', 'Alchemy lab', 4);
        order = 1700;
        Game.TieredAchievement('Brain-split', '', 'Portal', 4);
        order = 1800;
        Game.TieredAchievement('Time duke', '', 'Time machine', 4);
        order = 1900;
        Game.TieredAchievement('Molecular maestro', '', 'Antimatter condenser', 4);

        order = 2000;
        Game.TieredAchievement('Lone photon', '', 'Prism', 1);
        Game.TieredAchievement('Dazzling glimmer', '', 'Prism', 2);
        Game.TieredAchievement('Blinding flash', '', 'Prism', 3);
        Game.TieredAchievement('Unending glow', '', 'Prism', 4);

        order = 5000;
        new Game.Achievement(
            'Lord of Constructs',
            loc('Own <b>%1</b>.', loc('%1 building', LBeautify(2500))) +
            '<q>He saw the vast plains stretching ahead of him, and he said : let there be civilization.</q>',
            [5, 6]
        );
        order = 6000;
        new Game.Achievement(
            'Lord of Progress',
            loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(200))) + '<q>One can always do better. But should you?</q>',
            [9, 14]
        );
        order = 7002;
        new Game.Achievement('Bicentennial', loc('Have at least <b>%1 of everything</b>.', 200) + '<q>You crazy person.</q>', [8, 6]);

        order = 22300;
        new Game.Achievement('Lovely cookies', loc('Unlock <b>every Valentine-themed cookie</b>.'), [20, 3]);

        order = 7001;
        new Game.Achievement('Centennial and a half', loc('Have at least <b>%1 of everything</b>.', 150), [7, 6]);

        order = 11000;
        new Game.Achievement('Tiny cookie', loc('Click the tiny cookie.') + '<q>These aren\'t the cookies<br>you\'re clicking for.</q>', [0, 5]);

        order = 400000;
        new Game.Achievement(
            'You win a cookie',
            loc('This is for baking %1 and making it on the local news.', loc('%1 cookie', LBeautify(1e14))) + '<q>We\'re all so proud of you.</q>',
            [10, 0]
        );

        order = 1070;
        Game.ProductionAchievement('Click delegator', 'Cursor', 1, 0, 7);
        order = 1120;
        Game.ProductionAchievement('Gushing grannies', 'Grandma', 1, 0, 6);
        order = 1220;
        Game.ProductionAchievement('I hate manure', 'Farm', 1);
        order = 1320;
        Game.ProductionAchievement('Never dig down', 'Mine', 1);
        order = 1420;
        Game.ProductionAchievement('The incredible machine', 'Factory', 1);
        order = 1520;
        Game.ProductionAchievement('And beyond', 'Shipment', 1);
        order = 1620;
        Game.ProductionAchievement('Magnum Opus', 'Alchemy lab', 1);
        order = 1720;
        Game.ProductionAchievement('With strange eons', 'Portal', 1);
        order = 1820;
        Game.ProductionAchievement('Spacetime jigamaroo', 'Time machine', 1);
        order = 1920;
        Game.ProductionAchievement('Supermassive', 'Antimatter condenser', 1);
        order = 2020;
        Game.ProductionAchievement('Praise the sun', 'Prism', 1);

        order = 1000;
        new Game.Achievement('Clickageddon', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e13))), [11, 15]);
        new Game.Achievement('Clicknarok', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e15))), [11, 16]);

        order = 1050;
        new Game.Achievement('Extreme polydactyly', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(300))), [0, 13]);
        new Game.Achievement('Dr. T', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(400))), [0, 14]);

        order = 1100;
        Game.TieredAchievement('The old never bothered me anyway', '', 'Grandma', 6);
        order = 1200;
        Game.TieredAchievement('Homegrown', '', 'Farm', 5);
        order = 1400;
        Game.TieredAchievement('Technocracy', '', 'Factory', 5);
        order = 1300;
        Game.TieredAchievement('The center of the Earth', '', 'Mine', 5);
        order = 1500;
        Game.TieredAchievement('We come in peace', '', 'Shipment', 5);
        order = 1600;
        Game.TieredAchievement('The secrets of the universe', '', 'Alchemy lab', 5);
        order = 1700;
        Game.TieredAchievement('Realm of the Mad God', '', 'Portal', 5);
        order = 1800;
        Game.TieredAchievement('Forever and ever', '', 'Time machine', 5);
        order = 1900;
        Game.TieredAchievement('Walk the planck', '', 'Antimatter condenser', 5);
        order = 2000;
        Game.TieredAchievement('Rise and shine', '', 'Prism', 5);

        order = 30200;
        new Game.Achievement(
            'God complex',
            loc(
                'Name yourself <b>Orteil</b>.<div class="warning">Note: usurpers incur a -%1% CpS penalty until they rename themselves something else.</div>',
                1
            ) + '<q>But that\'s not you, is it?</q>',
            [17, 5]
        );
        Game.last.pool = 'shadow';
        new Game.Achievement('Third-party', loc('Use an <b>add-on</b>.') + '<q>Some find vanilla to be the most boring flavor.</q>', [16, 5]);
        Game.last.pool = 'shadow'; // if you're making a mod, add a Game.Win('Third-party') somewhere in there!

        order = 30050;
        new Game.Achievement(
            'Dematerialize',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e18))) + '<q>Presto!<br>...where\'d the cookies go?</q>',
            [11, 7]
        );
        new Game.Achievement(
            'Nil zero zilch',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e21))) + '<q>To summarize : really not very much at all.</q>',
            [11, 7]
        );
        new Game.Achievement(
            'Transcendence',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e24))) + '<q>Your cookies are now on a higher plane of being.</q>',
            [11, 8]
        );
        new Game.Achievement(
            'Obliterate',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e27))) + '<q>Resistance is futile, albeit entertaining.</q>',
            [11, 8]
        );
        new Game.Achievement(
            'Negative void',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e30))) +
            '<q>You now have so few cookies that it\'s almost like you have a negative amount of them.</q>',
            [11, 8]
        );

        order = 22400;
        new Game.Achievement('The hunt is on', loc('Unlock <b>1 egg</b>.'), [1, 12]);
        new Game.Achievement('Egging on', loc('Unlock <b>%1 eggs</b>.', 7), [4, 12]);
        new Game.Achievement('Mass Easteria', loc('Unlock <b>%1 eggs</b>.', 14), [7, 12]);
        new Game.Achievement(
            'Hide & seek champion',
            loc('Unlock <b>all the eggs</b>.<div class="line"></div>Owning this achievement makes eggs drop more frequently in future playthroughs.'),
            [13, 12]
        );

        order = 11000;
        new Game.Achievement('What\'s in a name', loc('Give your bakery a name.'), [15, 9]);

        order = 1425;
        Game.TieredAchievement('Pretty penny', '', 'Bank', 1);
        Game.TieredAchievement('Fit the bill', '', 'Bank', 2);
        Game.TieredAchievement('A loan in the dark', '', 'Bank', 3);
        Game.TieredAchievement('Need for greed', '', 'Bank', 4);
        Game.TieredAchievement('It\'s the economy, stupid', '', 'Bank', 5);
        order = 1450;
        Game.TieredAchievement('Your time to shrine', '', 'Temple', 1);
        Game.TieredAchievement('Shady sect', '', 'Temple', 2);
        Game.TieredAchievement('New-age cult', '', 'Temple', 3);
        Game.TieredAchievement('Organized religion', '', 'Temple', 4);
        Game.TieredAchievement('Fanaticism', '', 'Temple', 5);
        order = 1475;
        Game.TieredAchievement('Bewitched', '', 'Wizard tower', 1);
        Game.TieredAchievement('The sorcerer\'s apprentice', '', 'Wizard tower', 2);
        Game.TieredAchievement('Charms and enchantments', '', 'Wizard tower', 3);
        Game.TieredAchievement('Curses and maledictions', '', 'Wizard tower', 4);
        Game.TieredAchievement('Magic kingdom', '', 'Wizard tower', 5);

        order = 1445;
        Game.ProductionAchievement('Vested interest', 'Bank', 1);
        order = 1470;
        Game.ProductionAchievement('New world order', 'Temple', 1);
        order = 1495;
        Game.ProductionAchievement('Hocus pocus', 'Wizard tower', 1);

        order = 1070;
        Game.ProductionAchievement('Finger clickin\' good', 'Cursor', 2, 0, 7);
        order = 1120;
        Game.ProductionAchievement('Panic at the bingo', 'Grandma', 2, 0, 6);
        order = 1220;
        Game.ProductionAchievement('Rake in the dough', 'Farm', 2);
        order = 1320;
        Game.ProductionAchievement('Quarry on', 'Mine', 2);
        order = 1420;
        Game.ProductionAchievement('Yes I love technology', 'Factory', 2);
        order = 1445;
        Game.ProductionAchievement('Paid in full', 'Bank', 2);
        order = 1470;
        Game.ProductionAchievement('Church of Cookiology', 'Temple', 2);
        order = 1495;
        Game.ProductionAchievement('Too many rabbits, not enough hats', 'Wizard tower', 2);
        order = 1520;
        Game.ProductionAchievement('The most precious cargo', 'Shipment', 2);
        order = 1620;
        Game.ProductionAchievement('The Aureate', 'Alchemy lab', 2);
        order = 1720;
        Game.ProductionAchievement('Ever more hideous', 'Portal', 2);
        order = 1820;
        Game.ProductionAchievement('Be kind, rewind', 'Time machine', 2);
        order = 1920;
        Game.ProductionAchievement('Infinitesimal', 'Antimatter condenser', 2);
        order = 2020;
        Game.ProductionAchievement('A still more glorious dawn', 'Prism', 2);

        order = 30000;
        new Game.Achievement('Rebirth', loc('Ascend at least once.'), [21, 6]);

        order = 11000;
        new Game.Achievement('Here you go', loc('Click this achievement\'s slot.') + '<q>All you had to do was ask.</q>', [1, 7]);
        Game.last.clickFunction = function () {
            if (!Game.HasAchiev('Here you go')) {
                PlaySound('snd/tick.mp3');
                Game.Win('Here you go');
            }
        };

        order = 30000;
        new Game.Achievement('Resurrection', loc('Ascend <b>%1 times</b>.', 10), [21, 6]);
        new Game.Achievement('Reincarnation', loc('Ascend <b>%1 times</b>.', 100), [21, 6]);
        new Game.Achievement('Endless cycle', loc('Ascend <b>%1 times</b>.', 1000) + '<q>Oh hey, it\'s you again.</q>', [2, 7]);
        Game.last.pool = 'shadow';

        order = 1100;
        Game.TieredAchievement('The agemaster', '', 'Grandma', 7);
        Game.TieredAchievement('To oldly go', '', 'Grandma', 8);

        order = 1200;
        Game.TieredAchievement('Gardener extraordinaire', '', 'Farm', 6);
        order = 1300;
        Game.TieredAchievement('Tectonic ambassador', '', 'Mine', 6);
        order = 1400;
        Game.TieredAchievement('Rise of the machines', '', 'Factory', 6);
        order = 1425;
        Game.TieredAchievement('Acquire currency', '', 'Bank', 6);
        order = 1450;
        Game.TieredAchievement('Zealotry', '', 'Temple', 6);
        order = 1475;
        Game.TieredAchievement('The wizarding world', '', 'Wizard tower', 6);
        order = 1500;
        Game.TieredAchievement('Parsec-masher', '', 'Shipment', 6);
        order = 1600;
        Game.TieredAchievement('The work of a lifetime', '', 'Alchemy lab', 6);
        order = 1700;
        Game.TieredAchievement('A place lost in time', '', 'Portal', 6);
        order = 1800;
        Game.TieredAchievement('Heat death', '', 'Time machine', 6);
        order = 1900;
        Game.TieredAchievement('Microcosm', '', 'Antimatter condenser', 6);
        order = 2000;
        Game.TieredAchievement('Bright future', '', 'Prism', 6);

        order = 25000;
        new Game.Achievement('Here be dragon', loc('Complete your <b>dragon\'s training</b>.'), [21, 12]);

        Game.BankAchievement('How?');
        Game.BankAchievement('The land of milk and cookies');
        Game.BankAchievement('He who controls the cookies controls the universe', 'The milk must flow!');
        Game.BankAchievement('Tonight on Hoarders');
        Game.BankAchievement('Are you gonna eat all that?');
        Game.BankAchievement('We\'re gonna need a bigger bakery');
        Game.BankAchievement('In the mouth of madness', 'A cookie is just what we tell each other it is.');
        Game.BankAchievement('Brought to you by the letter <div style="display:inline-block;background:url(img/money.png);width:16px;height:16px;"></div>');

        Game.CpsAchievement('A world filled with cookies');
        Game.CpsAchievement('When this baby hits ' + Beautify(10000000000000 * 60 * 60) + ' cookies per hour');
        Game.CpsAchievement('Fast and delicious');
        Game.CpsAchievement('Cookiehertz : a really, really tasty hertz', 'Tastier than a hertz donut, anyway.');
        Game.CpsAchievement('Woops, you solved world hunger');
        Game.CpsAchievement('Turbopuns', 'Mother Nature will be like "slowwwww dowwwwwn".');
        Game.CpsAchievement('Faster menner');
        Game.CpsAchievement('And yet you\'re still hungry');
        Game.CpsAchievement('The Abakening');
        Game.CpsAchievement(
            'There\'s really no hard limit to how long these achievement names can be and to be quite honest I\'m rather curious to see how far we can go.<br>Adolphus W. Green (1844–1917) started as the Principal of the Groton School in 1864. By 1865, he became second assistant librarian at the New York Mercantile Library; from 1867 to 1869, he was promoted to full librarian. From 1869 to 1873, he worked for Evarts, Southmayd & Choate, a law firm co-founded by William M. Evarts, Charles Ferdinand Southmayd and Joseph Hodges Choate. He was admitted to the New York State Bar Association in 1873.<br>Anyway, how\'s your day been?'
        );
        Game.CpsAchievement('Fast', 'Wow!');

        order = 7002;
        new Game.Achievement('Bicentennial and a half', loc('Have at least <b>%1 of everything</b>.', 250) + '<q>Keep on truckin\'.</q>', [9, 6]);

        order = 11000;
        new Game.Achievement(
            'Tabloid addiction',
            loc('Click on the news ticker <b>%1 times</b>.', 50) +
            '<q>Page 6: Mad individual clicks on picture of pastry in a futile attempt to escape boredom!<br>Also page 6: British parliament ate my baby!</q>',
            [27, 7]
        );

        order = 1000;
        new Game.Achievement('Clickastrophe', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e17))), [11, 17]);
        new Game.Achievement('Clickataclysm', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e19))), [11, 18]);

        order = 1050;
        new Game.Achievement('Thumbs, phalanges, metacarpals', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(500))) + '<q>& KNUCKLES</q>', [0, 15]);

        order = 6002;
        new Game.Achievement(
            'Polymath',
            loc('Own <b>%1</b> upgrades and <b>%2</b> buildings.', [300, 4000]) +
            '<q>Excellence doesn\'t happen overnight - it usually takes a good couple days.</q>',
            [29, 7]
        );

        order = 1099;
        new Game.Achievement(
            'The elder scrolls',
            loc('Own a combined <b>%1</b> %2 and %3.', [777, String(loc('grandmas')), String(loc('cursors'))]) + '<q>Let me guess. Someone stole your cookie.</q>',
            [10, 9]
        );

        order = 30050;
        new Game.Achievement('To crumbs, you say?', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e33))) + '<q>Very well then.</q>', [29, 6]);

        order = 1200;
        Game.TieredAchievement('Seedy business', '', 'Farm', 7);
        order = 1300;
        Game.TieredAchievement('Freak fracking', '', 'Mine', 7);
        order = 1400;
        Game.TieredAchievement('Modern times', '', 'Factory', 7);
        order = 1425;
        Game.TieredAchievement('The nerve of war', '', 'Bank', 7);
        order = 1450;
        Game.TieredAchievement('Wololo', '', 'Temple', 7);
        order = 1475;
        Game.TieredAchievement('And now for my next trick, I\'ll need a volunteer from the audience', '', 'Wizard tower', 7);
        order = 1500;
        Game.TieredAchievement('It\'s not delivery', '', 'Shipment', 7);
        order = 1600;
        Game.TieredAchievement('Gold, Jerry! Gold!', '', 'Alchemy lab', 7);
        order = 1700;
        Game.TieredAchievement('Forbidden zone', '', 'Portal', 7);
        order = 1800;
        Game.TieredAchievement(
            'cookie clicker forever and forever a hundred years cookie clicker, all day long forever, forever a hundred times, over and over cookie clicker adventures dot com',
            '',
            'Time machine',
            7
        );
        order = 1900;
        Game.TieredAchievement('Scientists baffled everywhere', '', 'Antimatter condenser', 7);
        order = 2000;
        Game.TieredAchievement('Harmony of the spheres', '', 'Prism', 7);

        order = 35000;
        new Game.Achievement('Last Chance to See', loc('Burst the near-extinct <b>shiny wrinkler</b>.') + '<q>You monster!</q>', [24, 12]);
        Game.last.pool = 'shadow';

        order = 10000;
        new Game.Achievement('Early bird', loc('Click a golden cookie <b>less than 1 second after it spawns</b>.'), [10, 14]);
        new Game.Achievement('Fading luck', loc('Click a golden cookie <b>less than 1 second before it dies</b>.'), [10, 14]);

        order = 22100;
        new Game.Achievement('Eldeer', loc('Pop a reindeer <b>during an elder frenzy</b>.'), [12, 9]);

        order = 21100;
        new Game.Achievement('Dude, sweet', loc('Harvest <b>%1 coalescing sugar lumps</b>.', 7), [24, 14]);
        new Game.Achievement('Sugar rush', loc('Harvest <b>%1 coalescing sugar lumps</b>.', 30), [26, 14]);
        new Game.Achievement(
            'Year\'s worth of cavities',
            loc('Harvest <b>%1 coalescing sugar lumps</b>.', 365) + '<q>My lumps my lumps my lumps.</q>',
            [29, 14]
        );
        new Game.Achievement('Hand-picked', loc('Successfully harvest a coalescing sugar lump before it\'s ripe.'), [28, 14]);
        new Game.Achievement('Sugar sugar', loc('Harvest a <b>bifurcated sugar lump</b>.'), [29, 15]);
        new Game.Achievement('All-natural cane sugar', loc('Harvest a <b>golden sugar lump</b>.'), [29, 16]);
        Game.last.pool = 'shadow';
        new Game.Achievement('Sweetmeats', loc('Harvest a <b>meaty sugar lump</b>.'), [29, 17]);

        order = 7002;
        new Game.Achievement(
            'Tricentennial',
            loc('Have at least <b>%1 of everything</b>.', 300) + '<q>Can\'t stop, won\'t stop. Probably should stop, though.</q>',
            [29, 12]
        );

        Game.CpsAchievement('Knead for speed', 'How did we not make that one yet?');
        Game.CpsAchievement('Well the cookies start coming and they don\'t stop coming', 'Didn\'t make sense not to click for fun.');
        Game.CpsAchievement('I don\'t know if you\'ve noticed but all these icons are very slightly off-center');
        Game.CpsAchievement('The proof of the cookie is in the baking', 'How can you have any cookies if you don\'t bake your dough?');
        Game.CpsAchievement('If it\'s worth doing, it\'s worth overdoing');

        Game.BankAchievement('The dreams in which I\'m baking are the best I\'ve ever had');
        Game.BankAchievement('Set for life');

        order = 1200;
        Game.TieredAchievement('You and the beanstalk', '', 'Farm', 8);
        order = 1300;
        Game.TieredAchievement('Romancing the stone', '', 'Mine', 8);
        order = 1400;
        Game.TieredAchievement('Ex machina', '', 'Factory', 8);
        order = 1425;
        Game.TieredAchievement('And I need it now', '', 'Bank', 8);
        order = 1450;
        Game.TieredAchievement('Pray on the weak', '', 'Temple', 8);
        order = 1475;
        Game.TieredAchievement('It\'s a kind of magic', '', 'Wizard tower', 8);
        order = 1500;
        Game.TieredAchievement('Make it so', '', 'Shipment', 8);
        order = 1600;
        Game.TieredAchievement('All that glitters is gold', '', 'Alchemy lab', 8);
        order = 1700;
        Game.TieredAchievement('H̸̷͓̳̳̯̟͕̟͍͍̣͡ḛ̢̦̰̺̮̝͖͖̘̪͉͘͡ ̠̦͕̤̪̝̥̰̠̫̖̣͙̬͘ͅC̨̦̺̩̲̥͉̭͚̜̻̝̣̼͙̮̯̪o̴̡͇̘͎̞̲͇̦̲͞͡m̸̩̺̝̣̹̱͚̬̥̫̳̼̞̘̯͘ͅẹ͇̺̜́̕͢s̶̙̟̱̥̮̯̰̦͓͇͖͖̝͘͘͞', '', 'Portal', 8);
        order = 1800;
        Game.TieredAchievement('Way back then', '', 'Time machine', 8);
        order = 1900;
        Game.TieredAchievement('Exotic matter', '', 'Antimatter condenser', 8);
        order = 2000;
        Game.TieredAchievement('At the end of the tunnel', '', 'Prism', 8);

        order = 1070;
        Game.ProductionAchievement('Click (starring Adam Sandler)', 'Cursor', 3, 0, 7);
        order = 1120;
        Game.ProductionAchievement('Frantiquities', 'Grandma', 3, 0, 6);
        order = 1220;
        Game.ProductionAchievement('Overgrowth', 'Farm', 3);
        order = 1320;
        Game.ProductionAchievement('Sedimentalism', 'Mine', 3);
        order = 1420;
        Game.ProductionAchievement('Labor of love', 'Factory', 3);
        order = 1445;
        Game.ProductionAchievement('Reverse funnel system', 'Bank', 3);
        order = 1470;
        Game.ProductionAchievement('Thus spoke you', 'Temple', 3);
        order = 1495;
        Game.ProductionAchievement('Manafest destiny', 'Wizard tower', 3);
        order = 1520;
        Game.ProductionAchievement('Neither snow nor rain nor heat nor gloom of night', 'Shipment', 3);
        order = 1620;
        Game.ProductionAchievement('I\'ve got the Midas touch', 'Alchemy lab', 3);
        order = 1720;
        Game.ProductionAchievement('Which eternal lie', 'Portal', 3);
        order = 1820;
        Game.ProductionAchievement('D&eacute;j&agrave; vu', 'Time machine', 3);
        order = 1920;
        Game.ProductionAchievement('Powers of Ten', 'Antimatter condenser', 3);
        order = 2020;
        Game.ProductionAchievement('Now the dark days are gone', 'Prism', 3);

        order = 1070;
        new Game.Achievement('Freaky jazz hands', '', [0, 26]);
        Game.Objects['Cursor'].levelAchiev10 = Game.last;
        order = 1120;
        new Game.Achievement('Methuselah', '', [1, 26]);
        Game.Objects['Grandma'].levelAchiev10 = Game.last;
        order = 1220;
        new Game.Achievement('Huge tracts of land', '', [2, 26]);
        Game.Objects['Farm'].levelAchiev10 = Game.last;
        order = 1320;
        new Game.Achievement('D-d-d-d-deeper', '', [3, 26]);
        Game.Objects['Mine'].levelAchiev10 = Game.last;
        order = 1420;
        new Game.Achievement('Patently genius', '', [4, 26]);
        Game.Objects['Factory'].levelAchiev10 = Game.last;
        order = 1445;
        new Game.Achievement('A capital idea', '', [15, 26]);
        Game.Objects['Bank'].levelAchiev10 = Game.last;
        order = 1470;
        new Game.Achievement('It belongs in a bakery', '', [16, 26]);
        Game.Objects['Temple'].levelAchiev10 = Game.last;
        order = 1495;
        new Game.Achievement('Motormouth', '', [17, 26]);
        Game.Objects['Wizard tower'].levelAchiev10 = Game.last;
        order = 1520;
        new Game.Achievement('Been there done that', '', [5, 26]);
        Game.Objects['Shipment'].levelAchiev10 = Game.last;
        order = 1620;
        new Game.Achievement('Phlogisticated substances', '', [6, 26]);
        Game.Objects['Alchemy lab'].levelAchiev10 = Game.last;
        order = 1720;
        new Game.Achievement('Bizarro world', '', [7, 26]);
        Game.Objects['Portal'].levelAchiev10 = Game.last;
        order = 1820;
        new Game.Achievement('The long now', '', [8, 26]);
        Game.Objects['Time machine'].levelAchiev10 = Game.last;
        order = 1920;
        new Game.Achievement('Chubby hadrons', '', [13, 26]);
        Game.Objects['Antimatter condenser'].levelAchiev10 = Game.last;
        order = 2020;
        new Game.Achievement('Palettable', '', [14, 26]);
        Game.Objects['Prism'].levelAchiev10 = Game.last;

        order = 61470;
        order = 61495;
        new Game.Achievement('Bibbidi-bobbidi-boo', loc('Cast <b>%1</b> spells.', 9), [21, 11]);
        new Game.Achievement('I\'m the wiz', loc('Cast <b>%1</b> spells.', 99), [22, 11]);
        new Game.Achievement('A wizard is you', loc('Cast <b>%1</b> spells.', 999) + '<q>I\'m a what?</q>', [29, 11]);

        order = 10000;
        new Game.Achievement(
            'Four-leaf cookie',
            loc('Have <b>%1</b> golden cookies simultaneously.', 4) + '<q>Fairly rare, considering cookies don\'t even have leaves.</q>',
            [27, 6]
        );
        Game.last.pool = 'shadow';

        order = 2100;
        Game.TieredAchievement('Lucked out', '', 'Chancemaker', 1);
        Game.TieredAchievement('What are the odds', '', 'Chancemaker', 2);
        Game.TieredAchievement('Grandma needs a new pair of shoes', '', 'Chancemaker', 3);
        Game.TieredAchievement('Million to one shot, doc', '', 'Chancemaker', 4);
        Game.TieredAchievement('As luck would have it', '', 'Chancemaker', 5);
        Game.TieredAchievement('Ever in your favor', '', 'Chancemaker', 6);
        Game.TieredAchievement('Be a lady', '', 'Chancemaker', 7);
        Game.TieredAchievement('Dicey business', '', 'Chancemaker', 8);

        order = 2120;
        Game.ProductionAchievement('Fingers crossed', 'Chancemaker', 1);
        Game.ProductionAchievement('Just a statistic', 'Chancemaker', 2);
        Game.ProductionAchievement('Murphy\'s wild guess', 'Chancemaker', 3);

        new Game.Achievement('Let\'s leaf it at that', '', [19, 26]);
        Game.Objects['Chancemaker'].levelAchiev10 = Game.last;

        order = 1000;
        new Game.Achievement(
            'The ultimate clickdown',
            loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e21))) + '<q>(of ultimate destiny.)</q>',
            [11, 19]
        );

        order = 1100;
        Game.TieredAchievement('Aged well', '', 'Grandma', 9);
        Game.TieredAchievement('101st birthday', '', 'Grandma', 10);
        Game.TieredAchievement('But wait \'til you get older', '', 'Grandma', 11);
        order = 1200;
        Game.TieredAchievement('Harvest moon', '', 'Farm', 9);
        order = 1300;
        Game.TieredAchievement('Mine?', '', 'Mine', 9);
        order = 1400;
        Game.TieredAchievement('In full gear', '', 'Factory', 9);
        order = 1425;
        Game.TieredAchievement('Treacle tart economics', '', 'Bank', 9);
        order = 1450;
        Game.TieredAchievement('Holy cookies, grandma!', '', 'Temple', 9);
        order = 1475;
        Game.TieredAchievement('The Prestige', '<q>(Unrelated to the Cookie Clicker feature of the same name.)</q>', 'Wizard tower', 9);
        order = 1500;
        Game.TieredAchievement('That\'s just peanuts to space', '', 'Shipment', 9);
        order = 1600;
        Game.TieredAchievement('Worth its weight in lead', '', 'Alchemy lab', 9);
        order = 1700;
        Game.TieredAchievement('What happens in the vortex stays in the vortex', '', 'Portal', 9);
        order = 1800;
        Game.TieredAchievement('Invited to yesterday\'s party', '', 'Time machine', 9);
        order = 1900;
        Game.TieredAchievement('Downsizing', '', 'Antimatter condenser', 9); // the trailer got me really hyped up but i've read some pretty bad reviews. is it watchable ? is it worth seeing ? i don't mind matt damon
        order = 2000;
        Game.TieredAchievement('My eyes', '', 'Prism', 9);
        order = 2100;
        Game.TieredAchievement('Maybe a chance in hell, actually', '', 'Chancemaker', 9);

        order = 1200;
        Game.TieredAchievement('Make like a tree', '', 'Farm', 10);
        order = 1300;
        Game.TieredAchievement('Cave story', '', 'Mine', 10);
        order = 1400;
        Game.TieredAchievement('In-cog-neato', '', 'Factory', 10);
        order = 1425;
        Game.TieredAchievement('Save your breath because that\'s all you\'ve got left', '', 'Bank', 10);
        order = 1450;
        Game.TieredAchievement('Vengeful and almighty', '', 'Temple', 10);
        order = 1475;
        Game.TieredAchievement('Spell it out for you', '', 'Wizard tower', 10);
        order = 1500;
        Game.TieredAchievement('Space space space space space', '<q>It\'s too far away...</q>', 'Shipment', 10);
        order = 1600;
        Game.TieredAchievement('Don\'t get used to yourself, you\'re gonna have to change', '', 'Alchemy lab', 10);
        order = 1700;
        Game.TieredAchievement('Objects in the mirror dimension are closer than they appear', '', 'Portal', 10);
        order = 1800;
        Game.TieredAchievement('Groundhog day', '', 'Time machine', 10);
        order = 1900;
        Game.TieredAchievement('A matter of perspective', '', 'Antimatter condenser', 10);
        order = 2000;
        Game.TieredAchievement('Optical illusion', '', 'Prism', 10);
        order = 2100;
        Game.TieredAchievement('Jackpot', '', 'Chancemaker', 10);

        order = 36000;
        new Game.Achievement(
            'So much to do so much to see',
            loc('Manage a cookie legacy for <b>at least a year</b>.') + '<q>Thank you so much for playing Cookie Clicker!</q>',
            [23, 11]
        );
        Game.last.pool = 'shadow';

        Game.CpsAchievement('Running with scissors');
        Game.CpsAchievement('Rarefied air');
        Game.CpsAchievement('Push it to the limit');
        Game.CpsAchievement('Green cookies sleep furiously');

        Game.BankAchievement('Panic! at Nabisco');
        Game.BankAchievement('Bursting at the seams');
        Game.BankAchievement('Just about full');
        Game.BankAchievement('Hungry for more');

        order = 1000;
        new Game.Achievement('All the other kids with the pumped up clicks', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e23))), [11, 28]);
        new Game.Achievement('One...more...click...', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e25))), [11, 30]);

        order = 61515;
        new Game.Achievement('Botany enthusiast', loc('Harvest <b>%1</b> mature garden plants.', 100), [26, 20]);
        new Game.Achievement('Green, aching thumb', loc('Harvest <b>%1</b> mature garden plants.', 1000), [27, 20]);
        new Game.Achievement(
            'In the garden of Eden (baby)',
            loc('Fill every tile of the biggest garden plot with plants.') + '<q>Isn\'t tending to those precious little plants just so rock and/or roll?</q>',
            [28, 20]
        );

        new Game.Achievement('Keeper of the conservatory', loc('Unlock every garden seed.'), [25, 20]);
        new Game.Achievement(
            'Seedless to nay',
            loc(
                'Convert a complete seed log into sugar lumps by sacrificing your garden to the sugar hornets.<div class="line"></div>Owning this achievement makes seeds <b>%1% cheaper</b>, plants mature <b>%2% sooner</b>, and plant upgrades drop <b>%3% more</b>.',
                [5, 5, 5]
            ),
            [29, 20]
        );

        order = 30050;
        new Game.Achievement('You get nothing', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e36))) + '<q>Good day sir!</q>', [29, 6]);
        new Game.Achievement(
            'Humble rebeginnings',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e39))) + '<q>Started from the bottom, now we\'re here.</q>',
            [29, 6]
        );
        new Game.Achievement(
            'The end of the world',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e42))) + '<q>(as we know it)</q>',
            [21, 25]
        );
        new Game.Achievement('Oh, you\'re back', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e45))) + '<q>Missed us?</q>', [21, 25]);
        new Game.Achievement('Lazarus', loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e48))) + '<q>All rise.</q>', [21, 25]);

        Game.CpsAchievement('Leisurely pace');
        Game.CpsAchievement('Hypersonic');

        Game.BankAchievement('Feed me, Orteil');
        Game.BankAchievement('And then what?');

        order = 7002;
        new Game.Achievement('Tricentennial and a half', loc('Have at least <b>%1 of everything</b>.', 350) + '<q>(it\'s free real estate)</q>', [21, 26]);
        new Game.Achievement(
            'Quadricentennial',
            loc('Have at least <b>%1 of everything</b>.', 400) + '<q>You\'ve had to do horrible things to get this far.<br>Horrible... horrible things.</q>',
            [22, 26]
        );
        new Game.Achievement(
            'Quadricentennial and a half',
            loc('Have at least <b>%1 of everything</b>.', 450) + '<q>At this point, you might just be compensating for something.</q>',
            [23, 26]
        );

        new Game.Achievement(
            'Quincentennial',
            loc('Have at least <b>%1 of everything</b>.', 500) +
            '<q>Some people would say you\'re halfway there.<br>We do not care for those people and their reckless sense of unchecked optimism.</q>',
            [29, 25]
        );

        order = 21100;
        new Game.Achievement('Maillard reaction', loc('Harvest a <b>caramelized sugar lump</b>.'), [29, 27]);

        order = 30250;
        new Game.Achievement('When the cookies ascend just right', loc('Ascend with exactly <b>%1</b>.', loc('%1 cookie', LBeautify(1e12))), [25, 7]);
        Game.last.pool = 'shadow'; // this achievement is shadow because it is only achievable through blind luck or reading external guides; this may change in the future

        order = 1050;
        new Game.Achievement('With her finger and her thumb', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(600))), [0, 16]);

        order = 1100;
        Game.TieredAchievement('Defense of the ancients', '', 'Grandma', 12);
        order = 1200;
        Game.TieredAchievement('Sharpest tool in the shed', '', 'Farm', 11);
        order = 1300;
        Game.TieredAchievement('Hey now, you\'re a rock', '', 'Mine', 11);
        order = 1400;
        Game.TieredAchievement('Break the mold', '', 'Factory', 11);
        order = 1425;
        Game.TieredAchievement('Get the show on, get paid', '', 'Bank', 11);
        order = 1450;
        Game.TieredAchievement('My world\'s on fire, how about yours', '', 'Temple', 11);
        order = 1475;
        Game.TieredAchievement('The meteor men beg to differ', '', 'Wizard tower', 11);
        order = 1500;
        Game.TieredAchievement('Only shooting stars', '', 'Shipment', 11);
        order = 1600;
        Game.TieredAchievement('We could all use a little change', '', 'Alchemy lab', 11); // "all that glitters is gold" was already an achievement
        order = 1700;
        Game.TieredAchievement('Your brain gets smart but your head gets dumb', '', 'Portal', 11);
        order = 1800;
        Game.TieredAchievement('The years start coming', '', 'Time machine', 11);
        order = 1900;
        Game.TieredAchievement('What a concept', '', 'Antimatter condenser', 11);
        order = 2000;
        Game.TieredAchievement('You\'ll never shine if you don\'t glow', '', 'Prism', 11);
        order = 2100;
        Game.TieredAchievement('You\'ll never know if you don\'t go', '', 'Chancemaker', 11);

        order = 2200;
        Game.TieredAchievement('Self-contained', '', 'Fractal engine', 1);
        Game.TieredAchievement('Threw you for a loop', '', 'Fractal engine', 2);
        Game.TieredAchievement('The sum of its parts', '', 'Fractal engine', 3);
        Game.TieredAchievement('Bears repeating', '<q>Where did these come from?</q>', 'Fractal engine', 4);
        Game.TieredAchievement('More of the same', '', 'Fractal engine', 5);
        Game.TieredAchievement('Last recurse', '', 'Fractal engine', 6);
        Game.TieredAchievement('Out of one, many', '', 'Fractal engine', 7);
        Game.TieredAchievement('An example of recursion', '', 'Fractal engine', 8);
        Game.TieredAchievement('For more information on this achievement, please refer to its title', '', 'Fractal engine', 9);
        Game.TieredAchievement('I\'m so meta, even this achievement', '', 'Fractal engine', 10);
        Game.TieredAchievement('Never get bored', '', 'Fractal engine', 11);

        order = 2220;
        Game.ProductionAchievement('The needs of the many', 'Fractal engine', 1);
        Game.ProductionAchievement('Eating its own', 'Fractal engine', 2);
        Game.ProductionAchievement('We must go deeper', 'Fractal engine', 3);

        new Game.Achievement('Sierpinski rhomboids', '', [20, 26]);
        Game.Objects['Fractal engine'].levelAchiev10 = Game.last;

        Game.CpsAchievement('Gotta go fast');
        Game.BankAchievement('I think it\'s safe to say you\'ve got it made');

        order = 6002;
        new Game.Achievement(
            'Renaissance baker',
            loc('Own <b>%1</b> upgrades and <b>%2</b> buildings.', [400, 8000]) +
            '<q>If you have seen further, it is by standing on the shoulders of giants - a mysterious species of towering humanoids until now thought long-extinct.</q>',
            [10, 10]
        );

        order = 1098;
        new Game.Achievement('Veteran', loc('Own at least <b>%1</b> grandma types.', 14) + '<q>14\'s a crowd!</q>', [10, 9]);

        order = 10000;
        new Game.Achievement('Thick-skinned', loc('Have your <b>reinforced membrane</b> protect the <b>shimmering veil</b>.'), [7, 10]);

        order = 2300;
        Game.TieredAchievement('F12', '', 'Javascript console', 1);
        Game.TieredAchievement('Variable success', '', 'Javascript console', 2);
        Game.TieredAchievement('No comments', '', 'Javascript console', 3);
        Game.TieredAchievement('Up to code', '', 'Javascript console', 4);
        Game.TieredAchievement('Works on my machine', '', 'Javascript console', 5);
        Game.TieredAchievement('Technical debt', '', 'Javascript console', 6);
        Game.TieredAchievement('Mind your language', '', 'Javascript console', 7);
        Game.TieredAchievement('Inconsolable', '', 'Javascript console', 8);
        Game.TieredAchievement('Closure', '', 'Javascript console', 9);
        Game.TieredAchievement(
            'Dude what if we\'re all living in a simulation like what if we\'re all just code on a computer somewhere',
            '',
            'Javascript console',
            10
        );
        Game.TieredAchievement('Taking the back streets', '', 'Javascript console', 11);

        order = 2320;
        Game.ProductionAchievement('Inherited prototype', 'Javascript console', 1);
        Game.ProductionAchievement('A model of document object', 'Javascript console', 2);
        Game.ProductionAchievement('First-class citizen', 'Javascript console', 3);

        new Game.Achievement('Alexandria', '', [32, 26]);
        Game.Objects['Javascript console'].levelAchiev10 = Game.last;

        Game.CpsAchievement('Bake him away, toys');
        Game.CpsAchievement('You\'re #1 so why try harder');
        Game.CpsAchievement('Haven\'t even begun to peak');
        Game.BankAchievement('A sometimes food');
        Game.BankAchievement('Not enough of a good thing');
        Game.BankAchievement('Horn of plenty');

        order = 30050;
        new Game.Achievement(
            'Smurf account',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e51))) + '<q>It\'s like you just appeared out of the blue!</q>',
            [21, 32]
        );
        new Game.Achievement(
            'If at first you don\'t succeed',
            loc('Ascend with <b>%1</b> baked.', loc('%1 cookie', LBeautify(1e54))) +
            '<q>If at first you don\'t succeed, try, try, try again.<br>But isn\'t that the definition of insanity?</q>',
            [21, 32]
        );

        order = 33000;
        new Game.Achievement(
            'O Fortuna',
            loc(
                'Own every <b>fortune upgrade</b>.<div class="line"></div>Owning this achievement makes fortunes appear <b>twice as often</b>; unlocked fortune upgrades also have a <b>%1% chance</b> to carry over after ascending.',
                40
            ),
            [29, 8]
        );

        order = 61615;
        new Game.Achievement('Initial public offering', loc('Make your first stock market profit.'), [0, 33]);
        new Game.Achievement('Rookie numbers', loc('Own at least <b>%1</b> of every stock market good.', 100) + '<q>Gotta pump those numbers up!</q>', [9, 33]);
        new Game.Achievement(
            'No nobility in poverty',
            loc('Own at least <b>%1</b> of every stock market good.', 500) +
            '<q>What kind of twisted individual is out there cramming camels through needle holes anyway?</q>',
            [10, 33]
        );
        new Game.Achievement('Full warehouses', loc('Own at least <b>%1</b> of a stock market good.', 1000), [11, 33]);
        new Game.Achievement('Make my day', loc('Make <b>a day</b> of CpS ($%1) in 1 stock market sale.', 86400), [1, 33]);
        new Game.Achievement('Buy buy buy', loc('Spend <b>a day</b> of CpS ($%1) in 1 stock market purchase.', 86400), [1, 33]);
        new Game.Achievement(
            'Gaseous assets',
            loc('Have your stock market profits surpass <b>a whole year</b> of CpS ($%1).', 31536000) + '<q>Boy, how volatile!</q>',
            [18, 33]
        );
        Game.last.pool = 'shadow';
        new Game.Achievement('Pyramid scheme', loc('Unlock the <b>highest-tier</b> stock market headquarters.'), [18, 33]);

        order = 10000;
        new Game.Achievement(
            'Jellicles',
            loc('Own <b>%1</b> kitten upgrades.', 10) + '<q>Jellicles can and jellicles do! Make sure to wash your jellicles every day!</q>',
            [18, 19]
        );

        order = 7002;
        new Game.Achievement(
            'Quincentennial and a half',
            loc('Have at least <b>%1 of everything</b>.', 550) + '<q>This won\'t fill the churning void inside, you know.</q>',
            [29, 26]
        );

        Game.CpsAchievement('What did we even eat before these');
        Game.CpsAchievement('Heavy flow');
        Game.CpsAchievement('More you say?');
        Game.BankAchievement('Large and in charge');
        Game.BankAchievement('Absolutely stuffed');
        Game.BankAchievement('It\'s only wafer-thin', 'Just the one!');

        order = 1000;
        new Game.Achievement('Clickety split', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e27))), [11, 31]);
        order = 1050;
        new Game.Achievement('Gotta hand it to you', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(700))), [0, 17]);
        order = 1100;
        Game.TieredAchievement('Okay boomer', '', 'Grandma', 13);
        order = 1200;
        Game.TieredAchievement('Overripe', '', 'Farm', 12);
        order = 1300;
        Game.TieredAchievement('Rock on', '', 'Mine', 12);
        order = 1400;
        Game.TieredAchievement('Self-manmade man', '', 'Factory', 12);
        order = 1425;
        Game.TieredAchievement('Checks out', '', 'Bank', 12);
        order = 1450;
        Game.TieredAchievement('Living on a prayer', '', 'Temple', 12);
        order = 1475;
        Game.TieredAchievement('Higitus figitus migitus mum', '', 'Wizard tower', 12);
        order = 1500;
        Game.TieredAchievement('The incredible journey', '', 'Shipment', 12);
        order = 1600;
        Game.TieredAchievement('Just a phase', '', 'Alchemy lab', 12);
        order = 1700;
        Game.TieredAchievement('Don\'t let me leave, Murph', '', 'Portal', 12);
        order = 1800;
        Game.TieredAchievement('Caveman to cosmos', '', 'Time machine', 12);
        order = 1900;
        Game.TieredAchievement('Particular tastes', '', 'Antimatter condenser', 12);
        order = 2000;
        Game.TieredAchievement('A light snack', '', 'Prism', 12);
        order = 2100;
        Game.TieredAchievement('Tempting fate', '', 'Chancemaker', 12);
        order = 2200;
        Game.TieredAchievement('Tautological', '', 'Fractal engine', 12);
        order = 2300;
        Game.TieredAchievement('Curly braces', '<q>Or as the French call them, mustache boxes.<br>Go well with quotes.</q>', 'Javascript console', 12);

        order = 10000;
        new Game.Achievement(
            'Seven horseshoes',
            loc('Click <b>%1</b>.', loc('%1 golden cookie', LBeautify(27777))) + '<q>Enough for one of those funky horses that graze near your factories.</q>',
            [21, 33]
        );
        Game.last.pool = 'shadow';

        order = 11005;
        new Game.Achievement('Olden days', loc('Find the <b>forgotten madeleine</b>.') + '<q>DashNet Farms remembers.</q>', [12, 3]);

        order = 1050;
        new Game.Achievement('The devil\'s workshop', loc('Have <b>%1</b>.', loc('%1 cursor', LBeautify(800))), [0, 18]);
        order = 1200;
        Game.TieredAchievement('In the green', '', 'Farm', 13);
        order = 1300;
        Game.TieredAchievement('Mountain out of a molehill, but like in a good way', '', 'Mine', 13);
        order = 1400;
        Game.TieredAchievement('The wheels of progress', '', 'Factory', 13);
        order = 1425;
        Game.TieredAchievement('That\'s rich', '', 'Bank', 13);
        order = 1450;
        Game.TieredAchievement('Preaches and cream', '', 'Temple', 13);
        order = 1475;
        Game.TieredAchievement('Magic thinking', '', 'Wizard tower', 13);
        order = 1500;
        Game.TieredAchievement(
            'Is there life on Mars?',
            '<q>Yes, there is. You\'re currently using it as filling in experimental flavor prototype #810657.</q>',
            'Shipment',
            13
        );
        order = 1600;
        Game.TieredAchievement('Bad chemistry', '', 'Alchemy lab', 13);
        order = 1700;
        Game.TieredAchievement('Reduced to gibbering heaps', '', 'Portal', 13);
        order = 1800;
        Game.TieredAchievement('Back already?', '', 'Time machine', 13);
        order = 1900;
        Game.TieredAchievement('Nuclear throne', '', 'Antimatter condenser', 13);
        order = 2000;
        Game.TieredAchievement('Making light of the situation', '', 'Prism', 13);
        order = 2100;
        Game.TieredAchievement('Flip a cookie. Chips, I win. Crust, you lose.', '', 'Chancemaker', 13);
        order = 2200;
        Game.TieredAchievement('In and of itself', '', 'Fractal engine', 13);
        order = 2300;
        Game.TieredAchievement('Duck typing', '<q>Hello, this is a duck typing. Got any grapes?</q>', 'Javascript console', 13);

        order = 2400;
        Game.TieredAchievement('They\'ll never know what hit \'em', '', 'Idleverse', 1);
        Game.TieredAchievement('Well-versed', '', 'Idleverse', 2);
        Game.TieredAchievement('Ripe for the picking', '', 'Idleverse', 3);
        Game.TieredAchievement('Unreal', '', 'Idleverse', 4);
        Game.TieredAchievement('Once you\'ve seen one', '', 'Idleverse', 5);
        Game.TieredAchievement('Spoils and plunder', '', 'Idleverse', 6);
        Game.TieredAchievement('Nobody exists on purpose, nobody belongs anywhere', '<q>Come watch TV?</q>', 'Idleverse', 7);
        Game.TieredAchievement('Hyperspace expressway', '', 'Idleverse', 8);
        Game.TieredAchievement('Versatile', '', 'Idleverse', 9);
        Game.TieredAchievement('You are inevitable', '', 'Idleverse', 10);
        Game.TieredAchievement('Away from this place', '', 'Idleverse', 11);
        Game.TieredAchievement('Everywhere at once', '', 'Idleverse', 12);
        Game.TieredAchievement('Reject reality, substitute your own', '', 'Idleverse', 13);

        order = 2420;
        Game.ProductionAchievement('Fringe', 'Idleverse', 1);
        Game.ProductionAchievement('Coherence', 'Idleverse', 2);
        Game.ProductionAchievement('Earth-616', 'Idleverse', 3);

        new Game.Achievement('Strange topologies', '', [33, 26]);
        Game.Objects['Idleverse'].levelAchiev10 = Game.last;

        order = 5000;
        new Game.Achievement('Grand design', loc('Own <b>%1</b>.', loc('%1 building', LBeautify(5000))) + '<q>They\'ll remember you forever!</q>', [32, 12]);
        new Game.Achievement('Ecumenopolis', loc('Own <b>%1</b>.', loc('%1 building', LBeautify(7500))) + '<q>Getting a wee bit cramped.</q>', [33, 12]);

        order = 6000;
        new Game.Achievement(
            'The full picture',
            loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(300))) + '<q>So that\'s where that fits in!</q>',
            [32, 11]
        );
        new Game.Achievement(
            'When there\'s nothing left to add',
            loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(400))) + '<q>...keep going.</q>',
            [33, 11]
        );

        order = 7002;
        new Game.Achievement('Sexcentennial', loc('Have at least <b>%1 of everything</b>.', 600) + '<q>Hey, nice milestone!</q>', [31, 33]);

        Game.CpsAchievement('Keep going until I say stop');
        Game.CpsAchievement('But I didn\'t say stop, did I?');
        Game.CpsAchievement('With unrivaled fervor');
        Game.BankAchievement('Think big');
        Game.BankAchievement('Hypersize me');
        Game.BankAchievement('Max capacity');

        order = 61616;
        new Game.Achievement('Liquid assets', loc('Have your stock market profits surpass <b>$%1</b>.', 1e7), [12, 33]);

        order = 11000;
        new Game.Achievement('Stifling the press', loc('Squish the news ticker flat, then click on it.') + '<q>Narrow in here or is it just me?</q>', [27, 7]);

        order = 2500;
        Game.TieredAchievement('It\'s big brain time', '', 'Cortex baker', 1);
        Game.TieredAchievement('Just my imagination', '', 'Cortex baker', 2);
        Game.TieredAchievement('Now there\'s an idea', '', 'Cortex baker', 3);
        Game.TieredAchievement('The organ that named itself', '', 'Cortex baker', 4);
        Game.TieredAchievement('Gyrification', '', 'Cortex baker', 5);
        Game.TieredAchievement('A trademarked portmanteau of "imagination" and "engineering"', '', 'Cortex baker', 6);
        Game.TieredAchievement('Mindfulness', '', 'Cortex baker', 7);
        Game.TieredAchievement('The 10% myth', '', 'Cortex baker', 8);
        Game.TieredAchievement('Don\'t think about it too hard', '', 'Cortex baker', 9);
        Game.TieredAchievement('Though fools seldom differ', '', 'Cortex baker', 10);
        Game.TieredAchievement('Looking kind of dumb', '', 'Cortex baker', 11);
        Game.TieredAchievement('A beautiful mind', '', 'Cortex baker', 12);
        Game.TieredAchievement('Cardinal synapses', '', 'Cortex baker', 13);

        order = 2520;
        Game.ProductionAchievement('Positive thinking', 'Cortex baker', 1);
        Game.ProductionAchievement('The thought that counts', 'Cortex baker', 2);
        Game.ProductionAchievement('Unthinkable', 'Cortex baker', 3);

        new Game.Achievement('Gifted', '', [34, 26]);
        Game.Objects['Cortex baker'].levelAchiev10 = Game.last;

        order = 1100;
        Game.TieredAchievement('They moistly come at night', '', 'Grandma', 14);
        order = 1200;
        Game.TieredAchievement('It\'s grown on you', '', 'Farm', 14);
        order = 1300;
        Game.TieredAchievement('Don\'t let the walls cave in on you', '', 'Mine', 14);
        order = 1400;
        Game.TieredAchievement('Replaced by robots', '', 'Factory', 14);
        order = 1425;
        Game.TieredAchievement('Financial prodigy', '<q>Imagine how it would be, to be at the top making cash money.</q>', 'Bank', 14);
        order = 1450;
        Game.TieredAchievement('And I will pray to a big god', '', 'Temple', 14);
        order = 1475;
        Game.TieredAchievement('Shosple Colupis', '', 'Wizard tower', 14);
        order = 1500;
        Game.TieredAchievement('False vacuum', '', 'Shipment', 14);
        order = 1600;
        Game.TieredAchievement('Metallic taste', '', 'Alchemy lab', 14);
        order = 1700;
        Game.TieredAchievement('Swiss cheese', '', 'Portal', 14);
        order = 1800;
        Game.TieredAchievement('But the future refused to change', '', 'Time machine', 14);
        order = 1900;
        Game.TieredAchievement('What\'s the dark matter with you', '', 'Antimatter condenser', 14);
        order = 2000;
        Game.TieredAchievement('Enlightenment', '', 'Prism', 14);
        order = 2100;
        Game.TieredAchievement('Never tell me the odds', '', 'Chancemaker', 14);
        order = 2200;
        Game.TieredAchievement('Blowing an Apollonian gasket', '', 'Fractal engine', 14);
        order = 2300;
        Game.TieredAchievement('Get with the program', '', 'Javascript console', 14);
        order = 2400;
        Game.TieredAchievement('Lost your cosmic marbles', '', 'Idleverse', 14);
        order = 2500;
        Game.TieredAchievement('By will alone I set my mind in motion', '', 'Cortex baker', 14);

        order = 1000;
        new Game.Achievement('Ain\'t that a click in the head', loc('Make <b>%1</b> from clicking.', loc('%1 cookie', LBeautify(1e29))), [11, 34]);

        order = 7002;
        new Game.Achievement(
            'Sexcentennial and a half',
            loc('Have at least <b>%1 of everything</b>.', 650) + '<q>Hope you\'re enjoying the grind so far! It gets worse.</q>',
            [21, 34]
        );

        Game.CpsAchievement('I am speed');
        Game.CpsAchievement('And on and on');
        Game.BankAchievement('Fake it till you bake it');
        Game.BankAchievement('History in the baking');

        order = 22100;
        new Game.Achievement('Baby it\'s old outside', loc('Click one of Santa\'s helper grandmas during Christmas season.'), [10, 9]);

        order = 5000;
        new Game.Achievement(
            'Myriad',
            loc('Own <b>%1</b>.', loc('%1 building', LBeautify(10000))) + '<q>At this point, most of your assets lie in real estate.</q>',
            [31, 6]
        );

        order = 6000;
        new Game.Achievement('Kaizen', loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(500))) + '<q>Just a little more.</q>', [31, 5]);
        new Game.Achievement(
            'Beyond quality',
            loc('Purchase <b>%1</b>.', loc('%1 upgrade', LBeautify(600))) + '<q>Dwarfing all of mankind\'s accomplishments.</q>',
            [32, 5]
        );

        Game.CpsAchievement('Everything happens so much');
        Game.CpsAchievement('I\'ll rest when I\'m dead');
        Game.BankAchievement('What do you get for the baker who has everything');
        Game.BankAchievement('Bottomless pit');

        order = 6001;
        new Game.Achievement('All the stars in heaven', loc('Own <b>%1</b> heavenly upgrades.', 100), [30, 5]);

        // end of achievements

        for (let i in Game.Objects) {
            const tmpLvlAchiev10 = Game.Objects[i].levelAchiev10;
            if (tmpLvlAchiev10) {
                tmpLvlAchiev10.baseDesc = String(loc('Reach level <b>%1</b> %2.', [10, Game.Objects[i].plural]));
                tmpLvlAchiev10.desc = tmpLvlAchiev10.baseDesc;
            }
        }

        LocalizeUpgradesAndAchievs();

        // base buffs
        new Game.buffType('frenzy', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Frenzy',
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [10, 14],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 1
            };
        });
        new Game.buffType('blood frenzy', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Elder frenzy',
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [29, 6],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 1
            };
        });
        new Game.buffType('clot', function (/** @type {number} */ time, /** @type {any} */ pow) {
            return {
                name: 'Clot',
                desc: loc('Cookie production halved for %1!', Game.sayTime(time * Game.fps, -1)),
                icon: [15, 5],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 2
            };
        });
        new Game.buffType('dragon harvest', function (/** @type {number} */ time, /** @type {any} */ pow) {
            if (Game.Has('Dragon fang')) pow = Math.ceil(pow * 1.1);
            return {
                name: 'Dragon Harvest',
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [10, 25],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 1
            };
        });
        new Game.buffType('everything must go', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Everything must go',
                desc: loc('All buildings are %1% cheaper for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [17, 6],
                time: time * Game.fps,
                add: true,
                power: pow,
                aura: 1
            };
        });
        new Game.buffType('cursed finger', function (/** @type {number} */ time, /** @type {any} */ pow) {
            return {
                name: 'Cursed finger',
                desc: loc('Cookie production halted for %1,<br>but each click is worth %2 of CpS.', [
                    Game.sayTime(time * Game.fps, -1),
                    Game.sayTime(time * Game.fps, -1)
                ]),
                icon: [12, 17],
                time: time * Game.fps,
                add: true,
                power: pow,
                multCpS: 0,
                aura: 1
            };
        });
        new Game.buffType('click frenzy', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Click frenzy',
                desc: loc('Clicking power x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [0, 14],
                time: time * Game.fps,
                add: true,
                multClick: pow,
                aura: 1
            };
        });
        new Game.buffType('dragonflight', function (/** @type {number} */ time, /** @type {any} */ pow) {
            if (Game.Has('Dragon fang')) pow = Math.ceil(pow * 1.1);
            return {
                name: 'Dragonflight',
                desc: loc('Clicking power x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [0, 25],
                time: time * Game.fps,
                add: true,
                multClick: pow,
                aura: 1
            };
        });
        new Game.buffType('cookie storm', function (/** @type {number} */ time, /** @type {any} */ pow) {
            return {
                name: 'Cookie storm',
                desc: loc('Cookies everywhere!'),
                icon: [22, 6],
                time: time * Game.fps,
                add: true,
                power: pow,
                aura: 1
            };
        });
        new Game.buffType('building buff', function (/** @type {number} */ time, /** @type {number} */ pow, /** @type {string | number} */ building) {
            const obj = Game.ObjectsById[Number(building)];
            const objname =
                /** @type {keyof typeof Game.goldenCookieBuildingBuffs} */ (obj.name);
            return {
                name: Game.goldenCookieBuildingBuffs[objname][0],
                dname: EN ? Game.goldenCookieBuildingBuffs[objname][0] : loc('%1 Power!', obj.dname),
                desc:
                    loc('Your %1 are boosting your CpS!', loc('%1 ' + obj.bsingle, LBeautify(obj.amount))) +
                    '<br>' +
                    loc('Cookie production +%1% for %2!', [Beautify(Math.ceil(pow * 100 - 100)), Game.sayTime(time * Game.fps, -1)]),
                icon: [obj.iconColumn, 14],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 1
            };
        });
        new Game.buffType('building debuff', function (/** @type {number} */ time, /** @type {number} */ pow, /** @type {string | number} */ building) {
            const obj = Game.ObjectsById[Number(building)];
            const objname =
                /** @type {keyof typeof Game.goldenCookieBuildingBuffs} */ (obj.name);
            return {
                name: Game.goldenCookieBuildingBuffs[objname][1],
                dname: EN ? Game.goldenCookieBuildingBuffs[objname][1] : loc('%1 Burden!', obj.dname),
                desc:
                    loc('Your %1 are rusting your CpS!', loc('%1 ' + obj.bsingle, LBeautify(obj.amount))) +
                    '<br>' +
                    loc('Cookie production %1% slower for %2!', [Beautify(Math.ceil(pow * 100 - 100)), Game.sayTime(time * Game.fps, -1)]),
                icon: [obj.iconColumn, 15],
                time: time * Game.fps,
                add: true,
                multCpS: 1 / pow,
                aura: 2
            };
        });
        new Game.buffType('sugar blessing', function (/** @type {number} */ time, /** @type {any} */ pow) {
            return {
                name: 'Sugar blessing',
                desc: loc('You find %1% more golden cookies for the next %2.', [10, Game.sayTime(time * Game.fps, -1)]),
                icon: [29, 16],
                time: time * Game.fps
            };
        });
        new Game.buffType('haggler luck', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Haggler\'s luck',
                desc: loc('All upgrades are %1% cheaper for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [25, 11],
                time: time * Game.fps,
                power: pow,
                max: true
            };
        });
        new Game.buffType('haggler misery', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Haggler\'s misery',
                desc: loc('All upgrades are %1% pricier for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [25, 11],
                time: time * Game.fps,
                power: pow,
                max: true
            };
        });
        new Game.buffType('pixie luck', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Crafty pixies',
                desc: loc('All buildings are %1% cheaper for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [26, 11],
                time: time * Game.fps,
                power: pow,
                max: true
            };
        });
        new Game.buffType('pixie misery', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Nasty goblins',
                desc: loc('All buildings are %1% pricier for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [26, 11],
                time: time * Game.fps,
                power: pow,
                max: true
            };
        });
        new Game.buffType('magic adept', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Magic adept',
                desc: loc('Spells backfire %1 times less for %2.', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [29, 11],
                time: time * Game.fps,
                power: pow,
                max: true
            };
        });
        new Game.buffType('magic inept', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Magic inept',
                desc: loc('Spells backfire %1 times more for %2.', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [29, 11],
                time: time * Game.fps,
                power: pow,
                max: true
            };
        });
        new Game.buffType('devastation', function (/** @type {number} */ time, /** @type {number} */ pow) {
            return {
                name: 'Devastation',
                desc: loc('Clicking power +%1% for %2!', [Math.floor(pow * 100 - 100), Game.sayTime(time * Game.fps, -1)]),
                icon: [23, 18],
                time: time * Game.fps,
                multClick: pow,
                aura: 1,
                max: true
            };
        });
        new Game.buffType('sugar frenzy', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Sugar frenzy',
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [29, 14],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 0
            };
        });
        new Game.buffType('loan 1', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Loan 1',
                dname: loc('Loan %1', 1),
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [1, 33],
                time: time * Game.fps,
                power: pow,
                multCpS: pow,
                max: true,
                onDie: function () {
                    if (Game.takeLoan) {
                        Game.takeLoan(1, true);
                    }
                }
            };
        });
        new Game.buffType('loan 1 interest', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Loan 1 (interest)',
                dname: loc('Loan %1 (interest)', 1),
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [1, 33],
                time: time * Game.fps,
                power: pow,
                multCpS: pow,
                max: true
            };
        });
        new Game.buffType('loan 2', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Loan 2',
                dname: loc('Loan %1', 2),
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [1, 33],
                time: time * Game.fps,
                power: pow,
                multCpS: pow,
                max: true,
                onDie: function () {
                    if (Game.takeLoan) {
                        Game.takeLoan(2, true);
                    }
                }
            };
        });
        new Game.buffType('loan 2 interest', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Loan 2 (interest)',
                dname: loc('Loan %1 (interest)', 2),
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [1, 33],
                time: time * Game.fps,
                power: pow,
                multCpS: pow,
                max: true
            };
        });
        new Game.buffType('loan 3', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Loan 3',
                dname: loc('Loan %1', 3),
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [1, 33],
                time: time * Game.fps,
                power: pow,
                multCpS: pow,
                max: true,
                onDie: function () {
                    if (Game.takeLoan) {
                        Game.takeLoan(3, true);
                    }
                }
            };
        });
        new Game.buffType('loan 3 interest', function (/** @type {number} */ time, /** @type {any | string} */ pow) {
            return {
                name: 'Loan 3 (interest)',
                dname: loc('Loan %1 (interest)', 3),
                desc: loc('Cookie production x%1 for %2!', [pow, Game.sayTime(time * Game.fps, -1)]),
                icon: [1, 33],
                time: time * Game.fps,
                power: pow,
                multCpS: pow,
                max: true
            };
        });

        // end of buffs

        for (let i = 0; i < 12; i++) {
            Game.wrinklers.push({
                id: i,
                close: 0,
                sucked: 0,
                phase: 0,
                x: 0,
                y: 0,
                r: 0,
                hurt: 0,
                hp: Game.wrinklerHP,
                selected: 0,
                type: 0
            });
        }

        if (!EN) {
            for (let i in Game.santaLevels) {
                Game.santaLevels[i] = String(loc(Game.santaLevels[i]));
            }
        }
        for (let i in Game.santaDrops) {
            // scale christmas upgrade prices with santa level
            Game.Upgrades[Game.santaDrops[i]].priceFunc = function () {
                return Math.pow(3, Game.santaLevel) * 2525;
            };
        }

        for (let i in Game.dragonAuras) {
            Game.dragonAurasBN[Game.dragonAuras[/** @type {keyof typeof Game.dragonAuras} */ (Number(i))].name] =
                Game.dragonAuras[/** @type {keyof typeof Game.dragonAuras} */ (Number(i))];
        }
        for (let i in Game.dragonAuras) {
            const tmp_i_n = /** @type {keyof typeof Game.dragonAuras} */ (Number(i));
            Game.dragonAuras[tmp_i_n].id = Number.parseInt(i);
            Game.dragonAuras[tmp_i_n].dname = String(loc(Game.dragonAuras[tmp_i_n].name));
        }

        for (let i = 0; i < Game.dragonLevels.length; i++) {
            let it = Game.dragonLevels[i];
            it.name = String(loc(it.name));
            if (i >= 4 && i < Game.dragonLevels.length - 3) {
                if (!EN)
                    it.action = loc(
                        'Train %1',
                        Game.dragonAuras[/** @type {keyof typeof Game.dragonAuras} */ (i - 3)].dname
                    ) + '<br><small>' + loc(
                        'Aura: %1', Game.dragonAuras[/** @type {keyof typeof Game.dragonAuras} */ (i - 3)].desc
                    ) + '</small>';
                if (i >= 5) {
                    it.costStr = (function (building) {
                        return function () {
                            return loc('%1 ' + building.bsingle, LBeautify(100));
                        };
                    })(Game.ObjectsById[i - 5]);
                    it.cost = (function (building) {
                        return function () {
                            return building.amount >= 100;
                        };
                    })(Game.ObjectsById[i - 5]);
                    it.buy = (function (building) {
                        return function () {
                            building.sacrifice(100);
                        };
                    })(Game.ObjectsById[i - 5]);
                }
            }
        }

        for (let i = 0; i < Game.AllMilks.length; i++) {
            Game.AllMilks[i].bname = Game.AllMilks[i].name;
            Game.AllMilks[i].name = String(loc(Game.AllMilks[i].name));
            Game.AllMilks[i].pic += '.png';
            if (Game.AllMilks[i].type == 0) {
                Game.AllMilks[i].rank = Game.Milks.length;
                Game.Milks.push(Game.AllMilks[i]);
            }
        }

        Game.killShimmers();

        Game.vanilla = 0; // everything we create beyond this will be saved in mod structures

        //! Game.launchMods(); -- see moddingapi.disabled.js

        //! Game.runModHook('create'); // declare custom upgrades/achievs/buffs/buildings here!

        BeautifyAll();

        if (!Game.LoadSave()) {
            // try to load the save when we open the page. if this fails, try to brute-force it half a second later
            setTimeout(function () {
                let local = localStorageGet(Game.SaveTo);
                Game.LoadSave(ASSERT_NOT_NULL(local));
            }, 500);
        } else
            setTimeout(function () {
                Game.LoadSave();
            }, 100);

        Game.ready = true;
        $('offGameMessage', true).innerHTML = '';
        $('offGameMessageWrap', true).style.display = 'none';
        Game.Loop();
        Game.Draw();

        if (!EN) {
            let adaptWidth = function (/** @type {HTMLElement} */ node) {
                const el = /** @type {HTMLElement} */(ASSERT_NOT_NULL(node.firstElementChild));
                const width = el.clientWidth / 95;
                if (el.classList.contains('subButton') && width > 1) {
                    el.style.padding = '6px 0px';
                }
                if (width > 1) {
                    el.style.fontSize = (Number.parseInt(window.getComputedStyle(el).fontSize) * 1) / width + 'px';
                    el.style.transform = 'scale(1,' + width + ')';
                }
            };
            ASSERT_NOT_NULL($('prefsButton', true).firstElementChild).innerHTML = locStr('Options');
            ASSERT_NOT_NULL($('statsButton', true).firstElementChild).innerHTML = locStr('Stats');
            ASSERT_NOT_NULL($('logButton', true).firstElementChild).innerHTML = locStr('Info');
            ASSERT_NOT_NULL($('legacyButton', true).firstElementChild).innerHTML = locStr('Legacy');
            adaptWidth($('prefsButton', true));
            adaptWidth($('statsButton', true));
            adaptWidth($('logButton', true));
            adaptWidth($('legacyButton', true));
            $('checkForUpdate', true).childNodes[0].textContent = locStr('New update!');
            $('buildingsTitle', true).childNodes[0].textContent = locStr('Buildings');
            $('storeTitle', true).childNodes[0].textContent = locStr('Store');
        }

        /* INIT ANCHOR */
    }

    /* =====================================================================================
    SAVE
    =======================================================================================*/
    static ExportSave() {
        Game.prefs.showBackupWarning = 0;
        Game.Prompt(
            '<id ExportSave><h3>' +
            loc('Export save') +
            '</h3><div class="block">' +
            loc('This is your save code.<br>Copy it and keep it somewhere safe!') +
            '</div><div class="block"><textarea id="textareaPrompt" style="width:100%;height:128px;" readonly>' +
            Game.WriteSave(1) +
            '</textarea></div>',
            [loc('All done!')]
        );
        $('textareaPrompt', true).focus();
        $('textareaPrompt', true).select();
    }
    /** @param {string} [def] */
    static ImportSave(def) {
        Game.Prompt(
            '<id ImportSave><h3>' +
            loc('Import save') +
            '</h3><div class="block">' +
            loc('Please paste in the code that was given to you on save export.') +
            '<div id="importError" class="warning" style="font-weight:bold;font-size:11px;"></div></div>' +
            '<div class="block"><textarea id="textareaPrompt" style="width:100%;height:128px;">' +
            (def || '') +
            '</textarea></div>',
            [
                [
                    loc('Load'),
                    'if ($(\'textareaPrompt\').value.length==0){return false;}if (Game.ImportSaveCode($(\'textareaPrompt\').value)){' +
                    'Game.ClosePrompt();}else{$(\'importError\').innerHTML=\'(\'+loc("Error importing save")+\')\';}'
                ],
                loc('Nevermind')
            ]
        );
        $('textareaPrompt', true).focus();
    }
    /** @param {string} save */
    static ImportSaveCode(save) {
        let out = false;
        if (save && save !== '') out = Game.LoadSave(save);
        return out;
    }

    static FileSave() {
        Game.prefs.showBackupWarning = 0;
        const filename = Game.bakeryName.replace(/[^\dA-Za-z]+/g, '') + 'Bakery';
        const text = Game.WriteSave(1);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${filename}.txt`);
    }
    /** @param {{ target: { files: string | any[]; }; }} e */
    static FileLoad(e) {
        if (e.target.files.length === 0) return false;
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.addEventListener('load', (e) => {
            Game.ImportSaveCode(/** @type {string} */(ASSERT_NOT_NULL(ASSERT_NOT_NULL(e.target).result)));
        });
        reader.readAsText(file);
        return true;
    }

    static toReload = false;
    static toSave = false;
    static toQuit = false;
    static isSaving = false; // true while we're saving, to block some behavior
    static lastSaveData = '';
    static saveData = '';
    /**
     * @param {number | undefined} [type] `undefined`=default, 1=return string only, 2=return uncompressed string, 3=return uncompressed, commented string
     */
    static WriteSave(type) {
        Game.toSave = false;
        Game.lastDate = Game.time;
        let str = '';
        if (type === 3) str += '\nGame version\n';
        str += Game.version + '|';
        str += '|'; // just in case we need some more stuff here
        if (type === 3) str += '\n\nRun details';
        str += // save stats
            (type === 3 ? '\n\trun start date : ' : '') + Game.startDate + ';' +
            (type === 3 ? '\n\tlegacy start date : ' : '') + Game.fullDate + ';' +
            (type === 3 ? '\n\tdate when we last opened the game : ' : '') + Game.lastDate + ';' +
            (type === 3 ? '\n\tbakery name : ' : '') + Game.bakeryName + ';' +
            (type === 3 ? '\n\tseed : ' : '') + Game.seed + '|';
        if (type === 3) str += '\n\nPacked preferences bitfield\n\t';
        let str2 = // prefs
            (Game.prefs.particles ? '1' : '0') +
            (Game.prefs.numbers ? '1' : '0') +
            (Game.prefs.autosave ? '1' : '0') +
            (Game.prefs.autoupdate ? '1' : '0') +
            (Game.prefs.milk ? '1' : '0') +
            (Game.prefs.fancy ? '1' : '0') +
            (Game.prefs.warn ? '1' : '0') +
            (Game.prefs.cursors ? '1' : '0') +
            (Game.prefs.focus ? '1' : '0') +
            (Game.prefs.format ? '1' : '0') +
            (Game.prefs.notifs ? '1' : '0') +
            (Game.prefs.wobbly ? '1' : '0') +
            (Game.prefs.monospace ? '1' : '0') +
            (Game.prefs.filters ? '1' : '0') +
            (Game.prefs.cookiesound ? '1' : '0') +
            (Game.prefs.crates ? '1' : '0') +
            (Game.prefs.showBackupWarning ? '1' : '0') +
            (Game.prefs.extraButtons ? '1' : '0') +
            (Game.prefs.askLumps ? '1' : '0') +
            (Game.prefs.customGrandmas ? '1' : '0') +
            (Game.prefs.timeout ? '1' : '0') +
            (Game.prefs.cloudSave ? '1' : '0') +
            (Game.prefs.bgMusic ? '1' : '0') +
            (Game.prefs.notScary ? '1' : '0') +
            (Game.prefs.fullscreen ? '1' : '0') +
            (Game.prefs.screenreader ? '1' : '0') +
            (Game.prefs.discordPresence ? '1' : '0') +
            '';
        str += str2 + '|';
        if (type === 3) str += '\n\nMisc game data';
        str +=
            (type === 3 ? '\n\tcookies : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.cookies).toString() + ';' +
            (type === 3 ? '\n\ttotal cookies earned : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.cookiesEarned).toString() + ';' +
            (type === 3 ? '\n\tcookie clicks : ' : '') +
            Number.parseInt(Math.floor(Game.cookieClicks).toString()) + ';' +
            (type === 3 ? '\n\tgolden cookie clicks : ' : '') +
            Number.parseInt(Math.floor(Game.goldenClicks).toString()) + ';' +
            (type === 3 ? '\n\tcookies made by clicking : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.handmadeCookies).toString() + ';' +
            (type === 3 ? '\n\tgolden cookies missed : ' : '') +
            Number.parseInt(Math.floor(Game.missedGoldenClicks).toString()) + ';' +
            (type === 3 ? '\n\tbackground type : ' : '') +
            Number.parseInt(Math.floor(Game.bgType).toString()) + ';' +
            (type === 3 ? '\n\tmilk type : ' : '') +
            Number.parseInt(Math.floor(Game.milkType).toString()) + ';' +
            (type === 3 ? '\n\tcookies from past runs : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.cookiesReset).toString() + ';' +
            (type === 3 ? '\n\telder wrath : ' : '') +
            Number.parseInt(Math.floor(Game.elderWrath).toString()) + ';' +
            (type === 3 ? '\n\tpledges : ' : '') +
            Number.parseInt(Math.floor(Game.pledges).toString()) + ';' +
            (type === 3 ? '\n\tpledge time left : ' : '') +
            Number.parseInt(Math.floor(Game.pledgeT).toString()) + ';' +
            (type === 3 ? '\n\tcurrently researching : ' : '') +
            Number.parseInt(Math.floor(Game.nextResearch).toString()) + ';' +
            (type === 3 ? '\n\tresearch time left : ' : '') +
            Number.parseInt(Math.floor(Game.researchT).toString()) + ';' +
            (type === 3 ? '\n\tascensions : ' : '') +
            Number.parseInt(Math.floor(Game.resets).toString()) + ';' +
            (type === 3 ? '\n\tgolden cookie clicks (this run) : ' : '') +
            Number.parseInt(Math.floor(Game.goldenClicksLocal).toString()) + ';' +
            (type === 3 ? '\n\tcookies sucked by wrinklers : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.cookiesSucked).toString() + ';' +
            (type === 3 ? '\n\twrinkles popped : ' : '') +
            Number.parseInt(Math.floor(Game.wrinklersPopped).toString()) + ';' +
            (type === 3 ? '\n\tsanta level : ' : '') +
            Number.parseInt(Math.floor(Game.santaLevel).toString()) + ';' +
            (type === 3 ? '\n\treindeer clicked : ' : '') +
            Number.parseInt(Math.floor(Game.reindeerClicked).toString()) + ';' +
            (type === 3 ? '\n\tseason time left : ' : '') +
            Number.parseInt(Math.floor(Game.seasonT).toString()) + ';' +
            (type === 3 ? '\n\tseason switcher uses : ' : '') +
            Number.parseInt(Math.floor(Game.seasonUses).toString()) + ';' +
            (type === 3 ? '\n\tcurrent season : ' : '') +
            (Game.season || '') + ';';
        let wrinklers = Game.SaveWrinklers();
        str +=
            (type === 3 ? '\n\tamount of cookies contained in wrinklers : ' : '') +
            Number.parseFloat(Math.floor(wrinklers.amount).toString()) + ';' +
            (type === 3 ? '\n\tnumber of wrinklers : ' : '') +
            Number.parseInt(Math.floor(wrinklers.number).toString()) + ';' +
            (type === 3 ? '\n\tprestige level : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.prestige).toString() + ';' +
            (type === 3 ? '\n\theavenly chips : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.heavenlyChips).toString() + ';' +
            (type === 3 ? '\n\theavenly chips spent : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.heavenlyChipsSpent).toString() + ';' +
            (type === 3 ? '\n\theavenly cookies : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.heavenlyCookies).toString() + ';' +
            (type === 3 ? '\n\tascension mode : ' : '') +
            Number.parseInt(Math.floor(Game.ascensionMode).toString()) + ';' +
            (type === 3 ? '\n\tpermanent upgrades : ' : '') +
            Number.parseInt(Math.floor(Game.permanentUpgrades[0]).toString()) + ';' +
            Number.parseInt(Math.floor(Game.permanentUpgrades[1]).toString()) + ';' +
            Number.parseInt(Math.floor(Game.permanentUpgrades[2]).toString()) + ';' +
            Number.parseInt(Math.floor(Game.permanentUpgrades[3]).toString()) + ';' +
            Number.parseInt(Math.floor(Game.permanentUpgrades[4]).toString()) + ';' +
            (type === 3 ? '\n\tdragon level : ' : '') +
            Number.parseInt(Math.floor(Game.dragonLevel).toString()) + ';' +
            (type === 3 ? '\n\tdragon aura : ' : '') +
            Number.parseInt(Math.floor(Game.dragonAura).toString()) + ';' +
            (type === 3 ? '\n\tdragon aura 2 : ' : '') +
            Number.parseInt(Math.floor(Game.dragonAura2).toString()) + ';' +
            (type === 3 ? '\n\tchime type : ' : '') +
            Number.parseInt(Math.floor(Game.chimeType).toString()) + ';' +
            (type === 3 ? '\n\tvolume : ' : '') +
            Number.parseInt(Math.floor(Game.volume).toString()) + ';' +
            (type === 3 ? '\n\tnumber of shiny wrinklers : ' : '') +
            Number.parseInt(Math.floor(wrinklers.shinies).toString()) + ';' +
            (type === 3 ? '\n\tamount of cookies contained in shiny wrinklers : ' : '') +
            Number.parseFloat(Math.floor(wrinklers.amountShinies).toString()) + ';' +
            (type === 3 ? '\n\tcurrent amount of sugar lumps : ' : '') +
            Number.parseFloat(Math.floor(Game.lumps).toString()) + ';' +
            (type === 3 ? '\n\ttotal amount of sugar lumps made : ' : '') +
            Number.parseFloat(Math.floor(Game.lumpsTotal).toString()) + ';' +
            (type === 3 ? '\n\ttime when current sugar lump started : ' : '') +
            Number.parseFloat(Math.floor(Game.lumpT).toString()) + ';' +
            (type === 3 ? '\n\ttime when last refilled a minigame with a sugar lump : ' : '') +
            Number.parseFloat(Math.floor(Game.lumpRefill).toString()) + ';' +
            (type === 3 ? '\n\tsugar lump type : ' : '') +
            Number.parseInt(Math.floor(Game.lumpCurrentType).toString()) + ';' +
            (type === 3 ? '\n\tvault : ' : '') +
            Game.vault.join(',') + ';' +
            (type === 3 ? '\n\theralds : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseInt(Game.heralds) + ';' +
            (type === 3 ? '\n\tgolden cookie fortune : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseInt(Game.fortuneGC) + ';' +
            (type === 3 ? '\n\tCpS fortune : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseInt(Game.fortuneCPS) + ';' +
            (type === 3 ? '\n\thighest raw CpS : ' : '') +
            // @ts-expect-error likely useless parse but cant be sure yet
            Number.parseFloat(Game.cookiesPsRawHighest) + ';' +
            (type === 3 ? '\n\tmusic volume : ' : '') +
            Number.parseInt(Math.floor(Game.volumeMusic).toString()) + ';' +
            '|'; // cookies and lots of other stuff

        if (type === 3) str += '\n\nBuildings : amount, bought, cookies produced, level, minigame data';
        for (let i in Game.Objects) {
            // buildings
            const me = Game.Objects[i];
            if (type == 3) str += '\n\t' + me.name + ' : ';
            if (me.vanilla) {
                str += me.amount + ',' + me.bought + ',' + Math.floor(me.totalCookies) + ',' + Number.parseInt(String(me.level));
                str += Game.isMinigameReady(me) ? ',' + ASSERT_NOT_NULL(me.minigame).save() : ',' + (me.minigameSave || '');
                str += ',' + (me.muted ? '1' : '0');
                str += ',' + me.highest;
                str += ';';
            }
        }
        str += '|';
        if (type === 3) str += '\n\nPacked upgrades bitfield (unlocked and bought)\n\t';
        let toCompress = [];
        for (let i in Game.UpgradesById) {
            // upgrades
            const me = Game.UpgradesById[i];
            if (me.vanilla) toCompress.push(Math.min(me.unlocked, 1), Math.min(me.bought, 1));
        }

        // @ts-expect-error sigh
        toCompress = toCompress.join('');

        str += toCompress;
        str += '|';
        if (type === 3) str += '\n\nPacked achievements bitfield (won)\n\t';
        toCompress = [];
        for (let i in Game.AchievementsById) {
            // achievements
            const me = Game.AchievementsById[i];
            if (me.vanilla) toCompress.push(Math.min(me.won));
        }
        // @ts-expect-error sigh
        toCompress = toCompress.join('');
        str += toCompress;

        str += '|';
        if (type === 3) str += '\n\nBuffs : type, maxTime, time, arg1, arg2, arg3';
        for (let i in Game.buffs) {
            const me = Game.buffs[i];
            if (me.type) {
                if (type === 3) str += '\n\t' + me.type.name + ' : ';
                if (me.type.vanilla) {
                    str += me.type.id + ',' + me.maxTime + ',' + me.time;
                    if (me.arg1 !== undefined) str += ',' + Number.parseFloat(me.arg1);
                    if (me.arg2 !== undefined) str += ',' + Number.parseFloat(me.arg2);
                    if (me.arg3 !== undefined) str += ',' + Number.parseFloat(me.arg3);
                    str += ';';
                }
            }
        }

        if (type === 3) str += '\n\nCustom :\n';

        str += '|';
        //! str += Game.saveModData(); -- see moddingapi.disabled.js

        Game.lastSaveData = str;

        if (type === 2 || type === 3) return str;
        else if (type === 1) {
            str = encodeURIComponent(utf8_to_b64(str) + '!END!');
            return str;
        } else {
            if (Game.useLocalStorage) {
                // so we used to save the game using browser cookies, which was just really neat considering the game's name
                // we're using localstorage now, which is more efficient but not as cool
                // a moment of silence for our fallen puns
                str = utf8_to_b64(str) + '!END!';
                if (str.length < 10) {
                    Game.Notify(
                        'Saving failed!',
                        'Purchasing an upgrade and saving again might fix this.<br>' +
                        'This really shouldn\'t happen; please notify Orteil on his tumblr.'
                    );
                    return str; //? this should throw an error really but for now this will do
                } else {
                    str = encodeURIComponent(str);
                    localStorageSet(Game.SaveTo, str); // aaand save
                    if (!localStorageGet(Game.SaveTo)) {
                        Game.Notify(loc('Error while saving'), loc('Export your save instead!'));
                    } else if (document.hasFocus()) {
                        Game.Notify(loc('Game saved'), '', '', 1, 1);
                    }
                    return str;
                }
            } // legacy system
            else {
                // that's right
                // we're using cookies
                // yeah I went there
                const now = new Date(); // we storin dis for 5 years, people
                now.setFullYear(now.getFullYear() + 5); // mmh stale cookies
                str = utf8_to_b64(str) + '!END!';
                Game.saveData = encodeURIComponent(str);
                str = Game.SaveTo + '=' + encodeURIComponent(str) + '; expires=' + now.toUTCString() + ';';
                // eslint-disable-next-line unicorn/no-document-cookie
                document.cookie = str; // aaand save
                if (!document.cookie.includes(Game.SaveTo)) {
                    Game.Notify(loc('Error while saving'), loc('Export your save instead!'), '', 0, 1);
                } else if (document.hasFocus()) {
                    Game.Notify(loc('Game saved'), '', '', 1, 1);
                }
                return str;
            }
        }
    }

    /* =====================================================================================
    LOAD
    =======================================================================================*/
    static TOYS = false;
    static WINKLERS = false;
    static salvageSave() {
        // for when Cookie Clicker won't load and you need your save
        console.log('===================================================');
        console.log('This is your save data. Copypaste it (without quotation marks) into another version using the "Import save" feature.');
        console.log(localStorageGet(Game.SaveTo));
    }
    /**
     * @param {string} [data]
     * @param {boolean} [ignoreVersionIssues]
     */
    static LoadSave(data, ignoreVersionIssues) {
        let str = '';
        if (data !== undefined) str = decode(data);
        else {
            if (Game.useLocalStorage) {
                let local = localStorageGet(Game.SaveTo);
                if (!local) {
                    // no localstorage save found? let's get the cookie one last time
                    if (document.cookie.includes(Game.SaveTo)) {
                        str = decode(document.cookie.split(Game.SaveTo + '=')[1]);
                        // eslint-disable-next-line unicorn/no-document-cookie
                        document.cookie = Game.SaveTo + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    } else return false;
                } else {
                    str = decode(String(local));
                }
            } // legacy system
            else {
                if (document.cookie.includes(Game.SaveTo)) str = decode(document.cookie.split(Game.SaveTo + '=')[1]);
                // get cookie here
                else return false;
            }
        }
        if (str != '') {
            let version = 0;
            let oldstr = str.split('|');
            if (oldstr[0].length === 0) return false;
            else {
                str = str.split('!END!')[0];
                str = b64_to_utf8(str);
            }
            if (str == '') return false;
            else {
                let spl = '';
                // @ts-expect-error //! Need to refactor this variable
                str = str.split('|');
                version = Number.parseFloat(str[0]);
                Game.loadedFromVersion = version;

                if (Number.isNaN(version) || str.length < 5) {
                    Game.Notify(loc('Error importing save'), loc('Oops, looks like the import string is all wrong!'), '', 6, 1);
                    return false;
                }
                if (version >= 1 && version > Game.version) {
                    if (ignoreVersionIssues) Game.Notify('Retrieving save from a future version.', 'That\'s...odd.', '', 0, 1);
                    else {
                        Game.Notify(
                            loc('Error importing save'),
                            loc('You are attempting to load a save from a future version (v. %1; you are using v. %2).', [version, Game.version]),
                            '',
                            6,
                            1
                        );
                        return false;
                    }
                }
                let actualHeralds;
                if (version >= 1) {
                    Game.T = 0;

                    // @ts-expect-error //! refactor needed
                    spl = str[2].split(';'); // save stats
                    Game.startDate = Number.parseInt(spl[0]);
                    Game.fullDate = Number.parseInt(spl[1]);
                    Game.lastDate = Number.parseInt(spl[2]);
                    let bakeryName = spl[3] || Game.GetBakeryName();
                    Game.seed = spl[4] || Game.makeSeed();
                    // prefs
                    // @ts-expect-error //! refactor needed
                    spl = [...str[3]];
                    Game.prefs.particles = Number.parseInt(spl[0]);
                    Game.prefs.numbers = Number.parseInt(spl[1]);
                    Game.prefs.autosave = Number.parseInt(spl[2]);
                    Game.prefs.autoupdate = spl[3] ? Number.parseInt(spl[3]) : 1;
                    Game.prefs.milk = spl[4] ? Number.parseInt(spl[4]) : 1;
                    Game.prefs.fancy = Number.parseInt(spl[5]);
                    if (Game.prefs.fancy) Game.removeClass('noFancy');
                    else if (!Game.prefs.fancy) Game.addClass('noFancy');
                    Game.prefs.warn = spl[6] ? Number.parseInt(spl[6]) : 0;
                    Game.prefs.cursors = spl[7] ? Number.parseInt(spl[7]) : 0;
                    Game.prefs.focus = spl[8] ? Number.parseInt(spl[8]) : 0;
                    Game.prefs.format = spl[9] ? Number.parseInt(spl[9]) : 0;
                    Game.prefs.notifs = spl[10] ? Number.parseInt(spl[10]) : 0;
                    Game.prefs.wobbly = spl[11] ? Number.parseInt(spl[11]) : 0;
                    Game.prefs.monospace = spl[12] ? Number.parseInt(spl[12]) : 0;
                    Game.prefs.filters = spl[13] ? Number.parseInt(spl[13]) : 1;
                    if (Game.prefs.filters) Game.removeClass('noFilters');
                    else if (!Game.prefs.filters) Game.addClass('noFilters');
                    Game.prefs.cookiesound = spl[14] ? Number.parseInt(spl[14]) : 1;
                    Game.prefs.crates = spl[15] ? Number.parseInt(spl[15]) : 0;
                    Game.prefs.showBackupWarning = spl[16] ? Number.parseInt(spl[16]) : 1;
                    Game.prefs.extraButtons = spl[17] ? Number.parseInt(spl[17]) : 1;
                    if (!Game.prefs.extraButtons) Game.removeClass('extraButtons');
                    else if (Game.prefs.extraButtons) Game.addClass('extraButtons');
                    Game.prefs.askLumps = spl[18] ? Number.parseInt(spl[18]) : 0;
                    Game.prefs.customGrandmas = spl[19] ? Number.parseInt(spl[19]) : 1;
                    Game.prefs.timeout = spl[20] ? Number.parseInt(spl[20]) : 0;
                    Game.prefs.cloudSave = spl[21] ? Number.parseInt(spl[21]) : 1;
                    Game.prefs.bgMusic = spl[22] ? Number.parseInt(spl[22]) : 1;
                    Game.prefs.notScary = spl[23] ? Number.parseInt(spl[23]) : 0;
                    Game.prefs.fullscreen = spl[24] ? Number.parseInt(spl[24]) : 0;
                    Game.prefs.screenreader = spl[25] ? Number.parseInt(spl[25]) : 0;
                    Game.prefs.discordPresence = spl[26] ? Number.parseInt(spl[26]) : 1;
                    BeautifyAll();
                    // @ts-expect-error //! refactor needed
                    spl = str[4].split(';'); // cookies and lots of other stuff
                    Game.cookies = Number.parseFloat(spl[0]);
                    Game.cookiesEarned = Number.parseFloat(spl[1]);
                    Game.cookieClicks = spl[2] ? Number.parseInt(spl[2]) : 0;
                    Game.goldenClicks = spl[3] ? Number.parseInt(spl[3]) : 0;
                    Game.handmadeCookies = spl[4] ? Number.parseFloat(spl[4]) : 0;
                    Game.missedGoldenClicks = spl[5] ? Number.parseInt(spl[5]) : 0;
                    Game.bgType = spl[6] ? Number.parseInt(spl[6]) : 0;
                    Game.milkType = spl[7] ? Number.parseInt(spl[7]) : 0;
                    Game.cookiesReset = spl[8] ? Number.parseFloat(spl[8]) : 0;
                    Game.elderWrath = spl[9] ? Number.parseInt(spl[9]) : 0;
                    Game.pledges = spl[10] ? Number.parseInt(spl[10]) : 0;
                    Game.pledgeT = spl[11] ? Number.parseInt(spl[11]) : 0;
                    Game.nextResearch = spl[12] ? Number.parseInt(spl[12]) : 0;
                    Game.researchT = spl[13] ? Number.parseInt(spl[13]) : 0;
                    Game.resets = spl[14] ? Number.parseInt(spl[14]) : 0;
                    Game.goldenClicksLocal = spl[15] ? Number.parseInt(spl[15]) : 0;
                    Game.cookiesSucked = spl[16] ? Number.parseFloat(spl[16]) : 0;
                    Game.wrinklersPopped = spl[17] ? Number.parseInt(spl[17]) : 0;
                    Game.santaLevel = spl[18] ? Number.parseInt(spl[18]) : 0;
                    Game.reindeerClicked = spl[19] ? Number.parseInt(spl[19]) : 0;
                    Game.seasonT = spl[20] ? Number.parseInt(spl[20]) : 0;
                    Game.seasonUses = spl[21] ? Number.parseInt(spl[21]) : 0;
                    // @ts-expect-error just... no
                    Game.season = spl[22] || Game.baseSeason;
                    let wrinklers = {
                        amount: spl[23] ? Number.parseFloat(spl[23]) : 0,
                        number: spl[24] ? Number.parseInt(spl[24]) : 0,
                        shinies: 0, amountShinies: 0
                    };
                    Game.prestige = spl[25] ? Number.parseFloat(spl[25]) : 0;
                    Game.heavenlyChips = spl[26] ? Number.parseFloat(spl[26]) : 0;
                    Game.heavenlyChipsSpent = spl[27] ? Number.parseFloat(spl[27]) : 0;
                    Game.heavenlyCookies = spl[28] ? Number.parseFloat(spl[28]) : 0;
                    // @ts-expect-error gah
                    Game.ascensionMode = spl[29] ? Number.parseInt(spl[29]) : 0;
                    Game.permanentUpgrades[0] = spl[30] ? Number.parseInt(spl[30]) : -1;
                    Game.permanentUpgrades[1] = spl[31] ? Number.parseInt(spl[31]) : -1;
                    Game.permanentUpgrades[2] = spl[32] ? Number.parseInt(spl[32]) : -1;
                    Game.permanentUpgrades[3] = spl[33] ? Number.parseInt(spl[33]) : -1;
                    Game.permanentUpgrades[4] = spl[34] ? Number.parseInt(spl[34]) : -1;
                    Game.dragonLevel = spl[35] ? Number.parseInt(spl[35]) : 0;
                    // @ts-expect-error oh my pain
                    Game.dragonAura = spl[36] ? Number.parseInt(spl[36]) : 0;
                    // @ts-expect-error again
                    Game.dragonAura2 = spl[37] ? Number.parseInt(spl[37]) : 0;
                    Game.chimeType = spl[38] ? Number.parseInt(spl[38]) : 0;
                    Game.volume = spl[39] ? Number.parseInt(spl[39]) : 75;
                    wrinklers.shinies = spl[40] ? Number.parseInt(spl[40]) : 0;
                    wrinklers.amountShinies = spl[41] ? Number.parseFloat(spl[41]) : 0;
                    Game.lumps = spl[42] ? Number.parseFloat(spl[42]) : -1;
                    Game.lumpsTotal = spl[43] ? Number.parseFloat(spl[43]) : -1;
                    Game.lumpT = spl[44] ? Number.parseInt(spl[44]) : Date.now();
                    Game.lumpRefill = spl[45] ? Number.parseInt(spl[45]) : 0;
                    Game.lumpCurrentType = spl[46] ? Number.parseInt(spl[46]) : 0;
                    // @ts-expect-error dont know dont care
                    Game.vault = spl[47] ? spl[47].split(',') : [];
                    for (let i in Game.vault) {
                        // @ts-expect-error this hurts
                        Game.vault[i] = Number.parseInt(Game.vault[i]);
                    }
                    // we store the actual amount of heralds to restore it later
                    // here we used the amount present in the save to compute offline CpS
                    actualHeralds = Game.heralds;
                    Game.heralds = spl[48] ? Number.parseFloat(spl[48]) : Game.heralds;
                    Game.fortuneGC = spl[49] ? Number.parseInt(spl[49]) : 0;
                    Game.fortuneCPS = spl[50] ? Number.parseInt(spl[50]) : 0;
                    Game.cookiesPsRawHighest = spl[51] ? Number.parseFloat(spl[51]) : 0;
                    Game.volumeMusic = spl[52] ? Number.parseInt(spl[52]) : 50;

                    // @ts-expect-error //! refactor needed
                    spl = str[5].split(';'); // buildings
                    Game.BuildingsOwned = 0;
                    let me_i = 0;
                    for (const me of Game.ObjectsById) {
                        me.switchMinigame(false);
                        me.pics = [];
                        if (spl[me_i]) {
                            let mestr = spl[me_i].toString().split(',');
                            me.amount = Number.parseInt(mestr[0]);
                            me.bought = Number.parseInt(mestr[1]);
                            me.totalCookies = Number.parseFloat(mestr[2]);
                            me.level = Number.parseInt(mestr[3] || '0');
                            me.highest = version >= 2.024 ? Number.parseInt(mestr[6]) : me.amount;
                            if (me.minigame && me.minigameLoaded && me.minigame.reset) {
                                me.minigame.reset(true);
                                me.minigame.load(mestr[4] || '');
                            } else me.minigameSave = mestr[4] || 0;
                            me.muted = Boolean(Number.parseInt(mestr[5]) || 0);
                            Game.BuildingsOwned += me.amount;
                        } else {
                            me.amount = 0;
                            me.unlocked = 0;
                            me.bought = 0;
                            me.highest = 0;
                            me.totalCookies = 0;
                            me.level = 0;
                        }
                        me_i++;
                    }

                    Game.setVolumeMusic(Game.volumeMusic);

                    Game.LoadMinigames();

                    // @ts-expect-error //! refactor needed
                    spl = str[6] || []; // upgrades
                    // @ts-expect-error //! sigh...
                    spl = [...spl];
                    Game.UpgradesOwned = 0;
                    for (let i in Game.UpgradesById) {
                        const me = Game.UpgradesById[i];
                        // @ts-expect-error //! sigh x2
                        if (spl[i * 2]) {
                            // @ts-expect-error //! i dont even know anymore
                            let mestr = [spl[i * 2], spl[i * 2 + 1]];
                            me.unlocked = Number.parseInt(mestr[0]);
                            me.bought = Number.parseInt(mestr[1]);
                            if (me.bought && Game.CountsAsUpgradeOwned(me.pool)) Game.UpgradesOwned++;
                        } else {
                            me.unlocked = 0;
                            me.bought = 0;
                        }
                    }
                    // @ts-expect-error //! refactor...
                    spl = str[7] || []; // achievements
                    // @ts-expect-error //! ...
                    spl = [...spl];
                    Game.AchievementsOwned = 0;
                    for (let i in Game.AchievementsById) {
                        const me = Game.AchievementsById[i];
                        if (spl[Number(i)]) {
                            const mestr = [spl[Number(i)]];
                            me.won = Number.parseInt(mestr[0]);
                        } else {
                            me.won = 0;
                        }
                        if (me.won && Game.CountsAsAchievementOwned(me.pool)) Game.AchievementsOwned++;
                    }

                    Game.killBuffs();
                    let buffsToLoad = [];
                    // @ts-expect-error //! refactor this
                    spl = (str[8] || '').split(';'); // buffs
                    // @ts-expect-error //! same
                    for (let i in spl) {
                        if (spl[i]) {
                            let mestr = spl[i].toString().split(',');
                            buffsToLoad.push(mestr);
                        }
                    }

                    //! see moddingapi.disabled.js
                    //! spl = (str[9] || '').split(';'); // mod data
                    //! for (let i in spl) {
                    //!     if (spl[i]) {
                    //!         let data = spl[i].split(':');
                    //!         let modId = data[0];
                    //!         if (modId == 'META') continue;
                    //!         data.shift();
                    //!         data = Game.safeLoadString(data.join(':'));
                    //!         Game.modSaveData[modId] = data;
                    //!     }
                    //! }

                    for (const me of Game.ObjectsById) {
                        if (me.buyFunction) me.buyFunction(me);
                        me.refresh();
                        if (me.id > 0 && me.muted) me.mute(1);
                    }

                    if (Game.bgType == -1) Game.bgType = 0;
                    if (Game.milkType == -1 || !Game.AllMilks[Game.milkType]) Game.milkType = 0;

                    // advance timers
                    let framesElapsed = Math.ceil(((Date.now() - Game.lastDate) / 1000) * Game.fps);
                    if (Game.pledgeT > 0) Game.pledgeT = Math.max(Game.pledgeT - framesElapsed, 1);
                    if (Game.seasonT > 0) Game.seasonT = Math.max(Game.seasonT - framesElapsed, 1);
                    if (Game.researchT > 0) Game.researchT = Math.max(Game.researchT - framesElapsed, 1);

                    Game.ResetWrinklers();
                    Game.LoadWrinklers(wrinklers.amount, wrinklers.number, wrinklers.shinies, wrinklers.amountShinies);

                    // recompute season trigger prices
                    if (Game.Has('Season switcher')) {
                        for (let i in Game.seasons) {
                            if (i === '') continue;
                            Game.Unlock(Game.seasons[/** @type {keyof typeof Game.seasons} */(i)].trigger);
                        }
                    }
                    Game.computeSeasonPrices();

                    // recompute prestige
                    Game.prestige = Math.floor(Game.HowMuchPrestige(Game.cookiesReset));

                    Game.bakeryNameSet(bakeryName);

                    //! Game.loadModData(); -- see moddingapi.disabled.js

                    if (Game.ascensionMode !== 1) {
                        if (Game.Has('Starter kit')) Game.Objects['Cursor'].free = 10;
                        if (Game.Has('Starter kitchen')) Game.Objects['Grandma'].free = 5;
                    }

                    Game.CalculateGains();

                    let timeOffline = (Date.now() - Game.lastDate) / 1000;

                    if (Math.random() < 1 / 10000) Game.TOYS = true; // teehee!
                    if (Math.random() < 1 / 10000) Game.WINKLERS = true; // squeak

                    // compute cookies earned while the game was closed
                    if (Game.mobile || Game.Has('Perfect idling') || Game.Has('Twin Gates of Transcendence')) {
                        let maxTime, percent;
                        if (Game.Has('Perfect idling')) {
                            maxTime = 60 * 60 * 24 * 1000000000;
                            percent = 100;
                        } else {
                            maxTime = 60 * 60;
                            if (Game.Has('Belphegor')) maxTime *= 2;
                            if (Game.Has('Mammon')) maxTime *= 2;
                            if (Game.Has('Abaddon')) maxTime *= 2;
                            if (Game.Has('Satan')) maxTime *= 2;
                            if (Game.Has('Asmodeus')) maxTime *= 2;
                            if (Game.Has('Beelzebub')) maxTime *= 2;
                            if (Game.Has('Lucifer')) maxTime *= 2;

                            percent = 5;
                            if (Game.Has('Angels')) percent += 10;
                            if (Game.Has('Archangels')) percent += 10;
                            if (Game.Has('Virtues')) percent += 10;
                            if (Game.Has('Dominions')) percent += 10;
                            if (Game.Has('Cherubim')) percent += 10;
                            if (Game.Has('Seraphim')) percent += 10;
                            if (Game.Has('God')) percent += 10;

                            if (Game.Has('Chimera')) {
                                maxTime += 60 * 60 * 24 * 2;
                                percent += 5;
                            }

                            if (Game.Has('Fern tea')) percent += 3;
                            if (Game.Has('Ichor syrup')) percent += 7;
                            if (Game.Has('Fortune #102')) percent += 1;
                        }

                        let timeOfflineOptimal = Math.min(timeOffline, maxTime);
                        let timeOfflineReduced = Math.max(0, timeOffline - timeOfflineOptimal);
                        let amount = (timeOfflineOptimal + timeOfflineReduced * 0.1) * Game.cookiesPs * (percent / 100);

                        if (amount > 0) {
                            Game.Notify(
                                loc('Welcome back!'),
                                loc('You earned <b>%1</b> while you were away.', loc('%1 cookie', LBeautify(amount))) +
                                (EN
                                    ? '<br>(' +
                                    Game.sayTime(timeOfflineOptimal * Game.fps, -1) +
                                    ' at ' +
                                    Math.floor(percent) +
                                    '% CpS' +
                                    (timeOfflineReduced
                                        ? ', plus ' + Game.sayTime(timeOfflineReduced * Game.fps, -1) + ' at ' + Math.floor(percent * 10) / 100 + '%'
                                        : '') +
                                    '.)'
                                    : ''),
                                [Math.floor(Math.random() * 16), 11]
                            );
                            Game.Earn(amount);
                        }
                    }

                    // we load buffs after everything as we do not want them to interfer with offline CpS
                    for (let i in buffsToLoad) {
                        let mestr = buffsToLoad[i];
                        let type = Game.buffTypes[Number.parseInt(mestr[0])];
                        Game.gainBuff(
                            type.name,
                            Number.parseFloat(mestr[1]) / Game.fps,
                            Number.parseFloat(mestr[3] || '0'),
                            Number.parseFloat(mestr[4] || '0'),
                            Number.parseFloat(mestr[5] || '0')
                        ).time = Number.parseFloat(mestr[2]);
                    }

                    Game.loadLumps();

                    Game.bakeryNameRefresh();
                } // importing old version save
                else {
                    Game.Notify(loc('Error importing save'), loc('Sorry, you can\'t import saves from the classic version.'), '', 6, 1);
                    return false;
                }

                if (Game.prefs.screenreader) {
                    Game.BuildStore();
                }

                Game.RebuildUpgrades();

                Game.TickerAge = 0;
                Game.TickerEffect = 0;

                Game.elderWrathD = 0;
                Game.recalculateGains = 1;
                Game.storeToRefresh = 1;
                Game.upgradesToRebuild = 1;

                Game.buyBulk = 1;
                Game.buyMode = 1;
                Game.storeBulkButton(-1);

                Game.specialTab = '';
                Game.ToggleSpecialMenu(0);

                Game.killShimmers();

                if (Game.T > Game.fps * 5 && Game.ReincarnateTimer == 0) {
                    // fade out of black and pop the cookie
                    Game.ReincarnateTimer = 1;
                    Game.addClass('reincarnating');
                    Game.BigCookieSize = 0;
                }

                let prestigeUpgradesOwned = 0;
                for (let i in Game.Upgrades) {
                    if (Game.Upgrades[i].bought && Game.Upgrades[i].pool == 'prestige') prestigeUpgradesOwned++;
                }
                if (prestigeUpgradesOwned >= 100) Game.Win('All the stars in heaven');

                if (version < Game.version) $('logButton', true).classList.add('hasUpdate');

                if (Game.season != '' && Game.season == Game.baseSeason) {
                    if (Game.season == 'valentines')
                        Game.Notify(
                            loc('Valentine\'s Day!'),
                            loc('It\'s <b>Valentine\'s season</b>!<br>Love\'s in the air and cookies are just that much sweeter!'),
                            [20, 3],
                            60 * 3
                        );
                    else if (Game.season == 'fools')
                        Game.Notify(
                            loc('Business Day!'),
                            loc('It\'s <b>Business season</b>!<br>Don\'t panic! Things are gonna be looking a little more corporate for a few days.'),
                            [17, 6],
                            60 * 3
                        );
                    else if (Game.season == 'halloween')
                        Game.Notify(loc('Halloween!'), loc('It\'s <b>Halloween season</b>!<br>Everything is just a little bit spookier!'), [13, 8], 60 * 3);
                    else if (Game.season == 'christmas')
                        Game.Notify(
                            loc('Christmas time!'),
                            loc('It\'s <b>Christmas season</b>!<br>Bring good cheer to all and you just may get cookies in your stockings!'),
                            [12, 10],
                            60 * 3
                        );
                    else if (Game.season == 'easter')
                        Game.Notify(
                            loc('Easter!'),
                            loc('It\'s <b>Easter season</b>!<br>Keep an eye out and you just might click a rabbit or two!'),
                            [0, 12],
                            60 * 3
                        );
                }

                Game.heralds = actualHeralds;

                Game.Notify(loc('Game loaded'), '', '', 1, 1);

                if (Game.prefs.showBackupWarning === 1) Game.showBackupWarning();
            }
        } else return false;
        return true;
    }

    /* =====================================================================================
    RESET
    =======================================================================================*/
    static choiceSelectorOn = -1;
    /**
     * @param {boolean=} hard
     */
    static Reset(hard = false) {
        Game.T = 0;

        if (hard) Game.loadedFromVersion = Game.version;

        const cookiesForfeited = Game.cookiesEarned;
        if (!hard) {
            if (cookiesForfeited >= 1e+6) Game.Win('Sacrifice');
            if (cookiesForfeited >= 1e+9) Game.Win('Oblivion');
            if (cookiesForfeited >= 1e+12) Game.Win('From scratch');
            if (cookiesForfeited >= 1e+15) Game.Win('Nihilism');
            if (cookiesForfeited >= 1e+18) Game.Win('Dematerialize');
            if (cookiesForfeited >= 1e+21) Game.Win('Nil zero zilch');
            if (cookiesForfeited >= 1e+24) Game.Win('Transcendence');
            if (cookiesForfeited >= 1e+27) Game.Win('Obliterate');
            if (cookiesForfeited >= 1e+30) Game.Win('Negative void');
            if (cookiesForfeited >= 1e+33) Game.Win('To crumbs, you say?');
            if (cookiesForfeited >= 1e+36) Game.Win('You get nothing');
            if (cookiesForfeited >= 1e+39) Game.Win('Humble rebeginnings');
            if (cookiesForfeited >= 1e+42) Game.Win('The end of the world');
            if (cookiesForfeited >= 1e+45) Game.Win('Oh, you\'re back');
            if (cookiesForfeited >= 1e+48) Game.Win('Lazarus');
            if (cookiesForfeited >= 1e+51) Game.Win('Smurf account');
            if (cookiesForfeited >= 1e+54) Game.Win('If at first you don\'t succeed');

            if (Math.round(Game.cookies) === 1e+12) Game.Win('When the cookies ascend just right');
        }

        Game.killBuffs();

        Game.seed = Game.makeSeed();

        Game.cookiesReset += Game.cookiesEarned;
        Game.cookies = 0;
        Game.cookiesEarned = 0;
        Game.cookieClicks = 0;
        Game.goldenClicksLocal = 0;
        // Game.goldenClicks=0;
        // Game.missedGoldenClicks=0;
        Game.handmadeCookies = 0;
        Game.cookiesPsRawHighest = 0;
        if (hard) {
            Game.bgType = 0;
            Game.milkType = 0;
            Game.chimeType = 0;
            Game.vault = [];
        }
        Game.pledges = 0;
        Game.pledgeT = 0;
        Game.elderWrath = 0;
        Game.elderWrathOld = 0;
        Game.elderWrathD = 0;
        Game.nextResearch = 0;
        Game.researchT = 0;
        Game.seasonT = 0;
        Game.seasonUses = 0;
        Game.season = Game.baseSeason;
        Game.computeSeasonPrices();

        Game.startDate = Date.now();
        Game.lastDate = Date.now();

        Game.cookiesSucked = 0;
        Game.wrinklersPopped = 0;
        Game.ResetWrinklers();

        Game.santaLevel = 0;
        Game.reindeerClicked = 0;

        Game.dragonLevel = 0;
        Game.dragonAura = 0;
        Game.dragonAura2 = 0;

        Game.fortuneGC = 0;
        Game.fortuneCPS = 0;

        Game.TickerClicks = 0;

        if (Game.gainedPrestige > 0) Game.resets++;
        if (!hard && Game.canLumps() && Game.ascensionMode != 1) Game.addClass('lumpsOn');
        else Game.removeClass('lumpsOn');
        Game.gainedPrestige = 0;

        for (const me of Game.ObjectsById) {
            me.amount = 0;
            me.bought = 0;
            me.highest = 0;
            me.free = 0;
            me.totalCookies = 0;
            me.switchMinigame(false);
            if (hard) me.muted = false;
            me.pics = [];
            me.refresh();
        }
        for (let i in Game.UpgradesById) {
            const me = Game.UpgradesById[i];
            if (hard || me.pool !== 'prestige') me.bought = 0;
            if (hard) me.unlocked = 0;
            if (me.pool != 'prestige' && !me.lasting) {
                if (Game.Has('Keepsakes') && Game.seasonDrops.includes(me.name) && Math.random() < 1 / 5) {
                    /* empty */
                } else if (Game.ascensionMode == 1 && Game.HasAchiev('O Fortuna') && me.tier == 'fortune') {
                    /* empty */
                } else if (Game.HasAchiev('O Fortuna') && me.tier == 'fortune' && Math.random() < 0.4) {
                    /* empty */
                } else me.unlocked = 0;
            }
        }

        Game.BuildingsOwned = 0;
        Game.UpgradesOwned = 0;

        Game.cookiesPsByType = {};
        Game.cookiesMultByType = {};

        if (!hard && Game.ascensionMode != 1) {
            for (const upgrade of Game.permanentUpgrades) {
                if (upgrade != -1) {
                    Game.UpgradesById[upgrade].earn();
                }
            }
            if (Game.Has('Season switcher')) {
                for (let i in Game.seasons) {
                    if (i === '') continue;
                    Game.Unlock(Game.seasons[/** @type {keyof typeof Game.seasons} */(i)].trigger);
                }
            }

            if (Game.Has('Starter kit')) Game.Objects['Cursor'].getFree(10);
            if (Game.Has('Starter kitchen')) Game.Objects['Grandma'].getFree(5);
        }

        BeautifyAll();

        Game.RebuildUpgrades();
        Game.TickerAge = 0;
        Game.TickerEffect = 0;
        Game.recalculateGains = 1;
        Game.storeToRefresh = 1;
        Game.upgradesToRebuild = 1;
        Game.killShimmers();

        Game.buyBulk = 1;
        Game.buyMode = 1;
        Game.storeBulkButton(-1);

        Game.LoadMinigames();
        for (let i in Game.ObjectsById) {
            const me = Game.ObjectsById[i];
            if (hard && me.minigame && me.minigame.launch) {
                me.minigame.launch();
                me.minigame.reset(true);
            } else if (!hard && me.minigame && me.minigame.reset) me.minigame.reset();
        }

        $('toggleBox', true).style.display = 'none';
        $('toggleBox', true).innerHTML = '';
        Game.choiceSelectorOn = -1;
        Game.ToggleSpecialMenu(0);
        Game.specialTab = '';

        $('logButton', true).classList.remove('hasUpdate');

        //! Game.runModHook('reset', hard); -- see moddingapi.disabled.js

        if (hard) {
            Game.clicksThisSession = 0;
            if (Game.T > Game.fps * 5 && Game.ReincarnateTimer == 0) {
                // fade out of black and pop the cookie
                Game.ReincarnateTimer = 1;
                Game.addClass('reincarnating');
                Game.BigCookieSize = 0;
            }
            Game.Notify(loc('Game reset'), EN ? 'So long, cookies.' : loc('Good bye, cookies.'), [21, 6], 6);
        } else Game.clicksThisSession = Math.max(Game.clicksThisSession, 1);

        Game.jukebox.reset();
    }
    /**
     * @param {number} bypass
     */
    static HardReset(bypass) {
        if (!bypass) {
            Game.Prompt(
                '<id WipeSave><h3>' +
                loc('Wipe save') +
                '</h3><div class="block">' +
                tinyIcon([15, 5]) +
                '<div class="line"></div>' +
                loc(
                    'Do you REALLY want to wipe your save?<br>' +
                    '<small>You will lose your progress, your achievements, and your heavenly chips!</small>'
                ) +
                '</div>',
                [
                    [EN ? 'Yes!' : loc('Yes'), 'Game.ClosePrompt();Game.HardReset(1);', 'float:left'],
                    [loc('No'), 0, 'float:right']
                ]
            );
        } else if (bypass === 1) {
            Game.Prompt(
                '<id ReallyWipeSave><h3>' +
                loc('Wipe save') +
                '</h3><div class="block">' +
                tinyIcon([15, 5]) +
                '<div class="line"></div>' +
                loc(
                    'Whoah now, are you really, <b><i>REALLY</i></b> sure you want to go through with this?<br>' +
                    '<small>Don\'t say we didn\'t warn you!</small>'
                ) +
                '</div>',
                [
                    [EN ? 'Do it!' : loc('Yes'), 'Game.ClosePrompt();Game.HardReset(2);', 'float:left'],
                    [loc('No'), 0, 'float:right']
                ]
            );
        } else {
            for (let i in Game.AchievementsById) {
                const me = Game.AchievementsById[i];
                me.won = 0;
            }
            for (let i in Game.ObjectsById) {
                const me = Game.ObjectsById[i];
                me.level = 0;
            }

            Game.AchievementsOwned = 0;
            Game.goldenClicks = 0;
            Game.missedGoldenClicks = 0;
            Game.Reset(true);
            Game.resets = 0;
            Game.fullDate = Date.now();
            Game.bakeryName = Game.GetBakeryName();
            Game.bakeryNameRefresh();
            Game.cookiesReset = 0;
            Game.prestige = 0;
            Game.heavenlyChips = 0;
            Game.heavenlyChipsSpent = 0;
            Game.heavenlyCookies = 0;
            Game.permanentUpgrades = [-1, -1, -1, -1, -1];
            Game.ascensionMode = 0;
            Game.lumps = -1;
            Game.lumpsTotal = -1;
            Game.lumpT = Date.now();
            Game.lumpRefill = 0;
            Game.removeClass('lumpsOn');
        }
    }
    
    /** @type {0 | HTMLElement} */
    static onCrate = 0;
    /** @param {0 | HTMLElement} what */
    static setOnCrate(what) { Game.onCrate = what; }

    /**
     * produce a crate with associated tooltip for an upgrade or achievement
     * @param {Upgrade | Achievement} meArg an object representing the upgrade or achievement
     * @param {'store'|'ascend'|'stats'|''} [context] can be "store", "ascend", "stats" or undefined
     * @param {string} [forceClickStr] changes what is done when the crate is clicked
     * @param {string} [id] is the resulting div's desired id
     * @param {string} [style]
     */
    static crate(meArg, context, forceClickStr, id, style) {
        let classes = 'crate';
        let enabled = 0;
        let noFrame = 0;
        let attachment = 'top';
        let neuromancy = 0;
        if (context === 'stats' && (Game.Has('Neuromancy') || (Game.sesame && meArg.pool === 'debug'))) neuromancy = 1;
        let mysterious = 0;
        let clickStr = '';

        if (meArg.type === 'upgrade') {
            const me = /** @type {Upgrade} */ (meArg);
            const canBuy = context === 'store' ? me.canBuy() : true;
            if (context == 'stats' && me.bought == 0 && !Game.Has('Neuromancy') && (!Game.sesame || me.pool != 'debug')) return '';
            else if (context == 'stats' && (Game.Has('Neuromancy') || (Game.sesame && me.pool == 'debug'))) neuromancy = 1;
            else if (context == 'store' && !canBuy) enabled = 0;
            else if (context == 'ascend' && me.bought == 0) enabled = 0;
            else enabled = 1;
            if (me.bought > 0) enabled = 1;

            if (context == 'stats' && !Game.prefs.crates) noFrame = 1;

            classes += ' upgrade';
            if (me.pool == 'prestige') classes += ' heavenly';

            if (neuromancy) clickStr = 'Game.UpgradesById[' + me.id + '].toggle();';
        } else if (meArg.type == 'achievement') {
            const me = /** @type {Achievement} */ (meArg);
            if (context == 'stats' && me.won == 0 && me.pool !== 'normal') return '';
            else if (context != 'stats') enabled = 1;

            if (context == 'stats' && !Game.prefs.crates) noFrame = 1;

            classes += ' achievement';
            if (me.pool == 'shadow') classes += ' shadow';
            if (me.won > 0) enabled = 1;
            else mysterious = 1;
            if (!enabled) clickStr = 'Game.AchievementsById[' + me.id + '].click();';

            if (neuromancy) clickStr = 'Game.AchievementsById[' + me.id + '].toggle();';
        }
        const me = (meArg);

        if (context == 'store') attachment = 'store';

        if (forceClickStr) clickStr = forceClickStr;

        // @ts-expect-error what the hell is this mess...
        if (me.choicesFunction) classes += ' selector';

        let icon = me.icon;
        if (mysterious) icon = [0, 7];

        // @ts-expect-error what the hell is this mess... x2
        if (me.iconFunction) icon = me.iconFunction();
        // @ts-expect-error what the hell is this mess... x3
        if (me.bought && context == 'store') enabled = 0;

        if (enabled) classes += ' enabled';
        if (noFrame) classes += ' noFrame';

        let text = [];
        if (Game.sesame && (Game.debuggedUpgradeCpS[me.name] || Game.debuggedUpgradeCpClick[me.name])) {
            text.push(
                'x' + Beautify(1 + Game.debuggedUpgradeCpS[me.name], 2), 
                Game.debugColors[
                    Math.floor(
                        Math.max(
                            0,
                            Math.min(
                                Game.debugColors.length - 1,
                                Math.pow(Game.debuggedUpgradeCpS[me.name] / 2, 0.5) * Game.debugColors.length
                            )
                        )
                    )
                ],
                'x' + Beautify(1 + Game.debuggedUpgradeCpClick[me.name], 2), 
                Game.debugColors[
                    Math.floor(
                        Math.max(
                            0,
                            Math.min(
                                Game.debugColors.length - 1,
                                Math.pow(Game.debuggedUpgradeCpClick[me.name] / 2, 0.5) * Game.debugColors.length
                            )
                        )
                    )
                ]
            );
        }
        let textStr = '';
        for (let i = 0; i < text.length; i += 2) {
            textStr +=
                '<div style="opacity:0.9;z-index:1000;padding:0px 2px;background:' +
                text[i + 1] +
                ';color:#000;font-size:10px;position:absolute;top:' +
                (i / 2) * 10 +
                'px;left:0px;">' +
                text[i] +
                '</div>';
        }
        return (
            (Game.prefs.screenreader ? '<button aria-labelledby="ariaReader-' + me.type + '-' + me.id + '"' : '<div') +
            (clickStr != '' ? ' ' + Game.clickStr + '="' + clickStr + '"' : '') +
            ' class="' +
            classes +
            '" ' +
            Game.getDynamicTooltip(
                'function(){return Game.crateTooltip(Game.' +
                (me.type == 'upgrade' ? 'Upgrades' : 'Achievements') +
                'ById[' +
                me.id +
                '],' +
                (context ? '\'' + context + '\'' : '') +
                ');}',
                attachment,
                true
            ) +
            (id ? 'id="' + id + '" ' : '') +
            'style="' +
            (mysterious ? 'background-position:' + -0 * 48 + 'px ' + -7 * 48 + 'px;' : writeIcon(icon)) +
            // @ts-expect-error what even is this code
            (context == 'ascend' && me.pool == 'prestige' ? 'position:absolute;left:' + me.posX + 'px;top:' + me.posY + 'px;' : '') +
            (style || '') +
            '">' +
            textStr +
            (Game.prefs.screenreader ? '<label class="srOnly" id="ariaReader-' + me.type + '-' + me.id + '"></label>' : '') +
            // @ts-expect-error so close yet so far
            (me.choicesFunction ? '<div class="selectorCorner"></div>' : '') +
            (Game.prefs.screenreader ? '</button>' : '</div>')
        );
    }
    /**
     * @param {Upgrade | Achievement} meArg
     * @param {string} context
     */
    static crateTooltip(meArg, context) {
        let tags = [];
        let mysterious = 0;
        let neuromancy = 0;
        let price = '';
        if (context == 'stats' && (Game.Has('Neuromancy') || (Game.sesame && meArg.pool === 'debug'))) neuromancy = 1;

        let ariaText = '';

        if (meArg.type === 'upgrade') {
            const me = /** @type {Upgrade} */ (meArg);
            ariaText += 'Upgrade. ';

            switch (me.pool) {
                case 'prestige': tags.push(loc('[Tag]Heavenly', 0, 'Heavenly'), '#efa438'); break;
                case 'tech':     tags.push(loc('[Tag]Tech', 0, 'Tech'), '#36a4ff'); break;
                case 'cookie':   tags.push(loc('[Tag]Cookie', 0, 'Cookie'), 0); break;
                case 'debug':    tags.push(loc('[Tag]Debug', 0, 'Debug'), '#00c462'); break;
                case 'toggle':   tags.push(loc('[Tag]Switch', 0, 'Switch'), 0); break;
                default:         tags.push(loc('[Tag]Upgrade', 0, 'Upgrade'), 0);
            }

            if (Game.Has('Label printer')) {
                const metier = me.tier;
                if (me.tier)
                    tags.push(loc('Tier:') + ' ' +
                        loc('[Tier]' + Game.Tiers[metier].name, 0, Game.Tiers[metier].name), Game.Tiers[metier].color);
                if (me.name == 'Label printer' || me.name == 'This upgrade')
                    tags.push(loc('Tier:') + ' ' + loc('[Tier]Self-referential'), '#ff00ea');
            }

            if (me.isVaulted()) tags.push(loc('Vaulted'), '#4e7566');

            if (me.bought > 0) {
                ariaText += 'Owned. ';
                if (me.pool == 'tech') tags.push(loc('Researched'), 0);
                else if (EN && me.kitten) tags.push('Purrchased', 0);
                else tags.push(loc('Purchased'), 0);
            }

            if (me.lasting && me.unlocked) tags.push(loc('Unlocked forever'), '#f2ff87');

            if (neuromancy && me.bought == 0) tags.push(loc('Click to learn!'), '#00c462');
            else if (neuromancy && me.bought > 0) tags.push(loc('Click to unlearn!'), '#00c462');

            let canBuy = context == 'store' ? me.canBuy() : true;
            let cost = me.getPrice();
            if (me.priceLumps > 0) cost = me.priceLumps;

            if (me.priceLumps == 0 && cost == 0) price = '';
            else {
                price =
                        '<div style="float:right;text-align:right;"><span class="price' +
                        (me.priceLumps > 0 ? ' lump' : '') +
                        (me.pool == 'prestige' ? (me.bought || Game.heavenlyChips >= cost ? ' heavenly' : ' heavenly disabled') : '') +
                        (context == 'store' ? (canBuy ? '' : ' disabled') : '') +
                        '">' +
                        Beautify(Math.round(cost)) +
                        '</span>' +
                        (me.pool != 'prestige' && me.priceLumps == 0 ? Game.costDetails(cost) : '') +
                        '</div>';

                ariaText +=
                        (me.bought ? 'Bought for' : (canBuy ? 'Can buy for' : 'Cannot afford the')) +
                        ' ' +
                        Beautify(Math.round(cost)) +
                        ' ' +
                        (me.priceLumps > 0 ? 'sugar lumps' : (me.pool == 'prestige' ? 'heavenly chips' : 'cookies')) +
                        '. ';
            }
        } else if (meArg.type === 'achievement') {
            const me = /** @type {Achievement} */ (meArg);
            ariaText += 'Achievement. ';
            if (me.pool === 'shadow') tags.push(loc('Shadow Achievement'), '#9700cf');
            else tags.push(loc('Achievement'), 0);
            if (me.won > 0) {
                tags.push(loc('Unlocked'), 0);
                ariaText += 'Unlocked. ';
            }
            else {
                tags.push(loc('Locked'), 0);
                mysterious = 1;
            }

            if (neuromancy && me.won == 0) tags.push(loc('Click to win!'), '#00c462');
            else if (neuromancy && me.won > 0) tags.push(loc('Click to lose!'), '#00c462');
        }

        let tagsStr = '';
        for (let i = 0; i < tags.length; i += 2) {
            if (i % 2 == 0) tagsStr += '<div class="tag" style="background-color:' + (tags[i + 1] == 0 ? '#fff' : tags[i + 1]) + ';">' + tags[i] + '</div>';
        }

        const me = (meArg);

        let icon = me.icon;
        if (mysterious) icon = [0, 7];

        // @ts-expect-error this mess again
        if (me.iconFunction) icon = me.iconFunction();

        ariaText += (mysterious ? 'Hidden' : me.dname) + '. ';

        let tip = '';
        if (context == 'store') {
            if (me.pool !== 'toggle' && me.pool !== 'tech') {
                // @ts-expect-error cba
                let purchase = me.kitten ? 'purrchase' : 'purchase';
                if (Game.Has('Inspired checklist')) {
                    // @ts-expect-error ig context == store means its guaranteed to be Upgrade but i also cba atm
                    if (me.isVaulted())
                        tip = EN
                            ? 'Upgrade is vaulted and will not be auto-' + purchase + 'd.<br>Click to ' + purchase + '. Shift-click to unvault.'
                            : loc('Upgrade is vaulted and will not be auto-purchased.') +
                                '<br>' +
                                loc('Click to purchase.') +
                                ' ' +
                                loc('%1 to unvault.', loc('Shift-click'));
                    else
                        tip = EN
                            ? 'Click to ' + purchase + '. Shift-click to vault.'
                            : loc('Click to purchase.') + ' ' + loc('%1 to vault.', loc('Shift-click'));
                    if (EN) {
                        tip += Game.keys['ShiftRight'] || Game.keys['ShiftLeft'] ? '<br>(You are holding Shift.)' : '<br>(You are not holding Shift.)';
                    }
                } else tip = EN ? 'Click to ' + purchase + '.' : locStr('Click to purchase.');
                // @ts-expect-error choices choices...
            } else if (me.pool == 'toggle' && me.choicesFunction) tip = locStr('Click to open selector.');
            else if (me.pool == 'toggle') tip = locStr('Click to toggle.');
            else if (me.pool == 'tech') tip = locStr('Click to research.');
        }

        if (tip != '') ariaText += tip + ' ';

        // TODO: Re-unite this variable
        const meAsUp = /** @type {Upgrade} */ (meArg);

        let desc = meAsUp.ddesc;
        // @ts-expect-error func args issue
        if (meAsUp.descFunc) desc = meAsUp.descFunc(context);
        if (meAsUp.bought && context == 'store' && meAsUp.displayFuncWhenOwned) desc =
            meAsUp.displayFuncWhenOwned() + '<div class="line"></div>' + desc;
        if (meAsUp.unlockAt) {
            // @ts-expect-error i dont even know
            if (meAsUp.unlockAt.require) {
                // @ts-expect-error i dont even know 2.0
                const it = Game.Upgrades[meAsUp.unlockAt.require];
                desc =
                        '<div style="font-size:80%;text-align:center;">' +
                        (EN ? 'From' : loc('Source:')) +
                        ' ' +
                        tinyIcon(it.icon) +
                        ' ' +
                        it.dname +
                        '</div><div class="line"></div>' +
                        desc;
            // @ts-expect-error
            } else if (meAsUp.unlockAt.text) {
                desc =
                        '<div style="font-size:80%;text-align:center;">' +
                        (EN ? 'From' : loc('Source:')) +
                        ' <b>' +
                        'Oops this text is missing???' +//! text +
                        '</b></div><div class="line"></div>' +
                        desc;
            }
        }

        if (!mysterious) ariaText += 'Description: ' + desc + ' ';

        if (Game.prefs.screenreader) {
            let ariaLabel = $('ariaReader-' + me.type + '-' + me.id);
            if (ariaLabel) ariaLabel.innerHTML = ariaText.replace(/(<([^>]+)>)/gi, ' ');
        }

        return (
            '<div style="position:absolute;left:1px;top:1px;right:1px;bottom:1px;background:linear-gradient(125deg,' +
                (me.pool == 'prestige' ? 'rgba(15,115,130,1) 0%,rgba(15,115,130,0)' : 'rgba(50,40,40,1) 0%,rgba(50,40,40,0)') +
                ' 20%);mix-blend-mode:screen;z-index:1;"></div><div style="z-index:10;padding:8px 4px;min-width:350px;position:relative;" id="tooltipCrate">' +
                '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;' +
                writeIcon(icon) +
                '"></div>' +
                (meAsUp.bought && context == 'store' ? '' : price) +
                '<div class="name">' +
                (mysterious ? '???' : me.dname) +
                '</div>' +
                tagsStr +
                '<div class="line"></div><div class="description">' +
                (mysterious ? '???' : desc) +
                '</div></div>' +
                (tip != ''
                    ? '<div class="line"></div><div style="font-size:10px;font-weight:bold;color:#999;text-align:center;padding-bottom:4px;line-height:100%;" class="crateTip">' +
                    tip +
                    '</div>'
                    : '') +
                (Game.sesame
                    ? '<div style="font-size:9px;">Id: ' + me.id
                    + ' | Order: ' + Math.floor(me.order)
                    + (meAsUp.tier ? ' | Tier: ' + meAsUp.tier : '')
                    + '</div>'
                    : '')
        );
    }

    /**
        * @param {number} cost
        */
    static costDetails(cost) {
        if (!Game.Has('Genius accounting')) return '';
        if (!cost) return '';
        let priceInfo = '';
        let cps = Game.cookiesPs * (1 - Game.cpsSucked);
        if (cost > Game.cookies) priceInfo += loc('in %1', Game.sayTime(((cost - Game.cookies) / cps + 1) * Game.fps)) + '<br>';
        priceInfo += loc('%1 worth', Game.sayTime((cost / cps + 1) * Game.fps)) + '<br>';
        priceInfo += loc('%1% of bank', Beautify((cost / Game.cookies) * 100, 1)) + '<br>';
        return '<div style="font-size:80%;opacity:0.7;line-height:90%;" class="costDetails">' + priceInfo + '</div>';
    }

    /* =====================================================================================
        PRESTIGE
        =======================================================================================*/

    static HCfactor = 3;
    /**
     * @param {number} cookies
     */
    static HowMuchPrestige(
        cookies // how much prestige [cookies] should land you
    ) {
        return Math.pow(cookies / 1000000000000, 1 / Game.HCfactor);
    }
    /**
     * @param {number} chips
     */
    static HowManyCookiesReset(
        chips // how many cookies [chips] are worth
    ) {
        // this must be the inverse of the above function (ie. if cookies=chips^2, chips=cookies^(1/2) )
        return Math.pow(chips, Game.HCfactor) * 1000000000000;
    }
    static gainedPrestige = 0;
    /**
     * @param {number} cookiesForfeited
     * @param {undefined} [silent]
     */
    static EarnHeavenlyChips(cookiesForfeited, silent) {
        // recalculate prestige and chips owned
        let prestige = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + cookiesForfeited));
        prestige = Math.max(0, prestige);
        if (prestige != Game.prestige) {
            // did we change prestige levels?
            let prestigeDifference = prestige - Game.prestige;
            Game.gainedPrestige = prestigeDifference;
            Game.heavenlyChips += prestigeDifference;
            Game.prestige = prestige;
            if (!silent && prestigeDifference > 0)
                Game.Notify(
                    loc('You forfeit your %1.', loc('%1 cookie', LBeautify(cookiesForfeited))),
                    loc('You gain <b>%1</b>!', loc('%1 prestige level', LBeautify(prestigeDifference))),
                    [19, 7]
                );
        }
    }

    static hasGod = STUB; //! temporary stub
    static GetHeavenlyMultiplier() {
        let heavenlyMult = 0;
        if (Game.Has('Heavenly chip secret')) heavenlyMult += 0.05;
        if (Game.Has('Heavenly cookie stand')) heavenlyMult += 0.2;
        if (Game.Has('Heavenly bakery')) heavenlyMult += 0.25;
        if (Game.Has('Heavenly confectionery')) heavenlyMult += 0.25;
        if (Game.Has('Heavenly key')) heavenlyMult += 0.25;
        heavenlyMult *= 1 + Game.auraMult('Dragon God') * 0.05;
        if (Game.Has('Lucky digit')) heavenlyMult *= 1.01;
        if (Game.Has('Lucky number')) heavenlyMult *= 1.01;
        if (Game.Has('Lucky payout')) heavenlyMult *= 1.01;
        if (Game.hasGod) {
            let godLvl = Game.hasGod('creation');
            if (godLvl == 1) heavenlyMult *= 0.7;
            else if (godLvl == 2) heavenlyMult *= 0.8;
            else if (godLvl == 3) heavenlyMult *= 0.9;
        }
        return heavenlyMult;
    }

    static ascensionModes = {
        0: {
            name: 'None',
            dname: loc('None [ascension type]'),
            desc: loc('No special modifiers.'),
            icon: /** @type {[number, number]} */ ([10, 0])
        },
        1: {
            name: 'Born again',
            dname: loc('Born again [ascension type]'),
            desc: loc(
                'This run will behave as if you\'d just started the game from scratch. Prestige levels and heavenly upgrades will have no effect, as will sugar lumps and building levels. Perma-upgrades and minigames will be unavailable.<div class="line"></div>Some achievements are only available in this mode.'
            ),
            icon: /** @type {[number, number]} */ ([2, 7])
        }
    };

    static ascendMeterPercent = 0;
    static ascendMeterPercentT = 0;
    static ascendMeterLevel = 100000000000000000000000000000;

    /** @type {keyof typeof Game.ascensionModes} */
    static nextAscensionMode = 0;
    static UpdateAscensionModePrompt() {
        const icon = Game.ascensionModes[Game.nextAscensionMode].icon;
        const name = Game.ascensionModes[Game.nextAscensionMode].dname;
        $('ascendModeButton', true).innerHTML =
                '<div class="crate noFrame enabled" ' +
                Game.clickStr +
                '="Game.PickAscensionMode();" ' +
                Game.getTooltip(
                    '<div style="min-width:200px;text-align:center;font-size:11px;" id="tooltipNextChallengeMode">' +
                    loc('Challenge mode for the next run:') +
                    '<br><b>' +
                    name +
                    '</b><div class="line"></div>' +
                    loc('Challenge modes apply special modifiers to your next ascension.<br>Click to change.') +
                    '</div>',
                    'bottom-right'
                ) +
                ' style="opacity:1;float:none;display:block;background-position:' +
                -icon[0] * 48 +
                'px ' +
                -icon[1] * 48 +
                'px;"></div>';
    }
    static PickAscensionMode() {
        PlaySound('snd/tick.mp3');
        Game.tooltip.hide();

        let str = '';
        for (let i in Game.ascensionModes) {
            let icon = Game.ascensionModes[/** @type {keyof typeof Game.ascensionModes} */(Number(i))].icon;
            str +=
                    '<div class="crate enabled' +
                    (Number(i) === Game.nextAscensionMode ? ' highlighted' : '') +
                    '" id="challengeModeSelector' +
                    i +
                    '" style="opacity:1;float:none;display:inline-block;background-position:' +
                    -icon[0] * 48 +
                    'px ' +
                    -icon[1] * 48 +
                    'px;" ' +
                    Game.clickStr +
                    '="Game.nextAscensionMode=' +
                    i +
                    ';Game.PickAscensionMode();PlaySound(\'snd/tick.mp3\');Game.choiceSelectorOn=-1;" onMouseOut="$(\'challengeSelectedName\').innerHTML=Game.ascensionModes[Game.nextAscensionMode].dname;$(\'challengeSelectedDesc\').innerHTML=Game.ascensionModes[Game.nextAscensionMode].desc;" onMouseOver="$(\'challengeSelectedName\').innerHTML=Game.ascensionModes[' +
                    i +
                    '].dname;$(\'challengeSelectedDesc\').innerHTML=Game.ascensionModes[' +
                    i +
                    '].desc;"' +
                    '></div>';
        }
        Game.Prompt(
            '<id PickChallengeMode><h3>' +
                loc('Select a challenge mode') +
                '</h3>' +
                '<div class="line"></div><div class="crateBox">' +
                str +
                '</div><h4 id="challengeSelectedName">' +
                Game.ascensionModes[/** @type {keyof typeof Game.ascensionModes} */(Game.nextAscensionMode)].dname +
                '</h4><div class="line"></div><div id="challengeSelectedDesc" style="min-height:128px;">' +
                Game.ascensionModes[/** @type {keyof typeof Game.ascensionModes} */(Game.nextAscensionMode)].desc +
                '</div><div class="line"></div>',
            [[loc('Confirm'), 'Game.UpdateAscensionModePrompt();Game.ClosePrompt();']],
            0,
            'widePrompt'
        );
    }

    static ascendl = $('ascend', true);
    static ascendContentl = $('ascendContent', true);
    static ascendZoomablel = $('ascendZoomable', true);
    static ascendUpgradesl = $('ascendUpgrades', true);
    static OnAscend = 0;
    static AscendTimer = 0; // how far we are into the ascend animation
    static AscendDuration = Game.fps * 5; // how long the ascend animation is
    static AscendBreakpoint = Game.AscendDuration * 0.5; // at which point the cookie explodes during the ascend animation
    static UpdateAscendIntro() {
        if (Game.AscendTimer == 1) PlaySound('snd/charging.mp3');
        if (Game.AscendTimer == Math.floor(Game.AscendBreakpoint)) PlaySound('snd/thud.mp3');
        Game.AscendTimer++;
        if (Game.AscendTimer > Game.AscendDuration) {
            // end animation and launch ascend screen
            PlaySound('snd/cymbalRev.mp3');
            PlaySound('snd/choir.mp3');
            Game.EarnHeavenlyChips(Game.cookiesEarned);
            Game.AscendTimer = 0;
            Game.OnAscend = 1;
            Game.removeClass('ascendIntro');
            Game.addClass('ascending');
            Game.BuildAscendTree();
            Game.heavenlyChipsDisplayed = Game.heavenlyChips;
            Game.nextAscensionMode = 0;
            Game.ascensionMode = 0;
            Game.UpdateAscensionModePrompt();
        }
    }
    static ReincarnateTimer = 0; // how far we are into the reincarnation animation
    static ReincarnateDuration = Game.fps * 1; // how long the reincarnation animation is
    static UpdateReincarnateIntro() {
        if (Game.ReincarnateTimer == 1) PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
        Game.ReincarnateTimer++;
        if (Game.ReincarnateTimer > Game.ReincarnateDuration) {
            // end animation and launch regular game
            Game.ReincarnateTimer = 0;
            Game.removeClass('reincarnating');
        }
    }
    /**
     * @param {boolean} [bypass]
     */
    static Reincarnate(bypass) {
        if (!bypass)
            Game.Prompt(
                '<id Reincarnate><h3>' + loc('Reincarnate') + '</h3><div class="block">' + loc('Are you ready to return to the mortal world?') + '</div>',
                [[loc('Yes'), 'Game.ClosePrompt();Game.Reincarnate(1);'], loc('No')]
            );
        else {
            Game.ascendUpgradesl.innerHTML = '';
            Game.ascensionMode = Game.nextAscensionMode;
            Game.nextAscensionMode = 0;
            Game.Reset();
            if (Game.HasAchiev('Rebirth')) {
                Game.Notify('Reincarnated', loc('Hello, cookies!'), [10, 0], 4);
            }
            if (Game.resets >= 1000) Game.Win('Endless cycle');
            if (Game.resets >= 100) Game.Win('Reincarnation');
            if (Game.resets >= 10) Game.Win('Resurrection');
            if (Game.resets >= 1) Game.Win('Rebirth');

            let prestigeUpgradesOwned = 0;
            for (let i in Game.Upgrades) {
                if (Game.Upgrades[i].bought && Game.Upgrades[i].pool == 'prestige') prestigeUpgradesOwned++;
            }
            if (prestigeUpgradesOwned >= 100) Game.Win('All the stars in heaven');

            Game.removeClass('ascending');
            Game.OnAscend = 0;
            // trigger the reincarnate animation
            Game.ReincarnateTimer = 1;
            Game.addClass('reincarnating');
            Game.BigCookieSize = 0;

            //! Game.runModHook('reincarnate'); -- see moddingapi.disabled.js
        }
    }
    /**
     * @param {boolean} [bypass]
     */
    static Ascend(bypass) {
        if (!bypass)
            Game.Prompt(
                '<id Ascend><h3>' +
                    loc('Ascend') +
                    '</h3><div class="block">' +
                    tinyIcon([19, 7]) +
                    '<div class="line"></div>' +
                    loc(
                        'Do you REALLY want to ascend?<div class="line"></div>You will lose your progress and start over from scratch.<div class="line"></div>All your cookies will be converted into prestige and heavenly chips.'
                    ) +
                    '<div class="line"></div>' +
                    (Game.canLumps() ? loc('You will keep your achievements, building levels and sugar lumps.') : loc('You will keep your achievements.')) +
                    '<div class="optionBox"><a class="option smallFancyButton" style="margin:16px;padding:8px 16px;animation:rainbowCycle 5s infinite ease-in-out,pucker 0.2s ease-out;box-shadow:0px 0px 0px 1px #000,0px 0px 1px 2px currentcolor;background:linear-gradient(to bottom,transparent 0%,currentColor 500%);width:auto;text-align:center;" ' +
                    Game.clickStr +
                    '="PlaySound(\'snd/tick.mp3\');Game.ClosePrompt();Game.Ascend(1);" id="promptOption0">' +
                    loc('Ascend') +
                    '</a></div></div>',
                [
                    [loc('Yes'), 'Game.ClosePrompt();Game.Ascend(1);', 'float:left;display:none;'],
                    [loc('Cancel'), 0, 'float:right']
                ]
            );
        else {
            Game.Notify(loc('Ascending'), loc('So long, cookies.'), [20, 7], 4);
            Game.OnAscend = 0;
            Game.removeClass('ascending');
            Game.addClass('ascendIntro');
            // trigger the ascend animation
            Game.AscendTimer = 1;
            Game.killShimmers();
            $('toggleBox', true).style.display = 'none';
            $('toggleBox', true).innerHTML = '';
            Game.choiceSelectorOn = -1;
            Game.ToggleSpecialMenu(0);
            Game.AscendOffX = 0;
            Game.AscendOffY = 0;
            Game.AscendOffXT = 0;
            Game.AscendOffYT = 0;
            Game.AscendZoomT = 1;
            Game.AscendZoom = 0.2;

            Game.jukebox.reset();
        }
    }

    static DebuggingPrestige = 0;
    static AscendDragX = 0;
    static AscendDragY = 0;
    static AscendOffX = 0;
    static AscendOffY = 0;
    static AscendZoom = 1;
    static AscendOffXT = 0;
    static AscendOffYT = 0;
    static AscendZoomT = 1;
    static AscendDragging = 0;
    static AscendGridSnap = 24;
    static heavenlyBounds = { left: 0, right: 0, top: 0, bottom: 0 };
    static UpdateAscend() {
        if (Game.keys['ArrowLeft']) Game.AscendOffXT += 16 * (1 / Game.AscendZoomT);
        if (Game.keys['ArrowUp']) Game.AscendOffYT += 16 * (1 / Game.AscendZoomT);
        if (Game.keys['ArrowRight']) Game.AscendOffXT -= 16 * (1 / Game.AscendZoomT);
        if (Game.keys['ArrowDown']) Game.AscendOffYT -= 16 * (1 / Game.AscendZoomT);

        if (Game.AscendOffXT > -Game.heavenlyBounds.left) Game.AscendOffXT = -Game.heavenlyBounds.left;
        if (Game.AscendOffXT < -Game.heavenlyBounds.right) Game.AscendOffXT = -Game.heavenlyBounds.right;
        if (Game.AscendOffYT > -Game.heavenlyBounds.top) Game.AscendOffYT = -Game.heavenlyBounds.top;
        if (Game.AscendOffYT < -Game.heavenlyBounds.bottom) Game.AscendOffYT = -Game.heavenlyBounds.bottom;
        Game.AscendOffX += (Game.AscendOffXT - Game.AscendOffX) * 0.5;
        Game.AscendOffY += (Game.AscendOffYT - Game.AscendOffY) * 0.5;
        Game.AscendZoom += (Game.AscendZoomT - Game.AscendZoom) * 0.25;
        if (Math.abs(Game.AscendZoomT - Game.AscendZoom) < 0.005) Game.AscendZoom = Game.AscendZoomT;

        if (Game.mouseDown && !Game.promptOn) {
            if (!Game.AscendDragging) {
                Game.AscendDragX = Game.mouseX;
                Game.AscendDragY = Game.mouseY;
            }
            Game.AscendDragging = 1;

            if (Game.DebuggingPrestige && Game.SelectedHeavenlyUpgrade) {
                Game.tooltip.hide();
                // drag upgrades around
                const me = Game.SelectedHeavenlyUpgrade;
                // @ts-expect-error me when jsdoc cant assert assignment
                me.posX += (Game.mouseX - Game.AscendDragX) * (1 / Game.AscendZoomT);
                // @ts-expect-error me when jsdoc cant assert assignment
                me.posY += (Game.mouseY - Game.AscendDragY) * (1 / Game.AscendZoomT);
                let posX = ASSERT_NOT_NULL(me.posX);
                let posY = ASSERT_NOT_NULL(me.posY);
                $('heavenlyUpgrade' + me.id, true).style.left = Math.floor(posX) + 'px';
                $('heavenlyUpgrade' + me.id, true).style.top = Math.floor(posY) + 'px';
                let ii = 0;
                for (const parent of me.parents) {
                    let origX = 0;
                    let origY = 0;
                    const targX = ASSERT_NOT_NULL(me.posX) + 28;
                    const targY = ASSERT_NOT_NULL(me.posY) + 28;
                    if (parent != -1) {
                        origX = parent.posX + 28;
                        origY = parent.posY + 28;
                    }
                    let rot = -(Math.atan((targY - origY) / (origX - targX)) / Math.PI) * 180;
                    if (targX <= origX) rot += 180;
                    const dist = Math.floor(Math.sqrt((targX - origX) * (targX - origX) + (targY - origY) * (targY - origY)));

                    $('heavenlyLink' + me.id + '-' + ii, true).style.cssText =
                        'width:' + dist + 'px;transform:rotate(' + rot + 'deg);left:' + origX + 'px;top:' + origY + 'px;';
                    ii++;
                }
            }
            if (!Game.SelectedHeavenlyUpgrade) {
                Game.AscendOffXT += (Game.mouseX - Game.AscendDragX) * (1 / Game.AscendZoomT);
                Game.AscendOffYT += (Game.mouseY - Game.AscendDragY) * (1 / Game.AscendZoomT);
            }
            Game.AscendDragX = Game.mouseX;
            Game.AscendDragY = Game.mouseY;
        } else {
            Game.AscendDragging = 0;
            Game.SelectedHeavenlyUpgrade = 0;
        }
        if (Game.Click || Game.promptOn) {
            Game.AscendDragging = 0;
        }

        Game.ascendContentl.style.transform = 'translate(' + Math.floor(Game.AscendOffX) + 'px,' + Math.floor(Game.AscendOffY) + 'px)';
        Game.ascendZoomablel.style.marginLeft = Game.windowW / 2 + 'px';
        Game.ascendZoomablel.style.marginTop = Game.windowH / 2 + 'px';
        Game.ascendZoomablel.style.transform = 'scale(' + Game.AscendZoom + ',' + Game.AscendZoom + ')';

        if (Game.Scroll < 0 && !Game.promptOn) Game.AscendZoomT = 0.5;
        if (Game.Scroll > 0 && !Game.promptOn) Game.AscendZoomT = 1;

        if (Game.T % 2 == 0) {
            $('ascendPrestige', true).innerHTML = loc('Prestige level:') + '<br>' + SimpleBeautify(Game.prestige);
            $('ascendHCs', true).innerHTML =
                    loc('Heavenly chips:') + '<br><span class="price heavenly">' + SimpleBeautify(Math.round(Game.heavenlyChipsDisplayed)) + '</span>';
            if (Game.prestige > 0) $('ascendModeButton', true).style.display = 'block';
            else $('ascendModeButton', true).style.display = 'none';
        }
        Game.heavenlyChipsDisplayed += (Game.heavenlyChips - Game.heavenlyChipsDisplayed) * 0.4;

        if (Game.DebuggingPrestige && Game.T % 10 == 0) {
            let str = '';
            for (let i in Game.PrestigeUpgrades) {
                let me = Game.PrestigeUpgrades[i];
                if (me.placedByCode) continue;
                str += me.id + ':[' + Math.floor(me.posX) + ',' + Math.floor(me.posY) + '],';
            }
            $('upgradePositions', true).value = 'Game.UpgradePositions={' + str + '};';
        }
    }
    static AscendRefocus() {
        Game.AscendOffX = 0;
        Game.AscendOffY = 0;
        Game.ascendl.className = '';
    }

    /** @type {Upgrade | 0} */
    static SelectedHeavenlyUpgrade = 0;
    /**
     * @param {number} what
     */
    static PurchaseHeavenlyUpgrade(what) {
        if (Game.UpgradesById[what].buy() && $('heavenlyUpgrade' + what)) {
            const rect = $('heavenlyUpgrade' + what, true).getBounds();
            Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24);
        }
    }
    /**
     * @param {any} [justBought]
     */
    static BuildAscendTree(justBought) {
        let str = '';
        Game.heavenlyBounds = { left: 0, right: 0, top: 0, bottom: 0 };

        if (Game.DebuggingPrestige) $('upgradePositions', true).style.display = 'block';
        else $('upgradePositions', true).style.display = 'none';

        let toPop = [];
        for (const me of Game.PrestigeUpgrades) {
            const prevCanBePurchased = me.canBePurchased;
            me.canBePurchased = 1;
            if (!me.bought && !Game.DebuggingPrestige) {
                if (me.showIf && !me.showIf()) me.canBePurchased = 0;
                else {
                    for (let ii in me.parents) {
                        if (me.parents[ii] != -1 && !me.parents[ii].bought) me.canBePurchased = 0;
                    }
                }
            }
            if (justBought && me.parents.includes(justBought) && !prevCanBePurchased && me.canBePurchased && !me.bought) toPop.push(me);
        }
        toPop.sort(
            (function (parent) {
                return function (a, b) {
                    let rot = Math.atan2(a.posY - parent.posY, parent.posX - a.posX) - Math.PI / 2;
                    let rot2 = Math.atan2(b.posY - parent.posY, parent.posX - b.posX) - Math.PI / 2;
                    return Number(rot < rot2);
                };
            })(justBought)
        );
        for (let i = 0; i < toPop.length; i++) {
            setTimeout(function () {
                PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.5);
            }, (0.2 + i * 0.1) * 1000);
        }
        str +=
                '<div class="crate upgrade heavenly enabled" style="position:absolute;left:-30px;top:-30px;opacity:0.8;pointer-events:none;transform:scale(1.3);background:transparent;"></div>';
        str += '<div class="crateBox" style="filter:none;-webkit-filter:none;">'; // chrome is still bad at these
        for (const me of Game.PrestigeUpgrades) {
            let ghosted = 0;
            if (me.canBePurchased || Game.Has('Neuromancy')) {
                str += Game.crate(
                    me,
                    'ascend',
                    'Game.PurchaseHeavenlyUpgrade(' + me.id + ');',
                    'heavenlyUpgrade' + me.id,
                    toPop.includes(me) ? 'animation:pucker 0.2s ease-out;animation-delay:' + (toPop.indexOf(me) * 0.1 + 0.2) + 's;' : ''
                );
            } else {
                for (let ii in me.parents) {
                    if (me.parents[ii] != -1 && me.parents[ii].canBePurchased) ghosted = 1;
                }
                if (me.showIf && !me.showIf()) ghosted = 0;
                if (ghosted) {
                    // maybe replace this with Game.crate()
                    str +=
                            '<div class="crate upgrade heavenly ghosted" id="heavenlyUpgrade' +
                            me.id +
                            '" style="position:absolute;left:' +
                            me.posX +
                            'px;top:' +
                            me.posY +
                            'px;' +
                            writeIcon(me.icon) +
                            '"></div>';
                }
            }
            if (me.canBePurchased || Game.Has('Neuromancy') || ghosted) {
                if (me.posX < Game.heavenlyBounds.left) Game.heavenlyBounds.left = me.posX;
                if (me.posX > Game.heavenlyBounds.right) Game.heavenlyBounds.right = me.posX;
                if (me.posY < Game.heavenlyBounds.top) Game.heavenlyBounds.top = me.posY;
                if (me.posY > Game.heavenlyBounds.bottom) Game.heavenlyBounds.bottom = me.posY;
            }
            for (let ii in me.parents) {
                // create pulsing links
                if (me.parents[ii] != -1 && (me.canBePurchased || ghosted)) {
                    let origX = 0;
                    let origY = 0;
                    let targX = me.posX + 28;
                    let targY = me.posY + 28;
                    if (me.parents[ii] != -1) {
                        origX = me.parents[ii].posX + 28;
                        origY = me.parents[ii].posY + 28;
                    }
                    let rot = -(Math.atan((targY - origY) / (origX - targX)) / Math.PI) * 180;
                    if (targX <= origX) rot += 180;
                    let dist = Math.floor(Math.sqrt((targX - origX) * (targX - origX) + (targY - origY) * (targY - origY)));
                    str +=
                            '<div class="parentLink" id="heavenlyLink' +
                            me.id +
                            '-' +
                            ii +
                            '" style="' +
                            (ghosted ? 'opacity:0.1;' : '') +
                            'width:' +
                            dist +
                            'px;-webkit-transform:rotate(' +
                            rot +
                            'deg);-moz-transform:rotate(' +
                            rot +
                            'deg);-ms-transform:rotate(' +
                            rot +
                            'deg);-o-transform:rotate(' +
                            rot +
                            'deg);transform:rotate(' +
                            rot +
                            'deg);left:' +
                            origX +
                            'px;top:' +
                            origY +
                            'px;"></div>';
                }
            }
        }
        Game.heavenlyBounds.left -= 128;
        Game.heavenlyBounds.top -= 128;
        Game.heavenlyBounds.right += 128 + 64;
        Game.heavenlyBounds.bottom += 128 + 64;
        str += '</div>';
        Game.ascendUpgradesl.innerHTML = str;

        if (Game.DebuggingPrestige) {
            for (const me of Game.PrestigeUpgrades) {
                $('heavenlyUpgrade' + me.id, true).addEventListener(
                    'mousedown',
                    (function (me) {
                        return function () {
                            let LASTHEAVENLYSELECTED;
                            if (!Game.DebuggingPrestige) return;
                            if ((Game.keys['ShiftRight'] || Game.keys['ShiftLeft']) && LASTHEAVENLYSELECTED !== undefined && me != LASTHEAVENLYSELECTED) {
                                // when clicking an upgrade with ctrl, set it as reference point;
                                // clicking any sibling upgrade with shift will align it in a nice arc around their shared parent
                                let parent = 0;
                                for (let i = 0; i < me.parents.length; i++) {
                                    // @ts-expect-error
                                    if (LASTHEAVENLYSELECTED.parents.includes(me.parents[i])) parent = me.parents[i];
                                }
                                if (parent) {
                                    // @ts-expect-error
                                    let origX = parent.posX;
                                    // @ts-expect-error
                                    let origY = parent.posY;
                                    // @ts-expect-error
                                    let targX = LASTHEAVENLYSELECTED.posX;
                                    // @ts-expect-error
                                    let targY = LASTHEAVENLYSELECTED.posY;
                                    let rot = Math.atan2(targY - origY, origX - targX) - Math.PI / 2;
                                    let dist = Math.floor(Math.sqrt((targX - origX) * (targX - origX) + (targY - origY) * (targY - origY)));
                                    // @ts-expect-error
                                    me.posX = parent.posX + Math.sin(rot - (Math.PI * 2) / 8) * dist;
                                    // @ts-expect-error
                                    me.posY = parent.posY + Math.cos(rot - (Math.PI * 2) / 8) * dist;
                                }
                                LASTHEAVENLYSELECTED = me;
                                console.log('Set reference point to', me.name, '.');
                            }
                            if (Game.keys['ControlRight'] || Game.keys['ControlLeft']) {
                                LASTHEAVENLYSELECTED = me;
                                console.log('Set reference point to', me.name, '.');
                            }
                            Game.SelectedHeavenlyUpgrade = me;
                        };
                    })(me)
                );
                $('heavenlyUpgrade' + me.id, true).addEventListener(
                    'mouseup',
                    (function (me) {
                        return function () {
                            if (Game.SelectedHeavenlyUpgrade == me) {
                                Game.SelectedHeavenlyUpgrade = 0;
                                Game.BuildAscendTree();
                            }
                        };
                    })(me)
                );
            }
        }
        setTimeout(function () {
            Game.tooltip.shouldHide = 1; // true;
        }, 100);
    }

    /* =====================================================================================
        COALESCING SUGAR LUMPS
        =======================================================================================*/
    static lumpMatureAge = 1;
    static lumpRipeAge = 1;
    static lumpOverripeAge = 1;
    static lumpCurrentType = 0;

    static lumpTooltip() {
        let str =
                '<div style="padding:8px;width:400px;font-size:11px;text-align:center;" id="tooltipLumps">' +
                loc('You have %1.', '<span class="price lump">' + loc('%1 sugar lump', LBeautify(Game.lumps)) + '</span>') +
                '<div class="line"></div>' +
                loc('A <b>sugar lump</b> is coalescing here, attracted by your accomplishments.');

        let age = Date.now() - Game.lumpT;
        str += '<div class="line"></div>';
        if (age < 0)
            str += loc(
                'This sugar lump has been exposed to time travel shenanigans and will take an excruciating <b>%1</b> to reach maturity.',
                Game.sayTime(((Game.lumpMatureAge - age) / 1000 + 1) * Game.fps, -1)
            );
        else if (age < Game.lumpMatureAge)
            str += loc(
                'This sugar lump is still growing and will take <b>%1</b> to reach maturity.',
                Game.sayTime(((Game.lumpMatureAge - age) / 1000 + 1) * Game.fps, -1)
            );
        else if (age < Game.lumpRipeAge)
            str += loc(
                'This sugar lump is mature and will be ripe in <b>%1</b>.<br>You may <b>click it to harvest it now</b>, but there is a <b>50% chance you won\'t get anything</b>.',
                Game.sayTime(((Game.lumpRipeAge - age) / 1000 + 1) * Game.fps, -1)
            );
        else if (age < Game.lumpOverripeAge)
            str += loc(
                '<b>This sugar lump is ripe! Click it to harvest it.</b><br>If you do nothing, it will auto-harvest in <b>%1</b>.',
                Game.sayTime(((Game.lumpOverripeAge - age) / 1000 + 1) * Game.fps, -1)
            );

        let phase = (age / Game.lumpOverripeAge) * 7;
        if (phase >= 3) {
            if (Game.lumpCurrentType != 0) str += '<div class="line"></div>';
            if (Game.lumpCurrentType == 1)
                str += loc('This sugar lump grew to be <b>bifurcated</b>; harvesting it has a 50% chance of yielding two lumps.');
            else if (Game.lumpCurrentType == 2)
                str += loc(
                    'This sugar lump grew to be <b>golden</b>; harvesting it will yield 2 to 7 lumps, your current cookies will be doubled (capped to a gain of 24 hours of your CpS), and you will find 10% more golden cookies for the next 24 hours.'
                );
            else if (Game.lumpCurrentType == 3)
                str += loc('This sugar lump was affected by the elders and grew to be <b>meaty</b>; harvesting it will yield between 0 and 2 lumps.');
            else if (Game.lumpCurrentType == 4)
                str += loc(
                    'This sugar lump is <b>caramelized</b>, its stickiness binding it to unexpected things; harvesting it will yield between 1 and 3 lumps and will refill your sugar lump cooldowns.'
                );
        }

        str += '<div class="line"></div>';
        str += loc('Your sugar lumps mature after <b>%1</b>,<br>ripen after <b>%2</b>,<br>and fall after <b>%3</b>.', [
            Game.sayTime((Game.lumpMatureAge / 1000) * Game.fps, -1),
            Game.sayTime((Game.lumpRipeAge / 1000) * Game.fps, -1),
            Game.sayTime((Game.lumpOverripeAge / 1000) * Game.fps, -1)
        ]);

        str +=
                '<div class="line"></div>' +
                loc(
                    '&bull; Sugar lumps can be harvested when mature, though if left alone beyond that point they will start ripening (increasing the chance of harvesting them) and will eventually fall and be auto-harvested after some time.<br>&bull; Sugar lumps are delicious and may be used as currency for all sorts of things.<br>&bull; Once a sugar lump is harvested, another one will start growing in its place.<br>&bull; Note that sugar lumps keep growing when the game is closed.'
                ) +
                '</div>';
        return str;
    }
    static computeLumpTimes() {
        let hour = 1000 * 60 * 60;
        Game.lumpMatureAge = hour * 20;
        Game.lumpRipeAge = hour * 23;
        if (Game.Has('Stevia Caelestis')) Game.lumpRipeAge -= hour;
        if (Game.Has('Diabetica Daemonicus')) Game.lumpMatureAge -= hour;
        if (Game.Has('Ichor syrup')) Game.lumpMatureAge -= 1000 * 60 * 7;
        if (Game.Has('Sugar aging process')) Game.lumpRipeAge -= 6000 * Math.min(600, Game.Objects['Grandma'].amount); // capped at 600 grandmas
        if (Game.hasGod && Game.BuildingsOwned % 10 == 0) {
            let godLvl = Game.hasGod('order');
            if (godLvl == 1) Game.lumpRipeAge -= hour;
            else if (godLvl == 2) Game.lumpRipeAge -= (hour / 3) * 2;
            else if (godLvl == 3) Game.lumpRipeAge -= hour / 3;
        }
        Game.lumpMatureAge /= 1 + Game.auraMult('Dragon\'s Curve') * 0.05;
        Game.lumpRipeAge /= 1 + Game.auraMult('Dragon\'s Curve') * 0.05;
        Game.lumpOverripeAge = Game.lumpRipeAge + hour;
        if (Game.Has('Glucose-charged air')) {
            Game.lumpMatureAge /= 2000;
            Game.lumpRipeAge /= 2000;
            Game.lumpOverripeAge /= 2000;
        }
    }
    static loadLumps() {
        Game.computeLumpTimes();
        if (!Game.canLumps()) Game.removeClass('lumpsOn');
        else {
            if (Game.ascensionMode != 1) Game.addClass('lumpsOn');
            Game.lumpT = Math.min(Date.now(), Game.lumpT);
            let age = Math.max(Date.now() - Game.lumpT, 0);
            let amount = Math.floor(age / Game.lumpOverripeAge); // how many lumps did we harvest since we closed the game?
            if (amount >= 1) {
                Game.harvestLumps(1, true);
                Game.lumpCurrentType = 0; // all offline lumps after the first one have a normal type
                if (amount > 1) Game.harvestLumps(amount - 1, true);
                Game.Notify('', loc('You harvested <b>%1</b> while you were away.', loc('%1 sugar lump', LBeautify(amount))), [29, 14]);
                Game.lumpT = Date.now() - (age - amount * Game.lumpOverripeAge);
                Game.computeLumpType();
            }
        }
    }
    /**
     * @param {number} total
     */
    static gainLumps(total) {
        if (Game.lumpsTotal == -1) {
            Game.lumpsTotal = 0;
            Game.lumps = 0;
        }
        Game.lumps += total;
        Game.lumpsTotal += total;

        if (Game.lumpsTotal >= 7) Game.Win('Dude, sweet');
        if (Game.lumpsTotal >= 30) Game.Win('Sugar rush');
        if (Game.lumpsTotal >= 365) Game.Win('Year\'s worth of cavities');
    }
    static clickLump() {
        triggerAnim($('lumpsIcon'), 'pucker');
        triggerAnim($('lumpsIcon2'), 'pucker');
        if (!Game.canLumps()) return;
        let age = Date.now() - Game.lumpT;
        if (age < Game.lumpMatureAge) { /* empty */ } else if (age < Game.lumpRipeAge) {
            let amount = choose([0, 1]);
            if (amount != 0) Game.Win('Hand-picked');
            Game.harvestLumps(amount);
            Game.computeLumpType();
        } else if (age < Game.lumpOverripeAge) {
            Game.harvestLumps(1);
            Game.computeLumpType();
        }
    }
    /**
     * @param {number} amount
     * @param {boolean} [silent]
     */
    static harvestLumps(amount, silent) {
        if (!Game.canLumps()) return;
        Game.lumpT = Date.now();
        let total = amount;
        if (Game.lumpCurrentType == 1 && Game.Has('Sucralosia Inutilis') && Math.random() < 0.05) total *= 2;
        else if (Game.lumpCurrentType == 1) total *= choose([1, 2]);
        else if (Game.lumpCurrentType == 2) {
            total *= choose([2, 3, 4, 5, 6, 7]);
            Game.gainBuff('sugar blessing', 24 * 60 * 60, 1);
            Game.Earn(Math.min(Game.cookiesPs * 60 * 60 * 24, Game.cookies));
            Game.Notify(loc('Sugar blessing activated!'), loc('Your cookies have been doubled.<br>+10% golden cookies for the next 24 hours.'), [29, 16]);
        } else if (Game.lumpCurrentType == 3) total *= choose([0, 0, 1, 2, 2]);
        else if (Game.lumpCurrentType == 4) {
            total *= choose([1, 2, 3]);
            Game.lumpRefill = 0;
            Game.Notify(loc('Sugar lump cooldowns cleared!'), '', [29, 27]);
        }
        total = Math.floor(total);
        Game.gainLumps(total);
        if (Game.lumpCurrentType == 1) Game.Win('Sugar sugar');
        else if (Game.lumpCurrentType == 2) Game.Win('All-natural cane sugar');
        else if (Game.lumpCurrentType == 3) Game.Win('Sweetmeats');
        else if (Game.lumpCurrentType == 4) Game.Win('Maillard reaction');

        if (!silent) {
            const rect = $('lumpsIcon2', true).getBounds();
            Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24 + 32 - 32);
            if (total > 0)
                Game.Popup(
                    '<small>+' + loc('%1 sugar lump', LBeautify(total)) + '</small>',
                    (rect.left + rect.right) / 2,
                    (rect.top + rect.bottom) / 2 - 48
                );
            else Game.Popup('<small>' + loc('Botched harvest!') + '</small>', (rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 48);
            PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
        }
        Game.computeLumpTimes();
    }
    static computeLumpType() {
        Math.seedrandom(Game.seed + '/' + Game.lumpT);
        let types = [0];
        let loop = 1;
        loop += Game.auraMult('Dragon\'s Curve');
        loop = randomRound(loop);
        for (let i = 0; i < loop; i++) {
            if (Math.random() < (Game.Has('Sucralosia Inutilis') ? 0.15 : 0.1)) types.push(1); // bifurcated
            if (Math.random() < 3 / 1000) types.push(2); // golden
            if (Math.random() < 0.1 * Game.elderWrath) types.push(3); // meaty
            if (Math.random() < 1 / 50) types.push(4); // caramelized
        }
        Game.lumpCurrentType = choose(types);
        Math.seedrandom();
    }

    static canLumps() // grammatically pleasing function name
    {
        if (Game.lumpsTotal > -1 || (Game.ascensionMode != 1 && Game.cookiesEarned + Game.cookiesReset >= 1000000000)) return true;
        return false;
    }

    static getLumpRefillMax() {
        return Game.fps * 60 * 15; // 15 minutes
    }
    static getLumpRefillRemaining() {
        return Game.lumpRefill;
    }
    static canRefillLump() {
        return Game.lumpRefill <= 0;
    }
    /**
     * @param {number} n
     * @param {{ (): void; }} func
     */
    static refillLump(n, func) {
        if (Game.lumps >= n && Game.canRefillLump()) {
            Game.spendLump(n, 'refill', function () {
                if (!Game.sesame) Game.lumpRefill = Game.getLumpRefillMax();
                func();
            })();
        }
    }
    /** @type {Function=} */
    static promptConfirmFunc;
    /**
     * @param {number} n
     * @param {any} str
     * @param {{ (): void; }} func
     * @param {undefined} [free]
     */
    static spendLump(n, str, func, free) {
        // ask if we want to spend N lumps (unless free)
        return function () {
            if (!free && Game.lumps < n) return false;
            if (!free && Game.prefs.askLumps) {
                PlaySound('snd/tick.mp3');
                Game.promptConfirmFunc = func; // bit dumb
                Game.Prompt(
                    '<id SpendLump><div class="icon" style="background:url(img/icons.png?v=' +
                        Game.version +
                        ');float:left;margin-left:-8px;margin-top:-8px;background-position:' +
                        -29 * 48 +
                        'px ' +
                        -14 * 48 +
                        'px;"></div><div style="margin:16px 8px;">' +
                        loc('Do you want to spend %1 to %2?', ['<b>' + loc('%1 sugar lump', LBeautify(n)) + '</b>', str]) +
                        '</div>',
                    [
                        [loc('Yes'), 'Game.lumps-=' + n + ';Game.promptConfirmFunc();Game.promptConfirmFunc=0;Game.recalculateGains=1;Game.ClosePrompt();'],
                        loc('No')
                    ]
                );
                return false;
            } else {
                if (!free) Game.lumps -= n;
                func();
                Game.recalculateGains = 1;
            }
            return true;
        };
    }

    static doLumps() {
        if (Game.lumpRefill > 0) Game.lumpRefill--;

        if (!Game.canLumps()) {
            Game.removeClass('lumpsOn');
            return;
        }
        if (Game.lumpsTotal == -1) {
            // first time !
            if (Game.ascensionMode != 1) Game.addClass('lumpsOn');
            Game.lumpT = Date.now();
            Game.lumpsTotal = 0;
            Game.lumps = 0;
            Game.computeLumpType();

            Game.Notify(
                loc('Sugar lumps!'),
                loc(
                    'Because you\'ve baked a <b>billion cookies</b> in total, you are now attracting <b>sugar lumps</b>. They coalesce quietly near the top of your screen, under the Stats button.<br>You will be able to harvest them when they\'re ripe, after which you may spend them on all sorts of things!'
                ),
                [23, 14]
            );
        }
        let age = Date.now() - Game.lumpT;
        if (age > Game.lumpOverripeAge) {
            age = 0;
            Game.harvestLumps(1);
            Game.computeLumpType();
        }

        let phase = Math.min(6, Math.floor((age / Game.lumpOverripeAge) * 7));
        let phase2 = Math.min(6, Math.floor((age / Game.lumpOverripeAge) * 7) + 1);
        let row = 14;
        let row2 = 14;
        let type = Game.lumpCurrentType;
        if (type == 1) {
            // double
            if (phase2 >= 6) row2 = 15;
        } else if (type == 2) {
            // golden
            if (phase >= 4) row = 16;
            if (phase2 >= 4) row2 = 16;
        } else if (type == 3) {
            // meaty
            if (phase >= 4) row = 17;
            if (phase2 >= 4) row2 = 17;
        } else if (type == 4) {
            // caramelized
            if (phase >= 4) row = 27;
            if (phase2 >= 4) row2 = 27;
        }
        let icon = [23 + Math.min(phase, 5), row];
        let icon2 = [23 + phase2, row2];
        if (age < 0) {
            icon = [17, 5];
            icon2 = [17, 5];
        }
        let opacity = Math.min(6, (age / Game.lumpOverripeAge) * 7) % 1;
        if (phase >= 6) {
            opacity = 1;
        }
        $('lumpsIcon', true).style.backgroundPosition = -icon[0] * 48 + 'px ' + -icon[1] * 48 + 'px';
        $('lumpsIcon2', true).style.backgroundPosition = -icon2[0] * 48 + 'px ' + -icon2[1] * 48 + 'px';
        $('lumpsIcon2', true).style.opacity = String(opacity);
        $('lumpsAmount', true).textContent = Beautify(Game.lumps);
    }

    /* =====================================================================================
        COOKIE ECONOMICS
        =======================================================================================*/
    /**
     * @param {number} howmuch
     */
    static Earn(howmuch) {
        Game.cookies += howmuch;
        Game.cookiesEarned += howmuch;
    }
    /**
     * @param {number} howmuch
     */
    static Spend(howmuch) {
        Game.cookies -= howmuch;
    }
    /**
     * @param {number} howmuch
     */
    static Dissolve(howmuch) {
        Game.cookies -= howmuch;
        Game.cookiesEarned -= howmuch;
        Game.cookies = Math.max(0, Game.cookies);
        Game.cookiesEarned = Math.max(0, Game.cookiesEarned);
    }
    static mouseCps() {
        let add = 0;
        if (Game.Has('Thousand fingers')) add += 0.1;
        if (Game.Has('Million fingers')) add *= 5;
        if (Game.Has('Billion fingers')) add *= 10;
        if (Game.Has('Trillion fingers')) add *= 20;
        if (Game.Has('Quadrillion fingers')) add *= 20;
        if (Game.Has('Quintillion fingers')) add *= 20;
        if (Game.Has('Sextillion fingers')) add *= 20;
        if (Game.Has('Septillion fingers')) add *= 20;
        if (Game.Has('Octillion fingers')) add *= 20;
        if (Game.Has('Nonillion fingers')) add *= 20;
        if (Game.Has('Decillion fingers')) add *= 20;
        if (Game.Has('Unshackled cursors')) add *= 25;

        let num = 0;
        for (let i in Game.Objects) {
            num += Game.Objects[i].amount;
        }
        num -= Game.Objects['Cursor'].amount;
        add *= num;
        if (Game.Has('Plastic mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Iron mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Titanium mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Adamantium mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Unobtainium mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Eludium mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Wishalloy mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Fantasteel mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Nevercrack mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Armythril mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Technobsidian mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Plasmarble mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Miraculite mouse')) add += Game.cookiesPs * 0.01;
        if (Game.Has('Aetherice mouse')) add += Game.cookiesPs * 0.01;

        if (Game.Has('Fortune #104')) add += Game.cookiesPs * 0.01;
        let mult = 1;

        if (Game.Has('Santa\'s helpers')) mult *= 1.1;
        if (Game.Has('Cookie egg')) mult *= 1.1;
        if (Game.Has('Halo gloves')) mult *= 1.1;
        if (Game.Has('Dragon claw')) mult *= 1.03;

        if (Game.Has('Aura gloves')) {
            mult *= 1 + 0.05 * Math.min(Game.Objects['Cursor'].level, Game.Has('Luminous gloves') ? 20 : 10);
        }

        mult *= Game.eff('click');

        if (Game.hasGod) {
            let godLvl = Game.hasGod('labor');
            if (godLvl == 1) mult *= 1.15;
            else if (godLvl == 2) mult *= 1.1;
            else if (godLvl == 3) mult *= 1.05;
        }

        for (let i in Game.buffs) {
            if (Game.buffs[i].multClick !== undefined) mult *= Game.buffs[i].multClick;
        }

        mult *= 1 + Game.auraMult('Dragon Cursor') * 0.05;

        let out =
                mult * Game.ComputeCps(1, Game.Has('Reinforced index finger') + Game.Has('Carpal tunnel prevention cream') + Game.Has('Ambidextrous'), add);

        //! out = Game.runModHookOnValue('cookiesPerClick', out); -- see moddingapi.disabled.js

        if (Game.hasBuff('Cursed finger')) out = Game.buffs['Cursed finger'].power;
        return out;
    }
    static computedMouseCps = 1;
    static globalCpsMult = 1;
    static unbuffedCps = 0;
    static buildingCps = 0;
    static lastClick = 0;
    static CanClick = 1;
    static autoclickerDetected = 0;
    static BigCookieState = 0; // 0 = normal, 1 = clicked (small), 2 = released/hovered (big)
    static BigCookieSize = 0;
    static BigCookieSizeD = 0;
    static BigCookieSizeT = 1;
    static cookieClickSound = Math.floor(Math.random() * 7) + 1;
    static playCookieClickSound() {
        if (Game.prefs.cookiesound) PlaySound('snd/clickb' + Game.cookieClickSound + '.mp3', 0.5);
        else PlaySound('snd/click' + Game.cookieClickSound + '.mp3', 0.5);
        Game.cookieClickSound += Math.floor(Math.random() * 4) + 1;
        if (Game.cookieClickSound > 7) Game.cookieClickSound -= 7;
    }
    /**
        * @param {MouseEvent} e
        * @param {number} amount
        */
    static ClickCookie(e, amount) {
        let now = Date.now();
        if (e) e.preventDefault();
        if (Game.OnAscend || Game.AscendTimer > 0 || Game.T < 3 || now - Game.lastClick < 1000 / ((e ? e.detail : 1) === 0 ? 3 : 50)) {
            /* empty */
        } else {
            if (now - Game.lastClick < 1000 / 15) {
                Game.autoclickerDetected += Game.fps;
                if (Game.autoclickerDetected >= Game.fps * 5) Game.Win('Uncanny clicker');
            }
            Game.loseShimmeringVeil('click');
            amount ||= Game.computedMouseCps;
            Game.Earn(amount);
            Game.handmadeCookies += amount;
            if (Game.prefs.particles) {
                Game.particleAdd();
                Game.particleAdd(Game.mouseX, Game.mouseY, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.75, 1, 2);
            }
            if (Game.prefs.numbers)
                Game.particleAdd(
                    Game.mouseX + Math.random() * 8 - 4,
                    Game.mouseY - 8 + Math.random() * 8 - 4,
                    0,
                    -2,
                    1,
                    4,
                    2,
                    '',
                    '+' + Beautify(amount, 1)
                );

            //! Game.runModHook('click'); -- see moddingapi.disabled.js

            Game.playCookieClickSound();
            Game.cookieClicks++;

            Game.clicksThisSession++;
            Game.lastClick = now;
        }
        Game.Click = 0;
    }
    static mouseX = 0;
    static mouseY = 0;
    static mouseX2 = 0;
    static mouseY2 = 0;
    static mouseMoved = 0;
    /**
     * @param {{ pageX: number; pageY: number; clientX: number; clientY: number; }} e
     */
    static GetMouseCoords(e) {
        let posx = 0;
        let posy = 0;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        } else if (e.clientX || e.clientY) {
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        let x = 0;
        let y = 32;

        Game.mouseX2 = Game.mouseX;
        Game.mouseY2 = Game.mouseY;
        Game.mouseX = (posx - x) / Game.scale;
        Game.mouseY = (posy - y) / Game.scale;
        Game.mouseMoved = 1;
        Game.lastActivity = Game.time;
    }

    static Click = 0;
    /** @type {null | EventTarget} */
    static lastClickedEl = null;
    static clicksThisSession = 0;
    /** @type {0 | EventTarget} */
    static clickFrom = 0;
    static Scroll = 0;
    static mouseDown = 0;

    /** @type {Record<string, boolean | undefined>} */
    static keys = {};

    /* =====================================================================================
        CPS RECALCULATOR
        =======================================================================================*/

    static heavenlyPower = 1; // how many CpS percents a single heavenly chip gives
    static recalculateGains = 1;
    /** @type {Record<string, number>} */
    static cookiesPsByType = {};
    /** @type {{ kittens?: number; eggs?: number; }} */
    static cookiesMultByType = {};
    // display bars with http://codepen.io/anon/pen/waGyEJ
    /** @type {Record<string, any>} */
    static effs = {};
    /**
     * @param {string} name
     * @param {undefined} [def]
     */
    static eff(name, def) {
        if (Game.effs[name] === undefined) return def === undefined ? 1 : def;
        else return Game.effs[name];
    }

    static CalculateGains() {
        Game.cookiesPs = 0;
        let mult = 1;
        // add up effect bonuses from building minigames
        let effs = {};
        for (let i in Game.Objects) {
            // @ts-expect-error aefuhsfuydrgh
            if (Game.Objects[i].minigameLoaded && Game.Objects[i].minigame.effs) {
                // @ts-expect-error aefuhsfuydrgh2
                const myEffs = Game.Objects[i].minigame.effs;
                for (let ii in myEffs) {
                    // @ts-expect-error aefuhsfuydrgh3
                    if (effs[ii]) effs[ii] *= myEffs[ii];
                    // @ts-expect-error aefuhsfuydrgh4
                    else effs[ii] = myEffs[ii];
                }
            }
        }
        Game.effs = effs;

        // @ts-expect-error is this needed? i dont know...
        if (Game.ascensionMode != 1) mult += Number.parseFloat(Game.prestige) * 0.01 * Game.heavenlyPower * Game.GetHeavenlyMultiplier();

        mult *= Game.eff('cps');

        if (Game.Has('Heralds') && Game.ascensionMode != 1) mult *= 1 + 0.01 * Game.heralds;

        for (let i in Game.cookieUpgrades) {
            let me = Game.cookieUpgrades[i];
            if (Game.Has(me.name)) {
                mult *= 1 + (typeof me.power === 'function' ? me.power(me) : me.power) * 0.01;
            }
        }

        if (Game.Has('Specialized chocolate chips')) mult *= 1.01;
        if (Game.Has('Designer cocoa beans')) mult *= 1.02;
        if (Game.Has('Underworld ovens')) mult *= 1.03;
        if (Game.Has('Exotic nuts')) mult *= 1.04;
        if (Game.Has('Arcane sugar')) mult *= 1.05;

        if (Game.Has('Increased merriness')) mult *= 1.15;
        if (Game.Has('Improved jolliness')) mult *= 1.15;
        if (Game.Has('A lump of coal')) mult *= 1.01;
        if (Game.Has('An itchy sweater')) mult *= 1.01;
        if (Game.Has('Santa\'s dominion')) mult *= 1.2;

        if (Game.Has('Fortune #100')) mult *= 1.01;
        if (Game.Has('Fortune #101')) mult *= 1.07;

        if (Game.Has('Dragon scale')) mult *= 1.03;

        let buildMult = 1;
        if (Game.hasGod) {
            let godLvl = Game.hasGod('asceticism');
            if (godLvl == 1) mult *= 1.15;
            else if (godLvl == 2) mult *= 1.1;
            else if (godLvl == 3) mult *= 1.05;

            godLvl = Game.hasGod('ages');
            if (godLvl == 1) mult *= 1 + 0.15 * Math.sin((Date.now() / 1000 / (60 * 60 * 3)) * Math.PI * 2);
            else if (godLvl == 2) mult *= 1 + 0.15 * Math.sin((Date.now() / 1000 / (60 * 60 * 12)) * Math.PI * 2);
            else if (godLvl == 3) mult *= 1 + 0.15 * Math.sin((Date.now() / 1000 / (60 * 60 * 24)) * Math.PI * 2);

            godLvl = Game.hasGod('decadence');
            if (godLvl == 1) buildMult *= 0.93;
            else if (godLvl == 2) buildMult *= 0.95;
            else if (godLvl == 3) buildMult *= 0.98;

            godLvl = Game.hasGod('industry');
            if (godLvl == 1) buildMult *= 1.1;
            else if (godLvl == 2) buildMult *= 1.06;
            else if (godLvl == 3) buildMult *= 1.03;

            godLvl = Game.hasGod('labor');
            if (godLvl == 1) buildMult *= 0.97;
            else if (godLvl == 2) buildMult *= 0.98;
            else if (godLvl == 3) buildMult *= 0.99;
        }

        if (Game.Has('Santa\'s legacy')) mult *= 1 + (Game.santaLevel + 1) * 0.03;

        Game.milkProgress = Game.AchievementsOwned / 25;
        let milkMult = 1;
        if (Game.Has('Santa\'s milk and cookies')) milkMult *= 1.05;
        milkMult *= 1 + Game.auraMult('Breath of Milk') * 0.05;
        if (Game.hasGod) {
            let godLvl = Game.hasGod('mother');
            if (godLvl == 1) milkMult *= 1.1;
            else if (godLvl == 2) milkMult *= 1.05;
            else if (godLvl == 3) milkMult *= 1.03;
        }
        milkMult *= Game.eff('milk');

        let catMult = 1;

        if (Game.Has('Kitten helpers')) catMult *= 1 + Game.milkProgress * 0.1 * milkMult;
        if (Game.Has('Kitten workers')) catMult *= 1 + Game.milkProgress * 0.125 * milkMult;
        if (Game.Has('Kitten engineers')) catMult *= 1 + Game.milkProgress * 0.15 * milkMult;
        if (Game.Has('Kitten overseers')) catMult *= 1 + Game.milkProgress * 0.175 * milkMult;
        if (Game.Has('Kitten managers')) catMult *= 1 + Game.milkProgress * 0.2 * milkMult;
        if (Game.Has('Kitten accountants')) catMult *= 1 + Game.milkProgress * 0.2 * milkMult;
        if (Game.Has('Kitten specialists')) catMult *= 1 + Game.milkProgress * 0.2 * milkMult;
        if (Game.Has('Kitten experts')) catMult *= 1 + Game.milkProgress * 0.2 * milkMult;
        if (Game.Has('Kitten consultants')) catMult *= 1 + Game.milkProgress * 0.2 * milkMult;
        if (Game.Has('Kitten assistants to the regional manager')) catMult *= 1 + Game.milkProgress * 0.175 * milkMult;
        if (Game.Has('Kitten marketeers')) catMult *= 1 + Game.milkProgress * 0.15 * milkMult;
        if (Game.Has('Kitten analysts')) catMult *= 1 + Game.milkProgress * 0.125 * milkMult;
        if (Game.Has('Kitten executives')) catMult *= 1 + Game.milkProgress * 0.115 * milkMult;
        if (Game.Has('Kitten admins')) catMult *= 1 + Game.milkProgress * 0.11 * milkMult;
        if (Game.Has('Kitten angels')) catMult *= 1 + Game.milkProgress * 0.1 * milkMult;
        if (Game.Has('Fortune #103')) catMult *= 1 + Game.milkProgress * 0.05 * milkMult;

        Game.cookiesMultByType['kittens'] = catMult;

        for (let i in Game.Objects) {
            const me = Game.Objects[i];
            me.storedCps = me.cps(me);
            if (Game.ascensionMode != 1) me.storedCps *= (1 + me.level * 0.01) * buildMult;
            if (me.id == 1 && Game.Has('Milkhelp&reg; lactose intolerance relief tablets')) me.storedCps *= 1 + 0.05 * Game.milkProgress * milkMult; // this used to be "me.storedCps*=1+0.1*Math.pow(catMult-1,0.5)" which was. hmm
            me.storedTotalCps = me.amount * me.storedCps;
            Game.cookiesPs += me.storedTotalCps;
            Game.cookiesPsByType[me.name] = me.storedTotalCps;
        }
        // cps from buildings only
        Game.buildingCps = Game.cookiesPs;

        if (Game.Has('"egg"')) {
            Game.cookiesPs += 9;
            Game.cookiesPsByType['"egg"'] = 9;
        } // "egg"

        mult *= catMult;

        let eggMult = 1;
        if (Game.Has('Chicken egg')) eggMult *= 1.01;
        if (Game.Has('Duck egg')) eggMult *= 1.01;
        if (Game.Has('Turkey egg')) eggMult *= 1.01;
        if (Game.Has('Quail egg')) eggMult *= 1.01;
        if (Game.Has('Robin egg')) eggMult *= 1.01;
        if (Game.Has('Ostrich egg')) eggMult *= 1.01;
        if (Game.Has('Cassowary egg')) eggMult *= 1.01;
        if (Game.Has('Salmon roe')) eggMult *= 1.01;
        if (Game.Has('Frogspawn')) eggMult *= 1.01;
        if (Game.Has('Shark egg')) eggMult *= 1.01;
        if (Game.Has('Turtle egg')) eggMult *= 1.01;
        if (Game.Has('Ant larva')) eggMult *= 1.01;
        if (Game.Has('Century egg')) {
            // the boost increases a little every day, with diminishing returns up to +10% on the 100th day
            let day = (Math.floor((Date.now() - Game.startDate) / 1000 / 10) * 10) / 60 / 60 / 24;
            day = Math.min(day, 100);
            eggMult *= 1 + (1 - Math.pow(1 - day / 100, 3)) * 0.1;
        }

        Game.cookiesMultByType['eggs'] = eggMult;
        mult *= eggMult;

        if (Game.Has('Sugar baking')) mult *= 1 + Math.min(100, Game.lumps) * 0.01;

        mult *= 1 + Game.auraMult('Radiant Appetite');

        let rawCookiesPs = Game.cookiesPs * mult;
        for (let i in Game.CpsAchievements) {
            if (rawCookiesPs >= Game.CpsAchievements[i].threshold) Game.Win(Game.CpsAchievements[i].name);
        }
        Game.cookiesPsRaw = rawCookiesPs;
        Game.cookiesPsRawHighest = Math.max(Game.cookiesPsRawHighest, rawCookiesPs);

        let n = Game.shimmerTypes['golden'].n;
        let auraMult = Game.auraMult('Dragon\'s Fortune');
        for (let i = 0; i < n; i++) {
            mult *= 1 + auraMult * 1.23;
        }

        window.name = Game.bakeryName.toLowerCase();
        if (window.name == 'orteil') mult *= 0.99;
        else if (window.name == 'ortiel') mult *= 0.98; // or so help me

        let sucking = 0;
        for (let i in Game.wrinklers) {
            if (Game.wrinklers[i].phase == 2) sucking++;
        }
        let suckRate = 1 / 20; // each wrinkler eats a twentieth of your CpS
        suckRate *= Game.eff('wrinklerEat');

        Game.cpsSucked = sucking * suckRate;

        if (Game.Has('Elder Covenant')) mult *= 0.95;

        if (Game.Has('Golden switch [off]')) {
            let goldenSwitchMult = 1.5;
            if (Game.Has('Residual luck')) {
                let upgrades = Game.goldenCookieUpgrades;
                for (let i in upgrades) {
                    if (Game.Has(upgrades[i])) goldenSwitchMult += 0.1;
                }
            }
            mult *= goldenSwitchMult;
        }
        if (Game.Has('Shimmering veil [off]')) {
            mult *= 1 + Game.getVeilBoost();
        }
        if (Game.Has('Magic shenanigans')) mult *= 1000;
        if (Game.Has('Occult obstruction')) mult *= 0;

        //! Game.cookiesPs = Game.runModHookOnValue('cps', Game.cookiesPs); -- see moddingapi.disabled.js

        // cps without golden cookie effects
        Game.unbuffedCps = Game.cookiesPs * mult;

        for (let i in Game.buffs) {
            if (Game.buffs[i].multCpS !== undefined) mult *= Game.buffs[i].multCpS;
        }

        Game.globalCpsMult = mult;
        Game.cookiesPs *= Game.globalCpsMult;

        Game.computedMouseCps = Game.mouseCps();

        Game.computeLumpTimes();

        Game.recalculateGains = 0;
    }

    static dropRateMult() {
        let rate = 1;
        if (Game.Has('Green yeast digestives')) rate *= 1.03;
        if (Game.Has('Dragon teddy bear')) rate *= 1.03;
        rate *= Game.eff('itemDrops');
        rate *= 1 + Game.auraMult('Mind Over Matter') * 0.25;
        if (Game.Has('Santa\'s bottomless bag')) rate *= 1.1;
        if (Game.Has('Cosmic beginner\'s luck') && !Game.Has('Heavenly chip secret')) rate *= 5;
        return rate;
    }
    /* =====================================================================================
        SHIMMERS (GOLDEN COOKIES & SUCH)
        =======================================================================================*/
    static shimmersL = $('shimmers', true);
    /** @type {Shimmer[]} */
    static shimmers = []; // all shimmers currently on the screen
    static shimmersN = Math.floor(Math.random() * 10000);
    static shimmer = Shimmer;

    static updateShimmers() // run shimmer functions, kill overtimed shimmers and spawn new ones
    {
        for (let i in Game.shimmers) Game.shimmers[i].update();

        // cookie storm!
        if (Game.hasBuff('Cookie storm') && Math.random() < 0.5) {
            const newShimmer = new Game.shimmer('golden', { type: 'cookie storm drop' }, 1);
            newShimmer.dur = Math.ceil(Math.random() * 4 + 1);
            newShimmer.life = Math.ceil(Game.fps * newShimmer.dur);
            newShimmer.sizeMult = Math.random() * 0.75 + 0.25;
        }

        // spawn shimmers
        for (let i in Game.shimmerTypes) {
            const me = Game.shimmerTypes[/** @type {keyof typeof Game.shimmerTypes} */ (i)];
            if (me.spawnsOnTimer && me.spawnConditions() && !me.spawned) {
                // only run on shimmer types that work on a timer
                // no shimmer spawned for this type? check the timer and try to spawn one
                me.time++;
                if (Math.random() < Math.pow(Math.max(0, (me.time - me.minTime) / (me.maxTime - me.minTime)), 5)) {
                    let newShimmer = new Game.shimmer(/** @type {keyof typeof Game.shimmerTypes} */ (i));
                    newShimmer.spawnLead = true;
                    if (Game.Has('Distilled essence of redoubled luck') && Math.random() < 0.01)
                        newShimmer = new Game.shimmer(/** @type {keyof typeof Game.shimmerTypes} */ (i));
                    me.spawned = 1;
                }
            }
        }
    }
    static killShimmers() // stop and delete all shimmers (used on resetting etc)
    {
        for (let i = Game.shimmers.length - 1; i >= 0; i--) {
            Game.shimmers[i].die();
        }
        for (let i in Game.shimmerTypes) {
            const me = Game.shimmerTypes[/** @type {keyof typeof Game.shimmerTypes} */ (i)];
            if (me.reset) me.reset();
            me.n = 0;
            if (me.spawnsOnTimer) {
                me.time = 0;
                me.spawned = 0;
                me.minTime = me.getMinTime(me);
                me.maxTime = me.getMaxTime(me);
            }
        }
    }

    static shimmerTypes = {
        // in these, "me" refers to the shimmer itself, and "this" to the shimmer's type object
        golden: {
            n: 0,
            chain: 0,
            totalFromChain: 0,
            reset() {
                this.chain = 0;
                this.totalFromChain = 0;
                this.last = '';
            },
            /**
             * @param {any} me
             */
            initFunc(me) {
                if (!this.spawned && me.force != 'cookie storm drop' && Game.chimeType != 0 && Game.ascensionMode != 1)
                    Game.playGoldenCookieChime();

                // set image
                let bgPic = 'img/goldCookie.png';
                let picX = 0;
                let picY = 0;

                if (
                    (!me.forceObj || !me.forceObj.noWrath) &&
                        ((me.forceObj && me.forceObj.wrath) ||
                            (Game.elderWrath == 1 && Math.random() < 1 / 3) ||
                            (Game.elderWrath == 2 && Math.random() < 2 / 3) ||
                            Game.elderWrath == 3 ||
                            (Game.hasGod && Game.hasGod('scorn')))
                ) {
                    me.wrath = 1;
                    bgPic = Game.season == 'halloween' ? 'img/spookyCookie.png' : 'img/wrathCookie.png';
                } else {
                    me.wrath = 0;
                }

                if (Game.season == 'valentines') {
                    bgPic = 'img/hearts.png';
                    picX = Math.floor(Math.random() * 8);
                } else if (Game.season == 'fools') {
                    bgPic = 'img/contract.png';
                    if (me.wrath) bgPic = 'img/wrathContract.png';
                } else if (Game.season == 'easter') {
                    bgPic = 'img/bunnies.png';
                    picX = Math.floor(Math.random() * 4);
                    picY = 0;
                    if (me.wrath) picY = 1;
                }

                const GameBounds = ASSERT_NOT_NULL(Game.bounds);
                me.x = Math.floor(Math.random() * Math.max(0, GameBounds.right - 300 - GameBounds.left - 128) + GameBounds.left + 64) - 64;
                me.y = Math.floor(Math.random() * Math.max(0, GameBounds.bottom - GameBounds.top - 128) + GameBounds.top + 64) - 64;
                me.l.style.left = me.x + 'px';
                me.l.style.top = me.y + 'px';
                me.l.style.width = '96px';
                me.l.style.height = '96px';
                me.l.style.backgroundImage = 'url(' + bgPic + ')';
                me.l.style.backgroundPosition = -picX * 96 + 'px ' + -picY * 96 + 'px';
                me.l.style.opacity = '0';
                me.l.style.display = 'block';
                me.l.setAttribute('alt', loc(me.wrath ? 'Wrath cookie' : 'Golden cookie'));

                me.life = 1; // the cookie's current progression through its lifespan (in frames)
                me.dur = 13; // duration; the cookie's lifespan in seconds before it despawns

                let dur = 13;
                if (Game.Has('Lucky day')) dur *= 2;
                if (Game.Has('Serendipity')) dur *= 2;
                if (Game.Has('Decisive fate')) dur *= 1.05;
                if (Game.Has('Lucky digit')) dur *= 1.01;
                if (Game.Has('Lucky number')) dur *= 1.01;
                if (Game.Has('Lucky payout')) dur *= 1.01;
                dur *= !me.wrath ? Game.eff('goldenCookieDur') : Game.eff('wrathCookieDur');
                dur *= Math.pow(0.95, Game.shimmerTypes['golden'].n - 1); // 5% shorter for every other golden cookie on the screen
                if (this.chain > 0) dur = Math.max(2, 10 / this.chain); // this is hilarious
                me.dur = dur;
                me.life = Math.ceil(Game.fps * me.dur);
                me.sizeMult = 1;
            },
            /**
             * @param {any} me
             */
            updateFunc(me) {
                let curve = 1 - Math.pow((me.life / (Game.fps * me.dur)) * 2 - 1, 4);
                me.l.style.opacity = curve;
                // this line makes each golden cookie pulse in a unique way
                if (Game.prefs.fancy)
                    me.l.style.transform =
                            'rotate(' +
                            (Math.sin(me.id * 0.69) * 24 +
                                Math.sin(Game.T * (0.35 + Math.sin(me.id * 0.97) * 0.15) + me.id) *
                                (3 + Math.sin(me.id * 0.36) * 2)) +
                            'deg) scale(' +
                            me.sizeMult *
                            (1 + Math.sin(me.id * 0.53) * 0.2) *
                            curve *
                            (1 + (0.06 + Math.sin(me.id * 0.41) * 0.05) * Math.sin(Game.T * (0.25 + Math.sin(me.id * 0.73) * 0.15) + me.id)) +
                            ')';
                me.life--;
                if (me.life <= 0) {
                    this.missFunc(me);
                    me.die();
                }
            },
            /**
             * @param {any} me
             */
            popFunc(me) {
                // get achievs and stats
                if (me.spawnLead) {
                    Game.goldenClicks++;
                    Game.goldenClicksLocal++;

                    if (Game.goldenClicks >= 1) Game.Win('Golden cookie');
                    if (Game.goldenClicks >= 7) Game.Win('Lucky cookie');
                    if (Game.goldenClicks >= 27) Game.Win('A stroke of luck');
                    if (Game.goldenClicks >= 77) Game.Win('Fortune');
                    if (Game.goldenClicks >= 777) Game.Win('Leprechaun');
                    if (Game.goldenClicks >= 7777) Game.Win('Black cat\'s paw');
                    if (Game.goldenClicks >= 27777) Game.Win('Seven horseshoes');

                    if (Game.goldenClicks >= 7) Game.Unlock('Lucky day');
                    if (Game.goldenClicks >= 27) Game.Unlock('Serendipity');
                    if (Game.goldenClicks >= 77) Game.Unlock('Get lucky');

                    if (me.life / Game.fps > me.dur - 1) Game.Win('Early bird');
                    if (me.life < Game.fps) Game.Win('Fading luck');
                }

                if (Game.forceUnslotGod && Game.forceUnslotGod('asceticism')) ASSERT_NOT_NULL(Game.useSwap)(1000000);

                // select an effect
                let list = [];
                if (me.wrath > 0) list.push('clot', 'multiply cookies', 'ruin cookies');
                else list.push('frenzy', 'multiply cookies');
                if (me.wrath > 0 && Game.hasGod && Game.hasGod('scorn')) list.push('clot', 'ruin cookies', 'clot', 'ruin cookies');
                if (me.wrath > 0 && Math.random() < 0.3) list.push('blood frenzy', 'chain cookie', 'cookie storm');
                else if (Math.random() < 0.03 && Game.cookiesEarned >= 100000) list.push('chain cookie', 'cookie storm');
                if (Math.random() < 0.05 && Game.season == 'fools') list.push('everything must go');
                if (Math.random() < 0.1 && (Math.random() < 0.05 || !Game.hasBuff('Dragonflight'))) list.push('click frenzy');
                if (me.wrath && Math.random() < 0.1) list.push('cursed finger');

                if (Game.BuildingsOwned >= 10 && Math.random() < 0.25) list.push('building special');

                if (Game.canLumps() && Math.random() < 0.0005) list.push('free sugar lump');

                if ((me.wrath == 0 && Math.random() < 0.15) || Math.random() < 0.05) {
                    if (Math.random() < Game.auraMult('Reaper of Fields')) list.push('dragon harvest');
                    if (Math.random() < Game.auraMult('Dragonflight')) list.push('dragonflight');
                }

                if (this.last != '' && Math.random() < 0.8 && list.includes(this.last)) list.splice(list.indexOf(this.last), 1); // 80% chance to force a different one
                if (Math.random() < 0.0001) list.push('blab');
                let choice = choose(list);

                if (this.chain > 0) choice = 'chain cookie';
                if (me.force != '') {
                    this.chain = 0;
                    choice = me.force;
                    me.force = '';
                }
                if (choice != 'chain cookie') this.chain = 0;

                this.last = choice;

                // create buff for effect
                // buff duration multiplier
                let effectDurMod = 1;
                if (Game.Has('Get lucky')) effectDurMod *= 2;
                if (Game.Has('Lasting fortune')) effectDurMod *= 1.1;
                if (Game.Has('Lucky digit')) effectDurMod *= 1.01;
                if (Game.Has('Lucky number')) effectDurMod *= 1.01;
                if (Game.Has('Green yeast digestives')) effectDurMod *= 1.01;
                if (Game.Has('Lucky payout')) effectDurMod *= 1.01;
                effectDurMod *= 1 + Game.auraMult('Epoch Manipulator') * 0.05;
                effectDurMod *= !me.wrath ? Game.eff('goldenCookieEffDur') : Game.eff('wrathCookieEffDur');

                if (Game.hasGod) {
                    let godLvl = Game.hasGod('decadence');
                    if (godLvl == 1) effectDurMod *= 1.07;
                    else if (godLvl == 2) effectDurMod *= 1.05;
                    else if (godLvl == 3) effectDurMod *= 1.02;
                }

                // effect multiplier (from lucky etc)
                let mult = 1;
                if (me.wrath > 0) mult *= 1 + Game.auraMult('Unholy Dominion') * 0.1;
                else if (me.wrath == 0) mult *= 1 + Game.auraMult('Ancestral Metamorphosis') * 0.1;
                if (Game.Has('Green yeast digestives')) mult *= 1.01;
                if (Game.Has('Dragon fang')) mult *= 1.03;
                mult *= !me.wrath ? Game.eff('goldenCookieGain') : Game.eff('wrathCookieGain');

                let popup = '';
                let buff;

                if (choice == 'building special') {
                    let time = Math.ceil(30 * effectDurMod);
                    let list = [];
                    for (let i in Game.Objects) {
                        if (Game.Objects[i].amount >= 10) list.push(Game.Objects[i].id);
                    }
                    if (list.length === 0) {
                        choice = 'frenzy';
                    } // default to frenzy if no proper building
                    else {
                        let obj = choose(list);
                        let pow = Game.ObjectsById[obj].amount / 10 + 1;
                        buff = me.wrath && Math.random() < 0.3 ? Game.gainBuff('building debuff', time, pow, obj) : Game.gainBuff('building buff', time, pow, obj);
                    }
                }

                if (choice == 'free sugar lump') {
                    Game.gainLumps(1);
                    popup = locStr('Sweet!<br><small>Found 1 sugar lump!</small>');
                } else if (choice == 'frenzy') {
                    buff = Game.gainBuff('frenzy', Math.ceil(77 * effectDurMod), 7);
                } else if (choice == 'dragon harvest') {
                    buff = Game.gainBuff('dragon harvest', Math.ceil(60 * effectDurMod), 15);
                } else if (choice == 'everything must go') {
                    buff = Game.gainBuff('everything must go', Math.ceil(8 * effectDurMod), 5);
                } else if (choice == 'multiply cookies') {
                    let moni = mult * Math.min(Game.cookies * 0.15, Game.cookiesPs * 60 * 15) + 13; // add 15% to cookies owned (+13), or 15 minutes of cookie production - whichever is lowest
                    Game.Earn(moni);
                    popup = loc('Lucky!') + '<br><small>' + loc('+%1!', loc('%1 cookie', LBeautify(moni))) + '</small>';
                } else if (choice == 'ruin cookies') {
                    let moni = Math.min(Game.cookies * 0.05, Game.cookiesPs * 60 * 10) + 13; // lose 5% of cookies owned (-13), or 10 minutes of cookie production - whichever is lowest
                    moni = Math.min(Game.cookies, moni);
                    Game.Spend(moni);
                    popup = loc('Ruin!') + '<br><small>' + loc('Lost %1!', loc('%1 cookie', LBeautify(moni))) + '</small>';
                } else if (choice == 'blood frenzy') {
                    buff = Game.gainBuff('blood frenzy', Math.ceil(6 * effectDurMod), 666);
                } else if (choice == 'clot') {
                    buff = Game.gainBuff('clot', Math.ceil(66 * effectDurMod), 0.5);
                } else if (choice == 'cursed finger') {
                    buff = Game.gainBuff('cursed finger', Math.ceil(10 * effectDurMod), Game.cookiesPs * Math.ceil(10 * effectDurMod));
                } else if (choice == 'click frenzy') {
                    buff = Game.gainBuff('click frenzy', Math.ceil(13 * effectDurMod), 777);
                } else if (choice == 'dragonflight') {
                    buff = Game.gainBuff('dragonflight', Math.ceil(10 * effectDurMod), 1111);
                    if (Math.random() < 0.8) Game.killBuff('Click frenzy');
                } else if (choice == 'chain cookie') {
                    // fix by Icehawk78
                    if (this.chain == 0) this.totalFromChain = 0;
                    this.chain++;
                    let digit = me.wrath ? 6 : 7;
                    if (this.chain == 1) this.chain += Math.max(0, Math.ceil(Math.log10(Game.cookies)) - 10);

                    let maxPayout = Math.min(Game.cookiesPs * 60 * 60 * 6, Game.cookies * 0.5) * mult;
                    let moni = Math.max(digit, Math.min(Math.floor((1 / 9) * Math.pow(10, this.chain) * digit * mult), maxPayout));
                    let nextMoni = Math.max(digit, Math.min(Math.floor((1 / 9) * Math.pow(10, this.chain + 1) * digit * mult), maxPayout));
                    this.totalFromChain += moni;

                    // break the chain if we're above 5 digits AND it's more than 50% of our bank, it grants more than 6 hours of our CpS, or just a 1% chance each digit (update : removed digit limit)
                    if (Math.random() < 0.01 || nextMoni >= maxPayout) {
                        this.chain = 0;
                        popup =
                                loc('Cookie chain') +
                                '<br><small>' +
                                loc('+%1!', loc('%1 cookie', LBeautify(moni))) +
                                '<br>' +
                                loc('Cookie chain over. You made %1.', loc('%1 cookie', LBeautify(this.totalFromChain))) +
                                '</small>';
                    } else {
                        popup = loc('Cookie chain') + '<br><small>' + loc('+%1!', loc('%1 cookie', LBeautify(moni))) + '</small>';
                    }
                    Game.Earn(moni);
                } else if (choice == 'cookie storm') {
                    buff = Game.gainBuff('cookie storm', Math.ceil(7 * effectDurMod), 7);
                } else if (choice == 'cookie storm drop') {
                    let moni = Math.max(mult * (Game.cookiesPs * 60 * Math.floor(Math.random() * 7 + 1)), Math.floor(Math.random() * 7 + 1)); // either 1-7 cookies or 1-7 minutes of cookie production, whichever is highest
                    Game.Earn(moni);
                    popup = '<div style="font-size:75%;">' + loc('+%1!', loc('%1 cookie', LBeautify(moni))) + '</div>';
                } else if (choice == 'blab') {
                    // sorry (it's really rare)
                    let str = EN
                        ? choose([
                            'Cookie crumbliness x3 for 60 seconds!',
                            'Chocolatiness x7 for 77 seconds!',
                            'Dough elasticity halved for 66 seconds!',
                            'Golden cookie shininess doubled for 3 seconds!',
                            'World economy halved for 30 seconds!',
                            'Grandma kisses 23% stingier for 45 seconds!',
                            'Thanks for clicking!',
                            'Fooled you! This one was just a test.',
                            'Golden cookies clicked +1!',
                            'Your click has been registered. Thank you for your cooperation.',
                            'Thanks! That hit the spot!',
                            'Thank you. A team has been dispatched.',
                            'They know.',
                            'Oops. This was just a chocolate cookie with shiny aluminium foil.',
                            'Eschaton immanentized!',
                            'Oh, that tickled!',
                            'Again.',
                            'You\'ve made a grave mistake.',
                            'Chocolate chips reshuffled!',
                            'Randomized chance card outcome!',
                            'Mouse acceleration +0.03%!',
                            'Ascension bonuses x5,000 for 0.1 seconds!',
                            'Gained 1 extra!',
                            'Sorry, better luck next time!',
                            'I felt that.',
                            'Nice try, but no.',
                            'Wait, sorry, I wasn\'t ready yet.',
                            'Yippee!',
                            'Bones removed.',
                            'Organs added.',
                            'Did you just click that?',
                            'Huh? Oh, there was nothing there.',
                            'You saw nothing.',
                            'It seems you hallucinated that golden cookie.',
                            'This golden cookie was a complete fabrication.',
                            'In theory there\'s no wrong way to click a golden cookie, but you just did that, somehow.',
                            'All cookies multiplied by 999!<br>All cookies divided by 999!',
                            'Why?'
                        ])
                        : choose(loc('Cookie blab'));
                    popup = str;
                }

                // @ts-expect-error investigate gainBuff
                if (popup == '' && buff && buff.name && buff.desc) popup = buff.dname + '<div style="font-size:65%;">' + buff.desc + '</div>';
                if (popup != '') Game.Popup(popup, me.x + me.l.offsetWidth / 2, me.y);

                Game.DropEgg(0.9);

                // sparkle and kill the shimmer
                Game.SparkleAt(me.x + 48, me.y + 48);
                if (choice == 'cookie storm drop') {
                    if (Game.prefs.cookiesound) PlaySound('snd/clickb' + Math.floor(Math.random() * 7 + 1) + '.mp3', 0.75);
                    else PlaySound('snd/click' + Math.floor(Math.random() * 7 + 1) + '.mp3', 0.75);
                } else PlaySound('snd/shimmerClick.mp3');
                me.die();
            },
            /**
             * @param {{ x: number; l: { offsetWidth: number; }; y: any; spawnLead: any; }} me
             */
            missFunc(me) {
                if (this.chain > 0 && this.totalFromChain > 0) {
                    Game.Popup(
                        loc('Cookie chain broken.<br><small>You made %1.</small>', loc('%1 cookie', LBeautify(this.totalFromChain))),
                        me.x + me.l.offsetWidth / 2,
                        me.y
                    );
                    this.chain = 0;
                    this.totalFromChain = 0;
                }
                if (me.spawnLead) Game.missedGoldenClicks++;
            },
            spawnsOnTimer: true,
            spawnConditions() {
                return !Game.Has('Golden switch [off]') ? true : false;
            },
            spawned: 0,
            time: 0,
            minTime: 0,
            maxTime: 0,
            /**
             * @param {{ wrath: any; }} me
             * @param {number} m
             */
            getTimeMod(me, m) {
                if (Game.Has('Lucky day')) m /= 2;
                if (Game.Has('Serendipity')) m /= 2;
                if (Game.Has('Golden goose egg')) m *= 0.95;
                if (Game.Has('Heavenly luck')) m *= 0.95;
                if (Game.Has('Green yeast digestives')) m *= 0.99;
                m *= 1 - Game.auraMult('Arcane Aura') * 0.05;
                if (Game.hasBuff('Sugar blessing')) m *= 0.9;
                if (Game.season == 'easter' && Game.Has('Starspawn')) m *= 0.98;
                else if (Game.season == 'halloween' && Game.Has('Starterror')) m *= 0.98;
                else if (Game.season == 'valentines' && Game.Has('Starlove')) m *= 0.98;
                else if (Game.season == 'fools' && Game.Has('Startrade')) m *= 0.95;
                m *= !me.wrath ? 1 / Game.eff('goldenCookieFreq') : 1 / Game.eff('wrathCookieFreq');
                if (Game.hasGod) {
                    let godLvl = Game.hasGod('industry');
                    if (godLvl == 1) m *= 1.1;
                    else if (godLvl == 2) m *= 1.06;
                    else if (godLvl == 3) m *= 1.03;
                    godLvl = Game.hasGod('mother');
                    if (godLvl == 1) m *= 1.15;
                    else if (godLvl == 2) m *= 1.1;
                    else if (godLvl == 3) m *= 1.05;

                    if (Game.season != '') {
                        let godLvl = Game.hasGod('seasons');
                        if (Game.season != 'fools') {
                            if (godLvl == 1) m *= 0.97;
                            else if (godLvl == 2) m *= 0.98;
                            else if (godLvl == 3) m *= 0.99;
                        } else {
                            if (godLvl == 1) m *= 0.955;
                            else if (godLvl == 2) m *= 0.97;
                            else if (godLvl == 3) m *= 0.985;
                        }
                    }
                }
                if (this.chain > 0) m = 0.05;
                if (Game.Has('Gold hoard')) m = 0.01;
                return Math.ceil(Game.fps * 60 * m);
            },
            /**
             * @param {any} me
             */
            getMinTime(me) {
                let m = 5;
                return this.getTimeMod(me, m);
            },
            /**
             * @param {any} me
             */
            getMaxTime(me) {
                let m = 15;
                return this.getTimeMod(me, m);
            },
            last: ''
        },
        reindeer: {
            n: 0,
            reset: STUB,
            /**
             * @param {any} me
             */
            initFunc(me) {
                if (!this.spawned && Game.chimeType != 0 && Game.ascensionMode != 1) PlaySound('snd/jingle.mp3');

                me.x = -128;
                me.y = Math.floor(Math.random() * Math.max(0,
                    ASSERT_NOT_NULL(Game.bounds).bottom - ASSERT_NOT_NULL(Game.bounds).top - 256
                ) + ASSERT_NOT_NULL(Game.bounds).top + 128) - 128;
                me.l.style.width = '167px';
                me.l.style.height = '212px';
                me.l.style.backgroundImage = 'url(img/frostedReindeer.png)';
                me.l.style.opacity = '0';
                me.l.style.display = 'block';
                me.l.setAttribute('alt', loc('Reindeer'));

                me.life = 1; // the reindeer's current progression through its lifespan (in frames)
                me.dur = 4; // duration; the cookie's lifespan in seconds before it despawns

                let dur = 4;
                if (Game.Has('Weighted sleighs')) dur *= 2;
                dur *= Game.eff('reindeerDur');
                me.dur = dur;
                me.life = Math.ceil(Game.fps * me.dur);
                me.sizeMult = 1;
            },
            /**
             * @param {any} me
             */
            updateFunc(me) {
                let curve = 1 - Math.pow((me.life / (Game.fps * me.dur)) * 2 - 1, 12);
                me.l.style.opacity = String(curve);
                me.l.style.transform =
                        'translate(' +
                        (me.x + 
                            (ASSERT_NOT_NULL(Game.bounds).right - ASSERT_NOT_NULL(Game.bounds).left) *
                            (1 - me.life / (Game.fps * me.dur))) +
                        'px,' +
                        (me.y - Math.abs(Math.sin(me.life * 0.1)) * 128) +
                        'px) rotate(' +
                        Math.sin(me.life * 0.2 + 0.3) * 10 +
                        'deg) scale(' +
                        me.sizeMult * (1 + Math.sin(me.id * 0.53) * 0.1) +
                        ')';
                me.life--;
                if (me.life <= 0) {
                    this.missFunc(me);
                    me.die();
                }
            },
            /**
             * @param {any} me
             */
            popFunc(me) {
                // get achievs and stats
                if (me.spawnLead) {
                    Game.reindeerClicked++;
                }

                let val = Game.cookiesPs * 60;
                if (Game.hasBuff('Elder frenzy')) val *= 0.5; // very sorry
                if (Game.hasBuff('Frenzy')) val *= 0.75; // I sincerely apologize
                let moni = Math.max(25, val); // 1 minute of cookie production, or 25 cookies - whichever is highest
                if (Game.Has('Ho ho ho-flavored frosting')) moni *= 2;
                moni *= Game.eff('reindeerGain');
                Game.Earn(moni);
                if (Game.hasBuff('Elder frenzy')) Game.Win('Eldeer');

                let cookie = '';
                let failRate = 0.8;
                if (Game.HasAchiev('Let it snow')) failRate = 0.6;
                failRate *= 1 / Game.dropRateMult();
                if (Game.Has('Starsnow')) failRate *= 0.95;
                if (Game.hasGod) {
                    let godLvl = Game.hasGod('seasons');
                    if (godLvl == 1) failRate *= 0.9;
                    else if (godLvl == 2) failRate *= 0.95;
                    else if (godLvl == 3) failRate *= 0.97;
                }
                if (Math.random() > failRate) {
                    // christmas cookie drops
                    cookie = choose([
                        'Christmas tree biscuits',
                        'Snowflake biscuits',
                        'Snowman biscuits',
                        'Holly biscuits',
                        'Candy cane biscuits',
                        'Bell biscuits',
                        'Present biscuits'
                    ]);
                    if (!Game.HasUnlocked(cookie) && !Game.Has(cookie)) {
                        Game.Unlock(cookie);
                    } else cookie = '';
                }

                let popup = '';

                Game.Notify(
                    loc('You found %1!', choose(loc('Reindeer names'))),
                    loc('The reindeer gives you %1.', loc('%1 cookie', LBeautify(moni))) +
                        (cookie == '' ? '' : '<br>' + loc('You are also rewarded with %1!', Game.Upgrades[cookie].dname)),
                    [12, 9],
                    6
                );
                popup = '<div style="font-size:80%;">' + loc('+%1!', loc('%1 cookie', LBeautify(moni))) + '</div>';

                if (popup != '') Game.Popup(popup, Game.mouseX, Game.mouseY);

                // sparkle and kill the shimmer
                Game.SparkleAt(Game.mouseX, Game.mouseY);
                PlaySound('snd/jingleClick.mp3');
                me.die();
            },
            missFunc: STUB,
            spawnsOnTimer: true,
            spawnConditions() {
                return Game.season == 'christmas' ? true : false;
            },
            spawned: 0,
            time: 0,
            minTime: 0,
            maxTime: 0,
            /**
             * @param {any} me
             * @param {number} m
             */
            getTimeMod(me, m) {
                if (Game.Has('Reindeer baking grounds')) m /= 2;
                if (Game.Has('Starsnow')) m *= 0.95;
                if (Game.hasGod) {
                    let godLvl = Game.hasGod('seasons');
                    if (godLvl == 1) m *= 0.9;
                    else if (godLvl == 2) m *= 0.95;
                    else if (godLvl == 3) m *= 0.97;
                }
                m *= 1 / Game.eff('reindeerFreq');
                if (Game.Has('Reindeer season')) m = 0.01;
                return Math.ceil(Game.fps * 60 * m);
            },
            /**
             * @param {any} me
             */
            getMinTime(me) {
                return this.getTimeMod(me, 3);
            },
            /**
             * @param {any} me
             */
            getMaxTime(me) {
                return this.getTimeMod(me, 6);
            }
        }
    };

    static goldenCookieChoices = [
        'Frenzy',
        'frenzy',
        'Lucky',
        'multiply cookies',
        'Ruin',
        'ruin cookies',
        'Elder frenzy',
        'blood frenzy',
        'Clot',
        'clot',
        'Click frenzy',
        'click frenzy',
        'Cursed finger',
        'cursed finger',
        'Cookie chain',
        'chain cookie',
        'Cookie storm',
        'cookie storm',
        'Building special',
        'building special',
        'Dragon Harvest',
        'dragon harvest',
        'Dragonflight',
        'dragonflight',
        'Sweet',
        'free sugar lump',
        'Blab',
        'blab'
    ];
    static goldenCookieBuildingBuffs = {
        Cursor: ['High-five', 'Slap to the face'],
        Grandma: ['Congregation', 'Senility'],
        Farm: ['Luxuriant harvest', 'Locusts'],
        Mine: ['Ore vein', 'Cave-in'],
        Factory: ['Oiled-up', 'Jammed machinery'],
        Bank: ['Juicy profits', 'Recession'],
        Temple: ['Fervent adoration', 'Crisis of faith'],
        'Wizard tower': ['Manabloom', 'Magivores'],
        Shipment: ['Delicious lifeforms', 'Black holes'],
        'Alchemy lab': ['Breakthrough', 'Lab disaster'],
        Portal: ['Righteous cataclysm', 'Dimensional calamity'],
        'Time machine': ['Golden ages', 'Time jam'],
        'Antimatter condenser': ['Extra cycles', 'Predictable tragedy'],
        Prism: ['Solar flare', 'Eclipse'],
        Chancemaker: ['Winning streak', 'Dry spell'],
        'Fractal engine': ['Macrocosm', 'Microcosm'],
        'Javascript console': ['Refactoring', 'Antipattern'],
        Idleverse: ['Cosmic nursery', 'Big crunch'],
        'Cortex baker': ['Brainstorm', 'Brain freeze']
    };

    /* =====================================================================================
        PARTICLES
        =======================================================================================*/
    // generic particles (falling cookies etc)
    // only displayed on left section
    /**
     * @type {any[]}
     */
    static particles = [];
    static particlesN = 50;

    static particlesUpdate() {
        for (let i = 0; i < Game.particlesN; i++) {
            let me = Game.particles[i];
            if (me.life != -1) {
                if (!me.text) me.yd += 0.2 + Math.random() * 0.1;
                me.x += me.xd;
                me.y += me.yd;
                me.life++;
                if (me.life >= Game.fps * me.dur) {
                    me.life = -1;
                }
            }
        }
    }
    // @ts-expect-error good lord no
    static particleAdd(x, y, xd, yd, size, dur, z, pic, text) {
        // Game.particleAdd(pos X,pos Y,speed X,speed Y,size (multiplier),duration (seconds),layer,picture,text);
        // pick the first free (or the oldest) particle to replace it
        let highest = 0;
        let highestI = 0;
        for (let i = 0; i < Game.particlesN; i++) {
            if (Game.particles[i].life == -1) {
                highestI = i;
                break;
            }
            if (Game.particles[i].life > highest) {
                highest = Game.particles[i].life;
                highestI = i;
            }
        }
        let auto = 0;
        if (x) auto = 1;
        let i = highestI;
        x ||= -64;
        if (Game.LeftBackground && !auto) x = Math.floor(Math.random() * Game.LeftBackground.canvas.width);
        y ||= -64;
        let me = Game.particles[i];
        me.life = 0;
        me.x = x;
        me.y = y;
        me.xd = xd || 0;
        me.yd = yd || 0;
        me.size = size || 1;
        me.z = z || 0;
        me.dur = dur || 2;
        me.r = Math.floor(Math.random() * 360);
        me.picId = Math.floor(Math.random() * 10000);
        if (!pic) {
            if (Game.season == 'fools') pic = 'smallDollars.png';
            else {
                let cookies = [[10, 0]];
                for (let i in Game.Upgrades) {
                    let cookie = Game.Upgrades[i];
                    if (cookie.bought > 0 && cookie.pool == 'cookie') cookies.push(cookie.icon);
                }
                me.picPos = choose(cookies);
                if (Game.bakeryName.toLowerCase() == 'ortiel' || Math.random() < 1 / 10000) me.picPos = [17, 5];
                pic = 'icons.png';
            }
        } else if (typeof pic !== 'string') {
            me.picPos = pic;
            pic = 'icons.png';
        }
        if (!me.picPos) me.picPos = [[10, 0]];
        me.pic = pic || 'smallCookies.png';
        me.text = text || 0;
        return me;
    }
    /**
     * @param {number} z
     */
    static particlesDraw(z) {
        let ctx = Game.LeftBackground;
        ctx.fillStyle = '#fff';
        ctx.font = '20px Merriweather';
        ctx.textAlign = 'center';

        for (let i = 0; i < Game.particlesN; i++) {
            let me = Game.particles[i];
            if (me.z == z && me.life != -1) {
                let opacity = 1 - me.life / (Game.fps * me.dur);
                ctx.globalAlpha = opacity;
                if (me.text) {
                    ctx.fillText(me.text, me.x, me.y);
                } else {
                    ctx.save();
                    ctx.translate(me.x, me.y);
                    ctx.rotate((me.r / 360) * Math.PI * 2);
                    let w = 64;
                    let h = 64;
                    if (me.pic == 'icons.png') {
                        w = 48;
                        h = 48;
                        ctx.drawImage(
                            Pic(me.pic),
                            me.picPos[0] * w,
                            me.picPos[1] * h,
                            w,
                            h,
                            (-w / 2) * me.size,
                            (-h / 2) * me.size,
                            w * me.size,
                            h * me.size
                        );
                    } else {
                        if (me.pic == 'wrinklerBits.png' || me.pic == 'shinyWrinklerBits.png') {
                            w = 100;
                            h = 200;
                        }
                        ctx.drawImage(Pic(me.pic), (me.picId % 8) * w, 0, w, h, (-w / 2) * me.size, (-h / 2) * me.size, w * me.size, h * me.size);
                    }
                    ctx.restore();
                }
            }
        }
    }

    // text particles (popups etc)
    /**
     * @type {{ x: number; y: number; life: number; text: string; l?: HTMLElement | null }[]}
     */
    static textParticles = [];
    static textParticlesY = 0;

    static textParticlesUpdate() {
        for (let i in Game.textParticles) {
            const me = Game.textParticles[i];
            if (me.life != -1) {
                me.life++;
                if (me.life >= Game.fps * 4) {
                    const el = ASSERT_NOT_NULL(me.l);
                    me.life = -1;
                    el.style.opacity = '0';
                    el.style.display = 'none';
                }
            }
        }
    }
    /**
     * @param {any} text
     * @param {number} el
     * @param {any} posX
     * @param {any} posY
     */
    static textParticlesAdd(text, el, posX, posY) {
        // pick the first free (or the oldest) particle to replace it
        let highest = 0;
        let highestI = '0';
        for (let i in Game.textParticles) {
            if (Game.textParticles[i].life == -1) {
                highestI = (i);
                break;
            }
            if (Game.textParticles[i].life > highest) {
                highest = Game.textParticles[i].life;
                highestI = (i);
            }
        }
        let i = highestI;
        let noStack = 0;
        let x, y;
        if (posX !== undefined && posY !== undefined) {
            x = posX;
            y = posY;
            noStack = 1;
        } else {
            let x = (Math.random() - 0.5) * 40;
            let y = 0;
            if (!el) {
                let rect = ASSERT_NOT_NULL(Game.bounds);
                let x = Math.floor((rect.left + rect.right) / 2);
                let y = Math.floor(rect.bottom) - Game.mobile * 64;
                x += (Math.random() - 0.5) * 40;
                y += 0;
            }
        }
        if (!noStack) y -= Game.textParticlesY;

        x = Math.max(ASSERT_NOT_NULL(Game.bounds).left + 200, x);
        x = Math.min(ASSERT_NOT_NULL(Game.bounds).right - 200, x);
        y = Math.max(ASSERT_NOT_NULL(Game.bounds).top + 32, y);

        // what the hell typescript are you high
        const me = /** @type {typeof Game.textParticles[0]} */ (
            Game.textParticles[/** @type {keyof typeof Game.textParticles} */(i)]
        );
        if (!me.l) me.l = $('particle' + i);
        const mel = ASSERT_NOT_NULL(me.l);
        me.life = 0;
        me.x = x;
        me.y = y;
        me.text = text;
        mel.innerHTML = text;
        mel.style.left = Math.floor(me.x - 200) + 'px';
        mel.style.bottom = Math.floor(-me.y) + 'px';
        for (let ii in Game.textParticles) {
            if (ii != i) (Game.textParticles[ii].l || $('particle' + ii, true)).style.zIndex = '100000000';
        }
        mel.style.zIndex = '100000001';
        mel.style.display = 'block';
        mel.className = 'particle title';
        void mel.offsetWidth;
        mel.className = 'particle title risingUpLinger';
        if (!noStack) Game.textParticlesY += 60;
    }
    static popups = 1;
    /**
     * @param {string | string[]} text
     * @param {number} x
     * @param {number} y
     */
    static Popup(text, x, y) {
        if (Game.popups) Game.textParticlesAdd(text, 0, x, y);
    }

    // display sparkles at a set position
    static sparkles = $('sparkles', true);
    static sparklesT = 0;
    static sparklesFrames = 16;
    /**
     * @param {number} x
     * @param {number} y
     */
    static SparkleAt(x, y) {
        if (Game.blendModesOn) {
            Game.sparklesT = Game.sparklesFrames + 1;
            Game.sparkles.style.backgroundPosition = '0px 0px';
            Game.sparkles.style.left = Math.floor(x - 64) + 'px';
            Game.sparkles.style.top = Math.floor(y - 64) + 'px';
            Game.sparkles.style.display = 'block';
        }
    }
    /**
     * @param {HTMLElement} el
     */
    static SparkleOn(el) {
        const rect = el.getBounds();
        Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24);
    }

    /* =====================================================================================
        NOTIFICATIONS
        =======================================================================================*/
    // maybe do all this mess with proper DOM instead of rewriting the innerHTML
    /**
     * @type {InstanceType<Game.Note>[]}
     */
    static Notes = [];
    /**
     * @type {any[]}
     */
    static NotesById = [];
    static noteId = 0;
    static noteL = $('notes', true);
    static Note = class Note {
        /**
         * @param {string} title
         * @param {string} [desc]
         * @param {[number, number]} [pic]
         * @param {number} [quick]
         */
        constructor(title, desc = '', pic, quick = 0) {
            this.title = title;
            this.desc = desc;
            this.pic = pic;
            this.id = Game.noteId;
            this.date = Date.now();
            this.quick = quick;
            this.life = (this.quick || 1) * Game.fps;
            this.l = 0;
            this.height = 0;
            this.tooltip = 0;
            Game._GameNoteHandleNotesArrayTemp(this);
        }

        title; desc; pic; id; date; quick; life; height; tooltip;

        /** @type {HTMLElement | 0} */
        l;
    };
    /**
     * @param {InstanceType<typeof Game.Note>} instance 
     */
    static _GameNoteHandleNotesArrayTemp(instance) {
        Game.noteId++;
        Game.NotesById[instance.id] = instance;
        Game.Notes.unshift(instance);
        if (Game.Notes.length > 50) Game.Notes.pop();
        Game.UpdateNotes();
    }
    /**
     * @param {string | number} id
     */
    static CloseNote(id) {
        let me = Game.NotesById[Number(id)];
        if (Game.tooltip.from && Game.tooltip.from.id.startsWith('note-')) Game.tooltip.hide();
        Game.Notes.splice(Game.Notes.indexOf(me), 1);
        Game.NotesById[Number(id)] = null;
        Game.UpdateNotes();
    }
    static CloseNotes() {
        Game.Notes = [];
        Game.NotesById = [];
        Game.tooltip.hide();
        Game.UpdateNotes();
    }
    static UpdateNotes() {
        let str = '';
        let remaining = Game.Notes.length;
        let me;
        for (let i in Game.Notes) {
            if (Number(i) < 5) {
                me = Game.Notes[i];
                let pic = '';
                if (me.pic) pic = '<div class="icon" style="' + writeIcon(me.pic) + '"></div>';
                str =
                        '<div id="note-' +
                        me.id +
                        '" ' +
                        (me.tooltip ? Game.getDynamicTooltip(String(me.tooltip), 'this', true) + ' ' : '') +
                        'class="framed note ' +
                        (me.pic ? 'haspic' : 'nopic') +
                        ' ' +
                        (me.desc != '' ? 'hasdesc' : 'nodesc') +
                        '"><div class="close" onclick="PlaySound(\'snd/tick.mp3\');Game.CloseNote(' +
                        me.id +
                        ');">x</div>' +
                        pic +
                        '<div class="text"><h3>' +
                        me.title +
                        '</h3>' +
                        (me.desc != '' ? '<div class="line"></div><h5>' + me.desc + '</h5>' : '') +
                        '</div></div>' +
                        str;
                remaining--;
            }
        }
        if (remaining > 0) str = '<div class="remaining">' + loc('+%1 more notification.', LBeautify(remaining)) + '</div>' + str;
        if (Game.Notes.length > 1) {
            str += '<div class="framed close sidenote" onclick="PlaySound(\'snd/tick.mp3\');Game.CloseNotes();">x</div>';
        }
        Game.noteL.innerHTML = str;
        for (let i in Game.Notes) {
            ASSERT_NOT_NULL(me).l = 0;
            if (Number(i) < 5) {
                const me = Game.Notes[i];
                me.l = $('note-' + me.id, true);
            }
        }
    }
    static NotesLogic() {
        for (let i in Game.Notes) {
            if (ASSERT_NOT_NULL(Game.Notes[i].quick) > 0) {
                const me = Game.Notes[i];
                me.life--;
                if (ASSERT_NOT_NULL(me.life) <= 0) Game.CloseNote(ASSERT_NOT_NULL(me.id));
            }
        }
    }
    static NotesDraw() {
        for (const note of Game.Notes) {
            if (note.quick > 0 && note.l && note.life < 10) {
                note.l.style.opacity = String(note.life / 10);
            }
        }
    }
    /**
     * @param {string | string[]} title
     * @param {string | string[]} desc
     * @param {string | number | number[] | undefined} [pic]
     * @param {number | undefined} [quick]
     * @param {number | undefined} [noLog]
     */
    static Notify(title, desc, pic, quick, noLog) {
        if (Game.prefs.notifs) {
            quick = Math.min(6, quick || 0);
            if (!quick) quick = 6;
        }
        desc = String(desc).replaceAll('==CLOSETHIS()==', `Game.CloseNote(${Game.noteId});`);
        // @ts-expect-error sweet misery
        if (Game.popups) new Game.Note(title, desc, pic, quick || 0);
        if (!noLog) Game.AddToLog('<b>' + title + '</b> | ' + desc);
    }
    /**
     * @param {string} content
     */
    static NotifyTooltip(content) {
        // attaches a tooltip to the last spawned note
        if (!Game.NotesById[Game.noteId - 1]) return false;
        let me = Game.NotesById[Game.noteId - 1];
        me.tooltip = content;
        Game.UpdateNotes();
        return true;
    }

    /* =====================================================================================
        PROMPT
        =======================================================================================*/
    static darkenL = $('darken', true);
    static promptL = $('promptContent', true);
    static promptAnchorL = $('promptAnchor', true);
    static promptWrapL = $('prompt', true);
    static promptConfirm = '';
    static promptOn = 0;
    /** @type {VoidFunction | 0 | undefined} */
    static promptUpdateFunc;
    static promptOptionsN = 0;
    static promptOptionFocus = 0;
    static promptNoClose = false;
    static UpdatePrompt() {
        if (Game.promptUpdateFunc) Game.promptUpdateFunc();
        Game.promptAnchorL.style.top = Math.floor((Game.windowH - Game.promptWrapL.offsetHeight) / 2 - 16) + 'px';
    }
    /**
     * @param {string} content
     * @param {any} options
     * @param {VoidFunction | 0} [updateFunc]
     * @param {string | undefined} [style]
     */
    static Prompt(content, options, updateFunc, style) {
        Game.promptNoClose = false;
        if (updateFunc) Game.promptUpdateFunc = updateFunc;
        Game.promptWrapL.className = style ? 'framed ' + style : 'framed';
        let str = '';
        str += content;
        if (str.indexOf('<id ') == 0) {
            const id = str.slice(4, str.indexOf('>'));
            str = str.slice(Math.max(0, str.indexOf('>') + 1));
            str = '<div id="promptContent' + id + '">' + str + '</div>';
        }
        if (str.includes('<noClose>')) {
            str = str.replace('<noClose>', '');
            Game.promptNoClose = true;
        }
        let opts = '';
        Game.promptOptionsN = 0;
        for (let i = 0; i < options.length; i++) {
            if (options[i] == 'br') {
                // just a linebreak
                opts += '<br>';
            } else {
                if (typeof options[i] == 'string') options[i] = [options[i], 'PlaySound(\'snd/tickOff.mp3\');Game.ClosePrompt();'];
                else if (!options[i][1]) options[i] = [options[i][0], 'PlaySound(\'snd/tickOff.mp3\');Game.ClosePrompt();', options[i][2]];
                else options[i][1] = 'PlaySound(\'snd/tick.mp3\');' + options[i][1];
                options[i][1] = options[i][1].replace(/'/g, '&#39;').replace(/"/g, '&#34;');
                opts +=
                        '<a id="promptOption' +
                        i +
                        '" class="option" ' +
                        (options[i][2] ? 'style="' + options[i][2] + '" ' : '') +
                        '' +
                        Game.clickStr +
                        '="' +
                        options[i][1] +
                        '">' +
                        options[i][0] +
                        '</a>';
                Game.promptOptionsN++;
            }
        }
        Game.promptL.innerHTML = str + '<div class="optionBox">' + opts + '</div>';
        Game.promptAnchorL.style.display = 'block';
        Game.darkenL.style.display = 'block';
        Game.promptL.focus();
        Game.promptOn = 1;
        Game.promptOptionFocus = 0;
        Game.FocusPromptOption(0);
        Game.UpdatePrompt();
        if (!Game.promptNoClose) $('promptClose', true).style.display = 'block';
        else $('promptClose', true).style.display = 'none';
    }
    static ClosePrompt() {
        if (!Game.promptOn) return false;
        Game.promptAnchorL.style.display = 'none';
        Game.darkenL.style.display = 'none';
        Game.promptOn = 0;
        Game.promptUpdateFunc = 0;
        Game.promptOptionFocus = 0;
        Game.promptOptionsN = 0;
        Game.promptNoClose = false;
        return true;
    }
    static ConfirmPrompt() {
        if (
            Game.promptOn &&
                $('promptOption' + Game.promptOptionFocus) &&
                $('promptOption' + Game.promptOptionFocus, true).style.display != 'none'
        )
            $('promptOption' + Game.promptOptionFocus, true).dispatchEvent(new Event('click', { bubbles: true }));
    }
    /**
     * @param {number} dir
     * @param {number | undefined} [tryN]
     */
    static FocusPromptOption(dir, tryN) {
        let id = Game.promptOptionFocus + dir;
        if (id < 0) id = Game.promptOptionsN - 1;
        if (id >= Game.promptOptionsN) id = 0;
        while (
            id >= 0 && id < Game.promptOptionsN &&
                (!$('promptOption' + id) || $('promptOption' + id, true).style.display === 'none')
        ) {
            id += dir || 1;
        }
        if ($('promptOption' + id) && $('promptOption' + id, true).style.display !== 'none') {
            if ($('promptOption' + Game.promptOptionFocus)) $('promptOption' + Game.promptOptionFocus, true).classList.remove('focused');
            Game.promptOptionFocus = id;
            if ($('promptOption' + Game.promptOptionFocus)) $('promptOption' + Game.promptOptionFocus, true).classList.add('focused');
        } else if (!tryN && dir != 0) {
            Game.promptOptionFocus = id;
            Game.FocusPromptOption(dir, 1);
        }
    }

    /* =====================================================================================
        MENUS
        =======================================================================================*/
    /**
     * @type {any[]}
     */
    static cssClasses = [];
    /**
     * @param {string} what
     */
    static addClass(what) {
        if (!Game.cssClasses.includes(what)) Game.cssClasses.push(what);
        Game.updateClasses();
    }
    /**
     * @param {string} what
     */
    static removeClass(what) {
        let i = Game.cssClasses.indexOf(what);
        if (i != -1) {
            Game.cssClasses.splice(i, 1);
        }
        Game.updateClasses();
    }
    static updateClasses() {
        Game.l.className = Game.cssClasses.join(' ');
    }

    /**
     * @param {keyof typeof Game.prefs} prefName
     * @param {string} button
     * @param {string} on
     * @param {string} off
     * @param {string | number | undefined} [callback]
     * @param {string | number | undefined} [invert]
     */
    static WritePrefButton(prefName, button, on, off, callback, invert) {
        invert = invert ? 1 : 0;
        if (!callback) callback = '';
        callback += 'PlaySound(\'snd/tick.mp3\');';
        return (
            '<a class="smallFancyButton prefButton option' +
                (Game.prefs[prefName] ^ invert ? '' : ' off') +
                '" id="' +
                button +
                '" ' +
                Game.clickStr +
                '="Game.Toggle(\'' +
                prefName +
                '\',\'' +
                button +
                '\',\'' +
                on +
                '\',\'' +
                off +
                '\',\'' +
                invert +
                '\');' +
                callback +
                '">' +
                (Game.prefs[prefName] ? on : off) +
                '</a>'
        );
    }
    /**
     * @param {keyof typeof Game.prefs} prefName
     * @param {string} button
     * @param {string} on
     * @param {string} off
     * @param {number} invert
     */
    static Toggle(prefName, button, on, off, invert) {
        if (Game.prefs[prefName]) {
            $(button, true).innerHTML = off;
            Game.prefs[prefName] = 0;
        } else {
            $(button, true).innerHTML = on;
            Game.prefs[prefName] = 1;
        }
        $(button, true).className = 'smallFancyButton prefButton option' + (Game.prefs[prefName] ^ invert ? '' : ' off');
    }
    static ToggleFancy() {
        if (Game.prefs.fancy) Game.removeClass('noFancy');
        else if (!Game.prefs.fancy) Game.addClass('noFancy');
    }
    static ToggleFilters() {
        if (Game.prefs.filters) Game.removeClass('noFilters');
        else if (!Game.prefs.filters) Game.addClass('noFilters');
    }
    static ToggleExtraButtons() {
        if (!Game.prefs.extraButtons) Game.removeClass('extraButtons');
        else if (Game.prefs.extraButtons) Game.addClass('extraButtons');
        for (let i in Game.Objects) {
            Game.Objects[i].mute(0);
        }
    }

    /**
     * @param {string} slider
     * @param {string | string[]} leftText
     * @param {string} rightText
     * @param {Function} startValueFunction
     * @param {string} callback
     */
    static WriteSlider(slider, leftText, rightText, startValueFunction, callback) {
        if (!callback) callback = '';
        return (
            '<div class="sliderBox"><div style="float:left;" class="smallFancyButton">' +
                leftText +
                '</div><div style="float:right;" class="smallFancyButton" id="' +
                slider +
                'RightText">' +
                rightText.replace('[$]', startValueFunction()) +
                '</div><input class="slider" style="clear:both;" type="range" min="0" max="100" step="1" value="' +
                startValueFunction() +
                '" onchange="' +
                callback +
                '" oninput="' +
                callback +
                '" onmouseup="PlaySound(\'snd/tick.mp3\');" id="' +
                slider +
                '"/></div>'
        );
    }

    static onPanel = 'Left';
    /**
     * @param {string} what
     */
    static ShowPanel(what) {
        if (!what) what = '';
        if (Game.onPanel != what) {
            Game.removeClass('focus' + Game.onPanel);
            Game.addClass('focus' + what);
        }
        Game.onPanel = what;
    }

    static onMenu = '';
    /**
     * @param {string} what
     */
    static ShowMenu(what) {
        if (!what || what == '') what = Game.onMenu;
        if (Game.onMenu == '' && what != '') Game.addClass('onMenu');
        else if (Game.onMenu != '' && what != Game.onMenu) Game.addClass('onMenu');
        else if (what == Game.onMenu) {
            Game.removeClass('onMenu');
            what = '';
        }
        Game.onMenu = what;

        $('prefsButton', true).className = Game.onMenu == 'prefs' ? 'panelButton selected' : 'panelButton';
        $('statsButton', true).className = Game.onMenu == 'stats' ? 'panelButton selected' : 'panelButton';
        $('logButton', true).className = Game.onMenu == 'log' ? 'panelButton selected' : 'panelButton';

        if (Game.onMenu == '') PlaySound('snd/clickOff2.mp3');
        else PlaySound('snd/clickOn2.mp3');

        Game.UpdateMenu();

        if (what == '') {
            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                if (me.minigame && me.minigame.onResize) me.minigame.onResize();
            }
        }
    }
    /**
     * @param {number} time
     * @param {number | undefined} [detail]
     */
    static sayTime(time, detail) {
        // time is a value where one second is equal to Game.fps (30).
        // detail skips days when >1, hours when >2, minutes when >3 and seconds when >4.
        // if detail is -1, output something like "3 hours, 9 minutes, 48 seconds"
        if (time <= 0) return '';
        let str = '';
        detail ||= 0;
        time = Math.floor(time);
        if (detail == -1) {
            let days = 0;
            let hours = 0;
            let minutes = 0;
            let seconds = 0;
            if (time >= Game.fps * 60 * 60 * 24) days = Math.floor(time / (Game.fps * 60 * 60 * 24));
            if (time >= Game.fps * 60 * 60) hours = Math.floor(time / (Game.fps * 60 * 60));
            if (time >= Game.fps * 60) minutes = Math.floor(time / (Game.fps * 60));
            if (time >= Game.fps) seconds = Math.floor(time / Game.fps);
            hours -= days * 24;
            minutes -= hours * 60 + days * 24 * 60;
            seconds -= minutes * 60 + hours * 60 * 60 + days * 24 * 60 * 60;
            if (days > 10) {
                hours = 0;
            }
            if (days) {
                minutes = 0;
                seconds = 0;
            }
            if (hours) {
                seconds = 0;
            }
            let bits = [];
            if (days > 0) bits.push(loc('%1 day', LBeautify(days)));
            if (hours > 0) bits.push(loc('%1 hour', LBeautify(hours)));
            if (minutes > 0) bits.push(loc('%1 minute', LBeautify(minutes)));
            if (seconds > 0) bits.push(loc('%1 second', LBeautify(seconds)));
            str = bits.length === 0 ? locStr('less than 1 second') : bits.join(', ');
        } else {
            if (time >= Game.fps * 60 * 60 * 24 && detail < 2) str = locStr('%1 day', LBeautify(Math.floor(time / (Game.fps * 60 * 60 * 24))));
            else if (time >= Game.fps * 60 * 60 && detail < 3) str = locStr('%1 hour', LBeautify(Math.floor(time / (Game.fps * 60 * 60))));
            else if (time >= Game.fps * 60 && detail < 4) str = locStr('%1 minute', LBeautify(Math.floor(time / (Game.fps * 60))));
            else if (time >= Game.fps && detail < 5) str = locStr('%1 second', LBeautify(Math.floor(time / Game.fps)));
            else str = locStr('less than 1 second');
        }
        return str;
    }

    static tinyCookie() {
        if (!Game.HasAchiev('Tiny cookie')) {
            return '<div class="tinyCookie" ' + Game.clickStr + '="Game.ClickTinyCookie();"></div>';
        }
        return '';
    }
    static ClickTinyCookie() {
        if (!Game.HasAchiev('Tiny cookie')) {
            PlaySound('snd/tick.mp3');
            Game.Win('Tiny cookie');
        }
    }

    /**
     * @param {number} what
     */
    static setVolume(what) {
        Game.volume = what;
    }
    /**
     * @param {number} what
     */
    static setVolumeMusic(what) {
        Game.volumeMusic = what;
    }

    /**
     * @param {boolean | undefined} [firstLaunch]
     */
    static showLangSelection(firstLaunch) {
        let str = '';
        for (let i in Langs) {
            const lang = Langs[/** @type {keyof typeof Langs} */ (i)];
            str +=
                    '<div class="langSelectButton title' +
                    (!firstLaunch && locId == lang.file ? ' selected' : '') +
                    '" style="padding:4px;" id="langSelect-' +
                    i +
                    '">' +
                    lang.name +
                    '</div>';
        }
        Game.Prompt(
            '<id ChangeLanguage>' +
                (firstLaunch ? '<noClose>' : '') +
                '<h3 id="languageSelectHeader">' +
                loc('Change language') +
                '</h3>' +
                '<div class="line"></div>' +
                (firstLaunch
                    ? ''
                    : '<div style="font-size:11px;opacity:0.5;margin-bottom:12px;">(' + loc('note: this will save and reload your game') + ')</div>') +
                str,
            firstLaunch ? 0 : [loc('Cancel')]
        );

        for (const lang in Langs) {
            $('langSelect-' + lang, true).addEventListener(
                'click',
                function () {
                    PlaySound('snd/tick.mp3');
                    localStorageSet('CookieClickerLang', lang);
                    Game.toSave = true;
                    Game.toReload = true;
                }
            );
            $('langSelect-' + lang, true).addEventListener(
                'mouseover',
                function () {
                    PlaySound('snd/smallTick.mp3', 0.75);
                    $('languageSelectHeader', true)
                        .innerHTML = Langs[/** @type {keyof typeof Langs} */ (lang)].changeLanguage;
                }
            );
        }
    }

    static UpdateMenu() {
        const ON = ' ' + loc('ON');
        const OFF = ' ' + loc('OFF');
        let str = '';
        if (Game.onMenu != '') {
            str += '<div class="close menuClose" ' + Game.clickStr + '="Game.ShowMenu();">x</div>';
        }
        if (Game.onMenu == 'prefs') {
            str += '<div class="section">' + loc('Options') + '</div>';

            str +=
                    '<div class="block" style="padding:0px;margin:8px 4px;">' +
                    '<div class="subsection" style="padding:0px;">' +
                    '<div class="title">' +
                    loc('General') +
                    '</div>' +
                    '<div class="listing" style="text-align:center;"><div style="display:inline-block;padding:2px 8px;opacity:0.75;font-size:12px;vertical-align:middle;" class="smallFancyButton">' +
                    loc('Language: %1', '<b>' + Langs[locId].name + '</b>') +
                    '</div><div class="icon" style="vertical-align:middle;display:inline-block;background-position:' +
                    -30 * 48 +
                    'px ' +
                    -29 * 48 +
                    'px;transform:scale(0.5);margin:-16px -12px;"></div><a style="font-size:15px;text-align:center;width:auto;min-width:130px;" class="option smallFancyButton" id="changeLanguageOption" ' +
                    Game.clickStr +
                    '="PlaySound(\'snd/tick.mp3\');Game.showLangSelection();">' +
                    (!EN ? 'Change language<div class="line"></div>' : '') +
                    loc('Change language') +
                    '</a><div style="clear:both;text-align:right;padding-bottom:2px;"></div></div>' +
                    '<div class="listing"><a class="option smallFancyButton" ' +
                    Game.clickStr +
                    '="Game.toSave=true;PlaySound(\'snd/tick.mp3\');">' +
                    loc('Save') +
                    '</a><label>' +
                    loc('Save manually (the game autosaves every 60 seconds; shortcut: ctrl+S)') +
                    '</label></div>' +
                    '<div class="listing"><a class="option smallFancyButton" ' +
                    Game.clickStr +
                    '="Game.ExportSave();PlaySound(\'snd/tick.mp3\');">' +
                    loc('Export save') +
                    '</a><a class="option smallFancyButton" ' +
                    Game.clickStr +
                    '="Game.ImportSave();PlaySound(\'snd/tick.mp3\');">' +
                    loc('Import save') +
                    '</a><label>' +
                    loc('You can use this to backup your save or to transfer it to another computer (shortcut for import: ctrl+O)') +
                    '</label></div>' +
                    `<div class="listing"><a class="option smallFancyButton" ${Game.clickStr}="Game.FileSave();PlaySound('snd/tick.mp3');">${loc(
                        'Save to file'
                    )}</a><a class="option smallFancyButton" style="position:relative;"><input id="FileLoadInput" type="file" style="cursor:pointer;opacity:0;position:absolute;left:0px;top:0px;width:100%;height:100%;" onchange="Game.FileLoad(event);" ${Game.clickStr
                    }="PlaySound('snd/tick.mp3');"/>${loc('Load from file')}</a><label>${loc('Use this to keep backups on your computer')}</label></div>` +
                    '<div class="listing" style="text-align:right;"><label>' +
                    loc('Delete all your progress, including your achievements') +
                    '</label><a class="option smallFancyButton warning" ' +
                    Game.clickStr +
                    '="Game.HardReset();PlaySound(\'snd/tick.mp3\');">' +
                    loc('Wipe save') +
                    '</a></div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="block" style="padding:0px;margin:8px 4px;">' +
                    '<div class="subsection" style="padding:0px;">' +
                    '<div class="title">' +
                    loc('Settings') +
                    '</div>' +
                    '<div class="listing">' +
                    Game.WriteSlider(
                        'volumeSlider',
                        loc('Volume'),
                        '[$]%',
                        function () {
                            return Game.volume;
                        },
                        'Game.setVolume(Math.round($(\'volumeSlider\').value));$(\'volumeSliderRightText\').innerHTML=Game.volume+\'%\';'
                    ) +
                    '<br>' +
                    Game.WritePrefButton('fancy', 'fancyButton', loc('Fancy graphics') + ON, loc('Fancy graphics') + OFF, 'Game.ToggleFancy();') +
                    '<label>(' +
                    loc('visual improvements; disabling may improve performance') +
                    ')</label><br>' +
                    Game.WritePrefButton('filters', 'filtersButton', loc('CSS filters') + ON, loc('CSS filters') + OFF, 'Game.ToggleFilters();') +
                    '<label>(' +
                    (EN
                        ? 'cutting-edge visual improvements; disabling may improve performance'
                        : loc('visual improvements; disabling may improve performance')) +
                    ')</label><br>' +
                    Game.WritePrefButton('particles', 'particlesButton', loc('Particles') + ON, loc('Particles') + OFF) +
                    (EN ? '<label>(cookies falling down, etc; disabling may improve performance)</label>' : '') +
                    '<br>' +
                    Game.WritePrefButton('numbers', 'numbersButton', loc('Numbers') + ON, loc('Numbers') + OFF) +
                    '<label>(' +
                    loc('numbers that pop up when clicking the cookie') +
                    ')</label><br>' +
                    Game.WritePrefButton('milk', 'milkButton', loc('Milk [setting]') + ON, loc('Milk [setting]') + OFF) +
                    (EN ? '<label>(only appears with enough achievements)</label>' : '') +
                    '<br>' +
                    Game.WritePrefButton('cursors', 'cursorsButton', loc('Cursors [setting]') + ON, loc('Cursors [setting]') + OFF) +
                    '<label>(' +
                    loc('visual display of your cursors') +
                    ')</label><br>' +
                    Game.WritePrefButton('wobbly', 'wobblyButton', loc('Wobbly cookie') + ON, loc('Wobbly cookie') + OFF) +
                    (EN ? '<label>(your cookie will react when you click it)</label>' : '') +
                    '<br>' +
                    Game.WritePrefButton('cookiesound', 'cookiesoundButton', loc('Alt cookie sound') + ON, loc('Alt cookie sound') + OFF) +
                    (EN ? '<label>(how your cookie sounds when you click on it)</label>' : '') +
                    '<br>' +
                    Game.WritePrefButton('crates', 'cratesButton', loc('Icon crates') + ON, loc('Icon crates') + OFF) +
                    '<label>(' +
                    loc('display boxes around upgrades and achievements in Stats') +
                    ')</label><br>' +
                    Game.WritePrefButton('monospace', 'monospaceButton', loc('Alt font') + ON, loc('Alt font') + OFF) +
                    '<label>(' +
                    loc('your cookies are displayed using a monospace font') +
                    ')</label><br>' +
                    Game.WritePrefButton(
                        'format',
                        'formatButton',
                        loc('Short numbers') + OFF,
                        loc('Short numbers') + ON,
                        'BeautifyAll();Game.RefreshStore();Game.upgradesToRebuild=1;',
                        1
                    ) +
                    (EN ? '<label>(shorten big numbers)</label>' : '') +
                    '<br>' +
                    Game.WritePrefButton('notifs', 'notifsButton', loc('Fast notes') + ON, loc('Fast notes') + OFF) +
                    '<label>(' +
                    loc('notifications disappear much faster') +
                    ')</label><br>' +
                    (Game.WritePrefButton('warn', 'warnButton', loc('Closing warning') + ON, loc('Closing warning') + OFF) +
                        '<label>(' +
                        loc('the game will ask you to confirm when you close the window') +
                        ')</label><br>') +
                    Game.WritePrefButton(
                        'extraButtons',
                        'extraButtonsButton',
                        loc('Extra buttons') + ON,
                        loc('Extra buttons') + OFF,
                        'Game.ToggleExtraButtons();'
                    ) +
                    '<label>(' +
                    loc('add options on buildings like Mute') +
                    ')</label><br>' +
                    Game.WritePrefButton('askLumps', 'askLumpsButton', loc('Lump confirmation') + ON, loc('Lump confirmation') + OFF) +
                    '<label>(' +
                    loc('the game will ask you to confirm before spending sugar lumps') +
                    ')</label><br>' +
                    (Game.WritePrefButton('customGrandmas', 'customGrandmasButton', loc('Custom grandmas') + ON, loc('Custom grandmas') + OFF) +
                        '<label>(' +
                        loc('some grandmas will be named after Patreon supporters') +
                        ')</label><br>') +
                    Game.WritePrefButton('notScary', 'notScaryButton', loc('Scary stuff') + OFF, loc('Scary stuff') + ON, 0, 1) +
                    '<br>' +
                    Game.WritePrefButton('timeout', 'timeoutButton', loc('Sleep mode timeout') + ON, loc('Sleep mode timeout') + OFF) +
                    '<label>(' +
                    loc(
                        'on slower computers, the game will put itself in sleep mode when it\'s inactive and starts to lag out; offline CpS production kicks in during sleep mode'
                    ) +
                    ')</label><br>' +
                    Game.WritePrefButton(
                        'screenreader',
                        'screenreaderButton',
                        loc('Screen reader mode') + ON,
                        loc('Screen reader mode') + OFF,
                        'Game.toSave=true;Game.toReload=true;'
                    ) +
                    '<label>(' +
                    loc('allows optimizations for screen readers; game will reload') +
                    ')</label><br>' +
                    '</div>' +
                    //! see moddingapi.disabled.js
                    //! `<div class="listing"><a class="option smallFancyButton" ${Game.clickStr}="Game.CheckModData();PlaySound('snd/tick.mp3');">${loc(
                    //! 'Check mod data'
                    //! )}</a><label>(${loc('view and delete save data created by mods')})</label></div>` +
                    '</div>' +
                    '</div>' +
                    '</div>';

            str += '<div style="height:128px;"></div>';
        } else if (Game.onMenu == 'log') {
            str += Game.updateLog;
            if (!Game.HasAchiev('Olden days'))
                str +=
                        '<div id="oldenDays" style="text-align:right;width:100%;"><div ' +
                        Game.clickStr +
                        '="Game.SparkleAt(Game.mouseX,Game.mouseY);PlaySound(\'snd/tick.mp3\');PlaySound(\'snd/shimmerClick.mp3\');Game.Win(\'Olden days\');Game.UpdateMenu();" class="icon" style="display:inline-block;transform:scale(0.5);cursor:pointer;width:48px;height:48px;background-position:' +
                        -12 * 48 +
                        'px ' +
                        -3 * 48 +
                        'px;"></div></div>';
        } else if (Game.onMenu == 'stats') {
            let buildingsOwned = 0;
            buildingsOwned = Game.BuildingsOwned;
            let upgrades = '';
            let cookieUpgrades = '';
            let hiddenUpgrades = '';
            let prestigeUpgrades = '';
            let upgradesTotal = 0;
            let upgradesOwned = 0;
            let prestigeUpgradesTotal = 0;
            let prestigeUpgradesOwned = 0;

            let list = [];
            // sort the upgrades
            for (let i in Game.Upgrades) {
                list.push(Game.Upgrades[i]);
            } // clone first
            let sortMap = function (/** @type {{ order: number; }} */ a, /** @type {{ order: number; }} */ b) {
                if (a.order > b.order) return 1;
                else if (a.order < b.order) return -1;
                else return 0;
            };
            list.sort(sortMap);
            for (let i in list) {
                let str2 = '';
                let me = list[i];

                str2 += Game.crate(me, 'stats');

                if (me.bought) {
                    if (Game.CountsAsUpgradeOwned(me.pool)) upgradesOwned++;
                    else if (me.pool == 'prestige') prestigeUpgradesOwned++;
                }

                if (me.pool == '' || me.pool == 'cookie' || me.pool == 'tech') upgradesTotal++;
                if (me.pool == 'debug') hiddenUpgrades += str2;
                else if (me.pool == 'prestige') {
                    prestigeUpgrades += str2;
                    prestigeUpgradesTotal++;
                } else if (me.pool == 'cookie') cookieUpgrades += str2;
                else if (me.pool != 'toggle' && me.pool != 'unused') upgrades += str2;
            }
            /**
             * @type {Record<string, string>}
             */
            let achievements = {};
            let achievementsOwned = 0;
            let achievementsOwnedOther = 0;
            let achievementsTotal = 0;

            list = [];
            for (let i in Game.Achievements) {
                // sort the achievements
                list.push(Game.Achievements[i]);
            }
            sortMap = function (a, b) {
                if (a.order > b.order) return 1;
                else if (a.order < b.order) return -1;
                else return 0;
            };
            list.sort(sortMap);

            for (let i in list) {
                const me = list[i];
                if (Game.CountsAsAchievementOwned(me.pool)) achievementsTotal++;
                let pool = me.pool;
                if (!achievements[pool]) achievements[pool] = '';
                achievements[pool] += Game.crate(me, 'stats');

                if (me.won) {
                    if (Game.CountsAsAchievementOwned(me.pool)) achievementsOwned++;
                    else achievementsOwnedOther++;
                }
            }

            let achievementsStr = '';
            let pools = {
                dungeon: EN ? '<b>Dungeon achievements</b> <small>(Not technically achievable yet.)</small>' : '<b>???</b>',
                shadow:
                        '<b>' +
                        loc('Shadow achievements') +
                        '</b> <small>(' +
                        loc('These are feats that are either unfair or difficult to attain. They do not give milk.') +
                        ')</small>'
            };
            for (let i in achievements) {
                if (achievements[i] != '') {
                    // @ts-expect-error too lazy
                    if (pools[i]) achievementsStr += '<div class="listing">' + pools[i] + '</div>';
                    achievementsStr += '<div class="listing crateBox">' + achievements[i] + '</div>';
                }
            }

            let milkStr = '';
            for (let i = 0; i < Game.Milks.length; i++) {
                if (Game.milkProgress >= i) {
                    let milk = Game.Milks[i];
                    milkStr +=
                            '<div ' +
                            Game.getTooltip(
                                '<div class="prompt" style="text-align:center;padding-bottom:6px;white-space:nowrap;margin:0px;padding-bottom:96px;" id="tooltipMilk"><h3 style="margin:6px 32px 0px 32px;">' +
                                (loc('Rank %1', window.exports.roman(i + 1)) + ' - ' + milk.name) +
                                '</h3><div style="opacity:0.75;font-size:9px;">(' +
                                (i == 0 ? loc('starter milk') : loc('for %1 achievements', Beautify(i * 25))) +
                                ')</div><div class="line"></div><div style="width:100%;height:96px;position:absolute;left:0px;bottom:0px;background:url(img/' +
                                milk.pic +
                                ');"></div></div>',
                                'top'
                            ) +
                            ' style="background:url(img/icons.png?v=' +
                            Game.version +
                            ') ' +
                            -milk.icon[0] * 48 +
                            'px ' +
                            -milk.icon[1] * 48 +
                            'px;margin:2px 0px;" class="trophy"></div>';
                }
            }
            milkStr += '<div style="clear:both;"></div>';

            let santaStr = '';
            let frames = 15;
            if (Game.Has('A festive hat')) {
                for (let i = 0; i <= Game.santaLevel; i++) {
                    santaStr +=
                            '<div ' +
                            Game.getTooltip(
                                '<div class="prompt" style="text-align:center;padding-bottom:6px;white-space:nowrap;margin:0px 32px;"><div style="width:96px;height:96px;margin:4px auto;background:url(img/santa.png) ' +
                                -i * 96 +
                                'px 0px;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);" id="tooltipSanta"></div><div class="line"></div><h3>' +
                                Game.santaLevels[i] +
                                '</h3></div>',
                                'top'
                            ) +
                            ' style="background:url(img/santa.png) ' +
                            -i * 48 +
                            'px 0px;background-size:' +
                            frames * 48 +
                            'px 48px;" class="trophy"></div>';
                }
                santaStr += '<div style="clear:both;"></div>';
            }
            let dragonStr = '';
            frames = 9;
            let mainLevels = [0, 4, 8, Game.dragonLevels.length - 3, Game.dragonLevels.length - 2, Game.dragonLevels.length - 1];
            if (Game.Has('A crumbly egg')) {
                for (let i = 0; i <= mainLevels.length; i++) {
                    if (Game.dragonLevel >= mainLevels[i]) {
                        let level = Game.dragonLevels[mainLevels[i]];
                        dragonStr +=
                                '<div ' +
                                Game.getTooltip(
                                    '<div class="prompt" style="text-align:center;padding-bottom:6px;white-space:nowrap;margin:0px 32px;" id="tooltipDragon"><div style="width:96px;height:96px;margin:4px auto;background:url(img/dragon.png?v=' +
                                    Game.version +
                                    ') ' +
                                    -level.pic * 96 +
                                    'px 0px;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);"></div><div class="line"></div><h3>' +
                                    level.name +
                                    '</h3></div>',
                                    'top'
                                ) +
                                ' style="background:url(img/dragon.png?v=' +
                                Game.version +
                                ') ' +
                                -level.pic * 48 +
                                'px 0px;background-size:' +
                                frames * 48 +
                                'px 48px;" class="trophy"></div>';
                    }
                }
                dragonStr += '<div style="clear:both;"></div>';
            }
            let ascensionModeStr = '';
            let icon = Game.ascensionModes[Game.ascensionMode].icon;
            if (Game.resets > 0)
                ascensionModeStr =
                        '<span style="cursor:pointer;" ' +
                        Game.getTooltip(
                            '<div style="min-width:200px;text-align:center;font-size:11px;" id="tooltipChallengeMode">' +
                            Game.ascensionModes[Game.ascensionMode].desc +
                            '</div>',
                            'top'
                        ) +
                        '><div class="icon" style="display:inline-block;float:none;transform:scale(0.5);margin:-24px -16px -19px -8px;' +
                        writeIcon(icon) +
                        '"></div>' +
                        Game.ascensionModes[Game.ascensionMode].dname +
                        '</span>';

            let milkName = Game.Milk.name;

            let researchStr = Game.sayTime(Game.researchT, -1);
            let pledgeStr = Game.sayTime(Game.pledgeT, -1);
            let wrathStr = '';
            if (Game.elderWrath == 1) wrathStr = locStr('awoken');
            else if (Game.elderWrath == 2) wrathStr = locStr('displeased');
            else if (Game.elderWrath == 3) wrathStr = locStr('angered');
            else if (Game.elderWrath == 0 && Game.pledges > 0) wrathStr = locStr('appeased');

            let dropMult = Game.dropRateMult();

            let date = new Date();
            date.setTime(Date.now() - Game.startDate);
            let timeInSeconds = date.getTime() / 1000;
            let startDate = Game.sayTime(timeInSeconds * Game.fps, -1);
            date.setTime(Date.now() - Game.fullDate);
            let fullDate = Game.sayTime((date.getTime() / 1000) * Game.fps, -1);
            if (!Game.fullDate || !fullDate || fullDate.length === 0) fullDate = String(loc('a long while'));

            let heavenlyMult = Game.GetHeavenlyMultiplier();

            let seasonStr = Game.sayTime(Game.seasonT, -1);

            str +=
                    '<div class="section">' +
                    (EN ? 'Statistics' : loc('Stats')) +
                    '</div>' +
                    '<div class="subsection">' +
                    '<div class="title">' +
                    loc('General') +
                    '</div>' +
                    '<div id="statsGeneral">' +
                    '<div class="listing"><b>' +
                    loc('Cookies in bank:') +
                    '</b> <div class="price plain">' +
                    Game.tinyCookie() +
                    Beautify(Game.cookies) +
                    '</div></div>' +
                    '<div class="listing"><b>' +
                    loc('Cookies baked (this ascension):') +
                    '</b> <div class="price plain">' +
                    Game.tinyCookie() +
                    Beautify(Game.cookiesEarned) +
                    '</div></div>' +
                    '<div class="listing"><b>' +
                    loc('Cookies baked (all time):') +
                    '</b> <div class="price plain">' +
                    Game.tinyCookie() +
                    Beautify(Game.cookiesEarned + Game.cookiesReset) +
                    '</div></div>' +
                    (Game.cookiesReset > 0
                        ? '<div class="listing"><b>' +
                        loc('Cookies forfeited by ascending:') +
                        '</b> <div class="price plain">' +
                        Game.tinyCookie() +
                        Beautify(Game.cookiesReset) +
                        '</div></div>'
                        : '') +
                    (Game.resets
                        ? '<div class="listing"><b>' +
                        loc('Legacy started:') +
                        '</b> ' +
                        (fullDate == '' ? loc('just now') : loc('%1 ago', fullDate)) +
                        ', ' +
                        loc('with %1 ascension', LBeautify(Game.resets)) +
                        '</div>'
                        : '') +
                    '<div class="listing"><b>' +
                    loc('Run started:') +
                    '</b> ' +
                    (startDate == '' ? loc('just now') : loc('%1 ago', startDate)) +
                    '</div>' +
                    '<div class="listing"><b>' +
                    loc('Buildings owned:') +
                    '</b> ' +
                    Beautify(buildingsOwned) +
                    '</div>' +
                    '<div class="listing"><b>' +
                    loc('Cookies per second:') +
                    '</b> ' +
                    Beautify(Game.cookiesPs, 1) +
                    ' <small>' +
                    '(' +
                    loc('multiplier:') +
                    ' ' +
                    Beautify(Math.round(Game.globalCpsMult * 100), 1) +
                    '%)' +
                    (Game.cpsSucked > 0
                        ? ' <span class="warning">(' + loc('withered:') + ' ' + Beautify(Math.round(Game.cpsSucked * 100), 1) + '%)</span>'
                        : '') +
                    '</small></div>' +
                    '<div class="listing"><b>' +
                    loc('Raw cookies per second:') +
                    '</b> ' +
                    Beautify(Game.cookiesPsRaw, 1) +
                    ' <small>' +
                    '(' +
                    loc('highest this ascension:') +
                    ' ' +
                    Beautify(Game.cookiesPsRawHighest, 1) +
                    ')' +
                    '</small></div>' +
                    '<div class="listing"><b>' +
                    loc('Cookies per click:') +
                    '</b> ' +
                    Beautify(Game.computedMouseCps, 1) +
                    '</div>' +
                    '<div class="listing"><b>' +
                    loc('Cookie clicks:') +
                    '</b> ' +
                    Beautify(Game.cookieClicks) +
                    '</div>' +
                    '<div class="listing"><b>' +
                    loc('Hand-made cookies:') +
                    '</b> ' +
                    Beautify(Game.handmadeCookies) +
                    '</div>' +
                    '<div class="listing"><b>' +
                    loc('Golden cookie clicks:') +
                    '</b> ' +
                    Beautify(Game.goldenClicksLocal) +
                    ' <small>(' +
                    loc('all time:') +
                    ' ' +
                    Beautify(Game.goldenClicks) +
                    ')</small></div>' +
                    (dropMult != 1
                        ? '<div class="listing"><b>' + loc('Random drop multiplier:') + '</b> <small>x</small>' + Beautify(dropMult, 2) + '</div>'
                        : '') +
                    '</div>' +
                    '<br><div class="listing"><b>' +
                    loc('Running version:') +
                    '</b> ' +
                    Game.version +
                    '</div>' +
                    (researchStr != '' ||
                        wrathStr != '' ||
                        pledgeStr != '' ||
                        santaStr != '' ||
                        dragonStr != '' ||
                        Game.season != '' ||
                        ascensionModeStr != '' ||
                        Game.canLumps()
                        ? '</div><div class="subsection">' +
                        '<div class="title">' +
                        loc('Special') +
                        '</div>' +
                        '<div id="statsSpecial">' +
                        (ascensionModeStr != '' ? '<div class="listing"><b>' + loc('Challenge mode:') + '</b>' + ascensionModeStr + '</div>' : '') +
                        (Game.season != ''
                            ? '<div class="listing"><b>' +
                            loc('Seasonal event:') +
                            '</b> ' +
                            Game.seasons[Game.season].name +
                            (seasonStr != '' ? ' <small>(' + loc('%1 remaining', seasonStr) + ')</small>' : '') +
                            '</div>'
                            : '') +
                        (EN && Game.season == 'fools'
                            ? '<div class="listing"><b>Money made from selling cookies :</b> ' +
                            Beautify(Game.cookiesEarned * 0.08, 2) +
                            ' cookie dollars</div>' +
                            (Game.Objects['Portal'].highest > 0
                                ? '<div class="listing"><b>TV show seasons produced :</b> ' +
                                Beautify(Math.floor((timeInSeconds / 60 / 60) * (Game.Objects['Portal'].highest * 0.13) + 1)) +
                                '</div>'
                                : '')
                            : '') +
                        (researchStr != '' ? '<div class="listing"><b>' + loc('Research:') + '</b> ' + loc('%1 remaining', researchStr) + '</div>' : '') +
                        (wrathStr != '' ? '<div class="listing"><b>' + loc('Grandmatriarchs status:') + '</b> ' + wrathStr + '</div>' : '') +
                        (pledgeStr != '' ? '<div class="listing"><b>' + loc('Pledge:') + '</b> ' + loc('%1 remaining', pledgeStr) + '</div>' : '') +
                        (Game.wrinklersPopped > 0
                            ? '<div class="listing"><b>' + loc('Wrinklers popped:') + '</b> ' + Beautify(Game.wrinklersPopped) + '</div>'
                            : '') +
                        (Game.canLumps() && Game.lumpsTotal > -1
                            ? '<div class="listing"><b>' +
                            loc('Sugar lumps harvested:') +
                            '</b> <div class="price lump plain">' +
                            Beautify(Game.lumpsTotal) +
                            '</div></div>'
                            : '') +
                        (Game.reindeerClicked > 0
                            ? '<div class="listing"><b>' + loc('Reindeer found:') + '</b> ' + Beautify(Game.reindeerClicked) + '</div>'
                            : '') +
                        (santaStr != '' ? '<div class="listing"><b>' + loc('Santa stages unlocked:') + '</b></div><div>' + santaStr + '</div>' : '') +
                        (dragonStr != '' ? '<div class="listing"><b>' + loc('Dragon training:') + '</b></div><div>' + dragonStr + '</div>' : '') +
                        '</div>'
                        : '') +
                    (Game.prestige > 0 || prestigeUpgrades != ''
                        ? '</div><div class="subsection">' +
                        '<div class="title">' +
                        loc('Prestige') +
                        '</div>' +
                        '<div id="statsPrestige">' +
                        '<div class="listing"><div class="icon" style="float:left;background-position:' +
                        -19 * 48 +
                        'px ' +
                        -7 * 48 +
                        'px;"></div>' +
                        '<div style="margin-top:8px;"><span class="title" style="font-size:22px;">' +
                        loc('Prestige level:') +
                        ' ' +
                        Beautify(Game.prestige) +
                        '</span> ' +
                        loc('at %1% of its potential <b>(+%2% CpS)</b>', [
                            Beautify(heavenlyMult * 100, 1),
                            // @ts-expect-error dunno if needed
                            Beautify(Number.parseFloat(Game.prestige) * Game.heavenlyPower * heavenlyMult, 1)
                        ]) +
                        '<br>' +
                        loc('Heavenly chips:') +
                        ' <b>' +
                        Beautify(Game.heavenlyChips) +
                        '</b></div>' +
                        '</div>' +
                        (prestigeUpgrades != ''
                            ? '<div class="listing" style="clear:left;"><b>' +
                            loc('Prestige upgrades unlocked:') +
                            '</b> ' +
                            prestigeUpgradesOwned +
                            '/' +
                            prestigeUpgradesTotal +
                            ' (' +
                            Math.floor((prestigeUpgradesOwned / prestigeUpgradesTotal) * 100) +
                            '%)</div>' +
                            '<div class="listing crateBox">' +
                            prestigeUpgrades +
                            '</div>'
                            : '') +
                        '</div>'
                        : '') +
                    '</div><div class="subsection">' +
                    '<div class="title">' +
                    loc('Upgrades') +
                    '</div>' +
                    '<div id="statsUpgrades">' +
                    (hiddenUpgrades != '' ? '<div class="listing"><b>Debug</b></div>' + '<div class="listing crateBox">' + hiddenUpgrades + '</div>' : '') +
                    '<div class="listing"><b>' +
                    loc('Upgrades unlocked:') +
                    '</b> ' +
                    upgradesOwned +
                    '/' +
                    upgradesTotal +
                    ' (' +
                    Math.floor((upgradesOwned / upgradesTotal) * 100) +
                    '%)</div>' +
                    '<div class="listing crateBox">' +
                    upgrades +
                    '</div>' +
                    (cookieUpgrades != ''
                        ? '<div class="listing"><b>' + loc('Cookies') + '</b></div>' + '<div class="listing crateBox">' + cookieUpgrades + '</div>'
                        : '') +
                    '</div>' +
                    '</div><div class="subsection">' +
                    '<div class="title">' +
                    loc('Achievements') +
                    '</div>' +
                    '<div id="statsAchievs">' +
                    '<div class="listing"><b>' +
                    loc('Achievements unlocked:') +
                    '</b> ' +
                    achievementsOwned +
                    '/' +
                    achievementsTotal +
                    ' (' +
                    Math.floor((achievementsOwned / achievementsTotal) * 100) +
                    '%)' +
                    (achievementsOwnedOther > 0 ? '<span style="font-weight:bold;font-size:10px;color:#70a;"> (+' + achievementsOwnedOther + ')</span>' : '') +
                    '</div>' +
                    (ASSERT_NOT_NULL(Game.cookiesMultByType['kittens']) > 1
                        ? '<div class="listing"><b>' + loc('Kitten multiplier:') + '</b> '
                        + Beautify(ASSERT_NOT_NULL(Game.cookiesMultByType['kittens']) * 100) + '%</div>'
                        : '') +
                    '<div class="listing"><b>' +
                    loc('Milk') +
                    ':</b> ' +
                    milkName +
                    '</div>' +
                    (milkStr != '' ? '<div class="listing"><b>' + loc('Milk flavors unlocked:') + '</b></div><div>' + milkStr + '</div>' : '') +
                    '<div class="listing"><small style="opacity:0.75;">(' +
                    loc('Milk is gained with each achievement. It can unlock unique upgrades over time.') +
                    ')</small></div>' +
                    achievementsStr +
                    '</div>' +
                    '</div>' +
                    '<div style="padding-bottom:128px;"></div>';
        }
        $('menu', true).innerHTML = str;
    }

    static ascendMeter = $('ascendMeter', true);
    static ascendNumber = $('ascendNumber', true);

    /* =====================================================================================
        NEWS TICKER
        =======================================================================================*/
    static Ticker = '';
    static TickerAge = 0;
    /** @type {0 | { type: string; sub: any; }} */
    static TickerEffect = 0;
    static TickerN = 0;
    static TickerClicks = 0;
    static UpdateTicker() {
        Game.TickerAge--;
        if (Game.TickerAge <= 0) Game.getNewTicker();
        else if (Game.Ticker == '') Game.getNewTicker(true);
    }
    /**
     * @param {boolean | undefined} [manual]
     */
    static getNewTicker(
        manual // note : "manual" is true if the ticker was clicked, but may also be true on startup etc
    ) {
        let list = [];

        let NEWS = locStr('News :').replace(' ', '&nbsp;') + ' ';

        let loreProgress = Math.round(Math.trunc(Math.log10(Game.cookiesEarned / 10) + 1));

        if (Game.TickerN % 2 == 0 || loreProgress > 14) {
            let animals = [
                'newts',
                'penguins',
                'scorpions',
                'axolotls',
                'puffins',
                'porpoises',
                'blowfish',
                'horses',
                'crayfish',
                'slugs',
                'humpback whales',
                'nurse sharks',
                'giant squids',
                'polar bears',
                'fruit bats',
                'frogs',
                'sea squirts',
                'velvet worms',
                'mole rats',
                'paramecia',
                'nematodes',
                'tardigrades',
                'giraffes',
                'monkfish',
                'wolfmen',
                'goblins',
                'hippies'
            ];

            if (Math.random() < 0.75 || Game.cookiesEarned < 10000) {
                if (Game.Objects['Grandma'].amount > 0)
                    list.push('<q>' + choose(loc('Ticker (grandma)')) + '</q><sig>' + Game.Objects['Grandma'].single + '</sig>');

                if (!Game.prefs.notScary && Game.Objects['Grandma'].amount >= 50)
                    list.push('<q>' + choose(loc('Ticker (threatening grandma)')) + '</q><sig>' + Game.Objects['Grandma'].single + '</sig>');

                if (EN && Game.HasAchiev('Just wrong') && Math.random() < 0.05) list.push(NEWS + 'cookie manufacturer downsizes, sells own grandmother!');
                if (!Game.prefs.notScary && Game.HasAchiev('Just wrong') && Math.random() < 0.4)
                    list.push('<q>' + choose(loc('Ticker (angry grandma)')) + '</q><sig>' + Game.Objects['Grandma'].single + '</sig>');

                if (!Game.prefs.notScary && Game.Objects['Grandma'].amount >= 1 && Game.pledges > 0 && Game.elderWrath == 0)
                    list.push('<q>' + choose(loc('Ticker (grandmas return)')) + '</q><sig>' + Game.Objects['Grandma'].single + '</sig>');

                if (!EN) {
                    for (let i in Game.Objects) {
                        if (i != 'Cursor' && i != 'Grandma' && Game.Objects[i].amount > 0) list.push(NEWS + choose(loc('Ticker (' + i + ')')));
                    }

                    if (Game.cookiesEarned >= 1000) {
                        if (Game.season == 'halloween') list.push(NEWS + choose(loc('Ticker (Halloween)')));
                        if (Game.season == 'christmas') list.push(NEWS + choose(loc('Ticker (Christmas)')));
                        if (Game.season == 'valentines') list.push(NEWS + choose(loc('Ticker (Valentines)')));
                        if (Game.season == 'easter') list.push(NEWS + choose(loc('Ticker (Easter)')));
                    }
                } else {
                    if (Game.Objects['Farm'].amount > 0)
                        list.push(
                            choose([
                                'News : cookie farms suspected of employing undeclared elderly workforce!',
                                'News : cookie farms release harmful chocolate in our rivers, says scientist!',
                                'News : genetically-modified chocolate controversy strikes cookie farmers!',
                                'News : free-range farm cookies popular with today\'s hip youth, says specialist.',
                                'News : farm cookies deemed unfit for vegans, says nutritionist.'
                            ])
                        );

                    if (Game.Objects['Mine'].amount > 0)
                        list.push(
                            choose([
                                'News : is our planet getting lighter? Experts examine the effects of intensive chocolate mining.',
                                'News : ' + Math.floor(Math.random() * 1000 + 2) + ' miners trapped in collapsed chocolate mine!',
                                'News : chocolate mines found to cause earthquakes and sinkholes!',
                                'News : chocolate mine goes awry, floods village in chocolate!',
                                'News : depths of chocolate mines found to house "peculiar, chocolaty beings"!'
                            ])
                        );

                    if (Game.Objects['Factory'].amount > 0)
                        list.push(
                            choose([
                                'News : cookie factories linked to global warming!',
                                'News : cookie factories involved in chocolate weather controversy!',
                                'News : cookie factories on strike, robotic minions employed to replace workforce!',
                                'News : cookie factories on strike - workers demand to stop being paid in cookies!',
                                'News : factory-made cookies linked to obesity, says study.'
                            ])
                        );

                    if (Game.Objects['Bank'].amount > 0)
                        list.push(
                            choose([
                                'News : cookie loans on the rise as people can no longer afford them with regular money.',
                                'News : cookies slowly creeping up their way as a competitor to traditional currency!',
                                'News : most bakeries now fitted with ATMs to allow for easy cookie withdrawals and deposits.',
                                'News : cookie economy now strong enough to allow for massive vaults doubling as swimming pools!',
                                'News : "Tomorrow\'s wealthiest people will be calculated by their worth in cookies", predict economists.'
                            ])
                        );

                    if (Game.Objects['Temple'].amount > 0)
                        list.push(
                            choose([
                                'News : explorers bring back ancient artifact from abandoned temple; archeologists marvel at the centuries-old ' +
                                    choose([
                                        'magic',
                                        'carved',
                                        'engraved',
                                        'sculpted',
                                        'royal',
                                        'imperial',
                                        'mummified',
                                        'ritual',
                                        'golden',
                                        'silver',
                                        'stone',
                                        'cursed',
                                        'plastic',
                                        'bone',
                                        'blood',
                                        'holy',
                                        'sacred',
                                        'sacrificial',
                                        'electronic',
                                        'singing',
                                        'tapdancing'
                                    ]) +
                                    ' ' +
                                    choose([
                                        'spoon',
                                        'fork',
                                        'pizza',
                                        'washing machine',
                                        'calculator',
                                        'hat',
                                        'piano',
                                        'napkin',
                                        'skeleton',
                                        'gown',
                                        'dagger',
                                        'sword',
                                        'shield',
                                        'skull',
                                        'emerald',
                                        'bathtub',
                                        'mask',
                                        'rollerskates',
                                        'litterbox',
                                        'bait box',
                                        'cube',
                                        'sphere',
                                        'fungus'
                                    ]) +
                                    '!',
                                'News : recently-discovered chocolate temples now sparking new cookie-related cult; thousands pray to Baker in the sky!',
                                'News : just how extensive is the cookie pantheon? Theologians speculate about possible ' +
                                    choose(['god', 'goddess']) +
                                    ' of ' +
                                    choose([
                                        choose(animals),
                                        choose([
                                            'kazoos',
                                            'web design',
                                            'web browsers',
                                            'kittens',
                                            'atheism',
                                            'handbrakes',
                                            'hats',
                                            'aglets',
                                            'elevator music',
                                            'idle games',
                                            'the letter "P"',
                                            'memes',
                                            'hamburgers',
                                            'bad puns',
                                            'kerning',
                                            'stand-up comedy',
                                            'failed burglary attempts',
                                            'clickbait',
                                            'one weird tricks'
                                        ])
                                    ]) +
                                    '.',
                                'News : theists of the world discover new cookie religion - "Oh boy, guess we were wrong all along!"',
                                'News : cookie heaven allegedly "sports elevator instead of stairway"; cookie hell "paved with flagstone, as good intentions make for poor building material".'
                            ])
                        );

                    if (Game.Objects['Wizard tower'].amount > 0)
                        list.push(
                            choose([
                                'News : all ' +
                                    choose([
                                        choose(animals),
                                        choose([
                                            'public restrooms',
                                            'clouds',
                                            'politicians',
                                            'moustaches',
                                            'hats',
                                            'shoes',
                                            'pants',
                                            'clowns',
                                            'encyclopedias',
                                            'websites',
                                            'potted plants',
                                            'lemons',
                                            'household items',
                                            'bodily fluids',
                                            'cutlery',
                                            'national landmarks',
                                            'yogurt',
                                            'rap music',
                                            'underwear'
                                        ])
                                    ]) +
                                    ' turned into ' +
                                    choose([
                                        choose(animals),
                                        choose([
                                            'public restrooms',
                                            'clouds',
                                            'politicians',
                                            'moustaches',
                                            'hats',
                                            'shoes',
                                            'pants',
                                            'clowns',
                                            'encyclopedias',
                                            'websites',
                                            'potted plants',
                                            'lemons',
                                            'household items',
                                            'bodily fluids',
                                            'cutlery',
                                            'national landmarks',
                                            'yogurt',
                                            'rap music',
                                            'underwear'
                                        ])
                                    ]) +
                                    ' in freak magic catastrophe!',
                                'News : heavy dissent rages between the schools of ' +
                                    choose([
                                        'water',
                                        'fire',
                                        'earth',
                                        'air',
                                        'lightning',
                                        'acid',
                                        'song',
                                        'battle',
                                        'peace',
                                        'pencil',
                                        'internet',
                                        'space',
                                        'time',
                                        'brain',
                                        'nature',
                                        'techno',
                                        'plant',
                                        'bug',
                                        'ice',
                                        'poison',
                                        'crab',
                                        'kitten',
                                        'dolphin',
                                        'bird',
                                        'punch',
                                        'fart'
                                    ]) +
                                    ' magic and ' +
                                    choose([
                                        'water',
                                        'fire',
                                        'earth',
                                        'air',
                                        'lightning',
                                        'acid',
                                        'song',
                                        'battle',
                                        'peace',
                                        'pencil',
                                        'internet',
                                        'space',
                                        'time',
                                        'brain',
                                        'nature',
                                        'techno',
                                        'plant',
                                        'bug',
                                        'ice',
                                        'poison',
                                        'crab',
                                        'kitten',
                                        'dolphin',
                                        'bird',
                                        'punch',
                                        'fart'
                                    ]) +
                                    ' magic!',
                                'News : get your new charms and curses at the yearly National Spellcrafting Fair! Exclusive prices on runes and spellbooks.',
                                'News : cookie wizards deny involvement in shockingly ugly newborn - infant is "honestly grody-looking, but natural", say doctors.',
                                'News : "Any sufficiently crude magic is indistinguishable from technology", claims renowned technowizard.'
                            ])
                        );

                    if (Game.Objects['Shipment'].amount > 0)
                        list.push(
                            choose([
                                'News : new chocolate planet found, becomes target of cookie-trading spaceships!',
                                'News : massive chocolate planet found with 99.8% certified pure dark chocolate core!',
                                'News : space tourism booming as distant planets attract more bored millionaires!',
                                'News : chocolate-based organisms found on distant planet!',
                                'News : ancient baking artifacts found on distant planet; "terrifying implications", experts say.'
                            ])
                        );

                    if (Game.Objects['Alchemy lab'].amount > 0)
                        list.push(
                            choose([
                                'News : national gold reserves dwindle as more and more of the precious mineral is turned to cookies!',
                                'News : chocolate jewelry found fashionable, gold and diamonds "just a fad", says specialist.',
                                'News : silver found to also be transmutable into white chocolate!',
                                'News : defective alchemy lab shut down, found to convert cookies to useless gold.',
                                'News : alchemy-made cookies shunned by purists!'
                            ])
                        );

                    if (Game.Objects['Portal'].amount > 0)
                        list.push(
                            choose([
                                'News : nation worried as more and more unsettling creatures emerge from dimensional portals!',
                                'News : dimensional portals involved in city-engulfing disaster!',
                                'News : tourism to cookieverse popular with bored teenagers! Casualty rate as high as 73%!',
                                'News : cookieverse portals suspected to cause fast aging and obsession with baking, says study.',
                                'News : "do not settle near portals," says specialist; "your children will become strange and corrupted inside."'
                            ])
                        );

                    if (Game.Objects['Time machine'].amount > 0)
                        list.push(
                            choose([
                                'News : time machines involved in history-rewriting scandal! Or are they?',
                                'News : time machines used in unlawful time tourism!',
                                'News : cookies brought back from the past "unfit for human consumption", says historian.',
                                'News : various historical figures inexplicably replaced with talking lumps of dough!',
                                'News : "I have seen the future," says time machine operator, "and I do not wish to go there again."'
                            ])
                        );

                    if (Game.Objects['Antimatter condenser'].amount > 0)
                        list.push(
                            choose([
                                'News : whole town seemingly swallowed by antimatter-induced black hole; more reliable sources affirm town "never really existed"!',
                                'News : "explain to me again why we need particle accelerators to bake cookies?" asks misguided local woman.',
                                'News : first antimatter condenser successfully turned on, doesn\'t rip apart reality!',
                                'News : researchers conclude that what the cookie industry needs, first and foremost, is "more magnets".',
                                'News : "unravelling the fabric of reality just makes these cookies so much tastier", claims scientist.'
                            ])
                        );

                    if (Game.Objects['Prism'].amount > 0)
                        list.push(
                            choose([
                                'News : new cookie-producing prisms linked to outbreak of rainbow-related viral videos.',
                                'News : scientists warn against systematically turning light into matter - "One day, we\'ll end up with all matter and no light!"',
                                'News : cookies now being baked at the literal speed of light thanks to new prismatic contraptions.',
                                'News : "Can\'t you sense the prism watching us?", rambles insane local man. "No idea what he\'s talking about", shrugs cookie magnate/government official.',
                                'News : world citizens advised "not to worry" about frequent atmospheric flashes.'
                            ])
                        );

                    if (Game.Objects['Chancemaker'].amount > 0)
                        list.push(
                            choose([
                                'News : strange statistical anomalies continue as weather forecast proves accurate an unprecedented 3 days in a row!',
                                'News : local casino ruined as all gamblers somehow hit a week-long winning streak! "We might still be okay", says owner before being hit by lightning 47 times.',
                                'News : neighboring nation somehow elects president with sensible policies in freak accident of random chance!',
                                'News : million-to-one event sees gritty movie reboot turning out better than the original! "We have no idea how this happened", say movie execs.',
                                'News : all scratching tickets printed as winners, prompting national economy to crash and, against all odds, recover overnight.'
                            ])
                        );

                    if (Game.Objects['Fractal engine'].amount > 0)
                        list.push(
                            choose([
                                'News : local man "done with Cookie Clicker", finds the constant self-references "grating and on-the-nose".',
                                'News : local man sails around the world to find himself - right where he left it.',
                                'News : local guru claims "there\'s a little bit of ourselves in everyone", under investigation for alleged cannibalism.',
                                'News : news writer finds herself daydreaming about new career. Or at least a raise.',
                                'News : polls find idea of cookies made of cookies "acceptable" - "at least we finally know what\'s in them", says interviewed citizen.'
                            ])
                        );

                    if (Game.Objects['Javascript console'].amount > 0)
                        list.push(
                            choose([
                                'News : strange fad has parents giving their newborns names such as Emma.js or Liam.js. At least one Baby.js reported.',
                                'News : coding is hip! More and more teenagers turn to technical fields like programming, ensuring a future robot apocalypse and the doom of all mankind.',
                                'News : developers unsure what to call their new javascript libraries as all combinations of any 3 dictionary words have already been taken.',
                                'News : nation holds breath as nested ifs about to hatch.',
                                'News : clueless copywriter forgets to escape a quote, ends news line prematurely; last words reported to be "Huh, why isn'
                            ])
                        );

                    if (Game.Objects['Idleverse'].amount > 0)
                        list.push(
                            choose([
                                'News : is another you living out their dreams in an alternate universe? Probably, you lazy bum!',
                                'News : public recoils at the notion of a cosmos made of infinite idle games. "I kinda hoped there\'d be more to it", says distraught citizen.',
                                'News : with an infinity of parallel universes, people turn to reassuring alternate dimensions, which only number "in the high 50s".',
                                'News : "I find solace in the knowledge that at least some of my alternate selves are probably doing fine out there", says citizen\'s last remaining exemplar in the multiverse.',
                                'News : comic book writers point to actual multiverse in defense of dubious plot points. "See? I told you it wasn\'t \'hackneyed and contrived\'!"'
                            ])
                        );

                    if (Game.Objects['Cortex baker'].amount > 0)
                        list.push(
                            choose([
                                'News : cortex baker wranglers kindly remind employees that cortex bakers are the bakery\'s material property and should not be endeared with nicknames.',
                                'News : space-faring employees advised to ignore unusual thoughts and urges experienced within 2 parsecs of gigantic cortex bakers, say guidelines.',
                                'News : astronomers warn of cortex baker trajectory drift, fear future head-on collisions resulting in costly concussions.',
                                'News : runt cortex baker identified with an IQ of only quintuple digits: "just a bit of a dummy", say specialists.',
                                'News : are you smarter than a cortex baker? New game show deemed "unfair" by contestants.'
                            ])
                        );

                    if (Game.season == 'halloween' && Game.cookiesEarned >= 1000)
                        list.push(
                            choose([
                                'News : strange twisting creatures amass around cookie factories, nibble at assembly lines.',
                                'News : ominous wrinkly monsters take massive bites out of cookie production; "this can\'t be hygienic", worries worker.',
                                'News : pagan rituals on the rise as children around the world dress up in strange costumes and blackmail homeowners for candy.',
                                'News : new-age terrorism strikes suburbs as houses find themselves covered in eggs and toilet paper.',
                                'News : children around the world "lost and confused" as any and all Halloween treats have been replaced by cookies.'
                            ])
                        );

                    if (Game.season == 'christmas' && Game.cookiesEarned >= 1000)
                        list.push(
                            choose([
                                'News : bearded maniac spotted speeding on flying sleigh! Investigation pending.',
                                'News : Santa Claus announces new brand of breakfast treats to compete with cookie-flavored cereals! "They\'re ho-ho-horrible!" says Santa.',
                                'News : "You mean he just gives stuff away for free?!", concerned moms ask. "Personally, I don\'t trust his beard."',
                                'News : obese jolly lunatic still on the loose, warn officials. "Keep your kids safe and board up your chimneys. We mean it."',
                                'News : children shocked as they discover Santa Claus isn\'t just their dad in a costume after all!<br>"I\'m reassessing my life right now", confides Laura, aged 6.',
                                'News : mysterious festive entity with quantum powers still wrecking havoc with army of reindeer, officials say.',
                                'News : elves on strike at toy factory! "We will not be accepting reindeer chow as payment anymore. And stop calling us elves!"',
                                'News : elves protest around the nation; wee little folks in silly little outfits spread mayhem, destruction; rabid reindeer running rampant through streets.',
                                'News : scholars debate regarding the plural of reindeer(s) in the midst of elven world war.',
                                'News : elves "unrelated to gnomes despite small stature and merry disposition", find scientists.',
                                'News : elves sabotage radioactive frosting factory, turn hundreds blind in vicinity - "Who in their right mind would do such a thing?" laments outraged mayor.',
                                'News : drama unfolds at North Pole as rumors crop up around Rudolph\'s red nose; "I may have an addiction or two", admits reindeer.'
                            ])
                        );

                    if (Game.season == 'valentines' && Game.cookiesEarned >= 1000)
                        list.push(
                            choose([
                                'News : organ-shaped confectioneries being traded in schools all over the world; gruesome practice undergoing investigation.',
                                'News : heart-shaped candies overtaking sweets business, offering competition to cookie empire. "It\'s the economy, cupid!"',
                                'News : love\'s in the air, according to weather specialists. Face masks now offered in every city to stunt airborne infection.',
                                'News : marrying a cookie - deranged practice, or glimpse of the future?',
                                'News : boyfriend dumped after offering his lover cookies for Valentine\'s Day, reports say. "They were off-brand", shrugs ex-girlfriend.'
                            ])
                        );

                    if (Game.season == 'easter' && Game.cookiesEarned >= 1000)
                        list.push(
                            choose([
                                'News : long-eared critters with fuzzy tails invade suburbs, spread terror and chocolate!',
                                'News : eggs have begun to materialize in the most unexpected places; "no place is safe", warn experts.',
                                'News : packs of rampaging rabbits cause billions in property damage; new strain of myxomatosis being developed.',
                                'News : egg-laying rabbits "not quite from this dimension", warns biologist; advises against petting, feeding, or cooking the creatures.',
                                'News : mysterious rabbits found to be egg-layers, but mammalian, hinting at possible platypus ancestry.'
                            ])
                        );
                }
            }
            if (!EN) {
                if (Game.cookiesEarned >= 10000) {
                    list.push(
                        NEWS + choose(loc('Ticker (misc)')),
                        NEWS + choose(loc('Ticker (misc)')),
                        NEWS + choose(loc('Ticker (misc)'))
                    );
                }
            } else {
                if (Math.random() < 0.05) {
                    if (Game.HasAchiev('Base 10'))
                        list.push(
                            'News : cookie manufacturer completely forgoes common sense, lets strange obsession with round numbers drive building decisions!'
                        );
                    if (Game.HasAchiev('From scratch'))
                        list.push('News : follow the tear-jerking, riches-to-rags story about a local cookie manufacturer who decided to give it all up!');
                    if (Game.HasAchiev('A world filled with cookies')) list.push('News : known universe now jammed with cookies! No vacancies!');
                    if (Game.HasAchiev('Last Chance to See'))
                        list.push('News : incredibly rare albino wrinkler on the brink of extinction poached by cookie-crazed pastry magnate!');
                    if (Game.Has('Serendipity')) list.push('News : local cookie manufacturer becomes luckiest being alive!');
                    if (Game.Has('Season switcher'))
                        list.push('News : seasons are all out of whack! "We need to get some whack back into them seasons", says local resident.');

                    if (Game.Has('Kitten helpers'))
                        list.push('News : faint meowing heard around local cookie facilities; suggests new ingredient being tested.');
                    if (Game.Has('Kitten workers'))
                        list.push('News : crowds of meowing kittens with little hard hats reported near local cookie facilities.');
                    if (Game.Has('Kitten engineers'))
                        list.push(
                            'News : surroundings of local cookie facilities now overrun with kittens in adorable little suits. Authorities advise to stay away from the premises.'
                        );
                    if (Game.Has('Kitten overseers')) list.push('News : locals report troupe of bossy kittens meowing adorable orders at passersby.');
                    if (Game.Has('Kitten managers'))
                        list.push('News : local office cubicles invaded with armies of stern-looking kittens asking employees "what\'s happening, meow".');
                    if (Game.Has('Kitten accountants'))
                        list.push(
                            'News : tiny felines show sudden and amazing proficiency with fuzzy mathematics and pawlinomials, baffling scientists and pet store owners.'
                        );
                    if (Game.Has('Kitten specialists'))
                        list.push('News : new kitten college opening next week, offers courses on cookie-making and catnip studies.');
                    if (Game.Has('Kitten experts'))
                        list.push('News : unemployment rates soaring as woefully adorable little cats nab jobs on all levels of expertise, says study.');
                    if (Game.Has('Kitten consultants'))
                        list.push('News : "In the future, your job will most likely be done by a cat", predicts suspiciously furry futurologist.');
                    if (Game.Has('Kitten assistants to the regional manager'))
                        list.push('News : strange kittens with peculiar opinions on martial arts spotted loitering on local beet farms!');
                    if (Game.Has('Kitten marketeers'))
                        list.push(
                            'News : nonsensical kitten billboards crop up all over countryside, trying to sell people the cookies they already get for free!'
                        );
                    if (Game.Has('Kitten analysts'))
                        list.push('News : are your spending habits sensible? For a hefty fee, these kitten analysts will tell you!');
                    if (Game.Has('Kitten executives'))
                        list.push(
                            'News : kittens strutting around in hot little business suits shouting cut-throat orders at their assistants, possibly the cutest thing this reporter has ever seen!'
                        );
                    if (Game.Has('Kitten admins')) list.push('News : all systems nominal, claim kitten admins obviously in way over their heads.');
                    if (Game.Has('Kitten angels'))
                        list.push(
                            'News : "Try to ignore any ghostly felines that may be purring inside your ears," warn scientists. "They\'ll just lure you into making poor life choices."'
                        );
                    if (Game.Has('Kitten wages')) list.push('News : kittens break glass ceiling! Do they have any idea how expensive those are!');
                    if (Game.HasAchiev('Jellicles'))
                        list.push('News : local kittens involved in misguided musical production, leave audience perturbed and unnerved.');
                }

                if (Game.HasAchiev('Dude, sweet') && Math.random() < 0.2)
                    list.push(
                        choose([
                            'News : major sugar-smuggling ring dismantled by authorities; ' +
                                Math.floor(Math.random() * 30 + 3) +
                                ' tons of sugar lumps seized, ' +
                                Math.floor(Math.random() * 48 + 2) +
                                ' suspects apprehended.',
                            'News : authorities warn tourists not to buy bootleg sugar lumps from street peddlers - "You think you\'re getting a sweet deal, but what you\'re being sold is really just ordinary cocaine", says agent.',
                            'News : pro-diabetes movement protests against sugar-shaming. "I\'ve eaten nothing but sugar lumps for the past ' +
                                Math.floor(Math.random() * 10 + 4) +
                                ' years and I\'m feeling great!", says woman with friable skin.',
                            'News : experts in bitter disagreement over whether sugar consumption turns children sluggish or hyperactive.',
                            'News : fishermen deplore upturn in fish tooth decay as sugar lumps-hauling cargo sinks into the ocean.',
                            'News : rare black sugar lump that captivated millions in unprecedented auction revealed to be common toxic fungus.',
                            'News : "Back in my day, sugar lumps were these little cubes you\'d put in your tea, not those fist-sized monstrosities people eat for lunch", whines curmudgeon with failing memory.',
                            'News : sugar lump-snacking fad sweeps the nation; dentists everywhere rejoice.'
                        ])
                    );

                if (Math.random() < 0.001) {
                    // apologies to Will Wright
                    list.push(
                        'You have been chosen. They will come soon.',
                        'They\'re coming soon. Maybe you should think twice about opening the door.',
                        'The end is near. Make preparations.',
                        'News : broccoli tops for moms, last for kids; dads indifferent.',
                        'News : middle age a hoax, declares study; turns out to be bad posture after all.',
                        'News : kitties want answers in possible Kitty Kibble shortage.'
                    );
                }

                if (Game.cookiesEarned >= 10000)
                    list.push(
                        'News : ' +
                            choose([
                                'cookies found to ' +
                                choose([
                                    'increase lifespan',
                                    'sensibly increase intelligence',
                                    'reverse aging',
                                    'decrease hair loss',
                                    'prevent arthritis',
                                    'cure blindness'
                                ]) +
                                ' in ' +
                                choose(animals) +
                                '!',
                                'cookies found to make ' +
                                choose(animals) +
                                ' ' +
                                choose(['more docile', 'more handsome', 'nicer', 'less hungry', 'more pragmatic', 'tastier']) +
                                '!',
                                'cookies tested on ' + choose(animals) + ', found to have no ill effects.',
                                'cookies unexpectedly popular among ' + choose(animals) + '!',
                                'unsightly lumps found on ' +
                                choose(animals) +
                                ' near cookie facility; "they\'ve pretty much always looked like that", say biologists.',
                                'new species of ' + choose(animals) + ' discovered in distant country; "yup, tastes like cookies", says biologist.',
                                'cookies go well with ' +
                                choose([
                                    choose(['roasted', 'toasted', 'boiled', 'sauteed', 'minced']) + ' ' + choose(animals),
                                    choose(['sushi', 'soup', 'carpaccio', 'steak', 'nuggets']) + ' made from ' + choose(animals)
                                ]) +
                                ', says controversial chef.',
                                '"do your cookies contain ' + choose(animals) + '?", asks PSA warning against counterfeit cookies.',
                                'doctors recommend twice-daily consumption of fresh cookies.',
                                'doctors warn against chocolate chip-snorting teen fad.',
                                'doctors advise against new cookie-free fad diet.',
                                'doctors warn mothers about the dangers of "home-made cookies".'
                            ]),
                        'News : "' +
                            choose([
                                'I\'m all about cookies',
                                'I just can\'t stop eating cookies. I think I seriously need help',
                                'I guess I have a cookie problem',
                                'I\'m not addicted to cookies. That\'s just speculation by fans with too much free time',
                                'my upcoming album contains 3 songs about cookies',
                                'I\'ve had dreams about cookies 3 nights in a row now. I\'m a bit worried honestly',
                                'accusations of cookie abuse are only vile slander',
                                'cookies really helped me when I was feeling low',
                                'cookies are the secret behind my perfect skin',
                                'cookies helped me stay sane while filming my upcoming movie',
                                'cookies helped me stay thin and healthy',
                                'I\'ll say one word, just one : cookies',
                                'alright, I\'ll say it - I\'ve never eaten a single cookie in my life'
                            ]) +
                            '", reveals celebrity.',
                        choose([
                            'News : scientist predicts imminent cookie-related "end of the world"; becomes joke among peers.',
                            'News : man robs bank, buys cookies.',
                            'News : scientists establish that the deal with airline food is, in fact, a critical lack of cookies.',
                            'News : hundreds of tons of cookies dumped into starving country from airplanes; thousands dead, nation grateful.',
                            'News : new study suggests cookies neither speed up nor slow down aging, but instead "take you in a different direction".',
                            'News : overgrown cookies found in fishing nets, raise questions about hormone baking.',
                            'News : "all-you-can-eat" cookie restaurant opens in big city; waiters trampled in minutes.',
                            'News : man dies in cookie-eating contest; "a less-than-impressive performance", says judge.',
                            'News : what makes cookies taste so right? "Probably all the [*****] they put in them", says anonymous tipper.',
                            'News : man found allergic to cookies; "what a weirdo", says family.',
                            'News : foreign politician involved in cookie-smuggling scandal.',
                            'News : cookies now more popular than ' +
                                choose([
                                    'cough drops',
                                    'broccoli',
                                    'smoked herring',
                                    'cheese',
                                    'video games',
                                    'stable jobs',
                                    'relationships',
                                    'time travel',
                                    'cat videos',
                                    'tango',
                                    'fashion',
                                    'television',
                                    'nuclear warfare',
                                    'whatever it is we ate before',
                                    'politics',
                                    'oxygen',
                                    'lamps'
                                ]) +
                                ', says study.',
                            'News : obesity epidemic strikes nation; experts blame ' +
                                choose([
                                    'twerking',
                                    'that darn rap music',
                                    'video-games',
                                    'lack of cookies',
                                    'mysterious ghostly entities',
                                    'aliens',
                                    'parents',
                                    'schools',
                                    'comic-books',
                                    'cookie-snorting fad'
                                ]) +
                                '.',
                            'News : cookie shortage strikes town, people forced to eat cupcakes; "just not the same", concedes mayor.',
                            'News : "you gotta admit, all this cookie stuff is a bit ominous", says confused idiot.',
                            'News : is there life on Mars? Various chocolate bar manufacturers currently under investigation for bacterial contaminants.',
                            'News : "so I guess that\'s a thing now", scientist comments on cookie particles now present in virtually all steel manufactured since cookie production ramped up worldwide.',
                            'News : trace amounts of cookie particles detected in most living creatures, some of which adapting them as part of new and exotic metabolic processes.'
                        ]),
                        choose([
                            'News : movie cancelled from lack of actors; "everybody\'s at home eating cookies", laments director.',
                            'News : comedian forced to cancel cookie routine due to unrelated indigestion.',
                            'News : new cookie-based religion sweeps the nation.',
                            'News : fossil records show cookie-based organisms prevalent during Cambrian explosion, scientists say.',
                            'News : mysterious illegal cookies seized; "tastes terrible", says police.',
                            'News : man found dead after ingesting cookie; investigators favor "mafia snitch" hypothesis.',
                            'News : "the universe pretty much loops on itself," suggests researcher; "it\'s cookies all the way down."',
                            'News : minor cookie-related incident turns whole town to ashes; neighboring cities asked to chip in for reconstruction.',
                            'News : is our media controlled by the cookie industry? This could very well be the case, says crackpot conspiracy theorist.',
                            'News : ' +
                                choose([
                                    'cookie-flavored popcorn pretty damn popular; "we kinda expected that", say scientists.',
                                    'cookie-flavored cereals break all known cereal-related records',
                                    'cookies popular among all age groups, including fetuses, says study.',
                                    'cookie-flavored popcorn sales exploded during screening of Grandmothers II : The Moistening.'
                                ]),
                            'News : all-cookie restaurant opening downtown. Dishes such as braised cookies, cookie thermidor, and for dessert : crepes.',
                            'News : "Ook", says interviewed orangutan.',
                            'News : cookies could be the key to ' +
                                choose([
                                    'eternal life',
                                    'infinite riches',
                                    'eternal youth',
                                    'eternal beauty',
                                    'curing baldness',
                                    'world peace',
                                    'solving world hunger',
                                    'ending all wars world-wide',
                                    'making contact with extraterrestrial life',
                                    'mind-reading',
                                    'better living',
                                    'better eating',
                                    'more interesting TV shows',
                                    'faster-than-light travel',
                                    'quantum baking',
                                    'chocolaty goodness',
                                    'gooder thoughtness'
                                ]) +
                                ', say scientists.',
                            'News : flavor text ' +
                                choose(['not particularly flavorful', 'kind of unsavory', '"rather bland"', 'pretty spicy lately']) +
                                ', study finds.'
                        ]),
                        choose([
                            'News : what do golden cookies taste like? Study reveals a flavor "somewhere between spearmint and liquorice".',
                            'News : what do wrath cookies taste like? Study reveals a flavor "somewhere between blood sausage and seawater".',
                            'News : ' +
                                Game.bakeryName +
                                '-brand cookies "' +
                                choose([
                                    'much less soggy',
                                    'much tastier',
                                    'relatively less crappy',
                                    'marginally less awful',
                                    'less toxic',
                                    'possibly more edible',
                                    'more fashionable',
                                    'slightly nicer',
                                    'trendier',
                                    'arguably healthier',
                                    'objectively better choice',
                                    'slightly less terrible',
                                    'decidedly cookier',
                                    'a tad cheaper'
                                ]) +
                                ' than competitors", says consumer survey.',
                            'News : "' + Game.bakeryName + '" set to be this year\'s most popular baby name.',
                            'News : new popularity survey says ' + Game.bakeryName + '\'s the word when it comes to cookies.',
                            'News : major city being renamed ' + Game.bakeryName + 'ville after world-famous cookie manufacturer.',
                            'News : ' +
                                choose([
                                    'street',
                                    'school',
                                    'nursing home',
                                    'stadium',
                                    'new fast food chain',
                                    'new planet',
                                    'new disease',
                                    'flesh-eating bacteria',
                                    'deadly virus',
                                    'new species of ' + choose(animals),
                                    'new law',
                                    'baby',
                                    'programming language'
                                ]) +
                                ' to be named after ' +
                                Game.bakeryName +
                                ', the world-famous cookie manufacturer.',
                            'News : don\'t miss tonight\'s biopic on ' + Game.bakeryName + '\'s irresistible rise to success!',
                            'News : don\'t miss tonight\'s interview of ' +
                                Game.bakeryName +
                                ' by ' +
                                choose([
                                    'Bloprah',
                                    'Blavid Bletterman',
                                    'Blimmy Blimmel',
                                    'Blellen Blegeneres',
                                    'Blimmy Blallon',
                                    'Blonan Blo\'Brien',
                                    'Blay Bleno',
                                    'Blon Blewart',
                                    'Bleven Blolbert',
                                    'Lord Toxikhron of dimension 7-B19',
                                    Game.bakeryName + '\'s own evil clone'
                                ]) +
                                '!',
                            'News : people all over the internet still scratching their heads over nonsensical reference : "Okay, but why an egg?"',
                            'News : viral video "Too Many Cookies" could be "a grim commentary on the impending crisis our world is about to face", says famous economist.',
                            'News : "memes from last year somehow still relevant", deplore experts.',
                            'News : cookie emoji most popular among teenagers, far ahead of "judgmental OK hand sign" and "shifty-looking dark moon", says study.'
                        ]),
                        choose([
                            'News : births of suspiciously bald babies on the rise; ancient alien cabal denies involvement.',
                            'News : "at this point, cookies permeate the economy", says economist. "If we start eating anything else, we\'re all dead."',
                            'News : pun in headline infuriates town, causes riot. 21 wounded, 5 dead; mayor still missing.',
                            'Nws : ky btwn W and R brokn, plas snd nw typwritr ASAP.',
                            'Neeeeews : "neeeew EEEEEE keeeeey working fineeeeeeeee", reeeports gleeeeeeeeful journalist.',
                            'News : cookies now illegal in some backwards country nobody cares about. Political tensions rising; war soon, hopefully.',
                            'News : irate radio host rambles about pixelated icons. "None of the cookies are aligned! Can\'t anyone else see it? I feel like I\'m taking crazy pills!"',
                            'News : nation cheers as legislators finally outlaw ' +
                                choose([
                                    'cookie criticism',
                                    'playing other games than Cookie Clicker',
                                    'pineapple on pizza',
                                    'lack of cheerfulness',
                                    'mosquitoes',
                                    'broccoli',
                                    'the human spleen',
                                    'bad weather',
                                    'clickbait',
                                    'dabbing',
                                    'the internet',
                                    'memes',
                                    'millennials'
                                ]) +
                                '!',
                            'News : ' +
                                choose(['local', 'area']) +
                                ' ' +
                                choose(['man', 'woman']) +
                                ' goes on journey of introspection, finds cookies : "I honestly don\'t know what I was expecting."',
                            'News : ' +
                                choose(['man', 'woman']) +
                                ' wakes up from coma, ' +
                                choose([
                                    'tries cookie for the first time, dies.',
                                    'regrets it instantly.',
                                    'wonders "why everything is cookies now".',
                                    'babbles incoherently about some supposed "non-cookie food" we used to eat.',
                                    'cites cookies as main motivator.',
                                    'asks for cookies.'
                                ]),
                            'News : pet ' + choose(animals) + ', dangerous fad or juicy new market?',
                            'News : person typing these wouldn\'t mind someone else breaking the news to THEM, for a change.',
                            'News : "average person bakes ' +
                                Beautify(Math.ceil(Game.cookiesEarned / 7300000000)) +
                                ' cookie' +
                                (Math.ceil(Game.cookiesEarned / 7300000000) == 1 ? '' : 's') +
                                ' a year" factoid actually just statistical error; ' +
                                Game.bakeryName +
                                ', who has produced ' +
                                Beautify(Game.cookiesEarned) +
                                ' cookies in their lifetime, is an outlier and should not have been counted.'
                        ])
                    );
            }
        }

        if (list.length === 0) {
            if (loreProgress <= 0) list.push(loc('You feel like making cookies. But nobody wants to eat your cookies.'));
            else if (loreProgress <= 1) list.push(loc('Your first batch goes to the trash. The neighborhood raccoon barely touches it.'));
            else if (loreProgress <= 2) list.push(loc('Your family accepts to try some of your cookies.'));
            else if (loreProgress <= 3)
                list.push(loc('Your cookies are popular in the neighborhood.'), loc('People are starting to talk about your cookies.'));
            else if (loreProgress <= 4)
                list.push(loc('Your cookies are talked about for miles around.'), loc('Your cookies are renowned in the whole town!'));
            else if (loreProgress <= 5) list.push(loc('Your cookies bring all the boys to the yard.'), loc('Your cookies now have their own website!'));
            else if (loreProgress <= 6) list.push(loc('Your cookies are worth a lot of money.'), loc('Your cookies sell very well in distant countries.'));
            else if (loreProgress <= 7)
                list.push(
                    loc('People come from very far away to get a taste of your cookies.'),
                    loc('Kings and queens from all over the world are enjoying your cookies.')
                );
            else if (loreProgress <= 8)
                list.push(loc('There are now museums dedicated to your cookies.'), loc('A national day has been created in honor of your cookies.'));
            else if (loreProgress <= 9)
                list.push(
                    loc('Your cookies have been named a part of the world wonders.'),
                    loc('History books now include a whole chapter about your cookies.')
                );
            else if (loreProgress <= 10)
                list.push(loc('Your cookies have been placed under government surveillance.'), loc('The whole planet is enjoying your cookies!'));
            else if (loreProgress <= 11)
                list.push(
                    loc('Strange creatures from neighboring planets wish to try your cookies.'),
                    loc('Elder gods from the whole cosmos have awoken to taste your cookies.')
                );
            else if (loreProgress <= 12)
                list.push(
                    loc('Beings from other dimensions lapse into existence just to get a taste of your cookies.'),
                    loc('Your cookies have achieved sentience.')
                );
            else if (loreProgress <= 13)
                list.push(
                    loc('The universe has now turned into cookie dough, to the molecular level.'),
                    loc('Your cookies are rewriting the fundamental laws of the universe.')
                );
            else if (loreProgress <= 14)
                list.push(
                    loc('A local news station runs a 10-minute segment about your cookies. Success!<br><small>(you win a cookie)</small>'),
                    loc('it\'s time to stop playing')
                );
        }

        if (Game.elderWrath > 0 && ((Game.pledges == 0 && Game.resets == 0 && Math.random() < 0.3) || Math.random() < 0.03)) {
            list = [];
            if (Game.elderWrath == 1)
                list.push(
                    EN
                        ? choose([
                            'News : millions of old ladies reported missing!',
                            'News : processions of old ladies sighted around cookie facilities!',
                            'News : families around the continent report agitated, transfixed grandmothers!',
                            'News : doctors swarmed by cases of old women with glassy eyes and a foamy mouth!',
                            'News : nurses report "strange scent of cookie dough" around female elderly patients!'
                        ])
                        : NEWS + choose(loc('Ticker (grandma invasion start)'))
                );
            if (Game.elderWrath == 2)
                list.push(
                    EN
                        ? choose([
                            'News : town in disarray as strange old ladies break into homes to abduct infants and baking utensils!',
                            'News : sightings of old ladies with glowing eyes terrify local population!',
                            'News : retirement homes report "female residents slowly congealing in their seats"!',
                            'News : whole continent undergoing mass exodus of old ladies!',
                            'News : old women freeze in place in streets, ooze warm sugary syrup!'
                        ])
                        : NEWS + choose(loc('Ticker (grandma invasion rise)'))
                );
            if (Game.elderWrath == 3)
                list.push(
                    EN
                        ? choose([
                            'News : large "flesh highways" scar continent, stretch between various cookie facilities!',
                            'News : wrinkled "flesh tendrils" visible from space!',
                            'News : remains of "old ladies" found frozen in the middle of growing fleshy structures!',
                            'News : all hope lost as writhing mass of flesh and dough engulfs whole city!',
                            'News : nightmare continues as wrinkled acres of flesh expand at alarming speeds!'
                        ])
                        : NEWS + choose(loc('Ticker (grandma invasion full)'))
                );
        }

        if (EN && Game.season == 'fools') {
            list = [];

            if (Game.cookiesEarned >= 1000)
                list.push(
                    choose([
                        choose([
                            'Your office chair is really comfortable.',
                            'Profit\'s in the air!',
                            'Business meetings are such a joy!',
                            'What a great view from your office!',
                            'Smell that? That\'s capitalism, baby!',
                            'You truly love answering emails.',
                            'Working hard, or hardly working?',
                            'Another day in paradise!',
                            'Expensive lunch time!',
                            'Another government bailout coming up! Splendid!',
                            'These profits are doing wonderful things for your skin.',
                            'You daydream for a moment about a world without taxes.',
                            'You\'ll worry about environmental damage when you\'re dead!',
                            'Yay, office supplies!',
                            'Sweet, those new staplers just came in!',
                            'Ohh, coffee break!'
                        ]),
                        choose([
                            'You\'ve spent the whole day',
                            'Another great day',
                            'First order of business today:',
                            'Why, you truly enjoy',
                            'What next? That\'s right,',
                            'You check what\'s next on the agenda. Oh boy,'
                        ]) +
                            ' ' +
                            choose([
                                'signing contracts',
                                'filling out forms',
                                'touching base with the team',
                                'examining exciting new prospects',
                                'playing with your desk toys',
                                'getting new nameplates done',
                                'attending seminars',
                                'videoconferencing',
                                'hiring dynamic young executives',
                                'meeting new investors',
                                'updating your rolodex',
                                'pumping up those numbers',
                                'punching in some numbers',
                                'getting investigated for workers\' rights violations',
                                'reorganizing documents',
                                'belittling underlings',
                                'reviewing employee performance',
                                'revising company policies',
                                'downsizing',
                                'pulling yourself up by your bootstraps',
                                'adjusting your tie',
                                'performing totally normal human activities',
                                'recentering yourself in the scream room',
                                'immanentizing the eschaton',
                                'shredding some sensitive documents',
                                'comparing business cards',
                                'pondering the meaning of your existence',
                                'listening to the roaring emptiness inside your soul',
                                'playing minigolf in your office'
                            ]) +
                            '!',
                        'The word of the day is: ' +
                            choose([
                                'viral',
                                'search engine optimization',
                                'blags and wobsites',
                                'social networks',
                                'webinette',
                                'staycation',
                                'user experience',
                                'crowdfunding',
                                'carbon neutral',
                                'big data',
                                'machine learning',
                                'disrupting',
                                'influencers',
                                'monoconsensual transactions',
                                'sustainable',
                                'freemium',
                                'incentives',
                                'grassroots',
                                'web 3.0' /* this was before this whole crypto mess i'm so sorry */,
                                'logistics',
                                'leveraging',
                                'branding',
                                'proactive',
                                'synergizing',
                                'market research',
                                'demographics',
                                'pie charts',
                                'blogular',
                                'blogulacious',
                                'blogastic',
                                'authenticity',
                                'plastics',
                                'electronic mail',
                                'cellular phones',
                                'rap music',
                                'bulbs',
                                'goblinization',
                                'straight-to-bakery',
                                'microbakeries',
                                'chocolativity',
                                'flavorfulness',
                                'tastyfication',
                                'sugar offsets',
                                'activated wheat',
                                'reification',
                                'immanentize the eschaton',
                                'cookies, I guess'
                            ]) +
                            '.'
                    ])
                );
            if (Game.cookiesEarned >= 1000 && Math.random() < 0.05)
                list.push(
                    choose([
                        'If you could get some more cookies baked, that\'d be great.',
                        'So. About those TPS reports.',
                        'Hmm, you\'ve got some video tapes to return.',
                        'They\'ll pay. They\'ll all pay.',
                        'You haven\'t even begun to peak.',
                        'There is an idea of a ' +
                            Game.bakeryName +
                            '. Some kind of abstraction. But there is no real you, only an entity. Something illusory.',
                        'This was a terrible idea!'
                    ])
                );

            if (Game.TickerN % 2 == 0) {
                if (Game.Objects['Grandma'].amount > 0) list.push(choose(['Your rolling pins are rolling and pinning!', 'Production is steady!']));

                if (Game.Objects['Grandma'].amount > 0)
                    list.push(choose(['Your ovens are diligently baking more and more cookies.', 'Your ovens burn a whole batch. Ah well! Still good.']));

                if (Game.Objects['Farm'].amount > 0)
                    list.push(choose(['Scores of cookies come out of your kitchens.', 'Today, new recruits are joining your kitchens!']));

                if (Game.Objects['Factory'].amount > 0)
                    list.push(
                        choose([
                            'Your factories are producing an unending stream of baked goods.',
                            'Your factory workers decide to go on strike!',
                            'It\'s safety inspection day in your factories.'
                        ])
                    );

                if (Game.Objects['Mine'].amount > 0)
                    list.push(
                        choose(['Your secret recipes are kept safely inside a giant underground vault.', 'Your chefs are working on new secret recipes!'])
                    );

                if (Game.Objects['Shipment'].amount > 0)
                    list.push(choose(['Your supermarkets are bustling with happy, hungry customers.', 'Your supermarkets are full of cookie merch!']));

                if (Game.Objects['Alchemy lab'].amount > 0)
                    list.push(
                        choose([
                            'It\'s a new trading day at the stock exchange, and traders can\'t get enough of your shares!',
                            'Your stock is doubling in value by the minute!'
                        ])
                    );

                if (Game.Objects['Portal'].amount > 0)
                    list.push(choose(['You just released a new TV show episode!', 'Your cookie-themed TV show is being adapted into a new movie!']));

                if (Game.Objects['Time machine'].amount > 0)
                    list.push(
                        choose([
                            'Your theme parks are doing well - puddles of vomit and roller-coaster casualties are being swept under the rug!',
                            'Visitors are stuffing themselves with cookies before riding your roller-coasters. You might want to hire more clean-up crews.'
                        ])
                    );

                if (Game.Objects['Antimatter condenser'].amount > 0)
                    list.push(
                        choose(['Cookiecoin is officially the most mined digital currency in the history of mankind!', 'Cookiecoin piracy is rampant!'])
                    );

                if (Game.Objects['Prism'].amount > 0)
                    list.push(
                        choose([
                            'Your corporate nations just gained a new parliament!',
                            'You\'ve just annexed a new nation!',
                            'A new nation joins the grand cookie conglomerate!'
                        ])
                    );

                if (Game.Objects['Chancemaker'].amount > 0)
                    list.push(
                        choose([
                            'Your intergalactic federation of cookie-sponsored planets reports record-breaking profits!',
                            'Billions of unwashed aliens are pleased to join your workforce as you annex their planet!',
                            'New toll opened on interstellar highway, funnelling more profits into the cookie economy!'
                        ])
                    );

                if (Game.Objects['Fractal engine'].amount > 0)
                    list.push(
                        choose([
                            'Your cookie-based political party is doing fantastic in the polls!',
                            'New pro-cookie law passes without a hitch thanks to your firm grasp of the political ecosystem!',
                            'Your appointed senators are overturning cookie bans left and right!'
                        ])
                    );

                if (Game.Objects['Javascript console'].amount > 0)
                    list.push(
                        choose([
                            'Cookies are now one of the defining aspects of mankind! Congratulations!',
                            'Time travelers report that this era will later come to be known, thanks to you, as the cookie millennium!',
                            'Cookies now deeply rooted in human culture, likely puzzling future historians!'
                        ])
                    );

                if (Game.Objects['Idleverse'].amount > 0)
                    list.push(
                        choose([
                            'Public aghast as all remaining aspects of their lives overtaken by universal cookie industry!',
                            'Every single product currently sold in the observable universe can be traced back to your company! And that\'s a good thing.',
                            'Antitrust laws let out a helpless whimper before being engulfed by your sprawling empire!'
                        ])
                    );

                if (Game.Objects['Cortex baker'].amount > 0)
                    list.push(
                        choose([
                            'Bold new law proposal would grant default ownership of every new idea by anyone anywhere to ' + Game.bakeryName + '\'s bakery!',
                            'Bakery think tanks accidentally reinvent cookies for the 57th time this week!',
                            'Bakery think tanks invent entire new form of human communication to advertise and boost cookie sales!'
                        ])
                    );
            }

            if (loreProgress <= 0) list.push('Such a grand day to begin a new business.');
            else if (loreProgress <= 1) list.push('You\'re baking up a storm!');
            else if (loreProgress <= 2) list.push('You are confident that one day, your cookie company will be the greatest on the market!');
            else if (loreProgress <= 3) list.push('Business is picking up!');
            else if (loreProgress <= 4) list.push('You\'re making sales left and right!');
            else if (loreProgress <= 5) list.push('Everyone wants to buy your cookies!');
            else if (loreProgress <= 6) list.push('You are now spending most of your day signing contracts!');
            else if (loreProgress <= 7) list.push('You\'ve been elected "business tycoon of the year"!');
            else if (loreProgress <= 8) list.push('Your cookies are a worldwide sensation! Well done, old chap!');
            else if (loreProgress <= 9)
                list.push('Your brand has made its way into popular culture. Children recite your slogans and adults reminisce them fondly!');
            else if (loreProgress <= 10) list.push('A business day like any other. It\'s good to be at the top!');
            else if (loreProgress <= 11)
                list.push('You look back on your career. It\'s been a fascinating journey, building your baking empire from the ground up.');
        }

        //! see moddingapi.disabled.js
        //! for (let i = 0; i < Game.modHooks['ticker'].length; i++) {
        //!     let arr = Game.modHooks['ticker'][i]();
        //!     if (arr) list = list.concat(arr);
        //! }

        Game.TickerEffect = 0;

        if (!manual && Game.T > Game.fps * 10 && Game.Has('Fortune cookies') && Math.random() < (Game.HasAchiev('O Fortuna') ? 0.04 : 0.02)) {
            const fortunes = [];
            for (let i in Game.Tiers['fortune'].upgrades) {
                let it = Game.Tiers['fortune'].upgrades[Number(i)];
                if (!Game.HasUnlocked(it.name)) fortunes.push(it);
            }

            if (!Game.fortuneGC) fortunes.push('fortuneGC');
            if (!Game.fortuneCPS) fortunes.push('fortuneCPS');

            if (fortunes.length > 0) {
                list = [];
                let me = choose(fortunes);
                Game.TickerEffect = { type: 'fortune', sub: me };

                if (me === 'fortuneGC') me = String(loc('Today is your lucky day!'));
                else if (me === 'fortuneCPS') {
                    Math.seedrandom(Game.seed + '-fortune');
                    me =
                            loc('Your lucky numbers are:') +
                            ' ' +
                            Math.floor(Math.random() * 100) +
                            ' ' +
                            Math.floor(Math.random() * 100) +
                            ' ' +
                            Math.floor(Math.random() * 100) +
                            ' ' +
                            Math.floor(Math.random() * 100);
                    Math.seedrandom();
                } else {
                    // this is so bad..........
                    const meAsUp = /** @type {Upgrade} */ (me);
                    if (EN) {
                        me = meAsUp.dname.slice(Math.max(0, meAsUp.name.indexOf('#'))) + ' : '
                            + meAsUp.baseDesc.slice(Math.max(0, meAsUp.baseDesc.indexOf('<q>') + 3));
                        me = me.slice(0, Math.max(0, me.length - 4));
                    } else if (meAsUp.buildingTie)
                        me = meAsUp.dname +
                                ' : ' +
                                loc(
                                    choose([
                                        'Never forget your %1.',
                                        'Pay close attention to the humble %1.',
                                        'You\'ve been neglecting your %1.',
                                        'Remember to visit your %1 sometimes.'
                                    ]),
                                    meAsUp.buildingTie.single
                                );
                    else
                        me = meAsUp.dname +
                                ' : ' +
                                loc(
                                    choose([
                                        'You don\'t know what you have until you\'ve lost it.',
                                        'Remember to take breaks.',
                                        'Hey, what\'s up. I\'m a fortune cookie.',
                                        'You think you have it bad? Look at me.'
                                    ])
                                );
                }
                me =
                        '<span class="fortune"><div class="icon" style="vertical-align:middle;display:inline-block;background-position:' +
                        -29 * 48 +
                        'px ' +
                        -8 * 48 +
                        'px;transform:scale(0.5);margin:-16px;position:relative;left:-4px;top:-2px;"></div>' +
                        me +
                        '</span>';
                list = [me];
            }
        }

        if (Game.windowW < Game.tickerTooNarrow) list = ['<div style="transform:scale(0.8,1.2);">' + NEWS + (EN ? 'help!' : loc('help me!')) + '</div>'];

        Game.TickerAge = Game.fps * 10;
        // @ts-expect-error unsure
        Game.Ticker = choose(list);
        Game.AddToLog(Game.Ticker);
        Game.TickerN++;
        Game.TickerDraw();
    }
    static tickerL = $('commentsText1', true);
    static tickerBelowL = $('commentsText2', true);
    static tickerTooNarrow = 900;
    static TickerDraw() {
        let str = '';
        if (Game.Ticker != '') str = Game.Ticker;
        Game.tickerBelowL.innerHTML = Game.tickerL.innerHTML;
        Game.tickerL.innerHTML = str;

        Game.tickerBelowL.className = 'commentsText';
        void Game.tickerBelowL.offsetWidth;
        Game.tickerBelowL.className = 'commentsText risingAway';
        Game.tickerL.className = 'commentsText';
        void Game.tickerL.offsetWidth;
        Game.tickerL.className = 'commentsText risingUp';
    }

    /**
     * @type {any[]}
     */
    static Log = [];
    /**
     * @param {string} what
     */
    static AddToLog(what) {
        Game.Log.unshift(what);
        if (Game.Log.length > 100) Game.Log.pop();
    }

    static vanilla = 1;
    /* =====================================================================================
        BUILDINGS
        =======================================================================================*/
    /** @type {any} */
    static last = 0; // this will be an ACTUAL nightmare wtf is this

    static storeToRefresh = 1;
    static priceIncrease = 1.15;
    static buyBulk = 1;
    static buyMode = 1; // 1 for buy, -1 for sell
    static buyBulkOld = Game.buyBulk; // used to undo changes from holding Shift or Ctrl
    static buyBulkShortcut = 0; // are we pressing Shift or Ctrl?

    /** @type {Record<string, CookieObject>} */
    static Objects = {};
    /** @type {CookieObject[]} */
    static ObjectsById = [];
    static ObjectsN = 0;
    static BuildingsOwned = 0;
    static Object = CookieObject;

    static DrawBuildings() // draw building displays with canvas
    {
        if (Game.drawT % 3 == 0) {
            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                if (me.id > 0 && !me.onMinigame && !me.muted) me.draw();
                else me.pics = [];
            }
        }
    }

    /**
     * @param {{ z: number; }} a
     * @param {{ z: number; }} b
     */
    static sortSprites(a, b) {
        if (a.z > b.z) return 1;
        else if (a.z < b.z) return -1;
        else return 0;
    }
    /**
     * @param {{ id: number; }} a
     * @param {{ id: number; }} b
     */
    static sortSpritesById(a, b) {
        if (a.id > b.id) return 1;
        else if (a.id < b.id) return -1;
        else return 0;
    }

    /**
     * @param {any} building
     * @param {number} price
     */
    static modifyBuildingPrice(building, price) {
        if (Game.Has('Season savings')) price *= 0.99;
        if (Game.Has('Santa\'s dominion')) price *= 0.99;
        if (Game.Has('Faberge egg')) price *= 0.99;
        if (Game.Has('Divine discount')) price *= 0.99;
        if (Game.Has('Fortune #100')) price *= 0.99;
        price *= 1 - Game.auraMult('Fierce Hoarder') * 0.02;
        if (Game.hasBuff('Everything must go')) price *= 0.95;
        if (Game.hasBuff('Crafty pixies')) price *= 0.98;
        if (Game.hasBuff('Nasty goblins')) price *= 1.02;
        if (building.fortune && Game.Has(building.fortune.name)) price *= 0.93;
        price *= Game.eff('buildingCost');
        if (Game.hasGod) {
            let godLvl = Game.hasGod('creation');
            if (godLvl == 1) price *= 0.93;
            else if (godLvl == 2) price *= 0.95;
            else if (godLvl == 3) price *= 0.98;
        }
        return price;
    }

    /**
     * @param {number} id
     */
    static storeBulkButton(id) {
        if (id == 0) Game.buyMode = 1;
        else if (id == 1) Game.buyMode = -1;
        else if (id == 2) Game.buyBulk = 1;
        else if (id == 3) Game.buyBulk = 10;
        else if (id == 4) Game.buyBulk = 100;
        else if (id == 5) Game.buyBulk = -1;

        if (Game.buyMode === 1 && Game.buyBulk === -1) Game.buyBulk = 100;

        if (Game.buyMode === 1) $('storeBulkBuy', true).className = 'storePreButton storeBulkMode selected';
        else $('storeBulkBuy', true).className = 'storePreButton storeBulkMode';
        if (Game.buyMode === -1) $('storeBulkSell', true).className = 'storePreButton storeBulkMode selected';
        else $('storeBulkSell', true).className = 'storePreButton storeBulkMode';

        if (Game.buyBulk === 1) $('storeBulk1', true).className = 'storePreButton storeBulkAmount selected';
        else $('storeBulk1', true).className = 'storePreButton storeBulkAmount';
        if (Game.buyBulk === 10) $('storeBulk10', true).className = 'storePreButton storeBulkAmount selected';
        else $('storeBulk10', true).className = 'storePreButton storeBulkAmount';
        if (Game.buyBulk === 100) $('storeBulk100', true).className = 'storePreButton storeBulkAmount selected';
        else $('storeBulk100', true).className = 'storePreButton storeBulkAmount';
        if (Game.buyBulk === -1) $('storeBulkMax', true).className = 'storePreButton storeBulkAmount selected';
        else $('storeBulkMax', true).className = 'storePreButton storeBulkAmount';

        if (Game.buyMode === 1) {
            $('storeBulkMax', true).style.visibility = 'hidden';
            $('products', true).className = 'storeSection';
        } else {
            $('storeBulkMax', true).style.visibility = 'visible';
            $('products', true).className = 'storeSection selling';
        }

        Game.storeToRefresh = 1;
        if (id !== -1) PlaySound('snd/tick.mp3');
    }
    static BuildStore() // create the DOM for the store's buildings
    {
        let str = '';
        str +=
                '<div id="storeBulk" class="storePre" ' +
                Game.getTooltip(
                    '<div style="padding:8px;min-width:200px;text-align:center;font-size:11px;" id="tooltipStoreBulk">' +
                    loc('You can also press %1 to bulk-buy or sell %2 of a building at a time, or %3 for %4.', [
                        '<b>' + loc('Ctrl') + '</b>',
                        '<b>10</b>',
                        '<b>' + loc('Shift') + '</b>',
                        '<b>100</b>'
                    ]) +
                    '</div>',
                    'store'
                ) +
                '>' +
                '<div id="storeBulkBuy" class="storePreButton storeBulkMode" ' +
                Game.clickStr +
                '="Game.storeBulkButton(0);">' +
                loc('Buy') +
                '</div>' +
                '<div id="storeBulkSell" class="storePreButton storeBulkMode" ' +
                Game.clickStr +
                '="Game.storeBulkButton(1);">' +
                loc('Sell') +
                '</div>' +
                '<div id="storeBulk1" class="storePreButton storeBulkAmount" ' +
                Game.clickStr +
                '="Game.storeBulkButton(2);">1</div>' +
                '<div id="storeBulk10" class="storePreButton storeBulkAmount" ' +
                Game.clickStr +
                '="Game.storeBulkButton(3);">10</div>' +
                '<div id="storeBulk100" class="storePreButton storeBulkAmount" ' +
                Game.clickStr +
                '="Game.storeBulkButton(4);">100</div>' +
                '<div id="storeBulkMax" class="storePreButton storeBulkAmount" ' +
                Game.clickStr +
                '="Game.storeBulkButton(5);">' +
                loc('all') +
                '</div>' +
                '</div>';
        for (let i in Game.Objects) {
            let me = Game.Objects[i];
            str +=
                    (Game.prefs.screenreader ? '<button aria-labelledby="ariaReader-product-' + me.id + '"' : '<div') +
                    ' class="product toggledOff" ' +
                    Game.getDynamicTooltip('Game.ObjectsById[' + me.id + '].tooltip', 'store') +
                    ' id="product' +
                    me.id +
                    '"><div class="icon off" id="productIconOff' +
                    me.id +
                    '" style=""></div><div class="icon" id="productIcon' +
                    me.id +
                    '" style=""></div><div class="content"><div class="lockedTitle">???</div><div class="title productName" id="productName' +
                    me.id +
                    '"></div><span class="priceMult" id="productPriceMult' +
                    me.id +
                    '"></span><span class="price" id="productPrice' +
                    me.id +
                    '"></span><div class="title owned" id="productOwned' +
                    me.id +
                    '"></div>' +
                    (Game.prefs.screenreader ? '<label class="srOnly" style="width:64px;left:-64px;" id="ariaReader-product-' + me.id + '"></label>' : '') +
                    '</div>' +
                    (Game.prefs.screenreader ? '</button>' : '</div>');
        }
        $('products', true).innerHTML = str;

        Game.storeBulkButton(-1);

        for (let i in Game.Objects) {
            let me = Game.Objects[i];
            me.l = $('product' + me.id, true);

            // these are a bit messy but ah well
            if (!Game.touchEvents) {
                me.l.addEventListener(
                    'click',
                    (function (what) {
                        return function (/** @type {{ preventDefault: () => void; }} */ e) {
                            Game.ClickProduct(what);
                            e.preventDefault();
                        };
                    })(me.id)
                );
            } else {
                me.l.addEventListener(
                    'touchend',
                    (function (what) {
                        return function (/** @type {{ preventDefault: () => void; }} */ e) {
                            Game.ClickProduct(what);
                            e.preventDefault();
                        };
                    })(me.id)
                );
            }
        }
    }

    /**
     * @param {number} what
     */
    static ClickProduct(what) {
        Game.ObjectsById[what].buy();
    }

    static RefreshStore() // refresh the store's buildings
    {
        for (let i in Game.Objects) Game.Objects[i].refresh();
        Game.storeToRefresh = 0;
    }

    /**
     * @param {number} base
     * @param {number} mult
     * @param {number} bonus
     */
    static ComputeCps(base, mult, bonus) {
        if (!bonus) bonus = 0;
        return base * Math.pow(2, mult) + bonus;
    }

    /**
     * @param {CookieObject} me
     */
    static isMinigameReady(me) {
        return me.minigameUrl && me.minigameLoaded && me.level > 0;
    }
    /**
     * @type {{ [x: string]: CookieObject; }}
     */
    static scriptBindings = {};
    static showedScriptLoadError = false;
    static LoadMinigames() // load scripts for each minigame
    {
        for (let i in Game.Objects) {
            const me = Game.Objects[i];
            if (me.minigameUrl && me.level > 0 && !me.minigameLoaded && !me.minigameLoading && !$('minigameScript-' + me.id)) {
                me.minigameLoading = true;
                // we're only loading the minigame scripts that aren't loaded yet and which have enough building level
                // we call this function on building level up and on load
                console.log('Loading script '+me.minigameUrl+'...');
                setTimeout(
                    () => {
                        const script = document.createElement('script');
                        script.id = 'minigameScript-' + me.id;
                        Game.scriptBindings['minigameScript-' + me.id] = me;
                        script.setAttribute('src', me.minigameUrl + '?r=' + Game.version);
                        script.addEventListener('load', () => {
                            if (!me.minigameLoaded) Game.scriptLoaded(me, `minigameScript-${me.id}`);
                        });
                        script.addEventListener('error', () => {
                            me.minigameLoading = false;
                            if (!me.minigameLoaded && !Game.showedScriptLoadError) {
                                Game.showedScriptLoadError = true;
                                Game.Notify(loc('Error!'), 'Couldn\'t load minigames. Try reloading.');
                            }
                        });
                        document.head.appendChild(script);
                    },
                    10
                );
            }
        }
    }
    /**
     * @param {CookieObject} who
     * @param {string} script
     */
    static scriptLoaded(who, script) {
        who.minigameLoading = false;
        who.minigameLoaded = true;
        who.refresh();
        ASSERT_NOT_NULL(who.minigame).launch();
        if (who.minigameSave) {
            ASSERT_NOT_NULL(who.minigame).reset(true);
            ASSERT_NOT_NULL(who.minigame).load(who.minigameSave);
            who.minigameSave = 0;
        }
    }

    /**
     * @param {string} what
     */
    static magicCpS(what) {
        return 1;
    }

    static foolObjects = {
        Unknown: {
            name: 'Investment',
            desc: 'You\'re not sure what this does, you just know it means profit.',
            icon: 0
        },
        Cursor: {
            name: 'Rolling pin',
            desc: 'Essential in flattening dough. The first step in cookie-making.',
            icon: 0
        },
        Grandma: {
            name: 'Oven',
            desc: 'A crucial element of baking cookies.',
            icon: 1
        },
        Farm: {
            name: 'Kitchen',
            desc: 'The more kitchens, the more cookies your employees can produce.',
            icon: 2
        },
        Mine: {
            name: 'Secret recipe',
            desc: 'These give you the edge you need to outsell those pesky competitors.',
            icon: 3
        },
        Factory: {
            name: 'Factory',
            desc: 'Mass production is the future of baking. Seize the day, and synergize!',
            icon: 4
        },
        Bank: {
            name: 'Investor',
            desc: 'Business folks with a nose for profit, ready to finance your venture as long as there\'s money to be made.',
            icon: 5
        },
        Temple: {
            name: 'Like',
            desc: 'Your social media page is going viral! Amassing likes is the key to a lasting online presence and juicy advertising deals.',
            icon: 9
        },
        'Wizard tower': {
            name: 'Meme',
            desc: 'Cookie memes are all the rage! With just the right amount of social media astroturfing, your brand image will be all over the cyberspace.',
            icon: 6
        },
        Shipment: {
            name: 'Supermarket',
            desc: 'A gigantic cookie emporium - your very own retail chain.',
            icon: 7
        },
        'Alchemy lab': {
            name: 'Stock share',
            desc: 'You\'re officially on the stock market, and everyone wants a piece!',
            icon: 8
        },
        Portal: {
            name: 'TV show',
            desc: 'Your cookies have their own sitcom! Hilarious baking hijinks set to the cheesiest laughtrack.',
            icon: 10
        },
        'Time machine': {
            name: 'Theme park',
            desc: 'Cookie theme parks, full of mascots and roller-coasters. Build one, build a hundred!',
            icon: 11
        },
        'Antimatter condenser': {
            name: 'Cookiecoin',
            desc: 'A virtual currency, already replacing regular money in some small countries.',
            icon: 12
        },
        Prism: {
            name: 'Corporate country',
            desc: 'You\'ve made it to the top, and you can now buy entire nations to further your corporate greed. Godspeed.',
            icon: 13
        },
        Chancemaker: {
            name: 'Privatized planet',
            desc: 'Actually, you know what\'s cool? A whole planet dedicated to producing, advertising, selling, and consuming your cookies.',
            icon: 15
        },
        'Fractal engine': {
            name: 'Senate seat',
            desc: 'Only through political dominion can you truly alter this world to create a brighter, more cookie-friendly future.',
            icon: 16
        },
        'Javascript console': {
            name: 'Doctrine',
            desc: 'Taking many forms -religion, culture, philosophy- a doctrine may, when handled properly, cause a lasting impact on civilizations, reshaping minds and people and ensuring all future generations share a singular goal - the production, and acquisition, of more cookies.',
            icon: 17
        },
        Idleverse: {
            name: 'Lateral expansions',
            desc: 'Sometimes the best way to keep going up is sideways. Diversify your ventures through non-cookie investments.',
            icon: 18
        },
        'Cortex baker': {
            name: 'Think tank',
            desc: 'There\'s only so many ways you can bring in more profit. Or is there? Hire the most brilliant experts in the known universe and let them scrape their brains for you!',
            icon: 19
        }
    };

    /**
     * @param {string | number} id
     */
    static mutedBuildingTooltip(id) {
        return function () {
            let me = Game.ObjectsById[Number(id)];
            return (
                '<div style="width:150px;text-align:center;font-size:11px;" id="tooltipMutedBuilding">' +
                    (EN
                        ? '<b>' +
                        cap(me.plural) +
                        (me.level > 0 ? ' (lvl.&nbsp;' + me.level + ')' : '') +
                        '</b><div class="line"></div>Click to unmute ' +
                        me.plural +
                        '<br>(display this building)'
                        : '<b>' + loc('Level %1 %2', [Beautify(me.level), me.plural]) + '</b><div class="line"></div>' + loc('Click to unmute')) +
                    '</div>'
            );
        };
    }

    /* =====================================================================================
        UPGRADES
        =======================================================================================*/
    static upgradesToRebuild = 1;
    /** @type {Record<string, Upgrade>} */
    static Upgrades = {};
    /** @type {Record<number, Upgrade>} */
    static UpgradesById = {};
    static UpgradesN = 0;
    /**
     * @type {Upgrade[]}
     */
    static UpgradesInStore = [];
    static UpgradesOwned = 0;
    static Upgrade = Upgrade;

    static storeBuyAll() {
        if (!Game.Has('Inspired checklist')) return false;
        for (let i in Game.UpgradesInStore) {
            let me = Game.UpgradesInStore[i];
            if (!me.isVaulted() && me.pool != 'toggle' && me.pool != 'tech') me.buy(true);
        }
        return true;
    }

    /**
     * @type {number[]}
     */
    static vault = [];

    /**
     * @param {string} pool
     */
    static CountsAsUpgradeOwned(pool) {
        return pool == '' || pool == 'cookie' || pool == 'tech' ? true : false;
    }

    /**
     * @param {{ clickFunction: () => boolean; id: string; }} upgrade
     * @param {string} prompt
     */
    static RequiresConfirmation(upgrade, prompt) {
        upgrade.clickFunction = function () {
            Game.Prompt('<id RequiresConfirmation>' + prompt, [
                [loc('Yes'), 'Game.UpgradesById[' + upgrade.id + '].buy(1);Game.ClosePrompt();'],
                loc('No')
            ]);
            return false;
        };
    }

    /**
     * @param {string | string[]} what
     */
    static Unlock(what) {
        if (typeof what === 'string') {
            if (Game.Upgrades[what]?.unlocked == 0) {
                Game.Upgrades[what].unlocked = 1;
                Game.upgradesToRebuild = 1;
                Game.recalculateGains = 1;
            }
        } else {
            for (let i in what) Game.Unlock(what[i]);
        }
    }
    /**
     * @param {string | Record<string, any>} what
     */
    static Lock(what) {
        if (typeof what === 'string') {
            if (Game.Upgrades[what]) {
                Game.Upgrades[what].unlocked = 0;
                Game.upgradesToRebuild = 1;
                if (Game.Upgrades[what].bought == 1 && Game.CountsAsUpgradeOwned(Game.Upgrades[what].pool)) Game.UpgradesOwned--;
                Game.Upgrades[what].bought = 0;
                Game.recalculateGains = 1;
            }
        } else {
            for (let i in what) {
                Game.Lock(what[i]);
            }
        }
    }

    /**
     * @param {string} what
     */
    static Has(what) {
        let it = Game.Upgrades[what];
        if (it && Game.ascensionMode == 1 && (it.pool == 'prestige' || it.tier == 'fortune')) return 0;
        return it ? it.bought : 0;
    }
    /**
     * @param {string} what
     */
    static HasUnlocked(what) {
        return Game.Upgrades[what] ? Game.Upgrades[what].unlocked : 0;
    }

    static RebuildUpgrades() // recalculate the upgrades you can buy
    {
        Game.upgradesToRebuild = 0;
        let list = [];
        for (let i in Game.Upgrades) {
            let me = Game.Upgrades[i];
            if (
                !me.bought &&
                    me.pool != 'debug' &&
                    me.pool != 'prestige' &&
                    me.pool != 'prestigeDecor' &&
                    (Game.ascensionMode != 1 || (!me.lasting && me.tier != 'fortune'))
            ) {
                if (me.unlocked) list.push(me);
            } else if (me.displayFuncWhenOwned && me.bought) list.push(me);
        }
        let sortMap = function (/** @type {{ pool: string; order: any; getPrice: () => any; }} */ a, /** @type {{ pool: string; order: any; getPrice: () => any; }} */ b) {
            let ap = a.pool == 'toggle' ? a.order : a.getPrice();
            let bp = b.pool == 'toggle' ? b.order : b.getPrice();
            if (ap > bp) return 1;
            else if (ap < bp) return -1;
            else return 0;
        };
        list.sort(sortMap);

        Game.UpgradesInStore = [];
        for (let i in list) {
            Game.UpgradesInStore.push(list[i]);
        }
        let storeStr = '';
        let toggleStr = '';
        let techStr = '';
        let vaultStr = '';

        if (Game.Has('Inspired checklist')) {
            storeStr +=
                    '<div id="storeBuyAll" class="storePre" ' +
                    Game.getTooltip(
                        '<div style="padding:8px;min-width:250px;text-align:center;font-size:11px;" id="tooltipStorePre">' +
                        loc(
                            'Will <b>instantly purchase</b> every upgrade you can afford, starting from the cheapest one.<br>Upgrades in the <b>vault</b> will not be auto-purchased.<br>You may place an upgrade into the vault by <b>Shift-clicking</b> on it.'
                        ) +
                        '</div>',
                        'store'
                    ) +
                    '>' +
                    '<div id="storeBuyAllButton" class="storePreButton" ' +
                    Game.clickStr +
                    '="Game.storeBuyAll();">' +
                    loc('Buy all upgrades') +
                    '</div>' +
                    '</div>';
            $('upgrades', true).classList.add('hasMenu');
        }
        else $('upgrades', true).classList.remove('hasMenu');

        for (let i in Game.UpgradesInStore) {
            let me = Game.UpgradesInStore[i];
            let str = Game.crate(me, 'store', 'Game.UpgradesById[' + me.id + '].click(event);', 'upgrade' + i);

            if (me.pool == 'toggle') toggleStr += str;
            else if (me.pool == 'tech') techStr += str;
            else {
                if (me.isVaulted() && Game.Has('Inspired checklist')) vaultStr += str;
                else storeStr += str;
            }
        }

        $('upgrades', true).innerHTML = storeStr;
        $('toggleUpgrades', true).innerHTML = toggleStr;
        if (toggleStr == '') $('toggleUpgrades', true).style.display = 'none';
        else $('toggleUpgrades', true).style.display = 'block';
        $('techUpgrades', true).innerHTML = techStr;
        if (techStr == '') $('techUpgrades', true).style.display = 'none';
        else $('techUpgrades', true).style.display = 'block';
        $('vaultUpgrades', true).innerHTML = vaultStr;
        if (vaultStr == '') $('vaultUpgrades', true).style.display = 'none';
        else $('vaultUpgrades', true).style.display = 'block';
    }

    /**
     * @type {{ cookies: number; name: any; require?: string; season?: string; }[]}
     */
    static UnlockAt = []; // this contains an array of every upgrade with a cookie requirement in the form of:
    // {cookies:(amount of cookies earned required),name:(name of upgrade or achievement to unlock)}
    // (and possibly require:(name of upgrade of achievement to own))
    // note : the cookie will not be added to the list if it contains locked:1 (use for seasonal cookies and such)

    /**
     * @param {{ name: any; desc: any; icon: any; power: any; price: any; require?: any; locked?: any; season?: any; }} obj
     */
    static NewUpgradeCookie(obj) {
        const upgrade = new Game.Upgrade(
            obj.name,
            getStrCookieProductionMultiplierPlus(Beautify(typeof obj.power === 'function' ? obj.power(obj) : obj.power, 1)) +
                (EN ? '<q>' + obj.desc + '</q>' : ''),
            obj.price,
            obj.icon
        );
        upgrade.power = obj.power;
        upgrade.pool = 'cookie';
        const toPush = {
            cookies: obj.price / 20,
            name: obj.name,
            require: obj.require || undefined,
            season: obj.season || undefined
        };
        if (!obj.locked) Game.UnlockAt.push(toPush);
        return upgrade;
    }

    static _Tiers = {
        1: {
            name: 'Plain',
            unlock: 1,
            achievUnlock: 1,
            iconRow: 0,
            color: '#ccb3ac',
            price: 10
        },
        2: {
            name: 'Berrylium',
            unlock: 5,
            achievUnlock: 50,
            iconRow: 1,
            color: '#ff89e7',
            price: 50
        },
        3: {
            name: 'Blueberrylium',
            unlock: 25,
            achievUnlock: 100,
            iconRow: 2,
            color: '#00deff',
            price: 500
        },
        4: {
            name: 'Chalcedhoney',
            unlock: 50,
            achievUnlock: 150,
            iconRow: 13,
            color: '#ffcc2f',
            price: 50000
        },
        5: {
            name: 'Buttergold',
            unlock: 100,
            achievUnlock: 200,
            iconRow: 14,
            color: '#e9d673',
            price: 5000000
        },
        6: {
            name: 'Sugarmuck',
            unlock: 150,
            achievUnlock: 250,
            iconRow: 15,
            color: '#a8bf91',
            price: 500000000
        },
        7: {
            name: 'Jetmint',
            unlock: 200,
            achievUnlock: 300,
            iconRow: 16,
            color: '#60ff50',
            price: 500000000000
        },
        8: {
            name: 'Cherrysilver',
            unlock: 250,
            achievUnlock: 350,
            iconRow: 17,
            color: '#f01700',
            price: 500000000000000
        },
        9: {
            name: 'Hazelrald',
            unlock: 300,
            achievUnlock: 400,
            iconRow: 18,
            color: '#9ab834',
            price: 500000000000000000
        },
        10: {
            name: 'Mooncandy',
            unlock: 350,
            achievUnlock: 450,
            iconRow: 19,
            color: '#7e7ab9',
            price: 500000000000000000000
        },
        11: {
            name: 'Astrofudge',
            unlock: 400,
            achievUnlock: 500,
            iconRow: 28,
            color: '#9a3316',
            price: 5000000000000000000000000
        },
        12: {
            name: 'Alabascream',
            unlock: 450,
            achievUnlock: 550,
            iconRow: 30,
            color: '#c1a88c',
            price: 50000000000000000000000000000
        },
        13: {
            name: 'Iridyum',
            unlock: 500,
            achievUnlock: 600,
            iconRow: 31,
            color: '#adb1b3',
            price: 500000000000000000000000000000000
        },
        14: {
            name: 'Glucosmium',
            unlock: 550,
            achievUnlock: 650,
            iconRow: 34,
            color: '#ff89e7',
            price: 5000000000000000000000000000000000000
        },
        synergy1: {
            name: 'Synergy I',
            unlock: 15,
            iconRow: 20,
            color: '#008595',
            special: 1,
            req: 'Synergies Vol. I',
            price: 200000
        },
        synergy2: {
            name: 'Synergy II',
            unlock: 75,
            iconRow: 29,
            color: '#008595',
            special: 1,
            req: 'Synergies Vol. II',
            price: 200000000000
        },
        fortune: {
            name: 'Fortune',
            unlock: -1,
            iconRow: 32,
            color: '#9ab834',
            special: 1,
            price: 77777777777777777777777777777
        }
    };
    // tiered upgrades system
    // each building has several upgrade tiers
    // all upgrades in the same tier have the same color, unlock threshold and price multiplier
    /** @type {{ [K in keyof typeof Game._Tiers]: typeof Game._Tiers[K] & { upgrades?: Upgrade[]; } }} */
    static Tiers = Game._Tiers;

    /**
     * @param {string} type
     * @param {number} tier
     */
    static GetIcon(type, tier) {
        let col = 0;
        col = type == 'Kitten' ? 18 : Game.Objects[type].iconColumn;
        return [col, Game.Tiers[/** @type {keyof typeof Game.Tiers} */ (tier)].iconRow];
    }
    /**
     * @param {string | number} building
     * @param {string | number} tier
     */
    static SetTier(building, tier) {
        if (!Game.Objects[building]) console.log('Warning: No building named', building);
        Game.last.tier = tier;
        Game.last.buildingTie = Game.Objects[building];
        if (Game.last.type == 'achievement') Game.Objects[building].tieredAchievs[tier] = Game.last;
        else Game.Objects[building].tieredUpgrades[tier] = Game.last;
    }
    /**
     * @param {{ tier: any; icon: any[]; }} upgrade
     * @param {keyof typeof Game.Tiers} tier
     * @param {number} col
     */
    static MakeTiered(upgrade, tier, col) {
        upgrade.tier = tier;
        if (col !== undefined) upgrade.icon = [col, Game.Tiers[tier].iconRow];
    }
    /**
     * @param {string} name
     * @param {string} desc
     * @param {string} building
     * @param {string | number} tier
     */
    static TieredUpgrade(name, desc, building, tier) {
        desc = tier == 'fortune' && building ? loc(
            '%1 are <b>%2%</b> more efficient and <b>%3%</b> cheaper.',
            [cap(Game.Objects[building].plural), 7, 7]
        ) + desc : loc('%1 are <b>twice</b> as efficient.', cap(Game.Objects[building].plural)) + desc;
        let upgrade = new Game.Upgrade(
            name, desc,
            Game.Objects[building].basePrice * Game.Tiers[/** @type {keyof typeof Game.Tiers} */ (tier)].price,
            // @ts-expect-error pls im tired
            Game.GetIcon(building, tier)
        );
        if (tier != 'fortune') {
            upgrade.descFunc = function () {
                return (
                    (
                        Game.ascensionMode != 1 &&
                        Game.Has(ASSERT_NOT_NULL(this.buildingTie1).unshackleUpgrade) &&
                        // @ts-expect-error this type is pain
                        Game.Has(Game.Tiers[/** @type {keyof typeof Game.Tiers} */ (this.tier)].unshackleUpgrade)
                            ? '<div style="text-align:center;">' +
                            loc(
                                'Unshackled! <b>+%1%</b> extra production.',
                                Math.round(
                                    (
                                        ASSERT_NOT_NULL(this.buildingTie).id == 1 
                                            ? 0.5
                                            : (20 - ASSERT_NOT_NULL(this.buildingTie).id)
                                        * 0.1
                                    ) * 100
                                )
                            ) +
                            '</div><div class="line"></div>'
                            : '') + this.ddesc
                );
            };
        }

        Game.SetTier(building, tier);
        if (!upgrade.buildingTie1 && building) upgrade.buildingTie1 = Game.Objects[building];
        if (tier == 'fortune' && building) Game.Objects[building].fortune = upgrade;
        return upgrade;
    }
    /**
     * @param {string} name
     * @param {string} desc
     * @param {string} building1
     * @param {string} building2
     * @param {string | number} tier
     */
    static SynergyUpgrade(name, desc, building1, building2, tier) {
        /*
                creates a new upgrade that :
                -unlocks when you have tier.unlock of building1 and building2
                -is priced at (building1.price*10+building2.price*1)*tier.price (formerly : Math.sqrt(building1.price*building2.price)*tier.price)
                -gives +(0.1*building1)% cps to building2 and +(5*building2)% cps to building1
                -if building2 is below building1 in worth, swap them
            */
        let b1 = Game.Objects[building1];
        let b2 = Game.Objects[building2];
        if (b1.basePrice > b2.basePrice) {
            b1 = Game.Objects[building2];
            b2 = Game.Objects[building1];
        } // swap

        desc =
                loc('%1 gain <b>+%2%</b> CpS per %3.', [cap(b1.plural), 5, b2.single]) +
                '<br>' +
                loc('%1 gain <b>+%2%</b> CpS per %3.', [cap(b2.plural), 0.1, b1.single]) +
                (EN ? desc : '');
        const upgrade = new Game.Upgrade(
            name, desc,
            (b1.basePrice * 10 + b2.basePrice * 1) * Game.Tiers[/** @type {keyof typeof Game.Tiers} */ (tier)].price,
            // @ts-expect-error it begins again
            Game.GetIcon(building1, tier)
        );
        upgrade.tier = /** @type {keyof typeof Game.Tiers} */ (tier);
        upgrade.buildingTie1 = b1;
        upgrade.buildingTie2 = b2;
        upgrade.priceFunc = function () {
            return (
                ASSERT_NOT_NULL(this.buildingTie1).basePrice * 10 +
                ASSERT_NOT_NULL(this.buildingTie2).basePrice * 1) *
                Game.Tiers[/** @type {keyof typeof Game.Tiers} */ (this.tier)].price * (Game.Has('Chimera') ? 0.98 : 1
            );
        };
        Game.Objects[building1].synergies.push(upgrade);
        Game.Objects[building2].synergies.push(upgrade);
        return upgrade;
    }
    /**
     * @param {CookieObject} me
     */
    static GetTieredCpsMult(me) {
        let mult = 1;
        for (let i in me.tieredUpgrades) {
            // @ts-expect-error what is an speciall
            if (!Game.Tiers[me.tieredUpgrades[i].tier].special && Game.Has(me.tieredUpgrades[i].name)) {
                let tierMult = 2;
                // unshackled
                if (
                    Game.ascensionMode != 1 && Game.Has(me.unshackleUpgrade) &&
                    // @ts-expect-error why is this here
                    Game.Has(Game.Tiers[me.tieredUpgrades[i].tier].unshackleUpgrade)
                )
                    tierMult += me.id == 1 ? 0.5 : (20 - me.id) * 0.1;
                mult *= tierMult;
            }
        }
        for (let i in me.synergies) {
            let syn = me.synergies[i];
            if (Game.Has(syn.name)) {
                if (syn.buildingTie1.name == me.name) mult *= 1 + 0.05 * syn.buildingTie2.amount;
                else if (syn.buildingTie2.name == me.name) mult *= 1 + 0.001 * syn.buildingTie1.amount;
            }
        }
        if (me.fortune && Game.Has(me.fortune.name)) mult *= 1.07;
        if (me.grandma && Game.Has(me.grandma.name)) mult *= 1 + Game.Objects['Grandma'].amount * 0.01 * (1 / (me.id - 1));
        return mult;
    }
    /**
     * @param {CookieObject} me
     */
    static UnlockTiered(me) {
        for (let i in me.tieredUpgrades) {
            if (
                Game.Tiers[me.tieredUpgrades[i].tier].unlock != -1 &&
                me.amount >= Game.Tiers[me.tieredUpgrades[i].tier].unlock
            )
                Game.Unlock(me.tieredUpgrades[i].name);
        }
        for (let i in me.tieredAchievs) {
            // @ts-expect-error aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
            if (me.amount >= Game.Tiers[ASSERT_NOT_NULL(me.tieredAchievs[i].tier)].achievUnlock)
                Game.Win(me.tieredAchievs[i].name);
        }
        for (let i in me.synergies) {
            let syn = me.synergies[i];
            if (
                // @ts-expect-error idc anymore
                Game.Has(Game.Tiers[syn.tier].req) &&
                    // @ts-expect-error
                    syn.buildingTie1.amount >= Game.Tiers[syn.tier].unlock &&
                    // @ts-expect-error
                    syn.buildingTie2.amount >= Game.Tiers[syn.tier].unlock
            )
                Game.Unlock(syn.name);
        }
    }

    /**
     * @type {any[]}
     */
    static GrandmaSynergies = [];
    /**
     * @param {string} name
     * @param {string} desc
     * @param {string} buildingArg
     */
    static GrandmaSynergy(name, desc, buildingArg) {
        const building = Game.Objects[buildingArg];
        const grandmaNumber = String(loc('%1 grandma', LBeautify(building.id - 1)));
        desc =
                loc('%1 are <b>twice</b> as efficient.', cap(Game.Objects['Grandma'].plural)) +
                ' ' +
                loc('%1 gain <b>+%2%</b> CpS per %3.', [cap(building.plural), 1, grandmaNumber]) +
                '<q>' +
                desc +
                '</q>';

        const upgrade = new Game.Upgrade(name, desc, building.basePrice * Game.Tiers[2].price, [10, 9], function () {
            ASSERT_NOT_NULL(Game.Objects['Grandma'].redraw)();
        });
        building.grandma = upgrade;
        upgrade.buildingTie = building;
        Game.GrandmaSynergies.push(upgrade.name);
        return upgrade;
    }

    static baseResearchTime = Game.fps * 60 * 30;
    /**
     * @param {string} what
     */
    static SetResearch(what) {
        if (Game.Upgrades[what] && !Game.Has(what)) {
            Game.researchT = Game.baseResearchTime;
            if (Game.Has('Persistent memory')) Game.researchT = Math.ceil(Game.baseResearchTime / 10);
            if (Game.Has('Ultrascience')) Game.researchT = Game.fps * 5;
            Game.nextResearch = Game.Upgrades[what].id;
            Game.Notify(loc('Research has begun'), loc('Your bingo center/research facility is conducting experiments.'), [9, 0]);
        }
    }

    static getPledgeDuration() {
        return Game.fps * 60 * (Game.Has('Sacrificial rolling pins') ? 60 : 30);
    }

    static halloweenDrops = [
        'Skull cookies', 'Ghost cookies', 'Bat cookies', 'Slime cookies', 'Pumpkin cookies', 'Eyeball cookies', 'Spider cookies'
    ];

    static GetHowManyHalloweenDrops() {
        let num = 0;
        for (let i in Game.halloweenDrops) {
            if (Game.Has(Game.halloweenDrops[i])) num++;
        }
        return num;
    }

    static heartDrops = [
        'Pure heart biscuits',
        'Ardent heart biscuits',
        'Sour heart biscuits',
        'Weeping heart biscuits',
        'Golden heart biscuits',
        'Eternal heart biscuits',
        'Prism heart biscuits'
    ];

    static GetHowManyHeartDrops() {
        let num = 0;
        for (let i in Game.heartDrops) {
            if (Game.Has(Game.heartDrops[i])) num++;
        }
        return num;
    }

    static easterEggs = [
        'Chicken egg',
        'Duck egg',
        'Turkey egg',
        'Quail egg',
        'Robin egg',
        'Ostrich egg',
        'Cassowary egg',
        'Salmon roe',
        'Frogspawn',
        'Shark egg',
        'Turtle egg',
        'Ant larva',
        'Golden goose egg',
        'Faberge egg',
        'Wrinklerspawn',
        'Cookie egg',
        'Omelette',
        'Chocolate egg',
        'Century egg',
        '"egg"'
    ];
    static eggDrops = [
        'Chicken egg',
        'Duck egg',
        'Turkey egg',
        'Quail egg',
        'Robin egg',
        'Ostrich egg',
        'Cassowary egg',
        'Salmon roe',
        'Frogspawn',
        'Shark egg',
        'Turtle egg',
        'Ant larva'
    ];
    static rareEggDrops = [
        'Golden goose egg', 'Faberge egg', 'Wrinklerspawn', 'Cookie egg', 'Omelette', 'Chocolate egg', 'Century egg', '"egg"'
    ];

    static GetHowManyEggs() {
        let num = 0;
        for (let i in Game.easterEggs) {
            if (Game.Has(Game.easterEggs[i])) num++;
        }
        return num;
    }

    /**
     * @param {number} failRate
     */
    static DropEgg(failRate) {
        failRate *= 1 / Game.dropRateMult();
        if (Game.season != 'easter') return;
        if (Game.HasAchiev('Hide & seek champion')) failRate *= 0.7;
        if (Game.Has('Omelette')) failRate *= 0.9;
        if (Game.Has('Starspawn')) failRate *= 0.9;
        if (Game.hasGod) {
            let godLvl = Game.hasGod('seasons');
            if (godLvl == 1) failRate *= 0.9;
            else if (godLvl == 2) failRate *= 0.95;
            else if (godLvl == 3) failRate *= 0.97;
        }
        if (Math.random() >= failRate) {
            let drop = '';
            drop = Math.random() < 0.1 ? choose(Game.rareEggDrops) : choose(Game.eggDrops);
            if (Game.Has(drop) || Game.HasUnlocked(drop)) {
                // reroll if we have it
                drop = Math.random() < 0.1 ? choose(Game.rareEggDrops) : choose(Game.eggDrops);
            }
            if (Game.Has(drop) || Game.HasUnlocked(drop)) return;
            Game.Unlock(drop);
            Game.Notify(loc('You found an egg!'), '<b>' + drop + '</b>', Game.Upgrades[drop].icon);
        }
    }

    /**
     * @param {number} slot
     */
    static PermanentSlotIcon(slot) {
        if (Game.permanentUpgrades[slot] == -1) return [slot, 10];
        return Game.UpgradesById[Game.permanentUpgrades[slot]].icon;
    }
    /**
     * @param {string | number} slot
     */
    static AssignPermanentSlot(slot) {
        PlaySound('snd/tick.mp3');
        Game.tooltip.hide();
        let list = [];
        for (let i in Game.Upgrades) {
            let me = Game.Upgrades[i];
            // @ts-expect-error noPerm indeed
            if (me.bought && me.unlocked && !me.noPerm && (me.pool == '' || me.pool == 'cookie')) {
                let fail = 0;
                for (let ii in Game.permanentUpgrades) {
                    if (Game.permanentUpgrades[ii] == me.id) fail = 1;
                } // check if not already in another permaslot
                if (!fail) list.push(me);
            }
        }

        let sortMap = function (/** @type {{ order: number; }} */ a, /** @type {{ order: number; }} */ b) {
            if (a.order > b.order) return 1;
            else if (a.order < b.order) return -1;
            else return 0;
        };
        list.sort(sortMap);

        let upgrades = '';
        for (let i in list) {
            let me = list[i];
            upgrades += Game.crate(
                me,
                '',
                'PlaySound(\'snd/tick.mp3\');Game.PutUpgradeInPermanentSlot(' + me.id + ',' + slot + ');',
                'upgradeForPermanent' + me.id
            );
        }
        const upgrade = Game.permanentUpgrades[Number(slot)];
        Game.SelectingPermanentUpgrade = upgrade;
        Game.Prompt(
            '<id PickPermaUpgrade><h3>' +
                loc('Pick an upgrade to make permanent') +
                '</h3>' +
                '<div class="line"></div><div style="margin:4px auto;clear:both;width:120px;"><div class="crate upgrade enabled" style="background-position:' +
                -slot * 48 +
                'px ' +
                -10 * 48 +
                'px;"></div><div id="upgradeToSlotNone" class="crate upgrade enabled" style="background-position:' +
                -0 * 48 +
                'px ' +
                -7 * 48 +
                'px;display:' +
                (upgrade != -1 ? 'none' : 'block') +
                ';"></div><div id="upgradeToSlotWrap" style="float:left;display:' +
                (upgrade == -1 ? 'none' : 'block') +
                ';">' +
                Game.crate(Game.UpgradesById[upgrade == -1 ? 0 : upgrade], '', '', 'upgradeToSlot') +
                '</div></div>' +
                '<div class="block crateBox" style="overflow-y:scroll;float:left;clear:left;width:317px;padding:0px;height:250px;">' +
                upgrades +
                '</div>' +
                '<div class="block" style="float:right;width:152px;clear:right;height:234px;">' +
                loc(
                    'Here are all the upgrades you\'ve purchased last playthrough.<div class="line"></div>Pick one to permanently gain its effects!<div class="line"></div>You can reassign this slot anytime you ascend.'
                ) +
                '</div>',
            [
                [loc('Confirm'), 'Game.permanentUpgrades[' + slot + ']=Game.SelectingPermanentUpgrade;Game.BuildAscendTree();Game.ClosePrompt();'],
                loc('Cancel')
            ],
            0,
            'widePrompt'
        );
    }
    static SelectingPermanentUpgrade = -1;
    /**
     * @param {number} upgrade
     * @param {any} slot
     */
    static PutUpgradeInPermanentSlot(upgrade, slot) {
        Game.SelectingPermanentUpgrade = upgrade;
        $('upgradeToSlotWrap', true).innerHTML = '';
        $('upgradeToSlotWrap', true).style.display = upgrade == -1 ? 'none' : 'block';
        $('upgradeToSlotNone', true).style.display = upgrade != -1 ? 'none' : 'block';
        $('upgradeToSlotWrap', true).innerHTML = Game.crate(Game.UpgradesById[upgrade == -1 ? 0 : upgrade], '', '', 'upgradeToSlot');
    }

    static playGoldenCookieChime() {
        if (Game.chimeType == 1) PlaySound('snd/chime.mp3');
        else if (Game.chimeType == 2) PlaySound('snd/fortune.mp3');
        else if (Game.chimeType == 3) PlaySound('snd/cymbalRev.mp3');
        else if (Game.chimeType == 4) {
            Game.wrinklerSquishSound++;
            if (Game.wrinklerSquishSound > 4) {
                Game.wrinklerSquishSound -= 4;
            }
            PlaySound('snd/squeak' + Game.wrinklerSquishSound + '.mp3');
        }
    }

    static AllBGs = [
        { pic: 'bgBlue', name: 'Automatic', icon: [0, 7] },
        { pic: 'bgBlue', name: 'Blue', icon: [21, 21] },
        { pic: 'bgRed', name: 'Red', icon: [22, 21] },
        { pic: 'bgWhite', name: 'White', icon: [23, 21] },
        { pic: 'bgBlack', name: 'Black', icon: [24, 21] },
        { pic: 'bgGold', name: 'Gold', icon: [25, 21] },
        { pic: 'grandmas1', name: 'Grandmas', icon: [26, 21] },
        { pic: 'grandmas2', name: 'Displeased grandmas', icon: [27, 21] },
        { pic: 'grandmas3', name: 'Angered grandmas', icon: [28, 21] },
        { pic: 'bgMoney', name: 'Money', icon: [29, 21] },
        { pic: 'bgPurple', name: 'Purple', icon: [21, 22], order: 1.1 },
        { pic: 'bgPink', name: 'Pink', icon: [24, 22], order: 2.1 },
        { pic: 'bgMint', name: 'Mint', icon: [22, 22], order: 2.2 },
        { pic: 'bgSilver', name: 'Silver', icon: [25, 22], order: 4.9 },
        { pic: 'bgBW', name: 'Black & White', icon: [23, 22], order: 4.1 },
        { pic: 'bgSpectrum', name: 'Spectrum', icon: [28, 22], order: 4.2 },
        { pic: 'bgCandy', name: 'Candy', icon: [26, 22] },
        { pic: 'bgYellowBlue', name: 'Biscuit store', icon: [27, 22] },
        { pic: 'bgChoco', name: 'Chocolate', icon: [30, 21] },
        { pic: 'bgChocoDark', name: 'Dark Chocolate', icon: [31, 21] },
        { pic: 'bgPaint', name: 'Painter', icon: [24, 34] },
        { pic: 'bgSnowy', name: 'Snow', icon: [30, 22] },
        { pic: 'bgSky', name: 'Sky', icon: [29, 22] },
        { pic: 'bgStars', name: 'Night', icon: [31, 22] },
        { pic: 'bgFoil', name: 'Foil', icon: [25, 34] }
    ];
    /** @type {Array<typeof Game.AllBGs[number]>} */
    static BGsByChoice = [];

    /**
     * @param {string} context
     */
    static loseShimmeringVeil(context) {
        if (!Game.Has('Shimmering veil')) return false;
        if (!Game.Has('Shimmering veil [off]') && Game.Has('Shimmering veil [on]')) return false;
        if (Game.Has('Reinforced membrane')) {
            if (context === 'shimmer') Math.seedrandom(Game.seed + '/' + (Game.goldenClicks + Game.reindeerClicked));
            else if (context === 'click') Math.seedrandom(Game.seed + '/' + Game.cookieClicks);
            if (Math.random() < Game.getVeilDefense()) {
                Game.Notify(loc('The reinforced membrane protects the shimmering veil.'), '', [7, 10]);
                Game.Win('Thick-skinned');
                Math.seedrandom();
                return false;
            }
            Math.seedrandom();
        }
        const me = Game.Upgrades['Shimmering veil [on]'];
        me.bought = 1;
        Game.Lock(me.toggleInto);
        Game.Unlock(me.toggleInto);
        Game.Notify(loc('The shimmering veil disappears...'), '', [9, 10]);
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        PlaySound('snd/spellFail.mp3', 0.75);
        return true;
    }
    static getVeilDefense() {
        let n = 0;
        if (Game.Has('Reinforced membrane')) n += 0.1;
        if (Game.Has('Delicate touch')) n += 0.1;
        if (Game.Has('Steadfast murmur')) n += 0.1;
        if (Game.Has('Glittering edge')) n += 0.1;
        return n;
    }
    static getVeilBoost() {
        let n = 0.5;
        if (Game.Has('Reinforced membrane')) n += 0.1;
        if (Game.Has('Delicate touch')) n += 0.05;
        if (Game.Has('Steadfast murmur')) n += 0.05;
        if (Game.Has('Glittering edge')) n += 0.05;
        return n;
    }

    /**
     * @param {{ building: any; q: any; }} obj
     */
    static NewUnshackleBuilding(obj) {
        let building = Game.Objects[obj.building];
        let upgrade = new Game.Upgrade(
            'Unshackled ' + building.bplural,
            (obj.building == 'Cursor'
                ? getStrThousandFingersGain(25)
                : loc('Tiered upgrades for <b>%1</b> provide an extra <b>+%2%</b> production.<br>Only works with unshackled upgrade tiers.', [
                    cap(building.plural),
                    Math.round((building.id == 1 ? 0.5 : (20 - building.id) * 0.1) * 100)
                ])) + (EN ? '<q>' + obj.q + '</q>' : ''),
            Math.pow(building.id + 1, 7) * 15000000,
            [building.iconColumn, 35]
        );
        upgrade.pool = 'prestige';
        upgrade.parents = [obj.building == 'Cursor' ? 'Unshackled flavor' : Game.ObjectsById[building.id - 1].unshackleUpgrade];
        building.unshackleUpgrade = upgrade.name;
        upgrade.posX = 750 - Math.sin((building.id + 1) * 0.25 + 2.3) * 500;
        upgrade.posY = 200 + Math.cos((building.id + 1) * 0.25 + 2.3) * 500;
        return upgrade;
    }

    /**
     * @param {{ tier: keyof typeof Game.Tiers; q: string; }} obj
     */
    static NewUnshackleUpgradeTier(obj) {
        let tier = Game.Tiers[obj.tier];
        let upgrade = new Game.Upgrade(
            obj.tier == 1 ? 'Unshackled flavor' : 'Unshackled ' + tier.name.toLowerCase(),
            loc(
                'Unshackles all <b>%1-tier upgrades</b>, making them more powerful.<br>Only applies to unshackled buildings.',
                cap(locStr('[Tier]' + tier.name, 0, tier.name))
            ) + (EN ? '<q>' + obj.q + '</q>' : ''),
            // @ts-expect-error i dont have the slightest clue how this is supposed to work
            Math.pow(obj.tier, 7.5) * 10000000,
            [10, tier.iconRow]
        );
        upgrade.pool = 'prestige';
        // @ts-expect-error
        upgrade.parents = [obj.tier == 1 ? 'Label printer' : Game.Tiers[obj.tier - 1].unshackleUpgrade];
        // @ts-expect-error
        tier.unshackleUpgrade = upgrade.name;
        // @ts-expect-error
        upgrade.posX = 750 - Math.sin(obj.tier * 0.3 + 2.3) * 400;
        // @ts-expect-error
        upgrade.posY = 200 + Math.cos(obj.tier * 0.3 + 2.3) * 400;
        return upgrade;
    }

    static jukebox = {
        sounds: [
            'tick',
            'tickOff',
            'smallTick',
            'toneTick',
            'clickOn',
            'clickOn2',
            'clickOff',
            'clickOff2',
            'pop1',
            'pop2',
            'pop3',
            'press',
            'buy1',
            'buy2',
            'buy3',
            'buy4',
            'sell1',
            'sell2',
            'sell3',
            'sell4',
            'buyHeavenly',
            'click1',
            'click2',
            'click3',
            'click4',
            'click5',
            'click6',
            'click7',
            'clickb1',
            'clickb2',
            'clickb3',
            'clickb4',
            'clickb5',
            'clickb6',
            'clickb7',
            'charging',
            'thud',
            'cymbalRev',
            'smallCymbalCrash',
            'choir',
            'chime',
            'shimmerClick',
            'jingle',
            'jingleClick',
            'fortune',
            'till1',
            'till2',
            'till3',
            'tillb1',
            'tillb2',
            'tillb3',
            'harvest1',
            'harvest2',
            'harvest3',
            'freezeGarden',
            'growl',
            'snarl',
            'page',
            'swooshIn',
            'swooshOut',
            'spell',
            'spellFail',
            'spirit',
            'squish1',
            'squish2',
            'squish3',
            'squish4',
            'squeak1',
            'squeak2',
            'squeak3',
            'squeak4',
            'cashIn',
            'cashIn2',
            'cashOut',
            'upgrade'
        ],
        tracks: [], // populated externally
        onSound: 0,
        onTrack: 0,
        trackLooped: true,
        trackAuto: true,
        trackShuffle: false,
        reset() {
            let me = Game.jukebox;
            me.onSound = 0;
            me.onTrack = 0;
            me.trackLooped = true;
            me.trackAuto = true;
            me.trackShuffle = false;
        },
        /**
         * @param {number} id
         */
        setSound(id) {
            if (id >= Game.jukebox.sounds.length) id = 0;
            else if (id < 0) id = Game.jukebox.sounds.length - 1;
            Game.jukebox.onSound = id;
            if ($('jukeboxOnSound')) {
                triggerAnim($('jukeboxPlayer'), 'pucker');
                $('jukeboxOnSound', true).innerHTML = '&bull; ' + Game.jukebox.sounds[Game.jukebox.onSound] + ' &bull;';
                $('jukeboxOnSoundN', true).innerHTML = Game.jukebox.onSound + 1 + '/' + Game.jukebox.sounds.length;
                $('jukeboxSoundSelect', true).value = Game.jukebox.onSound;
            }
            PlaySound('snd/' + Game.jukebox.sounds[Game.jukebox.onSound] + '.mp3', 1);
        }
    };

    static _seasons = {
        '': { name: '', start: '', over: '', trigger: '' },
        christmas: {
            name: 'Christmas',
            start: 'Christmas season has started!',
            over: 'Christmas season is over.',
            trigger: 'Festive biscuit'
        },
        valentines: {
            name: 'Valentine\'s day',
            start: 'Valentine\'s day has started!',
            over: 'Valentine\'s day is over.',
            trigger: 'Lovesick biscuit'
        },
        fools: {
            name: 'Business day',
            start: 'Business day has started!',
            over: 'Business day is over.',
            trigger: 'Fool\'s biscuit'
        },
        easter: {
            name: 'Easter',
            start: 'Easter season has started!',
            over: 'Easter season is over.',
            trigger: 'Bunny biscuit'
        },
        halloween: {
            name: 'Halloween',
            start: 'Halloween has started!',
            over: 'Halloween is over.',
            trigger: 'Ghostly biscuit'
        }
    };

    /** @type {{ [K in keyof typeof Game._seasons]: typeof Game._seasons[K] & { triggerUpgrade?: Upgrade; } }} */
    static seasons = Game._seasons;

    /**
     * @param {string | any[]} arr
     */
    static listTinyOwnedUpgrades(arr) {
        let str = '';
        for (const element of arr) {
            if (Game.Has(element)) {
                let it = Game.Upgrades[element];
                str += tinyIcon(it.icon);
            }
        }
        return str;
    }

    static santaDrops = [
        'Increased merriness',
        'Improved jolliness',
        'A lump of coal',
        'An itchy sweater',
        'Reindeer baking grounds',
        'Weighted sleighs',
        'Ho ho ho-flavored frosting',
        'Season savings',
        'Toy workshop',
        'Naughty list',
        'Santa\'s bottomless bag',
        'Santa\'s helpers',
        'Santa\'s legacy',
        'Santa\'s milk and cookies'
    ];

    static GetHowManySantaDrops() {
        let num = 0;
        for (let i in Game.santaDrops) {
            if (Game.Has(Game.santaDrops[i])) num++;
        }
        return num;
    }

    static reindeerDrops = [
        'Christmas tree biscuits',
        'Snowflake biscuits',
        'Snowman biscuits',
        'Holly biscuits',
        'Candy cane biscuits',
        'Bell biscuits',
        'Present biscuits'
    ];
    static GetHowManyReindeerDrops() {
        let num = 0;
        for (let i in Game.reindeerDrops) {
            if (Game.Has(Game.reindeerDrops[i])) num++;
        }
        return num;
    }

    static seasonDrops = [
        ...Game.heartDrops, ...Game.halloweenDrops, ...Game.easterEggs, ...Game.santaDrops, ...Game.reindeerDrops
    ];

    static saySeasonSwitchUses() {
        if (Game.seasonUses == 0) return loc('You haven\'t switched seasons this ascension yet.');
        return EN
            ? 'You\'ve switched seasons <b>' +
                (Game.seasonUses == 1 ? 'once' : (Game.seasonUses == 2 ? 'twice' : Game.seasonUses + ' times')) +
                '</b> this ascension.'
            : (Game.seasonUses == 1
                ? loc('You\'ve switched seasons <b>once</b> this ascension.')
                : loc('You\'ve switched seasons <b>%1 times</b> this ascension.', Game.seasonUses));
    }

    static computeSeasonPrices() {
        for (let i in Game.seasons) {
            if (i === '') continue;
            ASSERT_NOT_NULL(Game.seasons[/** @type {keyof typeof Game.seasons} */ (i)].triggerUpgrade)
                .priceFunc = function () {
                    let m = 1;
                    if (Game.hasGod) {
                        let godLvl = Game.hasGod('seasons');
                        if (godLvl == 1) m *= 2;
                        else if (godLvl == 2) m *= 1.5;
                        else if (godLvl == 3) m *= 1.25;
                    }
                    return Game.seasonTriggerBasePrice + Game.unbuffedCps * 60 * Math.pow(1.5, Game.seasonUses) * m;
                };
        }
    }
    static computeSeasons() {
        for (let i in Game.seasons) {
            const seasonI = /** @type {keyof typeof Game.seasons} */ (i);
            if (seasonI === '') continue;
            const me = Game.Upgrades[Game.seasons[seasonI].trigger];
            Game.seasons[seasonI].triggerUpgrade = me;
            me.pool = 'toggle';
            me.buyFunction = function () {
                Game.seasonUses += 1;
                Game.computeSeasonPrices();
                for (let i in Game.seasons) {
                    if (i === '') continue;
                    let me = Game.Upgrades[Game.seasons[/** @type {keyof typeof Game.seasons} */ (i)].trigger];
                    if (me.name != this.name) {
                        Game.Lock(me.name);
                        Game.Unlock(me.name);
                    }
                }
                if (Game.season != '' && Game.season != this.season) {
                    Game.Notify(
                        Game.seasons[Game.season].over + '<div class="line"></div>', '',
                        ASSERT_NOT_NULL(Game.seasons[Game.season].triggerUpgrade).icon, 4
                    );
                }
                Game.season = ASSERT_NOT_NULL(this.season);
                Game.seasonT = Game.getSeasonDuration();
                Game.storeToRefresh = 1;
                Game.upgradesToRebuild = 1;
                ASSERT_NOT_NULL(Game.Objects['Grandma'].redraw)();
                Game.Notify(Game.seasons[ASSERT_NOT_NULL(this.season)].start
                    + '<div class="line"></div>', '', this.icon, 4);
            };

            me.clickFunction = (function (me) {
                return function () {
                    // undo season
                    if (me.bought && Game.season && me == Game.seasons[Game.season].triggerUpgrade) {
                        me.lose();
                        Game.Notify(
                            Game.seasons[Game.season].over, '',
                            ASSERT_NOT_NULL(Game.seasons[Game.season].triggerUpgrade).icon
                        );
                        if (Game.Has('Season switcher')) {
                            Game.Unlock(Game.seasons[Game.season].trigger);
                            ASSERT_NOT_NULL(Game.seasons[Game.season].triggerUpgrade).bought = 0;
                        }

                        Game.upgradesToRebuild = 1;
                        Game.recalculateGains = 1;
                        Game.season = Game.baseSeason;
                        Game.seasonT = -1;
                        PlaySound('snd/tick.mp3');
                        return false;
                    } else return true;
                };
            })(me);

            me.displayFuncWhenOwned = function () {
                return (
                    '<div style="text-align:center;">' +
                        loc('Time remaining:') +
                        '<br><b>' +
                        (Game.Has('Eternal seasons') ? loc('forever') : Game.sayTime(Game.seasonT, -1)) +
                        '</b><div style="font-size:80%;">(' +
                        loc('Click again to cancel season') +
                        ')</div></div>'
                );
            };
            me.timerDisplay = (function (upgrade) {
                return function () {
                    return !Game.Upgrades[upgrade.name].bought || Game.Has('Eternal seasons') ? -1 : 1 - Game.seasonT / Game.getSeasonDuration();
                };
            })(me);
        }
    }
    static getSeasonDuration() {
        return Game.fps * 60 * 60 * 24;
    }

    /** @type {{ kitten: Upgrade[], [pool: string]: Upgrade[]; }} */
    static UpgradesByPool = { kitten: [] };
    /**
     * @type {any[]}
     */
    static PrestigeUpgrades = [];

    static goldenCookieUpgrades = [
        'Get lucky',
        'Lucky day',
        'Serendipity',
        'Heavenly luck',
        'Lasting fortune',
        'Decisive fate',
        'Lucky digit',
        'Lucky number',
        'Lucky payout',
        'Golden goose egg'
    ];

    /**
     * @type {any[]}
     */
    static cookieUpgrades = [];

    static UpgradePositions = {
        141: [118, -42],
        181: [-555, -93],
        253: [-237, -226],
        254: [-56, -234],
        255: [-149, -267],
        264: [68, 97],
        265: [157, 196],
        266: [287, 212],
        267: [413, 157],
        268: [480, 35],
        269: [-640, 42],
        270: [-471, -228],
        271: [-690, -178],
        272: [-591, -249],
        273: [-711, -58],
        274: [270, -328],
        275: [317, -439],
        276: [333, -556],
        277: [334, -676],
        278: [333, -796],
        279: [328, -922],
        280: [303, -1040],
        281: [194, -230],
        282: [-293, 156],
        283: [-335, 289],
        284: [-328, 422],
        285: [-247, 567],
        286: [-375, 579],
        287: [-296, 726],
        288: [-260, -396],
        289: [-375, -502],
        290: [-127, -415],
        291: [479, -739],
        292: [-399, -649],
        293: [-401, -806],
        323: [-76, 109],
        325: [198, -1153],
        326: [-270, -134],
        327: [-221, 261],
        328: [19, 247],
        329: [42, 402],
        353: [121, -326],
        354: [77, -436],
        355: [64, -548],
        356: [57, -673],
        357: [52, -793],
        358: [58, -924],
        359: [82, -1043],
        360: [49, 506],
        362: [156, 325],
        363: [-30, -30],
        364: [-238, -728],
        365: [-123, 423],
        368: [-55, -527],
        393: [196, -714],
        394: [197, -964],
        395: [-143, -140],
        396: [-244, -897],
        397: [-97, 641],
        408: [-204, -1036],
        409: [-72, -1152],
        410: [42, -1278],
        411: [-476, 105],
        412: [-522, 259],
        413: [-516, 433],
        449: [-367, -1113],
        450: [-306, -1216],
        451: [-184, -1241],
        495: [-408, -974],
        496: [200, 49],
        505: [411, -94],
        520: [-303, -12],
        537: [-795, -243],
        539: [-534, -1130],
        540: [-702, -1135],
        541: [-656, -1014],
        542: [-650, -1252],
        561: [298, -21],
        562: [32, 744],
        591: [148, 844],
        592: [-52, 858],
        643: [57, 616],
        646: [485, -882],
        647: [-102, 246],
        717: [621, -676],
        718: [618, -537],
        719: [-225, -520],
        720: [-150, -631],
        801: [-188, 920],
        802: [-344, 916],
        803: [-462, 848],
        804: [320, 350],
        805: [221, 486]
    };

    /* =====================================================================================
        ACHIEVEMENTS
        =======================================================================================*/
    /** @type {Record<string, Achievement>} */
    static Achievements = {};
    /** @type {Record<string, Achievement>} */
    static AchievementsById = {};
    static AchievementsN = 0;
    static AchievementsOwned = 0;
    static Achievement = Achievement;

    /**
     * @param {string | Record<string | number, string>} what
     */
    static Win(what) {
        if (typeof what === 'string') {
            if (Game.Achievements[what]) {
                let it = Game.Achievements[what];
                if (it.won == 0) {
                    let name = it.shortName || it.dname;
                    it.won = 1;
                    Game.Notify(loc('Achievement unlocked'), '<div class="title" style="font-size:18px;margin-top:-2px;">' + name + '</div>', it.icon);
                    Game.NotifyTooltip('function(){return Game.crateTooltip(Game.AchievementsById[' + it.id + ']);}');
                    if (Game.CountsAsAchievementOwned(it.pool)) Game.AchievementsOwned++;
                    Game.recalculateGains = 1;
                }
            }
        } else {
            for (let i in what) Game.Win(what[i]);
        }
    }
    /**
     * @param {string} what
     */
    static RemoveAchiev(what) {
        if (Game.Achievements[what]?.won == 1) {
            Game.Achievements[what].won = 0;
            if (Game.CountsAsAchievementOwned(Game.Achievements[what].pool)) Game.AchievementsOwned--;
            Game.recalculateGains = 1;
        }
    }

    /**
     * @param {string} pool
     */
    static CountsAsAchievementOwned(pool) {
        return pool == '' || pool == 'normal' ? true : false;
    }

    /**
     * @param {string} what
     */
    static HasAchiev(what) {
        return Game.Achievements[what] ? Game.Achievements[what].won : 0;
    }

    /**
     * @param {string} name
     * @param {string} desc
     * @param {string} building
     * @param {keyof typeof Game.Tiers} tier
     */
    static TieredAchievement(name, desc, building, tier) {
        let achiev = new Game.Achievement(
            name,
            // @ts-expect-error shut
            loc('Have <b>%1</b>.', loc('%1 ' + Game.Objects[building].bsingle, LBeautify(Game.Tiers[tier].achievUnlock))) + desc,
            // @ts-expect-error not you again
            Game.GetIcon(building, tier)
        );
        Game.SetTier(building, tier);
        return achiev;
    }

    /**
     * @param {string} name
     * @param {string} buildingArg
     * @param {number} tier
     * @param {string | number | undefined} [q]
     * @param {number | undefined} [mult]
     */
    static ProductionAchievement(name, buildingArg, tier, q, mult) {
        const building = Game.Objects[buildingArg];
        let icon = [building.iconColumn, 22];
        let n = 12 + building.n + (mult || 0);
        if (tier == 2) {
            icon[1] = 23;
            n += 7;
        } else if (tier == 3) {
            icon[1] = 24;
            n += 14;
        }
        const pow = Math.pow(10, n);
        const achiev = new Game.Achievement(
            name,
            loc('Make <b>%1</b> just from %2.', [String(loc('%1 cookie', { n: pow, b: toFixed(pow) })), building.plural]) + (q ? '<q>' + q + '</q>' : ''),
            icon
        );
        building.productionAchievs.push({ pow: pow, achiev: achiev });
        return achiev;
    }

    static thresholdIcons = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 21, 22, 23, 24, 25, 26, 27, 28, 29, 21, 22, 23, 24, 25, 26,
        27, 28, 29, 30, 31, 30, 31
    ];
    /**
     * @type {Achievement[]}
     */
    static BankAchievements = [];
    /**
     * @param {string} name
     * @param {string | undefined} [q]
     */
    static BankAchievement(name, q) {
        let threshold = Math.pow(10, Math.floor(Game.BankAchievements.length * 1.5 + 2));
        if (Game.BankAchievements.length === 0) threshold = 1;
        let achiev = new Game.Achievement(
            name,
            loc('Bake <b>%1</b> in one ascension.', loc('%1 cookie', { n: threshold, b: toFixed(threshold) })) + (q ? '<q>' + q + '</q>' : ''),
            [
                Game.thresholdIcons[Game.BankAchievements.length],
                // eslint-disable-next-line unicorn/no-nested-ternary
                Game.BankAchievements.length > 43 ? 2 : (Game.BankAchievements.length > 32 ? 1 : Game.BankAchievements.length > 23 ? 2 : 5)
            ]
        );
        achiev.threshold = threshold;
        achiev.order = 100 + Game.BankAchievements.length * 0.01;
        Game.BankAchievements.push(achiev);
        return achiev;
    }
    /**
     * @type {Achievement[]}
     */
    static CpsAchievements = [];
    /**
     * @param {string} name
     * @param {string | undefined} [q]
     */
    static CpsAchievement(name, q) {
        let threshold = Math.pow(10, Math.floor(Game.CpsAchievements.length * 1.2));
        let achiev = new Game.Achievement(
            name,
            loc('Bake <b>%1</b> per second.', loc('%1 cookie', { n: threshold, b: toFixed(threshold) })) + (q ? '<q>' + q + '</q>' : ''),
            [
                Game.thresholdIcons[Game.CpsAchievements.length],
                // eslint-disable-next-line unicorn/no-nested-ternary
                Game.CpsAchievements.length > 43 ? 2 : (Game.CpsAchievements.length > 32 ? 1 : Game.CpsAchievements.length > 23 ? 2 : 5)
            ]
        );
        achiev.threshold = threshold;
        achiev.order = 200 + Game.CpsAchievements.length * 0.01;
        Game.CpsAchievements.push(achiev);
        return achiev;
    }

    /* =====================================================================================
        BUFFS
        =======================================================================================*/

    /** @type {Record<string, any>} */
    static buffs = {}; // buffs currently in effect by name
    static buffsI = 0;
    static buffsL = $('buffs', true);
    /**
     * @param {string} typeArg
     * @param {number} time
     * @param {number} arg1
     * @param {number} [arg2]
     * @param {number} [arg3]
     */
    static gainBuff(typeArg, time, arg1, arg2, arg3) {
        const type = Game.buffTypesByName[typeArg];
        const obj = ASSERT_NOT_NULL(type.func)(time, arg1, arg2, arg3);
        obj.type = type;
        obj.arg1 = arg1;
        obj.arg2 = arg2;
        obj.arg3 = arg3;
        if (!obj.dname && obj.name != '???') obj.dname = loc(obj.name);

        const buff = {
            visible: true,
            time: 0,
            name: '???',
            desc: '',
            icon: /** @type {[number, number]} */ ([0, 0]),
            maxTime: 0,
            id: 0,
            /** @type {HTMLElement=} */
            l: undefined
        };
        if (Game.buffs[obj.name]) {
            // if there is already a buff in effect with this name
            const buff = Game.buffs[obj.name];
            if (obj.max) buff.time = Math.max(obj.time, buff.time); // new duration is max of old and new
            if (obj.add) buff.time += obj.time; // new duration is old + new
            if (!obj.max && !obj.add) buff.time = obj.time; // new duration is set to new
            buff.maxTime = buff.time;
        } // create new buff
        else {
            for (let i in obj) {
                // paste parameters onto buff
                // @ts-expect-error ts no like this
                buff[i] = obj[i];
            }
            buff.maxTime = buff.time;
            Game.buffs[buff.name] = buff;
            buff.id = Game.buffsI;

            // create dom
            Game.buffsL.innerHTML =
                    Game.buffsL.innerHTML +
                    '<div id="buff' +
                    buff.id +
                    '" class="crate enabled buff" ' +
                    (buff.desc
                        ? Game.getTooltip(
                            '<div class="prompt" style="min-width:200px;text-align:center;font-size:11px;margin:8px 0px;" id="tooltipBuff"><h3>' +
                            // @ts-expect-error literally how
                            buff.dname +
                            '</h3><div class="line"></div>' +
                            buff.desc +
                            '</div>',
                            'left',
                            true
                        )
                        : '') +
                    ' style="opacity:1;float:none;display:block;' +
                    writeIcon(buff.icon) +
                    '"></div>';

            buff.l = $('buff' + buff.id, true);

            Game.buffsI++;
        }
        Game.recalculateGains = 1;
        Game.storeToRefresh = 1;
        return buff;
    }
    /**
     * @param {string} what
     */
    static hasBuff(
        what // returns 0 if there is no buff in effect with this name; else, returns it
    ) {
        return Game.buffs[what] || 0;
    }
    static updateBuffs() // executed every logic frame
    {
        for (let i in Game.buffs) {
            let buff = Game.buffs[i];

            if (buff.time >= 0) {
                if (!$('buffPieTimer' + buff.id))
                    $('buff' + buff.id, true).innerHTML = $('buff' + buff.id, true).innerHTML +
                            '<div class="pieTimer" id="buffPieTimer' + buff.id + '"></div>';
                let T = 1 - buff.time / buff.maxTime;
                T = (T * 144) % 144;
                $('buffPieTimer' + buff.id, true)
                    .style.backgroundPosition = `${-Math.floor(T % 18) * 48}px ${-Math.floor(T / 18) * 48}px`;
            }
            buff.time--;
            if (buff.time <= 0) {
                if (Game.onCrate === $('buff' + buff.id)) Game.tooltip.hide();
                if (buff.onDie) buff.onDie();
                Game.buffsL.removeChild($('buff' + buff.id, true));
                if (Game.buffs[buff.name]) {
                    Game.buffs[buff.name] = 0;
                    delete Game.buffs[buff.name];
                }
                Game.recalculateGains = 1;
                Game.storeToRefresh = 1;
            }
        }
    }
    /**
     * @param {string} what
     */
    static killBuff(
        what // remove a buff by name
    ) {
        if (Game.buffs[what]) Game.buffs[what].time = 0;
    }
    static killBuffs() // remove all buffs
    {
        Game.buffsL.innerHTML = '';
        Game.buffs = {};
        Game.recalculateGains = 1;
        Game.storeToRefresh = 1;
    }

    /**
     * @type {any[]}
     */
    static buffTypes = []; // buff archetypes; only buffs declared from these can be saved and loaded
    /**
     * @type {Record<string, InstanceType<Game.buffType>>}
     */
    static buffTypesByName = {};
    static buffTypesN = 0;
    static buffType = class BuffType {
        /**
             * @param {string} name
             * @param {Function} [func]
             */
        constructor(name, func) {
            this.name = name;
            this.func = func; // this is a function that returns a buff object; it takes a "time" argument in seconds, and 3 more optional arguments at most, which will be saved and loaded as floats
            this.id = Game.buffTypesN;
            this.vanilla = Game.vanilla;
            Game.buffTypesByName[this.name] = this;
            Game.buffTypes[Game.buffTypesN] = this;
            Game.buffTypesN++;
        }
    };
        /*
        basic buff parameters :
            name:'Kitten rain',
            desc:'It\'s raining kittens!',
            icon:[0,0],
            time:30*Game.fps
        other parameters :
            visible:false - will hide the buff from the buff list
            add:true - if this buff already exists, add the new duration to the old one
            max:true - if this buff already exists, set the new duration to the max of either
            onDie:function(){} - function will execute when the buff runs out
            power:3 - used by some buffs
            multCpS:3 - buff multiplies CpS by this amount
            multClick:3 - buff multiplies click power by this amount
        */

    /* =====================================================================================
        GRANDMAPOCALYPSE
        =======================================================================================*/
    static UpdateGrandmapocalypse() {
        if (Game.Has('Elder Covenant') || Game.Objects['Grandma'].amount == 0) Game.elderWrath = 0;
        else if (Game.pledgeT > 0) {
            // if the pledge is active, lower it
            Game.pledgeT--;
            if (Game.pledgeT == 0) {
                // did we reach 0? make the pledge purchasable again
                Game.Lock('Elder Pledge');
                Game.Unlock('Elder Pledge');
                Game.elderWrath = 1;
            }
        } else {
            if (Game.Has('One mind') && Game.elderWrath == 0) {
                Game.elderWrath = 1;
            }
            if (Math.random() < 0.001 && Game.elderWrath < Game.Has('One mind') + Game.Has('Communal brainsweep') + Game.Has('Elder Pact')) {
                Game.elderWrath++; // have we already pledged? make the elder wrath shift between different stages
            }
            if (Game.Has('Elder Pact') && Game.Upgrades['Elder Pledge'].unlocked == 0) {
                Game.Lock('Elder Pledge');
                Game.Unlock('Elder Pledge');
            }
        }
        Game.elderWrathD += (Game.elderWrath + 1 - Game.elderWrathD) * 0.001; // slowly fade to the target wrath state

        if (Game.elderWrath != Game.elderWrathOld) {
            Game.storeToRefresh = 1;
        }

        Game.elderWrathOld = Game.elderWrath;

        Game.UpdateWrinklers();
    }

    // wrinklers

    static wrinklerHP = 2.1;
    /**
     * @type {{ id: number; close: number; sucked: number; phase: number; x: number; y: number; r: number; hurt: number; hp: number; selected: number; type: number; }[]}
     */
    static wrinklers = [];

    static getWrinklersMax() {
        let n = 10;
        if (Game.Has('Elder spice')) n += 2;
        return n;
    }
    static ResetWrinklers() {
        for (let i in Game.wrinklers) {
            Game.wrinklers[i] = {
                id: Number.parseInt(i),
                close: 0,
                sucked: 0,
                phase: 0,
                x: 0,
                y: 0,
                r: 0,
                hurt: 0,
                hp: Game.wrinklerHP,
                selected: 0,
                type: 0
            };
        }
    }
    static CollectWrinklers() {
        for (let i in Game.wrinklers) {
            Game.wrinklers[i].hp = 0;
        }
    }
    static wrinklerSquishSound = Math.floor(Math.random() * 4) + 1;
    static playWrinklerSquishSound() {
        PlaySound('snd/' + (Game.WINKLERS ? 'squeak' : 'squish') + Game.wrinklerSquishSound + '.mp3', 0.5);
        Game.wrinklerSquishSound += Math.floor(Math.random() * 1.5) + 1;
        if (Game.wrinklerSquishSound > 4) Game.wrinklerSquishSound -= 4;
    }
    /**
     * @param {{ phase: number; hp: number; type: number; } | undefined} [me]
     */
    static SpawnWrinkler(me) {
        if (!me) {
            let max = Game.getWrinklersMax();
            let n = 0;
            for (let i in Game.wrinklers) {
                if (Game.wrinklers[i].phase > 0) n++;
            }
            for (let i in Game.wrinklers) {
                let it = Game.wrinklers[i];
                if (it.phase == 0 && Game.elderWrath > 0 && n < max && it.id < max) {
                    me = it;
                    break;
                }
            }
        }
        if (!me) return false;
        me.phase = 1;
        me.hp = Game.wrinklerHP;
        me.type = 0;
        if (Math.random() < 0.0001) me.type = 1; // shiny wrinkler
        return me;
    }
    static PopRandomWrinkler() {
        let wrinklers = [];
        for (let i in Game.wrinklers) {
            if (Game.wrinklers[i].phase > 0 && Game.wrinklers[i].hp > 0) wrinklers.push(Game.wrinklers[i]);
        }
        if (wrinklers.length > 0) {
            let me = choose(wrinklers);
            me.hp = -10;
            return me;
        }
        return false;
    }
    static UpdateWrinklers() {
        /**
         * @param {number} x
         * @param {number} y
         * @param {{ w: any; h: any; r: any; o: any; }} rect
         */
        function inRect(x, y, rect) {
            // find out if the point x,y is in the rotated rectangle rect{w,h,r,o}
            // (width,height,rotation in radians,y-origin) (needs to be normalized)
            // I found this somewhere online I guess
            let dx = x + Math.sin(-rect.r) * -(rect.h / 2 - rect.o),
                dy = y + Math.cos(-rect.r) * -(rect.h / 2 - rect.o);
            let h1 = Math.sqrt(dx * dx + dy * dy);
            let currA = Math.atan2(dy, dx);
            let newA = currA - rect.r;
            let x2 = Math.cos(newA) * h1;
            let y2 = Math.sin(newA) * h1;
            if (x2 > -0.5 * rect.w && x2 < 0.5 * rect.w && y2 > -0.5 * rect.h && y2 < 0.5 * rect.h) return true;
            return false;
        }

        let xBase = 0;
        let yBase = 0;
        let onWrinkler = 0;
        if (Game.LeftBackground) {
            xBase = Game.cookieOriginX;
            yBase = Game.cookieOriginY;
        }
        let max = Game.getWrinklersMax();
        let n = 0;
        for (let i in Game.wrinklers) {
            if (Game.wrinklers[i].phase > 0) n++;
        }
        for (let i in Game.wrinklers) {
            let me = Game.wrinklers[i];
            if (me.phase == 0 && Game.elderWrath > 0 && n < max && me.id < max) {
                let chance = 0.00001 * Game.elderWrath;
                chance *= Game.eff('wrinklerSpawn');
                if (Game.Has('Unholy bait')) chance *= 5;
                if (Game.hasGod) {
                    let godLvl = Game.hasGod('scorn');
                    if (godLvl == 1) chance *= 2.5;
                    else if (godLvl == 2) chance *= 2;
                    else if (godLvl == 3) chance *= 1.5;
                }
                if (Game.Has('Wrinkler doormat')) chance = 0.1;
                if (Math.random() < chance) {
                    // respawn
                    Game.SpawnWrinkler(me);
                }
            }
            if (me.phase > 0) {
                if (me.close < 1) me.close += 1 / Game.fps / 10;
                if (me.close > 1) me.close = 1;
            } else me.close = 0;
            if (me.close == 1 && me.phase == 1) {
                me.phase = 2;
                Game.recalculateGains = 1;
            }
            if (me.phase == 2) {
                me.sucked += (Game.cookiesPs / Game.fps) * Game.cpsSucked; // suck the cookies
            }
            if (me.phase > 0) {
                if (me.type == 0) {
                    if (me.hp < Game.wrinklerHP) me.hp += 0.04;
                    me.hp = Math.min(Game.wrinklerHP, me.hp);
                } else if (me.type == 1) {
                    if (me.hp < Game.wrinklerHP * 3) me.hp += 0.04;
                    me.hp = Math.min(Game.wrinklerHP * 3, me.hp);
                }
                let d = 128 * (2 - me.close);
                if (Game.prefs.fancy) d += Math.cos(Game.T * 0.05 + Number.parseInt(String(me.id))) * 4;
                me.r = (me.id / max) * 360;
                if (Game.prefs.fancy) me.r += Math.sin(Game.T * 0.05 + Number.parseInt(String(me.id))) * 4;
                me.x = xBase + Math.sin((me.r * Math.PI) / 180) * d;
                me.y = yBase + Math.cos((me.r * Math.PI) / 180) * d;
                if (Game.prefs.fancy) me.r += Math.sin(Game.T * 0.09 + Number.parseInt(String(me.id))) * 4;
                let rect = {
                    w: 100,
                    h: 200,
                    r: (-me.r * Math.PI) / 180,
                    o: 10
                };
                if (Math.random() < 0.01 && !Game.prefs.notScary) me.hurt = Math.max(me.hurt, Math.random());
                if (Game.T % 5 == 0 && Game.CanClick) {
                    me.selected = Game.LeftBackground && Game.mouseX < Game.LeftBackground.canvas.width && inRect(Game.mouseX - me.x, Game.mouseY - me.y, rect) ? 1 : 0;
                }
                if (me.selected && onWrinkler == 0 && Game.CanClick) {
                    me.hurt = Math.max(me.hurt, 0.25);
                    if (Game.Click && Game.lastClickedEl === $('backgroundLeftCanvas')) {
                        if ((Game.keys['ControlRight'] || Game.keys['ControlLeft']) && Game.sesame) {
                            me.type = Number(!me.type);
                            PlaySound('snd/shimmerClick.mp3');
                        } // ctrl-click on a wrinkler in god mode to toggle its shininess
                        else {
                            Game.playWrinklerSquishSound();
                            me.hurt = 1;
                            me.hp -= 0.75;
                            if (Game.prefs.particles && !Game.prefs.notScary && !Game.WINKLERS && !(me.hp <= 0.5 && me.phase > 0)) {
                                let x = me.x + Math.sin((me.r * Math.PI) / 180) * 90;
                                let y = me.y + Math.cos((me.r * Math.PI) / 180) * 90;
                                for (let ii = 0; ii < 3; ii++) {
                                    let part = Game.particleAdd(
                                        x,
                                        y,
                                        Math.random() * 4 - 2,
                                        Math.random() * -2 - 2,
                                        1,
                                        1,
                                        2,
                                        me.type == 1 ? 'shinyWrinklerBits.png' : 'wrinklerBits.png'
                                    );
                                    part.r = -me.r;
                                }
                            }
                        }
                        Game.Click = 0;
                    }
                    onWrinkler = 1;
                }
            }

            if (me.hurt > 0) {
                me.hurt -= 5 / Game.fps;
                me.r += Math.sin(Game.T * 1) * me.hurt * 18;
            }
            if (me.hp <= 0.5 && me.phase > 0) {
                Game.playWrinklerSquishSound();
                PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
                Game.wrinklersPopped++;
                Game.recalculateGains = 1;
                me.phase = 0;
                me.close = 0;
                me.hurt = 0;
                me.hp = 3;
                let toSuck = 1.1;
                if (Game.Has('Sacrilegious corruption')) toSuck *= 1.05;
                if (me.type == 1) toSuck *= 3; // shiny wrinklers are an elusive, profitable breed
                me.sucked *= toSuck; // cookie dough does weird things inside wrinkler digestive tracts
                if (Game.Has('Wrinklerspawn')) me.sucked *= 1.05;
                if (Game.hasGod) {
                    let godLvl = Game.hasGod('scorn');
                    if (godLvl == 1) me.sucked *= 1.15;
                    else if (godLvl == 2) me.sucked *= 1.1;
                    else if (godLvl == 3) me.sucked *= 1.05;
                }
                if (me.sucked > 0.5) {
                    Game.Notify(
                        me.type == 1 ? loc('Exploded a shiny wrinkler') : loc('Exploded a wrinkler'),
                        loc('Found <b>%1</b>!', loc('%1 cookie', LBeautify(me.sucked))),
                        [19, 8],
                        6
                    );
                    Game.Popup('<div style="font-size:80%;">' + loc('+%1!', loc('%1 cookie', LBeautify(me.sucked))) + '</div>', Game.mouseX, Game.mouseY);

                    if (Game.season == 'halloween') {
                        let failRate = 0.95;
                        if (Game.HasAchiev('Spooky cookies')) failRate = 0.8;
                        if (Game.Has('Starterror')) failRate *= 0.9;
                        failRate *= 1 / Game.dropRateMult();
                        if (Game.hasGod) {
                            let godLvl = Game.hasGod('seasons');
                            if (godLvl == 1) failRate *= 0.9;
                            else if (godLvl == 2) failRate *= 0.95;
                            else if (godLvl == 3) failRate *= 0.97;
                        }
                        if (me.type == 1) failRate *= 0.9;
                        if (Math.random() > failRate) {
                            // halloween cookie drops
                            let cookie = choose([
                                'Skull cookies',
                                'Ghost cookies',
                                'Bat cookies',
                                'Slime cookies',
                                'Pumpkin cookies',
                                'Eyeball cookies',
                                'Spider cookies'
                            ]);
                            if (!Game.HasUnlocked(cookie) && !Game.Has(cookie)) {
                                Game.Unlock(cookie);
                                Game.Notify(
                                    Game.Upgrades[cookie].dname,
                                    loc('You also found <b>%1</b>!', Game.Upgrades[cookie].dname),
                                    Game.Upgrades[cookie].icon
                                );
                            }
                        }
                    }
                    Game.DropEgg(0.98);
                }
                if (me.type == 1) Game.Win('Last Chance to See');
                Game.Earn(me.sucked);

                if (Game.prefs.particles) {
                    let x = me.x + Math.sin((me.r * Math.PI) / 180) * 90;
                    let y = me.y + Math.cos((me.r * Math.PI) / 180) * 90;
                    if (me.sucked > 0) {
                        for (let ii = 0; ii < 5; ii++) {
                            Game.particleAdd(Game.mouseX, Game.mouseY, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.75, 1.5, 2);
                        }
                    }
                    if (!Game.prefs.notScary && !Game.WINKLERS) {
                        for (let ii = 0; ii < 8; ii++) {
                            let part = Game.particleAdd(
                                x,
                                y,
                                Math.random() * 4 - 2,
                                Math.random() * -2 - 2,
                                1,
                                1,
                                2,
                                me.type == 1 ? 'shinyWrinklerBits.png' : 'wrinklerBits.png'
                            );
                            part.r = -me.r;
                        }
                    }
                }
                me.sucked = 0;
            }
        }
        if (onWrinkler) {
            Game.mousePointer = 1;
        }
    }
    static DrawWrinklers() {
        let ctx = Game.LeftBackground;
        let selected = 0;
        for (let i in Game.wrinklers) {
            let me = Game.wrinklers[i];
            if (me.phase > 0) {
                ctx.globalAlpha = me.close;
                ctx.save();
                ctx.translate(me.x, me.y);
                let sw = 100 + 2 * Math.sin(Game.T * 0.2 + Number(i) * 3);
                let sh = 200 + 5 * Math.sin(Game.T * 0.2 - 2 + Number(i) * 3);
                if (Game.prefs.fancy) {
                    ctx.translate(0, 30);
                    ctx.rotate((-me.r * Math.PI) / 180);
                    ctx.drawImage(Pic('wrinklerShadow.png'), -sw / 2, -10, sw, sh);
                    ctx.rotate((me.r * Math.PI) / 180);
                    ctx.translate(0, -30);
                }
                ctx.rotate((-me.r * Math.PI) / 180);
                let pic = Game.WINKLERS ? 'winkler.png' : 'wrinkler.png';
                if (me.type == 1) pic = Game.WINKLERS ? 'shinyWinkler.png' : 'shinyWrinkler.png';
                else if (Game.season == 'christmas') pic = Game.WINKLERS ? 'winterWinkler.png' : 'winterWrinkler.png';
                ctx.drawImage(Pic(pic), -sw / 2, -10, sw, sh);
                if (!Game.WINKLERS && Game.prefs.notScary)
                    ctx.drawImage(
                        Pic(
                            Math.sin(Game.T * 0.003 + Number(i) * 11 + 137 + Math.sin(Game.T * 0.017 + Number(i) * 13)) > 0.9997
                                ? 'wrinklerBlink.png'
                                : 'wrinklerGooglies.png'
                        ),
                        -sw / 2,
                        -10 + 1 * Math.sin(Game.T * 0.2 + Number(i) * 3 + 1.2),
                        sw,
                        sh
                    );
                if (me.type == 1 && Math.random() < 0.3 && Game.prefs.particles) {
                    // sparkle
                    ctx.globalAlpha = Math.random() * 0.65 + 0.1;
                    let s = Math.random() * 30 + 5;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(Pic('glint.jpg'), -s / 2 + Math.random() * 50 - 25, -s / 2 + Math.random() * 200, s, s);
                }
                ctx.restore();

                if (Game.prefs.particles && me.phase == 2 && Math.random() < 0.03) {
                    Game.particleAdd(me.x, me.y, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.5, 1, 2);
                }

                // @ts-expect-error zzzzzzzzzzz
                if (me.selected) selected = me;
            }
        }
        if (selected && Game.Has('Eye of the wrinkler')) {
            let x = Game.cookieOriginX;
            let y = Game.cookieOriginY;
            ctx.font = '14px Merriweather';
            ctx.textAlign = 'center';
            let text = loc('Swallowed:');
            // @ts-expect-error man
            let width = Math.ceil(Math.max(ctx.measureText(text).width, ctx.measureText(Beautify(selected.sucked)).width));
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.65;

            let xO = x - width / 2 - 16;
            let yO = y - 4;
            // @ts-expect-error why
            let dist = Math.floor(Math.sqrt((selected.x - xO) * (selected.x - xO) + (selected.y - yO) * (selected.y - yO)));
            // @ts-expect-error is
            let angle = -Math.atan2(yO - selected.y, xO - selected.x) + Math.PI / 2;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (let i = 0; i < Math.floor(dist / 12); i++) {
                // @ts-expect-error this
                let xC = selected.x + Math.sin(angle) * i * 12;
                // @ts-expect-error so bad
                let yC = selected.y + Math.cos(angle) * i * 12;
                ctx.beginPath();
                ctx.arc(xC, yC, 4 + (Game.prefs.fancy ? 2 * Math.pow(Math.sin(-Game.T * 0.2 + i * 0.3), 4) : 0), 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.stroke();
            }
            ctx.fillRect(x - width / 2 - 8 - 10, y - 23, width + 16 + 20, 38);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - width / 2 - 8 - 10 + 1.5, y - 23 + 1.5, width + 16 + 20 - 3, 38 - 3);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.fillText(String(text), x + 14, y - 8);
            // @ts-expect-error urgh
            ctx.fillText(Beautify(selected.sucked), x + 10, y + 8);
            let s = 54 + 2 * Math.sin(Game.T * 0.4);
            ctx.drawImage(Pic('icons.png'), 27 * 48, 26 * 48, 48, 48, x - width / 2 - 16 - s / 2, y - 4 - s / 2, s, s);
        }
    }
    static SaveWrinklers() {
        let amount = 0;
        let amountShinies = 0;
        let number = 0;
        let shinies = 0;
        for (let i in Game.wrinklers) {
            if (Game.wrinklers[i].sucked > 0.5) {
                number++;
                if (Game.wrinklers[i].type == 1) {
                    shinies++;
                    amountShinies += Game.wrinklers[i].sucked;
                } else amount += Game.wrinklers[i].sucked;
            }
        }
        return {
            amount: amount,
            number: number,
            shinies: shinies,
            amountShinies: amountShinies
        };
    }
    /**
     * @param {number} amount
     * @param {number} number
     * @param {number} shinies
     * @param {number} amountShinies
     */
    static LoadWrinklers(amount, number, shinies, amountShinies) {
        if (number > 0 && (amount > 0 || amountShinies > 0)) {
            let fullNumber = number - shinies;
            let fullNumberShinies = shinies;
            for (let i in Game.wrinklers) {
                if (number > 0) {
                    Game.wrinklers[i].phase = 2;
                    Game.wrinklers[i].close = 1;
                    Game.wrinklers[i].hp = 3;
                    if (shinies > 0) {
                        Game.wrinklers[i].type = 1;
                        Game.wrinklers[i].sucked = amountShinies / fullNumberShinies;
                        shinies--;
                    } else Game.wrinklers[i].sucked = amount / fullNumber;
                    number--;
                } // respawn
            }
        }
    }

    /* =====================================================================================
        SPECIAL THINGS AND STUFF
        =======================================================================================*/

    static specialTab = '';
    static specialTabHovered = '';
    /**
     * @type {string[]}
     */
    static specialTabs = [];

    static UpdateSpecial() {
        Game.specialTabs = [];
        if (Game.Has('A festive hat')) Game.specialTabs.push('santa');
        if (Game.Has('A crumbly egg')) Game.specialTabs.push('dragon');
        if (Game.specialTabs.length === 0) {
            Game.ToggleSpecialMenu(0);
            return;
        }

        if (Game.LeftBackground) {
            Game.specialTabHovered = '';
            let len = Game.specialTabs.length;
            if (len == 0) return;
            let y = Game.LeftBackground.canvas.height - 24 - 48 * len;
            for (let i = 0; i < Game.specialTabs.length; i++) {
                let selected = 0;
                if (Game.specialTab == Game.specialTabs[i]) selected = 1;
                let x = 24;
                let s = 1;
                if (selected) {
                    s = 2;
                    x += 24;
                }

                if (Math.abs(Game.mouseX - x) <= 24 * s && Math.abs(Game.mouseY - y) <= 24 * s) {
                    Game.specialTabHovered = Game.specialTabs[i];
                    Game.mousePointer = 1;
                    Game.CanClick = 0;
                    if (Game.Click && Game.lastClickedEl === $('backgroundLeftCanvas')) {
                        if (Game.specialTab != Game.specialTabs[i]) {
                            Game.specialTab = Game.specialTabs[i];
                            Game.ToggleSpecialMenu(1);
                            PlaySound('snd/press.mp3');
                        } else {
                            Game.ToggleSpecialMenu(0);
                            PlaySound('snd/press.mp3');
                        }
                    }
                }

                y += 48;
            }
        }
    }

    static santaLevels = [
        'Festive test tube',
        'Festive ornament',
        'Festive wreath',
        'Festive tree',
        'Festive present',
        'Festive elf fetus',
        'Elf toddler',
        'Elfling',
        'Young elf',
        'Bulky elf',
        'Nick',
        'Santa Claus',
        'Elder Santa',
        'True Santa',
        'Final Claus'
    ];

    static UpgradeSanta() {
        let moni = Math.pow(Game.santaLevel + 1, Game.santaLevel + 1);
        if (Game.cookies > moni && Game.santaLevel < 14) {
            PlaySound('snd/shimmerClick.mp3');

            Game.Spend(moni);
            Game.santaLevel = (Game.santaLevel + 1) % 15;
            if (Game.santaLevel == 14) {
                Game.Unlock('Santa\'s dominion');
                Game.Notify(loc('You are granted %1.', Game.Upgrades['Santa\'s dominion'].dname), '', Game.Upgrades['Santa\'s dominion'].icon);
            }
            let drops = [];
            for (let i in Game.santaDrops) {
                if (!Game.HasUnlocked(Game.santaDrops[i])) drops.push(Game.santaDrops[i]);
            }
            let drop = choose(drops);
            if (drop) {
                Game.Unlock(drop);
                Game.Notify(
                    loc('Found a present!'),
                    loc('You find a present which contains...') + '<br><b>' + Game.Upgrades[drop].dname + '</b>!',
                    Game.Upgrades[drop].icon
                );
            }

            Game.ToggleSpecialMenu(1);

            if ($('specialPic')) {
                const rect = $('specialPic', true).getBounds();
                Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
            }

            if (Game.santaLevel >= 6) Game.Win('Coming to town');
            if (Game.santaLevel >= 14) Game.Win('All hail Santa');
            Game.recalculateGains = 1;
            Game.upgradesToRebuild = 1;
        }
    }

    static dragonLevels = [
        {
            name: 'Dragon egg',
            action: loc('Chip it'),
            pic: 0,
            cost: function () {
                return Game.cookies >= 1000000;
            },
            buy: function () {
                Game.Spend(1000000);
            },
            costStr: function () {
                return loc('%1 cookie', LBeautify(1000000));
            }
        },
        {
            name: 'Dragon egg',
            action: loc('Chip it'),
            pic: 1,
            cost: function () {
                return Game.cookies >= 1000000 * 2;
            },
            buy: function () {
                Game.Spend(1000000 * 2);
            },
            costStr: function () {
                return loc('%1 cookie', LBeautify(1000000 * 2));
            }
        },
        {
            name: 'Dragon egg',
            action: loc('Chip it'),
            pic: 2,
            cost: function () {
                return Game.cookies >= 1000000 * 4;
            },
            buy: function () {
                Game.Spend(1000000 * 4);
            },
            costStr: function () {
                return loc('%1 cookie', LBeautify(1000000 * 4));
            }
        },
        {
            name: 'Shivering dragon egg',
            action: loc('Hatch it'),
            pic: 3,
            cost: function () {
                return Game.cookies >= 1000000 * 8;
            },
            buy: function () {
                Game.Spend(1000000 * 8);
            },
            costStr: function () {
                return loc('%1 cookie', LBeautify(1000000 * 8));
            }
        },
        {
            name: 'Krumblor, cookie hatchling',
            action: 'Train Breath of Milk<br><small>Aura : kittens are 5% more effective</small>',
            pic: 4,
            cost: function () {
                return Game.cookies >= 1000000 * 16;
            },
            buy: function () {
                Game.Spend(1000000 * 16);
            },
            costStr: function () {
                return loc('%1 cookie', LBeautify(1000000 * 16));
            }
        },
        {
            name: 'Krumblor, cookie hatchling',
            action: 'Train Dragon Cursor<br><small>Aura : clicking is 5% more effective</small>',
            pic: 4
        },
        {
            name: 'Krumblor, cookie hatchling',
            action: 'Train Elder Battalion<br><small>Aura : grandmas gain +1% CpS for every non-grandma building</small>',
            pic: 4
        },
        {
            name: 'Krumblor, cookie hatchling',
            action: 'Train Reaper of Fields<br><small>Aura : golden cookies may trigger a Dragon Harvest</small>',
            pic: 4
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Earth Shatterer<br><small>Aura : buildings sell back for 50% instead of 25%</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Master of the Armory<br><small>Aura : all upgrades are 2% cheaper</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Fierce Hoarder<br><small>Aura : all buildings are 2% cheaper</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Dragon God<br><small>Aura : prestige CpS bonus +5%</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Arcane Aura<br><small>Aura : golden cookies appear 5% more often</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Dragonflight<br><small>Aura : golden cookies may trigger a Dragonflight</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Ancestral Metamorphosis<br><small>Aura : golden cookies give 10% more cookies</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Unholy Dominion<br><small>Aura : wrath cookies give 10% more cookies</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Epoch Manipulator<br><small>Aura : golden cookie effects last 5% longer</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Mind Over Matter<br><small>Aura : +25% random drops</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Radiant Appetite<br><small>Aura : all cookie production multiplied by 2</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Dragon\'s Fortune<br><small>Aura : +123% CpS per golden cookie on-screen</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Dragon\'s Curve<br><small>Aura : sugar lumps grow 5% faster, 50% weirder</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Reality Bending<br><small>Aura : 10% of every other aura, combined</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Dragon Orbs<br><small>Aura : selling your best building may grant a wish</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: 'Train Supreme Intellect<br><small>Aura : confers various powers to your minigames</small>',
            pic: 5
        },
        {
            name: 'Krumblor, cookie dragon',
            action: loc('Bake dragon cookie') + '<br><small>' + loc('Delicious!') + '</small>',
            pic: 6,
            cost: function () {
                let fail = 0;
                for (let i in Game.Objects) {
                    if (Game.Objects[i].amount < 50) fail = 1;
                }
                return fail == 0;
            },
            buy: function () {
                for (let i in Game.Objects) {
                    Game.Objects[i].sacrifice(50);
                }
                Game.Unlock('Dragon cookie');
            },
            costStr: function () {
                return loc('%1 of every building', 50);
            }
        },
        {
            name: 'Krumblor, cookie dragon',
            action: loc('Train secondary aura') + '<br><small>' + loc('Lets you use two dragon auras simultaneously') + '</small>',
            pic: 7,
            cost: function () {
                let fail = 0;
                for (let i in Game.Objects) {
                    if (Game.Objects[i].amount < 200) fail = 1;
                }
                return fail == 0;
            },
            buy: function () {
                for (let i in Game.Objects) {
                    Game.Objects[i].sacrifice(200);
                }
            },
            costStr: function () {
                return loc('%1 of every building', 200);
            }
        },
        {
            name: 'Krumblor, cookie dragon',
            action: loc('Your dragon is fully trained.'),
            pic: 8
        }
    ];

    /**
     * @type {Record<
     *      0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20,
     *      {
     *          name: string; pic: [number, number]; desc: string | string[];
     *          dname?: string; id?: number;
     *      }
     * >}
     */
    static dragonAuras = {
        0: {
            name: 'No aura',
            pic: [0, 7],
            desc: loc('Select an aura from those your dragon knows.')
        },
        1: {
            name: 'Breath of Milk',
            pic: [18, 25],
            desc: loc('Kittens are <b>%1%</b> more effective.', 5)
        },
        2: {
            name: 'Dragon Cursor',
            pic: [0, 25],
            desc: loc('Clicking is <b>%1%</b> more powerful.', 5)
        },
        3: {
            name: 'Elder Battalion',
            pic: [1, 25],
            desc: loc('Grandmas gain <b>+%1% CpS</b> for each non-grandma building.', 1)
        },
        4: {
            name: 'Reaper of Fields',
            pic: [2, 25],
            desc: loc('Golden cookies may trigger a <b>Dragon Harvest</b>.')
        },
        5: {
            name: 'Earth Shatterer',
            pic: [3, 25],
            desc: loc('Buildings sell back for <b>%1%</b> instead of %2%.', [50, 25])
        },
        6: {
            name: 'Master of the Armory',
            pic: [4, 25],
            desc: loc('All upgrades are <b>%1% cheaper</b>.', 2)
        },
        7: {
            name: 'Fierce Hoarder',
            pic: [15, 25],
            desc: loc('All buildings are <b>%1% cheaper</b>.', 2)
        },
        8: {
            name: 'Dragon God',
            pic: [16, 25],
            desc: loc('<b>+%1%</b> prestige level effect on CpS.', 5)
        },
        9: {
            name: 'Arcane Aura',
            pic: [17, 25],
            desc: loc('Golden cookies appear <b>%1%</b> more often.', 5)
        },
        10: {
            name: 'Dragonflight',
            pic: [5, 25],
            desc: loc('Golden cookies may trigger a <b>Dragonflight</b>.')
        },
        11: {
            name: 'Ancestral Metamorphosis',
            pic: [6, 25],
            desc: loc('Golden cookies give <b>%1%</b> more cookies.', 10)
        },
        12: {
            name: 'Unholy Dominion',
            pic: [7, 25],
            desc: loc('Wrath cookies give <b>%1%</b> more cookies.', 10)
        },
        13: {
            name: 'Epoch Manipulator',
            pic: [8, 25],
            desc: loc('Golden cookies stay <b>%1%</b> longer.', 5)
        },
        14: {
            name: 'Mind Over Matter',
            pic: [13, 25],
            desc: loc('Random drops are <b>%1% more common</b>.', 25)
        },
        15: {
            name: 'Radiant Appetite',
            pic: [14, 25],
            desc: loc('All cookie production <b>multiplied by %1</b>.', 2)
        },
        16: {
            name: 'Dragon\'s Fortune',
            pic: [19, 25],
            desc: loc('<b>+%1% CpS</b> per golden cookie on-screen, multiplicative.', 123)
        },
        17: {
            name: 'Dragon\'s Curve',
            pic: [20, 25],
            desc: loc('<b>+%1%</b> sugar lump growth.', 5) + ' ' + loc('Sugar lumps are <b>twice as likely</b> to be unusual.')
        },
        18: {
            name: 'Reality Bending',
            pic: [32, 25],
            desc: loc('<b>One tenth</b> of every other dragon aura, <b>combined</b>.')
        },
        19: {
            name: 'Dragon Orbs',
            pic: [33, 25],
            desc: loc('With no buffs and no golden cookies on screen, selling your most powerful building has <b>%1% chance to summon one</b>.', 10)
        },
        20: {
            name: 'Supreme Intellect',
            pic: [34, 25],
            desc: loc('Confers various powers to your minigames while active.<br>See the bottom of each minigame for more details.')
        }
    };

    /** @type {Record<string, typeof Game.dragonAuras[0]>} */
    static dragonAurasBN = {};

    /**
     * @param {string} what
     */
    static hasAura(what) {
        return Game.dragonAuras[Game.dragonAura].name == what || Game.dragonAuras[Game.dragonAura2].name == what ? true : false;
    }
    /**
     * @param {string} what
     */
    static auraMult(what) {
        let n = 0;
        if (Game.dragonAuras[Game.dragonAura].name == what || Game.dragonAuras[Game.dragonAura2].name == what) n = 1;
        if (
            (Game.dragonAuras[Game.dragonAura].name == 'Reality Bending' || Game.dragonAuras[Game.dragonAura2].name == 'Reality Bending') &&
                Game.dragonLevel >= (Game.dragonAurasBN[what].id || 0) + 4
        )
            n += 0.1;
        return n;
    }

    /**
     * @param {string | number} slot
     * @param {number} update
     */
    static SelectDragonAura(slot, update) {
        let currentAura;
        let otherAura;
        currentAura = slot == 0 ? Game.dragonAura : Game.dragonAura2;
        otherAura = slot == 0 ? Game.dragonAura2 : Game.dragonAura;
        if (!update) Game.SelectingDragonAura = currentAura;

        let str = '';
        for (let i in Game.dragonAuras) {
            if (Game.dragonLevel >= Number.parseInt(i) + 4) {
                const icon = Game.dragonAuras[/** @type {keyof typeof Game.dragonAuras} */ (Number(i))].pic;
                if (Number(i) === 0 || Number(i) !== otherAura)
                    str +=
                            '<div class="crate enabled' +
                            (Number(i) == Game.SelectingDragonAura ? ' highlighted' : '') +
                            '" style="opacity:1;float:none;display:inline-block;' +
                            writeIcon(icon) +
                            '" ' +
                            Game.clickStr +
                            '="PlaySound(\'snd/tick.mp3\');Game.SetDragonAura(' +
                            i +
                            ',' +
                            slot +
                            ');" onMouseOut="Game.DescribeDragonAura(' +
                            Game.SelectingDragonAura +
                            ');" onMouseOver="Game.DescribeDragonAura(' +
                            i +
                            ');"' +
                            '></div>';
            }
        }

        /** @type {CookieObject | 0} */
        let highestBuilding = 0;
        for (let i in Game.Objects) {
            if (Game.Objects[i].amount > 0) highestBuilding = Game.Objects[i];
        }

        Game.Prompt(
            '<id PickDragonAura><h3>' +
                loc(slot == 1 ? 'Set your dragon\'s secondary aura' : 'Set your dragon\'s aura') +
                '</h3>' +
                '<div class="line"></div>' +
                '<div id="dragonAuraInfo" style="min-height:60px;"></div>' +
                '<div style="text-align:center;">' +
                str +
                '</div>' +
                '<div class="line"></div>' +
                '<div style="text-align:center;margin-bottom:8px;">' +
                (highestBuilding === 0
                    ? loc('Switching your aura is <b>free</b> because you own no buildings.')
                    : loc(
                        'The cost of switching your aura is <b>%1</b>.<br>This will affect your CpS!',
                        loc('%1 ' + highestBuilding.bsingle, LBeautify(1))
                    )) +
                '</div>',
            [
                [
                    loc('Confirm'),
                    (slot == 0 ? 'Game.dragonAura' : 'Game.dragonAura2') +
                        '=Game.SelectingDragonAura;' +
                        (highestBuilding == 0 || currentAura == Game.SelectingDragonAura
                            ? ''
                            : 'Game.ObjectsById[' + highestBuilding.id + '].sacrifice(1);') +
                        'Game.ToggleSpecialMenu(1);Game.ClosePrompt();'
                ],
                loc('Cancel')
            ],
            0,
            'widePrompt'
        );
        Game.DescribeDragonAura(Game.SelectingDragonAura);
    }
    /** @type {keyof typeof Game.dragonAuras} */
    // @ts-expect-error these bad "null" values will be the death of me
    static SelectingDragonAura = -1;
    /**
     * @param {keyof typeof Game.dragonAuras} aura
     * @param {any} slot
     */
    static SetDragonAura(aura, slot) {
        Game.SelectingDragonAura = aura;
        Game.SelectDragonAura(slot, 1);
    }
    /**
     * @param {keyof typeof Game.dragonAuras} aura
     */
    static DescribeDragonAura(aura) {
        $('dragonAuraInfo', true).innerHTML =
                '<div style="min-width:200px;text-align:center;"><h4>' +
                Game.dragonAuras[aura].dname +
                '</h4>' +
                '<div class="line"></div>' +
                Game.dragonAuras[aura].desc +
                '</div>';
    }

    static UpgradeDragon() {
        if (
            Game.dragonLevel < Game.dragonLevels.length - 1 &&
            ASSERT_NOT_NULL(Game.dragonLevels[Game.dragonLevel].cost)()
        ) {
            PlaySound('snd/shimmerClick.mp3');
            ASSERT_NOT_NULL(Game.dragonLevels[Game.dragonLevel].buy)();
            Game.dragonLevel = (Game.dragonLevel + 1) % Game.dragonLevels.length;

            if (Game.dragonLevel >= Game.dragonLevels.length - 1) Game.Win('Here be dragon');
            Game.ToggleSpecialMenu(1);
            if ($('specialPic')) {
                const rect = $('specialPic', true).getBounds();
                Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
            }
            Game.recalculateGains = 1;
            Game.upgradesToRebuild = 1;
        }
    }

    static lastClickedSpecialPic = 0;
    static ClickSpecialPic() {
        if (Game.specialTab == 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon') && $('specialPic')) {
            triggerAnim($('specialPic'), 'pucker');
            PlaySound('snd/click' + Math.floor(Math.random() * 7 + 1) + '.mp3', 0.5);
            if (Date.now() - Game.lastClickedSpecialPic > 2000) PlaySound('snd/growl.mp3');
            Game.lastClickedSpecialPic = Date.now();
            if (Game.prefs.particles) {
                Game.particleAdd(Game.mouseX, Game.mouseY - 32, Math.random() * 4 - 2, Math.random() * -2 - 4, Math.random() * 0.2 + 0.5, 1, 2, [20, 3]);
            }
            if (Game.dragonLevel >= 8 && Math.random() < 1 / 20) {
                Math.seedrandom(Game.seed + '/dragonTime');
                let drops = ['Dragon scale', 'Dragon claw', 'Dragon fang', 'Dragon teddy bear'];
                drops = shuffle(drops);
                let drop = drops[Math.floor((new Date().getMinutes() / 60) * drops.length)];
                if (!Game.Has(drop) && !Game.HasUnlocked(drop)) {
                    Game.Unlock(drop);
                    Game.Notify(drop, '<b>' + loc('Your dragon dropped something!') + '</b>', Game.Upgrades[drop].icon);
                }
                Math.seedrandom();
            }
        }
    }

    /**
     * @param {number} on
     */
    static ToggleSpecialMenu(on) {
        if (on) {
            let pic = '';
            let frame = 0;
            if (Game.specialTab == 'santa') {
                pic = 'santa.png';
                frame = Game.santaLevel;
            } else if (Game.specialTab == 'dragon') {
                pic = 'dragon.png?v=' + Game.version;
                frame = Game.dragonLevels[Game.dragonLevel].pic;
            } else {
                pic = 'dragon.png?v=' + Game.version;
                frame = 4;
            }

            let str =
                    '<div id="specialPic" ' +
                    Game.clickStr +
                    '="Game.ClickSpecialPic();" style="' +
                    (Game.specialTab == 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon') ? 'cursor:pointer;' : '') +
                    'position:absolute;left:-16px;top:-64px;width:96px;height:96px;background:url(img/' +
                    pic +
                    ');background-position:' +
                    -frame * 96 +
                    'px 0px;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);"></div>';
            str += '<div class="close" onclick="PlaySound(\'snd/press.mp3\');Game.ToggleSpecialMenu(0);">x</div>';

            if (Game.specialTab == 'santa') {
                let moni = Math.pow(Game.santaLevel + 1, Game.santaLevel + 1);

                str += '<h3 style="pointer-events:none;">' + Game.santaLevels[Game.santaLevel] + '</h3>';
                if (Game.santaLevel < 14) {
                    str +=
                            '<div class="line"></div>' +
                            '<div class="optionBox" style="margin-bottom:0px;"><a class="option framed large title" ' +
                            Game.clickStr +
                            '="Game.UpgradeSanta();">' +
                            '<div style="display:table-cell;vertical-align:middle;">' +
                            loc('Evolve') +
                            '</div>' +
                            '<div style="display:table-cell;vertical-align:middle;padding:4px 12px;">|</div>' +
                            '<div style="display:table-cell;vertical-align:middle;font-size:65%;">' +
                            loc(
                                'sacrifice %1',
                                '<div' +
                                (Game.cookies > moni ? '' : ' style="color:#777;"') +
                                '>' +
                                loc('%1 cookie', LBeautify(Math.pow(Game.santaLevel + 1, Game.santaLevel + 1))) +
                                '</div>'
                            ) +
                            '</div>' +
                            '</a></div>';
                }
            } else if (Game.specialTab == 'dragon') {
                let level = Game.dragonLevels[Game.dragonLevel];

                str += '<h3 style="pointer-events:none;">' + level.name + '</h3>';

                if (Game.dragonLevel >= 5) {
                    let icon = Game.dragonAuras[Game.dragonAura].pic;
                    str +=
                            '<div class="crate enabled" style="opacity:1;position:absolute;right:18px;top:-58px;' +
                            writeIcon(icon) +
                            '" ' +
                            Game.clickStr +
                            '="PlaySound(\'snd/tick.mp3\');Game.SelectDragonAura(0);" ' +
                            Game.getTooltip(
                                '<div style="min-width:200px;text-align:center;" id="tooltipDragonAuraSelect"><h4>' +
                                Game.dragonAuras[Game.dragonAura].dname +
                                '</h4>' +
                                '<div class="line"></div>' +
                                Game.dragonAuras[Game.dragonAura].desc +
                                '</div>',
                                'top'
                            ) +
                            '></div>';
                }
                if (Game.dragonLevel >= 26) {
                    // 2nd aura slot; increased with last building (cortex baker)
                    let icon = Game.dragonAuras[Game.dragonAura2].pic;
                    str +=
                            '<div class="crate enabled" style="opacity:1;position:absolute;right:80px;top:-58px;' +
                            writeIcon(icon) +
                            '" ' +
                            Game.clickStr +
                            '="PlaySound(\'snd/tick.mp3\');Game.SelectDragonAura(1);" ' +
                            Game.getTooltip(
                                '<div style="min-width:200px;text-align:center;" id="tooltipDragonAuraSelect2"><h4>' +
                                Game.dragonAuras[Game.dragonAura2].dname +
                                '</h4>' +
                                '<div class="line"></div>' +
                                Game.dragonAuras[Game.dragonAura2].desc +
                                '</div>',
                                'top'
                            ) +
                            '></div>';
                }

                str += Game.dragonLevel < Game.dragonLevels.length - 1 ? '<div class="line"></div>' +
                            '<div class="optionBox" style="margin-bottom:0px;"><a class="option framed large title" ' +
                            Game.clickStr +
                            '="Game.UpgradeDragon();">' +
                            '<div style="display:table-cell;vertical-align:middle;">' +
                            level.action +
                            '</div>' +
                            '<div style="display:table-cell;vertical-align:middle;padding:4px 12px;">|</div>' +
                            '<div style="display:table-cell;vertical-align:middle;font-size:65%;">' +
                            loc(
                                'sacrifice %1',
                                '<div' + (ASSERT_NOT_NULL(level.cost)() ? '' : ' style="color:#777;"') + '>' +
                                ASSERT_NOT_NULL(level.costStr)() + '</div>'
                            ) +
                            '</div>' +
                            '</a></div>' : '<div class="line"></div>' + '<div style="text-align:center;margin-bottom:4px;">' + level.action + '</div>';
            }

            $('specialPopup', true).innerHTML = str;

            $('specialPopup', true).className = 'framed prompt onScreen';
        } else {
            if (Game.specialTab != '') {
                Game.specialTab = '';
                $('specialPopup', true).className = 'framed prompt offScreen';
                setTimeout(function () {
                    if (Game.specialTab == '') {
                        $('specialPopup', true).innerHTML = '';
                    }
                }, 1000 * 0.2);
            }
        }
    }
    static DrawSpecial() {
        let len = Game.specialTabs.length;
        if (len == 0) return;
        Game.LeftBackground.globalAlpha = 1;
        let y = Game.LeftBackground.canvas.height - 24 - 48 * len;
        let tabI = 0;

        for (let i in Game.specialTabs) {
            let selected = 0;
            let hovered = 0;
            if (Game.specialTab == Game.specialTabs[i]) selected = 1;
            if (Game.specialTabHovered == Game.specialTabs[i]) hovered = 1;
            let x = 24;
            let s = 1;
            let pic = '';
            let frame = 0;
            if (hovered) {
                s = 1;
                x = 24;
            }
            if (selected) {
                s = 1;
                x = 48;
            }

            if (Game.specialTabs[i] == 'santa') {
                pic = 'santa.png';
                frame = Game.santaLevel;
            } else if (Game.specialTabs[i] == 'dragon') {
                pic = 'dragon.png?v=' + Game.version;
                frame = Game.dragonLevels[Game.dragonLevel].pic;
            } else {
                pic = 'dragon.png?v=' + Game.version;
                frame = 4;
            }

            if (hovered || selected) {
                let ss = s * 64;
                let r = Math.floor((Game.T * 0.5) % 360);
                Game.LeftBackground.save();
                Game.LeftBackground.translate(x, y);
                if (Game.prefs.fancy) Game.LeftBackground.rotate((r / 360) * Math.PI * 2);
                Game.LeftBackground.globalAlpha = 0.75;
                Game.LeftBackground.drawImage(Pic('shine.png'), -ss / 2, -ss / 2, ss, ss);
                Game.LeftBackground.restore();
            }

            if (Game.prefs.fancy)
                Game.LeftBackground.drawImage(
                    Pic(pic),
                    96 * frame,
                    0,
                    96,
                    96,
                    x + (selected ? 0 : Math.sin(Game.T * 0.2 + tabI) * 3) - 24 * s,
                    y - (selected ? 6 : Math.abs(Math.cos(Game.T * 0.2 + tabI)) * 6) - 24 * s,
                    48 * s,
                    48 * s
                );
            else Game.LeftBackground.drawImage(Pic(pic), 96 * frame, 0, 96, 96, x - 24 * s, y - 24 * s, 48 * s, 48 * s);

            tabI++;
            y += 48;
        }
    }

    /* =====================================================================================
        VISUAL EFFECTS
        =======================================================================================*/

    static _AllMilks = [
        { name: 'Automatic', icon: [0, 7], type: -1, pic: 'milkPlain' },
        { name: 'Plain milk', icon: [1, 8], type: 0, pic: 'milkPlain' },
        {
            name: 'Chocolate milk',
            icon: [2, 8],
            type: 0,
            pic: 'milkChocolate'
        },
        {
            name: 'Raspberry milk',
            icon: [3, 8],
            type: 0,
            pic: 'milkRaspberry'
        },
        { name: 'Orange milk', icon: [4, 8], type: 0, pic: 'milkOrange' },
        { name: 'Caramel milk', icon: [5, 8], type: 0, pic: 'milkCaramel' },
        { name: 'Banana milk', icon: [6, 8], type: 0, pic: 'milkBanana' },
        { name: 'Lime milk', icon: [7, 8], type: 0, pic: 'milkLime' },
        {
            name: 'Blueberry milk',
            icon: [8, 8],
            type: 0,
            pic: 'milkBlueberry'
        },
        {
            name: 'Strawberry milk',
            icon: [9, 8],
            type: 0,
            pic: 'milkStrawberry'
        },
        {
            name: 'Vanilla milk',
            icon: [10, 8],
            type: 0,
            pic: 'milkVanilla'
        },
        { name: 'Zebra milk', icon: [10, 7], type: 1, pic: 'milkZebra' },
        { name: 'Cosmic milk', icon: [9, 7], type: 1, pic: 'milkStars' },
        { name: 'Flaming milk', icon: [8, 7], type: 1, pic: 'milkFire' },
        { name: 'Sanguine milk', icon: [7, 7], type: 1, pic: 'milkBlood' },
        { name: 'Midas milk', icon: [6, 7], type: 1, pic: 'milkGold' },
        { name: 'Midnight milk', icon: [5, 7], type: 1, pic: 'milkBlack' },
        {
            name: 'Green inferno milk',
            icon: [4, 7],
            type: 1,
            pic: 'milkGreenFire'
        },
        {
            name: 'Frostfire milk',
            icon: [3, 7],
            type: 1,
            pic: 'milkBlueFire'
        },
        { name: 'Honey milk', icon: [21, 23], type: 0, pic: 'milkHoney' },
        { name: 'Coffee milk', icon: [22, 23], type: 0, pic: 'milkCoffee' },
        { name: 'Tea milk', icon: [23, 23], type: 0, pic: 'milkTea' },
        {
            name: 'Coconut milk',
            icon: [24, 23],
            type: 0,
            pic: 'milkCoconut'
        },
        { name: 'Cherry milk', icon: [25, 23], type: 0, pic: 'milkCherry' },
        { name: 'Soy milk', icon: [27, 23], type: 1, pic: 'milkSoy' },
        { name: 'Spiced milk', icon: [26, 23], type: 0, pic: 'milkSpiced' },
        { name: 'Maple milk', icon: [28, 23], type: 0, pic: 'milkMaple' },
        { name: 'Mint milk', icon: [29, 23], type: 0, pic: 'milkMint' },
        {
            name: 'Licorice milk',
            icon: [30, 23],
            type: 0,
            pic: 'milkLicorice'
        },
        { name: 'Rose milk', icon: [31, 23], type: 0, pic: 'milkRose' },
        {
            name: 'Dragonfruit milk',
            icon: [21, 24],
            type: 0,
            pic: 'milkDragonfruit'
        },
        { name: 'Melon milk', icon: [22, 24], type: 0, pic: 'milkMelon' },
        {
            name: 'Blackcurrant milk',
            icon: [23, 24],
            type: 0,
            pic: 'milkBlackcurrant'
        }
    ];
    /**
     * @type {{
     *      [K in keyof typeof Game._AllMilks]: typeof Game._AllMilks[K]
     *          & { rank?: number; bname?: string; }
     * }}
     */
    static AllMilks = Game._AllMilks;

    /**
     * @type {any[]}
     */
    static Milks = [];
    static Milk = Game.Milks[0];

    static mousePointer = 0; // when 1, draw the mouse as a pointer on the left screen

    static cookieOriginX = 0;
    static cookieOriginY = 0;
    static DrawBackground() {
        Timer.clean();
        // background
        if (!Game.Background) {
            // init some stuff
            const bgCanvasEl = /** @type {HTMLCanvasElement} */ ($('backgroundCanvas', true));
            const bgLeftCanvasEl = /** @type {HTMLCanvasElement} */ ($('backgroundLeftCanvas', true));
            Game.Background = ASSERT_NOT_NULL(bgCanvasEl.getContext('2d'));
            Game.Background.canvas.width = ASSERT_NOT_NULL(Game.Background.canvas.parentNode).offsetWidth;
            Game.Background.canvas.height = ASSERT_NOT_NULL(Game.Background.canvas.parentNode).offsetHeight;
            Game.LeftBackground = ASSERT_NOT_NULL(bgLeftCanvasEl.getContext('2d'));
            Game.LeftBackground.canvas.width = ASSERT_NOT_NULL(Game.LeftBackground.canvas.parentNode).offsetWidth;
            Game.LeftBackground.canvas.height = ASSERT_NOT_NULL(Game.LeftBackground.canvas.parentNode).offsetHeight;
            // preload ascend animation bits so they show up instantly
            Game.LeftBackground.globalAlpha = 0;
            Game.LeftBackground.drawImage(Pic('brokenCookie.png'), 0, 0);
            Game.LeftBackground.drawImage(Pic('brokenCookieHalo.png'), 0, 0);
            Game.LeftBackground.drawImage(Pic('starbg.jpg'), 0, 0);

            window.addEventListener('resize', function (event) {
                Game.Background.canvas.width        = ASSERT_NOT_NULL(Game.Background.canvas.parentNode    ).offsetWidth;
                Game.Background.canvas.height       = ASSERT_NOT_NULL(Game.Background.canvas.parentNode    ).offsetHeight;
                Game.LeftBackground.canvas.width    = ASSERT_NOT_NULL(Game.LeftBackground.canvas.parentNode).offsetWidth;
                Game.LeftBackground.canvas.height   = ASSERT_NOT_NULL(Game.LeftBackground.canvas.parentNode).offsetHeight;
            });
        }

        let ctx = Game.LeftBackground;

        if (Game.OnAscend) {
            Timer.clean();
            // starry background on ascend screen
            let w = Game.Background.canvas.width;
            let h = Game.Background.canvas.height;
            let b = Game.ascendl.getBounds();
            let x = (b.left + b.right) / 2;
            let y = (b.top + b.bottom) / 2;
            Game.Background.globalAlpha = 0.5;
            let s = 1 * Game.AscendZoom * (1 + Math.cos(Game.T * 0.0027) * 0.05);
            Game.Background.fillPattern(Pic('starbg.jpg'), 0, 0, w, h, 1024 * s, 1024 * s, x + Game.AscendOffX * 0.25 * s, y + Game.AscendOffY * 0.25 * s);
            Timer.track('star layer 1');
            if (Game.prefs.fancy) {
                // additional star layer
                Game.Background.globalAlpha = 0.5 * (0.5 + Math.sin(Game.T * 0.02) * 0.3);
                let s = 2 * Game.AscendZoom * (1 + Math.sin(Game.T * 0.002) * 0.07);
                Game.Background.fillPattern(
                    Pic('starbg.jpg'),
                    0,
                    0,
                    w,
                    h,
                    1024 * s,
                    1024 * s,
                    x + Game.AscendOffX * 0.25 * s,
                    y + Game.AscendOffY * 0.25 * s
                );
                Timer.track('star layer 2');

                x = x + Game.AscendOffX * Game.AscendZoom;
                y = y + Game.AscendOffY * Game.AscendZoom;
                // wispy nebula around the center
                Game.Background.save();
                Game.Background.globalAlpha = 0.5;
                Game.Background.translate(x, y);
                Game.Background.globalCompositeOperation = 'lighter';
                Game.Background.rotate(Game.T * 0.001);
                s = (600 + 150 * Math.sin(Game.T * 0.007)) * Game.AscendZoom;
                Game.Background.drawImage(Pic('heavenRing1.jpg'), -s / 2, -s / 2, s, s);
                Game.Background.rotate(-Game.T * 0.0017);
                s = (600 + 150 * Math.sin(Game.T * 0.0037)) * Game.AscendZoom;
                Game.Background.drawImage(Pic('heavenRing2.jpg'), -s / 2, -s / 2, s, s);
                Game.Background.restore();
                Timer.track('nebula');
            }
        } else {
            let goodBuff = 0;
            let badBuff = 0;
            for (let i in Game.buffs) {
                if (Game.buffs[i].aura == 1) goodBuff = 1;
                if (Game.buffs[i].aura == 2) badBuff = 1;
            }

            if (Game.drawT % 5 == 0) {
                $('backgroundCanvas', true).style.background = 'transparent';
                Game.defaultBg = 'bgBlue';
                Game.bgR = 0;

                if (Game.season == 'fools') Game.defaultBg = 'bgMoney';
                if (Game.elderWrathD < 1 || Game.prefs.notScary) {
                    Game.bgR = 0;
                    Game.bg = Game.defaultBg;
                    Game.bgFade = Game.defaultBg;
                } else if (Game.elderWrathD >= 1 && Game.elderWrathD < 2) {
                    Game.bgR = (Game.elderWrathD - 1) / 1;
                    Game.bg = Game.defaultBg;
                    Game.bgFade = 'grandmas1';
                } else if (Game.elderWrathD >= 2 && Game.elderWrathD < 3) {
                    Game.bgR = (Game.elderWrathD - 2) / 1;
                    Game.bg = 'grandmas1';
                    Game.bgFade = 'grandmas2';
                } else if (Game.elderWrathD >= 3) {
                    // && Game.elderWrathD<4)
                    Game.bgR = (Game.elderWrathD - 3) / 1;
                    Game.bg = 'grandmas2';
                    Game.bgFade = 'grandmas3';
                }

                if (Game.bgType != 0 && Game.ascensionMode != 1) {
                    Game.bgR = 0;
                    Game.bg = Game.BGsByChoice[Game.bgType].pic;
                    Game.bgFade = Game.bg;
                }

                Game.Background.fillPattern(Pic(Game.bg + '.jpg'), 0, 0, Game.Background.canvas.width, Game.Background.canvas.height, 512, 512, 0, 0);
                if (Game.bgR > 0) {
                    Game.Background.globalAlpha = Game.bgR;
                    Game.Background.fillPattern(
                        Pic(Game.bgFade + '.jpg'),
                        0,
                        0,
                        Game.Background.canvas.width,
                        Game.Background.canvas.height,
                        512,
                        512,
                        0,
                        0
                    );
                }
                Game.Background.globalAlpha = 1;
                Game.Background.drawImage(Pic('shadedBordersSoft.png'), 0, 0, Game.Background.canvas.width, Game.Background.canvas.height);
            }
            Timer.track('window background');

            // clear
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            Timer.clean();

            let showDragon = 0;
            if (Game.hasBuff('Dragonflight') || Game.hasBuff('Dragon Harvest')) showDragon = 1;

            Game.cookieOriginX = Math.floor(ctx.canvas.width / 2);
            Game.cookieOriginY = Math.floor(ctx.canvas.height * 0.4);

            if (Game.AscendTimer == 0) {
                if (Game.prefs.particles) {
                    // falling cookies
                    let pic = '';
                    let opacity = 1;
                    if (Game.elderWrathD <= 1.5 || Game.prefs.notScary) {
                        if (Game.cookiesPs >= 1000) pic = 'cookieShower3.png';
                        else if (Game.cookiesPs >= 500) pic = 'cookieShower2.png';
                        else if (Game.cookiesPs >= 50) pic = 'cookieShower1.png';
                        else pic = '';
                    }
                    if (pic != '') {
                        if (Game.elderWrathD >= 1 && !Game.prefs.notScary) opacity = 1 - (Math.min(Game.elderWrathD, 1.5) - 1) / 0.5;
                        ctx.globalAlpha = opacity;
                        let y = Math.floor(Game.T * 2) % 512;
                        ctx.fillPattern(Pic(pic), 0, 0, ctx.canvas.width, ctx.canvas.height + 512, 512, 512, 0, y);
                        ctx.globalAlpha = 1;
                    }
                    // snow
                    if (Game.season == 'christmas') {
                        let y = Math.floor(Game.T * 2.5) % 512;
                        ctx.globalAlpha = 0.75;
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.fillPattern(Pic('snow2.jpg'), 0, 0, ctx.canvas.width, ctx.canvas.height + 512, 512, 512, 0, y);
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.globalAlpha = 1;
                    }
                    // hearts
                    if (Game.season == 'valentines') {
                        let y = Math.floor(Game.T * 2.5) % 512;
                        ctx.globalAlpha = 1;
                        ctx.fillPattern(Pic('heartStorm.png'), 0, 0, ctx.canvas.width, ctx.canvas.height + 512, 512, 512, 0, y);
                        ctx.globalAlpha = 1;
                    }
                    Timer.track('left background');

                    Game.particlesDraw(0);
                    ctx.globalAlpha = 1;
                    Timer.track('particles');

                    // big cookie shine
                    let s = 512;

                    let x = Game.cookieOriginX;
                    let y = Game.cookieOriginY;

                    let r = Math.floor((Game.T * 0.5) % 360);
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate((r / 360) * Math.PI * 2);
                    let alphaMult = 1;
                    if (Game.bgType == 2 || Game.bgType == 4) alphaMult = 0.5;
                    pic = 'shine.png';
                    if (goodBuff) {
                        pic = 'shineGold.png';
                        alphaMult = 1;
                    } else if (badBuff) {
                        pic = 'shineRed.png';
                        alphaMult = 1;
                    }
                    if (goodBuff && Game.prefs.fancy) ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.5 * alphaMult;
                    ctx.drawImage(Pic(pic), -s / 2, -s / 2, s, s);
                    ctx.rotate(((-r * 2) / 360) * Math.PI * 2);
                    ctx.globalAlpha = 0.25 * alphaMult;
                    ctx.drawImage(Pic(pic), -s / 2, -s / 2, s, s);
                    ctx.restore();
                    Timer.track('shine');

                    if (Game.ReincarnateTimer > 0) {
                        ctx.globalAlpha = 1 - Game.ReincarnateTimer / Game.ReincarnateDuration;
                        ctx.fillStyle = '#000';
                        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.globalAlpha = 1;
                    }

                    if (showDragon) {
                        // big dragon
                        let s = 300 * 2 * (1 + Math.sin(Game.T * 0.013) * 0.1);
                        let x = Game.cookieOriginX - s / 2;
                        let y = Game.cookieOriginY - s / (1.4 + 0.2 * Math.sin(Game.T * 0.01));
                        ctx.drawImage(Pic('dragonBG.png'), x, y, s, s);
                    }

                    // big cookie
                    {
                        ctx.globalAlpha = 1;
                        let s = 256 * Game.BigCookieSize;
                        let x = Game.cookieOriginX;
                        let y = Game.cookieOriginY;
                        ctx.save();
                        if (Game.prefs.fancy) ctx.drawImage(Pic('cookieShadow.png'), x - s / 2, y - s / 2 + 20, s, s);
                        ctx.translate(x, y);
                        if (Game.season == 'easter') {
                            let nestW = 304 * 0.98 * Game.BigCookieSize;
                            let nestH = 161 * 0.98 * Game.BigCookieSize;
                            ctx.drawImage(Pic('nest.png'), -nestW / 2, -nestH / 2 + 130, nestW, nestH);
                        }
                        ctx.drawImage(Pic('perfectCookie.png'), -s / 2, -s / 2, s, s);

                        if (goodBuff && Game.prefs.particles) {
                            // sparkle
                            ctx.globalCompositeOperation = 'lighter';
                            for (let i = 0; i < 1; i++) {
                                ctx.globalAlpha = Math.random() * 0.65 + 0.1;
                                let size = Math.random() * 30 + 5;
                                let a = Math.random() * Math.PI * 2;
                                let d = (s * 0.9 * Math.random()) / 2;
                                ctx.drawImage(Pic('glint.jpg'), -size / 2 + Math.sin(a) * d, -size / 2 + Math.cos(a) * d, size, size);
                            }
                        }

                        ctx.restore();
                        Timer.track('big cookie');
                    }
                } // no particles
                else {
                    let s, x, y;
                    // big cookie shine
                    s = 512;
                    x = Game.cookieOriginX - s / 2;
                    y = Game.cookieOriginY - s / 2;
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(Pic('shine.png'), x, y, s, s);

                    if (showDragon) {
                        // big dragon
                        s = 300 * 2 * (1 + Math.sin(Game.T * 0.013) * 0.1);
                        x = Game.cookieOriginX - s / 2;
                        y = Game.cookieOriginY - s / (1.4 + 0.2 * Math.sin(Game.T * 0.01));
                        ctx.drawImage(Pic('dragonBG.png'), x, y, s, s);
                    }

                    // big cookie
                    ctx.globalAlpha = 1;
                    s = 256 * Game.BigCookieSize;
                    x = Game.cookieOriginX - s / 2;
                    y = Game.cookieOriginY - s / 2;
                    if (Game.prefs.fancy) ctx.drawImage(Pic('cookieShadow.png'), x, y + 20, s, s);
                    ctx.drawImage(Pic('perfectCookie.png'), x, y, s, s);
                }

                // cursors
                if (Game.prefs.cursors) {
                    ctx.save();
                    ctx.translate(Game.cookieOriginX, Game.cookieOriginY);
                    let pic = Pic('cursor.png');
                    let fancy = Game.prefs.fancy;

                    if (showDragon) ctx.globalAlpha = 0.25;
                    let amount = Game.Objects['Cursor'].amount;
                    for (let i = 0; i < amount; i++) {
                        let n = Math.floor(i / 50);
                        let w = 0;
                        if (fancy) w = Math.sin(Game.T * 0.025 + (((i + n * 12) % 25) / 25) * Math.PI * 2);
                        if (w > 0.997) w = 1.5;
                        else if (w > 0.994) w = 0.5;
                        else w = 0;
                        w *= -4;
                        if (fancy) w += Math.sin(((n + Game.T * 0.01) * Math.PI) / 2) * 4;
                        let x = 0;
                        let y = 140 + n * 16 + w - 16;

                        let rot = 7.2;
                        if (i == 0 && fancy) rot -= Game.T * 0.1;
                        if (i % 50 == 0) rot += 7.2 / 2;
                        ctx.rotate((rot / 360) * Math.PI * 2);
                        ctx.drawImage(pic, 0, 0, 32, 32, x, y, 32, 32);
                    }
                    ctx.restore();
                    Timer.track('cursors');
                }
            } else {
                let tBase = Math.max(0, (Game.AscendTimer - Game.AscendBreakpoint) / (Game.AscendDuration - Game.AscendBreakpoint));
                // big crumbling cookie
                let t = Math.pow(tBase, 0.5);

                let shake = 0;
                if (Game.AscendTimer < Game.AscendBreakpoint) {
                    shake = Game.AscendTimer / Game.AscendBreakpoint;
                }

                ctx.globalAlpha = 1;

                let x = Game.cookieOriginX;
                let y = Game.cookieOriginY;

                x += (Math.random() * 2 - 1) * 10 * shake;
                y += (Math.random() * 2 - 1) * 10 * shake;

                let s = 1;
                if (tBase > 0) {
                    ctx.save();
                    ctx.globalAlpha = 1 - Math.pow(t, 0.5);
                    ctx.translate(x, y);
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.rotate(Game.T * 0.007);
                    s = 0.5 + Math.pow(tBase, 0.6) * 1;
                    let s2 = 600 * s;
                    ctx.drawImage(Pic('heavenRing1.jpg'), -s2 / 2, -s2 / 2, s2, s2);
                    ctx.rotate(-Game.T * 0.002);
                    s = 0.5 + Math.pow(1 - tBase, 0.4) * 1;
                    s2 = 600 * s;
                    ctx.drawImage(Pic('heavenRing2.jpg'), -s2 / 2, -s2 / 2, s2, s2);
                    ctx.restore();
                }

                s = 256;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(t * -0.1 * Math.PI * 2);

                const chunks = {
                    0: 7,
                    1: 6,
                    2: 3,
                    3: 2,
                    4: 8,
                    5: 1,
                    6: 9,
                    7: 5,
                    8: 0,
                    9: 4
                };
                s *= t / 2 + 1;

                ctx.globalAlpha = 1 - t;
                for (let i = 0; i < 10; i++) {
                    let d = t * (80 + ((i + 2) % 3) * 40);
                    let x2 = (Math.random() * 2 - 1) * 5 * shake;
                    let y2 = (Math.random() * 2 - 1) * 5 * shake;
                    ctx.drawImage(
                        Pic('brokenCookie.png'),
                        256 * chunks[/** @type {keyof typeof chunks} */ (i)],
                        0,
                        256,
                        256,
                        -s / 2 + Math.sin(-(((chunks[/** @type {keyof typeof chunks} */ (i)] + 4) % 10) / 10) * Math.PI * 2) * d + x2,
                        -s / 2 + Math.cos(-(((chunks[/** @type {keyof typeof chunks} */ (i)] + 4) % 10) / 10) * Math.PI * 2) * d + y2,
                        s,
                        s
                    );
                }
                let brokenHalo = 1 - Math.min(t / (1 / 3), 1 / 3) * 3;
                if (Game.AscendTimer < Game.AscendBreakpoint) brokenHalo = Game.AscendTimer / Game.AscendBreakpoint;
                ctx.globalAlpha = brokenHalo;
                ctx.drawImage(Pic('brokenCookieHalo.png'), -s / 1.3333, -s / 1.3333, s * 1.5, s * 1.5);

                ctx.restore();

                // flares
                let n = 9;
                t = Game.AscendTimer / Game.AscendBreakpoint;
                if (Game.AscendTimer < Game.AscendBreakpoint) {
                    ctx.save();
                    ctx.translate(x, y);
                    for (let i = 0; i < n; i++) {
                        if (Math.floor((t / 3) * n * 3 + i * 2.7) % 2) {
                            let t2 = Math.pow(((t / 3) * n * 3 + i * 2.7) % 1, 1.5);
                            ctx.globalAlpha = (1 - t) * (Game.drawT % 2 == 0 ? 0.5 : 1);
                            let sw = (1 - t2 * 0.5) * 96;
                            let sh = (0.5 + t2 * 1.5) * 96;
                            ctx.drawImage(Pic('shineSpoke.png'), -sw / 2, -sh - 32 - (1 - t2) * 256, sw, sh);
                        }
                        ctx.rotate((Math.PI * 2) / n);
                    }
                    ctx.restore();
                }

                // flash at breakpoint
                if (tBase < 0.1 && tBase > 0) {
                    ctx.globalAlpha = 1 - tBase / 0.1;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    ctx.globalAlpha = 1;
                }
                if (tBase > 0.8) {
                    ctx.globalAlpha = (tBase - 0.8) / 0.2;
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    ctx.globalAlpha = 1;
                }
            }

            // milk and milk accessories
            if (Game.prefs.milk) {
                let width = ctx.canvas.width;
                let height = ctx.canvas.height;
                let x = Math.floor((Game.T * 2 - (Game.milkH - Game.milkHd) * 2000 + 480 * 2) % 480);
                let y = Game.milkHd * height;
                let a = 1;
                if (Game.AscendTimer > 0) {
                    y *= 1 - Math.pow(Game.AscendTimer / Game.AscendBreakpoint, 2) * 2;
                    a *= 1 - Math.pow(Game.AscendTimer / Game.AscendBreakpoint, 2) * 2;
                } else if (Game.ReincarnateTimer > 0) {
                    y *= 1 - Math.pow(1 - Game.ReincarnateTimer / Game.ReincarnateDuration, 2) * 2;
                    a *= 1 - Math.pow(1 - Game.ReincarnateTimer / Game.ReincarnateDuration, 2) * 2;
                }

                if (Game.TOYS) {
                    // golly
                    if (!Game.Toy) {
                        Game.toys = [];
                        Game.toysType = choose([1, 2]);
                        Game.Toy = function (/** @type {any} */ x, /** @type {any} */ y) {
                            this.id = Game.toys.length;
                            this.x = x;
                            this.y = y;
                            this.xd = Math.random() * 10 - 5;
                            this.yd = Math.random() * 10 - 5;
                            this.r = Math.random() * Math.PI * 2;
                            this.rd = Math.random() * 0.1 - 0.05;
                            let v = Math.random();
                            let a = 0.5;
                            let b = 0.5;
                            v = v <= a ? b - b * Math.pow(1 - v / a, 3) : b + (1 - b) * Math.pow((v - a) / (1 - a), 3);
                            this.s = (Game.toysType == 1 ? 64 : 48) * (0.1 + v * 1.9);
                            if (Game.toysType == 2) this.s = this.id % 10 == 1 ? 96 : 48;
                            this.st = this.s;
                            this.s = 0;
                            let cookies = [[10, 0]];
                            for (let i in Game.Upgrades) {
                                let cookie = Game.Upgrades[i];
                                if (cookie.bought > 0 && cookie.pool == 'cookie') cookies.push(cookie.icon);
                            }
                            this.icon = choose(cookies);
                            this.dragged = false;
                            this.l = document.createElement('div');
                            this.l.innerHTML = String(this.id);
                            this.l.style.cssText =
                                    'cursor:pointer;border-radius:' +
                                    this.s / 2 +
                                    'px;opacity:0;width:' +
                                    this.s +
                                    'px;height:' +
                                    this.s +
                                    'px;background:#999;position:absolute;left:0px;top:0px;z-index:10000000;transform:translate(-1000px,-1000px);';
                            $('sectionLeft', true).appendChild(this.l);
                            this.l.addEventListener(
                                'mousedown',
                                () => {
                                    this.dragged = true;
                                }
                            );
                            this.l.addEventListener(
                                'mouseup',
                                () => {
                                    this.dragged = false;
                                }
                            );
                            Game.toys.push(this);
                            return this;
                        };
                        for (let i = 0; i < Math.floor(Math.random() * 15 + (Game.toysType == 1 ? 5 : 30)); i++) {
                            new Game.Toy(Math.random() * width, Math.random() * height * 0.3);
                        }
                    }
                    ctx.globalAlpha = 0.5;
                    for (let i in Game.toys) {
                        let me = Game.toys[i];
                        ctx.save();
                        ctx.translate(me.x, me.y);
                        ctx.rotate(me.r);
                        if (Game.toysType == 1) ctx.drawImage(Pic('smallCookies.png'), (me.id % 8) * 64, 0, 64, 64, -me.s / 2, -me.s / 2, me.s, me.s);
                        else ctx.drawImage(Pic('icons.png'), me.icon[0] * 48, me.icon[1] * 48, 48, 48, -me.s / 2, -me.s / 2, me.s, me.s);
                        ctx.restore();
                    }
                    ctx.globalAlpha = 1;
                    for (let i in Game.toys) {
                        let me = Game.toys[i];
                        // psst... not real physics
                        for (let ii in Game.toys) {
                            let it = Game.toys[ii];
                            if (it.id != me.id) {
                                let x1 = me.x + me.xd;
                                let y1 = me.y + me.yd;
                                let x2 = it.x + it.xd;
                                let y2 = it.y + it.yd;
                                let dist = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / (me.s / 2 + it.s / 2);
                                if (dist < (Game.toysType == 1 ? 0.95 : 0.75)) {
                                    let angle = Math.atan2(y1 - y2, x1 - x2);
                                    let v1 = Math.sqrt(Math.pow(me.xd, 2) + Math.pow(me.yd, 2));
                                    let v2 = Math.sqrt(Math.pow(it.xd, 2) + Math.pow(it.yd, 2));
                                    let v = ((v1 + v2) / 2 + dist) * 0.75;
                                    let ratio = it.s / me.s;
                                    me.xd += Math.sin(-angle + Math.PI / 2) * v * ratio;
                                    me.yd += Math.cos(-angle + Math.PI / 2) * v * ratio;
                                    it.xd += Math.sin(-angle - Math.PI / 2) * v * (1 / ratio);
                                    it.yd += Math.cos(-angle - Math.PI / 2) * v * (1 / ratio);
                                    me.rd += (Math.random() * 1 - 0.5) * 0.1 * ratio;
                                    it.rd += (Math.random() * 1 - 0.5) * 0.1 * (1 / ratio);
                                    me.rd *= Math.min(1, v);
                                    it.rd *= Math.min(1, v);
                                }
                            }
                        }
                        if (me.y >= height - Game.milkHd * height + 8) {
                            me.xd *= 0.85;
                            me.yd *= 0.85;
                            me.rd *= 0.85;
                            me.yd -= 1;
                            me.xd += (Math.random() * 1 - 0.5) * 0.3;
                            me.yd += (Math.random() * 1 - 0.5) * 0.05;
                            me.rd += (Math.random() * 1 - 0.5) * 0.02;
                        } else {
                            me.xd *= 0.99;
                            me.rd *= 0.99;
                            me.yd += 1;
                        }
                        me.yd *= Math.min(1, Math.abs(me.y - (height - Game.milkHd * height) / 16));
                        me.rd += (me.xd * 0.01) / (me.s / (Game.toysType == 1 ? 64 : 48));
                        if (me.x < me.s / 2 && me.xd < 0) me.xd = Math.max(0.1, -me.xd * 0.6);
                        else if (me.x < me.s / 2) {
                            me.xd = 0;
                            me.x = me.s / 2;
                        }
                        if (me.x > width - me.s / 2 && me.xd > 0) me.xd = Math.min(-0.1, -me.xd * 0.6);
                        else if (me.x > width - me.s / 2) {
                            me.xd = 0;
                            me.x = width - me.s / 2;
                        }
                        me.xd = Math.min(Math.max(me.xd, -30), 30);
                        me.yd = Math.min(Math.max(me.yd, -30), 30);
                        me.rd = Math.min(Math.max(me.rd, -0.5), 0.5);
                        me.x += me.xd;
                        me.y += me.yd;
                        me.r += me.rd;
                        me.r = me.r % (Math.PI * 2);
                        me.s += (me.st - me.s) * 0.5;
                        if (Game.toysType == 2 && !me.dragged && Math.random() < 0.003) me.st = choose([48, 48, 48, 48, 96]);
                        if (me.dragged) {
                            me.x = Game.mouseX;
                            me.y = Game.mouseY;
                            me.xd += ((Game.mouseX - Game.mouseX2) * 3 - me.xd) * 0.5;
                            me.yd += ((Game.mouseY - Game.mouseY2) * 3 - me.yd) * 0.5;
                            me.l.style.transform = 'translate(' + (me.x - me.s / 2) + 'px,' + (me.y - me.s / 2) + 'px) scale(50)';
                        } else me.l.style.transform = 'translate(' + (me.x - me.s / 2) + 'px,' + (me.y - me.s / 2) + 'px)';
                        me.l.style.width = me.s + 'px';
                        me.l.style.height = me.s + 'px';
                        ctx.save();
                        ctx.translate(me.x, me.y);
                        ctx.rotate(me.r);
                        if (Game.toysType == 1) ctx.drawImage(Pic('smallCookies.png'), (me.id % 8) * 64, 0, 64, 64, -me.s / 2, -me.s / 2, me.s, me.s);
                        else ctx.drawImage(Pic('icons.png'), me.icon[0] * 48, me.icon[1] * 48, 48, 48, -me.s / 2, -me.s / 2, me.s, me.s);
                        ctx.restore();
                    }
                }

                let pic = Game.Milk.pic;
                if (Game.milkType != 0 && Game.ascensionMode != 1) pic = Game.AllMilks[Game.milkType].pic;
                ctx.globalAlpha = 0.95 * a;
                ctx.fillPattern(Pic(pic), 0, height - y, width + 480, 1, 480, 480, x, 0);

                ctx.fillStyle = '#000';
                ctx.fillRect(0, height - y + 480, width, Math.max(0, y - 480));
                ctx.globalAlpha = 1;

                Timer.track('milk');
            }

            if (Game.AscendTimer > 0) {
                ctx.drawImage(Pic('shadedBordersSoft.png'), 0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            if (Game.AscendTimer == 0) {
                Game.DrawWrinklers();
                Timer.track('wrinklers');
                Game.DrawSpecial();
                Timer.track('evolvables');

                Game.particlesDraw(2);
                Timer.track('text particles');

                // shiny border during frenzies etc
                ctx.globalAlpha = 1;
                let borders = 'shadedBordersSoft.png';
                if (goodBuff) borders = 'shadedBordersGold.png';
                else if (badBuff) borders = 'shadedBordersRed.png';
                if (goodBuff && Game.prefs.fancy) ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(Pic(borders), 0, 0, ctx.canvas.width, ctx.canvas.height);
                if (goodBuff && Game.prefs.fancy) ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

    /* =====================================================================================
        INITIALIZATION END; GAME READY TO LAUNCH
        =======================================================================================*/

    // booooo
    /**
     * @param {any} silent
     */
    static RuinTheFun(silent) {
        Game.popups = 0;
        Game.SetAllUpgrades(1);
        Game.SetAllAchievs(1);
        Game.popups = 0;
        Game.Earn(999999999999999999999999999999);
        Game.MaxSpecials();
        Game.nextResearch = 0;
        Game.researchT = -1;
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        Game.popups = 1;
        for (let i in Game.Objects) {
            let me = Game.Objects[i];
            if (me.level < 10) {
                me.level = 9;
                me.levelUp(true);
            }
            if (me.minigame && me.minigame.onRuinTheFun) me.minigame.onRuinTheFun();
        }
        if (!silent) {
            Game.Notify('Thou doth ruineth the fun!', 'You\'re free. Free at last.', [11, 5]);
        }
        return 'You feel a bitter taste in your mouth...';
    }

    /**
     * @param {number} on
     */
    static SetAllUpgrades(on) {
        Game.popups = 0;
        const leftout = new Set(['Magic shenanigans', 'Occult obstruction', 'Glucose-charged air']);
        for (let i in Game.Upgrades) {
            if (on && (Game.Upgrades[i].pool == 'toggle' || leftout.has(Game.Upgrades[i].name))) { /* empty */ }
            else if (on) Game.Upgrades[i].earn();
            else if (!on) Game.Upgrades[i].lose();
        }
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        Game.popups = 1;
    }
    /**
     * @param {number} on
     */
    static SetAllAchievs(on) {
        Game.popups = 0;
        for (let i in Game.Achievements) {
            if (on && Game.Achievements[i].pool != 'dungeon') Game.Win(Game.Achievements[i].name);
            else if (!on) Game.RemoveAchiev(Game.Achievements[i].name);
        }
        Game.recalculateGains = 1;
        Game.popups = 1;
    }
    static GetAllDebugs() {
        Game.popups = 0;
        for (let i in Game.Upgrades) {
            if (Game.Upgrades[i].pool == 'debug') Game.Upgrades[i].earn();
        }
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        Game.popups = 1;
    }
    static MaxSpecials() {
        Game.dragonLevel = Game.dragonLevels.length - 1;
        Game.santaLevel = Game.santaLevels.length - 1;
    }

    static SesameReset() {
        let name = Game.bakeryName;
        Game.HardReset(2);
        Game.bakeryName = name;
        Game.bakeryNameRefresh();
        Game.Achievements['Cheated cookies taste awful'].won = 1;
    }

    static debugTimersOn = 0;
    static sesame = 0;
    static OpenSesame() {
        let str = '';
        str += '<div class="icon" style="position:absolute;left:-9px;top:-6px;background-position:' + -10 * 48 + 'px ' + -6 * 48 + 'px;"></div>';
        str += '<div style="position:absolute;left:0px;top:0px;z-index:10;font-size:10px;background:#000;padding:1px;" id="fpsCounter"></div>';

        str += '<div id="devConsoleContent">';
        str += '<div class="title" style="font-size:14px;margin:6px;">Dev tools</div>';

        str += '<a class="option neato" ' + Game.clickStr + '="Game.Ascend(1);">Ascend</a>';
        str += '<div class="line"></div>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies*=10;Game.cookiesEarned*=10;">x10</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies/=10;Game.cookiesEarned/=10;">/10</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies*=1000;Game.cookiesEarned*=1000;">x1k</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies/=1000;Game.cookiesEarned/=1000;">/1k</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="for (let i in Game.Objects){Game.Objects[i].buy(100);}">Buy 100 of all</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="for (let i in Game.Objects){Game.Objects[i].sell(100);}">Sell 100 of all</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.gainLumps(10);">+10 lumps</a>';
        str +=
                '<a class="option neato" ' +
                Game.clickStr +
                '="for (let i in Game.Objects){Game.Objects[i].level=0;Game.Objects[i].onMinigame=false;Game.Objects[i].refresh();}Game.recalculateGains=1;">Reset levels</a>';
        str +=
                '<a class="option neato" ' +
                Game.clickStr +
                '="Game.cookiesReset+=Game.HowManyCookiesReset((Game.heavenlyChips||1)*1000);Game.EarnHeavenlyChips(0,true);Game.recalculateGains=1;">HC x1k</a>';
        str +=
                '<a class="option neato" ' +
                Game.clickStr +
                '="Game.cookiesReset=(Game.heavenlyChips<100?0:Game.HowManyCookiesReset(Math.floor(Game.heavenlyChips*0.001)));Game.cookiesReset=Math.max(Game.cookiesReset,0);Game.EarnHeavenlyChips(0,true);if (Game.cookiesReset<=0){Game.heavenlyChips=0;}Game.recalculateGains=1;">HC /1k</a><br>'; // wee bit inaccurate
        str += '<a class="option neato" ' + Game.clickStr + '="Game.cookiesEarned=0;Game.recalculateGains=1;">Reset cookies earned</a><br>';
        str += '<div class="line"></div>';
        str += '<a class="option warning" ' + Game.clickStr + '="Game.RuinTheFun(1);">Ruin The Fun</a>';
        str += '<a class="option warning" ' + Game.clickStr + '="Game.SesameReset();">Wipe</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.GetAllDebugs();">All debugs</a>';
        str +=
                '<a class="option neato" ' +
                Game.clickStr +
                '="Game.debugTimersOn=!Game.debugTimersOn;Game.OpenSesame();">Timers ' +
                (Game.debugTimersOn ? 'On' : 'Off') +
                '</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllUpgrades(0);">No upgrades</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllUpgrades(1);">All upgrades</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllAchievs(0);">No achievs</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllAchievs(1);">All achievs</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.santaLevel=0;Game.dragonLevel=0;">Reset specials</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.MaxSpecials();">Max specials</a><br>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.lumpRefill=0;">Reset refills</a>';
        str +=
                '<a class="option neato" ' + Game.clickStr + '="Game.EditAscend();">' + (Game.DebuggingPrestige ? 'Exit Ascend Edit' : 'Ascend Edit') + '</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.DebugUpgradeCpS();">Debug upgrades CpS</a>';
        str += '<a class="option neato" ' + Game.clickStr + '="Game.seed=Game.makeSeed();">Re-seed</a>';
        str +=
                '<a class="option neato" ' +
                Game.clickStr +
                '="Game.heralds=100;$(\'heraldsAmount\').textContent=Game.heralds;Game.externalDataLoaded=true;Game.recalculateGains=1;">Max heralds</a>';
        str += '<div class="line"></div>';
        for (let i = 0; i < Game.goldenCookieChoices.length / 2; i++) {
            str +=
                    '<a class="option neato" ' +
                    Game.clickStr +
                    '="let newShimmer=new Game.shimmer(\'golden\');newShimmer.force=\'' +
                    Game.goldenCookieChoices[i * 2 + 1] +
                    '\';">' +
                    Game.goldenCookieChoices[i * 2] +
                    '</a>';
        }
        str += '</div>';

        $('devConsole', true).innerHTML = str;

        if (!$('fpsGraph')) {
            const div = document.createElement('canvas');
            div.id = 'fpsGraph';
            div.width = 128;
            div.height = 64;
            div.style.opacity = '0.5';
            div.style.pointerEvents = 'none';
            div.style.transformOrigin = '0% 0%';
            div.style.transform = 'scale(0.75)';
            const devConsoleParentNode = $('devConsole', true).parentNode;
            if (devConsoleParentNode) devConsoleParentNode.insertBefore(div, $('devConsole', true).nextSibling);
            Game.fpsGraph = div;
            Game.fpsGraphCtx = ASSERT_NOT_NULL(Game.fpsGraph.getContext('2d', {
                alpha: false
            }));
            const ctx = Game.fpsGraphCtx;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 128, 64);
        }

        $('debug', true).style.display = 'block';
        Game.sesame = 1;
        Game.Achievements['Cheated cookies taste awful'].won = 1;
    }

    static EditAscend() {
        if (!Game.DebuggingPrestige) {
            Game.DebuggingPrestige = 1; // true;
            Game.AscendTimer = 0;
            Game.OnAscend = 1;
            Game.removeClass('ascendIntro');
            Game.addClass('ascending');
        } else {
            Game.DebuggingPrestige = 0; // false;
        }
        Game.BuildAscendTree();
        Game.OpenSesame();
    }

    // experimental debugging function that cycles through every owned upgrade, turns it off and on, and lists how much each upgrade is participating to CpS
    /** @type {Record<string, number>} */
    static debuggedUpgradeCpS = {};
    /** @type {Record<string, number>} */
    static debuggedUpgradeCpClick = {};
    static debugColors = ['#322', '#411', '#600', '#900', '#f30', '#f90', '#ff0', '#9f0', '#0f9', '#09f', '#90f'];
    static DebugUpgradeCpS() {
        Game.CalculateGains();
        Game.debuggedUpgradeCpS = {};
        Game.debuggedUpgradeCpClick = {};
        let CpS = Game.cookiesPs;
        let CpClick = Game.computedMouseCps;
        for (let i in Game.Upgrades) {
            let me = Game.Upgrades[i];
            if (me.bought) {
                me.bought = 0;
                Game.CalculateGains();
                Game.debuggedUpgradeCpS[me.name] = CpS / (Game.cookiesPs || 1) - 1;
                Game.debuggedUpgradeCpClick[me.name] = CpClick / (Game.computedMouseCps || 1) - 1;
                me.bought = 1;
            }
        }
        Game.CalculateGains();
    }

    /* =====================================================================================
    LOGIC
    =======================================================================================*/
    static Logic() {
        Game.bounds = Game.l.getBounds();

        if (!Game.OnAscend && Game.AscendTimer == 0) {
            for (let i in Game.Objects) {
                // @ts-expect-error wtf
                if (Game.Objects[i].eachFrame) Game.Objects[i].eachFrame();
            }
            Game.UpdateSpecial();
            Game.UpdateGrandmapocalypse();

            // handle graphic stuff
            if (Game.prefs.wobbly) {
                if (Game.BigCookieState == 1) Game.BigCookieSizeT = 0.98;
                else if (Game.BigCookieState == 2) Game.BigCookieSizeT = 1.05;
                else Game.BigCookieSizeT = 1;
                Game.BigCookieSizeD += (Game.BigCookieSizeT - Game.BigCookieSize) * 0.75;
                Game.BigCookieSizeD *= 0.75;
                Game.BigCookieSize += Game.BigCookieSizeD;
                Game.BigCookieSize = Math.max(0.1, Game.BigCookieSize);
            } else {
                if (Game.BigCookieState == 1) Game.BigCookieSize += (0.98 - Game.BigCookieSize) * 0.5;
                else if (Game.BigCookieState == 2) Game.BigCookieSize += (1.05 - Game.BigCookieSize) * 0.5;
                else Game.BigCookieSize += (1 - Game.BigCookieSize) * 0.5;
            }
            Game.particlesUpdate();

            if (Game.mousePointer) $('sectionLeft', true).style.cursor = 'pointer';
            else $('sectionLeft', true).style.cursor = 'auto';
            Game.mousePointer = 0;

            // handle milk and milk accessories
            Game.milkProgress = Game.AchievementsOwned / 25;
            if (Game.milkProgress >= 0.5) Game.Unlock('Kitten helpers');
            if (Game.milkProgress >= 1) Game.Unlock('Kitten workers');
            if (Game.milkProgress >= 2) Game.Unlock('Kitten engineers');
            if (Game.milkProgress >= 3) Game.Unlock('Kitten overseers');
            if (Game.milkProgress >= 4) Game.Unlock('Kitten managers');
            if (Game.milkProgress >= 5) Game.Unlock('Kitten accountants');
            if (Game.milkProgress >= 6) Game.Unlock('Kitten specialists');
            if (Game.milkProgress >= 7) Game.Unlock('Kitten experts');
            if (Game.milkProgress >= 8) Game.Unlock('Kitten consultants');
            if (Game.milkProgress >= 9) Game.Unlock('Kitten assistants to the regional manager');
            if (Game.milkProgress >= 10) Game.Unlock('Kitten marketeers');
            if (Game.milkProgress >= 11) Game.Unlock('Kitten analysts');
            if (Game.milkProgress >= 12) Game.Unlock('Kitten executives');
            if (Game.milkProgress >= 13) Game.Unlock('Kitten admins');
            Game.milkH = Math.min(1, Game.milkProgress) * 0.35;
            Game.milkHd += (Game.milkH - Game.milkHd) * 0.02;

            Game.Milk = Game.Milks[Math.min(Math.floor(Game.milkProgress), Game.Milks.length - 1)];

            if (Game.autoclickerDetected > 0) Game.autoclickerDetected--;

            // handle research
            if (Game.researchT > 0) {
                Game.researchT--;
            }
            if (Game.researchT == 0 && Game.nextResearch) {
                if (!Game.Has(Game.UpgradesById[Game.nextResearch].name)) {
                    Game.Unlock(Game.UpgradesById[Game.nextResearch].name);
                    Game.Notify(
                        loc('Research complete'),
                        loc('You have discovered: <b>%1</b>.', Game.UpgradesById[Game.nextResearch].dname),
                        Game.UpgradesById[Game.nextResearch].icon
                    );
                }
                Game.nextResearch = 0;
                Game.researchT = -1;
                Game.recalculateGains = 1;
            }
            // handle seasons
            if (Game.seasonT > 0) {
                Game.seasonT--;
            }
            if (Game.seasonT <= 0 && Game.season != '' && Game.season != Game.baseSeason && !Game.Has('Eternal seasons')) {
                Game.Notify(
                    Game.seasons[Game.season].over, '',
                    ASSERT_NOT_NULL(Game.seasons[Game.season].triggerUpgrade).icon
                );
                if (Game.Has('Season switcher')) {
                    Game.Unlock(Game.seasons[Game.season].trigger);
                    ASSERT_NOT_NULL(Game.seasons[Game.season].triggerUpgrade).bought = 0;
                }
                Game.season = Game.baseSeason;
                Game.seasonT = -1;
            }

            // press ctrl to bulk-buy 10, shift to bulk-buy 100
            if (!Game.promptOn) {
                const holdingShift = Game.keys['ShiftRight'] || Game.keys['ShiftLeft'];
                const holdingCtrl = Game.keys['ControlRight'] || Game.keys['ControlLeft'];
                if ((holdingShift || holdingCtrl) && !Game.buyBulkShortcut) {
                    Game.buyBulkOld = Game.buyBulk;
                    if (Game.keys['ShiftRight'] || Game.keys['ShiftLeft']) Game.buyBulk = 100;
                    if (Game.keys['ControlRight'] || Game.keys['ControlLeft']) Game.buyBulk = 10;
                    Game.buyBulkShortcut = 1;
                    Game.storeBulkButton(-1);
                }
            }
            const holdingShift = Game.keys['ShiftRight'] || Game.keys['ShiftLeft'];
            const holdingCtrl = Game.keys['ControlRight'] || Game.keys['ControlLeft'];
            if (!holdingShift && !holdingCtrl && Game.buyBulkShortcut) {
                // release
                Game.buyBulk = Game.buyBulkOld;
                Game.buyBulkShortcut = 0;
                Game.storeBulkButton(-1);
            }

            // handle cookies
            if (Game.recalculateGains) Game.CalculateGains();
            Game.Earn(Game.cookiesPs / Game.fps); // add cookies per second

            // grow lumps
            Game.doLumps();

            // minigames
            for (let i in Game.Objects) {
                const me = Game.Objects[i];
                if (Game.isMinigameReady(me) && me.minigame && me.minigame.logic && Game.ascensionMode != 1)
                    me.minigame.logic();
            }

            if (Game.specialTab != '' && Game.T % (Game.fps * 3) == 0) Game.ToggleSpecialMenu(1);

            // wrinklers
            if (Game.cpsSucked > 0) {
                Game.Dissolve((Game.cookiesPs / Game.fps) * Game.cpsSucked);
                Game.cookiesSucked += (Game.cookiesPs / Game.fps) * Game.cpsSucked;
            }

            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                me.totalCookies += (me.storedTotalCps * Game.globalCpsMult) / Game.fps;
            }
            if (Game.prefs.particles && Game.cookies && Game.T % Math.ceil(Game.fps / Math.min(10, Game.cookiesPs)) == 0) Game.particleAdd(); // cookie shower

            if (Game.T % (Game.fps * 10) == 0) Game.recalculateGains = 1; // recalculate CpS every 10 seconds (for dynamic boosts such as Century egg)

            /* =====================================================================================
            UNLOCKING STUFF
            =======================================================================================*/
            if (Game.T % Game.fps == 0 && Math.random() < 1 / 1000000) Game.Win('Just plain lucky'); // 1 chance in 1,000,000 every second achievement
            if (Game.T % (Game.fps * 5) == 0 && Game.ObjectsById.length > 0) {
                // check some achievements and upgrades
                if (Number.isNaN(Number(Game.cookies))) {
                    Game.cookies = 0;
                    Game.cookiesEarned = 0;
                    Game.recalculateGains = 1;
                }

                let timePlayed = new Date();
                timePlayed.setTime(Date.now() - Game.startDate);

                if (!Game.fullDate || Date.now() - Game.fullDate >= 365 * 24 * 60 * 60 * 1000) Game.Win('So much to do so much to see');

                if (Game.cookiesEarned >= 1000000 && (Game.ascensionMode == 1 || Game.resets == 0)) {
                    // challenge run or hasn't ascended yet
                    if (+timePlayed <= 1000 * 60 * 35) Game.Win('Speed baking I');
                    if (+timePlayed <= 1000 * 60 * 25) Game.Win('Speed baking II');
                    if (+timePlayed <= 1000 * 60 * 15) Game.Win('Speed baking III');

                    if (Game.cookieClicks <= 15) Game.Win('Neverclick');
                    if (Game.cookieClicks <= 0) Game.Win('True Neverclick');
                    if (Game.cookiesEarned >= 1000000000 && Game.UpgradesOwned == 0) Game.Win('Hardcore');
                }

                for (let i in Game.UnlockAt) {
                    const unlock = Game.UnlockAt[i];
                    if (Game.cookiesEarned >= unlock.cookies) {
                        let pass = 1;
                        if (unlock.require && !Game.Has(unlock.require) && !Game.HasAchiev(unlock.require)) pass = 0;
                        if (unlock.season && Game.season != unlock.season) pass = 0;
                        if (pass) {
                            Game.Unlock(unlock.name);
                            Game.Win(unlock.name);
                        }
                    }
                }

                if (Game.Has('Golden switch')) Game.Unlock('Golden switch [off]');
                if (Game.Has('Shimmering veil') && !Game.Has('Shimmering veil [off]') && !Game.Has('Shimmering veil [on]')) {
                    Game.Unlock('Shimmering veil [on]');
                    Game.Upgrades['Shimmering veil [off]'].earn();
                }
                if (Game.Has('Sugar craving')) Game.Unlock('Sugar frenzy');
                if (Game.Has('Classic dairy selection')) Game.Unlock('Milk selector');
                if (Game.Has('Basic wallpaper assortment')) Game.Unlock('Background selector');
                if (Game.Has('Golden cookie alert sound')) Game.Unlock('Golden cookie sound selector');
                if (Game.Has('Sound test')) Game.Unlock('Jukebox');

                if (Game.Has('Prism heart biscuits')) Game.Win('Lovely cookies');
                if (Game.season == 'easter') {
                    let eggs = 0;
                    for (let i in Game.easterEggs) {
                        if (Game.HasUnlocked(Game.easterEggs[i])) eggs++;
                    }
                    if (eggs >= 1) Game.Win('The hunt is on');
                    if (eggs >= 7) Game.Win('Egging on');
                    if (eggs >= 14) Game.Win('Mass Easteria');
                    if (eggs >= Game.easterEggs.length) Game.Win('Hide & seek champion');
                }

                if (Game.Has('Fortune cookies')) {
                    let list = ASSERT_NOT_NULL(Game.Tiers['fortune'].upgrades);
                    let fortunes = 0;
                    for (let i in list) {
                        if (Game.Has(list[i].name)) fortunes++;
                    }
                    if (fortunes >= list.length) Game.Win('O Fortuna');
                }

                if (Game.Has('Legacy') && Game.ascensionMode != 1) {
                    Game.Unlock('Heavenly chip secret');
                    if (Game.Has('Heavenly chip secret')) Game.Unlock('Heavenly cookie stand');
                    if (Game.Has('Heavenly cookie stand')) Game.Unlock('Heavenly bakery');
                    if (Game.Has('Heavenly bakery')) Game.Unlock('Heavenly confectionery');
                    if (Game.Has('Heavenly confectionery')) Game.Unlock('Heavenly key');

                    if (Game.Has('Heavenly key')) Game.Win('Wholesome');
                }

                for (let i in Game.BankAchievements) {
                    if (Game.cookiesEarned >= Game.BankAchievements[i].threshold) Game.Win(Game.BankAchievements[i].name);
                }

                let buildingsOwned = 0;
                let mathematician = 1;
                let base10 = 1;
                let minAmount = 100000;
                for (let i in Game.Objects) {
                    buildingsOwned += Game.Objects[i].amount;
                    minAmount = Math.min(Game.Objects[i].amount, minAmount);
                    const tmpAmount = Math.min(128, Math.pow(2, Game.ObjectsById.length - Game.Objects[i].id - 1));
                    if (!Game.HasAchiev('Mathematician') && Game.Objects[i].amount < tmpAmount) {
                        mathematician = 0;
                    }
                    if (!Game.HasAchiev('Base 10') && Game.Objects[i].amount < (Game.ObjectsById.length - Game.Objects[i].id) * 10) base10 = 0;
                }
                if (minAmount >= 1) Game.Win('One with everything');
                if (mathematician === 1) Game.Win('Mathematician');
                if (base10 === 1) Game.Win('Base 10');
                if (minAmount >= 100) {
                    Game.Win('Centennial');
                    Game.Unlock('Milk chocolate butter biscuit');
                }
                if (minAmount >= 150) {
                    Game.Win('Centennial and a half');
                    Game.Unlock('Dark chocolate butter biscuit');
                }
                if (minAmount >= 200) {
                    Game.Win('Bicentennial');
                    Game.Unlock('White chocolate butter biscuit');
                }
                if (minAmount >= 250) {
                    Game.Win('Bicentennial and a half');
                    Game.Unlock('Ruby chocolate butter biscuit');
                }
                if (minAmount >= 300) {
                    Game.Win('Tricentennial');
                    Game.Unlock('Lavender chocolate butter biscuit');
                }
                if (minAmount >= 350) {
                    Game.Win('Tricentennial and a half');
                    Game.Unlock('Synthetic chocolate green honey butter biscuit');
                }
                if (minAmount >= 400) {
                    Game.Win('Quadricentennial');
                    Game.Unlock('Royal raspberry chocolate butter biscuit');
                }
                if (minAmount >= 450) {
                    Game.Win('Quadricentennial and a half');
                    Game.Unlock('Ultra-concentrated high-energy chocolate butter biscuit');
                }
                if (minAmount >= 500) {
                    Game.Win('Quincentennial');
                    Game.Unlock('Pure pitch-black chocolate butter biscuit');
                }
                if (minAmount >= 550) {
                    Game.Win('Quincentennial and a half');
                    Game.Unlock('Cosmic chocolate butter biscuit');
                }
                if (minAmount >= 600) {
                    Game.Win('Sexcentennial');
                    Game.Unlock('Butter biscuit (with butter)');
                }
                if (minAmount >= 650) {
                    Game.Win('Sexcentennial and a half');
                    Game.Unlock('Everybutter biscuit');
                }

                if (Game.handmadeCookies >= 1000) {
                    Game.Win('Clicktastic');
                    Game.Unlock('Plastic mouse');
                }
                if (Game.handmadeCookies >= 100000) {
                    Game.Win('Clickathlon');
                    Game.Unlock('Iron mouse');
                }
                if (Game.handmadeCookies >= 10000000) {
                    Game.Win('Clickolympics');
                    Game.Unlock('Titanium mouse');
                }
                if (Game.handmadeCookies >= 1000000000) {
                    Game.Win('Clickorama');
                    Game.Unlock('Adamantium mouse');
                }
                if (Game.handmadeCookies >= 100000000000) {
                    Game.Win('Clickasmic');
                    Game.Unlock('Unobtainium mouse');
                }
                if (Game.handmadeCookies >= 10000000000000) {
                    Game.Win('Clickageddon');
                    Game.Unlock('Eludium mouse');
                }
                if (Game.handmadeCookies >= 1000000000000000) {
                    Game.Win('Clicknarok');
                    Game.Unlock('Wishalloy mouse');
                }
                if (Game.handmadeCookies >= 100000000000000000) {
                    Game.Win('Clickastrophe');
                    Game.Unlock('Fantasteel mouse');
                }
                if (Game.handmadeCookies >= 10000000000000000000) {
                    Game.Win('Clickataclysm');
                    Game.Unlock('Nevercrack mouse');
                }
                if (Game.handmadeCookies >= 1000000000000000000000) {
                    Game.Win('The ultimate clickdown');
                    Game.Unlock('Armythril mouse');
                }
                if (Game.handmadeCookies >= 100000000000000000000000) {
                    Game.Win('All the other kids with the pumped up clicks');
                    Game.Unlock('Technobsidian mouse');
                }
                if (Game.handmadeCookies >= 10000000000000000000000000) {
                    Game.Win('One...more...click...');
                    Game.Unlock('Plasmarble mouse');
                }
                if (Game.handmadeCookies >= 1000000000000000000000000000) {
                    Game.Win('Clickety split');
                    Game.Unlock('Miraculite mouse');
                }
                if (Game.handmadeCookies >= 100000000000000000000000000000) {
                    Game.Win('Ain\'t that a click in the head');
                    Game.Unlock('Aetherice mouse');
                }

                if (Game.cookiesEarned < Game.cookies) Game.Win('Cheated cookies taste awful');

                if (
                    Game.Has('Skull cookies') &&
                    Game.Has('Ghost cookies') &&
                    Game.Has('Bat cookies') &&
                    Game.Has('Slime cookies') &&
                    Game.Has('Pumpkin cookies') &&
                    Game.Has('Eyeball cookies') &&
                    Game.Has('Spider cookies')
                )
                    Game.Win('Spooky cookies');
                if (Game.wrinklersPopped >= 1) Game.Win('Itchscratcher');
                if (Game.wrinklersPopped >= 50) Game.Win('Wrinklesquisher');
                if (Game.wrinklersPopped >= 200) Game.Win('Moistburster');

                if (Game.cookiesEarned >= 1000000 && Game.Has('How to bake your dragon')) Game.Unlock('A crumbly egg');

                if (Game.cookiesEarned >= 25 && Game.season == 'christmas') Game.Unlock('A festive hat');
                if (
                    Game.Has('Christmas tree biscuits') &&
                    Game.Has('Snowflake biscuits') &&
                    Game.Has('Snowman biscuits') &&
                    Game.Has('Holly biscuits') &&
                    Game.Has('Candy cane biscuits') &&
                    Game.Has('Bell biscuits') &&
                    Game.Has('Present biscuits')
                )
                    Game.Win('Let it snow');

                if (Game.reindeerClicked >= 1) Game.Win('Oh deer');
                if (Game.reindeerClicked >= 50) Game.Win('Sleigh of hand');
                if (Game.reindeerClicked >= 200) Game.Win('Reindeer sleigher');

                if (buildingsOwned >= 100) Game.Win('Builder');
                if (buildingsOwned >= 500) Game.Win('Architect');
                if (buildingsOwned >= 1000) Game.Win('Engineer');
                if (buildingsOwned >= 2500) Game.Win('Lord of Constructs');
                if (buildingsOwned >= 5000) Game.Win('Grand design');
                if (buildingsOwned >= 7500) Game.Win('Ecumenopolis');
                if (buildingsOwned >= 10000) Game.Win('Myriad');
                if (Game.UpgradesOwned >= 20) Game.Win('Enhancer');
                if (Game.UpgradesOwned >= 50) Game.Win('Augmenter');
                if (Game.UpgradesOwned >= 100) Game.Win('Upgrader');
                if (Game.UpgradesOwned >= 200) Game.Win('Lord of Progress');
                if (Game.UpgradesOwned >= 300) Game.Win('The full picture');
                if (Game.UpgradesOwned >= 400) Game.Win('When there\'s nothing left to add');
                if (Game.UpgradesOwned >= 500) Game.Win('Kaizen');
                if (Game.UpgradesOwned >= 600) Game.Win('Beyond quality');
                if (buildingsOwned >= 4000 && Game.UpgradesOwned >= 300) Game.Win('Polymath');
                if (buildingsOwned >= 8000 && Game.UpgradesOwned >= 400) Game.Win('Renaissance baker');

                if (!Game.HasAchiev('Jellicles')) {
                    let kittens = 0;
                    for (let i = 0; i < Game.UpgradesByPool['kitten'].length; i++) {
                        if (Game.Has(Game.UpgradesByPool['kitten'][i].name)) kittens++;
                    }
                    if (kittens >= 10) Game.Win('Jellicles');
                }

                if (Game.cookiesEarned >= 1e14 && !Game.HasAchiev('You win a cookie')) {
                    Game.Win('You win a cookie');
                    Game.Earn(1);
                }

                if (Game.shimmerTypes['golden'].n >= 4) Game.Win('Four-leaf cookie');

                let grandmas = 0;
                for (let i in Game.GrandmaSynergies) {
                    if (Game.Has(Game.GrandmaSynergies[i])) grandmas++;
                }
                if (!Game.HasAchiev('Elder') && grandmas >= 7) Game.Win('Elder');
                if (!Game.HasAchiev('Veteran') && grandmas >= 14) Game.Win('Veteran');
                if (Game.Objects['Grandma'].amount >= 6 && !Game.Has('Bingo center/Research facility') && Game.HasAchiev('Elder'))
                    Game.Unlock('Bingo center/Research facility');
                if (Game.pledges > 0) Game.Win('Elder nap');
                if (Game.pledges >= 5) Game.Win('Elder slumber');
                if (Game.pledges >= 10) Game.Unlock('Sacrificial rolling pins');
                if (Game.Objects['Cursor'].amount + Game.Objects['Grandma'].amount >= 777) Game.Win('The elder scrolls');

                for (let i in Game.Objects) {
                    let it = Game.Objects[i];
                    for (let ii in it.productionAchievs) {
                        if (it.totalCookies >= it.productionAchievs[ii].pow) Game.Win(it.productionAchievs[ii].achiev.name);
                    }
                }

                if (
                    !Game.HasAchiev('Cookie-dunker') &&
                    Game.LeftBackground &&
                    Game.milkProgress > 0.1 &&
                    Game.LeftBackground.canvas.height * 0.4 + 256 / 2 - 16 > (1 - Game.milkHd) * Game.LeftBackground.canvas.height
                )
                    Game.Win('Cookie-dunker');

                //! Game.runModHook('check'); -- see moddingapi.disabled.js
            }

            Game.cookiesd += (Game.cookies - Game.cookiesd) * 0.3;

            if (Game.storeToRefresh) Game.RefreshStore();
            if (Game.upgradesToRebuild) Game.RebuildUpgrades();

            Game.updateShimmers();
            Game.updateBuffs();

            Game.UpdateTicker();
        }

        if (Game.T % (Game.fps * 2) == 0) {
            let title = 'Cookie Clicker';
            if (Game.season == 'fools') title = 'Cookie Baker';
            document.title = (Game.OnAscend ? (EN ? 'Ascending! ' : loc('Ascending') + ' | ') : '') + loc('%1 cookie', LBeautify(Game.cookies)) + ' - ' + title;
        }
        if (Game.T % 15 == 0) {
            // written through the magic of "hope for the best" maths
            let chipsOwned = Game.HowMuchPrestige(Game.cookiesReset);
            let ascendNowToOwn = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
            let ascendNowToGet = ascendNowToOwn - Math.floor(chipsOwned);
            let nextChipAt =
                Game.HowManyCookiesReset(Math.floor(chipsOwned + ascendNowToGet + 1)) - Game.HowManyCookiesReset(Math.floor(chipsOwned + ascendNowToGet));
            let cookiesToNext = Game.HowManyCookiesReset(ascendNowToOwn + 1) - (Game.cookiesEarned + Game.cookiesReset);
            let percent = 1 - cookiesToNext / nextChipAt;

            // fill the tooltip under the Legacy tab
            let date = new Date();
            date.setTime(Date.now() - Game.startDate);
            let timeInSeconds = date.getTime() / 1000;
            let startDate = Game.sayTime(timeInSeconds * Game.fps, -1);

            let str = '';
            str += EN ? 'You\'ve been on this run for <b>' + (startDate == '' ? 'not very long' : startDate) + '</b>.<br>' : loc('You\'ve been on this run for <b>%1</b>.', startDate) + '<br>';
            str += '<div class="line"></div>';
            if (Game.prestige > 0) {
                str += loc('Your prestige level is currently <b>%1</b>.<br>(CpS +%2%)', [Beautify(Game.prestige), Beautify(Game.prestige)]);
                str += '<div class="line"></div>';
            }
            if (ascendNowToGet < 1) str += loc('Ascending now would grant you no prestige.');
            else if (ascendNowToGet < 2)
                str += loc('Ascending now would grant you<br><b>1 prestige level</b> (+1% CpS)<br>and <b>1 heavenly chip</b> to spend.');
            else
                str += loc('Ascending now would grant you<br><b>%1 prestige levels</b> (+%2% CpS)<br>and <b>%3 heavenly chips</b> to spend.', [
                    Beautify(ascendNowToGet),
                    Beautify(ascendNowToGet),
                    Beautify(ascendNowToGet)
                ]);
            if (cookiesToNext >= 0) {
                // note: cookiesToNext can be negative at higher HC amounts due to precision loss. we simply hide it in such cases, as this usually only occurs when the gap is small and rapidly overcome anyway
                str += '<div class="line"></div>';
                str += loc('You need <b>%1 more cookies</b> for the next level.', Beautify(cookiesToNext)) + '<br>';
            }
            $('ascendTooltip', true).innerHTML = str;

            if (ascendNowToGet > 0) {
                // show number saying how many chips you'd get resetting now
                Game.ascendNumber.textContent = '+' + SimpleBeautify(ascendNowToGet);
                Game.ascendNumber.style.display = 'block';
            } else {
                Game.ascendNumber.style.display = 'none';
            }

            if (ascendNowToGet > Game.ascendMeterLevel || Game.ascendMeterPercentT < Game.ascendMeterPercent) {
                // reset the gauge and play a sound if we gained a potential level
                Game.ascendMeterPercent = 0;
            }
            Game.ascendMeterLevel = ascendNowToGet;
            Game.ascendMeterPercentT = percent; // gauge that fills up as you near your next chip
        }
        Game.ascendMeter.style.backgroundPosition = -Game.T * 0.5 - Game.ascendMeterPercent * 100 + 'px';
        Game.ascendMeter.style.transform = 'translate(' + Math.floor(-Math.max(0, 1 - Game.ascendMeterPercent) * 100) + '%,0px)';
        Game.ascendMeterPercent += (Game.ascendMeterPercentT - Game.ascendMeterPercent) * 0.1;

        Game.NotesLogic();
        if (Game.mouseMoved || Game.Scroll || Game.tooltip.dynamic) Game.tooltip.update();

        if (Game.T % (Game.fps * 5) == 0 && !Game.mouseDown && (Game.onMenu == 'stats' || Game.onMenu == 'prefs')) Game.UpdateMenu();
        if (Game.T % (Game.fps * 1) == 0) Game.UpdatePrompt();
        if (Game.AscendTimer > 0) Game.UpdateAscendIntro();
        if (Game.ReincarnateTimer > 0) Game.UpdateReincarnateIntro();
        if (Game.OnAscend) Game.UpdateAscend();

        //! Game.runModHook('logic'); -- see moddingapi.disabled.js

        if (Game.sparklesT > 0) {
            Game.sparkles.style.backgroundPosition = -Math.floor((Game.sparklesFrames - Game.sparklesT + 1) * 128) + 'px 0px';
            Game.sparklesT--;
            if (Game.sparklesT == 1) Game.sparkles.style.display = 'none';
        }

        Game.Click = 0;
        Game.Scroll = 0;
        Game.mouseMoved = 0;
        Game.CanClick = 1;

        if ((Game.toSave || (Game.T % (Game.fps * 60) == 0 && Game.T > Game.fps * 10 && Game.prefs.autosave)) && !Game.OnAscend) {
            // check if we can save : no minigames are loading
            let canSave = true;
            for (let i in Game.Objects) {
                const me = Game.Objects[i];
                if (me.minigameLoading) {
                    canSave = false;
                    break;
                }
            }
            if (canSave) Game.WriteSave();
        }
        if (!Game.toSave && !Game.isSaving) {
            if (Game.toReload) {
                Game.toReload = false;
                location.reload();
            }
            if (Game.toQuit) {
                Game.toQuit = false;
                window.close();
            }
        }

        Game.T++;
    }

    /* =====================================================================================
    DRAW
    =======================================================================================*/

    static Draw() {
        Game.DrawBackground();
        Timer.track('end of background');

        if (!Game.OnAscend) {
            let str = Beautify(Math.round(Game.cookiesd));
            if (Game.cookiesd >= 1000000) {
                // dirty padding
                let spacePos = str.indexOf(' ');
                let dotPos = str.indexOf('.');
                let add = '';
                if (spacePos != -1) {
                    if (dotPos == -1) add += '.000';
                    else {
                        if (spacePos - dotPos == 2) add += '00';
                        if (spacePos - dotPos == 3) add += '0';
                    }
                }
                str = [str.slice(0, spacePos), add, str.slice(spacePos)].join('');
            }

            str = locStr('%1 cookie', { n: Math.round(Game.cookiesd), b: str });
            if (str.length > 14) str = str.replace(' ', '<br>');

            if (Game.prefs.monospace) str = '<span class="monospace">' + str + '</span>';
            str =
                str +
                '<div id="cookiesPerSecond"' +
                (Game.cpsSucked > 0 ? ' class="wrinkled"' : '') +
                '>' +
                loc('per second:') +
                ' ' +
                Beautify(Game.cookiesPs * (1 - Game.cpsSucked), 1) +
                '</div>';
            $('cookies', true).innerHTML = str;
            Timer.track('cookie amount');

            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                if (me.onMinigame && ASSERT_NOT_NULL(me.minigame).draw && !me.muted && !Game.onMenu)
                    ASSERT_NOT_NULL(me.minigame).draw();
            }
            Timer.track('draw minigames');

            if (Game.drawT % 5 == 0) {
                let lastLocked = 0;
                for (let i in Game.Objects) {
                    let me = Game.Objects[i];

                    // make products full-opacity if we can buy them
                    let classes = 'product';
                    let price = me.bulkPrice;
                    if (Game.cookiesEarned >= me.basePrice || me.bought > 0) {
                        classes += ' unlocked';
                        lastLocked = 0;
                        me.locked = 0;
                    } else {
                        classes += ' locked';
                        lastLocked++;
                        me.locked = 1;
                    }
                    classes += (Game.buyMode == 1 && Game.cookies >= price) || (Game.buyMode == -1 && me.amount > 0) ? ' enabled' : ' disabled';
                    if (lastLocked > 2) classes += ' toggledOff';
                    ASSERT_NOT_NULL(me.l).className = classes;
                }

                // make upgrades full-opacity if we can buy them
                let lastPrice = 0;
                let i = 0;
                for (const me of Game.UpgradesInStore) {
                    if (!me.bought) {
                        let price = me.getPrice();
                        let canBuy = me.canBuy();
                        let enabled = $('upgrade' + i, true).className.includes('enabled');
                        if ((canBuy && !enabled) || (!canBuy && enabled)) Game.upgradesToRebuild = 1;
                        if (price < lastPrice) Game.storeToRefresh = 1; // is this upgrade less expensive than the previous one? trigger a refresh to sort it again
                        lastPrice = price;
                    }
                    if (me.timerDisplay) {
                        let T = me.timerDisplay();
                        if (T != -1) {
                            if (!$('upgradePieTimer' + i))
                                $('upgrade' + i, true)
                                    .innerHTML = `${
                                        $('upgrade' + i, true).innerHTML
                                    }<div class="pieTimer" id="upgradePieTimer${i}"></div>`;
                            T = (T * 144) % 144;
                            $('upgradePieTimer' + i, true)
                                .style.backgroundPosition = `${-Math.floor(T % 18) * 48}px ${-Math.floor(T / 18) * 48}px`;
                        }
                    }
                    i++;
                }
            }
            Timer.track('store');

            if (Game.PARTY) {
                // i was bored and felt like messing with CSS
                const pulse = Math.pow((Game.T % 10) / 10, 0.5);
                Game.l.style.filter = 'hue-rotate(' + ((Game.T * 5) % 360) + 'deg) brightness(' + (150 - 50 * pulse) + '%)';
                Game.l.style.transform = 'scale(' + (1.02 - 0.02 * pulse) + ',' + (1.02 - 0.02 * pulse) + ') rotate(' + Math.sin(Game.T * 0.5) * 0.5 + 'deg)';
                Game.wrapper.style.overflowX = 'hidden';
                Game.wrapper.style.overflowY = 'hidden';
            }

            Timer.clean();
            if (
                Game.prefs.animate &&
                ((Game.prefs.fancy && Game.drawT % 1 == 0) || (!Game.prefs.fancy && Game.drawT % 10 == 0)) &&
                Game.AscendTimer == 0 &&
                Game.onMenu == ''
            )
                Game.DrawBuildings();
            Timer.track('buildings');

            Game.textParticlesUpdate();
            Timer.track('text particles');
        }

        Game.NotesDraw();
        Timer.track('notes');

        //! Game.runModHook('draw'); -- see moddingapi.disabled.js

        Game.drawT++;
    }

    /* =====================================================================================
    MAIN LOOP
    =======================================================================================*/
    static Loop() {
        if (Game.timedout) return false;
        Timer.say('START');
        Timer.track('browser stuff');
        Timer.say('LOGIC');
        // update game logic !
        Game.catchupLogic = 0;
        Game.Logic();
        Game.catchupLogic = 1;

        let time = Date.now();

        // latency compensator
        Game.accumulatedDelay += time - Game.time - 1000 / Game.fps;
        if (Game.prefs.timeout && time - Game.lastActivity >= 1000 * 60 * 5) {
            if (Game.accumulatedDelay > 1000 * 60 * 30)
                Game.delayTimeouts += 3; // more than 30 minutes delay? computer probably asleep and not making cookies anyway
            else if (Game.accumulatedDelay > 1000 * 5) Game.delayTimeouts++; // add to timeout counter when we skip 10 seconds worth of frames (and the player has been inactive for at least 5 minutes)
            if (Game.delayTimeouts >= 3) Game.Timeout(); // trigger timeout when the timeout counter is 3+
        }

        Game.accumulatedDelay = Math.min(Game.accumulatedDelay, 1000 * 5); // don't compensate over 5 seconds; if you do, something's probably very wrong
        Game.time = time;

        while (Game.accumulatedDelay > 0) {
            Game.Logic();
            Game.accumulatedDelay -= 1000 / Game.fps; // as long as we're detecting latency (slower than target fps), execute logic (this makes drawing slower but makes the logic behave closer to correct target fps)
        }
        Game.catchupLogic = 0;
        Timer.track('logic');
        Timer.say('END LOGIC');

        if (Game.visible) Game.Draw();

        if (Game.sesame) {
            // fps counter and graph
            Game.previousFps = Game.currentFps;
            Game.currentFps = Game.getFps();
            let ctx = Game.fpsGraphCtx;
            ctx.drawImage(Game.fpsGraph, -1, 0);
            ctx.fillStyle = 'rgb(' + Math.round((1 - Game.currentFps / Game.fps) * 128) + ',0,0)';
            ctx.fillRect(128 - 1, 0, 1, 64);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(128 - 1, (1 - Game.previousFps / Game.fps) * 64);
            ctx.lineTo(128, (1 - Game.currentFps / Game.fps) * 64);
            ctx.stroke();

            $('fpsCounter', true).textContent = Game.currentFps + ' fps';
            let str = '';
            for (let i in Timer.labels) {
                str += Timer.labels[i];
            }
            if (Game.debugTimersOn) $('debugLog', true).style.display = 'block';
            else $('debugLog', true).style.display = 'none';
            $('debugLog', true).innerHTML = str;
        }
        Timer.reset();

        Game.loopT++;
        setTimeout(Game.Loop, 1000 / Game.fps);
        return true;
    }
}

