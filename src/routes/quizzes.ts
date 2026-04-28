import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db, computeLevel } from "../store/index.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/quizzes/course/:courseId
router.get("/course/:courseId", (req, res, next) => {
  try {
    const course = db.courses.get(param(req.params.courseId));
    if (!course) throw new AppError("Course not found", 404);
    const quizzes = [...db.quizzes.values()]
      .filter((q) => q.courseId === param(req.params.courseId))
      .map(({ questions, ...q }) => ({ ...q, questionCount: questions.length }));
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id
router.get("/:id", requireAuth, (req, res, next) => {
  try {
    const quiz = db.quizzes.get(param(req.params.id));
    if (!quiz) throw new AppError("Quiz not found", 404);
    const safeQuestions = quiz.questions.map(({ correctIndex: _, explanation: __, ...q }) => q);
    res.json({ ...quiz, questions: safeQuestions });
  } catch (err) {
    next(err);
  }
});

// POST /api/quizzes/:id/submit
router.post("/:id/submit", requireAuth, (req, res, next) => {
  try {
    const quiz = db.quizzes.get(param(req.params.id));
    if (!quiz) throw new AppError("Quiz not found", 404);

    const { answers } = z.object({ answers: z.array(z.number().int().min(0)) }).parse(req.body);
    if (answers.length !== quiz.questions.length) {
      throw new AppError(`Expected ${quiz.questions.length} answers, got ${answers.length}`, 400);
    }

    const results = quiz.questions.map((q, i) => ({
      questionId: q.id,
      correct: answers[i] === q.correctIndex,
      selectedIndex: answers[i],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      xpEarned: answers[i] === q.correctIndex ? q.xpReward : 0,
    }));

    const correct = results.filter((r) => r.correct).length;
    const totalXp = results.reduce((s, r) => s + r.xpEarned, 0);
    const scorePercent = Math.round((correct / quiz.questions.length) * 100);

    const resultRecord = {
      id: uuid(),
      userId: req.userId!,
      quizId: quiz.id,
      courseId: quiz.courseId,
      answers,
      score: correct,
      totalQuestions: quiz.questions.length,
      xpEarned: totalXp,
      completedAt: new Date().toISOString(),
    };
    db.quizResults.set(resultRecord.id, resultRecord);

    const user = db.users.get(req.userId!)!;
    user.xp += totalXp;
    user.level = computeLevel(user.xp);

    let coinsEarned = 0;
    if (scorePercent >= 90) { coinsEarned = 20; user.coins += coinsEarned; }
    else if (scorePercent >= 70) { coinsEarned = 10; user.coins += coinsEarned; }

    res.json({
      score: correct,
      totalQuestions: quiz.questions.length,
      scorePercent,
      xpEarned: totalXp,
      coinsEarned,
      userXp: user.xp,
      userLevel: user.level,
      results,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id/results
router.get("/:id/results", requireAuth, (req, res, next) => {
  try {
    const quiz = db.quizzes.get(param(req.params.id));
    if (!quiz) throw new AppError("Quiz not found", 404);
    const results = [...db.quizResults.values()]
      .filter((r) => r.userId === req.userId! && r.quizId === param(req.params.id))
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
