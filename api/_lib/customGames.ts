import type { Game, RubricItem, Difficulty, SkillCategory } from '../../types.js';
import { rubricByDifficulty } from '../../utils/rubrics.js';

type CustomGameConfig = {
  isCustom?: boolean;
  difficulty?: Difficulty;
  skillCategory?: SkillCategory;
  placeholder?: string;
  exampleSolution?: string;
  validation?: Record<string, unknown>;
  rubric?: RubricItem[];
  isTeamGame?: boolean;
};

const parseConfig = (value: unknown): CustomGameConfig => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') {
    return value as CustomGameConfig;
  }
  return {};
};

export const getCustomGameConfig = (override: any): CustomGameConfig => {
  const config = parseConfig(override?.rubric_json);
  return {
    isCustom: config.isCustom ?? true,
    difficulty: config.difficulty,
    skillCategory: config.skillCategory,
    placeholder: config.placeholder,
    exampleSolution: config.exampleSolution,
    validation: config.validation,
    rubric: Array.isArray(config.rubric) ? config.rubric : undefined,
    isTeamGame: Boolean(config.isTeamGame),
  };
};

export const buildCustomGameFromOverride = (override: any): Game | null => {
  if (!override?.id) return null;
  const config = getCustomGameConfig(override);
  const difficulty: Difficulty = config.difficulty ?? 'easy';
  const skillCategory: SkillCategory = config.skillCategory ?? 'boolean';
  const placeholder = config.placeholder || 'Write your response here.';
  const rubricItems = Array.isArray(config.rubric) ? config.rubric : rubricByDifficulty[difficulty];

  const promptGenerator = (
    submission: string,
    rubricOverride?: RubricItem[]
  ) => {
    const rubric = rubricOverride && rubricOverride.length > 0 ? rubricOverride : rubricItems;
    const rubricText = rubric.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n');

    return `You are an AI coach scoring a custom sourcing game.

Game: ${override.title || 'Custom Game'}
Task: ${override.task || 'Complete the task as described.'}
Difficulty: ${difficulty}
Skill Category: ${skillCategory}

Rubric:
${rubricText}

Submission:
"${submission}"

Provide a fair score and actionable feedback.`;
  };

  return {
    id: override.id,
    title: override.title || 'Custom Game',
    description: override.description || 'Custom game created by an admin.',
    task: override.task || 'Complete the task as described.',
    placeholder,
    promptGenerator,
    exampleSolution: config.exampleSolution || undefined,
    difficulty,
    skillCategory,
    rubric: Array.isArray(config.rubric) ? config.rubric : undefined,
    validation: config.validation,
    featured: Boolean(override.featured),
    isTeamGame: Boolean(config.isTeamGame),
  };
};

export const isCustomOverride = (override: any, baseGameIds: Set<string>): boolean =>
  Boolean(override?.id) && !baseGameIds.has(override.id);
