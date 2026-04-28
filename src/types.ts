export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  bio: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  lastActive: string;
  badges: string[];
  inventory: string[];
  enrolledCourses: string[];
  completedCourses: string[];
  acceptedQuests: string[];
  completedQuests: string[];
  createdAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  duration: string;
  order: number;
  content: string;
  videoUrl?: string;
  xpReward: number;
  hasQuiz: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  xpReward: number;
  coinReward: number;
  thumbnail: string;
  rating: number;
  duration: string;
  chapters: Chapter[];
  tags: string[];
  enrolledCount: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  chapterId?: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "epic";
  xp: number;
  coins: number;
  target: number;
  icon: string;
  deadline?: string;
  tags: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "internship" | "remote";
  salary: string;
  description: string;
  requirements: string[];
  posted: string;
  tags: string[];
  logoUrl: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xpReward: number;
  condition: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "avatar" | "theme" | "powerup" | "badge" | "boost";
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issuedAt: string;
  verificationCode: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  courseId: string;
  ownerId: string;
  members: string[];
  maxMembers: number;
  createdAt: string;
}

export interface Duel {
  id: string;
  challengerId: string;
  challengedId: string;
  courseId: string;
  status: "pending" | "active" | "completed";
  scores: Record<string, number>;
  winnerId?: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completedChapters: string[];
  enrolledAt: string;
  completedAt?: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  courseId: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  xpEarned: number;
  completedAt: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  jobId: string;
  appliedAt: string;
  status: "applied" | "reviewing" | "rejected" | "accepted";
}

export type JwtPayload = {
  userId: string;
  email: string;
};
