import { Difficulty } from '../types';

export interface RubricItem {
    criteria: string;
    points: number;
    description: string;
}

export const rubricByDifficulty: Record<Difficulty, RubricItem[]> = {
    easy: [
        { criteria: 'Relevant Keywords', points: 30, description: 'Includes key terms related to the role/skill' },
        { criteria: 'Basic Boolean Operators', points: 25, description: 'Uses AND, OR to combine search terms' },
        { criteria: 'Search Syntax', points: 25, description: 'Proper use of quotes, parentheses, or platform syntax' },
        { criteria: 'Completeness', points: 20, description: 'Addresses all requirements in the task description' }
    ],
    medium: [
        { criteria: 'Advanced Keywords', points: 25, description: 'Includes synonyms, variations, and related terms' },
        { criteria: 'Complex Boolean Logic', points: 30, description: 'Uses AND, OR, NOT with proper grouping/nesting' },
        { criteria: 'Platform-Specific Features', points: 25, description: 'Leverages advanced search operators (site:, intitle:, etc.)' },
        { criteria: 'Optimization & Precision', points: 20, description: 'Balanced between broad and specific, avoids noise' }
    ],
    hard: [
        { criteria: 'Expert Keyword Strategy', points: 25, description: 'Comprehensive terms including industry jargon, certifications' },
        { criteria: 'Sophisticated Boolean Logic', points: 30, description: 'Multi-level nesting, excludes false positives effectively' },
        { criteria: 'Advanced Search Techniques', points: 25, description: 'Uses proximity operators, wildcards, regex where applicable' },
        { criteria: 'Strategic Optimization', points: 20, description: 'Highly targeted, considers edge cases, minimal false positives' }
    ],
    expert: [
        { criteria: 'Mastery Keyword Strategy', points: 25, description: 'Exhaustive terms including niche synonyms, certifications, and edge-case variants' },
        { criteria: 'Precision Boolean Architecture', points: 30, description: 'Highly optimized nesting, exclusions, and sequencing for signal over noise' },
        { criteria: 'Elite Search Techniques', points: 25, description: 'Advanced operators, proximity logic, and platform-specific tuning' },
        { criteria: 'Strategic Optimization', points: 20, description: 'Minimal false positives, resilient to edge cases, reusable for scale' }
    ]
};
