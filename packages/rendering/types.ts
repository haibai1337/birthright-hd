export type MapOverlay = 'political' | 'military' | 'economic' | 'magical';
export interface MapView {
  selected: string;
  overlay: MapOverlay;
  labels: boolean;
  presentation?: 'relief' | 'original';
  realmTint?: boolean;
}
export interface MapCallbacks {
  select(id: string): void;
  hover(id: string | null): void;
  ready(): void;
  error(message: string): void;
}
