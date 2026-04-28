import { Router } from "express";
import { db } from "../store/index.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/certificates  (user's certificates)
router.get("/", requireAuth, (req, res) => {
  const certs = [...db.certificates.values()]
    .filter((c) => c.userId === req.userId!)
    .map((c) => ({ ...c, course: db.courses.get(c.courseId) }));
  res.json(certs);
});

// GET /api/certificates/verify/:code  (public endpoint)
router.get("/verify/:code", (req, res, next) => {
  try {
    const cert = [...db.certificates.values()].find(
      (c) => c.verificationCode === param(req.params.code).toUpperCase()
    );
    if (!cert) throw new AppError("Certificate not found or invalid code", 404);
    const user = db.users.get(cert.userId);
    const course = db.courses.get(cert.courseId);
    res.json({
      valid: true,
      certificate: cert,
      holder: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
      course: course ? { id: course.id, title: course.title, instructor: course.instructor } : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/:id
router.get("/:id", requireAuth, (req, res, next) => {
  try {
    const cert = db.certificates.get(param(req.params.id));
    if (!cert) throw new AppError("Certificate not found", 404);
    if (cert.userId !== req.userId!) throw new AppError("Forbidden", 403);
    const course = db.courses.get(cert.courseId);
    const user = db.users.get(cert.userId);
    res.json({ ...cert, course, holder: user ? { name: user.name, level: user.level } : null });
  } catch (err) {
    next(err);
  }
});

export default router;
