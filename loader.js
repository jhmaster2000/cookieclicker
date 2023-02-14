/* eslint-disable no-undef */
class Loader {
    loadingN = 0;
    assetsN = 0;
    /** @type {{ [x: string]: HTMLImageElement; }} */
    assets = {};
    /** @type {string[]} */
    assetsLoading = [];
    /** @type {string[]} */
    assetsLoaded = [];
    domain = '';
    /** @type {Function | null} */
    loaded = null; // callback
    doneLoading = false;

    /**
     * @param {string[]} assets
     */
    Load(assets) {
        for (let i in assets) {
            this.loadingN++;
            this.assetsN++;
            if (!this.assetsLoading[assets[i]] && !this.assetsLoaded[assets[i]]) {
                const img = new Image();
                img.src = assets[i].includes('/') ? assets[i] : this.domain + assets[i];
                img.alt = assets[i];
                img.onload = this.onLoad.bind(this);
                this.assets[assets[i]] = img;
                this.assetsLoading.push(assets[i]);
            }
        }
    }
    /**
     * @note Only used by the Modding API
     * @param {string} old
     * @param {string} newer
     */
    Replace(old, newer) {
        if (!this.assets[old]) this.Load([old]);
        const img = new Image();
        img.src = newer.includes('/') ? newer : this.domain + newer;
        img.alt = newer;
        img.onload = this.onLoad.bind(this);
        this.assets[old] = img;
    }
    /**
     * @param {Event} e
     */
    onLoad(e) {
        const targetAlt = /** @type {HTMLImageElement} */(ASSERT_NOT_NULL(e.target)).alt;
        this.assetsLoaded.push(targetAlt);
        this.assetsLoading.splice(this.assetsLoading.indexOf(targetAlt), 1);
        this.loadingN--;
        if (!this.doneLoading && this.loadingN <= 0 && this.loaded) {
            this.doneLoading = true;
            this.loaded();
        }
    }
    // NOTE: Doesn't seem to be used anywhere
    getProgress() {
        return 1 - this.loadingN / this.assetsN;
    }
}
Loader; //! export

const BLANK_CANVAS = document.createElement('canvas');
BLANK_CANVAS.width = 8;
BLANK_CANVAS.height = 8;
BLANK_CANVAS.alt = 'blank';

const Pic = function (/** @type {string} */ what) {
    if (Game.Loader.assetsLoaded.indexOf(what) != -1) return Game.Loader.assets[what];
    else if (Game.Loader.assetsLoading.indexOf(what) == -1) Game.Loader.Load([what]);
    return BLANK_CANVAS;
};
Pic; //! export
