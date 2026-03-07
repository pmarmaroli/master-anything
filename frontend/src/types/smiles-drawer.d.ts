declare module 'smiles-drawer' {
  export interface DrawerOptions {
    width?: number;
    height?: number;
    bondThickness?: number;
    bondLength?: number;
    shortBondLength?: number;
    bondSpacing?: number;
    atomVisualization?: 'default' | 'balls' | 'none';
    isomeric?: boolean;
    debug?: boolean;
    terminalCarbons?: boolean;
    explicitHydrogens?: boolean;
    overlapSensitivity?: number;
    overlapResolutionIterations?: number;
    compactDrawing?: boolean;
    fontFamily?: string;
    fontSizeLarge?: number;
    fontSizeSmall?: number;
    padding?: number;
    experimental?: boolean;
    themes?: Record<string, unknown>;
  }

  export class Drawer {
    constructor(options?: DrawerOptions);
    draw(
      tree: unknown,
      target: string | HTMLCanvasElement,
      theme?: string,
      infoOnly?: boolean
    ): void;
  }

  export function parse(
    smiles: string,
    successCallback: (tree: unknown) => void,
    errorCallback: (err: unknown) => void
  ): void;
}
