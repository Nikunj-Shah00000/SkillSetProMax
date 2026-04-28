import { Router } from "express";
import { db } from "../store/index.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/achievements
router.get("/", optionalAuth, (req, res) => {
  const all = [...db.achievements.values()];
  if (!req.userId) return res.json(all.map((a) => ({ ...a, earned: false })));
  const user = db.users.get(req.userId)!;
  res.json(all.map((a) => ({ ...a, earned: user.badges.includes(a.id) })));
});

// GET /api/achievements/user  (earned only)
router.get("/user", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!)!;
    const earned = user.badges
      .map((id) => db.achievements.get(id))
      .filter(Boolean)
      .map((a) => ({ ...a, earned: true }));
    res.json(earned);
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements/:id
router.get("/:id", optionalAuth, (req, res, next) => {
  try {
    const ach = db.achievements.get(param(req.params.id));
    if (!ach) throw new AppError("Achievement not found", 404);
    const earned = req.userId ? db.users.get(req.userId)?.badges.includes(ach.id) ?? false : false;
    res.json({ ...ach, earned });
  } catch (err) {
    next(err);
  }
});

// POST /api/achievements/:id/award
router.post("/:id/award", requireAuth, (req, res, next) => {
  try {
    const ach = db.achievements.get(param(req.params.id));
    if (!ach) throw new AppError("Achievement not found", 404);
    const user = db.users.get(req.userId!)!;
    if (user.badges.includes(ach.id)) throw new AppError("Achievement already earned", 409);
    user.badges.push(ach.id);
    user.xp += ach.xpReward;
    res.json({ message: `Achievement '${ach.name}' unlocked!`, xpEarned: ach.xpReward });
  } catch (err) {
    next(err);
  }
});

export default router;
