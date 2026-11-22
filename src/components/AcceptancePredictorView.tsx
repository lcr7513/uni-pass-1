import { Loader2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type {
  AcceptancePrediction,
  EvaluationReport,
  MajorGroup,
  StudentProfile,
} from '../types/interview';

interface AcceptancePredictorViewProps {
  profile: StudentProfile;
  onUpdateProfile: (next: StudentProfile) => void;
  latestReport?: EvaluationReport;
}

const MAJOR_GROUPS: MajorGroup[] = [
  '무전공·자유전공',
  '인문·사회',
  '자연·공학',
  '의약학',
  '사범·교육',
];

export function AcceptancePredictorView({
  profile,
  onUpdateProfile,
  latestReport,
}: AcceptancePredictorViewProps) {
  const [interviewScore, setInterviewScore] = useState<number>(
    latestReport?.overallScore ?? 85
  );
  const [docScoreEstimate, setDocScoreEstimate] = useState<number>(88);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<AcceptancePrediction | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/predict-admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          interviewScore,
          docScoreEstimate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '합격 가능성 예측 분석에 실패했습니다.');
      }
      setPrediction(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '예측 리포트 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getTierStyle = (tier: AcceptancePrediction['tierLabel']) => {
    switch (tier) {
      case '안정권':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case '적정권':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case '소신권':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case '상향 도전':
        return 'text-rose-700 bg-rose-50 border-rose-200';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs text-slate-500">누적 합격·불합격 사례 DB 정밀 매칭</div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
          개인별 합격 가능성 예측 리포트
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input & Score Simulation Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">지원자 데이터 입력</h2>
            <p className="text-xs text-slate-500">
              내신, 서류 경쟁력, 모의면접 점수를 조정해 면접 점수 상승에 따른 합격 확률 변화를 시뮬레이션해보세요.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">지원 대학</span>
              <input
                type="text"
                value={profile.targetUniversity}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, targetUniversity: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-700">모집 계열</span>
                <select
                  value={profile.majorGroup}
                  onChange={(e) =>
                    onUpdateProfile({
                      ...profile,
                      majorGroup: e.target.value as MajorGroup,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {MAJOR_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-700">내신 등급</span>
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
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">희망 학과 및 전형</span>
              <input
                type="text"
                value={`${profile.targetMajor} / ${profile.track}`}
                onChange={(e) => {
                  const [major, track] = e.target.value.split('/').map((s) => s.trim());
                  onUpdateProfile({
                    ...profile,
                    targetMajor: major || profile.targetMajor,
                    track: track || profile.track,
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  모의면접 역량 점수
                  {latestReport && (
                    <span className="text-blue-700 ml-1">
                      (최근 리포트 {latestReport.overallScore}점)
                    </span>
                  )}
                </span>
                <span className="font-mono-tabular font-semibold text-blue-700">
                  {interviewScore}점 / 100점
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={interviewScore}
                onChange={(e) => setInterviewScore(Number(e.target.value))}
                className="w-full accent-blue-700 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">학생부 서류 경쟁력 (추정)</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {docScoreEstimate}점 / 100점
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={100}
                value={docScoreEstimate}
                onChange={(e) => setDocScoreEstimate(Number(e.target.value))}
                className="w-full accent-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePredict}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                합격 사례 비교 분석 중...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                합격 가능성 예측 리포트 생성
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Prediction Results */}
        <div className="lg:col-span-8 space-y-6">
          {!prediction ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <h2 className="text-base font-semibold text-slate-900">
                합격 사례 데이터 기반 정밀 진단 대기 중
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                좌측에서 지원 정보와 모의면접 점수를 확인한 뒤 <strong>합격 가능성 예측 리포트 생성</strong> 버튼을 누르면, 유사 내신·계열 합격자 데이터와 비교한 확률 및 D-Day 역전 전략을 제공합니다.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Probability Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="text-xs text-slate-500">
                      {profile.targetUniversity} · {profile.targetMajor} ({profile.track})
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="font-mono-tabular text-4xl font-bold text-slate-900">
                        {prediction.predictedProbability}%
                      </span>
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold border rounded-md ${getTierStyle(
                          prediction.tierLabel
                        )}`}
                      >
                        {prediction.tierLabel}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500">유사 합격자 평균 면접 점수 대비</div>
                    <div
                      className={`font-mono-tabular text-xl font-bold mt-0.5 ${
                        prediction.scoreGapFromAdmittedAvg >= 0
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {prediction.scoreGapFromAdmittedAvg >= 0
                        ? `+${prediction.scoreGapFromAdmittedAvg}점 우위`
                        : `${prediction.scoreGapFromAdmittedAvg}점 보완 필요`}
                    </div>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 transition-all duration-300"
                    style={{ width: `${prediction.predictedProbability}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      면접 점수 영향력 및 역전 분석
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {prediction.interviewImpactAnalysis}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      동일 지원군 경쟁자 비교
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {prediction.competitorComparison}
                    </p>
                  </div>
                </div>
              </div>

              {/* Matched Historical Cases Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">
                    유사 조건 합격 · 불합격 사례 비교 (TOP 5)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-3 px-4 font-semibold">대학 · 모집단위</th>
                        <th className="py-3 px-3 font-semibold text-right">유사도</th>
                        <th className="py-3 px-3 font-semibold text-right">내신</th>
                        <th className="py-3 px-3 font-semibold text-right">면접</th>
                        <th className="py-3 px-3 font-semibold text-center">결과</th>
                        <th className="py-3 px-4 font-semibold">당락 결정 요인</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prediction.matchedCases.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{c.university}</div>
                            <div className="text-xs text-slate-500">
                              {c.major} · {c.track}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                            {c.similarityScore}%
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-900 whitespace-nowrap">
                            {c.gpa.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-blue-700 whitespace-nowrap">
                            {c.interviewScore}점
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold ${
                                c.result === '합격'
                                  ? 'text-emerald-700'
                                  : c.result === '충원합격'
                                  ? 'text-blue-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {c.result}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                            {c.winningFactor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* D-Day Action Plan */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-900">
                  합격 확률 상승을 위한 D-Day 맞춤 실행 전략
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prediction.dDayActionPlan.map((step, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-700">{step.phase}</span>
                        <span className="font-mono-tabular text-emerald-700 font-medium">
                          {step.expectedGain}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">{step.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
