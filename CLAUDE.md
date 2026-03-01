# 인생네컷 AI 생성기

## 프로젝트 개요
셀카를 업로드하면 인생네컷 스타일 실사 사진을 생성하는 웹앱.
원본 셀카는 처리 완료 후 즉시 삭제 (개인정보 보호).

---

## 기술 스택
- **Frontend**: Next.js 14 (App Router)
- **임시 스토리지**: Vercel Blob (생성 완료 시 즉시 del() 호출, 에러 시 파일 잔류 감수)
- **얼굴 분석**: GPT-4o Vision API
- **이미지 생성**: Replicate API — `zsxkib/instant-id` (InstantID + ControlNet OpenPose)
- **이미지 합성**: Sharp (Node.js)
- **배포**: Vercel

---

## 핵심 플로우 (5단계)

```
[1] 셀카 업로드
    └─ Vercel Blob에 임시 저장
    └─ 고유 URL 반환

[2] GPT-4o Vision 분석 (/api/analyze)
    └─ 헤어스타일, 패션, 피부톤, 체형 등 추출
    └─ face_analysis JSON 반환

[3] 스타일 프리셋 선택 + 프롬프트 빌드 (/api/generate)
    └─ pose_presets.json에서 선택된 style_id 로드
    └─ face_analysis + preset 병합 → 4개 프롬프트 생성
    └─ 스켈레톤 합본 이미지(2×2) → Sharp로 4프레임 크롭
    └─ Replicate InstantID + pose_image 호출 (4프레임 병렬)

[4] 4컷 합성 (/api/composite)
    └─ Sharp로 2×2 그리드 합성
    └─ 테두리 추가 (border_color 적용, 푸터 없음)

[5] 원본 삭제 (/api/cleanup)
    └─ Vercel Blob del() 호출
    └─ 실패해도 재시도 없이 잔류 감수
```

---

## 프로젝트 구조

```
life4cut/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 메인 UI
│   └── api/
│       ├── upload/route.ts
│       ├── analyze/route.ts
│       ├── generate/route.ts
│       ├── composite/route.ts
│       └── cleanup/route.ts
├── lib/
│   ├── presets.ts                  # pose_presets.json 로더 + 타입
│   ├── prompt-builder.ts           # 3레이어 프롬프트 빌드
│   ├── skeleton-cropper.ts         # 합본 이미지 → 4프레임 크롭
│   └── composite.ts                # Sharp 2×2 그리드 합성
├── types/
│   └── index.ts                    # 공통 타입 (FaceAnalysis, Preset 등)
├── data/
│   └── pose_presets.json
├── public/
│   └── skeletons/                  # 8장 합본 스켈레톤 이미지 (.jpg)
├── .env.local
├── next.config.ts
└── package.json
```

---

## 필수 패키지

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@vercel/blob": "^0.27.0",
    "openai": "^4.77.0",
    "replicate": "^1.0.1",
    "sharp": "^0.33.5"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

---

## 환경 변수 (.env.local)

```env
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

---

## API 엔드포인트 명세

| Route | Method | Input | Output |
|---|---|---|---|
| `/api/upload` | POST | `multipart/form-data { file }` | `{ blobUrl }` |
| `/api/analyze` | POST | `{ blobUrl }` | `{ faceAnalysis }` |
| `/api/generate` | POST | `{ blobUrl, styleId, faceAnalysis }` | `{ frames: string[4] }` |
| `/api/composite` | POST | `{ frames: string[4], styleId }` | `{ resultImage: base64 }` |
| `/api/cleanup` | DELETE | `{ blobUrl }` | `{ success: boolean }` |

---

## 생성 모드
모든 프리셋 동일: `generation_mode: "face_preserve"`
- Replicate **`zsxkib/instant-id`** → 얼굴 보존 (face_image 입력)
- **`pose_image`** 파라미터 → 스켈레톤 이미지로 포즈 제어 시도
- GPT-4o Vision 분석값 → 헤어/패션 묘사를 프롬프트에 삽입

> ⚠️ 주의: toon_transform(img2img) 방식 사용 안 함. 전부 실사 face_preserve 방식.

---

## 스켈레톤 이미지

- 위치: `public/skeletons/{style_id}.jpg`
- 포맷: 4컷 합본 (2×2 그리드), 런타임에 Sharp로 크롭하여 프레임별 사용
- 총 8장 (프리셋 1개당 1장)

---

## 프롬프트 빌드 로직 (3레이어 병합)

```
Layer 1: 스타일 프리셋 (pose_presets.json) — 구도/조명/배경
Layer 2: GPT-4o 분석 결과 — 헤어/패션/피부 묘사
Layer 3: 선택된 포즈 variant — 프레임별 포즈/표정

