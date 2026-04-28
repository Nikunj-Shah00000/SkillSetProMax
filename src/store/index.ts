import { v4 as uuid } from "uuid";
import type {
  User,
  Course,
  Quiz,
  Quest,
  Job,
  Achievement,
  MarketplaceItem,
  Certificate,
  StudyGroup,
  Duel,
  Enrollment,
  QuizResult,
  JobApplication,
} from "../types.js";
import {
  SEED_COURSES,
  SEED_QUIZZES,
  SEED_QUESTS,
  SEED_JOBS,
  SEED_ACHIEVEMENTS,
  SEED_MARKETPLACE,
} from "./seed.js";

// ─── In-memory collections ────────────────────────────────────────────────────

export const db = {
  users: new Map<string, User>(),
  enrollments: new Map<string, Enrollment>(),
  quizResults: new Map<string, QuizResult>(),
  jobApplications: new Map<string, JobApplication>(),
  certificates: new Map<string, Certificate>(),
  studyGroups: new Map<string, StudyGroup>(),
  duels: new Map<string, Duel>(),
  userQuests: new Map<string, { userId: string; questId: string; progress: number; accepted: boolean; completed: boolean }>(),
  refreshTokens: new Set<string>(),

  // Read-only seed collections
  courses: new Map<string, Course>(SEED_COURSES.map((c) => [c.id, c])),
  quizzes: new Map<string, Quiz>(SEED_QUIZZES.map((q) => [q.id, q])),
  quests: new Map<string, Quest>(SEED_QUESTS.map((q) => [q.id, q])),
  jobs: new Map<string, Job>(SEED_JOBS.map((j) => [j.id, j])),
  achievements: new Map<string, Achievement>(SEED_ACHIEVEMENTS.map((a) => [a.id, a])),
  marketplace: new Map<string, MarketplaceItem>(SEED_MARKETPLACE.map((i) => [i.id, i])),
};

// ─── Demo user ────────────────────────────────────────────────────────────────

import { hashPassword } from "../utils/hash.js";

(async () => {
  const hash = await hashPassword("password123");
  const demoUser: User = {
    id: "user-demo",
    name: "Arjun Sharma",
    email: "demo@skillsetpromax.com",
    passwordHash: hash,
    avatar: "https://ui-avatars.com/api/?name=Arjun+Sharma&background=6366f1&color=fff&size=128",
    bio: "Passionate full-stack developer on a mission to master everything.",
    level: 5,
    xp: 2350,
    coins: 480,
    streak: 12,
    lastActive: new Date().toISOString(),
    badges: ["ach-1", "ach-2"],
    inventory: ["item-6"],
    enrolledCourses: ["course-1", "course-2"],
    completedCourses: [],
    acceptedQuests: ["quest-1", "quest-2"],
    completedQuests: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  db.users.set(demoUser.id, demoUser);

  // Demo enrollment
  db.enrollments.set(`${demoUser.id}-course-1`, {
    id: uuid(),
    userId: demoUser.id,
    courseId: "course-1",
    progress: 60,
    completedChapters: ["ch-1-1", "ch-1-2", "ch-1-3"],
    enrolledAt: "2026-01-05T00:00:00.000Z",
  });
  db.enrollments.set(`${demoUser.id}-course-2`, {
    id: uuid(),
    userId: demoUser.id,
    courseId: "course-2",
    progress: 20,
    completedChapters: ["ch-2-1"],
    enrolledAt: "2026-02-10T00:00:00.000Z",
  });
})();

// ─── XP thresholds ─────────────────────────────────────────────────────────────

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function computeLevel(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getEnrollment(userId: string, courseId: string): Enrollment | undefined {
  return db.enrollments.get(`${userId}-${courseId}`);
}

export function setEnrollment(enrollment: Enrollment): void {
  db.enrollments.set(`${enrollment.userId}-${enrollment.courseId}`, enrollment);
}

export function createId(): string {
  return uuid();
}
