import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db, computeLevel } from "../store/index.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import type { User } from "../types.js";

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function safeUser(user: User) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const existing = [...db.users.values()].find((u) => u.email === body.email);
    if (existing) throw new AppError("Email already in use", 409);

    const user: User = {
      id: uuid(),
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name)}&background=6366f1&color=fff&size=128`,
      bio: "",
      level: 1,
      xp: 0,
      coins: 100,
      streak: 0,
      lastActive: new Date().toISOString(),
      badges: [],
      inventory: [],
      enrolledCourses: [],
      completedCourses: [],
      acceptedQuests: [],
      completedQuests: [],
      createdAt: new Date().toISOString(),
    };

    db.users.set(user.id, user);

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    db.refreshTokens.add(refreshToken);

    res.status(201).json({ accessToken, refreshToken, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = [...db.users.values()].find((u) => u.email === body.email);
    if (!user) throw new AppError("Invalid email or password", 401);

    const valid = await comparePassword(body.password, user.passwordHash);
    if (!valid) throw new AppError("Invalid email or password", 401);

    user.lastActive = new Date().toISOString();

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    db.refreshTokens.add(refreshToken);

    res.json({ accessToken, refreshToken, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/refresh", (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);

    if (!db.refreshTokens.has(refreshToken)) throw new AppError("Invalid refresh token", 401);

    const payload = verifyRefreshToken(refreshToken);
    const user = db.users.get(payload.userId);
    if (!user) throw new AppError("User not found", 401);

    db.refreshTokens.delete(refreshToken);
    const newAccess = signAccessToken({ userId: user.id, email: user.email });
    const newRefresh = signRefreshToken({ userId: user.id, email: user.email });
    db.refreshTokens.add(newRefresh);

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) db.refreshTokens.delete(refreshToken);
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res, next) => {
  try {
    const user = db.users.get(req.userId!);
    if (!user) throw new AppError("User not found", 404);
    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
