declare module "gifshot" {
  interface CreateGIFOptions {
    images: Array<string | HTMLCanvasElement>;
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    numFrames?: number;
    sampleInterval?: number;
    progressCallback?: (capturedFrames: number, totalFrames: number) => void;
  }

  interface CreateGIFResult {
    error: boolean;
    errorCode?: string;
    image?: string;
    errorMsg?: string;
  }

  function createGIF(
    options: CreateGIFOptions,
    callback: (result: CreateGIFResult) => void
  ): void;

  export { createGIF };
  const gifshot: { createGIF: typeof createGIF };
  export default gifshot;
}
