
export interface Player {
  // Unique identity (Supabase Auth user id when available)
  id?: string;
  name: string; // display name
  score: number;
  status?: 'active' | 'banned';
  email?: string;
  sessionToken?: string; // Persistent session token for authentication
  attempts?: Attempt[]; // Player's game attempts history
  achievements?: Achievement[]; // Unlocked achievements
  pinHash?: string; // Secure PIN hash for account recovery
  // Profile fields
  bio?: string;
  avatarUrl?: string;
  profileVisibility?: 'public' | 'private' | 'friends';
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
  };
  createdAt?: string; // ISO timestamp
}

// Public profile data (excludes sensitive fields)
export interface PublicPlayer {
  name: string;
  score: number;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
  };
  achievements: Achievement[];
  stats: PlayerStats;
  createdAt: string;
}

export type Page = 'home' | 'games' | 'leaderboard' | 'profile' | 'teams' | 'admin';

export interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
  isTyping?: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RubricItem {
  criteria: string;
  points: number;
  description: string;
}


export interface ValidationResult {
  score: number;
  checks: Record<string, boolean>;
  feedback: string[];
  strengths: string[];
  similarityScore?: number;
}

export interface ValidationConfig {
  minWords?: number;
  maxWords?: number;
  minChars?: number;
  minSentences?: number;
  recommendedMinWords?: number;
  keywords?: string[];
  location?: string;
  requiresBoolean?: boolean;
  requiresParentheses?: boolean;
  requiresSite?: boolean;
  forbiddenPhrases?: string[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  task: string;
  context?: string;
  placeholder: string;
  promptGenerator: (
    submission: string,
    rubric?: RubricItem[],
    validation?: ValidationResult
  ) => string;
  exampleSolution?: string;
  difficulty: Difficulty;
  skillCategory: SkillCategory;
  rubric?: RubricItem[];
  validation?: Record<string, unknown>;
  featured?: boolean;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  averageScore: number;
  bestScore: number;
  totalPoints: number;
  gameBreakdown: {
    gameId: string;
    gameTitle: string;
    attempts: number;
    bestScore: number;
  }[];
}

export type SkillCategory =
  | 'boolean'           // Boolean search strings
  | 'xray'             // Google X-ray searches
  | 'persona'          // Candidate profiling
  | 'outreach'         // Candidate messaging
  | 'linkedin'         // LinkedIn-specific sourcing
  | 'diversity'        // Diversity & inclusion sourcing
  | 'ats'              // ATS/CRM usage
  | 'screening'        // Resume/profile screening
  | 'job-description'  // Writing effective JDs
  | 'ai-prompting'     // AI Prompt Engineering
  | 'negotiation'      // Closing & Objection Handling
  | 'talent-intelligence'; // Market Mapping & Strategy

export type TimeFilter = 'all-time' | 'weekly' | 'monthly';

export interface Attempt {
  gameId: string;
  gameTitle: string;
  submission: string;
  score: number;
  skill?: SkillCategory;
  ts: string; // ISO timestamp
  feedback?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  category: 'score' | 'games' | 'streak' | 'skill' | 'special';
  unlockedAt?: string; // ISO timestamp
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'score' | 'games' | 'streak' | 'skill' | 'special';
  checkUnlock: (player: Player) => boolean; // Function to check if achievement is unlocked
}

// Admin Dashboard Types
export type AdminAnalytics = {
  totalPlayers: number;
  active7d: number;
  active30d: number;
  attempts7d: number;
  attempts30d: number;
  repeatPlayers: number;
  churned14d: number;
  gameStats: { gameId: string; gameTitle: string; attempts: number; avgScore: number }[];
};

export type AdminPlayer = {
  id: string;
  name: string;
  score: number;
  status: 'active' | 'banned';
  totalAttempts: number;
  lastAttemptAt?: string | null;
};

export type AdminAttempt = {
  attemptId: string;
  playerId: string;
  playerName: string;
  gameId: string;
  gameTitle: string;
  submission: string;
  score: number;
  ts: string;
};

export type GameOverride = {
  id: string;
  title?: string;
  description?: string;
  task?: string;
  prompt_template?: string;
  rubric_json?: any;
  featured?: boolean;
  active?: boolean;
};

// Team Competition Types
export interface Team {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  logoUrl?: string;
  createdBy: string; // Player name
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  maxMembers: number;
  isActive: boolean;
  // Computed fields (not in DB)
  averageScore?: number;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  // Computed fields
  score?: number;
}

export interface TeamLeaderboardEntry {
  team: Team;
  averageScore: number;
  totalMembers: number;
  rank: number;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  logoUrl?: string;
}
