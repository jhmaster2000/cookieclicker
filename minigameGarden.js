/**
 * @typedef {{
 *      name: string,
 *      icon: number,
 *      cost: number,
 *      costM: number,
 *      ageTick: number,
 *      ageTickR: number,
 *      mature: number,
 *      children: string[],
 *      effsStr: string,
 *      q: string,
 *      onHarvest?: (x: any, y: any, age: number) => void,
 *      immortal?: number,
 *      noContam?: boolean,
 *      detailsStr?: string,
 *      fungus?: boolean,
 *      weed?: boolean,
 *      contam?: number,
 *      onKill?: (x: any, y: any, age: number) => void,
 *      plantable?: boolean,
 *      onDie?: () => void,
 *      unlocked?: number,
 *      locked?: number,
 *      id?: number,
 *      matureBase?: number,
 *      key?: string,
 *      l?: HTMLElement
 * }} Plant
 */

/**
 * @typedef {{
 *     name: string,
 *     icon: number,
 *     tick: number,
 *     effMult: number,
 *     weedMult: number,
 *     req: number,
 *     effsStr: string,
 *     q: string,
 *     key?: string,
 *     id?: number,
 * }} Soil
 */

/**
 * @typedef {{
 *    name: string,
 *    icon: number,
 *    func: () => void,
 *    desc?: string,
 *    descFunc?: () => string,
 *    isOn?: () => number,
 *    isDisplayed?: () => boolean,
 *    id?: number,
 *    key?: string,
 * }} Tool
 */

const Obj = Game.Objects['Farm'];

