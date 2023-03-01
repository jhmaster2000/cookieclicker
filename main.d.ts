declare interface Element {
    getBounds(): DOMRect;
}

declare interface HTMLElement {
    value: unknown;
    ariaLabelledby: string;
    select(): void;
}

declare interface HTMLCanvasElement {
    alt: string;
}

declare interface ChildNode {
    innerHTML: string;
}

declare interface ParentNode {
    offsetWidth: number;
    offsetHeight: number;
}

declare interface CanvasRenderingContext2D {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fillPattern(img: any, X: any, Y: any, W: any, H: any, iW: any, iH: any, offX: any, offY: any): void;
}

declare interface Math {
    seedrandom(seed?: string, useSharedCharcodeArrayForSeed?: boolean): string;
}

// TODO: replace this shit with ESM later
interface Window {
    exports: {
        roman(num: number): string;
    };
}
