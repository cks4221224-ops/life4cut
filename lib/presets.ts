import { Preset } from '@/types';
import presetsData from '@/data/pose_presets.json';

const presets: Preset[] = presetsData.presets as Preset[];

export function getPreset(styleId: string): Preset | null {
  return presets.find((p) => p.style_id === styleId) ?? null;
}

export function getAllPresets(): Preset[] {
  return presets;
}
