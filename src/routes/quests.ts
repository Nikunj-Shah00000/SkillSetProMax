import { Router } from "express";
import { db, computeLevel } from "../store/index.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/quests
router.get("/", optionalAuth, (req, res) => {
  const quests = [...db.quests.values()];
  if (!req.userId) return res.json(quests);
  const user = db.users.get(req.userId)!;
  res.json(quests.map((q) => ({
    ...q,
    accepted: user.acceptedQuests.includes(q.id),
    completed: user.completedQuests.includes(q.id),
    progress: db.userQuests.get(`${req.userId}-${q.id}`)?.progress ?? 0,
  })));
});

// GET /api/quests/active
router.get("/active", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!)!;
    const active = user.acceptedQuests
      .filter((qid) => !user.completedQuests.includes(qid))
      .map((qid) => {
        const quest = db.quests.get(qid);
        if (!quest) return null;
        return { ...quest, progress: db.userQuests.get(`${req.userId}-${qid}`)?.progress ?? 0 };
      })
      .filter(Boolean);
    res.json(active);
  } catch (err) {
    next(err);
  }
});

// GET /api/quests/:id
router.get("/:id", optionalAuth, (req, res, next) => {
  try {
    const quest = db.quests.get(param(req.params.id));
    if (!quest) throw new AppError("Quest not found", 404);
    res.json(quest);
  } catch (err) {
    next(err);
  }
});

// POST /api/quests/:id/accept
router.post("/:id/accept", requireAuth, (req, res, next) => {
  try {
    const quest = db.quests.get(param(req.params.id));
    if (!quest) throw new AppError("Quest not found", 404);
    const user = db.users.get(req.userId!)!;
    if (user.acceptedQuests.includes(quest.id)) throw new AppError("Quest already accepted", 409);
    user.acceptedQuests.push(quest.id);
    db.userQuests.set(`${user.id}-${quest.id}`, {
      userId: user.id, questId: quest.id, progress: 0, accepted: true, completed: false,
    });
    res.json({ message: "Quest accepted", quest });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/quests/:id/progress
router.patch("/:id/progress", requireAuth, (req, res, next) => {
  try {
    const quest = db.quests.get(param(req.params.id));
    if (!quest) throw new AppError("Quest not found", 404);
    const user = db.users.get(req.userId!)!;
    if (!user.acceptedQuests.includes(quest.id)) throw new AppError("Quest not accepted", 400);
    if (user.completedQuests.includes(quest.id)) throw new AppError("Quest already completed", 409);
    const key = `${user.id}-${quest.id}`;
    const uq = db.userQuests.get(key) ?? { userId: user.id, questId: quest.id, progress: 0, accepted: true, completed: false };
    uq.progress = Math.min(uq.progress + 1, quest.target);
    db.userQuests.set(key, uq);
    res.json({ progress: uq.progress, target: quest.target });
  } catch (err) {
    next(err);
  }
});

// POST /api/quests/:id/complete
router.post("/:id/complete", requireAuth, (req, res, next) => {
  try {
    const quest = db.quests.get(param(req.params.id));
    if (!quest) throw new AppError("Quest not found", 404);
    const user = db.users.get(req.userId!)!;
    if (!user.acceptedQuests.includes(quest.id)) throw new AppError("Quest not accepted", 400);
    if (user.completedQuests.includes(quest.id)) throw new AppError("Quest already completed", 409);
    const key = `${user.id}-${quest.id}`;
    const uq = db.userQuests.get(key);
    if (!uq || uq.progress < quest.target) throw new AppError("Quest requirements not met", 400);
    user.completedQuests.push(quest.id);
    user.xp += quest.xp;
    user.coins += quest.coins;
    user.level = computeLevel(user.xp);
    uq.completed = true;
    db.userQuests.set(key, uq);
    res.json({
      message: "Quest completed!",
      xpEarned: quest.xp,
      coinsEarned: quest.coins,
      userXp: user.xp,
      userLevel: user.level,
      userCoins: user.coins,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
