export interface OriginalAsset {
  file: string;
  width?: number;
  height?: number;
  frames?: string[];
  frameMs?: number;
}
export interface OriginalAssets {
  version: 1;
  assets: Record<string, OriginalAsset>;
  portraits: Record<string, string>;
  mapIcons: string[];
  troopIcons?: Record<number, string>;
  music: { menu: string; campaign: string; campaignFallback: boolean; note: string };
  effects: { click: string; order: string; error: string };
}
let pending: Promise<OriginalAssets> | undefined;
export function assetUrl(pack: OriginalAssets | null, id: string) {
  const file = pack?.assets[id]?.file;
  return file && /^(?:images|audio)\/[A-Za-z0-9_./&!+ -]+$/.test(file) && !file.includes('..')
    ? '/original/' + file
    : undefined;
}
export function loadOriginalAssets() {
  pending ??= fetch('/original/runtime.json')
    .then(async (r) => {
      if (!r.ok)
        throw new Error('Original graphics and soundtrack are missing. Run npm run assets:import.');
      const data = (await r.json()) as OriginalAssets;
      if (data.version !== 1 || !data.assets || !data.music || !data.portraits || !data.mapIcons)
        throw new Error('Invalid original asset manifest. Run npm run assets:import.');
      for (const id of [
        'MAP/LGMAP.PCX',
        'UI/MAINPANL.PCX',
        'UI/DTURN_BK.PCX',
        data.music.menu,
        data.music.campaign,
        data.effects?.click,
      ])
        if (!id || !assetUrl(data, id))
          throw new Error('Required original asset is missing: ' + (id ?? 'audio definitions'));
      return data;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