shot_perspective,
grid_type photo booth image,
Subject: ethnicity_and_vibe, age_range,
hair: hair_styling,
wearing: main_outfit,
expression: expression,
pose: pose_desc,
lighting_setup,
color_grading,
quality_boosters,
Negative: negative_constraints
```

---

## face_analysis JSON 구조 (GPT-4o 반환값)

```json
{
  "subject_biometrics": {
    "ethnicity_and_vibe": "East Asian, Korean aesthetic",
    "age_range": "early 20s",
    "skin_details": "light skin, smooth texture",
    "body_build": "slender"
  },
  "subject_features": {
    "hair_styling": "shoulder-length straight black hair, see-through bangs",
    "eye_details": "dark brown eyes, natural lashes",
    "expression_variants": [],
    "makeup_specification": "natural daily makeup, nude lip"
  },
  "attire_and_ornaments": {
    "main_outfit": "white oversized cotton shirt",
    "materials": ["cotton"],
    "accessories": {
      "head_and_neck": "none",
      "jewelry_and_details": ["small silver stud earrings"],
      "hand_accessories": "none"
    }
  }
}
```

---

## pose_presets.json — 8개 프리셋 목록

파일 위치: `/data/pose_presets.json`

| style_id | 스타일명 | border_color | 특징 |
|---|---|---|---|
| `dont_look_up_bird_eye` | 돈룩업 부감샷 | `#1a1a1a` | 부감 앵글, 레드 큐브 배경 |
| `dont_look_up_full_body` | 돈룩업 전신 역동 | `#1a1a1a` | 전신 스프롤, 시네마틱 |
| `sailor_moon_close_up` | 세일러문 클로즈업 | `#f9a8d4` | 클로즈업, 파스텔, 애교 포즈 |
| `pikachu_energetic` | 피카츄 에너지 네컷 | `#facc15` | 하이키, 밝고 에너지 넘침 |
| `kuromi_edgy_cute` | 쿠로미 엣지 큐트 | `#7c3aed` | 쿨톤, 귀여움+엣지 혼합 |
| `psyduck_confused_chaos` | 고라파덕 멍청 네컷 | `#60a5fa` | 혼돈 리액션, 코믹 |
| `bobby_hill_reaction` | 바비힐 리액션 네컷 | `#92400e` | 실내 캐주얼, 코믹 리액션 |
| `spongebob_wholesome_joy` | 스폰지밥 순수 기쁨 네컷 | `#fbbf24` | 밝고 순수, 전신 포즈 포함 |

> 각 프리셋은 `preset_pose_variants` 배열에 4개 프레임 포즈/표정 정의 포함.
> `override_user_outfit: false` → 셀카 의상 그대로 유지 (전 프리셋 동일).

---

## 삭제 로직 (보안)

```
생성 완료 시      → 즉시 del() 호출
에러/세션 종료 시 → 파일 잔류 (Vercel Blob TTL 미지원, 자동 삭제 없음)
```

> ⚠️ Vercel Blob은 TTL/자동 만료를 지원하지 않음. del() 실패 시 수동 정리 필요.

---

## 현재 완료된 작업
- [x] 전체 아키텍처 설계
- [x] 5단계 플로우 확정
- [x] 프로젝트 구조 설계
- [x] API 엔드포인트 명세 확정
- [x] 환경 변수 정의
- [x] 필수 패키지 확정
- [x] 3레이어 프롬프트 빌드 구조 설계
- [x] face_analysis JSON 스키마 확정
- [x] pose_presets.json 8개 프리셋 완성 (border_color 포함)
- [x] 스켈레톤 이미지 8장 준비 (public/skeletons/)
- [x] 삭제 로직 설계

## 다음 작업 (TODO)
- [ ] Next.js 프로젝트 초기 세팅
- [ ] /api/upload 구현
- [ ] /api/analyze 구현 (GPT-4o Vision)
- [ ] /api/generate 구현 (Replicate InstantID)
- [ ] /api/composite 구현 (Sharp)
- [ ] /api/cleanup 구현
- [ ] 프론트엔드 UI 구현
