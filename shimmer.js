class Shimmer {
    /** @type {number=} */
    dur;
    /** @type {number=} */
    life;
    /** @type {number=} */
    sizeMult;
    /**
     * @param {keyof typeof Game.shimmerTypes} type
     * @param {any} [obj]
     * @param {any} [noCount]
     */
    constructor(type, obj, noCount) {
        this.type = type;
        this.spawnLead = false;

        this.l = document.createElement('div');
        this.l.className = 'shimmer';
        if (!Game.touchEvents) {
            this.l.addEventListener(
                'click',
                (function (what) {
                    return function (event) {
                        what.pop(event);
                    };
                })(this)
            );
        } else {
            this.l.addEventListener(
                'touchend',
                (function (what) {
                    return function (event) {
                        what.pop(event);
                    };
                })(this)
            );
        } // touch events

        this.x = 0;
        this.y = 0;
        this.id = Game.shimmersN;

        this.force = '';
        this.forceObj = obj || 0;
        if (this.forceObj.type) this.force = this.forceObj.type;
        this.noCount = noCount;
        if (!this.noCount) {
            Game.shimmerTypes[this.type].n++;
            Game.recalculateGains = 1;
        }

        this.init();

        Game.shimmersL.appendChild(this.l);
        Game.shimmers.push(this);
        Game.shimmersN++;
    }
    init() // executed when the shimmer is created
    {
        Game.shimmerTypes[this.type].initFunc(this);
    }
    update() // executed every frame
    {
        Game.shimmerTypes[this.type].updateFunc(this);
    }
    /**
     * @param {MouseEvent | TouchEvent} event
     */
    pop(
        event // executed when the shimmer is popped by the player
    ) {
        if (event) event.preventDefault();
        Game.loseShimmeringVeil('shimmer');
        Game.Click = 0;
        Game.shimmerTypes[this.type].popFunc(this);
    }
    die() // executed after the shimmer disappears (from old age or popping)
    {
        if (Game.shimmerTypes[this.type].spawnsOnTimer && this.spawnLead) {
            // if this was the spawn lead for this shimmer type, set the shimmer type's "spawned" to 0 and restart its spawn timer
            let type = Game.shimmerTypes[this.type];
            type.time = 0;
            type.spawned = 0;
            type.minTime = type.getMinTime(this);
            type.maxTime = type.getMaxTime(this);
        }
        Game.shimmersL.removeChild(this.l);
        if (Game.shimmers.includes(this)) Game.shimmers.splice(Game.shimmers.indexOf(this), 1);
        if (!this.noCount) {
            Game.shimmerTypes[this.type].n = Math.max(0, Game.shimmerTypes[this.type].n - 1);
            Game.recalculateGains = 1;
        }
    }
}
Shimmer; //! export
