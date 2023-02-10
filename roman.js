/**
 * Converts a number to its roman numeral representation in a string. (428 -> CDXXVIII)
 * @param {number=} num
 */
function roman(num = 0) {
    if (!Number.isSafeInteger(num)) throw new TypeError(`"${num}" is not a valid integer to convert to roman numerals.`);
    const sign = num < 0 ? '-' : '';
    num = Math.abs(num);
    let M = num - num % 1000;
    let D = 0;
    let C = num - M - ((num - M) % 100);
    let L = 0;
    let X = num - (M + C) - ((num - (M + C)) % 10);
    let V = 0;
    let I = num - (M + C + X);
    M /= 1000; C /= 100; X /= 10;
    if (C >= 5) (C -= 5, D++);
    if (X >= 5) (X -= 5, L++);
    if (I >= 5) (I -= 5, V++);
    const Mstr = M <= 1000 ? 'M'.repeat(M) : `(M*${M})`; // cap M at 1000 to avoid exceeding max string length
    const str = `${Mstr}${'D'.repeat(D)}${'C'.repeat(C)}${'L'.repeat(L)}${'X'.repeat(X)}${'V'.repeat(V)}${'I'.repeat(I)}`;
    return sign + str // remove replaceAll's below for ancient roman (no mandatory subtraction)
        .replaceAll('DCCCC', 'CM').replaceAll('LXXXX', 'XC').replaceAll('VIIII', 'IX')
        .replaceAll('CCCC',  'CD').replaceAll('XXXX',  'XL').replaceAll('IIII',  'IV');
}
window.exports.roman = roman;
