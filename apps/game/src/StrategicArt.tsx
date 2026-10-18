import type { CSSProperties } from 'react';
import selections from '../../../packages/import-tools/art-selections.json';
import { assetUrl, type OriginalAssets } from './original-assets';

interface Selection {
  status: string;
  file: string;
  frameFile?: string;
  nativeSize?: { width: number; height: number };
  sourceRect?: number[];
}
const approved: Record<string, Selection> = selections.assets;
export function strategicAsset(pack: OriginalAssets, id: string) {
  const chosen = approved[id];
  return chosen?.status === 'approved' ? selections.base + chosen.file : assetUrl(pack, id);
}
export function strategicMaterials(pack: OriginalAssets): CSSProperties {
  return {
    '--hd-parchment': `url("${strategicAsset(pack, 'UI/DTURN_BK.PCX')}")`,
    '--hd-scroll': `url("${selections.base}${approved['UI/SCRLBTN0.PCX']!.frameFile}")`,
    '--hd-scroll-selected': `url("${selections.base}${approved['UI/SCRLBTN1.PCX']!.frameFile}")`,
    '--hd-stone': `url("${assetUrl(pack, 'UI/MARBLE01.PCX')}")`,
    '--hd-wood': `url("${assetUrl(pack, 'UI/MENBTN1A.PCX')}")`,
    '--hd-leather': `url("${assetUrl(pack, 'UI/FILLPANL.PCX')}")`,
  } as CSSProperties;
}
/** Explicitly approved replacements only. Original art remains the choice for every other ID. */
export function StrategicImage({
  pack,
  id,
  className = '',
  alt = '',
}: {
  pack: OriginalAssets;
  id: string;
  className?: string;
  alt?: string;
}) {
  const chosen = approved[id];
  if (chosen?.sourceRect && chosen.nativeSize) {
    const [x, y, width, height] = chosen.sourceRect as [number, number, number, number];
    return (
      <span
        className={`strategic-image cropped-art ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        data-art-id={id}
        style={{
          backgroundImage: `url("${strategicAsset(pack, id)}")`,
          backgroundSize: `${(chosen.nativeSize.width / width) * 100}% ${(chosen.nativeSize.height / height) * 100}%`,
          backgroundPosition: `${(x / (chosen.nativeSize.width - width)) * 100}% ${(y / (chosen.nativeSize.height - height)) * 100}%`,
        }}
      />
    );
  }
  return (
    <img
      className={`strategic-image ${className}`}
      src={strategicAsset(pack, id)}
      alt={alt}
      draggable={false}
      data-art-id={id}
    />
  );
}
/** Original DACTN atlas: 44px frames, 46px pitch. Keep the detailed raster miniature. */
export function CouncilIcon({
  pack,
  row,
  size = 52,
}: {
  pack: OriginalAssets;
  row: number;
  size?: number;
}) {
  const visibleSize = `var(--council-icon-size, ${size}px)`;
  return (
    <span
      className="council-icon"
      aria-hidden="true"
      style={{
        width: visibleSize,
        height: visibleSize,
        backgroundImage: `url("${assetUrl(pack, 'UI/DACTN_IC.PCX')}")`,
        backgroundSize: `calc(${visibleSize} * ${96 / 44}) calc(${visibleSize} * ${432 / 44})`,
        backgroundPosition: `0 calc(${visibleSize} * ${(-row * 46) / 44})`,
      }}
    />
  );
}
