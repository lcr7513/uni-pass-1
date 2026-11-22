import { AlertTriangle, Check, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { EvaluationReport } from '../types/interview';

type MistakeCategory = '전체' | '논리·내용' | '음성·화법' | '비언어·태도';

interface MistakeItem {
  id: string;
  category: Exclude<MistakeCategory, '전체'>;
  severity: '치명적 감점' | '주요 감점' | '인상 저하';
  title: string;
  mistakePattern: string;
  fixAction: string;
}

const MISTAKE_ITEMS: MistakeItem[] = [
  {
    id: 'm-logic-1',
    category: '논리·내용',
    severity: '치명적 감점',
    title: '두괄식 결론 없이 배경·서론만 장황하게 설명',
    mistakePattern: '답변 시작 후 30초가 지나도록 핵심 입장과 분류 기준이 나오지 않음',
    fixAction: '첫 문장을 "제시문 (가)와 (나)의 핵심 차이는 OO이며, 저는 OO 관점에 동의합니다"로 고정하세요.',
  },
  {
    id: 'm-logic-2',
    category: '논리·내용',
    severity: '치명적 감점',
    title: '학생부 세특·탐구 결과만 암기하고 과정·한계 질문에 막힘',
    mistakePattern: '보고서 결론은 유창하게 말하지만 "왜 이 변수를 선택했나?"라는 꼬리질문에 답하지 못함',
    fixAction: '모든 세특 활동마다 [탐구 동기 → 시행착오 1가지 → 보완 방법]을 3문장으로 정리하세요.',
  },
  {
    id: 'm-logic-3',
    category: '논리·내용',
    severity: '주요 감점',
    title: '면접관 반론 제시 시 즉시 입장 번복 또는 무조건적 고집',
    mistakePattern: '꼬리질문이 들어오면 당황해서 "제 생각이 틀렸습니다" 하거나 근거 없이 초기 주장만 반복',
    fixAction: '"지적해주신 조건을 고려하면 OO 위험이 있습니다. 다만 OO 보완책을 전제로 하면~"처럼 조건부 수용 화법을 쓰세요.',
  },
  {
    id: 'm-voice-1',
    category: '음성·화법',
    severity: '주요 감점',
    title: '긴장으로 인한 과속 발화 (분당 150어절 이상)',
    mistakePattern: '준비한 내용을 빨리 다 말하려는 조급함에 어조가 빨라져 면접관이 핵심을 놓침',
    fixAction: '문장 마침표마다 1초간 숨을 고르고 분당 115~135어절(WPM) 템포를 유지하세요.',
  },
  {
    id: 'm-voice-2',
    category: '음성·화법',
    severity: '주요 감점',
    title: '무의식적 습관어("어...", "약간", "좀") 반복 사용',
    mistakePattern: '다음 문장을 떠올리는 동안 침묵을 견디지 못하고 간투사를 연발해 신뢰감이 떨어짐',
    fixAction: '습관어가 나오려는 순간 입을 다물고 1초 침묵(전략적 휴지) 후 첫 단어를 또렷하게 발음하세요.',
  },
  {
    id: 'm-voice-3',
    category: '음성·화법',
    severity: '인상 저하',
    title: '문장 끝맺음 흐림 및 단답형 종료',
    mistakePattern: '"~인 것 같습니다...", "~했다고 생각해요"처럼 어미가 작아지거나 근거 없이 짧게 끝냄',
    fixAction: '"~라고 판단합니다", "~라는 점에서 의의가 있습니다"로 어미를 단정하고 명확하게 마무리하세요.',
  },
  {
    id: 'm-nonverbal-1',
    category: '비언어·태도',
    severity: '주요 감점',
    title: '생각할 때 천장·바닥 응시 등 시선 회피',
    mistakePattern: '어려운 꼬리질문을 받으면 눈동자가 좌우나 위로 흔들려 자신감 결여로 비침',
    fixAction: '잠시 생각할 때도 질문을 던진 면접관의 미간·인중 부근 또는 카메라 렌즈를 안정적으로 응시하세요.',
  },
  {
    id: 'm-nonverbal-2',
    category: '비언어·태도',
    severity: '인상 저하',
    title: '상체 흔들림·다리 떨기 및 과도한 손짓',
    mistakePattern: '발화에 집중하면서 몸을 좌우로 흔들거나 책상 아래 손을 만지작거림',
    fixAction: '양손은 허벅지 위나 책상 위에 가지런히 두고, 강조할 때만 제한적으로 제스처를 사용하세요.',
  },
  {
    id: 'm-nonverbal-3',
    category: '비언어·태도',
    severity: '인상 저하',
    title: '질문 경청 태도 부족 및 무표정 경직',
    mistakePattern: '면접관이 질문하는 도중 자기 답변만 머릿속으로 되뇌며 경직된 표정을 유지함',
    fixAction: '질문 경청 시 가벼운 고개 끄덕임으로 이해 신호를 보내고, 답변 전 1초간 미소로 호흡을 여세요.',
  },
];

const CATEGORIES: MistakeCategory[] = ['전체', '논리·내용', '음성·화법', '비언어·태도'];
const CHECKLIST_STORAGE_KEY = 'unipass_mistake_checklist_v1';

interface MistakeChecklistSectionProps {
  latestReport?: EvaluationReport;
  onStartPractice: () => void;
}

export function MistakeChecklistSection({
  latestReport,
  onStartPractice,
}: MistakeChecklistSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<MistakeCategory>('전체');
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['m-logic-1', 'm-voice-3'];
    } catch {
      return ['m-logic-1', 'm-voice-3'];
    }
  });
  const [expandedId, setExpandedId] = useState<string | null>('m-logic-1');

  useEffect(() => {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checkedIds));
    } catch {
      // Ignore storage error
    }
  }, [checkedIds]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Detect real telemetry warnings from the latest mock interview report
  const detectedTelemetryAlerts = useMemo(() => {
    const alerts: Record<string, string> = {};
    if (!latestReport) return alerts;

    const t = latestReport.telemetrySnapshot;
    const c = latestReport.competencyScores;

    if (c.logicalStructure < 82) {
      alerts['m-logic-1'] = `최근 실측: 논리구조화 ${c.logicalStructure}점 (보완 권장)`;
    }
    if (c.academicDepth < 82) {
      alerts['m-logic-2'] = `최근 실측: 학업탐구력 ${c.academicDepth}점 (검증 대비 필요)`;
    }
    if (t.wpm > 145) {
      alerts['m-voice-1'] = `최근 실측: ${t.wpm} WPM (권장 110~140 초과)`;
    }
    if (t.fillerCount >= 3) {
      alerts['m-voice-2'] = `최근 실측: 습관어 ${t.fillerCount}회 감지`;
    }
    if (t.eyeFocusRatio < 85) {
      alerts['m-nonverbal-1'] = `최근 실측: 시선 집중도 ${t.eyeFocusRatio}%`;
    }
    if (t.postureStability < 85) {
      alerts['m-nonverbal-2'] = `최근 실측: 자세 안정도 ${t.postureStability}%`;
    }
    return alerts;
  }, [latestReport]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === '전체') return MISTAKE_ITEMS;
    return MISTAKE_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const totalChecked = checkedIds.length;
  const totalItems = MISTAKE_ITEMS.length;
  const completionPct = Math.round((totalChecked / totalItems) * 100);

  const categoryStats = useMemo(() => {
    const cats: Exclude<MistakeCategory, '전체'>[] = [
      '논리·내용',
      '음성·화법',
      '비언어·태도',
    ];
    return cats.map((cat) => {
      const items = MISTAKE_ITEMS.filter((i) => i.category === cat);
      const done = items.filter((i) => checkedIds.includes(i.id)).length;
      const pct = Math.round((done / items.length) * 100);
      return { cat, done, total: items.length, pct };
    });
  }, [checkedIds]);

  const alertCount = Object.keys(detectedTelemetryAlerts).length;

  return (
    <section
      aria-label="면접 빈출 실수 자가 점검 체크리스트"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Top Header & Overall Progress Visual */}
      <div className="p-6 border-b border-slate-200 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>실전 감점 요인 자가 진단</span>
              <span aria-hidden="true">·</span>
              <span>총 {totalItems}개 핵심 실수 유형</span>
              {alertCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-amber-700">
                    최근 모의면접 주의 항목 {alertCount}건 감지
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              면접 중 자주 하는 실수 체크리스트
            </h2>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-500">실수 교정 완료율</div>
              <div className="font-mono-tabular text-xl font-bold text-blue-700">
                {completionPct}%{' '}
                <span className="text-xs font-medium text-slate-500">
                  ({totalChecked}/{totalItems})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCheckedIds([])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="체크리스트 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </div>
        </div>

        {/* Visual Progress Bars: Total + 3 Categories */}
        <div className="space-y-3">
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {categoryStats.map((stat) => (
              <div
                key={stat.cat}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{stat.cat}</span>
                  <span className="font-mono-tabular text-slate-600">
                    {stat.done}/{stat.total} ({stat.pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      stat.pct === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onStartPractice}
            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            모의면접 스튜디오에서 실전 점검하기 →
          </button>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-slate-100">
        {filteredItems.map((item) => {
          const isChecked = checkedIds.includes(item.id);
          const isExpanded = expandedId === item.id;
          const telemetryAlert = detectedTelemetryAlerts[item.id];

          return (
            <div
              key={item.id}
              className={`transition-colors ${
                isChecked ? 'bg-slate-50/60' : 'bg-white hover:bg-slate-50/40'
              }`}
            >
              <div className="px-6 py-4 flex items-start gap-4">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  aria-label={`${item.title} 점검 완료 표시`}
                  onClick={() => toggleCheck(item.id)}
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isChecked
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white border-slate-300 hover:border-blue-500'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        item.severity === '치명적 감점'
                          ? 'font-medium text-rose-700'
                          : item.severity === '주요 감점'
                          ? 'font-medium text-amber-700'
                          : 'text-slate-500'
                      }
                    >
                      {item.severity}
                    </span>
                    {telemetryAlert && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          {telemetryAlert}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((prev) => (prev === item.id ? null : item.id))
                    }
                    className="w-full text-left mt-1 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span
                      className={`text-sm font-semibold leading-snug ${
                        isChecked ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                      <div className="text-slate-600">
                        <span className="font-semibold text-slate-800">자주 나타나는 증상: </span>
                        {item.mistakePattern}
                      </div>
                      <div className="text-slate-700">
                        <span className="font-semibold text-blue-800">실전 교정 가이드: </span>
                        {item.fixAction}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