const M = {
    parent: Obj,
    name: Obj.minigameName,

    /** @type {HTMLElement=} */
    lumpRefill: undefined,

    /** @type {Record<string, number>} */
    effs: {},

    /** @type {Plant[]} */
    plantsById: [],
    /** @type {Record<string, Plant>} */
    plants: {
        bakerWheat: {
            name: 'Baker\'s wheat',
            icon: 0,
            cost: 1,
            costM: 30,
            ageTick: 7,
            ageTickR: 2,
            mature: 35,
            children: ['bakerWheat', 'thumbcorn', 'cronerice', 'bakeberry', 'clover', 'goldenClover', 'chocoroot', 'tidygrass'],
            effsStr: '<div class="green">&bull; +1% CpS</div>',
            q: 'A plentiful crop whose hardy grain is used to make flour for pastries.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) M.dropUpgrade('Wheat slims', 0.001);
            }
        },
        thumbcorn: {
            name: 'Thumbcorn',
            icon: 1,
            cost: 5,
            costM: 100,
            ageTick: 6,
            ageTickR: 2,
            mature: 20,
            children: ['bakerWheat', 'thumbcorn', 'cronerice', 'gildmillet', 'glovemorel'],
            effsStr: '<div class="green">&bull; +2% cookies per click</div>',
            q: 'A strangely-shaped variant of corn. The amount of strands that can sprout from one seed is usually in the single digits.'
        },
        cronerice: {
            name: 'Cronerice',
            icon: 2,
            cost: 15,
            costM: 250,
            ageTick: 0.4,
            ageTickR: 0.7,
            mature: 55,
            children: ['thumbcorn', 'gildmillet', 'elderwort', 'wardlichen'],
            effsStr: '<div class="green">&bull; +3% grandma CpS</div>',
            q: 'Not only does this wrinkly bulb look nothing like rice, it\'s not even related to it either; its closest extant relative is the weeping willow.'
        },
        gildmillet: {
            name: 'Gildmillet',
            icon: 3,
            cost: 15,
            costM: 1500,
            ageTick: 2,
            ageTickR: 1.5,
            mature: 40,
            children: ['clover', 'goldenClover', 'shimmerlily'],
            effsStr: '<div class="green">&bull; +1% golden cookie gains</div><div class="green">&bull; +0.1% golden cookie effect duration</div>',
            q: 'An ancient staple crop, famed for its golden sheen. Was once used to bake birthday cakes for kings and queens of old.'
        },
        clover: {
            name: 'Ordinary clover',
            icon: 4,
            cost: 25,
            costM: 77777,
            ageTick: 1,
            ageTickR: 1.5,
            mature: 35,
            children: ['goldenClover', 'greenRot', 'shimmerlily'],
            effsStr: '<div class="green">&bull; +1% golden cookie frequency</div>',
            q: '<i>Trifolium repens</i>, a fairly mundane variety of clover with a tendency to produce four leaves. Such instances are considered lucky by some.'
        },
        goldenClover: {
            name: 'Golden clover',
            icon: 5,
            cost: 125,
            costM: 777777777777,
            ageTick: 4,
            ageTickR: 12,
            mature: 50,
            children: [],
            effsStr: '<div class="green">&bull; +3% golden cookie frequency</div>',
            q: 'A variant of the ordinary clover that traded its chlorophyll for pure organic gold. Tragically short-lived, this herb is an evolutionary dead-end - but at least it looks pretty.'
        },
        shimmerlily: {
            name: 'Shimmerlily',
            icon: 6,
            cost: 60,
            costM: 777777,
            ageTick: 5,
            ageTickR: 6,
            mature: 70,
            children: ['elderwort', 'whiskerbloom', 'chimerose', 'cheapcap'],
            effsStr:
                    '<div class="green">&bull; +1% golden cookie gains</div><div class="green">&bull; +1% golden cookie frequency</div><div class="green">&bull; +1% random drops</div>',
            q: 'These little flowers are easiest to find at dawn, as the sunlight refracting in dew drops draws attention to their pure-white petals.'
        },
        elderwort: {
            name: 'Elderwort',
            icon: 7,
            cost: 60 * 3,
            costM: 100000000,
            ageTick: 0.3,
            ageTickR: 0.5,
            mature: 90,
            immortal: 1,
            noContam: true,
            detailsStr: 'Immortal',
            children: ['everdaisy', 'ichorpuff', 'shriekbulb'],
            effsStr:
                    '<div class="green">&bull; +1% wrath cookie gains</div><div class="green">&bull; +1% wrath cookie frequency</div><div class="green">&bull; +1% grandma CpS</div><div class="green">&bull; immortal</div><div class="gray">&bull; surrounding plants (3x3) age 3% faster</div>',
            q: 'A very old, long-forgotten subspecies of edelweiss that emits a strange, heady scent. There is some anecdotal evidence that these do not undergo molecular aging.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) M.dropUpgrade('Elderwort biscuits', 0.01);
            }
        },
        bakeberry: {
            name: 'Bakeberry',
            icon: 8,
            cost: 45,
            costM: 100000000,
            ageTick: 1,
            ageTickR: 1,
            mature: 50,
            children: ['queenbeet'],
            effsStr: '<div class="green">&bull; +1% CpS</div><div class="green">&bull; harvest when mature for +30 minutes of CpS (max. 3% of bank)</div>',
            q: 'A favorite among cooks, this large berry has a crunchy brown exterior and a creamy red center. Excellent in pies or chicken stews.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) {
                    const moni = Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 30);
                    if (moni !== 0) {
                        Game.Earn(moni);
                        Game.Popup('(Bakeberry)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                    }
                    M.dropUpgrade('Bakeberry cookies', 0.015);
                }
            }
        },
        chocoroot: {
            name: 'Chocoroot',
            icon: 9,
            cost: 15,
            costM: 100000,
            ageTick: 4,
            ageTickR: 0,
            mature: 25,
            detailsStr: 'Predictable growth',
            children: ['whiteChocoroot', 'drowsyfern', 'queenbeet'],
            effsStr:
                    '<div class="green">&bull; +1% CpS</div><div class="green">&bull; harvest when mature for +3 minutes of CpS (max. 3% of bank)</div><div class="green">&bull; predictable growth</div>',
            q: 'A tangly bramble coated in a sticky, sweet substance. Unknown genetic ancestry. Children often pick these from fields as-is as a snack.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) {
                    const moni = Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 3);
                    if (moni !== 0) {
                        Game.Earn(moni);
                        Game.Popup('(Chocoroot)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                    }
                }
            }
        },
        whiteChocoroot: {
            name: 'White chocoroot',
            icon: 10,
            cost: 15,
            costM: 100000,
            ageTick: 4,
            ageTickR: 0,
            mature: 25,
            detailsStr: 'Predictable growth',
            children: ['whiskerbloom', 'tidygrass'],
            effsStr:
                    '<div class="green">&bull; +1% golden cookie gains</div><div class="green">&bull; harvest when mature for +3 minutes of CpS (max. 3% of bank)</div><div class="green">&bull; predictable growth</div>',
            q: 'A pale, even sweeter variant of the chocoroot. Often impedes travelers with its twisty branches.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) {
                    const moni = Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 3);
                    if (moni !== 0) {
                        Game.Earn(moni);
                        Game.Popup('(White chocoroot)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                    }
                }
            }
        },

        whiteMildew: {
            name: 'White mildew',
            fungus: true,
            icon: 26,
            cost: 20,
            costM: 9999,
            ageTick: 8,
            ageTickR: 12,
            mature: 70,
            detailsStr: 'Spreads easily',
            children: ['brownMold', 'whiteChocoroot', 'wardlichen', 'greenRot'],
            effsStr: '<div class="green">&bull; +1% CpS</div><div class="gray">&bull; may spread as brown mold</div>',
            q: 'A common rot that infests shady plots of earth. Grows in little creamy capsules. Smells sweet, but sadly wilts quickly.'
        },
        brownMold: {
            name: 'Brown mold',
            fungus: true,
            icon: 27,
            cost: 20,
            costM: 9999,
            ageTick: 8,
            ageTickR: 12,
            mature: 70,
            detailsStr: 'Spreads easily',
            children: ['whiteMildew', 'chocoroot', 'keenmoss', 'wrinklegill'],
            effsStr: '<div class="red">&bull; -1% CpS</div><div class="gray">&bull; may spread as white mildew</div>',
            q: 'A common rot that infests shady plots of earth. Grows in odd reddish clumps. Smells bitter, but thankfully wilts quickly.'
        },

        meddleweed: {
            name: 'Meddleweed',
            weed: true,
            icon: 29,
            cost: 1,
            costM: 10,
            ageTick: 10,
            ageTickR: 6,
            mature: 50,
            contam: 0.05,
            detailsStr: 'Grows in empty tiles, spreads easily',
            children: ['meddleweed', 'brownMold', 'crumbspore'],
            effsStr:
                    '<div class="red">&bull; useless</div><div class="red">&bull; may overtake nearby plants</div><div class="gray">&bull; may sometimes drop spores when uprooted</div>',
            q: 'The sign of a neglected farmland, this annoying weed spawns from unused dirt and may sometimes spread to other plants, killing them in the process.',
            /**
             * @param {number} x
             * @param {number} y
             * @param {number} age
             */
            onKill(x, y, age) {
                if (Math.random() < 0.2 * (age / 100))
                    M.plot[y][x] = [(M.plants[
                        /** @type {keyof typeof M['plants']} */(choose(['brownMold', 'crumbspore']))
                    ].id ?? 0) + 1, 0];
            }
        },

        whiskerbloom: {
            name: 'Whiskerbloom',
            icon: 11,
            cost: 20,
            costM: 1000000,
            ageTick: 2,
            ageTickR: 2,
            mature: 60,
            children: ['chimerose', 'nursetulip'],
            effsStr: '<div class="green">&bull; +0.2% effects from milk</div>',
            q: 'Squeezing the translucent pods makes them excrete a milky liquid, while producing a faint squeak akin to a cat\'s meow.'
        },
        chimerose: {
            name: 'Chimerose',
            icon: 12,
            cost: 15,
            costM: 242424,
            ageTick: 1,
            ageTickR: 1.5,
            mature: 30,
            children: ['chimerose'],
            effsStr: '<div class="green">&bull; +1% reindeer gains</div><div class="green">&bull; +1% reindeer frequency</div>',
            q: 'Originating in the greener flanks of polar mountains, this beautiful flower with golden accents is fragrant enough to make any room feel a little bit more festive.'
        },
        nursetulip: {
            name: 'Nursetulip',
            icon: 13,
            cost: 40,
            costM: 1000000000,
            ageTick: 0.5,
            ageTickR: 2,
            mature: 60,
            children: [],
            effsStr: '<div class="green">&bull; surrounding plants (3x3) are 20% more efficient</div><div class="red">&bull; -2% CpS</div>',
            q: 'This flower grows an intricate root network that distributes nutrients throughout the surrounding soil. The reason for this seemingly altruistic behavior is still unknown.'
        },
        drowsyfern: {
            name: 'Drowsyfern',
            icon: 14,
            cost: 90,
            costM: 100000,
            ageTick: 0.05,
            ageTickR: 0.1,
            mature: 30,
            children: [],
            effsStr:
                    '<div class="green">&bull; +3% CpS</div><div class="red">&bull; -5% cookies per click</div><div class="red">&bull; -10% golden cookie frequency</div>',
            q: 'Traditionally used to brew a tea that guarantees a good night of sleep.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) M.dropUpgrade('Fern tea', 0.01);
            }
        },
        wardlichen: {
            name: 'Wardlichen',
            icon: 15,
            cost: 10,
            costM: 10000,
            ageTick: 5,
            ageTickR: 4,
            mature: 65,
            children: ['wardlichen'],
            effsStr: '<div class="gray">&bull; 2% less wrath cookies</div><div class="gray">&bull; wrinklers spawn 15% slower</div>',
            q: 'The metallic stench that emanates from this organism has been known to keep insects and slugs away.'
        },
        keenmoss: {
            name: 'Keenmoss',
            icon: 16,
            cost: 50,
            costM: 1000000,
            ageTick: 4,
            ageTickR: 5,
            mature: 65,
            children: ['drowsyfern', 'wardlichen', 'keenmoss'],
            effsStr: '<div class="green">&bull; +3% random drops</div>',
            q: 'Fuzzy to the touch and of a vibrant green. In plant symbolism, keenmoss is associated with good luck for finding lost objects.'
        },
        queenbeet: {
            name: 'Queenbeet',
            icon: 17,
            cost: 60 * 1.5,
            costM: 1000000000,
            ageTick: 1,
            ageTickR: 0.4,
            mature: 80,
            noContam: true,
            children: ['duketater', 'queenbeetLump', 'shriekbulb'],
            effsStr:
                    '<div class="green">&bull; +0.3% golden cookie effect duration</div><div class="red">&bull; -2% CpS</div><div class="green">&bull; harvest when mature for +1 hour of CpS (max. 4% of bank)</div>',
            q: 'A delicious taproot used to prepare high-grade white sugar. Entire countries once went to war over these.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) {
                    const moni = Math.min(Game.cookies * 0.04, Game.cookiesPs * 60 * 60);
                    if (moni !== 0) {
                        Game.Earn(moni);
                        Game.Popup('(Queenbeet)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                    }
                }
            }
        },
        queenbeetLump: {
            name: 'Juicy queenbeet',
            icon: 18,
            plantable: false,
            cost: 60 * 2,
            costM: 1000000000000,
            ageTick: 0.04,
            ageTickR: 0.08,
            mature: 85,
            noContam: true,
            children: [],
            effsStr:
                    '<div class="red">&bull; -10% CpS</div><div class="red">&bull; surrounding plants (3x3) are 20% less efficient</div><div class="green">&bull; harvest when mature for a sugar lump</div>',
            q: 'A delicious taproot used to prepare high-grade white sugar. Entire countries once went to war over these.<br>It looks like this one has grown especially sweeter and juicier from growing in close proximity to other queenbeets.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) {
                    Game.gainLumps(1);
                    // @ts-expect-error this will be an interesting one...
                    popup = '(Juicy queenbeet)<br>Sweet!<div style="font-size:65%;">Found 1 sugar lump!</div>';
                }
            }
        },
        duketater: {
            name: 'Duketater',
            icon: 19,
            cost: 60 * 8,
            costM: 1000000000000,
            ageTick: 0.4,
            ageTickR: 0.1,
            mature: 95,
            noContam: true,
            children: ['shriekbulb'],
            effsStr: '<div class="green">&bull; harvest when mature for +2 hours of CpS (max. 8% of bank)</div>',
            q: 'A rare, rich-tasting tuber fit for a whole meal, as long as its strict harvesting schedule is respected. Its starch has fascinating baking properties.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) {
                    const moni = Math.min(Game.cookies * 0.08, Game.cookiesPs * 60 * 60 * 2);
                    if (moni !== 0) {
                        Game.Earn(moni);
                        Game.Popup('(Duketater)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                    }
                    M.dropUpgrade('Duketater cookies', 0.005);
                }
            }
        },
        crumbspore: {
            name: 'Crumbspore',
            fungus: true,
            icon: 20,
            cost: 10,
            costM: 999,
            ageTick: 3,
            ageTickR: 3,
            mature: 65,
            contam: 0.03,
            noContam: true,
            detailsStr: 'Spreads easily',
            children: ['crumbspore', 'glovemorel', 'cheapcap', 'doughshroom', 'wrinklegill', 'ichorpuff'],
            effsStr:
                    '<div class="green">&bull; explodes into up to 1 minute of CpS at the end of its lifecycle (max. 1% of bank)</div><div class="red">&bull; may overtake nearby plants</div>',
            q: 'An archaic mold that spreads its spores to the surrounding dirt through simple pod explosion.',
            onDie() {
                const moni = Math.min(Game.cookies * 0.01, Game.cookiesPs * 60) * Math.random();
                if (moni !== 0) {
                    Game.Earn(moni);
                    Game.Popup('(Crumbspore)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                }
            }
        },
        doughshroom: {
            name: 'Doughshroom',
            fungus: true,
            icon: 24,
            cost: 100,
            costM: 100000000,
            ageTick: 1,
            ageTickR: 2,
            mature: 85,
            contam: 0.03,
            noContam: true,
            detailsStr: 'Spreads easily',
            children: ['crumbspore', 'doughshroom', 'foolBolete', 'shriekbulb'],
            effsStr:
                    '<div class="green">&bull; explodes into up to 5 minutes of CpS at the end of its lifecycle (max. 3% of bank)</div><div class="red">&bull; may overtake nearby plants</div>',
            q: 'Jammed full of warm spores; some forest walkers often describe the smell as similar to passing by a bakery.',
            onDie() {
                const moni = Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 5) * Math.random();
                if (moni !== 0) {
                    Game.Earn(moni);
                    Game.Popup('(Doughshroom)<br>+' + Beautify(moni) + ' cookies!', Game.mouseX, Game.mouseY);
                }
            }
        },
        glovemorel: {
            name: 'Glovemorel',
            fungus: true,
            icon: 21,
            cost: 30,
            costM: 10000,
            ageTick: 3,
            ageTickR: 18,
            mature: 80,
            children: [],
            effsStr:
                    '<div class="green">&bull; +4% cookies per click</div><div class="green">&bull; +1% cursor CpS</div><div class="red">&bull; -1% CpS</div>',
            q: 'Touching its waxy skin reveals that the interior is hollow and uncomfortably squishy.'
        },
        cheapcap: {
            name: 'Cheapcap',
            fungus: true,
            icon: 22,
            cost: 40,
            costM: 100000,
            ageTick: 6,
            ageTickR: 16,
            mature: 40,
            children: [],
            effsStr:
                    '<div class="green">&bull; buildings and upgrades are 0.2% cheaper</div><div class="red">&bull; cannot handle cold climates; 15% chance to die when frozen</div>',
            q: 'Small, tough, and good in omelettes. Some historians propose that the heads of dried cheapcaps were once used as currency in some bronze age societies.'
        },
        foolBolete: {
            name: 'Fool\'s bolete',
            fungus: true,
            icon: 23,
            cost: 15,
            costM: 10000,
            ageTick: 5,
            ageTickR: 25,
            mature: 50,
            children: [],
            effsStr:
                    '<div class="green">&bull; +2% golden cookie frequency</div><div class="red">&bull; -5% golden cookie gains</div><div class="red">&bull; -2% golden cookie duration</div><div class="red">&bull; -2% golden cookie effect duration</div>',
            q: 'Named for its ability to fool mushroom pickers. The fool\'s bolete is not actually poisonous, it\'s just extremely bland.'
        },
        wrinklegill: {
            name: 'Wrinklegill',
            fungus: true,
            icon: 25,
            cost: 20,
            costM: 1000000,
            ageTick: 1,
            ageTickR: 3,
            mature: 65,
            children: ['elderwort', 'shriekbulb'],
            effsStr: '<div class="gray">&bull; wrinklers spawn 2% faster</div><div class="gray">&bull; wrinklers eat 1% more</div>',
            q: 'This mushroom\'s odor resembles that of a well-done steak, and is said to whet the appetite - making one\'s stomach start gurgling within seconds.'
        },
        greenRot: {
            name: 'Green rot',
            fungus: true,
            icon: 28,
            cost: 60,
            costM: 1000000,
            ageTick: 12,
            ageTickR: 13,
            mature: 65,
            children: ['keenmoss', 'foolBolete'],
            effsStr:
                    '<div class="green">&bull; +0.5% golden cookie duration</div><div class="green">&bull; +1% golden cookie frequency</div><div class="green">&bull; +1% random drops</div>',
            q: 'This short-lived mold is also known as "emerald pebbles", and is considered by some as a pseudo-gem that symbolizes good fortune.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) M.dropUpgrade('Green yeast digestives', 0.005);
            }
        },
        shriekbulb: {
            name: 'Shriekbulb',
            icon: 30,
            cost: 60,
            costM: 4444444444444,
            ageTick: 3,
            ageTickR: 1,
            mature: 60,
            noContam: true,
            detailsStr: 'The unfortunate result of some plant combinations',
            children: ['shriekbulb'],
            effsStr: '<div class="red">&bull; -2% CpS</div><div class="red">&bull; surrounding plants (3x3) are 5% less efficient</div>',
            q: 'A nasty vegetable with a dreadful quirk : its flesh resonates with a high-pitched howl whenever it is hit at the right angle by sunlight, moonlight, or even a slight breeze.'
        },
        tidygrass: {
            name: 'Tidygrass',
            icon: 31,
            cost: 90,
            costM: 100000000000000,
            ageTick: 0.5,
            ageTickR: 0,
            mature: 40,
            children: ['everdaisy'],
            effsStr: '<div class="green">&bull; surrounding tiles (5x5) develop no weeds or fungus</div>',
            q: 'The molecules this grass emits are a natural weedkiller. Its stems grow following a predictable pattern, making it an interesting -if expensive- choice for a lawn grass.'
        },
        everdaisy: {
            name: 'Everdaisy',
            icon: 32,
            cost: 180,
            costM: 100000000000000000000,
            ageTick: 0.3,
            ageTickR: 0,
            mature: 75,
            noContam: true,
            immortal: 1,
            detailsStr: 'Immortal',
            children: [],
            effsStr: '<div class="green">&bull; surrounding tiles (3x3) develop no weeds or fungus</div><div class="green">&bull; immortal</div>',
            q: 'While promoted by some as a superfood owing to its association with longevity and intriguing geometry, this elusive flower is actually mildly toxic.'
        },
        ichorpuff: {
            name: 'Ichorpuff',
            fungus: true,
            icon: 33,
            cost: 120,
            costM: 987654321,
            ageTick: 1,
            ageTickR: 1.5,
            mature: 35,
            children: [],
            effsStr:
                    '<div class="green">&bull; surrounding plants (3x3) age half as fast</div><div class="red">&bull; surrounding plants (3x3) are half as efficient</div>',
            q: 'This puffball mushroom contains sugary spores, but it never seems to mature to bursting on its own. Surrounding plants under its influence have a very slow metabolism, reducing their effects but lengthening their lifespan.',
            /**
             * @param {any} _x
             * @param {any} _y
             * @param {number} age
             */
            onHarvest(_x, _y, age) {
                if (age >= this.mature) M.dropUpgrade('Ichor syrup', 0.005);
            }
        }
    },
    plantsN: 0,
    plantsUnlockedN: 0,
    /** @type {Record<string, number>} */
    plantContam: {},

    /** @type {Soil[]} */
    soilsById: [],
    /** @type {Record<string, Soil>} */
    soils: {
        dirt: {
            name: 'Dirt',
            icon: 0,
            tick: 5,
            effMult: 1,
            weedMult: 1,
            req: 0,
            effsStr: '<div class="gray">&bull; tick every <b>5 minutes</b></div>',
            q: 'Simple, regular old dirt that you\'d find in nature.'
        },
        fertilizer: {
            name: 'Fertilizer',
            icon: 1,
            tick: 3,
            effMult: 0.75,
            weedMult: 1.2,
            req: 50,
            effsStr:
                    '<div class="gray">&bull; tick every <b>3 minutes</b></div><div class="red">&bull; passive plant effects <b>-25%</b></div><div class="red">&bull; weeds appear <b>20%</b> more</div>',
            q: 'Soil with a healthy helping of fresh manure. Plants grow faster but are less efficient.'
        },
        clay: {
            name: 'Clay',
            icon: 2,
            tick: 15,
            effMult: 1.25,
            weedMult: 1,
            req: 100,
            effsStr: '<div class="gray">&bull; tick every <b>15 minutes</b></div><div class="green">&bull; passive plant effects <b>+25%</b></div>',
            q: 'Rich soil with very good water retention. Plants grow slower but are more efficient.'
        },
        pebbles: {
            name: 'Pebbles',
            icon: 3,
            tick: 5,
            effMult: 0.25,
            weedMult: 0.1,
            req: 200,
            effsStr:
                    '<div class="gray">&bull; tick every <b>5 minutes</b></div><div class="red">&bull; passive plant effects <b>-75%</b></div><div class="green">&bull; <b>35% chance</b> of collecting seeds automatically when plants expire</div><div class="green">&bull; weeds appear <b>10 times</b> less</div>',
            q: 'Dry soil made of small rocks tightly packed together. Not very conducive to plant health, but whatever falls off your crops will be easy to retrieve.<br>Useful if you\'re one of those farmers who just want to find new seeds without having to tend their garden too much.'
        },
        woodchips: {
            name: 'Wood chips',
            icon: 4,
            tick: 5,
            effMult: 0.25,
            weedMult: 0.1,
            req: 300,
            effsStr:
                    '<div class="gray">&bull; tick every <b>5 minutes</b></div><div class="red">&bull; passive plant effects <b>-75%</b></div><div class="green">&bull; plants spread and mutate <b>3 times more</b></div><div class="green">&bull; weeds appear <b>10 times</b> less</div>',
            q: 'Soil made of bits and pieces of bark and sawdust. Helpful for young sprouts to develop, not so much for mature plants.'
        }
    },

    /** @type {Tool[]} */
    toolsById: [],
    /** @type {Record<string, Tool>} */
    tools: {
        info: {
            name: 'Garden information',
            icon: 3,
            desc: '-',
            descFunc() {
                let str = '';
                if (M.freeze) str = 'Your garden is frozen, providing no effects.';
                else {
                    /** @type {Record<string, { n: string, rev?: boolean }>} */
                    const effs = {
                        cps: { n: 'CpS' },
                        click: { n: 'cookies/click' },
                        cursorCps: { n: 'cursor CpS' },
                        grandmaCps: { n: 'grandma CpS' },
                        goldenCookieGain: { n: 'golden cookie gains' },
                        goldenCookieFreq: { n: 'golden cookie frequency' },
                        goldenCookieDur: { n: 'golden cookie duration' },
                        goldenCookieEffDur: { n: 'golden cookie effect duration' },
                        wrathCookieGain: { n: 'wrath cookie gains' },
                        wrathCookieFreq: { n: 'wrath cookie frequency' },
                        wrathCookieDur: { n: 'wrath cookie duration' },
                        wrathCookieEffDur: { n: 'wrath cookie effect duration' },
                        reindeerGain: { n: 'reindeer gains' },
                        reindeerFreq: { n: 'reindeer cookie frequency' },
                        reindeerDur: { n: 'reindeer cookie duration' },
                        itemDrops: { n: 'random drops' },
                        milk: { n: 'milk effects' },
                        wrinklerSpawn: { n: 'wrinkler spawn rate' },
                        wrinklerEat: { n: 'wrinkler appetite' },
                        upgradeCost: { n: 'upgrade costs', rev: true },
                        buildingCost: { n: 'building costs', rev: true }
                    };

                    let effStr = '';
                    for (let i in M.effs) {
                        const effsI = /** @type {keyof typeof effs} */ (i);
                        if (M.effs[i] != 1 && effs[effsI]) {
                            const amount = (M.effs[i] - 1) * 100;
                            effStr +=
                                    '<div style="font-size:10px;margin-left:64px;"><b>&bull; ' +
                                    effs[effsI].n +
                                    ' :</b> <span class="' +
                                    (amount * (effs[effsI].rev ? -1 : 1) > 0 ? 'green' : 'red') +
                                    '">' +
                                    (amount > 0 ? '+' : '-') +
                                    Beautify(Math.abs(M.effs[i] - 1) * 100, 2) +
                                    '%</span></div>';
                        }
                    }
                    if (effStr === '') effStr = '<div style="font-size:10px;margin-left:64px;"><b>None.</b></div>';
                    str += '<div>Combined effects of all your plants :</div>' + effStr;
                }
                str += '<div class="line"></div>';
                str +=
                        '<img src="img/gardenTip.png" style="float:right;margin:0px 0px 8px 8px;"/><small style="line-height:100%;">&bull; You can cross-breed plants by planting them close to each other; new plants will grow in the empty tiles next to them.<br>&bull; Unlock new seeds by harvesting mature plants.<br>&bull; When you ascend, your garden plants are reset, but you keep all the seeds you\'ve unlocked.<br>&bull; Your garden has no effect and does not grow while the game is closed.</small>';
                return str;
            },
            func: STUB
        },
        harvestAll: {
            name: 'Harvest all',
            icon: 0,
            descFunc: function () {
                return (
                    'Instantly harvest all plants in your garden.<div class="line"></div>' +
                        ((Game.keys['ShiftLeft'] || Game.keys['ShiftRight']) && (Game.keys['ControlLeft'] || Game.keys['ControlRight'])
                            ? '<b>You are holding shift+ctrl.</b> Only mature, mortal plants will be harvested.'
                            : 'Shift+ctrl+click to harvest only mature, mortal plants.')
                );
            },
            func: function () {
                PlaySound('snd/toneTick.mp3');
                if ((Game.keys['ShiftLeft'] || Game.keys['ShiftRight']) && (Game.keys['ControlLeft'] || Game.keys['ControlRight'])) M.harvestAll(0, 1, 1); //ctrl & shift, harvest only mature non-immortal plants
                else M.harvestAll();
            }
        },
        freeze: {
            name: 'Freeze',
            icon: 1,
            descFunc() {
                return 'Cryogenically preserve your garden.<br>Plants no longer grow, spread or die; they provide no benefits.<br>' +
                    'Soil cannot be changed.<div class="line"></div>Using this will effectively pause your garden.<div class="line"></div>';
            },
            func() {
                PlaySound('snd/toneTick.mp3');
                M.freeze = M.freeze ? 0 : 1;
                if (M.freeze) {
                    M.computeEffs();
                    PlaySound('snd/freezeGarden.mp3');
                    // this.classList.add('on'); // ????
                    $('gardenContent', true).classList.add('gardenFrozen');

                    for (let y = 0; y < 6; y++) {
                        for (let x = 0; x < 6; x++) {
                            let tile = M.plot[y][x];
                            if (tile[0] > 0) {
                                let me = M.plantsById[tile[0] - 1];
                                let age = tile[1];
                                if (me.key === 'cheapcap' && Math.random() < 0.15) {
                                    M.plot[y][x] = [0, 0];
                                    if (me.onKill) me.onKill(x, y, age);
                                    M.toRebuild = true;
                                }
                            }
                        }
                    }
                } else {
                    M.computeEffs();
                    // this.classList.remove('on'); // ????
                    $('gardenContent', true).classList.remove('gardenFrozen');
                }
            },
            isOn() {
                if (M.freeze) $('gardenContent', true).classList.add('gardenFrozen');
                else $('gardenContent', true).classList.remove('gardenFrozen');
                const ret = /** @type {number} */ (M.freeze);
                return ret;
            }
        },
        convert: {
            name: 'Sacrifice garden',
            icon: 2,
            desc: 'A swarm of sugar hornets comes down on your garden, <span class="red">destroying every plant as well as every seed you\'ve unlocked</span> - leaving only a Baker\'s wheat seed.<br>In exchange, they will grant you <span class="green"><b>10</b> sugar lumps</span>.<br>This action is only available with a complete seed log.',
            func() {
                PlaySound('snd/toneTick.mp3');
                M.askConvert();
            },
            isDisplayed() {
                //! typescript being stupid
                return eval('M.plantsUnlockedN >= M.plantsN') ? true : false;
            }
        }
    },

    /** @type {number[][][]} */
    plot: [],
    /** @type {number[][][]} */
    plotBoost: [],

    tileSize: 40,
    
    seedSelected: -1,
    
    soil: 0,
    nextSoil: 0, //timestamp for when soil will be ready to change again
    
    stepT: 1, //in seconds
    nextStep: 0, //timestamp for next step tick
    
    harvests: 0,
    harvestsTotal: 0,
    
    loopsMult: 1,
    
    toRebuild: false,
    toCompute: false,
    
    /** @type {number} */
    freeze: 0,
    nextFreeze: 0, // timestamp for when we can freeze again; unused, but still stored

    cursor: 1,
    /** @type {HTMLElement=} */
    cursorL: undefined,
    convertTimes: 0,

    plotLimits: [
        [2, 2, 4, 4],
        [2, 2, 5, 4],
        [2, 2, 5, 5],
        [1, 2, 5, 5],
        [1, 1, 5, 5],
        [1, 1, 6, 5],
        [1, 1, 6, 6],
        [0, 1, 6, 6],
        [0, 0, 6, 6]
    ],

    launch() {
        const div = $('rowSpecial' + this.parent.id, true);
        // populate div with html and initialize values
    
        //* plants age from 0 to 100
        //* at one point in its lifespan, the plant becomes mature
        //* plants have 4 life stages once planted : bud, sprout, bloom, mature
        //* a plant may age faster by having a higher .ageTick
        //* if a plant has .ageTickR, a random number between 0 and that amount is added to .ageTick
        //* a plant may mature faster by having a lower .mature
        //* a plant's effects depend on how mature it is
        //* a plant can only reproduce when mature
        this.plantsById = [];
        let n = 0;
        for (let i in this.plants) {
            const plant = this.plants[i];
            plant.unlocked = 0;
            plant.id = n;
            plant.key = i;
            plant.matureBase = plant.mature;
            this.plantsById[n] = plant;
            if (plant.plantable === undefined) {
                plant.plantable = true;
            }
            n++;
        }
        this.plantsN = this.plantsById.length;
        this.plantsUnlockedN = 0;

        this.plantContam = {};
        for (let i in this.plants) {
            const { contam } = this.plants[i];
            if (contam) this.plantContam[ASSERT_NOT_NULL(this.plants[i].key)] = contam;
        }

        this.soilsById = [];
        n = 0;
        for (let i in this.soils) {
            this.soils[i].id = n;
            this.soils[i].key = i;
            this.soilsById[n] = this.soils[i];
            n++;
        }
    
        this.toolsById = [];
        n = 0;
        for (let i in this.tools) {
            this.tools[i].id = n;
            this.tools[i].key = i;
            this.toolsById[n] = this.tools[i];
            n++;
        }
    
        this.plot = [];
        for (let y = 0; y < 6; y++) {
            this.plot[y] = [];
            for (let x = 0; x < 6; x++) {
                this.plot[y][x] = [0, 0];
            }
        }
        this.plotBoost = [];
        for (let y = 0; y < 6; y++) {
            this.plotBoost[y] = [];
            for (let x = 0; x < 6; x++) {
                // age mult, power mult, weed mult
                this.plotBoost[y][x] = [1, 1, 1];
            }
        }

        let str = '';
        str +=
                '<style>' +
                '#gardenBG{background:url(img/shadedBorders.png),url(img/BGgarden.jpg);background-size:100% 100%,auto;position:absolute;left:0px;right:0px;top:0px;bottom:16px;}' +
                '#gardenContent{position:relative;box-sizing:border-box;padding:4px 24px;height:' +
                (6 * this.tileSize + 16 + 48 + 48) +
                'px;}' +
                '.gardenFrozen{box-shadow:0px 0px 16px rgba(255,255,255,1) inset,0px 0px 48px 24px rgba(200,255,225,0.5) inset;}' +
                '#gardenPanel{text-align:center;margin:0px;padding:0px;position:absolute;left:4px;top:4px;bottom:4px;right:65%;overflow-y:auto;overflow-x:hidden;box-shadow:8px 0px 8px rgba(0,0,0,0.5);}' +
                '#gardenSeeds{}' +
                '#gardenField{text-align:center;position:absolute;right:0px;top:0px;bottom:0px;overflow-x:auto;overflow:hidden;}' + //width:65%;
                '#gardenPlot{position:relative;margin:8px auto;}' +
                '.gardenTile{cursor:pointer;width:' +
                this.tileSize +
                'px;height:' +
                this.tileSize +
                'px;position:absolute;}' +
                '.gardenTile:before{transform:translate(0,0);opacity:0.65;transition:opacity 0.2s;pointer-events:none;content:\'\';display:block;position:absolute;left:0px;top:0px;right:0px;bottom:0px;margin:0px;background:url(img/gardenPlots.png);}' +
                '.gardenTile:nth-child(4n+1):before{background-position:40px 0px;}' +
                '.gardenTile:nth-child(4n+2):before{background-position:80px 0px;}' +
                '.gardenTile:nth-child(4n+3):before{background-position:120px 0px;}' +
                '.gardenTile:hover:before{opacity:1;animation:wobble 0.5s;}' +
                '.noFancy .gardenTile:hover:before{opacity:1;animation:none;}' +
                '.gardenTileIcon{transform:translate(0,0);pointer-events:none;transform-origin:50% 40px;width:48px;height:48px;position:absolute;left:-' +
                (48 - this.tileSize) / 2 +
                'px;top:-' +
                ((48 - this.tileSize) / 2 + 8) +
                'px;background:url(img/gardenPlants.png?v=' +
                Game.version +
                ');}' +
                '.gardenTile:hover .gardenTileIcon{animation:pucker 0.3s;}' +
                '.noFancy .gardenTile:hover .gardenTileIcon{animation:none;}' +
                '#gardenDrag{pointer-events:none;position:absolute;left:0px;top:0px;right:0px;bottom:0px;overflow:hidden;z-index:1000000001;}' +
                '#gardenCursor{transition:transform 0.1s;display:none;pointer-events:none;width:48px;height:48px;position:absolute;background:url(img/gardenPlants.png?v=' +
                Game.version +
                ');}' +
                '.gardenSeed{cursor:pointer;display:inline-block;width:40px;height:40px;position:relative;}' +
                '.gardenSeed.locked{display:none;}' +
                '.gardenSeedIcon{pointer-events:none;transform:translate(0,0);display:inline-block;position:absolute;left:-4px;top:-4px;width:48px;height:48px;background:url(img/gardenPlants.png?v=' +
                Game.version +
                ');}' +
                '.gardenSeed:hover .gardenSeedIcon{animation:bounce 0.8s;z-index:1000000001;}' +
                '.gardenSeed:active .gardenSeedIcon{animation:pucker 0.2s;}' +
                '.noFancy .gardenSeed:hover .gardenSeedIcon,.noFancy .gardenSeed:active .gardenSeedIcon{animation:none;}' +
                '.gardenPanelLabel{font-size:12px;width:100%;padding:2px;margin-top:4px;margin-bottom:-4px;}' +
                '.gardenSeedTiny{transform:scale(0.5,0.5);margin:-20px -16px;display:inline-block;width:48px;height:48px;background:url(img/gardenPlants.png?v=' +
                Game.version +
                ');}' +
                '.gardenSeed.on:before{pointer-events:none;content:\'\';display:block;position:absolute;left:0px;top:0px;right:0px;bottom:0px;margin:-2px;border-radius:12px;transform:rotate(45deg);background:rgba(0,0,0,0.2);box-shadow:0px 0px 8px rgba(255,255,255,0.75);}' +
                '.gardenGrowthIndicator{background:#000;box-shadow:0px 0px 0px 1px #fff,0px 0px 0px 2px #000,2px 2px 2px 2px rgba(0,0,0,0.5);position:absolute;top:0px;width:1px;height:6px;z-index:100;}' +
                '.noFancy .gardenGrowthIndicator{background:#fff;border:1px solid #000;margin-top:-1px;margin-left:-1px;}' +
                '#gardenSoils{}' +
                '.gardenSoil.disabled{filter:brightness(10%);}' +
                '.noFilters .gardenSoil.disabled{opacity:0.2;}' +
                '#gardenInfo{position:relative;display:inline-block;margin:8px auto 0px auto;padding:8px 16px;padding-left:32px;text-align:left;font-size:11px;color:rgba(255,255,255,0.75);text-shadow:-1px 1px 0px #000;background:rgba(0,0,0,0.75);border-radius:16px;}' +
                '</style>';
        str += '<div id="gardenBG"></div>';
        str += '<div id="gardenContent">';
        str += '<div id="gardenDrag"><div id="gardenCursor" class="shadowFilter"></div></div>';
    
        str += '<div id="gardenPanel" class="framed">';
        str += '<div class="title gardenPanelLabel">Tools</div><div class="line"></div>';
        str += '<div id="gardenTools"></div>';
        str += '<div id="gardenSeedsUnlocked" class="title gardenPanelLabel">Seeds</div><div class="line"></div>';
        str += '<div id="gardenSeeds"></div>';
        str += '</div>';
        str += '<div id="gardenField">';
        str += '<div style="pointer-events:none;opacity:0.75;position:absolute;left:0px;right:0px;top:8px;" id="gardenPlotSize"></div>';
        str += '<div id="gardenPlot" class="shadowFilter" style="width:' + 6 * this.tileSize + 'px;height:' + 6 * this.tileSize + 'px;"></div>';
        str += '<div style="margin-top:0px;" id="gardenSoils"></div>';
        str += '<div id="gardenInfo">';
        str +=
                '<div ' +
                Game.getDynamicTooltip('Game.ObjectsById[' + this.parent.id + '].minigame.refillTooltip', 'this') +
                ' id="gardenLumpRefill" class="usesIcon shadowFilter lumpRefill" style="display:none;left:-8px;top:-6px;background-position:' +
                -29 * 48 +
                'px ' +
                -14 * 48 +
                'px;"></div>';
        str += '<div id="gardenNextTick">Initializing...</div>';
        str += '<div id="gardenStats"></div>';
        str += '</div>';
        str += '</div>';
    
        str += '</div>';
        div.innerHTML = str;
        this.buildPlot();
        this.buildPanel();
    
        this.lumpRefill = $('gardenLumpRefill', true);
        this.lumpRefill.addEventListener('click', function () {
            Game.refillLump(1, function () {
                this.loopsMult = 3;
                this.nextSoil = Date.now();
                //M.nextFreeze=Date.now();
                this.nextStep = Date.now();
                PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
            });
        });
        $('gardenSeedsUnlocked', true).addEventListener('click', () => {
            if (Game.sesame) {
                if ((Game.keys['ShiftLeft'] || Game.keys['ShiftRight']) && (Game.keys['ControlLeft'] || Game.keys['ControlRight'])) {
                    // ctrl & shift, fill garden with random plants
                    for (let y = 0; y < 6; y++) {
                        for (let x = 0; x < 6; x++) {
                            this.plot[y][x] = [(choose(this.plantsById).id ?? 0) + 1, Math.floor(Math.random() * 100)];
                        }
                    }
                    this.toRebuild = true;
                    this.toCompute = true;
                } // unlock/lock all seeds
                else {
                    let locked = 0;
                    for (let i in this.plants) {
                        if (!this.plants[i].unlocked) locked++;
                    }
                    if (locked > 0) {
                        for (let i in this.plants) {
                            this.unlockSeed(this.plants[i]);
                        }
                    } else {
                        for (let i in this.plants) {
                            this.lockSeed(this.plants[i]);
                        }
                    }
                    this.unlockSeed(this.plants['bakerWheat']);
                }
            }
        });
        this.reset();
    },

    getUnlockedN() {
        this.plantsUnlockedN = 0;
        for (let i in this.plants) {
            if (this.plants[i].unlocked) this.plantsUnlockedN++;
        }
        if (this.plantsUnlockedN >= this.plantsN) {
            Game.Win('Keeper of the conservatory');
            $('gardenTool-3', true).classList.remove('locked');
        } else $('gardenTool-3', true).classList.add('locked');
    
        return this.plantsUnlockedN;
    },
    
    /**
     * @param {string} upgrade
     * @param {number} rate
     */
    dropUpgrade(upgrade, rate) {
        if (!Game.Has(upgrade) && Math.random() <= rate * Game.dropRateMult() * (Game.HasAchiev('Seedless to nay') ? 1.05 : 1)) {
            Game.Unlock(upgrade);
        }
    },
    
    computeMatures() {
        let mult = 1;
        if (Game.HasAchiev('Seedless to nay')) mult = 0.95;
        for (let i in this.plants) {
            this.plants[i].mature = (this.plants[i].matureBase ?? 0) * mult;
        }
    },
    
    /**
     * @param {{ [x: string]: number; }} neighs
     * @param {{ [x: string]: number; }} neighsM
     */
    getMuts(neighs, neighsM) {
        //get possible mutations given a list of neighbors
        //note : neighs stands for neighbors, not horsey noises
        const muts = [];
    
        if (neighsM['bakerWheat'] >= 2) muts.push(['bakerWheat', 0.2], ['thumbcorn', 0.05], ['bakeberry', 0.001]);
        if (neighsM['bakerWheat'] >= 1 && neighsM['thumbcorn'] >= 1) muts.push(['cronerice', 0.01]);
        if (neighsM['thumbcorn'] >= 2) muts.push(['thumbcorn', 0.1], ['bakerWheat', 0.05]);
        if (neighsM['cronerice'] >= 1 && neighsM['thumbcorn'] >= 1) muts.push(['gildmillet', 0.03]);
        if (neighsM['cronerice'] >= 2) muts.push(['thumbcorn', 0.02]);
        if (neighsM['bakerWheat'] >= 1 && neighsM['gildmillet'] >= 1) muts.push(['clover', 0.03], ['goldenClover', 0.0007]);
        if (neighsM['clover'] >= 1 && neighsM['gildmillet'] >= 1) muts.push(['shimmerlily', 0.02]);
        if (neighsM['clover'] >= 2 && neighs['clover'] < 5) muts.push(['clover', 0.007], ['goldenClover', 0.0001]);
        if (neighsM['clover'] >= 4) muts.push(['goldenClover', 0.0007]);
        if (neighsM['shimmerlily'] >= 1 && neighsM['cronerice'] >= 1) muts.push(['elderwort', 0.01]);
        if (neighsM['wrinklegill'] >= 1 && neighsM['cronerice'] >= 1) muts.push(['elderwort', 0.002]);
        if (neighsM['bakerWheat'] >= 1 && neighs['brownMold'] >= 1) muts.push(['chocoroot', 0.1]);
        if (neighsM['chocoroot'] >= 1 && neighs['whiteMildew'] >= 1) muts.push(['whiteChocoroot', 0.1]);
        if (neighsM['whiteMildew'] >= 1 && neighs['brownMold'] <= 1) muts.push(['brownMold', 0.5]);
        if (neighsM['brownMold'] >= 1 && neighs['whiteMildew'] <= 1) muts.push(['whiteMildew', 0.5]);
        if (neighsM['meddleweed'] >= 1 && neighs['meddleweed'] <= 3) muts.push(['meddleweed', 0.15]);
    
        if (neighsM['shimmerlily'] >= 1 && neighsM['whiteChocoroot'] >= 1) muts.push(['whiskerbloom', 0.01]);
        if (neighsM['shimmerlily'] >= 1 && neighsM['whiskerbloom'] >= 1) muts.push(['chimerose', 0.05]);
        if (neighsM['chimerose'] >= 2) muts.push(['chimerose', 0.005]);
        if (neighsM['whiskerbloom'] >= 2) muts.push(['nursetulip', 0.05]);
        if (neighsM['chocoroot'] >= 1 && neighsM['keenmoss'] >= 1) muts.push(['drowsyfern', 0.005]);
        if ((neighsM['cronerice'] >= 1 && neighsM['keenmoss'] >= 1) || (neighsM['cronerice'] >= 1 && neighsM['whiteMildew'] >= 1))
            muts.push(['wardlichen', 0.005]);
        if (neighsM['wardlichen'] >= 1 && neighs['wardlichen'] < 2) muts.push(['wardlichen', 0.05]);
        if (neighsM['greenRot'] >= 1 && neighsM['brownMold'] >= 1) muts.push(['keenmoss', 0.1]);
        if (neighsM['keenmoss'] >= 1 && neighs['keenmoss'] < 2) muts.push(['keenmoss', 0.05]);
        if (neighsM['chocoroot'] >= 1 && neighsM['bakeberry'] >= 1) muts.push(['queenbeet', 0.01]);
        if (neighsM['queenbeet'] >= 8) muts.push(['queenbeetLump', 0.001]);
        if (neighsM['queenbeet'] >= 2) muts.push(['duketater', 0.001]);
    
        if (neighsM['crumbspore'] >= 1 && neighs['crumbspore'] <= 1) muts.push(['crumbspore', 0.07]);
        if (neighsM['crumbspore'] >= 1 && neighsM['thumbcorn'] >= 1) muts.push(['glovemorel', 0.02]);
        if (neighsM['crumbspore'] >= 1 && neighsM['shimmerlily'] >= 1) muts.push(['cheapcap', 0.04]);
        if (neighsM['doughshroom'] >= 1 && neighsM['greenRot'] >= 1) muts.push(['foolBolete', 0.04]);
        if (neighsM['crumbspore'] >= 2) muts.push(['doughshroom', 0.005]);
        if (neighsM['doughshroom'] >= 1 && neighs['doughshroom'] <= 1) muts.push(['doughshroom', 0.07]);
        if (neighsM['doughshroom'] >= 2) muts.push(['crumbspore', 0.005]);
        if (neighsM['crumbspore'] >= 1 && neighsM['brownMold'] >= 1) muts.push(['wrinklegill', 0.06]);
        if (neighsM['whiteMildew'] >= 1 && neighsM['clover'] >= 1) muts.push(['greenRot', 0.05]);
    
        if (neighsM['wrinklegill'] >= 1 && neighsM['elderwort'] >= 1) muts.push(['shriekbulb', 0.001]);
        if (neighsM['elderwort'] >= 5) muts.push(['shriekbulb', 0.001]);
        if (neighs['duketater'] >= 3) muts.push(['shriekbulb', 0.005]);
        if (neighs['doughshroom'] >= 4) muts.push(['shriekbulb', 0.002]);
        if (neighsM['queenbeet'] >= 5) muts.push(['shriekbulb', 0.001]);
        if (neighs['shriekbulb'] >= 1 && neighs['shriekbulb'] < 2) muts.push(['shriekbulb', 0.005]);
    
        if (neighsM['bakerWheat'] >= 1 && neighsM['whiteChocoroot'] >= 1) muts.push(['tidygrass', 0.002]);
        if (neighsM['tidygrass'] >= 3 && neighsM['elderwort'] >= 3) muts.push(['everdaisy', 0.002]);
        if (neighsM['elderwort'] >= 1 && neighsM['crumbspore'] >= 1) muts.push(['ichorpuff', 0.002]);
    
        return muts;
    },
    
    computeBoostPlot() {
        //some plants apply effects to surrounding tiles
        //this function computes those effects by creating a grid in which those effects stack
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                //age mult, power mult, weed mult
                this.plotBoost[y][x] = [1, 1, 1];
            }
        }
    
        const effectOn = (
            /** @type {number} */ X, /** @type {number} */ Y,
            /** @type {number} */ s, /** @type {any[]} */ mult
        ) => {
            for (let y = Math.max(0, Y - s); y < Math.min(6, Y + s + 1); y++) {
                for (let x = Math.max(0, X - s); x < Math.min(6, X + s + 1); x++) {
                    if (X != x || Y != y) {
                        for (const [i, element] of mult.entries()) {
                            this.plotBoost[y][x][i] *= element;
                        }
                    }
                }
            }
        };
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                let tile = this.plot[y][x];
                if (tile[0] > 0) {
                    let me = this.plantsById[tile[0] - 1];
                    let name = me.key;
                    let stage = 0;
                    if (tile[1] >= me.mature) stage = 4;
                    else if (tile[1] >= me.mature * 0.666) stage = 3;
                    else if (tile[1] >= me.mature * 0.333) stage = 2;
                    else stage = 1;
    
                    let soilMult = this.soilsById[this.soil].effMult;
                    let mult = soilMult;
    
                    if (stage == 1) mult *= 0.1;
                    else if (stage == 2) mult *= 0.25;
                    else if (stage == 3) mult *= 0.5;
                    else mult *= 1;
    
                    //age mult, power mult, weed mult
                    /*if (name=='elderwort') effectOn(x,y,1,[1+0.03*mult,1,1]);
                            else if (name=='queenbeetLump') effectOn(x,y,1,[1,1-0.2*mult,1]);
                            else if (name=='nursetulip') effectOn(x,y,1,[1,1+0.2*mult,1]);
                            else if (name=='shriekbulb') effectOn(x,y,1,[1,1-0.05*mult,1]);
                            else if (name=='tidygrass') effectOn(x,y,2,[1,1,0]);
                            else if (name=='everdaisy') effectOn(x,y,1,[1,1,0]);
                            else if (name=='ichorpuff') effectOn(x,y,1,[1-0.5*mult,1-0.5*mult,1]);*/
    
                    let ageMult = 1;
                    let powerMult = 1;
                    let weedMult = 1;
                    let range = 0;
    
                    if (name == 'elderwort') {
                        ageMult = 1.03;
                        range = 1;
                    } else if (name == 'queenbeetLump') {
                        powerMult = 0.8;
                        range = 1;
                    } else if (name == 'nursetulip') {
                        powerMult = 1.2;
                        range = 1;
                    } else if (name == 'shriekbulb') {
                        powerMult = 0.95;
                        range = 1;
                    } else if (name == 'tidygrass') {
                        weedMult = 0;
                        range = 2;
                    } else if (name == 'everdaisy') {
                        weedMult = 0;
                        range = 1;
                    } else if (name == 'ichorpuff') {
                        ageMult = 0.5;
                        powerMult = 0.5;
                        range = 1;
                    }
    
                    //by god i hope these are right
                    if (ageMult >= 1) ageMult = (ageMult - 1) * mult + 1;
                    else if (mult >= 1) ageMult = 1 / ((1 / ageMult) * mult);
                    else ageMult = 1 - (1 - ageMult) * mult;
                    if (powerMult >= 1) powerMult = (powerMult - 1) * mult + 1;
                    else if (mult >= 1) powerMult = 1 / ((1 / powerMult) * mult);
                    else powerMult = 1 - (1 - powerMult) * mult;
    
                    if (range > 0) effectOn(x, y, range, [ageMult, powerMult, weedMult]);
                }
            }
        }
    },
    
    computeEffs() {
        this.toCompute = false;
        let effs = {
            cps: 1,
            click: 1,
            cursorCps: 1,
            grandmaCps: 1,
            goldenCookieGain: 1,
            goldenCookieFreq: 1,
            goldenCookieDur: 1,
            goldenCookieEffDur: 1,
            wrathCookieGain: 1,
            wrathCookieFreq: 1,
            wrathCookieDur: 1,
            wrathCookieEffDur: 1,
            reindeerGain: 1,
            reindeerFreq: 1,
            reindeerDur: 1,
            itemDrops: 1,
            milk: 1,
            wrinklerSpawn: 1,
            wrinklerEat: 1,
            upgradeCost: 1,
            buildingCost: 1
        };
    
        if (!this.freeze) {
            let soilMult = this.soilsById[this.soil].effMult;
    
            for (let y = 0; y < 6; y++) {
                for (let x = 0; x < 6; x++) {
                    let tile = this.plot[y][x];
                    if (tile[0] > 0) {
                        let me = this.plantsById[tile[0] - 1];
                        let name = me.key;
                        let stage = 0;
                        if (tile[1] >= me.mature) stage = 4;
                        else if (tile[1] >= me.mature * 0.666) stage = 3;
                        else if (tile[1] >= me.mature * 0.333) stage = 2;
                        else stage = 1;
    
                        let mult = soilMult;
    
                        if (stage == 1) mult *= 0.1;
                        else if (stage == 2) mult *= 0.25;
                        else if (stage == 3) mult *= 0.5;
                        else mult *= 1;
    
                        mult *= this.plotBoost[y][x][1];
    
                        if (name == 'bakerWheat') effs.cps += 0.01 * mult;
                        else if (name == 'thumbcorn') effs.click += 0.02 * mult;
                        else if (name == 'cronerice') effs.grandmaCps += 0.03 * mult;
                        else if (name == 'gildmillet') {
                            effs.goldenCookieGain += 0.01 * mult;
                            effs.goldenCookieEffDur += 0.001 * mult;
                        } else if (name == 'clover') effs.goldenCookieFreq += 0.01 * mult;
                        else if (name == 'goldenClover') effs.goldenCookieFreq += 0.03 * mult;
                        else if (name == 'shimmerlily') {
                            effs.goldenCookieGain += 0.01 * mult;
                            effs.goldenCookieFreq += 0.01 * mult;
                            effs.itemDrops += 0.01 * mult;
                        } else if (name == 'elderwort') {
                            effs.wrathCookieGain += 0.01 * mult;
                            effs.wrathCookieFreq += 0.01 * mult;
                            effs.grandmaCps += 0.01 * mult;
                        } else if (name == 'bakeberry') effs.cps += 0.01 * mult;
                        else if (name == 'chocoroot') effs.cps += 0.01 * mult;
                        else if (name == 'whiteChocoroot') effs.goldenCookieGain += 0.01 * mult;
                        else if (name == 'whiteMildew') effs.cps += 0.01 * mult;
                        else if (name == 'brownMold') effs.cps *= 1 - 0.01 * mult;
                        else if (name !== 'meddleweed' && name === 'whiskerbloom') effs.milk += 0.002 * mult;
                        else if (name == 'chimerose') {
                            effs.reindeerGain += 0.01 * mult;
                            effs.reindeerFreq += 0.01 * mult;
                        } else if (name == 'nursetulip') {
                            effs.cps *= 1 - 0.02 * mult;
                        } else if (name == 'drowsyfern') {
                            effs.cps += 0.03 * mult;
                            effs.click *= 1 - 0.05 * mult;
                            effs.goldenCookieFreq *= 1 - 0.1 * mult;
                        } else if (name == 'wardlichen') {
                            effs.wrinklerSpawn *= 1 - 0.15 * mult;
                            effs.wrathCookieFreq *= 1 - 0.02 * mult;
                        } else if (name == 'keenmoss') {
                            effs.itemDrops += 0.03 * mult;
                        } else if (name == 'queenbeet') {
                            effs.goldenCookieEffDur += 0.003 * mult;
                            effs.cps *= 1 - 0.02 * mult;
                        } else if (name == 'queenbeetLump') {
                            effs.cps *= 1 - 0.1 * mult;
                        } else if (name == 'glovemorel') {
                            effs.click += 0.04 * mult;
                            effs.cursorCps += 0.01 * mult;
                            effs.cps *= 1 - 0.01 * mult;
                        } else if (name == 'cheapcap') {
                            effs.upgradeCost *= 1 - 0.002 * mult;
                            effs.buildingCost *= 1 - 0.002 * mult;
                        } else if (name == 'foolBolete') {
                            effs.goldenCookieFreq += 0.02 * mult;
                            effs.goldenCookieGain *= 1 - 0.05 * mult;
                            effs.goldenCookieDur *= 1 - 0.02 * mult;
                            effs.goldenCookieEffDur *= 1 - 0.02 * mult;
                        } else if (name == 'wrinklegill') {
                            effs.wrinklerSpawn += 0.02 * mult;
                            effs.wrinklerEat += 0.01 * mult;
                        } else if (name == 'greenRot') {
                            effs.goldenCookieDur += 0.005 * mult;
                            effs.goldenCookieFreq += 0.01 * mult;
                            effs.itemDrops += 0.01 * mult;
                        } else if (name == 'shriekbulb') {
                            effs.cps *= 1 - 0.02 * mult;
                        }
                    }
                }
            }
        }
        this.effs = effs;
        Game.recalculateGains = 1;
    },
    
    /** @param {any} me */
    getCost(me) {
        if (Game.Has('Turbo-charged soil')) return 0;
        return Math.max(me.costM, Game.cookiesPs * me.cost * 60) * (Game.HasAchiev('Seedless to nay') ? 0.95 : 1);
    },
    
    /** @param {any} me */
    getPlantDesc(me) {
        let children = '';
        if (me.children.length > 0) {
            children += '<div class="shadowFilter" style="display:inline-block;">';
            for (let i in me.children) {
                if (!this.plants[me.children[i]]) console.log('No plant named ' + me.children[i]);
                else {
                    let it = this.plants[me.children[i]];
                    children += it.unlocked
                        ? '<div class="gardenSeedTiny" style="background-position:' + -0 * 48 + 'px ' + -it.icon * 48 + 'px;"></div>'
                        : '<div class="gardenSeedTiny" style="background-image:url(img/icons.png?v=' +
                                    Game.version +
                                    ');background-position:' +
                                    -0 * 48 +
                                    'px ' +
                                    -7 * 48 +
                                    'px;opacity:0.35;"></div>';
                }
            }
            children += '</div>';
        }
    
        return (
            '<div class="description">' +
                    (!me.immortal
                        ? '<div style="margin:6px 0px;font-size:11px;"><b>Average lifespan :</b> ' +
                        Game.sayTime((100 / (me.ageTick + me.ageTickR / 2)) * this.stepT * 30, -1) +
                        ' <small>(' +
                        Beautify(Math.ceil((100 / (me.ageTick + me.ageTickR / 2)) * 1)) +
                        ' ticks)</small></div>'
                        : '') +
                    '<div style="margin:6px 0px;font-size:11px;"><b>Average maturation :</b> ' +
                    Game.sayTime((100 / (me.ageTick + me.ageTickR / 2)) * (me.mature / 100) * this.stepT * 30, -1) +
                    ' <small>(' +
                    Beautify(Math.ceil((100 / (me.ageTick + me.ageTickR / 2)) * (me.mature / 100))) +
                    ' ticks)</small></div>' +
                    (me.weed ? '<div style="margin:6px 0px;font-size:11px;"><b>Is a weed</b></div>' : '') +
                    (me.fungus ? '<div style="margin:6px 0px;font-size:11px;"><b>Is a fungus</b></div>' : '') +
                    (me.detailsStr ? '<div style="margin:6px 0px;font-size:11px;"><b>Details :</b> ' + me.detailsStr + '</div>' : '') +
                    (children != '' ? '<div style="margin:6px 0px;font-size:11px;"><b>Possible mutations :</b> ' + children + '</div>' : '') +
                    '<div class="line"></div>' +
                    '<div style="margin:6px 0px;"><b>Effects :</b></div>' +
                    '<div style="font-size:11px;font-weight:bold;">' +
                    me.effsStr +
                    '</div>' +
                    (me.q ? '<q>' + me.q + '</q>' : '') +
                    '</div>'
        );
    },
    /** @param {any} me */
    canPlant(me) {
        return Game.cookies >= this.getCost(me);
    },
    
    hideCursor() {
        this.cursor = 0;
    },
    showCursor() {
        this.cursor = 1;
    },
    /** @param {number} id */
    soilTooltip(id) {
        return () => {
            let me = this.soilsById[id];
            let str =
                        '<div style="padding:8px 4px;min-width:350px;">' +
                        (this.parent.amount < me.req
                            ? '<div style="text-align:center;">Soil unlocked at ' + me.req + ' farms.</div>'
                            : '<div class="icon" style="background:url(img/gardenPlants.png?v=' +
                            Game.version +
                            ');float:left;margin-left:-8px;margin-top:-8px;background-position:' +
                            -me.icon * 48 +
                            'px ' +
                            -34 * 48 +
                            'px;"></div>' +
                            '<div><div class="name">' +
                            me.name +
                            '</div><div><small>' +
                            (this.soil == me.id
                                ? 'Your field is currently using this soil.'
                                : (this.nextSoil > Date.now()
                                    ? 'You will be able to change your soil again in ' + Game.sayTime(((this.nextSoil - Date.now()) / 1000) * 30 + 30, -1) + '.'
                                    : 'Click to use this type of soil for your whole field.')) +
                            '</small></div></div>' +
                            '<div class="line"></div>' +
                            '<div class="description">' +
                            '<div style="margin:6px 0px;"><b>Effects :</b></div>' +
                            '<div style="font-size:11px;font-weight:bold;">' +
                            me.effsStr +
                            '</div>' +
                            (me.q ? '<q>' + me.q + '</q>' : '') +
                            '</div>') +
                        '</div>';
            return str;
        };
    },
    /** @param {number} id */
    seedTooltip(id) {
        return () => {
            let me = this.plantsById[id];
            let str =
                        '<div style="padding:8px 4px;min-width:400px;">' +
                        '<div class="icon" style="background:url(img/gardenPlants.png?v=' +
                        Game.version +
                        ');float:left;margin-left:-24px;margin-top:-4px;background-position:' +
                        -0 * 48 +
                        'px ' +
                        -me.icon * 48 +
                        'px;"></div>' +
                        '<div class="icon" style="background:url(img/gardenPlants.png?v=' +
                        Game.version +
                        ');float:left;margin-left:-24px;margin-top:-28px;background-position:' +
                        -4 * 48 +
                        'px ' +
                        -me.icon * 48 +
                        'px;"></div>' +
                        '<div style="background:url(img/turnInto.png);width:20px;height:22px;position:absolute;left:28px;top:24px;z-index:1000;"></div>' +
                        (me.plantable
                            ? '<div style="float:right;text-align:right;width:100px;"><small>Planting cost :</small><br><span class="price' +
                            (this.canPlant(me) ? '' : ' disabled') +
                            '">' +
                            Beautify(Math.round(shortenNumber(this.getCost(me)))) +
                            '</span><br><small>' +
                            Game.sayTime(me.cost * 60 * 30, -1) +
                            ' of CpS,<br>minimum ' +
                            Beautify(me.costM) +
                            ' cookies</small></div>'
                            : '') +
                        '<div style="width:300px;"><div class="name">' +
                        me.name +
                        ' seed</div><div><small>' +
                        (me.plantable ? 'Click to select this seed for planting.' : '<span class="red">This seed cannot be planted.</span>') +
                        '<br>Shift+ctrl+click to harvest all mature plants of this type.</small></div></div>' +
                        '<div class="line"></div>' +
                        this.getPlantDesc(me) +
                        '</div>';
            return str;
        };
    },
    /** @param {number} id */
    toolTooltip(id) {
        return () => {
            let me = this.toolsById[id];
            let icon = [me.icon, 35];
            let str =
                        '<div style="padding:8px 4px;min-width:350px;">' +
                        '<div class="icon" style="background:url(img/gardenPlants.png?v=' +
                        Game.version +
                        ');float:left;margin-left:-8px;margin-top:-8px;background-position:' +
                        -icon[0] * 48 +
                        'px ' +
                        -icon[1] * 48 +
                        'px;"></div>' +
                        '<div><div class="name">' +
                        me.name +
                        '</div></div>' +
                        '<div class="line"></div>' +
                        '<div class="description">' +
                        (me.descFunc ? me.descFunc() : me.desc) +
                        '</div>' +
                        '</div>';
            return str;
        };
    },
    /**
     * @param {number} x
     * @param {number} y
     */
    tileTooltip(x, y) {
        return () => {
            if (Game.keys['ShiftLeft'] || Game.keys['ShiftRight']) return '';
            let tile = this.plot[y][x];
            if (tile[0] == 0) {
                let me = this.seedSelected >= 0 ? this.plantsById[this.seedSelected] : null;
                let str =
                            '<div style="padding:8px 4px;min-width:350px;text-align:center;">' +
                            '<div class="name">Empty tile</div>' +
                            '<div class="line"></div><div class="description">' +
                            'This tile of soil is empty.<br>Pick a seed and plant something!' +
                            (me
                                ? '<div class="line"></div>Click to plant <b>' +
                                me.name +
                                '</b> for <span class="price' +
                                (this.canPlant(me) ? '' : ' disabled') +
                                '">' +
                                Beautify(Math.round(this.getCost(me))) +
                                '</span>.<br><small>(Shift-click to plant multiple.)</small><br><small>(Holding the shift key pressed will also hide tooltips.)</small>'
                                : '') +
                            // @ts-expect-error I hate loose equality
                            (this.plotBoost[y][x] != [1, 1, 1]
                                ? '<small>' +
                                (this.plotBoost[y][x][0] != 1 ? '<br>Aging multiplier : ' + Beautify(this.plotBoost[y][x][0] * 100) + '%' : '') +
                                (this.plotBoost[y][x][1] != 1 ? '<br>Effect multiplier : ' + Beautify(this.plotBoost[y][x][1] * 100) + '%' : '') +
                                (this.plotBoost[y][x][2] != 1 ? '<br>Weeds/fungus repellent : ' + Beautify(100 - this.plotBoost[y][x][2] * 100) + '%' : '') +
                                '</small>'
                                : '') +
                            '</div>' +
                            '</div>';
                return str;
            } else {
                let me = this.plantsById[tile[0] - 1];
                let stage = 0;
                if (tile[1] >= me.mature) stage = 4;
                else if (tile[1] >= me.mature * 0.666) stage = 3;
                else if (tile[1] >= me.mature * 0.333) stage = 2;
                else stage = 1;
                let icon = [stage, me.icon];
                let str =
                            '<div style="padding:8px 4px;min-width:350px;">' +
                            '<div class="icon" style="background:url(img/gardenPlants.png?v=' +
                            Game.version +
                            ');float:left;margin-left:-8px;margin-top:-8px;background-position:' +
                            -icon[0] * 48 +
                            'px ' +
                            -icon[1] * 48 +
                            'px;"></div>' +
                            '<div class="name">' +
                            me.name +
                            '</div><div><small>This plant is growing here.</small></div>' +
                            '<div class="line"></div>' +
                            '<div style="text-align:center;">' +
                            '<div style="display:inline-block;position:relative;box-shadow:0px 0px 0px 1px #000,0px 0px 0px 1px rgba(255,255,255,0.5) inset,0px -2px 2px 0px rgba(255,255,255,0.5) inset;width:256px;height:6px;background:linear-gradient(to right,#fff 0%,#0f9 ' +
                            me.mature +
                            '%,#3c0 ' +
                            (me.mature + 0.1) +
                            '%,#960 100%)">' +
                            '<div class="gardenGrowthIndicator" style="left:' +
                            Math.floor((tile[1] / 100) * 256) +
                            'px;"></div>' +
                            '<div style="background:url(img/gardenPlants.png?v=' +
                            Game.version +
                            ');background-position:' +
                            -1 * 48 +
                            'px ' +
                            -icon[1] * 48 +
                            'px;position:absolute;left:' +
                            (0 - 24) +
                            'px;top:-32px;transform:scale(0.5,0.5);width:48px;height:48px;"></div>' +
                            '<div style="background:url(img/gardenPlants.png?v=' +
                            Game.version +
                            ');background-position:' +
                            -2 * 48 +
                            'px ' +
                            -icon[1] * 48 +
                            'px;position:absolute;left:' +
                            (((me.mature * 0.333) / 100) * 256 - 24) +
                            'px;top:-32px;transform:scale(0.5,0.5);width:48px;height:48px;"></div>' +
                            '<div style="background:url(img/gardenPlants.png?v=' +
                            Game.version +
                            ');background-position:' +
                            -3 * 48 +
                            'px ' +
                            -icon[1] * 48 +
                            'px;position:absolute;left:' +
                            (((me.mature * 0.666) / 100) * 256 - 24) +
                            'px;top:-32px;transform:scale(0.5,0.5);width:48px;height:48px;"></div>' +
                            '<div style="background:url(img/gardenPlants.png?v=' +
                            Game.version +
                            ');background-position:' +
                            -4 * 48 +
                            'px ' +
                            -icon[1] * 48 +
                            'px;position:absolute;left:' +
                            ((me.mature / 100) * 256 - 24) +
                            'px;top:-32px;transform:scale(0.5,0.5);width:48px;height:48px;"></div>' +
                            '</div><br>' +
                            '<b>Stage :</b> ' +
                            ['bud', 'sprout', 'bloom', 'mature'][stage - 1] +
                            '<br>' +
                            '<small>' +
                            (stage == 1
                                ? 'Plant effects : 10%'
                                : (stage == 2
                                    ? 'Plant effects : 25%'
                                    // eslint-disable-next-line unicorn/no-nested-ternary
                                    : stage == 3
                                        ? 'Plant effects : 50%'
                                        : 'Plant effects : 100%; may reproduce, will drop seed when harvested')) +
                            '</small>' +
                            '<br><small>' +
                            (stage < 4
                                ? 'Mature in about ' +
                                Game.sayTime((100 / (this.plotBoost[y][x][0] * (me.ageTick + me.ageTickR / 2))) * ((me.mature - tile[1]) / 100) * this.stepT * 30, -1) +
                                ' (' +
                                Beautify(Math.ceil((100 / (this.plotBoost[y][x][0] * (me.ageTick + me.ageTickR / 2))) * ((me.mature - tile[1]) / 100))) +
                                ' tick' +
                                (Math.ceil((100 / (this.plotBoost[y][x][0] * (me.ageTick + me.ageTickR / 2))) * ((me.mature - tile[1]) / 100)) == 1 ? '' : 's') +
                                ')'
                                : (!me.immortal
                                    ? 'Decays in about ' +
                                    Game.sayTime((100 / (this.plotBoost[y][x][0] * (me.ageTick + me.ageTickR / 2))) * ((100 - tile[1]) / 100) * this.stepT * 30, -1) +
                                    ' (' +
                                    Beautify(Math.ceil((100 / (this.plotBoost[y][x][0] * (me.ageTick + me.ageTickR / 2))) * ((100 - tile[1]) / 100))) +
                                    ' tick' +
                                    (Math.ceil((100 / (this.plotBoost[y][x][0] * (me.ageTick + me.ageTickR / 2))) * ((100 - tile[1]) / 100)) == 1 ? '' : 's') +
                                    ')'
                                    : 'Does not decay')) +
                            '</small>' +
                            // @ts-expect-error I hate loose equality v2
                            (this.plotBoost[y][x] != [1, 1, 1]
                                ? '<small>' +
                                (this.plotBoost[y][x][0] != 1 ? '<br>Aging multiplier : ' + Beautify(this.plotBoost[y][x][0] * 100) + '%' : '') +
                                (this.plotBoost[y][x][1] != 1 ? '<br>Effect multiplier : ' + Beautify(this.plotBoost[y][x][1] * 100) + '%' : '') +
                                (this.plotBoost[y][x][2] != 1 ? '<br>Weeds/fungus repellent : ' + Beautify(100 - this.plotBoost[y][x][2] * 100) + '%' : '') +
                                '</small>'
                                : '') +
                            '</div>' +
                            '<div class="line"></div>' +
                            //'<div style="text-align:center;">Click to harvest'+(M.seedSelected>=0?', planting <b>'+M.plantsById[M.seedSelected].name+'</b><br>for <span class="price'+(M.canPlant(me)?'':' disabled')+'">'+Beautify(Math.round(M.getCost(M.plantsById[M.seedSelected])))+'</span> in its place':'')+'.</div>'+
                            '<div style="text-align:center;">Click to ' +
                            (stage == 4 ? 'harvest' : 'unearth') +
                            '.</div>' +
                            '<div class="line"></div>' +
                            this.getPlantDesc(me) +
                            '</div>';
                return str;
            }
        };
    },
    refillTooltip() {
        return (
            '<div style="padding:8px;width:300px;font-size:11px;text-align:center;">Click to refill your soil timer and trigger <b>1</b> plant growth tick with <b>x3</b> spread and mutation rate for <span class="price lump">1 sugar lump</span>.' +
                    (Game.canRefillLump()
                        ? '<br><small>(can be done once every ' + Game.sayTime(Game.getLumpRefillMax(), -1) + ')</small>'
                        : '<br><small class="red">(usable again in ' + Game.sayTime(Game.getLumpRefillRemaining() + Game.fps, -1) + ')</small>') +
                    '</div>'
        );
    },
    
    buildPanel() {
        if (!$('gardenSeeds')) return false;
        let str = '';
        for (let i in this.plants) {
            let me = this.plants[i];
            let icon = [0, me.icon];
            str +=
                        '<div id="gardenSeed-' +
                        me.id +
                        '" class="gardenSeed' +
                        (this.seedSelected == me.id ? ' on' : '') +
                        ' locked" ' +
                        Game.getDynamicTooltip('Game.ObjectsById[' + this.parent.id + '].minigame.seedTooltip(' + me.id + ')', 'this') +
                        '>';
            str +=
                        '<div id="gardenSeedIcon-' +
                        me.id +
                        '" class="gardenSeedIcon shadowFilter" style="background-position:' +
                        -icon[0] * 48 +
                        'px ' +
                        -icon[1] * 48 +
                        'px;"></div>';
            str += '</div>';
        }
        $('gardenSeeds', true).innerHTML = str;
    
        for (let i in this.plants) {
            const me = this.plants[i];
            me.l = $('gardenSeed-' + me.id, true);
            me.l.addEventListener(
                'click',
                () => {
                    if ((Game.keys['ShiftLeft'] || Game.keys['ShiftRight']) && (Game.keys['ControlLeft'] || Game.keys['ControlRight'])) {
                        //shift & ctrl
                        //harvest all mature of type
                        M.harvestAll(me, 1);
                        return false;
                    }
                    if (!me.plantable && !Game.sesame) return false;
                    if (this.seedSelected == me.id) {
                        this.seedSelected = -1;
                    } else {
                        this.seedSelected = ASSERT_NOT_NULL(me.id);
                        PlaySound('snd/toneTick.mp3');
                    }
                    for (let i in this.plants) {
                        const it = this.plants[i];
                        if (it.id == this.seedSelected) {
                            ASSERT_NOT_NULL(it.l).classList.add('on');
                        } else {
                            ASSERT_NOT_NULL(it.l).classList.remove('on');
                        }
                    }
                    return true;
                }
            );
            me.l.addEventListener('mouseover', this.hideCursor);
            me.l.addEventListener('mouseout', this.showCursor);
            if (me.unlocked) me.l.classList.remove('locked');
        }
    
        str = '';
        for (let i in this.tools) {
            let me = this.tools[i];
            let icon = [me.icon, 35];
            str +=
                        '<div id="gardenTool-' +
                        me.id +
                        '" style="margin:8px;" class="gardenSeed' +
                        (me.isOn && me.isOn() ? ' on' : '') +
                        '' +
                        (!me.isDisplayed || me.isDisplayed() ? '' : ' locked') +
                        '" ' +
                        Game.getDynamicTooltip('Game.ObjectsById[' + this.parent.id + '].minigame.toolTooltip(' + me.id + ')', 'this') +
                        '>';
            str +=
                        '<div id="gardenToolIcon-' +
                        me.id +
                        '" class="gardenSeedIcon shadowFilter" style="background-position:' +
                        -icon[0] * 48 +
                        'px ' +
                        -icon[1] * 48 +
                        'px;"></div>';
            str += '</div>';
        }
        $('gardenTools', true).innerHTML = str;
    
        for (let i in this.tools) {
            let me = this.tools[i];
            $('gardenTool-' + me.id, true).addEventListener('click', me.func);
            $('gardenTool-' + me.id, true).addEventListener('mouseover', this.hideCursor);
            $('gardenTool-' + me.id, true).addEventListener('mouseout', this.showCursor);
        }
    
        str = '';
        for (let i in this.soils) {
            let me = this.soils[i];
            let icon = [me.icon, 34];
            str +=
                        '<div id="gardenSoil-' +
                        me.id +
                        '" class="gardenSeed gardenSoil disabled' +
                        (this.soil == me.id ? ' on' : '') +
                        '" ' +
                        Game.getDynamicTooltip('Game.ObjectsById[' + this.parent.id + '].minigame.soilTooltip(' + me.id + ')', 'this') +
                        '>';
            str +=
                        '<div id="gardenSoilIcon-' +
                        me.id +
                        '" class="gardenSeedIcon shadowFilter" style="background-position:' +
                        -icon[0] * 48 +
                        'px ' +
                        -icon[1] * 48 +
                        'px;"></div>';
            str += '</div>';
        }
        $('gardenSoils', true).innerHTML = str;
    
        for (let i in this.soils) {
            let me = this.soils[i];
            $('gardenSoil-' + me.id, true).addEventListener(
                'click',
                () => {
                    if (this.freeze || this.soil == me.id || this.nextSoil > Date.now() || this.parent.amount < me.req) {
                        return false;
                    }
                    PlaySound('snd/toneTick.mp3');
                    this.nextSoil = Date.now() + (Game.Has('Turbo-charged soil') ? 1 : 1000 * 60 * 10);
                    this.toCompute = true;
                    this.soil = ASSERT_NOT_NULL(me.id);
                    this.computeStepT();
                    for (let i in this.soils) {
                        let it = this.soils[i];
                        if (it.id == this.soil) {
                            $('gardenSoil-' + it.id, true).classList.add('on');
                        } else {
                            $('gardenSoil-' + it.id, true).classList.remove('on');
                        }
                    }
                    return true;
                }
            );
            $('gardenSoil-' + me.id, true).addEventListener('mouseover', this.hideCursor);
            $('gardenSoil-' + me.id, true).addEventListener('mouseout', this.showCursor);
        }
    
        this.cursorL = $('gardenCursor', true);
        return true;
    },
    buildPlot() {
        this.toRebuild = false;
        if (!$('gardenPlot')) return false;
        if (!$('gardenTile-0-0')) {
            let str = '';
            for (let y = 0; y < 6; y++) {
                for (let x = 0; x < 6; x++) {
                    str +=
                                '<div id="gardenTile-' +
                                x +
                                '-' +
                                y +
                                '" class="gardenTile" style="left:' +
                                x * this.tileSize +
                                'px;top:' +
                                y * this.tileSize +
                                'px;display:none;" ' +
                                Game.getDynamicTooltip('Game.ObjectsById[' + this.parent.id + '].minigame.tileTooltip(' + x + ',' + y + ')', 'this') +
                                '>';
                    str += '<div id="gardenTileIcon-' + x + '-' + y + '" class="gardenTileIcon" style="display:none;"></div>';
                    str += '</div>';
                }
            }
            $('gardenPlot', true).innerHTML = str;
    
            for (let y = 0; y < 6; y++) {
                for (let x = 0; x < 6; x++) {
                    $('gardenTile-' + x + '-' + y, true).addEventListener(
                        'click',
                        () => this.clickTile(x, y)
                    );
                }
            }
        }
        let plants = 0;
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                let tile = this.plot[y][x];
                let tileL = $('gardenTile-' + x + '-' + y, true);
                let iconL = $('gardenTileIcon-' + x + '-' + y, true);
                let me;
                if (tile[0] > 0) {
                    plants++;
                    me = this.plantsById[tile[0] - 1];
                    let stage = 0;
                    if (tile[1] >= me.mature) stage = 4;
                    else if (tile[1] >= me.mature * 0.666) stage = 3;
                    else if (tile[1] >= me.mature * 0.333) stage = 2;
                    else stage = 1;
                    let dying = tile[1] + Math.ceil(me.ageTick + me.ageTickR) >= 100 ? 1 : 0;
                    let icon = [stage, me.icon];
                    iconL.style.opacity = dying ? '0.5' : '1';
                    iconL.style.backgroundPosition = -icon[0] * 48 + 'px ' + -icon[1] * 48 + 'px';
                    iconL.style.display = 'block';
                } else iconL.style.display = 'none';
                tileL.style.display = this.isTileUnlocked(x, y) ? 'block' : 'none';
            }
        }
        if (plants >= 6 * 6) Game.Win('In the garden of Eden (baby)');
        return true;
    },
    
    /**
     * @param {number} x
     * @param {number} y
     */
    clickTile(x, y) {
        const outcome = this.useTool(this.seedSelected, x, y);
        this.toCompute = true;
        if (outcome && !(Game.keys['ShiftLeft'] || Game.keys['ShiftRight'])) {
            //shift
            this.seedSelected = -1;
            for (let i in this.plants) {
                let it = this.plants[i];
                if (it.id == this.seedSelected) {
                    $('gardenSeed-' + it.id, true).classList.add('on');
                } else {
                    $('gardenSeed-' + it.id, true).classList.remove('on');
                }
            }
        }
    },
    
    /**
     * @param {number} what
     * @param {number} x
     * @param {number} y
     */
    useTool(what, x, y) {
        let harvested = this.harvest(x, y);
        if (harvested) {
            Game.SparkleAt(Game.mouseX, Game.mouseY);
            PlaySound('snd/harvest' + choose(['1', '2', '3']) + '.mp3', 1);
        } else {
            if (what >= 0 && this.canPlant(this.plantsById[what])) {
                this.plot[y][x] = [what + 1, 0];
                this.toRebuild = true;
                Game.Spend(this.getCost(this.plantsById[what]));
                Game.SparkleAt(Game.mouseX, Game.mouseY);
                PlaySound('snd/tillb' + choose(['1', '2', '3']) + '.mp3', 1);
                return true;
            }
        }
        return false;
    },
    
    /**
     * @param {number} x
     * @param {number} y
     */
    getTile(x, y) {
        if (x < 0 || x > 5 || y < 0 || y > 5 || !this.isTileUnlocked(x, y)) return [0, 0];
        return this.plot[y][x];
    },
    
    /**
     * @param {number} x
     * @param {number} y
     */
    isTileUnlocked(x, y) {
        let level = this.parent.level;
        level = Math.max(1, Math.min(this.plotLimits.length, level)) - 1;
        const limits = this.plotLimits[level];
        return x >= limits[0] && x < limits[2] && y >= limits[1] && y < limits[3];
    },
    
    computeStepT() {
        this.stepT = Game.Has('Turbo-charged soil') ? 1 : this.soilsById[this.soil].tick * 60;
    },
    
    askConvert() {
        if (this.plantsUnlockedN < this.plantsN) return false;
        Game.Prompt(
            '<h3>Sacrifice garden</h3><div class="block">Do you REALLY want to sacrifice your garden to the sugar hornets?<br><small>You will be left with an empty plot and only the Baker\'s wheat seed unlocked.<br>In return, you will gain <b>10 sugar lumps</b>.</small></div>',
            [['Yes!', 'Game.ClosePrompt();Game.ObjectsById[' + this.parent.id + '].minigame.convert();'], 'No']
        );
        return true;
    },
    convert() {
        if (this.plantsUnlockedN < this.plantsN) return false;
        this.harvestAll();
        for (let i in this.plants) {
            this.lockSeed(this.plants[i]);
        }
        this.unlockSeed(this.plants['bakerWheat']);
    
        Game.gainLumps(10);
        Game.Notify(
            'Sacrifice!',
            'You\'ve sacrificed your garden to the sugar hornets, destroying your crops and your knowledge of seeds.<br>In the remains, you find <b>10 sugar lumps</b>.',
            [29, 14],
            12
        );
    
        this.seedSelected = -1;
        Game.Win('Seedless to nay');
        this.convertTimes++;
        this.computeMatures();
        PlaySound('snd/spellFail.mp3', 0.75);
        return true;
    },
    
    /**
     * @param {number | Plant} [type]
     * @param {number} [mature]
     * @param {number} [mortal]
     */
    harvestAll(type, mature, mortal) {
        let harvested = 0;
        for (
            let i = 0;
            i < 2;
            i++ //we do it twice to take care of whatever spawns on kill
        ) {
            for (let y = 0; y < 6; y++) {
                for (let x = 0; x < 6; x++) {
                    if (this.plot[y][x][0] >= 1) {
                        let doIt = true;
                        const tile = this.plot[y][x];
                        const me = this.plantsById[tile[0] - 1];
                        if (type && me != type) doIt = false;
                        if (mortal && me.immortal) doIt = false;
                        if (mature && tile[1] < me.mature) doIt = false;
    
                        if (doIt) harvested += this.harvest(x, y) ? 1 : 0;
                    }
                }
            }
        }
        if (harvested > 0) setTimeout(() => void PlaySound('snd/harvest1.mp3', 1),  50);
        if (harvested > 2) setTimeout(() => void PlaySound('snd/harvest2.mp3', 1), 150);
        if (harvested > 6) setTimeout(() => void PlaySound('snd/harvest3.mp3', 1), 250);
    },
    /**
     * @param {number} x
     * @param {number} y
     */
    harvest(x, y) {
        let tile = this.plot[y][x];
        if (tile[0] >= 1) {
            this.toCompute = true;
            let me = this.plantsById[tile[0] - 1];
            let age = tile[1];
            if (me.onHarvest) me.onHarvest(x, y, age);
            if (tile[1] >= me.mature) {
                if (this.unlockSeed(me)) Game.Popup('(' + me.name + ')<br>Unlocked ' + me.name + ' seed.', Game.mouseX, Game.mouseY);
                this.harvests++;
                this.harvestsTotal++;
                if (this.harvestsTotal >= 100) Game.Win('Botany enthusiast');
                if (this.harvestsTotal >= 1000) Game.Win('Green, aching thumb');
            }
    
            this.plot[y][x] = [0, 0];
            if (me.onKill) me.onKill(x, y, age);
            this.toRebuild = true;
            return true;
        }
        return false;
    },
    
    /**
     * @param {Plant} me
     */
    unlockSeed(me) {
        if (me.unlocked) return false;
        me.unlocked = 1;
        if (me.l) me.l.classList.remove('locked');
        this.getUnlockedN();
        return true;
    },
    /**
     * @param {Plant} me
     */
    lockSeed(me) {
        if (me.locked) return false;
        me.unlocked = 0;
        if (me.l) me.l.classList.add('locked');
        this.getUnlockedN();
        return true;
    },

    onResize() {
        const width = $('gardenContent', true).offsetWidth;
        const panelW = Math.min(Math.max(width * 0.4, 320), width - 6 * this.tileSize) - 8;
        const fieldW = Math.max(Math.min(width * 0.6, width - panelW), 6 * this.tileSize) - 8;
        $('gardenField', true).style.width = fieldW + 'px';
        $('gardenPanel', true).style.width = panelW + 'px';
    },
    onLevel() {
        this.buildPlot();
    },
    onRuinTheFun() {
        for (let i in this.plants) {
            this.unlockSeed(this.plants[i]);
        }
    },
    save() {
        //output cannot use ",", ";" or "|"
        /** @type {string} */
        let str =
                '' +
                // @ts-expect-error needs testing
                Number.parseFloat(this.nextStep) +
                ':' +
                // @ts-expect-error needs testing
                Number.parseInt(this.soil) +
                ':' +
                // @ts-expect-error needs testing
                Number.parseFloat(this.nextSoil) +
                ':' +
                // @ts-expect-error needs testing
                Number.parseInt(this.freeze) +
                ':' +
                // @ts-expect-error needs testing
                Number.parseInt(this.harvests) +
                ':' +
                // @ts-expect-error needs testing
                Number.parseInt(this.harvestsTotal) +
                ':' +
                Number.parseInt(this.parent.onMinigame ? '1' : '0') +
                ':' +
                // @ts-expect-error needs testing
                Number.parseFloat(this.convertTimes) +
                ':' +
                // @ts-expect-error needs testing
                Number.parseFloat(this.nextFreeze) +
                ':' +
                ' ';
        for (let i in this.plants) {
            str += '' + (this.plants[i].unlocked ? '1' : '0');
        }
        str += ' ';
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                // @ts-expect-error needs testing
                str += Number.parseInt(this.plot[y][x][0]) + ':' + Number.parseInt(this.plot[y][x][1]) + ':';
            }
        }
        return str;
    },
    /** @param {string} [str] */
    load(str) {
        //interpret str; called after .init
        //note : not actually called in the Game's load; see "minigameSave" in main.js
        if (!str) return false;
        let i = 0;
        let spl = str.split(' ');
        let spl2 = spl[i++].split(':');
        let i2 = 0;
        // @ts-expect-error needs testing
        this.nextStep = Number.parseFloat(spl2[i2++] || this.nextStep);
        // @ts-expect-error needs testing
        this.soil = Number.parseInt(spl2[i2++] || this.soil);
        // @ts-expect-error needs testing
        this.nextSoil = Number.parseFloat(spl2[i2++] || this.nextSoil);
        // @ts-expect-error needs testing
        this.freeze = Number.parseInt(spl2[i2++] || this.freeze) ? 1 : 0;
        // @ts-expect-error needs testing
        this.harvests = Number.parseInt(spl2[i2++] || 0);
        // @ts-expect-error needs testing
        this.harvestsTotal = Number.parseInt(spl2[i2++] || 0);
        // @ts-expect-error needs testing
        let on = Number.parseInt(spl2[i2++] || 0);
        if (on && Game.ascensionMode != 1) this.parent.switchMinigame(1);
        // @ts-expect-error needs testing
        this.convertTimes = Number.parseFloat(spl2[i2++] || this.convertTimes);
        // @ts-expect-error needs testing
        this.nextFreeze = Number.parseFloat(spl2[i2++] || this.nextFreeze);
        let seeds = spl[i++] || '';
        if (seeds) {
            let n = 0;
            for (let ii in this.plants) {
                this.plants[ii].unlocked = seeds.charAt(n) === '1' ? 1 : 0;
                n++;
            }
        }
        this.plants['bakerWheat'].unlocked = 1;
    
        const plotTemp = spl[i++] || null;
        if (plotTemp) {
            const plot = plotTemp.split(':');
            let n = 0;
            for (let y = 0; y < 6; y++) {
                for (let x = 0; x < 6; x++) {
                    this.plot[y][x] = [Number.parseInt(plot[n]), Number.parseInt(plot[n + 1])];
                    n += 2;
                }
            }
        }
    
        this.getUnlockedN();
        this.computeStepT();
    
        this.buildPlot();
        this.buildPanel();
    
        this.computeBoostPlot();
        this.toCompute = true;
        return true;
    },
    /** @param {boolean} [hard] */
    reset(hard) {
        this.soil = 0;
        if (this.seedSelected > -1) ASSERT_NOT_NULL(this.plantsById[this.seedSelected].l).classList.remove('on');
        this.seedSelected = -1;
    
        this.nextStep = Date.now();
        this.nextSoil = Date.now();
        this.nextFreeze = Date.now();
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                this.plot[y][x] = [0, 0];
            }
        }
    
        this.harvests = 0;
        if (hard) {
            this.convertTimes = 0;
            this.harvestsTotal = 0;
            for (let i in this.plants) {
                this.plants[i].unlocked = 0;
            }
        }
    
        this.plants['bakerWheat'].unlocked = 1;
    
        this.loopsMult = 1;
    
        this.getUnlockedN();
        this.computeStepT();
    
        this.computeMatures();
    
        this.buildPlot();
        this.buildPanel();
        this.computeEffs();
        this.toCompute = true;
    
        setTimeout(() => void this.onResize(), 10);
    },
    logic() {
        // run each frame
        let now = Date.now();
    
        if (!this.freeze) {
            this.nextStep = Math.min(this.nextStep, now + this.stepT * 1000);
            if (now >= this.nextStep) {
                this.computeStepT();
                this.nextStep = now + this.stepT * 1000;
    
                this.computeBoostPlot();
                this.computeMatures();
    
                let weedMult = this.soilsById[this.soil].weedMult;
    
                let loops = 1;
                if (this.soilsById[this.soil].key == 'woodchips') loops = 3;
                loops *= this.loopsMult;
                this.loopsMult = 1;
    
                for (let y = 0; y < 6; y++) {
                    for (let x = 0; x < 6; x++) {
                        if (this.isTileUnlocked(x, y)) {
                            let tile = this.plot[y][x];
                            let me = this.plantsById[tile[0] - 1];
                            if (tile[0] > 0) {
                                //age
                                tile[1] += randomRound((me.ageTick + me.ageTickR * Math.random()) * this.plotBoost[y][x][0]);
                                tile[1] = Math.max(tile[1], 0);
                                if (me.immortal) tile[1] = Math.min(me.mature + 1, tile[1]);
                                else if (tile[1] >= 100) {
                                    //die of old age
                                    this.plot[y][x] = [0, 0];
                                    if (me.onDie) me.onDie();
                                    if (this.soilsById[this.soil].key == 'pebbles' && Math.random() < 0.35 && this.unlockSeed(me))
                                        Game.Popup(`Unlocked ${me.name} seed.`, Game.mouseX, Game.mouseY);
                                } else if (!me.noContam) {
                                    //other plant contamination
                                    //only occurs in cardinal directions
                                    //immortal plants and plants with noContam are immune
    
                                    let list = [];
                                    for (let i in this.plantContam) {
                                        if (Math.random() < this.plantContam[i] && (!this.plants[i].weed || Math.random() < weedMult)) list.push(i);
                                    }
                                    let contam = choose(list);
    
                                    if (
                                        contam && me.key != contam && (
                                            (!this.plants[contam].weed && !this.plants[contam].fungus) ||
                                            Math.random() < this.plotBoost[y][x][2]
                                        )
                                    ) {
                                        /** @type {Record<string, number>} */
                                        let neighs = {}; // all surrounding plants
                                        /** @type {Record<string, number>} */
                                        let neighsM = {}; // all surrounding mature plants
                                        for (let i in this.plants) neighs[i] = 0;
                                        for (let i in this.plants) neighsM[i] = 0;
                                        let neigh = this.getTile(x, y - 1);
                                        if (neigh[0] > 0) {
                                            const age = neigh[1];
                                            const plant = this.plantsById[neigh[0] - 1];
                                            neighs[ASSERT_NOT_NULL(plant.key)]++;
                                            if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                        }
                                        neigh = this.getTile(x, y + 1);
                                        if (neigh[0] > 0) {
                                            const age = neigh[1];
                                            const plant = this.plantsById[neigh[0] - 1];
                                            neighs[ASSERT_NOT_NULL(plant.key)]++;
                                            if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                        }
                                        neigh = this.getTile(x - 1, y);
                                        if (neigh[0] > 0) {
                                            const age = neigh[1];
                                            const plant = this.plantsById[neigh[0] - 1];
                                            neighs[ASSERT_NOT_NULL(plant.key)]++;
                                            if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                        }
                                        neigh = this.getTile(x + 1, y);
                                        if (neigh[0] > 0) {
                                            const age = neigh[1];
                                            const plant = this.plantsById[neigh[0] - 1];
                                            neighs[ASSERT_NOT_NULL(plant.key)]++;
                                            if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                        }
    
                                        if (neighsM[contam] >= 1) this.plot[y][x] = [(this.plants[contam].id ?? 0) + 1, 0];
                                    }
                                }
                            } else {
                                //plant spreading and mutation
                                //happens on all 8 tiles around this one
                                for (let loop = 0; loop < loops; loop++) {
                                    let any = 0;
                                    /** @type {Record<string, number>} */
                                    let neighs = {}; // all surrounding plants
                                    /** @type {Record<string, number>} */
                                    let neighsM = {}; // all surrounding mature plants
                                    for (let i in this.plants) neighs[i] = 0;
                                    for (let i in this.plants) neighsM[i] = 0;
                                    let neigh = this.getTile(x, y - 1);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x, y + 1);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x - 1, y);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x + 1, y);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x - 1, y - 1);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x - 1, y + 1);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x + 1, y - 1);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    neigh = this.getTile(x + 1, y + 1);
                                    if (neigh[0] > 0) {
                                        const age = neigh[1];
                                        const plant = this.plantsById[neigh[0] - 1];
                                        any++;
                                        neighs[ASSERT_NOT_NULL(plant.key)]++;
                                        if (age >= plant.mature) neighsM[ASSERT_NOT_NULL(plant.key)]++;
                                    }
                                    if (any > 0) {
                                        let muts = this.getMuts(neighs, neighsM);
    
                                        let list = [];
                                        for (const mut of muts) {
                                            if (
                                                Math.random() < mut[1] &&
                                                (!this.plants[mut[0]].weed || Math.random() < weedMult) &&
                                                (
                                                    (!this.plants[mut[0]].weed && !this.plants[mut[0]].fungus) ||
                                                    Math.random() < this.plotBoost[y][x][2]
                                                )
                                            )
                                                list.push(mut[0]);
                                        }
                                        if (list.length > 0) this.plot[y][x] = [(this.plants[choose(list)].id ?? 0) + 1, 0];
                                    } else if (loop == 0) {
                                        // weeds in empty tiles (no other plants must be nearby)
                                        const chance = 0.002 * weedMult * this.plotBoost[y][x][2];
                                        if (Math.random() < chance) this.plot[y][x] = [(this.plants['meddleweed'].id ?? 0) + 1, 0];
                                    }
                                }
                            }
                        }
                    }
                }
                this.toRebuild = true;
                this.toCompute = true;
            }
        }
        if (this.toRebuild) this.buildPlot();
        if (this.toCompute) this.computeEffs();
    
        if (Game.keys['Escape']) {
            if (this.seedSelected > -1) ASSERT_NOT_NULL(this.plantsById[this.seedSelected].l).classList.remove('on');
            this.seedSelected = -1;
        }
    },
    /** run each draw frame */
    draw() {    
        if (this.cursorL) {
            if (!this.cursor || this.seedSelected < 0) {
                this.cursorL.style.display = 'none';
            } else {
                let box = $('gardenDrag', true).getBoundingClientRect();
                let x = Game.mouseX - box.left - 24;
                let y = Game.mouseY - box.top;
                let seed = this.plantsById[this.seedSelected];
                let icon = [0, seed.icon];
                this.cursorL.style.transform = 'translate(' + x + 'px,' + y + 'px)';
                this.cursorL.style.backgroundPosition = -icon[0] * 48 + 'px ' + -icon[1] * 48 + 'px';
                this.cursorL.style.display = 'block';
            }
        }
        if (Game.drawT % 10 === 0) {
            ASSERT_NOT_NULL(this.lumpRefill).style.display = 'block';
            if (this.freeze) $('gardenNextTick', true).innerHTML = 'Garden is frozen. Unfreeze to resume.';
            else $('gardenNextTick', true).innerHTML = 'Next tick in ' + Game.sayTime(((this.nextStep - Date.now()) / 1000) * 30 + 30, -1) + '';
            $('gardenStats', true).innerHTML = 'Mature plants harvested : ' + Beautify(this.harvests) + ' (total : ' + Beautify(this.harvestsTotal) + ')';
            if (this.parent.level < this.plotLimits.length)
                $('gardenPlotSize', true).innerHTML =
                        '<small>Plot size : ' +
                        Math.max(1, Math.min(this.plotLimits.length, this.parent.level)) +
                        '/' +
                        this.plotLimits.length +
                        '<br>(Upgrades with farm level)</small>';
            else $('gardenPlotSize', true).innerHTML = '';
            $('gardenSeedsUnlocked', true).innerHTML = 'Seeds<small> (' + this.plantsUnlockedN + '/' + this.plantsN + ')</small>';
            for (let i in this.soils) {
                let me = this.soils[i];
                if (this.parent.amount < me.req) $('gardenSoil-' + me.id, true).classList.add('disabled');
                else $('gardenSoil-' + me.id, true).classList.remove('disabled');
            }
        }
    },
};
Obj.minigame = M;

// M = 0; // ??????
