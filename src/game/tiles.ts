import { TILE } from './constants';

let floorImage: HTMLImageElement | null = null;
let sideWallImage: HTMLImageElement | null = null;
let wallTopImage: HTMLImageElement | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

export async function preloadTileTextures(): Promise<void> {
  [floorImage, sideWallImage, wallTopImage] = await Promise.all([
    loadImage('/sprites/tiles/floor4.png'),
    loadImage('/sprites/walls/wall2.png'),
    loadImage('/sprites/walls/walltop.png'),
  ]);
  console.log('[Tiles] Loaded: floor4, wall2, walltop');
}

export function getFloorImage(): HTMLImageElement | null {
  if (floorImage && floorImage.complete && floorImage.naturalWidth > 0) return floorImage;
  return null;
}

export function getSideWallImage(): HTMLImageElement | null {
  if (sideWallImage && sideWallImage.complete && sideWallImage.naturalWidth > 0) return sideWallImage;
  return null;
}

export function getWallTopImage(): HTMLImageElement | null {
  if (wallTopImage && wallTopImage.complete && wallTopImage.naturalWidth > 0) return wallTopImage;
  return null;
}
