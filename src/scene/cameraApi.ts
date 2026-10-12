/** Imperative bridge from DOM buttons (zoom ±) to the active R3F camera. Set by CameraRig. */
export const cameraApi: { zoom: (factor: number) => void } = { zoom: () => {} };
