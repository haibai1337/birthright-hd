import type { Scenario } from '../core/schema';
import type { TerrainAnchor } from './terrain-placement';
import type { LandscapeMaterials } from './connected-terrain';
import {
  buildBaseTerrain,
  paintTerrainPage,
  type BaseTerrainModel,
  type TerrainMaterial,
  type TerrainPage,
  type TerrainPilotPatch,
} from './base-terrain';

export type TerrainWorkerRequest =
  | {
      type: 'init';
      width: number;
      height: number;
      pixels: Uint8ClampedArray;
      water: Uint8Array;
      provinces: Scenario['provinces'];
      material: TerrainMaterial;
      anchors: TerrainAnchor[];
      pilot?: TerrainPilotPatch;
      landscape?: LandscapeMaterials;
    }
  | { type: 'page'; key: string; page: TerrainPage };
export type TerrainWorkerReply =
  | {
      type: 'ready' | 'page';
      key?: string;
      page: TerrainPage;
      ground: ImageBitmap;
      water: ImageBitmap | null;
      ms: number;
      landscapeLinks?: number;
      crossProvinceLinks?: number;
    }
  | { type: 'error'; message: string };

const scope = self as unknown as {
  onmessage: (event: MessageEvent<TerrainWorkerRequest>) => void;
  postMessage: (message: TerrainWorkerReply, transfer?: Transferable[]) => void;
};
let model: BaseTerrainModel | undefined;
function bitmap(data: Uint8ClampedArray, width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height),
    cx = canvas.getContext('2d')!;
  const image = cx.createImageData(width, height);
  image.data.set(data);
  cx.putImageData(image, 0, 0);
  return canvas.transferToImageBitmap();
}
scope.onmessage = ({ data }) => {
  try {
    const start = performance.now();
    if (data.type === 'init') {
      const source = new OffscreenCanvas(data.material.width, data.material.height),
        cx = source.getContext('2d')!;
      const image = cx.createImageData(source.width, source.height);
      image.data.set(data.material.pixels);
      cx.putImageData(image, 0, 0);
      const materials = [data.material];
      for (const factor of [2, 4]) {
        const mip = new OffscreenCanvas(
            Math.ceil(source.width / factor),
            Math.ceil(source.height / factor),
          ),
          context = mip.getContext('2d')!;
        context.imageSmoothingQuality = 'high';
        context.drawImage(source, 0, 0, mip.width, mip.height);
        materials.push({
          width: mip.width,
          height: mip.height,
          pixels: context.getImageData(0, 0, mip.width, mip.height).data,
        });
      }
      model = buildBaseTerrain(
        data.pixels,
        data.width,
        data.height,
        data.water,
        data.provinces,
        materials,
        data.anchors,
        data.pilot,
        data.landscape,
      );
    }
    if (!model) throw Error('Terrain worker has not received its source masks');
    const page =
      data.type === 'page'
        ? data.page
        : { x: 0, y: 0, width: model.width, height: model.height, resolution: 1 };
    const result = paintTerrainPage(model, page, data.type === 'init' ? 0 : undefined);
    const ground = bitmap(result.ground, result.width, result.height),
      water = result.water ? bitmap(result.water, result.width, result.height) : null;
    scope.postMessage(
      {
        type: data.type === 'init' ? 'ready' : 'page',
        key: data.type === 'page' ? data.key : undefined,
        page,
        ground,
        water,
        ms: performance.now() - start,
        landscapeLinks: model.landscape?.links,
        crossProvinceLinks: model.landscape?.crossProvinceLinks,
      },
      water ? [ground, water] : [ground],
    );
  } catch (error) {
    scope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Terrain synthesis failed',
    });
  }
};
