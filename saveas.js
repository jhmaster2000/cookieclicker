'use strict';
// file save function from https://github.com/eligrey/FileSaver.js
class FileSaver {
    /** @param {Blob} blob */
    constructor(blob, name = 'download') {
        // auto BOM
        if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
            blob = new Blob(['\uFEFF', blob], { type: blob.type });
        }
        setTimeout(() => {
            const object_url = URL.createObjectURL(blob);
            const save_link = /** @type {HTMLAnchorElement} */ (
                document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
            );
            save_link.href = object_url;
            save_link.download = name;
            save_link.dispatchEvent(new MouseEvent('click'));
            setTimeout(() => URL.revokeObjectURL(object_url), 500);
        }, 0);
    }
}

const saveAs = (
    /** @type {Blob} */ blob, /** @type {string=} */ name
) => new FileSaver(blob, name);
saveAs; //!export
