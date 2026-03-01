'use client';

import { useState, useRef } from 'react';
import { FaceAnalysis, Preset } from '@/types';
import presetsJson from '@/data/pose_presets.json';

type Step = 'upload' | 'analyze' | 'select' | 'generate' | 'composite' | 'done' | 'error';

const PRESETS: Preset[] = presetsJson.presets as Preset[];

async function postJson<T>(url: string, data: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [statusMsg, setStatusMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setStep('analyze');
    setStatusMsg('업로드 중...');

    // [1] 업로드
    const form = new FormData();
    form.append('file', file);
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
    const { blobUrl: url, error: uploadErr } = await uploadRes.json();
    if (uploadErr) return handleError(uploadErr);

    setBlobUrl(url);
    setStatusMsg('얼굴 분석 중...');

    // [2] 분석
    const { faceAnalysis: fa, error: analyzeErr } = await postJson<{
      faceAnalysis: FaceAnalysis;
      error?: string;
    }>('/api/analyze', { blobUrl: url });
    if (analyzeErr) return handleError(analyzeErr);

    setFaceAnalysis(fa);
    setStep('select');
    setStatusMsg('스타일을 선택하세요');
  }

  async function handleStyleSelect(preset: Preset) {
    if (!blobUrl || !faceAnalysis) return;

    setStep('generate');
    setStatusMsg(`"${preset.style_name}" 생성 중... (약 1~2분 소요)`);

    // [3] 생성
    const { frames, error: genErr } = await postJson<{ frames: string[]; error?: string }>(
      '/api/generate',
      { blobUrl, styleId: preset.style_id, faceAnalysis }
    );
    if (genErr) return handleError(genErr);

    setStep('composite');
    setStatusMsg('4컷 합성 중...');

    // [4] 합성
    const { resultImage: img, error: compErr } = await postJson<{
      resultImage: string;
      error?: string;
    }>('/api/composite', { frames, styleId: preset.style_id });
    if (compErr) return handleError(compErr);

    setResultImage(img);
    setStep('done');

    // [5] 원본 삭제 (fire-and-forget)
    fetch('/api/cleanup', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl }),
    });
  }

  function handleError(msg: string) {
    setStep('error');
    setStatusMsg(msg);
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setStep('upload');
    setStatusMsg('');
    setPreview(null);
    setBlobUrl(null);
    setFaceAnalysis(null);
    setResultImage(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">인생네컷 AI</h1>
      <p className="text-gray-400 mb-8 text-sm">셀카 한 장으로 인생네컷 스타일 사진 생성</p>

      {/* 업로드 */}
      {step === 'upload' && (
        <label className="cursor-pointer flex flex-col items-center justify-center w-72 h-72 border-2 border-dashed border-gray-600 rounded-xl hover:border-white transition">
          <span className="text-4xl mb-3">📷</span>
          <span className="text-gray-400">셀카를 업로드하세요</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}

      {/* 분석/생성/합성 진행 중 */}
      {(step === 'analyze' || step === 'generate' || step === 'composite') && (
        <div className="flex flex-col items-center gap-4">
          {preview && (
            <img src={preview} alt="preview" className="w-48 h-48 object-cover rounded-xl opacity-60" />
          )}
          <div className="flex items-center gap-2 text-gray-300">
            <span className="animate-spin inline-block">⏳</span>
            <span>{statusMsg}</span>
          </div>
        </div>
      )}

      {/* 스타일 선택 */}
      {step === 'select' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-xl">
          {preview && (
            <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded-xl" />
          )}
          <p className="text-gray-300">스타일을 선택하세요</p>
          <div className="grid grid-cols-2 gap-3 w-full">
            {PRESETS.map((preset) => (
              <button
                key={preset.style_id}
                onClick={() => handleStyleSelect(preset)}
                className="py-3 px-4 rounded-xl text-sm font-medium border border-gray-700 hover:bg-gray-800 transition text-left"
                style={{ borderLeftColor: preset.border_color, borderLeftWidth: 4 }}
              >
                {preset.style_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 결과 */}
      {step === 'done' && resultImage && (
        <div className="flex flex-col items-center gap-4">
          <img
            src={`data:image/png;base64,${resultImage}`}
            alt="result"
            className="max-w-sm w-full rounded-xl shadow-2xl"
          />
          <div className="flex gap-3">
            <a
              href={`data:image/png;base64,${resultImage}`}
              download="life4cut.png"
              className="px-5 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition"
            >
              다운로드
            </a>
            <button
              onClick={handleReset}
              className="px-5 py-2 border border-gray-600 rounded-lg hover:border-white transition"
            >
              다시 만들기
            </button>
          </div>
        </div>
      )}

      {/* 에러 */}
      {step === 'error' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-400">{statusMsg}</p>
          <button
            onClick={handleReset}
            className="px-5 py-2 border border-gray-600 rounded-lg hover:border-white transition"
          >
            다시 시도
          </button>
        </div>
      )}
    </main>
  );
}
