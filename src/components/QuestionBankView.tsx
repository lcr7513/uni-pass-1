import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { InterviewFormat, MajorGroup, PastQuestion } from '../types/interview';

interface QuestionBankViewProps {
  questions: PastQuestion[];
  targetMajor: string;
  onStartSimulation: (question: PastQuestion) => void;
  onAddCustomQuestion: (question: PastQuestion) => void;
}

const FORMAT_FILTERS: ('전체' | InterviewFormat)[] = [
  '전체',
  '제시문 기반',
  '서류 기반',
  'MMI 다중미니',
  '교직적성',
];

const MAJOR_FILTERS: ('전체' | MajorGroup)[] = [
  '전체',
  '무전공·자유전공',
  '인문·사회',
  '자연·공학',
  '의약학',
  '사범·교육',
];

export function QuestionBankView({
  questions,
  targetMajor,
  onStartSimulation,
  onAddCustomQuestion,
}: QuestionBankViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'전체' | InterviewFormat>('전체');
  const [majorFilter, setMajorFilter] = useState<'전체' | MajorGroup>('전체');
  const [selectedId, setSelectedId] = useState<string>(questions[0]?.id || '');
  const [generatingVariant, setGeneratingVariant] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (formatFilter !== '전체' && q.format !== formatFilter) return false;
      if (majorFilter !== '전체' && q.majorGroup !== majorFilter) return false;
      if (searchQuery.trim()) {
        const hay = `${q.university} ${q.track} ${q.title} ${q.passage} ${q.mainQuestion}`.toLowerCase();
        if (!hay.includes(searchQuery.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [questions, formatFilter, majorFilter, searchQuery]);

  const selectedQuestion =
    filteredQuestions.find((q) => q.id === selectedId) ||
    filteredQuestions[0] ||
    questions[0];

  const handleCreateVariant = async () => {
    if (!selectedQuestion) return;
    setGeneratingVariant(true);
    setVariantError(null);
    try {
      const res = await fetch('/api/ai/variant-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseQuestion: selectedQuestion,
          targetMajor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '변형 문제 생성에 실패했습니다.');
      }
      onAddCustomQuestion(data);
      setSelectedId(data.id);
      setFormatFilter('전체');
      setMajorFilter('전체');
    } catch (err) {
      setVariantError(
        err instanceof Error ? err.message : '변형 문제 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setGeneratingVariant(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">대학별 실제 면접 기출 데이터베이스</div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
            실전 기출 문제 시뮬레이터
          </h1>
        </div>
        <div className="font-mono-tabular text-xs text-slate-600">
          검색 결과 {filteredQuestions.length}문항 / 전체 {questions.length}문항
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="대학명, 주제, 제시문 키워드로 검색 (예: 서울대, AI, 응급실)"
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {FORMAT_FILTERS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    formatFilter === fmt
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value as '전체' | MajorGroup)}
              aria-label="모집 계열 필터"
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {MAJOR_FILTERS.map((m) => (
                <option key={m} value={m}>
                  계열: {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Question Table + Selected Question Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-slate-600">조건에 맞는 기출 문항이 없습니다.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFormatFilter('전체');
                  setMajorFilter('전체');
                }}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {filteredQuestions.map((q) => {
                const isSelected = selectedQuestion?.id === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedId(q.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{q.university}</span>
                      <span className="font-mono-tabular">
                        {q.year} · {q.format}
                      </span>
                    </div>
                    <div
                      className={`text-sm font-semibold mt-1 leading-snug ${
                        isSelected ? 'text-blue-800' : 'text-slate-900'
                      }`}
                    >
                      {q.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {q.track} · {q.majorGroup}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Question Detail */}
        {selectedQuestion && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">{selectedQuestion.university}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedQuestion.track}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{selectedQuestion.year}학년도</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    숙독 {selectedQuestion.prepMinutes}분 / 답변 {selectedQuestion.answerMinutes}분
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {selectedQuestion.title}
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">제시문 및 면접 상황</div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {selectedQuestion.passage}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">핵심 질문</div>
              <p className="text-base font-semibold text-slate-900 leading-relaxed">
                {selectedQuestion.mainQuestion}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">출제 의도</div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {selectedQuestion.evaluationIntent}
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">핵심 평가 기준</div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                  {selectedQuestion.keyCriteria.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-700 font-semibold">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700">기본 예상 꼬리 질문</div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                {selectedQuestion.sampleFollowUps.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono-tabular text-slate-400">Q{idx + 1}.</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {variantError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {variantError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCreateVariant}
                disabled={generatingVariant}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {generatingVariant ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    변형 문항 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    내 전공 맞춤 AI 변형 문제 생성
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onStartSimulation(selectedQuestion)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                이 문제로 실전 모의면접 시작
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
