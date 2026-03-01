export interface FaceAnalysis {
  subject_biometrics: {
    ethnicity_and_vibe: string;
    age_range: string;
    skin_details: string;
    body_build: string;
  };
  subject_features: {
    hair_styling: string;
    eye_details: string;
    expression_variants: string[];
    makeup_specification: string;
  };
  attire_and_ornaments: {
    main_outfit: string;
    materials: string[];
    accessories: {
      head_and_neck: string;
      jewelry_and_details: string[];
      hand_accessories: string;
    };
  };
}

export interface PoseVariant {
  frame_index: number;
  pose_desc: string;
  expression: string;
  controlnet_hint: string;
}

export interface Preset {
  style_id: string;
  style_name: string;
  generation_mode: string;
  override_user_outfit: boolean;
  border_color: string;
  layout_and_format: {
    grid_type: string;
    frame_styling: string;
    consistency_rule: string;
  };
  composition_and_technical: {
    shot_perspective: string;
    lighting_setup: string;
    camera_settings: string;
    background_env: string;
  };
  aesthetic_and_post: {
    color_grading: string;
    quality_boosters: string[];
  };
  preset_pose_variants: PoseVariant[];
  negative_constraints: string;
}
