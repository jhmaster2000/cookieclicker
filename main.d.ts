declare interface Element {
    getBounds(): DOMRect;
}

declare interface Math {
    seedrandom(seed?: string, useSharedCharcodeArrayForSeed?: boolean): string;
}