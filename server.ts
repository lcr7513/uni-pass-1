import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ADMISSION_CASES,
  INTERVIEW_FUNDAMENTALS,
  LECTURE_MODULES,
  PAST_QUESTIONS,
  TREND_BRIEFS,
} from './server/admissionsData.ts';
import {
  evaluateInterviewSession,
  formatGeminiError,
  generateFollowUpQuestion,
  generateTrendAndFeedback,
  generateVariantQuestion,
  predictAdmissionChance,
} from './server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/curriculum', (_req, res) => {
    res.json({
      lectures: LECTURE_MODULES,
      trends: TREND_BRIEFS,
      fundamentals: INTERVIEW_FUNDAMENTALS,
    });
  });

  app.get('/api/admissions/questions', (req, res) => {
    const university = String(req.query.university || '').trim();
    const format = String(req.query.format || '').trim();
    const majorGroup = String(req.query.majorGroup || '').trim();
    const query = String(req.query.q || '').trim().toLowerCase();

    const filtered = PAST_QUESTIONS.filter((item) => {
      if (university && university !== '전체' && !item.university.includes(university)) {
        return false;
      }
      if (format && format !== '전체' && item.format !== format) {
        return false;
      }
      if (majorGroup && majorGroup !== '전체' && item.majorGroup !== majorGroup) {
        return false;
      }
      if (query) {
        const hay = `${item.university} ${item.track} ${item.title} ${item.passage} ${item.mainQuestion}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    res.json({ questions: filtered, totalCount: PAST_QUESTIONS.length });
  });

  app.get('/api/admissions/cases', (_req, res) => {
    res.json({ cases: ADMISSION_CASES });
  });

  app.post('/api/ai/trend-feedback', async (req, res) => {
    try {
      const { profile } = req.body;
      if (!profile || !profile.targetUniversity) {
        res.status(400).json({ error: '목표 대학과 학생 프로필 정보를 입력해주세요.' });
        return;
      }
      const result = await generateTrendAndFeedback(profile);
      res.json(result);
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/follow-up', async (req, res) => {
    try {
      const { question, profile, turns, latestAnswer, telemetry } = req.body;
      if (!question || !latestAnswer || !String(latestAnswer).trim()) {
        res.status(400).json({ error: '답변 내용이 비어 있습니다. 답변을 입력하거나 말씀하신 뒤 제출해주세요.' });
        return;
      }
      const result = await generateFollowUpQuestion({
        question,
        profile,
        turns: turns || [],
        latestAnswer: String(latestAnswer).trim(),
        telemetry,
      });
      res.json(result);
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/evaluate-session', async (req, res) => {
    try {
      const { question, profile, turns, telemetry, snapshotBase64 } = req.body;
      if (!question || !Array.isArray(turns) || turns.length === 0) {
        res.status(400).json({ error: '평가할 면접 대화 기록이 없습니다.' });
        return;
      }
      const result = await evaluateInterviewSession({
        question,
        profile,
        turns,
        telemetry,
        snapshotBase64,
      });
      res.json(result);
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/variant-question', async (req, res) => {
    try {
      const { baseQuestion, targetMajor } = req.body;
      if (!baseQuestion) {
        res.status(400).json({ error: '기준 기출 문항을 선택해주세요.' });
        return;
      }
      const variant = await generateVariantQuestion(baseQuestion, String(targetMajor || ''));
      res.json({
        ...baseQuestion,
        ...variant,
        id: `${baseQuestion.id}-variant-${Date.now()}`,
        year: 2027,
        track: `${baseQuestion.track} · AI 변형`,
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/predict-admission', async (req, res) => {
    try {
      const { profile, interviewScore, docScoreEstimate } = req.body;
      if (!profile || !profile.targetUniversity) {
        res.status(400).json({ error: '지원 대학 및 프로필 정보를 입력해주세요.' });
        return;
      }

      const gpa = Number(profile.gpa) || 1.8;
      const iScore = Number(interviewScore) || 80;
      const dScore = Number(docScoreEstimate) || 85;

      const rankedCases = ADMISSION_CASES.map((c) => {
        let sim = 50;
        if (c.majorGroup === profile.majorGroup) sim += 24;
        if (c.university.includes(profile.targetUniversity.replace('대학교', '').replace('대', ''))) {
          sim += 16;
        }
        const gpaDiff = Math.abs(c.gpa - gpa);
        sim -= gpaDiff * 12;
        const intDiff = Math.abs(c.interviewScore - iScore);
        sim -= intDiff * 0.4;
        const similarityScore = Math.max(35, Math.min(99, Math.round(sim)));
        return { ...c, similarityScore };
      })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 5);

      const prediction = await predictAdmissionChance({
        profile,
        interviewScore: iScore,
        docScoreEstimate: dScore,
        matchedCases: rankedCases,
      });

      res.json(prediction);
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
