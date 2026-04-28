import { Router } from "express";
import { z } from "zod";
import { db, computeLevel, xpForLevel } from "../store/index.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import type { User } from "../types.js";

const router = Router();

function safeUser(user: User) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

// GET /api/users/leaderboard
router.get("/leaderboard", (_req, res) => {
  const top = [...db.users.values()]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20)
    .map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      level: u.level,
      xp: u.xp,
      streak: u.streak,
      completedCourses: u.completedCourses.length,
    }));
  res.json(top);
});

// GET /api/users/profile  (own)
router.get("/profile", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!);
    if (!user) throw new AppError("User not found", 404);
    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/profile
router.patch("/profile", requireAuth, (req, res, next) => {
  try {
    const UpdateSchema = z.object({
      name: z.string().min(2).max(80).optional(),
      bio: z.string().max(300).optional(),
      avatar: z.string().url().optional(),
    });
    const body = UpdateSchema.parse(req.body);
    const user = db.users.get(req.userId!);
    if (!user) throw new AppError("User not found", 404);
    Object.assign(user, body);
    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
});

// GET /api/users/stats
router.get("/stats", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!);
    if (!user) throw new AppError("User not found", 404);

    const currentLevelXp = xpForLevel(user.level);
    const nextLevelXp = xpForLevel(user.level + 1);
    const xpInCurrentLevel = user.xp - currentLevelXp;
    const xpNeededForNext = nextLevelXp - currentLevelXp;

    const enrollments = [...db.enrollments.values()].filter((e) => e.userId === user.id);
    const quizResults = [...db.quizResults.values()].filter((r) => r.userId === user.id);
    const avgScore =
      quizResults.length > 0
        ? Math.round(quizResults.reduce((s, r) => s + (r.score / r.totalQuestions) * 100, 0) / quizResults.length)
        : 0;

    res.json({
      level: user.level,
      xp: user.xp,
      coins: user.coins,
      streak: user.streak,
      xpInCurrentLevel,
      xpNeededForNext,
      xpProgressPercent: Math.round((xpInCurrentLevel / xpNeededForNext) * 100),
      enrolledCourses: user.enrolledCourses.length,
      completedCourses: user.completedCourses.length,
      totalQuizzesTaken: quizResults.length,
      avgQuizScore: avgScore,
      badges: user.badges.length,
      completedQuests: user.completedQuests.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get("/:id", (req, res, next) => {
  try {
    const user = db.users.get(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    const { passwordHash: _, email: __, ...publicProfile } = user;
    res.json(publicProfile);
  } catch (err) {
    next(err);
  }
});

export default router;
