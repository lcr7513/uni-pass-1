export type InterviewFormat =
  | '제시문 기반'
  | '서류 기반'
  | 'MMI 다중미니'
  | '교직적성';

export type MajorGroup =
  | '인문·사회'
  | '자연·공학'
  | '의약학'
  | '무전공·자유전공'
  | '사범·교육';

export interface PastQuestion {
  id: string;
  university: string;
  track: string;
  majorGroup: MajorGroup;
  year: number;
  format: InterviewFormat;
  prepMinutes: number;
  answerMinutes: number;
  title: string;
  passage: string;
  mainQuestion: string;
  evaluationIntent: string;
  keyCriteria: string[];
  sampleFollowUps: string[];
}

export interface LessonStep {
  phase: string;
  minutes: number;
  instructorScript: string;
  boardKeywords: string[];
  studentActivity: string;
}

export interface LectureModule {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  targetTrack: string;
  summary: string;
  keyPoints: string[];
  rubricChecklist: {
    criterion: string;
    weight: string;
    highScoreSignal: string;
    lowScoreRisk: string;
  }[];
  lessonPlan: {
    learningObjectives: string[];
    teachingSteps: LessonStep[];
    caseStudyExample: {
      question: string;
      weakAnswer: string;
      strongAnswer: string;
      coachingPoint: string;
    };
    classroomTask: string;
  };
  recommendedQuestionId: string;
}

export interface UniversityInterviewSpec {
  university: string;
  track: string;
  ratioAndQuota: string;
  duration: string;
  criteria: string;
  highlight: string;
}

export interface InterviewTypeSamplePrompt {
  context: string;
  question: string;
}

export interface InterviewTypeGuide {
  id: string;
  shortLabel: string;
  typeName: string;
  timeSpec: string;
  representativeUnis: string;
  corePurpose: string;
  prepStrategy: string;
  evaluationWeightFocus: string;
  coreCheckpoints: string[];
  universitySpecs: UniversityInterviewSpec[];
  samplePrompts: InterviewTypeSamplePrompt[];
  passerAdvice: string[];
  pitfalls: string[];
  teachingNote: string;
  practiceQuestionId: string;
}

export interface InterviewProcessStep {
  step: string;
  title: string;
  detail: string;
  caution: string;
}

export interface PrepTimelinePhase {
  period: string;
  focus: string;
  checklist: string[];
}

export interface InterviewFundamentals {
  typeGuides: InterviewTypeGuide[];
  processSteps: InterviewProcessStep[];
  prepTimeline: PrepTimelinePhase[];
}

export interface TrendBrief {
  id: string;
  title: string;
  category: string;
  yearTag: string;
  impactLevel: '핵심 변화' | '평가 강화' | '신규 도입';
  summary: string;
  actionTip: string;
}

export interface AdmissionCase {
  id: string;
  university: string;
  major: string;
  track: string;
  majorGroup: MajorGroup;
  year: number;
  gpa: number;
  docScore: number;
  interviewScore: number;
  result: '합격' | '충원합격' | '불합격';
  keyActivity: string;
  winningFactor: string;
}

export interface StudentProfile {
  name: string;
  targetUniversity: string;
  targetMajor: string;
  majorGroup: MajorGroup;
  track: string;
  gpa: number;
  activityKeywords: string;
  concern: string;
}

export interface LiveTelemetry {
  durationSec: number;
  wpm: number;
  wordCount: number;
  fillerCount: number;
  detectedFillers: Record<string, number>;
  pauseRatio: number;
  avgVolumeDb: number;
  postureStability: number;
  eyeFocusRatio: number;
  expressionCalmness: number;
}

export interface InterviewTurn {
  round: number;
  interviewerQuestion: string;
  probeFocus?: string;
  studentAnswer: string;
  wpmAtTurn?: number;
  fillerCountAtTurn?: number;
}

export interface CompetencyScores {
  majorFit: number;
  academicDepth: number;
  logicalStructure: number;
  growthPotential: number;
  communication: number;
}

export interface EvaluationReport {
  id: string;
  createdAt: string;
  questionId: string;
  questionTitle: string;
  university: string;
  track: string;
  overallScore: number;
  gradeBand: string;
  competencyScores: CompetencyScores;
  verbalAnalysis: {
    claritySummary: string;
    fillerWordFeedback: string;
    pacingFeedback: string;
    logicCritique: string;
  };
  nonVerbalAnalysis: {
    postureFeedback: string;
    gazeFeedback: string;
    vocalToneFeedback: string;
    overallPresence: string;
  };
  sentenceCorrections: {
    original: string;
    improved: string;
    reason: string;
  }[];
  strengths: string[];
  improvements: string[];
  nextFollowUpPredictions: string[];
  telemetrySnapshot: LiveTelemetry;
}

export interface AcceptancePrediction {
  predictedProbability: number;
  tierLabel: '안정권' | '적정권' | '소신권' | '상향 도전';
  interviewImpactAnalysis: string;
  competitorComparison: string;
  scoreGapFromAdmittedAvg: number;
  dDayActionPlan: {
    phase: string;
    task: string;
    expectedGain: string;
  }[];
  matchedCases: (AdmissionCase & { similarityScore: number })[];
}
