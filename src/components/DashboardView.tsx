import {
  ArrowRight,
  BookOpen,
  Database,
  Mic,
  TrendingUp,
} from 'lucide-react';
import type { EvaluationReport, MajorGroup, StudentProfile } from '../types/interview';
import type { ActiveTab } from './Header';
import { MistakeChecklistSection } from './MistakeChecklistSection';

interface DashboardViewProps {
  profile: StudentProfile;
  onUpdateProfile: (next: StudentProfile) => void;
  onNavigate: (tab: ActiveTab) => void;
  reports: EvaluationReport[];
  questionCount: number;
  caseCount: number;
}

const MAJOR_GROUPS: MajorGroup[] = [
  '인문·사회',
  '자연·공학',
  '의약학',
  '무전공·자유전공',
  '사범·교육',
];

const UNIVERSITIES = [
  '서울대학교',
  '연세대학교',
  '고려대학교',
  '성균관대학교',
  '서강대학교',
  '한양대학교',
  'KAIST',
  '가톨릭대학교',
  '경인교육대학교',
];

export function DashboardView({
  profile,
  onUpdateProfile,
  onNavigate,
  reports,
  questionCount,
  caseCount,
}: DashboardViewProps) {
  const latestReport = reports[0];

  return (
    <div className="space-y-10">
      {/* Split Hero Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>2026~2027 대입 수시·정시 대비</span>
                <span aria-hidden="true">·</span>
                <span>입시 면접 강의 및 AI 실전 코칭</span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-900 leading-tight tracking-tight [text-wrap:balance]">
                최신 입시 트렌드 강의부터 실시간 꼬리질문 모의면접까지
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                무전공 선발 확대와 학생부 세특 심층 검증 기조에 맞춰, 실제 대학별 기출 문항으로 녹화 연습을 진행하고 음성·비언어 지표와 합격 사례 데이터 기반의 정밀 리포트를 받아보세요.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                실전 모의면접 시작
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('trends')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                트렌드 강의 및 맞춤 진단
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full bg-slate-100">
            <img
              src="/src/assets/images/hero_interview_studio_1795314879285.jpg"
              alt="대학입시 모의면접 코칭 세미나실 전경"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/20 to-transparent flex items-end p-6">
              <div className="text-white space-y-1">
                <div className="text-xs text-slate-200">
                  지원 목표 · {profile.targetUniversity} {profile.targetMajor}
                </div>
                <div className="text-sm font-semibold">
                  {profile.track} 맞춤형 실시간 코칭 환경이 준비되어 있습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section aria-label="플랫폼 핵심 데이터 지표" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">기출 문제 데이터베이스</div>
          <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1.5">
            {questionCount}문항
          </div>
          <div className="text-xs text-slate-600 mt-1">제시문 · 서류 · MMI · 교직</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">누적 합격·불합격 사례</div>
          <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1.5">
            {caseCount}건
          </div>
          <div className="text-xs text-slate-600 mt-1">내신 · 면접 점수 상관 비교</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">실시간 음성·비언어 측정</div>
          <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1.5">
            7개 지표
          </div>
          <div className="text-xs text-slate-600 mt-1">WPM · 습관어 · 시선 · 자세</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">내 최근 모의면접 종합점수</div>
          <div className="font-mono-tabular text-2xl font-bold text-blue-700 mt-1.5">
            {latestReport ? `${latestReport.overallScore}점` : '미응시'}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {latestReport ? latestReport.gradeBand : '첫 모의면접을 진행해보세요'}
          </div>
        </div>
      </section>

      {/* Quick Student Target Configuration + 4 Core Workflow Modules */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">지원자 기본 목표 설정</h2>
            <p className="text-xs text-slate-500">
              설정한 목표 정보는 강의 진단, 꼬리질문 난이도, 합격 예측 리포트에 자동 연동됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">목표 대학</span>
              <select
                value={profile.targetUniversity}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, targetUniversity: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">모집 계열</span>
              <select
                value={profile.majorGroup}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, majorGroup: e.target.value as MajorGroup })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {MAJOR_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">희망 학과/학부</span>
              <input
                type="text"
                value={profile.targetMajor}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, targetMajor: e.target.value })
                }
                placeholder="예: 자유전공학부, 의예과"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">내신 등급 (평균)</span>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="9.0"
                value={profile.gpa}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    gpa: Math.max(1, Math.min(9, Number(e.target.value) || 1.5)),
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">학생부 세특 핵심 탐구 키워드</span>
            <input
              type="text"
              value={profile.activityKeywords}
              onChange={(e) =>
                onUpdateProfile({ ...profile, activityKeywords: e.target.value })
              }
              placeholder="예: 알고리즘 편향, 공공데이터 회귀분석, 생명윤리 토론"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('trends')}
            className="text-left bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-6 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">01. 강의 및 트렌드</span>
              <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-3">
              최신 입시 트렌드 · 맞춤 피드백
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              실시간 검색 기반 대학별 면접 출제 경향과 내 세특 키워드 기반 예상 압박 질문을 확인합니다.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className="text-left bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-6 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">02. 실전 스튜디오</span>
              <Mic className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-3">
              녹화 · 음성/비언어 · 꼬리질문
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              웹캠·마이크 녹화와 실시간 WPM·습관어·시선 측정, AI 면접관의 연속 꼬리질문을 체험합니다.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('questions')}
            className="text-left bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-6 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">03. 기출 시뮬레이터</span>
              <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-3">
              입시 DB 기출 · 변형 문제 출제
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              주요 대학 실제 기출 제시문과 출제 의도를 조회하고 AI 변형 문제로 실전 연습을 시작합니다.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('predictor')}
            className="text-left bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-6 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">04. 데이터 분석</span>
              <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-3">
              합격 사례 기반 합격 가능성 예측
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              유사 내신·면접 점수 합격자 데이터와 비교하여 내 합격 확률 및 D-Day 역전 전략을 도출합니다.
            </p>
          </button>
        </div>
      </section>

      {/* Common Interview Mistakes Visual Checklist */}
      <MistakeChecklistSection
        latestReport={latestReport}
        onStartPractice={() => onNavigate('studio')}
      />

      {/* Recent Evaluation History Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">최근 모의면접 정밀 리포트 이력</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              완료한 모의면접 결과는 자동으로 저장되며 합격 예측 리포트에 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            새 면접 연습하기
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm text-slate-600">
              아직 저장된 모의면접 분석 리포트가 없습니다.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              첫 모의면접 녹화 및 AI 평가 받기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">일시</th>
                  <th className="py-3 px-4">대학 · 전형</th>
                  <th className="py-3 px-4">문항 주제</th>
                  <th className="py-3 px-4 text-right">발화속도</th>
                  <th className="py-3 px-4 text-right">종합점수</th>
                  <th className="py-3 px-6 text-right">판정 구간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 font-mono-tabular text-xs text-slate-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium whitespace-nowrap">
                      {r.university} · {r.track}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {r.questionTitle}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                      {r.telemetrySnapshot.wpm} WPM
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-blue-700 whitespace-nowrap">
                      {r.overallScore}점
                    </td>
                    <td className="py-3 px-6 text-right text-xs font-medium text-slate-700 whitespace-nowrap">
                      {r.gradeBand}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
