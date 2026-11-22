import {
  Camera,
  Download,
  Loader2,
  MessageSquarePlus,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EvaluationReport,
  InterviewTurn,
  LiveTelemetry,
  PastQuestion,
  StudentProfile,
} from '../types/interview';
import {
  analyzeKoreanTextMetrics,
  analyzeVideoFrameTelemetry,
  captureSnapshotBase64,
  speakKoreanQuestion,
  stopSpeaking,
} from '../utils/mediaAnalysis';
import { RadarChart } from './RadarChart';

interface MockStudioViewProps {
  questions: PastQuestion[];
  activeQuestion: PastQuestion;
  onSelectQuestion: (q: PastQuestion) => void;
  profile: StudentProfile;
  onReportGenerated: (report: EvaluationReport) => void;
}

const INITIAL_TELEMETRY: LiveTelemetry = {
  durationSec: 0,
  wpm: 0,
  wordCount: 0,
  fillerCount: 0,
  detectedFillers: {},
  pauseRatio: 18,
  avgVolumeDb: -32,
  postureStability: 92,
  eyeFocusRatio: 90,
  expressionCalmness: 91,
};

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function MockStudioView({
  questions,
  activeQuestion,
  onSelectQuestion,
  profile,
  onReportGenerated,
}: MockStudioViewProps) {
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestionText, setCurrentQuestionText] = useState(activeQuestion.mainQuestion);
  const [currentProbeFocus, setCurrentProbeFocus] = useState<string | undefined>(undefined);
  const [interviewerReaction, setInterviewerReaction] = useState<string | null>(null);
  const [studentHint, setStudentHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showIntent, setShowIntent] = useState(false);

  const [answerDraft, setAnswerDraft] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Prep timer state
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(activeQuestion.prepMinutes * 60);
  const [prepRunning, setPrepRunning] = useState(false);

  // Media & Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<LiveTelemetry>(INITIAL_TELEMETRY);

  // AI Loading & Report state
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevFrameSampleRef = useRef<Uint8ClampedArray | null>(null);
  const capturedSnapshotRef = useRef<string | undefined>(undefined);
  const silentTicksRef = useRef(0);
  const totalAudioTicksRef = useRef(0);
  const dbAccumRef = useRef<number[]>([]);
  const isRecordingRef = useRef(false);

  // Reset studio when active question changes
  useEffect(() => {
    setTurns([]);
    setCurrentRound(1);
    setCurrentQuestionText(activeQuestion.mainQuestion);
    setCurrentProbeFocus(undefined);
    setInterviewerReaction(null);
    setStudentHint(null);
    setShowHint(false);
    setAnswerDraft('');
    setInterimTranscript('');
    setPrepSecondsLeft(activeQuestion.prepMinutes * 60);
    setPrepRunning(false);
    setReport(null);
    setAiError(null);
    setTelemetry(INITIAL_TELEMETRY);
    capturedSnapshotRef.current = undefined;
  }, [activeQuestion]);

  // Prep Countdown Timer
  useEffect(() => {
    if (!prepRunning) return;
    const timer = window.setInterval(() => {
      setPrepSecondsLeft((prev) => {
        if (prev <= 1) {
          setPrepRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [prepRunning]);

  // Live Elapsed Timer + Text Metrics + Video Telemetry during Recording
  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      setTelemetry((prev) => {
        const nextSec = prev.durationSec + 1;
        const allStudentText = [
          ...turns.map((t) => t.studentAnswer),
          `${answerDraft} ${interimTranscript}`.trim(),
        ]
          .filter(Boolean)
          .join(' ');
        const textStats = analyzeKoreanTextMetrics(allStudentText, nextSec);

        let posture = prev.postureStability;
        let eye = prev.eyeFocusRatio;
        let calm = prev.expressionCalmness;

        if (videoRef.current && cameraActive) {
          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
          }
          const frameMetrics = analyzeVideoFrameTelemetry(
            videoRef.current,
            prevFrameSampleRef.current,
            offscreenCanvasRef.current,
            {
              postureStability: prev.postureStability,
              eyeFocusRatio: prev.eyeFocusRatio,
              expressionCalmness: prev.expressionCalmness,
            }
          );
          if (frameMetrics) {
            prevFrameSampleRef.current = frameMetrics.nextSample;
            posture = frameMetrics.postureStability;
            eye = frameMetrics.eyeFocusRatio;
            calm = frameMetrics.expressionCalmness;
          }
          if (!capturedSnapshotRef.current || nextSec === 4) {
            capturedSnapshotRef.current = captureSnapshotBase64(videoRef.current);
          }
        }

        const pauseRatio =
          totalAudioTicksRef.current > 0
            ? Math.round((silentTicksRef.current / totalAudioTicksRef.current) * 100)
            : prev.pauseRatio;

        const avgDb =
          dbAccumRef.current.length > 0
            ? Math.round(
                dbAccumRef.current.reduce((a, b) => a + b, 0) / dbAccumRef.current.length
              )
            : prev.avgVolumeDb;

        return {
          durationSec: nextSec,
          wpm: textStats.wpm,
          wordCount: textStats.wordCount,
          fillerCount: textStats.fillerCount,
          detectedFillers: textStats.detectedFillers,
          pauseRatio,
          avgVolumeDb: avgDb,
          postureStability: posture,
          eyeFocusRatio: eye,
          expressionCalmness: calm,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording, turns, answerDraft, interimTranscript, cameraActive]);

  // Update text metrics immediately even when typing without mic recording
  useEffect(() => {
    if (isRecording) return;
    const allText = [
      ...turns.map((t) => t.studentAnswer),
      answerDraft.trim(),
    ]
      .filter(Boolean)
      .join(' ');
    const stats = analyzeKoreanTextMetrics(allText, Math.max(telemetry.durationSec, 20));
    setTelemetry((prev) => ({
      ...prev,
      wordCount: stats.wordCount,
      wpm: stats.wordCount > 0 ? stats.wpm : prev.wpm,
      fillerCount: stats.fillerCount,
      detectedFillers: stats.detectedFillers,
    }));
  }, [answerDraft, turns, isRecording, telemetry.durationSec]);

  const stopMediaResources = useCallback(() => {
    isRecordingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore already stopped
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopMediaResources();
      stopSpeaking();
    };
  }, [stopMediaResources]);

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = waveformCanvasRef.current;
    if (!analyser || !canvas || !isRecordingRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!isRecordingRef.current) return;
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      const db = Math.max(-60, Math.min(0, Math.round(20 * Math.log10(rms + 0.001))));

      totalAudioTicksRef.current += 1;
      if (rms < 0.018) {
        silentTicksRef.current += 1;
      }
      if (totalAudioTicksRef.current % 10 === 0) {
        dbAccumRef.current = [...dbAccumRef.current.slice(-40), db];
      }

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1D4ED8';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, []);

  const handleStartRecording = async () => {
    setMediaError(null);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    recordedChunksRef.current = [];
    silentTicksRef.current = 0;
    totalAudioTicksRef.current = 0;
    dbAccumRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError(
        '현재 브라우저에서 카메라/마이크 장치를 지원하지 않아 텍스트 기반 모의면접 모드로 진행합니다.'
      );
      setIsRecording(true);
      isRecordingRef.current = true;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Audio Analyser
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        }
      };

      recorder.start(1000);

      // Web Speech API Korean STT
      const SpeechRecConstructor =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

      if (SpeechRecConstructor) {
        const recognition = new SpeechRecConstructor();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let finalChunk = '';
          let interimChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const txt = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalChunk += `${txt.trim()} `;
            } else {
              interimChunk += txt;
            }
          }
          if (finalChunk) {
            setAnswerDraft((prev) => `${prev} ${finalChunk}`.trimStart());
          }
          setInterimTranscript(interimChunk);
        };

        recognition.onerror = () => {
          // Non-fatal fallback: user can continue with manual/audio recording
        };

        recognition.onend = () => {
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Ignore restart collision
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
      isRecordingRef.current = true;
      drawWaveform();
    } catch {
      setMediaError(
        '카메라/마이크 접근 권한이 없거나 장치를 찾을 수 없어 텍스트·타이머 모의면접 모드로 전환되었습니다.'
      );
      setIsRecording(true);
      isRecordingRef.current = true;
    }
  };

  const handleStopRecording = () => {
    if (videoRef.current && cameraActive) {
      capturedSnapshotRef.current = captureSnapshotBase64(videoRef.current);
    }
    stopMediaResources();
  };

  const handleSubmitForFollowUp = async () => {
    const combinedAnswer = `${answerDraft} ${interimTranscript}`.trim();
    if (!combinedAnswer) {
      setAiError('답변 내용을 말씀하시거나 입력창에 작성한 뒤 제출해주세요.');
      return;
    }

    setAiError(null);
    setLoadingFollowUp(true);
    setInterimTranscript('');

    const completedTurn: InterviewTurn = {
      round: currentRound,
      interviewerQuestion: currentQuestionText,
      probeFocus: currentProbeFocus,
      studentAnswer: combinedAnswer,
      wpmAtTurn: telemetry.wpm,
      fillerCountAtTurn: telemetry.fillerCount,
    };
    const nextTurns = [...turns, completedTurn];

    try {
      const res = await fetch('/api/ai/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQuestion,
          profile,
          turns: nextTurns,
          latestAnswer: combinedAnswer,
          telemetry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '꼬리 질문 생성에 실패했습니다.');
      }

      setTurns(nextTurns);
      setCurrentRound((r) => r + 1);
      setInterviewerReaction(data.interviewerReaction);
      setCurrentQuestionText(data.followUpQuestion);
      setCurrentProbeFocus(data.probeFocus);
      setStudentHint(data.hintForStudent);
      setShowHint(false);
      setAnswerDraft('');

      if (ttsEnabled) {
        speakKoreanQuestion(`${data.interviewerReaction} ${data.followUpQuestion}`);
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : '꼬리 질문 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setLoadingFollowUp(false);
    }
  };

  const handleFinishAndEvaluate = async () => {
    const combinedCurrent = `${answerDraft} ${interimTranscript}`.trim();
    const finalTurns = [...turns];
    if (combinedCurrent) {
      finalTurns.push({
        round: currentRound,
        interviewerQuestion: currentQuestionText,
        probeFocus: currentProbeFocus,
        studentAnswer: combinedCurrent,
        wpmAtTurn: telemetry.wpm,
        fillerCountAtTurn: telemetry.fillerCount,
      });
    }

    if (finalTurns.length === 0) {
      setAiError('평가를 진행하려면 최소 1개 이상의 답변을 작성하거나 녹화해주세요.');
      return;
    }

    if (isRecording) {
      handleStopRecording();
    }
    stopSpeaking();

    setAiError(null);
    setLoadingReport(true);

    try {
      const allText = finalTurns.map((t) => t.studentAnswer).join(' ');
      const finalDuration = Math.max(telemetry.durationSec, 35);
      const finalStats = analyzeKoreanTextMetrics(allText, finalDuration);
      const finalTelemetry: LiveTelemetry = {
        ...telemetry,
        durationSec: finalDuration,
        wpm: finalStats.wpm,
        wordCount: finalStats.wordCount,
        fillerCount: finalStats.fillerCount,
        detectedFillers: finalStats.detectedFillers,
      };

      const res = await fetch('/api/ai/evaluate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQuestion,
          profile,
          turns: finalTurns,
          telemetry: finalTelemetry,
          snapshotBase64: capturedSnapshotRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI 정밀 평가 리포트 생성에 실패했습니다.');
      }

      const fullReport: EvaluationReport = {
        id: `rep-${Date.now()}`,
        createdAt: new Date().toISOString(),
        questionId: activeQuestion.id,
        questionTitle: activeQuestion.title,
        university: activeQuestion.university,
        track: activeQuestion.track,
        ...data,
        telemetrySnapshot: finalTelemetry,
      };

      setTurns(finalTurns);
      setAnswerDraft('');
      setReport(fullReport);
      onReportGenerated(fullReport);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : '리포트 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setLoadingReport(false);
    }
  };

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getWpmStatus = (wpm: number) => {
    if (wpm === 0) return { label: '측정 대기', color: 'text-slate-500' };
    if (wpm < 95) return { label: '느림 (보완)', color: 'text-amber-700' };
    if (wpm <= 145) return { label: '적정 속도', color: 'text-emerald-700' };
    return { label: '빠름 (조절 필요)', color: 'text-rose-700' };
  };

  const wpmStatus = getWpmStatus(telemetry.wpm);

  return (
    <div className="space-y-8">
      {/* Studio Top Bar: Question Selector + Prep Timer + TTS Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-xs text-slate-500">실전 모의면접 시뮬레이션 문항 선택</div>
          <select
            value={activeQuestion.id}
            onChange={(e) => {
              const found = questions.find((q) => q.id === e.target.value);
              if (found) onSelectQuestion(found);
            }}
            className="w-full max-w-2xl px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                [{q.university} · {q.format}] {q.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeQuestion.prepMinutes > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-600">숙독 타이머</span>
              <span className="font-mono-tabular text-sm font-bold text-slate-900">
                {formatClock(prepSecondsLeft)}
              </span>
              <button
                type="button"
                onClick={() => setPrepRunning((p) => !p)}
                className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                aria-label={prepRunning ? '타이머 일시정지' : '타이머 시작'}
              >
                {prepRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrepRunning(false);
                  setPrepSecondsLeft(activeQuestion.prepMinutes * 60);
                }}
                className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                aria-label="타이머 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const next = !ttsEnabled;
              setTtsEnabled(next);
              if (!next) stopSpeaking();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              ttsEnabled
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            면접관 음성 {ttsEnabled ? '켜짐' : '꺼짐'}
          </button>
        </div>
      </div>

      {/* Main Two-Zone Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone (7 cols): Passage + Live Camera/Recording + Waveform + Answer Input */}
        <div className="lg:col-span-7 space-y-5">
          {/* Passage & Prompt Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                {activeQuestion.university} · {activeQuestion.track} · {activeQuestion.format}
              </div>
              <button
                type="button"
                onClick={() => setShowIntent((s) => !s)}
                className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
              >
                {showIntent ? '출제 의도 숨기기' : '출제 의도 확인'}
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5 leading-relaxed whitespace-pre-line">
              {activeQuestion.passage}
            </div>

            {showIntent && (
              <div className="text-xs text-slate-600 bg-blue-50/50 border border-blue-100 rounded-lg p-3 leading-relaxed">
                <strong className="text-blue-900">출제 의도: </strong>
                {activeQuestion.evaluationIntent}
              </div>
            )}
          </div>

          {/* Camera & Recording Viewport */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-900">
                  모의면접 카메라 · 녹화 스튜디오
                </span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    REC {formatClock(telemetry.durationSec)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    녹화 및 실시간 분석 시작
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    녹화 중지
                  </button>
                )}
              </div>
            </div>

            <div className="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
              {recordedVideoUrl && !isRecording ? (
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    cameraActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              {!cameraActive && !recordedVideoUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 space-y-2">
                  <Mic className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-200">
                    {isRecording
                      ? '텍스트·타이머 모의면접 진행 중 (카메라 미연결)'
                      : '상단의 "녹화 및 실시간 분석 시작"을 눌러 카메라와 마이크를 연결하세요.'}
                  </p>
                  <p className="text-xs text-slate-400">
                    카메라 없이도 아래 답변 입력란을 통해 실시간 꼬리질문과 AI 평가를 받을 수 있습니다.
                  </p>
                </div>
              )}

              {/* Subtle Face/Posture Framing Guide while Camera Active */}
              {cameraActive && isRecording && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-48 h-56 border border-dashed border-white/35 rounded-full" />
                </div>
              )}
            </div>

            {mediaError && (
              <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
                {mediaError}
              </div>
            )}

            {/* Real-time Audio Waveform + Playback Download Bar */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                  실시간 음성 파형
                </span>
                <canvas
                  ref={waveformCanvasRef}
                  width={360}
                  height={36}
                  className="w-full max-w-sm h-9 rounded border border-slate-200 bg-slate-50"
                />
              </div>
              {recordedVideoUrl && (
                <a
                  href={recordedVideoUrl}
                  download={`mock-interview-${activeQuestion.id}.webm`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  녹화 영상 다운로드
                </a>
              )}
            </div>
          </div>

          {/* Live Transcript & Editable Answer Input */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="answer-textarea" className="text-sm font-semibold text-slate-900">
                라운드 {currentRound} 답변 녹취록 (음성 자동 인식 + 직접 수정 가능)
              </label>
              <span className="font-mono-tabular text-xs text-slate-500">
                {`${answerDraft} ${interimTranscript}`.trim().split(/\s+/).filter(Boolean).length}어절
              </span>
            </div>

            <textarea
              id="answer-textarea"
              rows={5}
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="마이크로 답변하면 한국어 음성이 실시간으로 기록됩니다. 마이크를 사용할 수 없는 환경에서는 이곳에 답변을 직접 입력해도 꼬리질문과 정밀 리포트를 생성할 수 있습니다."
              className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            {interimTranscript && (
              <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded">
                인식 중: {interimTranscript}
              </div>
            )}

            {aiError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {aiError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleSubmitForFollowUp}
                disabled={loadingFollowUp || loadingReport}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {loadingFollowUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    답변 분석 및 꼬리질문 생성 중...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-4 h-4" />
                    답변 제출 및 AI 꼬리질문 받기
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFinishAndEvaluate}
                disabled={loadingFollowUp || loadingReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer"
              >
                {loadingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI 정밀 리포트 생성 중...
                  </>
                ) : (
                  '면접 종료 및 정밀 리포트 생성'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Zone (5 cols): Real-time Telemetry + Interactive Interviewer Feed */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Telemetry Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                실시간 음성 · 비언어적 요소 분석
              </h2>
              <span className="text-xs text-slate-500">
                {isRecording ? '실시간 측정 중' : '대기'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">말하기 속도 (WPM)</div>
                <div className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                  {telemetry.wpm} <span className="text-xs font-normal text-slate-500">어절/분</span>
                </div>
                <div className={`text-xs font-medium mt-0.5 ${wpmStatus.color}`}>
                  {wpmStatus.label}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">습관어 감지</div>
                <div className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                  {telemetry.fillerCount} <span className="text-xs font-normal text-slate-500">회</span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 truncate">
                  {Object.keys(telemetry.detectedFillers).length > 0
                    ? Object.entries(telemetry.detectedFillers)
                        .map(([k, v]) => `"${k}"(${v})`)
                        .join(', ')
                    : '감지된 습관어 없음'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">자세 안정도</div>
                <div className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                  {telemetry.postureStability}%
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  {telemetry.postureStability >= 82 ? '상체 수평 안정' : '움직임 주의'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">정면 시선 집중도</div>
                <div className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                  {telemetry.eyeFocusRatio}%
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  성량 {telemetry.avgVolumeDb} dBFS · 휴지 {telemetry.pauseRatio}%
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Interviewer Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs text-slate-500">인터랙티브 면접관 모드</div>
                <h2 className="text-base font-semibold text-slate-900">
                  라운드 {currentRound} 면접관 질문
                </h2>
              </div>
              <button
                type="button"
                onClick={() => speakKoreanQuestion(currentQuestionText)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                질문 듣기
              </button>
            </div>

            {interviewerReaction && (
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="font-semibold text-slate-800">면접관 반응: </span>
                {interviewerReaction}
              </div>
            )}

            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 space-y-2">
              {currentProbeFocus && (
                <div className="text-xs font-semibold text-blue-800">
                  검증 초점: {currentProbeFocus}
                </div>
              )}
              <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                {currentQuestionText}
              </p>
            </div>

            {studentHint && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  {showHint ? '답변 전략 힌트 닫기' : '꼬리질문 대응 힌트 보기'}
                </button>
                {showHint && (
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
                    {studentHint}
                  </p>
                )}
              </div>
            )}

            {/* Completed Q&A History */}
            {turns.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="text-xs font-semibold text-slate-600">
                  이전 라운드 진행 기록 ({turns.length}건)
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {turns.map((t) => (
                    <div
                      key={t.round}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs"
                    >
                      <div className="font-semibold text-slate-900">
                        Q{t.round}. {t.interviewerQuestion}
                      </div>
                      <div className="text-slate-600 leading-relaxed">
                        A. {t.studentAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generated AI Precision Evaluation Report */}
      {report && (
        <section
          aria-label="AI 모의면접 정밀 분석 리포트"
          className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="text-xs text-slate-500">
                {report.university} · {report.track} · {report.questionTitle}
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                AI 기반 모의면접 정밀 분석 리포트
              </h2>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-500">종합 평가 점수</div>
                <div className="font-mono-tabular text-3xl font-bold text-blue-700">
                  {report.overallScore}점
                </div>
              </div>
              <div className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 rounded-lg">
                {report.gradeBand}
              </div>
            </div>
          </div>

          {/* Radar Chart + Verbal & Non-Verbal Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 text-center">
                5대 면접 평가 역량 분포
              </h3>
              <RadarChart scores={report.competencyScores} />
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">
                  언어적 답변 및 논리 분석
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">전달 명료성</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.verbalAnalysis.claritySummary}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">논리 구조 및 근거</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.verbalAnalysis.logicCritique}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">발화 템포 분석</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.verbalAnalysis.pacingFeedback}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">습관어 · 어휘 진단</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.verbalAnalysis.fillerWordFeedback}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">
                  비언어적 요소 · 태도 정밀 진단
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">자세 및 안정감</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.nonVerbalAnalysis.postureFeedback}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">시선 처리 및 집중도</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.nonVerbalAnalysis.gazeFeedback}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">음성 톤 · 성량</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.nonVerbalAnalysis.vocalToneFeedback}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-800">종합 면접관 인상</div>
                    <p className="text-slate-600 leading-relaxed">
                      {report.nonVerbalAnalysis.overallPresence}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sentence Corrections */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              답변 문장별 1:1 합격권 첨삭
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold w-1/3">기존 발화 문장</th>
                    <th className="py-3 px-4 font-semibold w-1/3">합격권 개선 답변</th>
                    <th className="py-3 px-4 font-semibold w-1/3">첨삭 근거</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.sentenceCorrections.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 text-slate-600 align-top">
                        &ldquo;{item.original}&rdquo;
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium align-top">
                        &ldquo;{item.improved}&rdquo;
                      </td>
                      <td className="py-3 px-4 text-slate-600 align-top">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strengths, Improvements, Next Follow-ups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-slate-100">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-emerald-800">핵심 강점</h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                {report.strengths.map((s, i) => (
                  <li key={i}>· {s}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-800">우선 보완 과제</h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                {report.improvements.map((s, i) => (
                  <li key={i}>· {s}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-800">다음 연습 예상 꼬리질문</h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                {report.nextFollowUpPredictions.map((q, i) => (
                  <li key={i}>
                    {i + 1}. {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
