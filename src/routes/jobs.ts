import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../store/index.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/jobs
router.get("/", optionalAuth, (req, res) => {
  const { type, search, tags, limit = "20", offset = "0" } = req.query as Record<string, string>;

  let jobs = [...db.jobs.values()];
  if (type) jobs = jobs.filter((j) => j.type === type);
  if (tags) {
    const tagList = tags.split(",");
    jobs = jobs.filter((j) => tagList.some((t) => j.tags.includes(t)));
  }
  if (search) {
    const q = search.toLowerCase();
    jobs = jobs.filter(
      (j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    );
  }

  const total = jobs.length;
  const paginated = jobs.slice(Number(offset), Number(offset) + Number(limit));
  const withApplied = paginated.map((j) => ({
    ...j,
    applied: req.userId
      ? [...db.jobApplications.values()].some((a) => a.userId === req.userId && a.jobId === j.id)
      : false,
  }));

  res.json({ total, jobs: withApplied });
});

// GET /api/jobs/applied
router.get("/applied", requireAuth, (req, res) => {
  const applications = [...db.jobApplications.values()]
    .filter((a) => a.userId === req.userId!)
    .map((a) => ({ ...a, job: db.jobs.get(a.jobId) }));
  res.json(applications);
});

// GET /api/jobs/:id
router.get("/:id", optionalAuth, (req, res, next) => {
  try {
    const job = db.jobs.get(param(req.params.id));
    if (!job) throw new AppError("Job not found", 404);
    const applied = req.userId
      ? [...db.jobApplications.values()].some((a) => a.userId === req.userId && a.jobId === job.id)
      : false;
    res.json({ ...job, applied });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/apply
router.post("/:id/apply", requireAuth, (req, res, next) => {
  try {
    const job = db.jobs.get(param(req.params.id));
    if (!job) throw new AppError("Job not found", 404);
    const alreadyApplied = [...db.jobApplications.values()].some(
      (a) => a.userId === req.userId! && a.jobId === job.id
    );
    if (alreadyApplied) throw new AppError("Already applied to this job", 409);
    const application = {
      id: uuid(),
      userId: req.userId!,
      jobId: job.id,
      appliedAt: new Date().toISOString(),
      status: "applied" as const,
    };
    db.jobApplications.set(application.id, application);
    const user = db.users.get(req.userId!)!;
    user.coins += 5;
    res.status(201).json({ message: "Application submitted!", application });
  } catch (err) {
    next(err);
  }
});

export default router;
