import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AdmissionCase,
  InterviewTurn,
  LiveTelemetry,
  PastQuestion,
  StudentProfile,
} from '../src/types/interview.ts';

const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets 패널에서 API 키를 확인해주세요.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('ETIMEDOUT');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Gemini API 키가 유효하지 않거나 권한이 없습니다. Settings > Secrets 패널에서 API 키를 확인해주세요.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    };
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 500, message: raw };
  }
  return {
    status: 500,
    message: `AI 분석 요청 중 오류가 발생했습니다: ${raw}`,
  };
}

export async function generateTrendAndFeedback(profile: StudentProfile) {
  const ai = getAiClient();
  const prompt = `당신은 대한민국 최상위 대학입시 면접 총괄 강사이자 입학사정관 출신 수석 컨설턴트입니다.
현재 시점(2026~2027학년도 대학입시)의 최신 대학입시 면접 동향(무전공·자유전공 확대, 학생부 세특 심층 검증, 제시문 구술면접, AI·디지털 윤리 출제, MMI/교직적성 등)을 Google 검색으로 확인하여 반영하고, 아래 학생 프로필에 맞춘 정밀 분석 및 맞춤형 피드백을 작성하세요.

[학생 프로필]
- 이름: ${profile.name || '수험생'}
- 목표 대학: ${profile.targetUniversity}
- 목표 학과/계열: ${profile.targetMajor} (${profile.majorGroup})
- 지원 전형: ${profile.track}
- 내신 등급: ${profile.gpa}등급
- 학생부 핵심 활동/세특 키워드: ${profile.activityKeywords || '미입력'}
- 현재 면접 고민/약점: ${profile.concern || '꼬리질문 대응과 논리적 구조화'}

다음 4개 섹션 제목을 반드시 그대로 포함하여 한국어로 명확하고 실천적인 코칭 리포트를 작성하세요:
## 1. ${profile.targetUniversity} · ${profile.track} 최신 면접 출제 트렌드
## 2. 학생부 키워드 기반 예상 압박 질문 3가지
## 3. 학생 맞춤형 강점 부각 및 약점 보완 피드백
## 4. 면접 전 필수 체크리스트 (3단계 실행 전략)`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    })
  );

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const groundingSources = chunks
    .map((chunk) => chunk.web)
    .filter((w): w is { uri: string; title: string } => Boolean(w?.uri && w?.title))
    .slice(0, 6);

  return {
    analysisMarkdown: response.text ?? '',
    groundingSources,
  };
}

