import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  PlayCircle,
  Presentation,
  Printer,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  InterviewFundamentals,
  LectureModule,
  StudentProfile,
  TrendBrief,
} from '../types/interview';

interface TrendsLecturesViewProps {
  lectures: LectureModule[];
  trends: TrendBrief[];
  fundamentals: InterviewFundamentals | null;
  profile: StudentProfile;
  onUpdateProfile: (next: StudentProfile) => void;
  onStartQuestionPractice: (questionId: string) => void;
}

interface GroundingSource {
  uri: string;
  title: string;
}

type FundamentalsTab = 'types' | 'process' | 'timeline';
type CurriculumViewMode = 'student' | 'lessonPlan';

function renderFormattedAnalysis(markdown: string) {
  const lines = markdown.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />;
    if (trimmed.startsWith('## ')) {
      return (
        <h3
          key={idx}
          className="text-base font-semibold text-slate-900 pt-4 pb-1 border-b border-slate-100"
        >
          {trimmed.replace(/^##\s+/, '')}
        </h3>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-sm font-semibold text-blue-800 pt-3">
          {trimmed.replace(/^###\s+/, '')}
        </h4>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      return (
        <div key={idx} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed pl-1">
          <span className="text-blue-700 font-semibold mt-0.5">·</span>
          <span>{content}</span>
        </div>
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const clean = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      return (
        <p key={idx} className="text-sm font-medium text-slate-800 leading-relaxed pt-1">
          {clean}
        </p>
      );
    }
    return (
      <p key={idx} className="text-sm text-slate-700 leading-relaxed">
        {trimmed.replace(/\*\*(.*?)\*\*/g, '$1')}
      </p>
    );
  });
}

export function TrendsLecturesView({
  lectures,
  trends,
  fundamentals,
  profile,
  onUpdateProfile,
  onStartQuestionPractice,
}: TrendsLecturesViewProps) {
  const [fundamentalsTab, setFundamentalsTab] = useState<FundamentalsTab>('types');
  const [curriculumMode, setCurriculumMode] = useState<CurriculumViewMode>('lessonPlan');
  const [selectedLectureId, setSelectedLectureId] = useState<string>(
    lectures[0]?.id || 'lec-01'
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    fundamentals?.typeGuides[0]?.id || 'type-doc'
  );

  // Presentation Slide Deck Modal State
  const [slideDeckOpen, setSlideDeckOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Personalized Trend & Feedback AI State
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [analysisMarkdown, setAnalysisMarkdown] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);

  const selectedLecture =
    lectures.find((l) => l.id === selectedLectureId) || lectures[0];

  const selectedTypeGuide =
    fundamentals?.typeGuides.find((g) => g.id === selectedTypeId) ||
    fundamentals?.typeGuides[0];

  const handleJumpToTypeDetail = (typeId: string) => {
    setSelectedTypeId(typeId);
    const el = document.getElementById('interview-type-deepdive');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!slideDeckOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlideDeckOpen(false);
      if (e.key === 'ArrowRight') setSlideIndex((i) => Math.min(4, i + 1));
      if (e.key === 'ArrowLeft') setSlideIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slideDeckOpen]);

  const handleGenerateFeedback = async () => {
    setLoadingFeedback(true);
    setFeedbackError(null);
    try {
      const res = await fetch('/api/ai/trend-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '맞춤형 트렌드 분석에 실패했습니다.');
      }
      setAnalysisMarkdown(data.analysisMarkdown);
      setGroundingSources(data.groundingSources || []);
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.'
      );
    } finally {
      setLoadingFeedback(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Section 1: 대입 면접 기본 원리 & 유형별 대비 전략 가이드 */}
      {fundamentals && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="text-xs text-slate-500">대학입시 면접 기초 마스터 가이드</div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
                대입 면접의 기본 방법 및 유형별 대비 방안
              </h1>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setFundamentalsTab('types')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  fundamentalsTab === 'types'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                5대 면접 유형별 대비
              </button>
              <button
                type="button"
                onClick={() => setFundamentalsTab('process')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  fundamentalsTab === 'process'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                실전 5단계 진행법
              </button>
              <button
                type="button"
                onClick={() => setFundamentalsTab('timeline')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  fundamentalsTab === 'timeline'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                D-30 시기별 로드맵
              </button>
            </div>
          </div>

          {fundamentalsTab === 'types' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fundamentals.typeGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {guide.typeName}
                      </h2>
                    </div>
                    <div className="font-mono-tabular text-xs font-medium text-blue-700">
                      {guide.timeSpec}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      주요 대학: {guide.representativeUnis}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{guide.corePurpose}</p>
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-800 leading-relaxed">
                      <span className="font-semibold text-blue-800">핵심 대비: </span>
                      {guide.prepStrategy}
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => handleJumpToTypeDetail(guide.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                    >
                      대학별 배점표·기출 상세 보기
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fundamentalsTab === 'process' && (
            <div className="space-y-3">
              {fundamentals.processSteps.map((st) => (
                <div
                  key={st.step}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
                >
                  <div className="lg:col-span-3 space-y-0.5">
                    <div className="font-mono-tabular text-xs font-bold text-blue-700">
                      {st.step}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{st.title}</div>
                  </div>
                  <div className="lg:col-span-5 text-sm text-slate-700 leading-relaxed">
                    {st.detail}
                  </div>
                  <div className="lg:col-span-4 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                    <span className="font-semibold">감점 주의: </span>
                    {st.caution}
                  </div>
                </div>
              ))}
            </div>
          )}

          {fundamentalsTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {fundamentals.prepTimeline.map((phase) => (
                <div
                  key={phase.period}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="font-mono-tabular text-xs font-semibold text-blue-700">
                    {phase.period}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {phase.focus}
                  </h2>
                  <ul className="space-y-2 pt-2 border-t border-slate-200 text-xs sm:text-sm text-slate-700">
                    {phase.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-blue-700 font-semibold">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 2: Interactive Lecture Curriculum & Classroom Lesson Plan */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <div className="text-xs text-slate-500">대입 면접 특강 · 수업 지도안(교안)</div>
            <h2 className="text-lg font-bold text-slate-900">
              실전 강의 커리큘럼 및 교실 수업용 강의안
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCurriculumMode('lessonPlan')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  curriculumMode === 'lessonPlan'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                강의안(수업 지도안) 모드
              </button>
              <button
                type="button"
                onClick={() => setCurriculumMode('student')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  curriculumMode === 'student'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                핵심 요약 · 루브릭 보기
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSlideIndex(0);
                setSlideDeckOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5" />
              강의 슬라이드 발표
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              강의안 인쇄
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Curriculum Index Sidebar */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-5 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <img
                src="/src/assets/images/mentor_coach_portrait_1795314879841.jpg"
                alt="수석 입시 면접 강사 프로필"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  김서연 입시총괄 멘토
                </div>
                <div className="text-xs text-slate-500 truncate">
                  대입 면접 커리큘럼 · 총 4강
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {lectures.map((lec) => {
                const active = lec.id === selectedLecture?.id;
                return (
                  <button
                    key={lec.id}
                    type="button"
                    onClick={() => setSelectedLectureId(lec.id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-white border-blue-600 text-slate-900'
                        : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-blue-700">
                        {lec.number}강
                      </span>
                      <span>{lec.durationLabel}</span>
                    </div>
                    <div className="text-sm font-semibold mt-1 leading-snug">
                      {lec.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{lec.targetTrack}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Lecture Content */}
          {selectedLecture && (
            <div className="lg:col-span-8 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{selectedLecture.number}강 강의안</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedLecture.targetTrack}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedLecture.durationLabel}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">
                    {selectedLecture.title}
                  </h3>
                  <p className="text-sm text-slate-600">{selectedLecture.subtitle}</p>
                </div>
                <div className="md:col-span-5">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src="/src/assets/images/lecture_campus_library_1795314880009.jpg"
                      alt="대학 강의실 및 아카데믹 스터디 공간"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {curriculumMode === 'lessonPlan' && selectedLecture.lessonPlan ? (
                <div className="space-y-6">
                  {/* Learning Objectives */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <BookOpenCheck className="w-4 h-4 text-blue-700" />
                      <span>수업 학습 목표</span>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {selectedLecture.lessonPlan.learningObjectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-mono-tabular text-xs font-semibold text-blue-700 mt-0.5">
                            0{idx + 1}.
                          </span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Step-by-step Teaching Guide Table */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900">
                      차시별 교수학습 전개 계획 (강사 발문 · 판서 키워드 · 학생 활동)
                    </h4>
                    <div className="space-y-3">
                      {selectedLecture.lessonPlan.teachingSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-white"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {step.phase}
                            </span>
                            <span className="font-mono-tabular text-xs font-semibold text-blue-700">
                              배정 {step.minutes}분
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            <span className="font-semibold text-slate-900">강사 발문: </span>
                            {step.instructorScript}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                            <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700">
                              <span className="font-semibold text-slate-900">판서 키워드: </span>
                              {step.boardKeywords.join(' · ')}
                            </div>
                            <div className="p-2.5 bg-blue-50/50 rounded-lg text-slate-700">
                              <span className="font-semibold text-blue-900">학생 활동: </span>
                              {step.studentActivity}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weak vs Strong Case Comparison for Classroom Analysis */}
                  <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/70">
                    <div>
                      <div className="text-xs font-semibold text-blue-700">
                        강의실 비교 분석 실습 자료
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        질문: {selectedLecture.lessonPlan.caseStudyExample.question}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                      <div className="p-4 bg-white border border-rose-200 rounded-lg space-y-1.5">
                        <div className="text-xs font-semibold text-rose-700">
                          감점 사례 (나쁜 답변)
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          &ldquo;{selectedLecture.lessonPlan.caseStudyExample.weakAnswer}&rdquo;
                        </p>
                      </div>
                      <div className="p-4 bg-white border border-emerald-200 rounded-lg space-y-1.5">
                        <div className="text-xs font-semibold text-emerald-700">
                          합격 사례 (구조화 모범 답변)
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">
                          &ldquo;{selectedLecture.lessonPlan.caseStudyExample.strongAnswer}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-1">
                      <span className="font-semibold text-slate-900">강사 코칭 포인트: </span>
                      {selectedLecture.lessonPlan.caseStudyExample.coachingPoint}
                    </div>
                  </div>

                  {/* Classroom Practice Task */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <span className="font-semibold text-blue-900">수업 연계 실습 과제: </span>
                    {selectedLecture.lessonPlan.classroomTask}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4">
                    {selectedLecture.summary}
                  </p>

                  <div className="space-y-2.5">
                    <h4 className="text-sm font-semibold text-slate-900">강의 핵심 학습 포인트</h4>
                    <ul className="space-y-2">
                      {selectedLecture.keyPoints.map((pt, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-slate-700"
                        >
                          <PlayCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900">
                      실제 면접관 채점 루브릭 기준표
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-2.5 px-4 font-semibold">평가 항목</th>
                            <th className="py-2.5 px-3 font-semibold text-right">비중</th>
                            <th className="py-2.5 px-4 font-semibold">고득점 합격 시그널</th>
                            <th className="py-2.5 px-4 font-semibold">감점 위험 요인</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedLecture.rubricChecklist.map((row) => (
                            <tr key={row.criterion}>
                              <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                                {row.criterion}
                              </td>
                              <td className="py-3 px-3 text-right font-mono-tabular text-blue-700 font-semibold whitespace-nowrap">
                                {row.weight}
                              </td>
                              <td className="py-3 px-4 text-slate-700">{row.highScoreSignal}</td>
                              <td className="py-3 px-4 text-slate-500">{row.lowScoreRisk}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onStartQuestionPractice(selectedLecture.recommendedQuestionId)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  이 강의 연계 기출문항으로 실전 연습하기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2.5: 면접 유형별 심층 학습 및 2027 대학별 전형 분석 (강의 탭 하단 핵심 모듈) */}
      {fundamentals && selectedTypeGuide && (
        <section
          id="interview-type-deepdive"
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>2027학년도 면접자료 정리해DREAM 기반 유형별 심층 교안</span>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700 font-semibold">수도권·거점국립대·교대·특수전형 반영</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                면접 유형별 심층 대비 가이드 & 2027 대학별 평가 기준표
              </h2>
            </div>

            <a
              href="/assets/aistudio/_____2027._________DREAM_ed8075e1.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-4 h-4 text-blue-700" />
              2027 면접자료 정리해DREAM 원문 PDF
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>

          {/* 5 Interview Type Segmented Selector */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg min-w-full sm:min-w-0">
              {fundamentals.typeGuides.map((guide, index) => {
                const active = guide.id === selectedTypeGuide.id;
                return (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => setSelectedTypeId(guide.id)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="font-mono-tabular mr-1.5 opacity-70">0{index + 1}</span>
                    {guide.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Selected Type Header & Core Teaching Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono-tabular font-semibold text-blue-700">
                    {selectedTypeGuide.timeSpec}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedTypeGuide.evaluationWeightFocus}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedTypeGuide.typeName}
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedTypeGuide.corePurpose}
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 leading-relaxed">
                  <span className="font-semibold text-blue-800">핵심 대비 전략: </span>
                  {selectedTypeGuide.prepStrategy}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                    <span>강의실 수업 지도 포인트</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {selectedTypeGuide.teachingNote}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    2027 전형 핵심 체크포인트
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {selectedTypeGuide.coreCheckpoints.map((cp, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="font-mono-tabular font-semibold text-blue-700 mt-0.5">
                          ·
                        </span>
                        <span>{cp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 2027 University Specs Comparison Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  2027학년도 주요 대학별 면접 방식 · 반영비율 · 평가요소 비교표
                </h4>
                <span className="text-xs text-slate-500">
                  출처: 전남광주통합특별시교육청 『2027학년도 면접자료 정리해DREAM』
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">대학명</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">전형명</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">단계·반영비율</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">면접 시간</th>
                      <th className="py-3 px-4 font-semibold">평가요소 및 반영 비중</th>
                      <th className="py-3 px-4 font-semibold">2027 핵심 특징</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTypeGuide.universitySpecs.map((spec) => (
                      <tr key={`${spec.university}-${spec.track}`} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {spec.university}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {spec.track}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular font-medium text-blue-700 whitespace-nowrap">
                          {spec.ratioAndQuota}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {spec.duration}
                        </td>
                        <td className="py-3 px-4 text-slate-700 min-w-[200px]">
                          {spec.criteria}
                        </td>
                        <td className="py-3 px-4 text-slate-600 min-w-[220px]">
                          {spec.highlight}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Authentic Sample Prompts */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                실제 기출 · 모의 질문 예시 (수업 연습용)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedTypeGuide.samplePrompts.map((sample, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="text-xs font-semibold text-blue-700">{sample.context}</div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                      &ldquo;{sample.question}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Passer Tips & Blind/Deduction Pitfalls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>합격생 후기 & 입학사정관 실전 조언</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {selectedTypeGuide.passerAdvice.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="font-semibold text-emerald-700 mt-0.5">·</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>감점 · 블라인드 위반 및 실격 주의사항</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {selectedTypeGuide.pitfalls.map((pitfall, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="font-semibold text-amber-700 mt-0.5">·</span>
                      <span>{pitfall}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Practice CTA */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                현재 선택된 유형의 대표 기출문항으로 즉시 AI 모의면접 및 꼬리질문 훈련을 시작할 수 있습니다.
              </div>
              <button
                type="button"
                onClick={() => onStartQuestionPractice(selectedTypeGuide.practiceQuestionId)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {selectedTypeGuide.shortLabel} 대표 기출로 모의면접 시작
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Current Trends Briefings */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500">2026~2027학년도 대학입시 면접 동향</div>
            <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
              최신 대입 면접 핵심 트렌드 브리핑
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            수시 학생부종합 · 제시문 구술 · 의약학 MMI · 교직적성
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trends.map((trend) => (
            <article
              key={trend.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-blue-700">{trend.impactLevel}</span>
                <span aria-hidden="true">·</span>
                <span>{trend.category}</span>
                <span aria-hidden="true">·</span>
                <span>{trend.yearTag}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {trend.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{trend.summary}</p>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">대비 전략: </span>
                {trend.actionTip}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4: Personalized AI Trend & Student Feedback Generator (Search Grounded) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs text-slate-500">실시간 웹 검색 기반 대입 동향 반영</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              학생별 맞춤형 최신 입시 트렌드 · 세특 피드백 생성
            </h2>
          </div>
          <button
            type="button"
            onClick={handleGenerateFeedback}
            disabled={loadingFeedback}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loadingFeedback ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                최신 입시 트렌드 분석 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                맞춤형 입시 피드백 생성
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">지원 대학 및 전형</span>
            <input
              type="text"
              value={`${profile.targetUniversity} ${profile.track}`}
              onChange={(e) => {
                const parts = e.target.value.split(' ');
                onUpdateProfile({
                  ...profile,
                  targetUniversity: parts[0] || profile.targetUniversity,
                  track: parts.slice(1).join(' ') || profile.track,
                });
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">학생부 세특 · 탐구 키워드</span>
            <input
              type="text"
              value={profile.activityKeywords}
              onChange={(e) =>
                onUpdateProfile({ ...profile, activityKeywords: e.target.value })
              }
              placeholder="예: AI 추천 알고리즘 편향 분석, 공공데이터 통계"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">현재 가장 고민되는 면접 약점</span>
            <input
              type="text"
              value={profile.concern}
              onChange={(e) =>
                onUpdateProfile({ ...profile, concern: e.target.value })
              }
              placeholder="예: 압박 꼬리질문 시 말이 빨라지고 논리가 흐려짐"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        </div>

        {feedbackError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {feedbackError}
          </div>
        )}

        {analysisMarkdown ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="space-y-1">{renderFormattedAnalysis(analysisMarkdown)}</div>

            {groundingSources.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-600">
                  참고된 최신 입시·교육 자료 출처
                </div>
                <div className="flex flex-wrap gap-3">
                  {groundingSources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            위 프로필을 확인한 뒤 <strong>맞춤형 입시 피드백 생성</strong>을 클릭하면, 최신 대입 면접 동향 검색 결과와 내 학생부 키워드를 결합한 예상 압박 질문 및 전략 리포트를 생성합니다.
          </div>
        )}
      </section>

      {/* Classroom Presentation Slide Deck Modal */}
      {slideDeckOpen && selectedLecture && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="강의 슬라이드 발표 모드"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl min-h-[520px] flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Slide Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div className="text-xs text-slate-600 font-medium">
                {selectedLecture.number}강 · {selectedLecture.title}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono-tabular text-xs font-semibold text-slate-700">
                  슬라이드 {slideIndex + 1} / 5
                </span>
                <button
                  type="button"
                  onClick={() => setSlideDeckOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 cursor-pointer"
                  aria-label="발표 모드 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slide Body */}
            <div className="p-8 sm:p-12 flex-1 flex flex-col justify-center">
              {slideIndex === 0 && (
                <div className="space-y-6">
                  <div className="text-sm font-semibold text-blue-700">
                    {selectedLecture.number}강 · {selectedLecture.targetTrack} ·{' '}
                    {selectedLecture.durationLabel}
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 leading-tight [text-wrap:balance]">
                    {selectedLecture.title}
                  </h2>
                  <p className="text-base text-slate-600">{selectedLecture.subtitle}</p>
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-semibold text-slate-500">오늘의 학습 목표</div>
                    <ul className="space-y-2 text-base text-slate-800">
                      {selectedLecture.lessonPlan.learningObjectives.map((o, i) => (
                        <li key={i}>
                          {i + 1}. {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {slideIndex === 1 && (
                <div className="space-y-6">
                  <div className="text-xs font-semibold text-blue-700">핵심 개념 및 강의 포인트</div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    면접 평가 기준과 핵심 전략
                  </h3>
                  <p className="text-base text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-5">
                    {selectedLecture.summary}
                  </p>
                  <ul className="space-y-3 text-base text-slate-800">
                    {selectedLecture.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="font-mono-tabular font-bold text-blue-700">
                          0{i + 1}.
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {slideIndex === 2 && (
                <div className="space-y-5">
                  <div className="text-xs font-semibold text-blue-700">
                    수업 비교 분석 · 감점 답변 vs 합격권 답변
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Q. {selectedLecture.lessonPlan.caseStudyExample.question}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-rose-700">감점 사례</div>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                        &ldquo;{selectedLecture.lessonPlan.caseStudyExample.weakAnswer}&rdquo;
                      </p>
                    </div>
                    <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-emerald-700">합격 모범 답변</div>
                      <p className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed">
                        &ldquo;{selectedLecture.lessonPlan.caseStudyExample.strongAnswer}&rdquo;
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-100 rounded-lg text-sm text-slate-800">
                    <strong>핵심 해설: </strong>
                    {selectedLecture.lessonPlan.caseStudyExample.coachingPoint}
                  </div>
                </div>
              )}

              {slideIndex === 3 && (
                <div className="space-y-5">
                  <div className="text-xs font-semibold text-blue-700">면접관 채점 루브릭</div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    고득점 시그널과 감점 요인 비교표
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <th className="py-3 px-4 font-semibold">평가 항목</th>
                          <th className="py-3 px-4 font-semibold text-right">비중</th>
                          <th className="py-3 px-4 font-semibold">합격 시그널</th>
                          <th className="py-3 px-4 font-semibold">감점 위험</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedLecture.rubricChecklist.map((r) => (
                          <tr key={r.criterion}>
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {r.criterion}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-blue-700">
                              {r.weight}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">{r.highScoreSignal}</td>
                            <td className="py-3.5 px-4 text-slate-500">{r.lowScoreRisk}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {slideIndex === 4 && (
                <div className="space-y-6">
                  <div className="text-xs font-semibold text-blue-700">수업 마무리 · 실전 과제</div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    지금 바로 모의면접 스튜디오에서 실습하세요
                  </h3>
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl text-base text-slate-900 leading-relaxed">
                    {selectedLecture.lessonPlan.classroomTask}
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSlideDeckOpen(false);
                        onStartQuestionPractice(selectedLecture.recommendedQuestionId);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                    >
                      추천 기출문항으로 실전 모의면접 시작
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Slide Footer Navigation */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                disabled={slideIndex === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                이전 슬라이드
              </button>

              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideIndex(idx)}
                    aria-label={`슬라이드 ${idx + 1}`}
                    className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer ${
                      slideIndex === idx ? 'bg-blue-700' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSlideIndex((i) => Math.min(4, i + 1))}
                disabled={slideIndex === 4}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-lg cursor-pointer"
              >
                다음 슬라이드
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
