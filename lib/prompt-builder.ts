import { Preset, FaceAnalysis, PoseVariant } from '@/types';

export function buildPrompt(
  preset: Preset,
  faceAnalysis: FaceAnalysis,
  frameIndex: number
): { positive: string; negative: string } {
  const frame: PoseVariant = preset.preset_pose_variants[frameIndex];
  const b = faceAnalysis.subject_biometrics;
  const f = faceAnalysis.subject_features;
  const a = faceAnalysis.attire_and_ornaments;

  const positive = [
    preset.composition_and_technical.shot_perspective,
    `${preset.layout_and_format.grid_type} photo booth image`,
    `Subject: ${b.ethnicity_and_vibe}`,
    b.age_range,
    `hair: ${f.hair_styling}`,
    `wearing: ${a.main_outfit}`,
    `expression: ${frame.expression}`,
    `pose: ${frame.pose_desc}`,
    preset.composition_and_technical.lighting_setup,
    preset.aesthetic_and_post.color_grading,
    preset.aesthetic_and_post.quality_boosters.join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  return { positive, negative: preset.negative_constraints };
}
