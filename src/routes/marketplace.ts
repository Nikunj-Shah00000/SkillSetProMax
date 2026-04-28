import { Router } from "express";
import { db } from "../store/index.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/marketplace
router.get("/", optionalAuth, (req, res) => {
  const items = [...db.marketplace.values()];
  if (!req.userId) return res.json(items.map((i) => ({ ...i, owned: false })));
  const user = db.users.get(req.userId)!;
  res.json(items.map((i) => ({ ...i, owned: user.inventory.includes(i.id) })));
});

// GET /api/marketplace/inventory
router.get("/inventory", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!)!;
    const items = user.inventory
      .map((id) => db.marketplace.get(id))
      .filter(Boolean)
      .map((i) => ({ ...i!, owned: true }));
    res.json({ coins: user.coins, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/marketplace/:id
router.get("/:id", optionalAuth, (req, res, next) => {
  try {
    const item = db.marketplace.get(param(req.params.id));
    if (!item) throw new AppError("Item not found", 404);
    const owned = req.userId ? db.users.get(req.userId)?.inventory.includes(item.id) ?? false : false;
    res.json({ ...item, owned });
  } catch (err) {
    next(err);
  }
});

// POST /api/marketplace/:id/purchase
router.post("/:id/purchase", requireAuth, (req, res, next) => {
  try {
    const item = db.marketplace.get(param(req.params.id));
    if (!item) throw new AppError("Item not found", 404);
    const user = db.users.get(req.userId!)!;
    if (user.inventory.includes(item.id)) throw new AppError("Item already owned", 409);
    if (user.coins < item.price) throw new AppError(`Not enough coins (need ${item.price}, have ${user.coins})`, 400);
    user.coins -= item.price;
    user.inventory.push(item.id);
    res.json({ message: `${item.name} purchased!`, remainingCoins: user.coins, item });
  } catch (err) {
    next(err);
  }
});

export default router;
