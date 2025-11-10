
export interface Player {
  // Unique identity (Supabase Auth user id when available)
  id?: string;
  name: string; // display name
  score: number;
  email?: string;
}

export type Page = 'home' | 'games' | 'leaderboard';

export interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
  isTyping?: boolean;
}

export interface Game {
    id: string;
    title: string;
    description: string;
    task: string;
    context?: string;
    placeholder: string;
    promptGenerator: (submission: string) => string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}


export type SkillCategory = 'boolean' | 'xray' | 'enrichment';

export interface Attempt {
  gameId: string;
  submission: string;
  score: number;
  skill?: SkillCategory;
  ts: string; // ISO timestamp
  feedback?: string;
}
