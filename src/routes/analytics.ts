import { Router } from "express";
import { db, xpForLevel } from "../store/index.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

// GET /api/analytics/me
router.get("/me", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!)!;

    const enrollments = [...db.enrollments.values()].filter((e) => e.userId === user.id);
    const quizResults = [...db.quizResults.values()]
      .filter((r) => r.userId === user.id)
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

    const avgScore =
      quizResults.length > 0
        ? Math.round(quizResults.reduce((s, r) => s + (r.score / r.totalQuestions) * 100, 0) / quizResults.length)
        : 0;

    const xpOverTime = quizResults.map((r) => ({
      date: r.completedAt.slice(0, 10),
      xp: r.xpEarned,
    }));

    const courseProgress = enrollments.map((e) => ({
      courseId: e.courseId,
      title: db.courses.get(e.courseId)?.title ?? "Unknown",
      progress: e.progress,
    }));

    const currentLevelXp = xpForLevel(user.level);
    const nextLevelXp = xpForLevel(user.level + 1);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        level: user.level,
        xp: user.xp,
        coins: user.coins,
        streak: user.streak,
        xpToNextLevel: nextLevelXp - user.xp,
        xpProgressPercent: Math.round(((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100),
      },
      enrollments: enrollments.length,
      completedCourses: user.completedCourses.length,
      totalQuizzesTaken: quizResults.length,
      avgQuizScore: avgScore,
      completedQuests: user.completedQuests.length,
      badges: user.badges.length,
      xpOverTime,
      courseProgress,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/leaderboard
router.get("/leaderboard", (_req, res) => {
  const top = [...db.users.values()]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50)
    .map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      level: u.level,
      xp: u.xp,
      coins: u.coins,
      streak: u.streak,
      completedCourses: u.completedCourses.length,
      badges: u.badges.length,
    }));

  res.json(top);
});

// GET /api/analytics/trending
router.get("/trending", (_req, res) => {
  const trending = [...db.courses.values()]
    .sort((a, b) => b.enrolledCount - a.enrolledCount)
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      rating: c.rating,
      enrolledCount: c.enrolledCount,
      difficulty: c.difficulty,
      thumbnail: c.thumbnail,
    }));

  res.json(trending);
});

// GET /api/analytics/platform
router.get("/platform", (_req, res) => {
  const totalUsers = db.users.size;
  const totalEnrollments = db.enrollments.size;
  const totalCertificates = db.certificates.size;
  const totalQuizzes = db.quizResults.size;

  const categoryCounts: Record<string, number> = {};
  for (const c of db.courses.values()) {
    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + c.enrolledCount;
  }

  res.json({
    totalUsers,
    totalEnrollments,
    totalCertificates,
    totalQuizzesTaken: totalQuizzes,
    popularCategories: Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ category, count })),
  });
});

export default router;
