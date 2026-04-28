import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db, computeLevel } from "../store/index.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

function duelView(d: ReturnType<typeof db.duels.get> & object) {
  const challenger = db.users.get(d.challengerId);
  const challenged = db.users.get(d.challengedId);
  return {
    ...d,
    challenger: challenger ? { id: challenger.id, name: challenger.name, avatar: challenger.avatar, level: challenger.level } : null,
    challenged: challenged ? { id: challenged.id, name: challenged.name, avatar: challenged.avatar, level: challenged.level } : null,
    course: db.courses.get(d.courseId),
  };
}

// GET /api/duels
router.get("/", requireAuth, (req, res) => {
  const myDuels = [...db.duels.values()]
    .filter((d) => d.challengerId === req.userId! || d.challengedId === req.userId!)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(duelView);
  res.json(myDuels);
});

// POST /api/duels/challenge
router.post("/challenge", requireAuth, (req, res, next) => {
  try {
    const body = z.object({ challengedId: z.string(), courseId: z.string() }).parse(req.body);
    if (body.challengedId === req.userId!) throw new AppError("Cannot challenge yourself", 400);
    if (!db.users.has(body.challengedId)) throw new AppError("User not found", 404);
    if (!db.courses.has(body.courseId)) throw new AppError("Course not found", 404);
    const duel = {
      id: uuid(),
      challengerId: req.userId!,
      challengedId: body.challengedId,
      courseId: body.courseId,
      status: "pending" as const,
      scores: {} as Record<string, number>,
      createdAt: new Date().toISOString(),
    };
    db.duels.set(duel.id, duel);
    res.status(201).json(duel);
  } catch (err) {
    next(err);
  }
});

// GET /api/duels/:id
router.get("/:id", requireAuth, (req, res, next) => {
  try {
    const duel = db.duels.get(param(req.params.id));
    if (!duel) throw new AppError("Duel not found", 404);
    if (duel.challengerId !== req.userId! && duel.challengedId !== req.userId!) throw new AppError("Not your duel", 403);
    res.json(duelView(duel));
  } catch (err) {
    next(err);
  }
});

// POST /api/duels/:id/accept
router.post("/:id/accept", requireAuth, (req, res, next) => {
  try {
    const duel = db.duels.get(param(req.params.id));
    if (!duel) throw new AppError("Duel not found", 404);
    if (duel.challengedId !== req.userId!) throw new AppError("Not the challenged user", 403);
    if (duel.status !== "pending") throw new AppError("Duel already started or completed", 400);
    duel.status = "active";
    res.json({ message: "Duel accepted! Game on!", duel: duelView(duel) });
  } catch (err) {
    next(err);
  }
});

// POST /api/duels/:id/submit
router.post("/:id/submit", requireAuth, (req, res, next) => {
  try {
    const duel = db.duels.get(param(req.params.id));
    if (!duel) throw new AppError("Duel not found", 404);
    if (duel.challengerId !== req.userId! && duel.challengedId !== req.userId!) throw new AppError("Not your duel", 403);
    if (duel.status === "completed") throw new AppError("Duel already completed", 400);
    if (duel.status !== "active") throw new AppError("Duel not yet active", 400);

    const { score } = z.object({ score: z.number().int().min(0).max(100) }).parse(req.body);
    duel.scores[req.userId!] = score;

    const bothSubmitted =
      duel.scores[duel.challengerId] !== undefined && duel.scores[duel.challengedId] !== undefined;

    if (bothSubmitted) {
      duel.status = "completed";
      const cs = duel.scores[duel.challengerId] ?? 0;
      const ds = duel.scores[duel.challengedId] ?? 0;
      if (cs !== ds) {
        duel.winnerId = cs > ds ? duel.challengerId : duel.challengedId;
        const winner = db.users.get(duel.winnerId)!;
        winner.xp += 100;
        winner.coins += 25;
        winner.level = computeLevel(winner.xp);
      }
    }

    res.json({ duel: duelView(duel), bothSubmitted });
  } catch (err) {
    next(err);
  }
});

// POST /api/duels/:id/decline
router.post("/:id/decline", requireAuth, (req, res, next) => {
  try {
    const duel = db.duels.get(param(req.params.id));
    if (!duel) throw new AppError("Duel not found", 404);
    if (duel.challengedId !== req.userId!) throw new AppError("Not the challenged user", 403);
    if (duel.status !== "pending") throw new AppError("Duel already started or completed", 400);
    db.duels.delete(duel.id);
    res.json({ message: "Duel declined" });
  } catch (err) {
    next(err);
  }
});

export default router;
