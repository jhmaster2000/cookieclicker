class Achievement {
    /**
     * @param {keyof typeof Game.Achievements} name
     * @param {keyof typeof Game.AchievementsById | string[]} desc
     * @param {any} icon
     */
    constructor(name, desc, icon) {
        desc = String(desc);
        this.id = Game.AchievementsN;
        this.name = name;
        this.dname = this.name;
        this.desc = desc;
        this.baseDesc = this.desc;
        this.icon = icon;
        this.won = 0;
        this.disabled = 0;
        this.order = this.id;
        if (order) this.order = order + this.id * 0.001;
        this.pool = 'normal';
        this.vanilla = Game.vanilla;
        this.type = 'achievement';

        this.click = function () {
            // @ts-expect-error
            if (this.clickFunction) this.clickFunction();
        };
        Game.last = this;
        Game.Achievements[this.name] = this;
        Game.AchievementsById[this.id] = this;
        Game.AchievementsN++;
        return this;
    }
    getType() {
        return 'Achievement';
    }
    toggle() // cheating only
    {
        if (!this.won) Game.Win(this.name);
        else Game.RemoveAchiev(this.name);
        if (Game.onMenu == 'stats') Game.UpdateMenu();
    }

    /** @type {any=} */
    threshold;
    /** @type {string=} */
    shortName;
    /** @type {keyof typeof Game.Tiers | undefined} */
    tier;
}
Achievement; //! export
