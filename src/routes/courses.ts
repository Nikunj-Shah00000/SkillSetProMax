import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, computeLevel, getEnrollment, setEnrollment } from "../store/index.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/courses
router.get("/", optionalAuth, (req, res) => {
  const { category, difficulty, search, limit = "20", offset = "0" } = req.query as Record<string, string>;

  let courses = [...db.courses.values()];
  if (category) courses = courses.filter((c) => c.category.toLowerCase() === category.toLowerCase());
  if (difficulty) courses = courses.filter((c) => c.difficulty === difficulty);
  if (search) {
    const q = search.toLowerCase();
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q))
    );
  }

  const total = courses.length;
  const paginated = courses.slice(Number(offset), Number(offset) + Number(limit));
  const withEnrollment = paginated.map((c) => ({
    ...c,
    enrolled: req.userId ? db.users.get(req.userId)?.enrolledCourses.includes(c.id) ?? false : false,
    progress: req.userId ? getEnrollment(req.userId, c.id)?.progress ?? 0 : 0,
  }));

  res.json({ total, courses: withEnrollment });
});

// GET /api/courses/categories
router.get("/categories", (_req, res) => {
  const cats = [...new Set([...db.courses.values()].map((c) => c.category))];
  res.json(cats);
});

// GET /api/courses/:id
router.get("/:id", optionalAuth, (req, res, next) => {
  try {
    const course = db.courses.get(param(req.params.id));
    if (!course) throw new AppError("Course not found", 404);
    const enrollment = req.userId ? getEnrollment(req.userId, course.id) : undefined;
    const quizzes = [...db.quizzes.values()]
      .filter((q) => q.courseId === course.id)
      .map(({ questions: _, ...q }) => q);
    res.json({
      ...course,
      enrolled: !!enrollment,
      progress: enrollment?.progress ?? 0,
      completedChapters: enrollment?.completedChapters ?? [],
      quizzes,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/courses/:id/enroll
router.post("/:id/enroll", requireAuth, (req, res, next) => {
  try {
    const course = db.courses.get(param(req.params.id));
    if (!course) throw new AppError("Course not found", 404);
    const user = db.users.get(req.userId!)!;
    if (user.enrolledCourses.includes(course.id)) throw new AppError("Already enrolled", 409);
    user.enrolledCourses.push(course.id);
    setEnrollment({
      id: uuid(),
      userId: user.id,
      courseId: course.id,
      progress: 0,
      completedChapters: [],
      enrolledAt: new Date().toISOString(),
    });
    (course as { enrolledCount: number }).enrolledCount += 1;
    res.status(201).json({ message: "Enrolled successfully" });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:id/progress
router.get("/:id/progress", requireAuth, (req, res, next) => {
  try {
    const course = db.courses.get(param(req.params.id));
    if (!course) throw new AppError("Course not found", 404);
    const enrollment = getEnrollment(req.userId!, course.id);
    if (!enrollment) throw new AppError("Not enrolled", 404);
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

// POST /api/courses/:courseId/chapters/:chapterId/complete
router.post("/:courseId/chapters/:chapterId/complete", requireAuth, (req, res, next) => {
  try {
    const course = db.courses.get(param(req.params.courseId));
    if (!course) throw new AppError("Course not found", 404);

    const chapter = course.chapters.find((ch) => ch.id === param(req.params.chapterId));
    if (!chapter) throw new AppError("Chapter not found", 404);

    const enrollment = getEnrollment(req.userId!, course.id);
    if (!enrollment) throw new AppError("Not enrolled", 404);

    if (!enrollment.completedChapters.includes(chapter.id)) {
      enrollment.completedChapters.push(chapter.id);
      enrollment.progress = Math.round((enrollment.completedChapters.length / course.chapters.length) * 100);

      const user = db.users.get(req.userId!)!;
      user.xp += chapter.xpReward;
      user.level = computeLevel(user.xp);

      if (enrollment.progress === 100) {
        enrollment.completedAt = new Date().toISOString();
        if (!user.completedCourses.includes(course.id)) {
          user.completedCourses.push(course.id);
          user.xp += course.xpReward;
          user.coins += course.coinReward;
          user.level = computeLevel(user.xp);

          const cert = {
            id: uuid(),
            userId: user.id,
            courseId: course.id,
            issuedAt: new Date().toISOString(),
            verificationCode: uuid().replace(/-/g, "").slice(0, 16).toUpperCase(),
          };
          db.certificates.set(cert.id, cert);
        }
      }
      setEnrollment(enrollment);
    }

    const user = db.users.get(req.userId!)!;
    res.json({
      progress: enrollment.progress,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      courseCompleted: enrollment.progress === 100,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
