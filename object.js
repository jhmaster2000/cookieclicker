class CookieObject {
    /** @type {HTMLElement | undefined} */
    l;

    /** @type {any=} */
    minigameLoading;
    /** @type {any=} */
    minigameSave;
    /** @type {any=} */
    unlocked;
    /** @type {any=} */
    unshackleUpgrade;

    /**
     * @type {{ onResize?: any; computeStepT?: any; computeMapBounds?: any; updateLocStyles?: any; save?: any;
     * reset?: any; load?: any; launch: any; effs?: any; onRuinTheFun?: any; logic?: any; draw?: any; onLevel?: any;
     * dragonBoostTooltip?: any; parent?: CookieObject; } | undefined}
     */
    minigame;
    /** @type {Upgrade | undefined} */
    grandma;
    /**
     * @type {HTMLCanvasElement | undefined}
     */
    canvas;
    /**
     * @type {CanvasRenderingContext2D | undefined}
     */
    ctx;
    /** @type {Achievement | undefined} */
    levelAchiev10;

    /** @type {Record<string | number, Achievement>} */
    tieredAchievs;
    /** @type {Record<string | number, Upgrade>} */
    tieredUpgrades;

    /** @type {Upgrade | 0} */
    fortune;

    constructor(
        /** @type {string} */ name, /** @type {string | string[]} */ commonName, /** @type {string} */ desc,
        /** @type {any} */ icon, /** @type {number} */ iconColumn,
        /** @type {{
         *      base?: string; pic?: string | Function; bg?: string; xV?: number; yV?: number;
         *      w?: number; x?: number; y?: number; rows?: number; frames?: number; }} */ art,
        /** @type {number} */ price, /** @type {(self: CookieObject) => number} */ cps, /** @type {(self: CookieObject) => void} */ buyFunction
    ) {
        this.id = Game.ObjectsN;
        this.name = name;
        this.dname = name;
        this.displayName = this.name;
        commonName = (/** @type string */ (commonName)).split('|');
        this.single = commonName[0];
        this.plural = commonName[1];
        this.bsingle = this.single;
        this.bplural = this.plural; // store untranslated as we use those too
        this.actionName = commonName[2];
        this.extraName = commonName[3];
        this.extraPlural = commonName[4];
        this.desc = desc;
        this.dname = String(loc(this.name));
        this.single = String(loc(this.single));
        this.plural = String(loc(this.plural));
        // @ts-expect-error doesnt make senseeeeeee
        this.desc = String(loc(locStringsByPart[this.name + ' quote'] || undefined));
        this.basePrice = price;
        this.price = this.basePrice;
        this.bulkPrice = this.price;
        this.cps = cps;
        this.baseCps = 0;
        this.mouseOn = false;
        this.mousePos = [-100, -100];
        /**
         * @type {any[]}
         */
        this.productionAchievs = [];

        this.n = this.id;
        if (this.n !== 0) {
            // new automated price and CpS curves
            this.baseCps = Math.ceil(Math.pow(this.n * 1, this.n * 0.5 + 2) * 10) / 10; // 0.45 used to be 0.5
            let digits = Math.pow(10, Math.ceil(Math.log10(Math.ceil(this.baseCps)))) / 100;
            this.baseCps = Math.round(this.baseCps / digits) * digits;

            this.basePrice = (this.n * 1 + 9 + (this.n < 5 ? 0 : Math.pow(this.n - 5, 1.75) * 5)) * Math.pow(10, this.n) * Math.max(1, this.n - 14);
            digits = Math.pow(10, Math.ceil(Math.log10(Math.ceil(this.basePrice)))) / 100;
            this.basePrice = Math.round(this.basePrice / digits) * digits;
            if (this.id >= 16) this.basePrice *= 10;
            if (this.id >= 17) this.basePrice *= 10;
            if (this.id >= 18) this.basePrice *= 10;
            if (this.id >= 19) this.basePrice *= 10;
            this.price = this.basePrice;
            this.bulkPrice = this.price;
        }

        this.totalCookies = 0;
        this.storedCps = 0;
        this.storedTotalCps = 0;
        this.icon = icon;
        this.iconColumn = iconColumn;
        this.art = art;
        if (art.base) {
            art.pic = art.base + '.png';
            art.bg = art.base + 'Background.png';
        }
        this.buyFunction = buyFunction;
        this.locked = 1;
        this.level = 0;
        this.vanilla = Game.vanilla;

        this.tieredUpgrades = {};
        this.tieredAchievs = {};
        /**
         * @type {any[]}
         */
        this.synergies = [];
        this.fortune = 0;

        this.amount = 0;
        this.bought = 0;
        this.highest = 0;
        this.free = 0;

        this.eachFrame = 0;

        this.minigameUrl = 0; // if this is defined, load the specified script if the building's level is at least 1
        this.minigameName = 0;
        this.onMinigame = false;
        this.minigameLoaded = false;

        this.switchMinigame = function (
            /** @type {number | boolean} */ on // change whether we're on the building's minigame
        ) {
            // @ts-expect-error unsure
            if (!Game.isMinigameReady(this)) on = false;
            if (on == -1) on = !this.onMinigame;
            this.onMinigame = on;
            // @ts-expect-error
            if (this.id != 0) {
                if (this.onMinigame) {
                    // @ts-expect-error
                    $('row' + this.id).classList.add('onMinigame');
                    // @ts-expect-error
                    if (this.minigame.onResize) this.minigame.onResize();
                } else {
                    // @ts-expect-error
                    $('row' + this.id).classList.remove('onMinigame');
                }
            }
            // @ts-expect-error
            this.refresh();
        };

        this.getPrice = function () {
            let price = this.basePrice * Math.pow(Game.priceIncrease, Math.max(0, this.amount - this.free));
            price = Game.modifyBuildingPrice(this, price);
            return Math.ceil(price);
        };
        this.getSumPrice = function (
            /** @type {number} */ amount // return how much it would cost to buy [amount] more of this building
        ) {
            let price = 0;
            for (let i = Math.max(0, this.amount); i < Math.max(0, this.amount + amount); i++) {
                price += this.basePrice * Math.pow(Game.priceIncrease, Math.max(0, i - this.free));
            }
            price = Game.modifyBuildingPrice(this, price);
            return Math.ceil(price);
        };
        this.getReverseSumPrice = function (
            /** @type {number} */ amount // return how much you'd get from selling [amount] of this building
        ) {
            let price = 0;
            for (let i = Math.max(0, this.amount - amount); i < Math.max(0, this.amount); i++) {
                price += this.basePrice * Math.pow(Game.priceIncrease, Math.max(0, i - this.free));
            }
            price = Game.modifyBuildingPrice(this, price);
            price *= this.getSellMultiplier();
            return Math.ceil(price);
        };
        this.getSellMultiplier = function () {
            let giveBack = 0.25;
            giveBack *= 1 + Game.auraMult('Earth Shatterer');
            return giveBack;
        };

        this.buy = function (/** @type {number} */ amount) {
            if (Game.buyMode == -1) {
                // @ts-expect-error
                this.sell(Game.buyBulk, 1);
                return 0;
            }
            let success = 0;
            if (!amount) amount = Game.buyBulk;
            if (amount == -1) amount = 1000;
            for (let i = 0; i < amount; i++) {
                // @ts-expect-error
                let price = this.getPrice();
                if (Game.cookies >= price) {
                    Game.Spend(price);
                    // @ts-expect-error
                    this.amount++;
                    // @ts-expect-error
                    this.bought++;
                    // @ts-expect-error
                    price = this.getPrice();
                    this.price = price;
                    // @ts-expect-error
                    if (this.buyFunction) this.buyFunction(this);
                    Game.recalculateGains = 1;
                    // @ts-expect-error
                    if (this.amount == 1 && this.id != 0) $('row' + this.id).classList.add('enabled');
                    // @ts-expect-error
                    this.highest = Math.max(this.highest, this.amount);
                    Game.BuildingsOwned++;
                    success = 1;
                }
            }
            if (success) {
                PlaySound('snd/buy' + choose([1, 2, 3, 4]) + '.mp3', 0.75);
                // @ts-expect-error
                this.refresh();
            }
            return;
        };
        this.sell = function (/** @type {number} */ amount) {
            let success = 0;
            let sold = 0;
            // @ts-expect-error
            if (amount == -1) amount = this.amount;
            if (!amount) amount = Game.buyBulk;
            for (let i = 0; i < amount; i++) {
                // @ts-expect-error
                let price = this.getPrice();
                // @ts-expect-error
                let giveBack = this.getSellMultiplier();
                price = Math.floor(price * giveBack);
                // @ts-expect-error
                if (this.amount > 0) {
                    sold++;
                    Game.cookies += price;
                    Game.cookiesEarned = Math.max(Game.cookies, Game.cookiesEarned); // this is to avoid players getting the cheater achievement when selling buildings that have a higher price than they used to
                    // @ts-expect-error
                    this.amount--;
                    // @ts-expect-error
                    price = this.getPrice();
                    this.price = price;
                    // @ts-expect-error
                    if (this.sellFunction) this.sellFunction();
                    Game.recalculateGains = 1;
                    // @ts-expect-error
                    if (this.amount == 0 && this.id != 0) $('row' + this.id).classList.remove('enabled');
                    Game.BuildingsOwned--;
                    success = 1;
                }
            }
            if (success && Game.hasGod) {
                let godLvl = Game.hasGod('ruin');
                let old = Game.hasBuff('Devastation');
                if (old) {
                    if (godLvl == 1) old.multClick += sold * 0.01;
                    else if (godLvl == 2) old.multClick += sold * 0.005;
                    else if (godLvl == 3) old.multClick += sold * 0.0025;
                } else {
                    if (godLvl == 1) Game.gainBuff('devastation', 10, 1 + sold * 0.01);
                    else if (godLvl == 2) Game.gainBuff('devastation', 10, 1 + sold * 0.005);
                    else if (godLvl == 3) Game.gainBuff('devastation', 10, 1 + sold * 0.0025);
                }
            }
            if (success && Game.shimmerTypes['golden'].n <= 0 && Game.auraMult('Dragon Orbs') > 0) {
                let highestBuilding;
                for (let i in Game.Objects) {
                    if (Game.Objects[i].amount > 0) highestBuilding = Game.Objects[i];
                }
                // @ts-expect-error uhhh
                if (ASSERT_NOT_NULL(highestBuilding) === this && Math.random() < Game.auraMult('Dragon Orbs') * 0.1) {
                    let buffsN = 0;
                    for (let ii in Game.buffs) {
                        buffsN++; ii;
                    }
                    if (buffsN == 0) {
                        new Game.shimmer('golden');
                        Game.Notify(EN ? 'Dragon Orbs!' : loc('Dragon Orbs'), loc('Wish granted. Golden cookie spawned.'), [33, 25]);
                    }
                }
            }
            if (success) {
                PlaySound('snd/sell' + choose([1, 2, 3, 4]) + '.mp3', 0.75);
                // @ts-expect-error
                this.refresh();
            }
        };
        this.sacrifice = function (
            /** @type {number} */ amount // sell without getting back any money
        ) {
            let success = 0;
            // @ts-expect-error
            if (amount == -1) amount = this.amount;
            if (!amount) amount = 1;
            for (let i = 0; i < amount; i++) {
                // @ts-expect-error
                let price = this.getPrice();
                price = Math.floor(price * 0.5);
                // @ts-expect-error
                if (this.amount > 0) {
                    // @ts-expect-error
                    this.amount--;
                    // @ts-expect-error
                    price = this.getPrice();
                    this.price = price;
                    // @ts-expect-error
                    if (this.sellFunction) this.sellFunction();
                    Game.recalculateGains = 1;
                    // @ts-expect-error
                    if (this.amount == 0 && this.id != 0) $('row' + this.id).classList.remove('enabled');
                    Game.BuildingsOwned--;
                    success = 1;
                }
            }
            if (success) {
                // @ts-expect-error
                this.refresh();
            }
        };
        this.buyFree = function (
            /** @type {number} */ amount // unlike getFree, this still increases the price
        ) {
            for (let i = 0; i < amount; i++) {
                if (Game.cookies >= price) {
                    // @ts-expect-error
                    this.amount++;
                    // @ts-expect-error
                    this.bought++;
                    // @ts-expect-error
                    this.price = this.getPrice();
                    Game.recalculateGains = 1;
                    // @ts-expect-error
                    if (this.amount == 1 && this.id != 0) $('row' + this.id).classList.add('enabled');
                    // @ts-expect-error
                    this.highest = Math.max(this.highest, this.amount);
                    Game.BuildingsOwned++;
                }
            }
            // @ts-expect-error
            this.refresh();
        };
        this.getFree = function (
            /** @type {number} */ amount // get X of this building for free, with the price behaving as if you still didn't have them
        ) {
            // @ts-expect-error
            this.amount += amount;
            // @ts-expect-error
            this.bought += amount;
            // @ts-expect-error
            this.free += amount;
            // @ts-expect-error
            this.highest = Math.max(this.highest, this.amount);
            Game.BuildingsOwned += amount;
            // @ts-expect-error
            this.highest = Math.max(this.highest, this.amount);
            // @ts-expect-error
            this.refresh();
        };
        this.getFreeRanks = function (
            /** @type {number} */ amount // this building's price behaves as if you had X less of it
        ) {
            this.free += amount;
            this.refresh();
        };

        this.tooltip = () => {
            let ariaText = '';
            let desc = this.desc;
            let name = this.dname;
            if (Game.season === 'fools') {
                if (!Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */(this.name)]) {
                    name = Game.foolObjects['Unknown'].name;
                    desc = Game.foolObjects['Unknown'].desc;
                } else {
                    name = Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */(this.name)].name;
                    desc = Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */(this.name)].desc;
                }
            }
            let icon = /** @type {[number, number]} */ ([this.iconColumn, 0]);
            if (this.locked) {
                name = '???';
                desc = '???';
                icon = [0, 7];
            }

            let canBuy = false;
            let price = this.bulkPrice;
            if ((Game.buyMode == 1 && Game.cookies >= price) || (Game.buyMode == -1 && this.amount > 0)) canBuy = true;

            let synergiesStr = '';
            // note : might not be entirely accurate, math may need checking
            if (this.amount > 0) {
                /** @type {Record<string, number>} */
                let synergiesWith = {};
                let synergyBoost = 0;

                if (this.name == 'Grandma') {
                    for (const synergy of Game.GrandmaSynergies) {
                        if (Game.Has(synergy)) {
                            const other = ASSERT_NOT_NULL(Game.Upgrades[synergy].buildingTie);
                            const mult = this.amount * 0.01 * (1 / (other.id - 1));
                            const boost = other.storedTotalCps * Game.globalCpsMult - (other.storedTotalCps * Game.globalCpsMult) / (1 + mult);
                            synergyBoost += boost;
                            if (!synergiesWith[other.plural]) synergiesWith[other.plural] = 0;
                            synergiesWith[other.plural] += mult;
                        }
                    }
                } else if (this.name == 'Portal' && Game.Has('Elder Pact')) {
                    let other = Game.Objects['Grandma'];
                    let boost = this.amount * 0.05 * other.amount * Game.globalCpsMult;
                    synergyBoost += boost;
                    if (!synergiesWith[other.plural]) synergiesWith[other.plural] = 0;
                    synergiesWith[other.plural] += boost / (other.storedTotalCps * Game.globalCpsMult);
                }
                
                for (const it of this.synergies) {
                    if (Game.Has(it.name)) {
                        let weight = 0.05;
                        let other = it.buildingTie1;
                        if (this == it.buildingTie1) {
                            weight = 0.001;
                            other = it.buildingTie2;
                        }
                        let boost = other.storedTotalCps * Game.globalCpsMult - (other.storedTotalCps * Game.globalCpsMult) / (1 + this.amount * weight);
                        synergyBoost += boost;
                        if (!synergiesWith[other.plural]) synergiesWith[other.plural] = 0;
                        synergiesWith[other.plural] += this.amount * weight;
                    }
                }
                if (synergyBoost > 0) {
                    for (let i in synergiesWith) {
                        if (synergiesStr != '') synergiesStr += ', ';
                        synergiesStr +=
                            '<span style="color:#fff;font-weight:bold;font-size:80%;background:#000;' +
                            'box-shadow:0px 0px 0px 1px rgba(255,255,255,0.2);border-radius:3px;padding:0px 2px;display:inline-block;">' +
                            i + ' +' + Beautify(synergiesWith[i] * 100, 1) + '%</span>';
                    }
                    synergiesStr =
                        loc('...also boosting some other buildings:') +
                        ' ' +
                        synergiesStr +
                        ' - ' +
                        loc('all combined, these boosts account for <b>%1</b> per second (<b>%2%</b> of total CpS)', [
                            // @ts-expect-error uncertain
                            loc('%1 cookie', LBeautify(synergyBoost, 1)),
                            Beautify((synergyBoost / Game.cookiesPs) * 100, 1)
                        ]);
                }
            }

            if (Game.prefs.screenreader) {
                ariaText = this.locked ? 'This building is not yet unlocked. ' : `${name}. `;
                if (!this.locked) ariaText += 'You own ' + this.amount + '. ';
                ariaText += (canBuy ? 'Can buy 1 for' : 'Cannot afford the') + ' ' + Beautify(Math.round(price)) + ' cookies. ';
                if (!this.locked && this.totalCookies > 0) {
                    ariaText +=
                        'Each ' + this.single + ' produces ' + Beautify((this.storedTotalCps / this.amount) * Game.globalCpsMult, 1) + ' cookies per second. ';
                    ariaText += Beautify(this.totalCookies) + ' cookies ' + this.actionName + ' so far. ';
                }
                if (!this.locked) ariaText += desc;

                let ariaLabel = $('ariaReader-product-' + this.id);
                if (ariaLabel) ariaLabel.innerHTML = ariaText.replace(/(<([^>]+)>)/gi, ' ');
            }

            return (
                '<div style="position:absolute;left:1px;top:1px;right:1px;bottom:1px;background:linear-gradient(125deg,' +
                'rgba(50,40,40,1) 0%,rgba(50,40,40,0)' +
                ' 20%);mix-blend-mode:screen;z-index:1;"></div><div style="z-index:10;min-width:350px;padding:8px;position:relative;" id="tooltipBuilding"><div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;' +
                writeIcon(icon) +
                '"></div><div style="float:right;text-align:right;"><span class="price' +
                (canBuy ? '' : ' disabled') +
                '">' +
                Beautify(Math.round(price)) +
                '</span>' +
                Game.costDetails(price) +
                '</div><div class="name">' +
                name +
                '</div>' +
                '<small><div class="tag">' +
                loc('owned: %1', this.amount) +
                '</div>' +
                (this.free > 0 ? '<div class="tag">' + loc('free: %1!', this.free) + '</div>' : '') +
                '</small>' +
                '<div class="line"></div><div class="description"><q>' +
                desc +
                '</q></div>' +
                (this.totalCookies > 0
                    ? '<div class="line"></div>' +
                    (this.amount > 0
                        ? '<div class="descriptionBlock">' +
                        loc('each %1 produces <b>%2</b> per second', [
                            this.single,
                            // @ts-expect-error unsure
                            loc('%1 cookie', LBeautify((this.storedTotalCps / this.amount) * Game.globalCpsMult, 1))
                        ]) +
                        '</div>'
                        : '') +
                    '<div class="descriptionBlock">' +
                    loc('%1 producing <b>%2</b> per second', [
                        // @ts-expect-error
                        loc('%1 ' + this.bsingle, LBeautify(this.amount)),
                        // @ts-expect-error
                        loc('%1 cookie', LBeautify(this.storedTotalCps * Game.globalCpsMult, 1))
                    ]) +
                    ' (' +
                    loc(
                        '<b>%1%</b> of total CpS',
                        Beautify(Game.cookiesPs > 0 ? (this.amount > 0 ? (this.storedTotalCps * Game.globalCpsMult) / Game.cookiesPs : 0) * 100 : 0, 1)
                    ) +
                    ')</div>' +
                    (synergiesStr ? '<div class="descriptionBlock">' + synergiesStr + '</div>' : '') +
                    (EN
                        ? '<div class="descriptionBlock"><b>' +
                        Beautify(this.totalCookies) +
                        '</b> ' +
                        (Math.floor(this.totalCookies) == 1 ? 'cookie' : 'cookies') +
                        ' ' +
                        this.actionName +
                        ' so far</div>'
                        : '<div class="descriptionBlock">' + loc('<b>%1</b> produced so far', loc('%1 cookie', LBeautify(this.totalCookies))) + '</div>')
                    : '') +
                '</div>'
            );
        };
        this.levelTooltip = () => {
            return (
                '<div style="width:280px;padding:8px;" id="tooltipLevel"><b>' +
                loc('Level %1 %2', [Beautify(this.level), this.plural]) +
                '</b><div class="line"></div>' +
                (EN
                    ? (this.level == 1 ? this.extraName : this.extraPlural).replace('[X]', Beautify(this.level)) +
                    ' granting <b>+' +
                    Beautify(this.level) +
                    '% ' +
                    this.dname +
                    ' CpS</b>.'
                    : loc('Granting <b>+%1% %2 CpS</b>.', [Beautify(this.level), this.single])) +
                '<div class="line"></div>' +
                loc(
                    'Click to level up for %1.',
                    '<span class="price lump' +
                    (Game.lumps >= this.level + 1 ? '' : ' disabled') +
                    '">' +
                    loc('%1 sugar lump', LBeautify(this.level + 1)) +
                    '</span>'
                ) +
                (this.level == 0 && this.minigameUrl ? '<div class="line"></div><b>' + loc('Levelling up this building unlocks a minigame.') + '</b>' : '') +
                '</div>'
            );
        };
        this.levelUp = (function (me) {
            return function (/** @type {boolean=} */ free = false) {
                Game.spendLump(
                    me.level + 1,
                    loc('level up your %1', me.plural),
                    function () {
                        me.level += 1;
                        if (me.level >= 10 && me.levelAchiev10) Game.Win(me.levelAchiev10.name);
                        if (!free) PlaySound('snd/upgrade.mp3', 0.6);
                        Game.LoadMinigames();
                        me.refresh();
                        if ($('productLevel' + me.id)) {
                            const rect = $('productLevel' + me.id, true).getBounds();
                            Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24 + 32 - 32);
                        }
                        if (me.minigame && me.minigame.onLevel) me.minigame.onLevel(me.level);
                    },
                    // @ts-expect-error what the hell
                    free
                )();
            };
        })(this);

        this.refresh = function () // show/hide the building display based on its amount, and redraw it
        {
            // @ts-expect-error
            this.price = this.getPrice();
            // @ts-expect-error
            if (Game.buyMode == 1) this.bulkPrice = this.getSumPrice(Game.buyBulk);
            // @ts-expect-error
            else if (Game.buyMode == -1 && Game.buyBulk == -1) this.bulkPrice = this.getReverseSumPrice(1000);
            // @ts-expect-error
            else if (Game.buyMode == -1) this.bulkPrice = this.getReverseSumPrice(Game.buyBulk);
            // @ts-expect-error
            this.rebuild();
            // @ts-expect-error
            if (this.amount == 0 && this.id != 0) $('row' + this.id).classList.remove('enabled');
            // @ts-expect-error
            else if (this.amount > 0 && this.id != 0) $('row' + this.id).classList.add('enabled');
            // @ts-expect-error
            if (this.muted > 0 && this.id != 0) {
                // @ts-expect-error
                $('row' + this.id).classList.add('muted');
                // @ts-expect-error
                $('mutedProduct' + this.id).style.display = 'inline-block';
            }
            // @ts-expect-error
            else if (this.id != 0) {
                // @ts-expect-error
                $('row' + this.id).classList.remove('muted');
                // @ts-expect-error
                $('mutedProduct' + this.id).style.display = 'none';
            }
        };
        this.rebuild = () => {
            let price = this.bulkPrice;
            let icon = [0, this.icon];
            let iconOff = [1, this.icon];
            // @ts-expect-error
            if (this.iconFunc) icon = this.iconFunc();

            let name = this.dname;
            let displayName = this.displayName;
            if (Game.season == 'fools') {
                if (!Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */(this.name)]) {
                    icon = [2, 0];
                    iconOff = [3, 0];
                    name = Game.foolObjects['Unknown'].name;
                } else {
                    icon = [2, this.icon];
                    iconOff = [3, this.icon];
                    name = Game.foolObjects[/** @type {keyof typeof Game.foolObjects} */(this.name)].name;
                }
                displayName = name;
            } else if (!EN) displayName = name;
            icon = [icon[0] * 64, icon[1] * 64];
            iconOff = [iconOff[0] * 64, iconOff[1] * 64];

            // @ts-expect-error
            $('productIcon' + this.id).style.backgroundPosition = '-' + icon[0] + 'px -' + icon[1] + 'px';
            // @ts-expect-error
            $('productIconOff' + this.id).style.backgroundPosition = '-' + iconOff[0] + 'px -' + iconOff[1] + 'px';
            // @ts-expect-error
            $('productName' + this.id).innerHTML = displayName;
            // @ts-expect-error
            if (name.length > 12 / Langs[locId].w && (Game.season == 'fools' || !EN)) $('productName' + this.id).classList.add('longProductName');
            // @ts-expect-error
            else $('productName' + this.id).classList.remove('longProductName');
            // @ts-expect-error
            $('productOwned' + this.id).textContent = this.amount || '';
            // @ts-expect-error
            $('productPrice' + this.id).textContent = Beautify(Math.round(price));
            // @ts-expect-error
            $('productPriceMult' + this.id).textContent = Game.buyBulk > 1 ? 'x' + Game.buyBulk + ' ' : '';
            // @ts-expect-error
            $('productLevel' + this.id).textContent = 'lvl ' + Beautify(this.level);
            if (Game.isMinigameReady(this) && Game.ascensionMode != 1) {
                // @ts-expect-error
                $('productMinigameButton' + this.id).style.display = 'block';
                // @ts-expect-error
                if (!this.onMinigame) $('productMinigameButton' + this.id).innerHTML = loc('View %1', this.minigameName);
                // @ts-expect-error
                else $('productMinigameButton' + this.id).innerHTML = loc('Close %1', this.minigameName);
            }
            // @ts-expect-error
            else $('productMinigameButton' + this.id).style.display = 'none';
            // @ts-expect-error
            if (Game.isMinigameReady(this) && Game.ascensionMode != 1 && this.minigame.dragonBoostTooltip && Game.hasAura('Supreme Intellect')) {
                // @ts-expect-error
                $('productDragonBoost' + this.id).style.display = 'block';
            }
            // @ts-expect-error
            else $('productDragonBoost' + this.id).style.display = 'none';
        };
        this.muted = false;
        this.mute = function (/** @type {any} */ val) {
            // @ts-expect-error
            if (this.id == 0) return false;
            this.muted = val;
            if (val) {
                // @ts-expect-error
                $('productMute' + this.id).classList.add('on');
                // @ts-expect-error
                $('row' + this.id).classList.add('muted');
                // @ts-expect-error
                $('mutedProduct' + this.id).style.display = 'inline-block';
            }
            else {
                // @ts-expect-error
                $('productMute' + this.id).classList.remove('on');
                // @ts-expect-error
                $('row' + this.id).classList.remove('muted');
                // @ts-expect-error
                $('mutedProduct' + this.id).style.display = 'none';
            }
            return true;
        };

        this.draw = STUB;

        let str = '';
        if (this.id != 0) str += '<div class="row" id="row' + this.id + '"><div class="separatorBottom"></div>';
        str += '<div class="productButtons">';
        str +=
            '<div id="productLevel' +
            this.id +
            '" class="productButton productLevel lumpsOnly" onclick="Game.ObjectsById[' +
            this.id +
            '].levelUp()" ' +
            Game.getDynamicTooltip('Game.ObjectsById[' + this.id + '].levelTooltip', 'this') +
            '></div>';
        str +=
            '<div id="productMinigameButton' +
            this.id +
            '" class="productButton productMinigameButton lumpsOnly" onclick="Game.ObjectsById[' +
            this.id +
            '].switchMinigame(-1);PlaySound(Game.ObjectsById[' +
            this.id +
            '].onMinigame?\'snd/clickOn2.mp3\':\'snd/clickOff2.mp3\');"></div>';
        if (this.id != 0)
            str +=
                '<div class="productButton productMute" ' +
                Game.getTooltip(
                    '<div style="width:150px;text-align:center;font-size:11px;" id="tooltipMuteBuilding"><b>' +
                    loc('Mute') +
                    '</b><br>(' +
                    loc('Minimize this building') +
                    ')</div>',
                    'this'
                ) +
                ' onclick="Game.ObjectsById[' +
                this.id +
                '].mute(1);PlaySound(Game.ObjectsById[' +
                this.id +
                '].muted?\'snd/clickOff2.mp3\':\'snd/clickOn2.mp3\');" id="productMute' +
                this.id +
                '">' +
                loc('Mute') +
                '</div>';
        str +=
            '<div id="productDragonBoost' +
            this.id +
            '" style="display:none;" class="productButton productDragonBoost" ' +
            Game.getDynamicTooltip(
                'function(){if (Game.ObjectsById[' +
                this.id +
                '].minigame && Game.ObjectsById[' +
                this.id +
                '].minigame.dragonBoostTooltip) return Game.ObjectsById[' +
                this.id +
                '].minigame.dragonBoostTooltip(); else return 0;}',
                'this'
            ) +
            '><div class="icon" style="vertical-align:middle;display:inline-block;background-position:' +
            -30 * 48 +
            'px ' +
            -12 * 48 +
            'px;transform:scale(0.5);margin:-20px -16px;"></div></div>';
        str += '</div>';
        if (this.id == 0) $('sectionLeftExtra', true).innerHTML = $('sectionLeftExtra', true).innerHTML + str;
        else {
            str += '<canvas class="rowCanvas" id="rowCanvas' + this.id + '"></canvas>';
            str += '<div class="rowSpecial" id="rowSpecial' + this.id + '"></div>';
            str += '</div>';
            $('rows', true).innerHTML = $('rows', true).innerHTML + str;

            // building canvas
            this.pics = [];

            this.toResize = true;
            this.redraw = () => {
                this.pics = [];
            };
            this.draw = function () {
                // @ts-expect-error
                if (this.amount <= 0) return false;
                if (this.toResize) {
                    // @ts-expect-error
                    this.canvas.width = this.canvas.clientWidth;
                    // @ts-expect-error
                    this.canvas.height = this.canvas.clientHeight;
                    this.toResize = false;
                }
                // @ts-expect-error
                let ctx = this.ctx;
                // clear
                ctx.globalAlpha = 1;

                // pic : a loaded picture or a function returning a loaded picture
                // bg : a loaded picture or a function returning a loaded picture - tiled as the background, 128x128
                // xV : the pictures will have a random horizontal shift by this many pixels
                // yV : the pictures will have a random vertical shift by this many pixels
                // w : how many pixels between each picture (or row of pictures)
                // x : horizontal offset
                // y : vertical offset (+32)
                // rows : if >1, arrange the pictures in rows containing this many pictures
                // frames : if present, slice the pic in [frames] horizontal slices and pick one at random

                // @ts-expect-error
                let pic = this.art.pic;
                // @ts-expect-error
                let bg = this.art.bg;
                // @ts-expect-error
                let xV = this.art.xV || 0;
                // @ts-expect-error
                let yV = this.art.yV || 0;
                // @ts-expect-error
                let w = this.art.w || 48;
                // @ts-expect-error
                let offX = this.art.x || 0;
                // @ts-expect-error
                let offY = this.art.y || 0;
                // @ts-expect-error
                let rows = this.art.rows || 1;
                // @ts-expect-error
                let frames = this.art.frames || 1;

                // @ts-expect-error
                if (typeof bg === 'string') ctx.fillPattern(Pic(this.art.bg), 0, 0, this.canvas.width, this.canvas.height, 128, 128);
                else bg(this, ctx);
                // @ts-expect-error
                let maxI = Math.floor(this.canvas.width / (w / rows) + 1);
                // @ts-expect-error
                let iT = Math.min(this.amount, maxI);
                // @ts-expect-error
                let i = this.pics.length;

                let x = 0;
                let y = 0;
                if (i != iT) {
                    let prevFrame = 0;
                    while (i < iT) {
                        // @ts-expect-error
                        Math.seedrandom(Game.seed + ' ' + this.id + ' ' + i);
                        if (rows != 1) {
                            x = Math.floor(i / rows) * w + ((i % rows) / rows) * w + Math.floor((Math.random() - 0.5) * xV) + offX;
                            y = 32 + Math.floor((Math.random() - 0.5) * yV) + (((-rows / 2) * 32) / 2 + ((i % rows) * 32) / 2) + offY;
                        } else {
                            x = i * w + Math.floor((Math.random() - 0.5) * xV) + offX;
                            y = 32 + Math.floor((Math.random() - 0.5) * yV) + offY;
                        }
                        let usedPic = typeof pic == 'string' ? pic : pic(this, i);
                        let frame = -1;
                        if (frames > 1) {
                            frame = prevFrame + Math.floor(Math.random() * (frames - 1) + 1);
                            frame %= frames;
                        }
                        prevFrame = frame;
                        // @ts-expect-error
                        this.pics.push({
                            x: Math.floor(x),
                            y: Math.floor(y),
                            z: y,
                            pic: usedPic,
                            id: i,
                            frame: frame
                        });
                        i++;
                    }
                    while (i > iT) {
                        // @ts-expect-error
                        this.pics.sort(Game.sortSpritesById);
                        // @ts-expect-error
                        this.pics.pop();
                        i--;
                    }
                    // @ts-expect-error
                    this.pics.sort(Game.sortSprites);
                }

                // @ts-expect-error
                let len = this.pics.length;

                let selected = -1;
                // @ts-expect-error
                if (this.mouseOn && this.name === 'Grandma') {
                    // mouse detection only fits grandma sprites for now
                    let marginW = -18;
                    let marginH = -10;
                    for (let i = 0; i < len; i++) {
                        // @ts-expect-error
                        const pic = this.pics[i];
                        if (
                            // @ts-expect-error
                            this.mousePos[0] >= pic.x - marginW &&
                            // @ts-expect-error
                            this.mousePos[0] < pic.x + 64 + marginW &&
                            // @ts-expect-error
                            this.mousePos[1] >= pic.y - marginH &&
                            // @ts-expect-error
                            this.mousePos[1] < pic.y + 64 + marginH
                        )
                            selected = i;
                        if (selected == i && pic.pic == 'elfGrandma.png' && Game.mouseDown) Game.Win('Baby it\'s old outside');
                    }
                    if (Game.prefs.customGrandmas && Game.customGrandmaNames.length > 0) {
                        let str = loc('Names in white were submitted by our supporters on Patreon.');
                        ctx.globalAlpha = 0.75;
                        ctx.fillStyle = '#000';
                        ctx.font = '9px Merriweather';
                        ctx.textAlign = 'left';
                        ctx.fillRect(0, 0, ctx.measureText(str).width + 4, 12);
                        ctx.globalAlpha = 1;
                        ctx.fillStyle = 'rgba(255,255,255,0.7)';
                        ctx.fillText(str, 2, 8);
                        if (EN) {
                            ctx.fillStyle = 'rgba(255,255,255,1)';
                            ctx.fillText('white', 2 + ctx.measureText('Names in ').width, 8);
                        }
                    }
                }

                Math.seedrandom();

                for (let i = 0; i < len; i++) {
                    // @ts-expect-error
                    let pic = this.pics[i];
                    let sprite = Pic(pic.pic);
                    // @ts-expect-error
                    if (selected == i && this.name === 'Grandma') {
                        ctx.font = '14px Merriweather';
                        ctx.textAlign = 'center';
                        Math.seedrandom(Game.seed + ' ' + pic.id);
                        let years = (Date.now() - +new Date(2013, 7, 8)) / (1000 * 60 * 60 * 24 * 365) + Math.random(); // the grandmas age with the game
                        let name = choose(Game.grandmaNames);
                        let custom = false;
                        if (Game.prefs.customGrandmas && Game.customGrandmaNames.length > 0 && Math.random() < 0.2) {
                            name = choose(Game.customGrandmaNames);
                            custom = true;
                        }
                        // @ts-expect-error
                        let text = loc('%1, age %2', [name, Beautify(Math.floor(70 + Math.random() * 30 + years + this.level))]);
                        let width = ctx.measureText(text).width + 12;
                        // @ts-expect-error
                        let x = Math.max(0, Math.min(pic.x + 32 - width / 2 + Math.random() * 32 - 16, this.canvas.width - width));
                        let y = 4 + Math.random() * 8 - 4;
                        Math.seedrandom();
                        ctx.fillStyle = '#000';
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 8;
                        ctx.globalAlpha = 0.75;
                        ctx.beginPath();
                        ctx.moveTo(pic.x + 32, pic.y + 32);
                        ctx.lineTo(Math.floor(x + width / 2), Math.floor(y + 20));
                        ctx.stroke();
                        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), 24);
                        ctx.globalAlpha = 1;
                        ctx.fillStyle = custom ? '#fff' : 'rgba(255,255,255,0.7)';
                        ctx.fillText(text, Math.floor(x + width / 2), Math.floor(y + 16));

                        ctx.drawImage(sprite, Math.floor(pic.x + Math.random() * 4 - 2), Math.floor(pic.y + Math.random() * 4 - 2));
                    }
                    else if (pic.frame != -1)
                        ctx.drawImage(
                            sprite,
                            (sprite.width / frames) * pic.frame,
                            0,
                            sprite.width / frames,
                            sprite.height,
                            pic.x,
                            pic.y,
                            sprite.width / frames,
                            sprite.height
                        );
                    else ctx.drawImage(sprite, pic.x, pic.y);
                }
                return true;
            };
        }

        Game.last = this;
        Game.Objects[this.name] = this;
        Game.ObjectsById.push(this);
        Game.ObjectsN++;
    }
}
CookieObject; //! export
