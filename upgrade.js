class Upgrade {
    /**
     * @param {string} name
     * @param {string | string[]} desc
     * @param {any} price
     * @param {any} icon
     * @param {any} [buyFunction]
     */
    constructor(name, desc, price, icon, buyFunction) {
        this.id = Game.UpgradesN;
        this.name = name;
        this.dname = this.name;
        this.desc = desc;
        this.baseDesc = String(this.desc);
        this.basePrice = price;
        this.priceLumps = 0; // note : doesn't do much on its own, you still need to handle the buying yourself
        this.icon = icon;
        this.iconFunction = 0;
        this.buyFunction = buyFunction;
        this.unlocked = 0;
        this.bought = 0;
        this.order = this.id;
        if (order) this.order = order + this.id * 0.001;
        this.pool = ''; // can be '', cookie, toggle, debug, prestige, prestigeDecor, tech, or unused
        if (pool) this.pool = pool;
        this.power = 0;
        if (power) this.power = power;
        this.vanilla = Game.vanilla;
        this.unlockAt = 0;
        /**
         * @type {any[]}
         */
        this.techUnlock = [];
        /**
         * @type {any[]}
         */
        this.parents = [];
        this.type = 'upgrade';
        // @ts-expect-error just... ugh
        this.tier = 0;

        Game.last = this;
        Game.Upgrades[this.name] = this;
        Game.UpgradesById[this.id] = this;
        Game.UpgradesN++;
        return this;
    }

    /** @type {keyof typeof Game.Tiers} */
    tier;

    /** @type {keyof typeof Game.seasons | undefined} */
    season;

    /** @type {{ cookies: number, name: any } | number} */
    unlockAt;
    /**
     * of what building is this a tiered upgrade of ?
     *
     * @type {CookieObject | undefined}
     */
    buildingTie;
    /** @type {CookieObject | undefined} */
    buildingTie1;
    /** @type {CookieObject | undefined} */
    buildingTie2;
    /** @type {boolean | undefined} */
    lasting;
    /** @type {Function | undefined} */
    priceFunc;
    /** @type {Function | undefined} */
    displayFuncWhenOwned;
    /** @type {Function | undefined} */
    timerDisplay;
    /** @type {Function | undefined} */
    clickFunction;
    /** @type {(() => boolean) | undefined} */
    canBuyFunc;
    /** @type {number | undefined} */
    kitten;
    /** @type {VoidFunction | undefined} */
    descFunc;
    /** @type {any} */
    ddesc;
    /** @type {number | undefined} */
    posX;
    /** @type {number | undefined} */
    posY;
    /** @type {boolean | undefined} */
    placedByCode;
    /** @type {any} */
    pseudoCookie;

    getType() {
        return 'Upgrade';
    }

    getPrice() {
        let price = this.basePrice;
        if (this.priceFunc) price = this.priceFunc(this);
        if (price == 0) return 0;
        if (this.pool != 'prestige') {
            if (Game.Has('Toy workshop')) price *= 0.95;
            if (Game.Has('Five-finger discount')) price *= Math.pow(0.99, Game.Objects['Cursor'].amount / 100);
            if (Game.Has('Santa\'s dominion')) price *= 0.98;
            if (Game.Has('Faberge egg')) price *= 0.99;
            if (Game.Has('Divine sales')) price *= 0.99;
            if (Game.Has('Fortune #100')) price *= 0.99;
            if (this.kitten && Game.Has('Kitten wages')) price *= 0.9;
            if (Game.hasBuff('Haggler\'s luck')) price *= 0.98;
            if (Game.hasBuff('Haggler\'s misery')) price *= 1.02;
            price *= 1 - Game.auraMult('Master of the Armory') * 0.02;
            price *= Game.eff('upgradeCost');
            if (this.pool == 'cookie' && Game.Has('Divine bakeries')) price /= 5;
        }
        return Math.ceil(price);
    }

    canBuy() {
        if (this.canBuyFunc) return this.canBuyFunc();
        return Game.cookies >= this.getPrice();
    }

    //////////////////////////////////////////////

    isVaulted() {
        return Game.vault.includes(this.id);
    }
    vault() {
        if (!this.isVaulted()) Game.vault.push(this.id);
    }
    unvault() {
        if (this.isVaulted()) Game.vault.splice(Game.vault.indexOf(this.id), 1);
    }

    /**
     * @param {MouseEvent} e
     */
    click(e) {
        if ((e && e.shiftKey) || Game.keys['ShiftLeft'] || Game.keys['ShiftRight']) {
            if (this.pool == 'toggle' || this.pool == 'tech') { /* empty */ } else if (Game.Has('Inspired checklist')) {
                if (this.isVaulted()) this.unvault();
                else this.vault();
                Game.upgradesToRebuild = 1;
                PlaySound('snd/tick.mp3');
            }
        } else this.buy();
    }

    /**
     * @param {boolean} [bypass]
     */
    buy(bypass) {
        let success = 0;
        let cancelPurchase = 0;
        // @ts-expect-error
        if (this.clickFunction && !bypass) cancelPurchase = !this.clickFunction();
        if (!cancelPurchase) {
            if (this.choicesFunction) {
                if (Game.choiceSelectorOn == this.id) {
                    $('toggleBox', true).style.display = 'none';
                    $('toggleBox', true).innerHTML = '';
                    Game.choiceSelectorOn = -1;
                    PlaySound('snd/tickOff.mp3');
                } else {
                    Game.choiceSelectorOn = this.id;
                    let choices = this.choicesFunction();
                    let str = '';
                    str += '<div class="close" onclick="Game.UpgradesById[' + this.id + '].buy();">x</div>';
                    str += '<h3>' + this.dname + '</h3>' + '<div class="line"></div>';
                    if (typeof choices === 'string') {
                        str += choices;
                    } else if (choices.length > 0) {
                        let selected = '0';
                        for (let i in choices) {
                            if (choices[i].selected) selected = i;
                        }
                        Game.choiceSelectorChoices = choices; // this is a really dumb way of doing this i am so sorry
                        Game.choiceSelectorSelected = selected;
                        str += '<h4 id="choiceSelectedName">' + choices[selected].name + '</h4>' + '<div class="line"></div>';

                        for (let i in choices) {
                            choices[i].id = i;
                            choices[i].order = choices[i].order || 0;
                        }

                        const sortMap = function (
                            /** @type {{ order: number; }} */ a,
                            /** @type {{ order: number; }} */ b
                        ) {
                            if (a.order > b.order) return 1;
                            else if (a.order < b.order) return -1;
                            else return 0;
                        };
                        choices.sort(sortMap);

                        for (const [i, choice] of choices.entries()) {
                            if (!choice) continue;
                            const icon = choice.icon;
                            const id = choice.id;
                            if (choice.div) str += '<div class="line"></div>';
                            str +=
                                '<div class="crate noFrame enabled' +
                                (id == selected ? ' highlighted' : '') +
                                '" style="opacity:1;float:none;display:inline-block;' +
                                writeIcon(icon) +
                                '" ' +
                                Game.clickStr +
                                '="Game.UpgradesById[' +
                                this.id +
                                '].choicesPick(' +
                                id +
                                ');Game.choiceSelectorOn=-1;Game.UpgradesById[' +
                                this.id +
                                '].buy();" onMouseOut="$(\'choiceSelectedName\').innerHTML=Game.choiceSelectorChoices[Game.choiceSelectorSelected].name;" onMouseOver="$(\'choiceSelectedName\').innerHTML=Game.choiceSelectorChoices[' +
                                i +
                                '].name;"' +
                                '></div>';
                        }
                    }
                    $('toggleBox', true).innerHTML = str;
                    $('toggleBox', true).style.display = 'block';
                    $('toggleBox', true).focus();
                    Game.tooltip.hide();
                    PlaySound('snd/tick.mp3');
                    success = 1;
                }
            } else if (this.pool != 'prestige') {
                let price = this.getPrice();
                if (this.canBuy() && !this.bought) {
                    Game.Spend(price);
                    this.bought = 1;
                    if (this.buyFunction) this.buyFunction();
                    if (this.toggleInto) {
                        Game.Lock(this.toggleInto);
                        Game.Unlock(this.toggleInto);
                    }
                    Game.upgradesToRebuild = 1;
                    Game.recalculateGains = 1;
                    if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned++;
                    Game.setOnCrate(0);
                    Game.tooltip.hide();
                    PlaySound('snd/buy' + choose([1, 2, 3, 4]) + '.mp3', 0.75);
                    success = 1;
                }
            } else {
                let price = this.getPrice();
                if (Game.heavenlyChips >= price && !this.bought) {
                    Game.heavenlyChips -= price;
                    Game.heavenlyChipsSpent += price;
                    this.unlocked = 1;
                    this.bought = 1;
                    if (this.buyFunction) this.buyFunction();
                    Game.BuildAscendTree(this);
                    PlaySound('snd/buy' + choose([1, 2, 3, 4]) + '.mp3', 0.75);
                    PlaySound('snd/shimmerClick.mp3');
                    success = 1;
                }
            }
        }
        if (this.bought && this.activateFunction) this.activateFunction();
        return success;
    }
    earn() // just win the upgrades without spending anything
    {
        this.unlocked = 1;
        this.bought = 1;
        if (this.buyFunction) this.buyFunction();
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned++;
    }
    unearn() // remove the upgrade, but keep it unlocked
    {
        this.bought = 0;
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned--;
    }
    unlock() {
        this.unlocked = 1;
        Game.upgradesToRebuild = 1;
    }
    lose() {
        this.unlocked = 0;
        this.bought = 0;
        Game.upgradesToRebuild = 1;
        Game.recalculateGains = 1;
        if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned--;
    }
    toggle() // cheating only
    {
        if (!this.bought) {
            this.bought = 1;
            if (this.buyFunction) this.buyFunction();
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned++;
            PlaySound('snd/buy' + choose([1, 2, 3, 4]) + '.mp3', 0.75);
            if (this.pool == 'prestige' || this.pool == 'debug') PlaySound('snd/shimmerClick.mp3');
        } else {
            this.bought = 0;
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned--;
            PlaySound('snd/sell' + choose([1, 2, 3, 4]) + '.mp3', 0.75);
            if (this.pool == 'prestige' || this.pool == 'debug') PlaySound('snd/shimmerClick.mp3');
        }
        if (Game.onMenu == 'stats') Game.UpdateMenu();
    }

    /** @type {Function | undefined} */
    choicesFunction;
    /** @type {Function | undefined} */
    activateFunction;
    /** @type {any | undefined} */
    toggleInto;
}
Upgrade; //! export
