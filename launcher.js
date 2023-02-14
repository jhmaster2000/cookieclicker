/* =====================================================================================
LAUNCH THIS THING
=======================================================================================*/
window.onload = function () {
    if (!Game.ready) {
        const loadLangAndLaunch = function (
            /** @type {string} */ lang, /** @type {boolean=} */ firstLaunch = false
        ) {
            if (!firstLaunch) localStorageSet('CookieClickerLang', lang);

            LoadScript(
                'loc/EN.js?v=' + Game.version,
                (function (lang) {
                    return function () {
                        locStringsFallback = locStrings;
                        LoadScript('loc/' + lang + '.js?v=' + Game.version, function () {
                            let launch = function () {
                                Game.Launch();
                                if (top !== self) Game.ErrorFrame();
                                else {
                                    console.log(
                                        '[=== ' +
                                        choose([
                                            'Oh, hello!',
                                            'hey, how\'s it hangin',
                                            'About to cheat in some cookies or just checking for bugs?',
                                            'Remember : cheated cookies taste awful!',
                                            'Hey, Orteil here. Cheated cookies taste awful... or do they?'
                                        ]) +
                                        ' ===]'
                                    );
                                    Game.Load(function () {
                                        Game.Init();
                                        if (firstLaunch) Game.showLangSelection(true);
                                    });
                                }
                            };
                            launch();
                        });
                    };
                })(lang)
            );
        };

        let lang = localStorageGet('CookieClickerLang');
        if (!lang) loadLangAndLaunch('EN', true);
        else loadLangAndLaunch(String(lang));
    }
};
