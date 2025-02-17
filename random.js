{
    /**
     * @type {any[]}
     */
    const sharedCharcodeArray = [];
    class RNG {
        /**
         * @param {any[]} inputArr
         */
        constructor(inputArr) {
            const inputArrLen = Number(inputArr.length > 0) || (inputArr = [0], 1);
            const arr256nums = Array.from({ length: 256 }, (_, i) => i);
            this.arr256nums = arr256nums;
            this.i = 0;
            this.j = 0;

            for (let tmp, idx = 0, idx2 = 0; 256 > idx; idx++) {
                arr256nums[idx] = arr256nums[
                    idx2 = 255 & (
                        idx2 + inputArr[idx % inputArrLen] + (tmp = arr256nums[idx])
                    )
                ];
                arr256nums[idx2] = tmp;
            }
            this.update();
        }

        update(a = 256) {
            let var_i = this.i;
            let var_j = this.j;
            let RET = 0;
            for (; a--;) {
                const num = this.arr256nums[var_i = 255 & (var_i + 1)];
                RET = RET * 256 + this.arr256nums[
                    255 & (
                        (this.arr256nums[var_i] = this.arr256nums[var_j = 255 & (var_j + num)])
                        + (this.arr256nums[var_j] = num)
                    )
                ];
            }
            this.i = var_i;
            this.j = var_j;
            return RET;
        }
    }

    Math.seedrandom = function (seed, useSharedCharcodeArrayForSeed) {
        /**
         * @type {any[]}
         */
        const altNumArr = [];
        const finalSeed = hash(
            /** @type {string} */ (deepStringify(
                useSharedCharcodeArrayForSeed
                    ? [seed, fromCharCodes(sharedCharcodeArray)]
                    : seed ?? fromCharCodes(crypto.getRandomValues(new Uint8Array(256))),
                3
            )), altNumArr
        );
        const rng = new RNG(altNumArr);
        hash(fromCharCodes(rng.arr256nums), sharedCharcodeArray);
        Math.random = function random() {
            const pow252 = Math.pow(2, 52);
            let a = rng.update(6);
            let b = Math.pow(256, 6);
            let c = 0;
            for (; pow252 > a;) (a = (a + c) * 256), (b *= 256), (c = rng.update(1));
            for (; a >= 2 * pow252;) (a /= 2), (b /= 2), (c >>>= 1);
            return (a + c) / b;
        };
        return finalSeed;
    };
    hash(Math.random(), sharedCharcodeArray);


    /**
     * @param {number[] | Uint8Array} code
     */
    function fromCharCodes(code) {
        return String.fromCodePoint(...code);
    }

    /**
     * @param {string | number} str
     * @param {any[]} numArr
     */
    function hash(str, numArr) {
        for (let c = String(str), e = 0; c.length > e;) {
            numArr[(256 - 1) & e] =
            (256 - 1) & (
                // eslint-disable-next-line unicorn/prefer-math-trunc
                ~~(19 * numArr[(256 - 1) & e]) +
                /** @type {number} */(c.codePointAt(e++))
            );
        }
        return fromCharCodes(numArr);
    }

    /**
     * @param {string | any[] | any} arrOrValue
     * @param {number} recursionLevel
     * @returns {string | string[]}
     */
    function deepStringify(arrOrValue, recursionLevel) {
        /** @type {string[]} */
        const stringifiedValues = [];
        if (recursionLevel && typeof arrOrValue === 'object') {
            const arr = arrOrValue;
            for (const e in arr) {
                try {
                    stringifiedValues.push(
                        /** @type {string} */ (deepStringify(arr[e], recursionLevel - 1))
                    );
                } catch { /* empty */ }
            }
        }
        if (stringifiedValues.length > 0) return stringifiedValues;
        else return typeof arrOrValue === 'string' ? arrOrValue : `${arrOrValue}\0`;
    }
}