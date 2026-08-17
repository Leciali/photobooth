import { createGIF } from "gifshot";

export function makeGif(images: string[], width = 640, height = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!images.length) {
      reject(new Error("No images provided for GIF"));
      return;
    }

    createGIF(
      {
        images,
        gifWidth: width,
        gifHeight: height,
        interval: 0.4,
        numFrames: images.length,
        progressCallback: () => {},
      },
      (result) => {
        if (result.error) {
          reject(new Error(result.errorMsg || "GIF creation failed"));
          return;
        }
        resolve(result.image as string);
      }
    );
  });
}
