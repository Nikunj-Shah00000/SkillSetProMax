import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import coursesRouter from "./courses.js";
import quizzesRouter from "./quizzes.js";
import questsRouter from "./quests.js";
import jobsRouter from "./jobs.js";
import achievementsRouter from "./achievements.js";
import marketplaceRouter from "./marketplace.js";
import analyticsRouter from "./analytics.js";
import certificatesRouter from "./certificates.js";
import studyGroupsRouter from "./studyGroups.js";
import duelsRouter from "./duels.js";

const router = Router();

router.use("/healthz", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/courses", coursesRouter);
router.use("/quizzes", quizzesRouter);
router.use("/quests", questsRouter);
router.use("/jobs", jobsRouter);
router.use("/achievements", achievementsRouter);
router.use("/marketplace", marketplaceRouter);
router.use("/analytics", analyticsRouter);
router.use("/certificates", certificatesRouter);
router.use("/study-groups", studyGroupsRouter);
router.use("/duels", duelsRouter);

export default router;
