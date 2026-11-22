import { useEffect, useState } from 'react';
import { AcceptancePredictorView } from './components/AcceptancePredictorView';
import { DashboardView } from './components/DashboardView';
import { Header, type ActiveTab } from './components/Header';
import { MockStudioView } from './components/MockStudioView';
import { QuestionBankView } from './components/QuestionBankView';
import { TrendsLecturesView } from './components/TrendsLecturesView';
import type {
  EvaluationReport,
  InterviewFundamentals,
  LectureModule,
  PastQuestion,
  StudentProfile,
  TrendBrief,
} from './types/interview';

const DEFAULT_PROFILE: StudentProfile = {
  name: '김유니',
  targetUniversity: '서울대학교',
  targetMajor: '자유전공학부',
  majorGroup: '무전공·자유전공',
  track: '일반전형',
  gpa: 1.45,
  activityKeywords: '알고리즘 추천 편향 분석, 공공데이터 통계 회귀모형, 데이터 윤리 토론',
  concern: '제시문 반론 꼬리질문이 들어올 때 말하기 속도가 빨라지고 논점이 흔들립니다.',
};

const STORAGE_REPORTS_KEY = 'unipass_interview_reports_v1';
const STORAGE_PROFILE_KEY = 'unipass_student_profile_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [reports, setReports] = useState<EvaluationReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REPORTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lectures, setLectures] = useState<LectureModule[]>([]);
  const [trends, setTrends] = useState<TrendBrief[]>([]);
  const [fundamentals, setFundamentals] = useState<InterviewFundamentals | null>(null);
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [caseCount, setCaseCount] = useState<number>(15);
  const [activeQuestion, setActiveQuestion] = useState<PastQuestion | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports));
    } catch {
      // Ignore storage quota errors
    }
  }, [reports]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrapData() {
      setLoadingInitial(true);
      setLoadError(null);
      try {
        const [curRes, qRes, cRes] = await Promise.all([
          fetch('/api/curriculum'),
          fetch('/api/admissions/questions'),
          fetch('/api/admissions/cases'),
        ]);
        if (!curRes.ok || !qRes.ok || !cRes.ok) {
          throw new Error('입시 데이터베이스를 불러오지 못했습니다.');
        }
        const [curData, qData, cData] = await Promise.all([
          curRes.json(),
          qRes.json(),
          cRes.json(),
        ]);

        if (cancelled) return;
        setLectures(curData.lectures || []);
        setTrends(curData.trends || []);
        setFundamentals(curData.fundamentals || null);
        const loadedQuestions: PastQuestion[] = qData.questions || [];
        setQuestions(loadedQuestions);
        setActiveQuestion(loadedQuestions[0] || null);
        setCaseCount((cData.cases || []).length);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : '초기 데이터를 불러오는 중 오류가 발생했습니다.'
          );
        }
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    }
    bootstrapData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartQuestionById = (questionId: string) => {
    const found = questions.find((q) => q.id === questionId);
    if (found) {
      setActiveQuestion(found);
    }
    setActiveTab('studio');
  };

  const handleStartSimulation = (question: PastQuestion) => {
    setActiveQuestion(question);
    setActiveTab('studio');
  };

  const handleAddCustomQuestion = (newQ: PastQuestion) => {
    setQuestions((prev) => [newQ, ...prev]);
  };

  const handleReportGenerated = (report: EvaluationReport) => {
    setReports((prev) => [report, ...prev.slice(0, 19)]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header activeTab={activeTab} onNavigate={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingInitial ? (
          <div className="space-y-6">
            <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : loadError ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm font-medium text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg cursor-pointer"
            >
              다시 불러오기
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                profile={profile}
                onUpdateProfile={setProfile}
                onNavigate={setActiveTab}
                reports={reports}
                questionCount={questions.length}
                caseCount={caseCount}
              />
            )}

            {activeTab === 'trends' && (
              <TrendsLecturesView
                lectures={lectures}
                trends={trends}
                fundamentals={fundamentals}
                profile={profile}
                onUpdateProfile={setProfile}
                onStartQuestionPractice={handleStartQuestionById}
              />
            )}

            {activeTab === 'studio' && activeQuestion && (
              <MockStudioView
                questions={questions}
                activeQuestion={activeQuestion}
                onSelectQuestion={setActiveQuestion}
                profile={profile}
                onReportGenerated={handleReportGenerated}
              />
            )}

            {activeTab === 'questions' && (
              <QuestionBankView
                questions={questions}
                targetMajor={profile.targetMajor}
                onStartSimulation={handleStartSimulation}
                onAddCustomQuestion={handleAddCustomQuestion}
              />
            )}

            {activeTab === 'predictor' && (
              <AcceptancePredictorView
                profile={profile}
                onUpdateProfile={setProfile}
                latestReport={reports[0]}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            유니패스 면접랩 · 대학입시 면접 교육 및 AI 모의면접 분석 플랫폼
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className="hover:text-slate-900 cursor-pointer"
            >
              입시 트렌드·강의
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className="hover:text-slate-900 cursor-pointer"
            >
              기출 문제 DB
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('predictor')}
              className="hover:text-slate-900 cursor-pointer"
            >
              합격 가능성 예측
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