export async function generateFollowUpQuestion(params: {
  question: PastQuestion;
  profile: StudentProfile;
  turns: InterviewTurn[];
  latestAnswer: string;
  telemetry: LiveTelemetry;
}) {
  const ai = getAiClient();
  const { question, profile, turns, latestAnswer, telemetry } = params;

  const historyText = turns
    .map(
      (t) =>
        `[라운드 ${t.round}]\n면접관 질문: ${t.interviewerQuestion}\n지원자 답변: ${t.studentAnswer}`
    )
    .join('\n\n');

  const prompt = `당신은 ${question.university} ${question.track} 실제 면접장 교수(면접관)입니다.
지원자의 방금 답변 내용을 정밀하게 분석하고, 논리적 비약, 개념 오적용, 근거 부족, 학생부 진위 여부, 또는 반론 가능 지점을 파고드는 날카로운 **인터랙티브 꼬리 질문**을 생성하세요.

[문항 정보]
- 대학/전형: ${question.university} / ${question.track} (${question.format})
- 문항 제목: ${question.title}
- 제시문/상황: ${question.passage}
- 기본 질문: ${question.mainQuestion}
- 출제 의도: ${question.evaluationIntent}

[지원자 프로필]
- 목표 학과: ${profile.targetMajor} (${profile.majorGroup})
- 세특 키워드: ${profile.activityKeywords}

[이전 대화 기록]
${historyText || '없음 (첫 번째 답변)'}

[지원자의 방금 답변]
"${latestAnswer}"

[측정된 발화 지표]
- 발화 속도: ${telemetry.wpm} WPM / 습관어 감지: ${telemetry.fillerCount}회 / 휴지 비율: ${telemetry.pauseRatio}%

반드시 지원자의 답변 속 특정 표현이나 주장을 직접 인용·지목하며 실제 대입 면접관처럼 정중하지만 날카롭게 질문하세요.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interviewerReaction: {
              type: Type.STRING,
              description: '지원자 답변에 대한 면접관의 짧은 반응 (1문장, 예: "방금 말씀하신 ~ 부분은 흥미롭군요.")',
            },
            followUpQuestion: {
              type: Type.STRING,
              description: '답변의 허점이나 심화 지점을 파고드는 구체적 꼬리 질문',
            },
            probeFocus: {
              type: Type.STRING,
              description: '이 꼬리 질문으로 검증하려는 핵심 역량 (15자 이내)',
            },
            hintForStudent: {
              type: Type.STRING,
              description: '지원자가 참고할 수 있는 답변 전략 힌트 (2문장 이내)',
            },
          },
          required: ['interviewerReaction', 'followUpQuestion', 'probeFocus', 'hintForStudent'],
        },
      },
    })
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function evaluateInterviewSession(params: {
  question: PastQuestion;
  profile: StudentProfile;
  turns: InterviewTurn[];
  telemetry: LiveTelemetry;
  snapshotBase64?: string;
}) {
  const ai = getAiClient();
  const { question, profile, turns, telemetry, snapshotBase64 } = params;

  const transcript = turns
    .map(
      (t) =>
        `[라운드 ${t.round}${t.probeFocus ? ` · 검증초점: ${t.probeFocus}` : ''}]\n질문: ${t.interviewerQuestion}\n답변: ${t.studentAnswer}`
    )
    .join('\n\n');

  const textPrompt = `당신은 ${question.university} 입학처 수석 면접 평가위원입니다.
아래 모의면접 전체 대화 기록, 실시간 음성/비언어 측정 데이터, 그리고 첨부된 면접 중 캡처 이미지(있는 경우)를 종합하여 AI 기반 정밀 분석 리포트를 JSON으로 작성하세요.

[문항 및 루브릭]
- 대학/전형: ${question.university} · ${question.track} (${question.format})
- 문항: ${question.title}
- 본 질문: ${question.mainQuestion}
- 평가 기준: ${question.keyCriteria.join(' / ')}

[지원자 정보]
- 목표: ${profile.targetUniversity} ${profile.targetMajor} (${profile.majorGroup})
- 세특 키워드: ${profile.activityKeywords}

[실시간 음성 및 비언어 측정 데이터]
- 총 면접 시간: ${telemetry.durationSec}초
- 평균 말하기 속도: ${telemetry.wpm} 어절/분 (권장 110~140)
- 총 발화 단어 수: ${telemetry.wordCount}어절
- 감지된 습관어/간투사: ${telemetry.fillerCount}회 (${JSON.stringify(telemetry.detectedFillers)})
- 침묵/휴지 비율: ${telemetry.pauseRatio}%
- 평균 성량: ${telemetry.avgVolumeDb} dBFS
- 자세·프레임 안정도: ${telemetry.postureStability}%
- 정면 시선 집중도: ${telemetry.eyeFocusRatio}%
- 표정·움직임 침착도: ${telemetry.expressionCalmness}%

[면접 전체 Q&A 대화록]
${transcript}

주의사항:
1. 각 역량 점수(0~100)는 지원자 답변의 실질적 논리, 구체성, 전공 적합성에 근거해 냉정하고 객관적으로 채점하세요. 답변이 부실하거나 너무 짧으면 감점하세요.
2. sentenceCorrections에는 지원자가 실제로 말한 문장을 인용(original)하고, 합격권 수준의 문장으로 재작성(improved)하며, 왜 그렇게 고쳐야 하는지(reason)를 최소 2개, 최대 3개 제시하세요.
3. 첨부 이미지가 제공된 경우 자세/표정/시선/복장 인상을 nonVerbalAnalysis에 반영하세요.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: textPrompt },
  ];

  if (snapshotBase64 && snapshotBase64.startsWith('data:image/')) {
    const [header, base64Data] = snapshotBase64.split(',');
    const mimeMatch = header.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
    if (base64Data && mimeMatch) {
      parts.push({
        inlineData: {
          mimeType: mimeMatch[1],
          data: base64Data,
        },
      });
    }
  }

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: '종합 점수 0~100' },
            gradeBand: {
              type: Type.STRING,
              description: '최상위권 안정, 합격권, 보완 필요, 집중 훈련 권장 중 하나',
            },
            competencyScores: {
              type: Type.OBJECT,
              properties: {
                majorFit: { type: Type.INTEGER },
                academicDepth: { type: Type.INTEGER },
                logicalStructure: { type: Type.INTEGER },
                growthPotential: { type: Type.INTEGER },
                communication: { type: Type.INTEGER },
              },
              required: [
                'majorFit',
                'academicDepth',
                'logicalStructure',
                'growthPotential',
                'communication',
              ],
            },
            verbalAnalysis: {
              type: Type.OBJECT,
              properties: {
                claritySummary: { type: Type.STRING },
                fillerWordFeedback: { type: Type.STRING },
                pacingFeedback: { type: Type.STRING },
                logicCritique: { type: Type.STRING },
              },
              required: ['claritySummary', 'fillerWordFeedback', 'pacingFeedback', 'logicCritique'],
            },
            nonVerbalAnalysis: {
              type: Type.OBJECT,
              properties: {
                postureFeedback: { type: Type.STRING },
                gazeFeedback: { type: Type.STRING },
                vocalToneFeedback: { type: Type.STRING },
                overallPresence: { type: Type.STRING },
              },
              required: ['postureFeedback', 'gazeFeedback', 'vocalToneFeedback', 'overallPresence'],
            },
            sentenceCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  improved: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['original', 'improved', 'reason'],
              },
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextFollowUpPredictions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'overallScore',
            'gradeBand',
            'competencyScores',
            'verbalAnalysis',
            'nonVerbalAnalysis',
            'sentenceCorrections',
            'strengths',
            'improvements',
            'nextFollowUpPredictions',
          ],
        },
      },
    })
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function generateVariantQuestion(baseQuestion: PastQuestion, targetMajor: string) {
  const ai = getAiClient();
  const prompt = `다음 실제 대학입시 면접 기출 문제를 바탕으로, 2027학년도 최신 입시 트렌드(무전공·AI 융합·심층 검증)와 학생의 목표 학과("${targetMajor || baseQuestion.majorGroup}")에 맞게 재구성한 **실전 변형 기출 문제**를 생성하세요.

[원본 기출 문제]
- 대학/전형: ${baseQuestion.university} ${baseQuestion.track} (${baseQuestion.format})
- 제목: ${baseQuestion.title}
- 제시문: ${baseQuestion.passage}
- 질문: ${baseQuestion.mainQuestion}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            passage: { type: Type.STRING },
            mainQuestion: { type: Type.STRING },
            evaluationIntent: { type: Type.STRING },
            keyCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
            sampleFollowUps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'title',
            'passage',
            'mainQuestion',
            'evaluationIntent',
            'keyCriteria',
            'sampleFollowUps',
          ],
        },
      },
    })
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function predictAdmissionChance(params: {
  profile: StudentProfile;
  interviewScore: number;
  docScoreEstimate: number;
  matchedCases: (AdmissionCase & { similarityScore: number })[];
}) {
  const ai = getAiClient();
  const { profile, interviewScore, docScoreEstimate, matchedCases } = params;

  const casesText = matchedCases
    .map(
      (c) =>
        `- ${c.university} ${c.major} (${c.track}, ${c.year}): 내신 ${c.gpa}등급, 서류 ${c.docScore}점, 면접 ${c.interviewScore}점 -> [${c.result}] | 핵심활동: ${c.keyActivity} | 당락요인: ${c.winningFactor}`
    )
    .join('\n');

  const admittedCases = matchedCases.filter((c) => c.result !== '불합격');
  const avgAdmittedInterview =
    admittedCases.length > 0
      ? Math.round(
          admittedCases.reduce((sum, c) => sum + c.interviewScore, 0) / admittedCases.length
        )
      : 89;

  const prompt = `당신은 대한민국 대학입시 합격 예측 데이터 분석가입니다.
지원자의 내신·서류 역량·모의면접 점수를 실제 입시 데이터베이스의 유사 합격/불합격 사례들과 비교해 개인별 합격 가능성 예측 리포트를 생성하세요.

[지원자 현황]
- 목표 대학/학과: ${profile.targetUniversity} ${profile.targetMajor} (${profile.majorGroup})
- 전형: ${profile.track}
- 고교 내신 등급: ${profile.gpa}등급
- 예상 서류 경쟁력 점수: ${docScoreEstimate}점 / 100점
- 모의면접 역량 점수: ${interviewScore}점 / 100점
- 세특 핵심 키워드: ${profile.activityKeywords || '미입력'}

[유사 합격·불합격 DB 사례 (유사도 순)]
${casesText}

유사 합격자 평균 면접 점수(${avgAdmittedInterview}점) 대비 지원자의 면접 점수(${interviewScore}점) 차이는 ${interviewScore - avgAdmittedInterview}점입니다.
냉정하고 근거 기반의 합격 가능성 확률(0~100), 판정 구간, 면접 역전/방어 영향력 분석, D-Day 4단계 액션 플랜을 JSON으로 반환하세요.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedProbability: { type: Type.INTEGER, description: '예측 합격 확률 5~98' },
            tierLabel: {
              type: Type.STRING,
              description: '안정권, 적정권, 소신권, 상향 도전 중 정확히 하나',
            },
            interviewImpactAnalysis: { type: Type.STRING },
            competitorComparison: { type: Type.STRING },
            dDayActionPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  task: { type: Type.STRING },
                  expectedGain: { type: Type.STRING },
                },
                required: ['phase', 'task', 'expectedGain'],
              },
            },
          },
          required: [
            'predictedProbability',
            'tierLabel',
            'interviewImpactAnalysis',
            'competitorComparison',
            'dDayActionPlan',
          ],
        },
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return {
    ...parsed,
    scoreGapFromAdmittedAvg: interviewScore - avgAdmittedInterview,
    matchedCases,
  };
}
