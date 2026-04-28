import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../store/index.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { param } from "../utils/params.js";

const router = Router();

// GET /api/study-groups
router.get("/", optionalAuth, (req, res) => {
  const { courseId } = req.query as Record<string, string>;
  let groups = [...db.studyGroups.values()];
  if (courseId) groups = groups.filter((g) => g.courseId === courseId);
  res.json(groups.map((g) => ({
    ...g,
    course: db.courses.get(g.courseId),
    memberCount: g.members.length,
    isMember: req.userId ? g.members.includes(req.userId) : false,
  })));
});

// POST /api/study-groups
router.post("/", requireAuth, (req, res, next) => {
  try {
    const CreateSchema = z.object({
      name: z.string().min(3).max(80),
      description: z.string().max(500),
      courseId: z.string(),
      maxMembers: z.number().int().min(2).max(50).default(10),
    });
    const body = CreateSchema.parse(req.body);
    const course = db.courses.get(body.courseId);
    if (!course) throw new AppError("Course not found", 404);
    const group = {
      id: uuid(),
      name: body.name,
      description: body.description,
      courseId: body.courseId,
      ownerId: req.userId!,
      members: [req.userId!],
      maxMembers: body.maxMembers,
      createdAt: new Date().toISOString(),
    };
    db.studyGroups.set(group.id, group);
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

// GET /api/study-groups/:id
router.get("/:id", optionalAuth, (req, res, next) => {
  try {
    const group = db.studyGroups.get(param(req.params.id));
    if (!group) throw new AppError("Study group not found", 404);
    const members = group.members
      .map((id) => db.users.get(id))
      .filter(Boolean)
      .map((u) => ({ id: u!.id, name: u!.name, avatar: u!.avatar, level: u!.level }));
    res.json({
      ...group,
      course: db.courses.get(group.courseId),
      members,
      isMember: req.userId ? group.members.includes(req.userId) : false,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study-groups/:id/join
router.post("/:id/join", requireAuth, (req, res, next) => {
  try {
    const group = db.studyGroups.get(param(req.params.id));
    if (!group) throw new AppError("Study group not found", 404);
    if (group.members.includes(req.userId!)) throw new AppError("Already a member", 409);
    if (group.members.length >= group.maxMembers) throw new AppError("Group is full", 400);
    group.members.push(req.userId!);
    res.json({ message: "Joined study group", memberCount: group.members.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/study-groups/:id/leave
router.post("/:id/leave", requireAuth, (req, res, next) => {
  try {
    const group = db.studyGroups.get(param(req.params.id));
    if (!group) throw new AppError("Study group not found", 404);
    if (!group.members.includes(req.userId!)) throw new AppError("Not a member", 400);
    if (group.ownerId === req.userId!) throw new AppError("Owner cannot leave; delete the group instead", 400);
    group.members = group.members.filter((id) => id !== req.userId!);
    res.json({ message: "Left study group" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/study-groups/:id
router.delete("/:id", requireAuth, (req, res, next) => {
  try {
    const group = db.studyGroups.get(param(req.params.id));
    if (!group) throw new AppError("Study group not found", 404);
    if (group.ownerId !== req.userId!) throw new AppError("Only the owner can delete this group", 403);
    db.studyGroups.delete(group.id);
    res.json({ message: "Study group deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
