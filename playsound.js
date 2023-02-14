const Sounds = [];
const SoundInsts = [];
for (let i = 0; i < 12; i++) SoundInsts[i] = new Audio();
let SoundI = 0;

/**
 * @param {string} url The url of the sound to play (will be cached so it only loads once)
 * @param {number=} volume Volume between 0 and 1 (multiplied by game volume setting); defaults to 1 (full volume)
 */
const PlaySound = (
    url,
    volume = 1
) => {
    let volumeSetting = Game.volume;
    if (volume < -5) {
        volume += 10;
        volumeSetting = Game.volumeMusic;
    }
    if (!volumeSetting || volume === 0) return;
    if (typeof Sounds[url] === 'undefined') {
        // sound isn't loaded, cache it
        Sounds[url] = new Audio(url);
        Sounds[url].onloadeddata = () => PlaySound(url, volume);
    } else if (Sounds[url].readyState >= 2 && SoundInsts[SoundI].paused) {
        const sound = SoundInsts[SoundI];
        SoundI++;
        if (SoundI >= 12) SoundI = 0;
        sound.src = Sounds[url].src;
        sound.volume = Math.pow((volume * volumeSetting) / 100, 2);
        try {
            sound.play();
        } catch (e) { /* empty */ }
    }
};
PlaySound; //! export
