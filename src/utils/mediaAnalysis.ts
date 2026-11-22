const FILLER_WORDS = [
  '어',
  '음',
  '그',
  '약간',
  '좀',
  '사실',
  '뭐랄까',
  '그러니까',
  '일단',
  '이제',
  '뭔가',
];

export function analyzeKoreanTextMetrics(text: string, durationSec: number) {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      wordCount: 0,
      wpm: 0,
      fillerCount: 0,
      detectedFillers: {} as Record<string, number>,
    };
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = tokens.length;
  const effectiveMinutes = Math.max(durationSec / 60, 0.15);
  const wpm = Math.min(260, Math.round(wordCount / effectiveMinutes));

  const detectedFillers: Record<string, number> = {};
  let fillerCount = 0;

  for (const token of tokens) {
    const normalized = token.replace(/[.,?!~"'()]/g, '');
    for (const filler of FILLER_WORDS) {
      if (
        normalized === filler ||
        (filler.length >= 2 && normalized.startsWith(filler) && normalized.length <= filler.length + 1)
      ) {
        detectedFillers[filler] = (detectedFillers[filler] || 0) + 1;
        fillerCount += 1;
        break;
      }
    }
  }

  return {
    wordCount,
    wpm,
    fillerCount,
    detectedFillers,
  };
}

export interface FrameAnalysisResult {
  nextSample: Uint8ClampedArray;
  postureStability: number;
  eyeFocusRatio: number;
  expressionCalmness: number;
}

export function analyzeVideoFrameTelemetry(
  videoEl: HTMLVideoElement,
  prevSample: Uint8ClampedArray | null,
  workCanvas: HTMLCanvasElement,
  prevResult: { postureStability: number; eyeFocusRatio: number; expressionCalmness: number }
): FrameAnalysisResult | null {
  if (videoEl.readyState < 2 || videoEl.videoWidth === 0) return null;

  const w = 64;
  const h = 48;
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(videoEl, 0, 0, w, h);
  const frame = ctx.getImageData(0, 0, w, h).data;

  // Measure center-frame subject balance (rows 10..36, cols 18..46)
  let centerEnergy = 0;
  let centerCount = 0;
  let motionDiffSum = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const luma = 0.299 * frame[idx] + 0.587 * frame[idx + 1] + 0.114 * frame[idx + 2];

      if (x >= 18 && x <= 46 && y >= 8 && y <= 36) {
        centerEnergy += luma;
        centerCount += 1;
      }

      if (prevSample) {
        const prevLuma =
          0.299 * prevSample[idx] + 0.587 * prevSample[idx + 1] + 0.114 * prevSample[idx + 2];
        motionDiffSum += Math.abs(luma - prevLuma);
      }
    }
  }

  const avgMotion = prevSample ? motionDiffSum / (w * h) : 2.5;
  // Ideal interview posture has subtle natural movement (1.5 ~ 6.5 luma delta)
  const rawPosture = Math.max(55, Math.min(98, Math.round(100 - Math.max(0, avgMotion - 3.5) * 4.5)));
  const avgCenterLuma = centerCount > 0 ? centerEnergy / centerCount : 120;
  // Reasonable lighting & centered face region
  const lightingPenalty = avgCenterLuma < 45 || avgCenterLuma > 225 ? 12 : 0;
  const rawEyeFocus = Math.max(60, Math.min(97, Math.round(92 - lightingPenalty - Math.max(0, avgMotion - 4.5) * 2.5)));
  const rawCalmness = Math.max(58, Math.min(98, Math.round(95 - Math.max(0, avgMotion - 3.0) * 3.2)));

  // Exponential smoothing
  const alpha = 0.25;
  return {
    nextSample: new Uint8ClampedArray(frame),
    postureStability: Math.round(prevResult.postureStability * (1 - alpha) + rawPosture * alpha),
    eyeFocusRatio: Math.round(prevResult.eyeFocusRatio * (1 - alpha) + rawEyeFocus * alpha),
    expressionCalmness: Math.round(prevResult.expressionCalmness * (1 - alpha) + rawCalmness * alpha),
  };
}

export function captureSnapshotBase64(videoEl: HTMLVideoElement): string | undefined {
  if (videoEl.readyState < 2 || videoEl.videoWidth === 0) return undefined;
  const canvas = document.createElement('canvas');
  const maxWidth = 480;
  const scale = Math.min(1, maxWidth / videoEl.videoWidth);
  canvas.width = Math.round(videoEl.videoWidth * scale);
  canvas.height = Math.round(videoEl.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
}

export function speakKoreanQuestion(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.98;
  utterance.pitch = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find((v) => v.lang.startsWith('ko'));
  if (koVoice) {
    utterance.voice = koVoice;
  }
  if (onEnd) {
    utterance.onend = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
