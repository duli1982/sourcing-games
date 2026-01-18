/**
 * Script to update all game promptGenerators with strict scoring criteria
 * Based on difficulty levels: Easy, Medium, Hard
 */

import * as fs from 'fs';
import * as path from 'path';

// Template generators for each difficulty level
const templates = {
  easy: (gameContext: string, criteria: string[]) => `
            You are evaluating a submission. This is an EASY level challenge - be encouraging but fair.

            ${gameContext}

            SCORING GUIDE (Easy difficulty - be supportive):
            - 0-59 (Needs Work): Missing multiple key elements or very short submission
            - 60-79 (Good): Covers most criteria with reasonable detail
            - 80-100 (Excellent): Covers all criteria with specific insights

            SCORING CRITERIA (100 points total):
            ${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n            ')}

            AUTOMATIC ADJUSTMENTS:
            - Submission <20 words: Maximum score 50
            - Covers all criteria: Minimum score 70
            - Shows strategic thinking: +10 bonus points

            Be encouraging - this is an entry-level exercise. Award partial credit generously.
        `,

  medium: (gameContext: string, criteria: string[]) => `
            You are evaluating a submission. This is a MEDIUM difficulty challenge - be moderately strict.

            ${gameContext}

            SCORING GUIDE (Medium difficulty - require good execution):
            - 0-59 (Needs Work): Missing 2+ required elements or poor execution
            - 60-79 (Good): Covers most criteria with proper technique, minor gaps
            - 80-100 (Excellent): All criteria covered with advanced techniques

            SCORING CRITERIA (100 points total):
            ${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n            ')}

            AUTOMATIC DEDUCTIONS:
            - Missing key required elements: -20 points
            - Poor structure/syntax: -15 points
            - Submission <25 words: Maximum score 55
            - Generic or vague content: -10 points

            Be fair but require proper technique for Medium difficulty.
        `,

  hard: (gameContext: string, criteria: string[]) => `
            You are evaluating a submission. This is a HARD difficulty challenge - be VERY STRICT and demand expert-level work.

            ${gameContext}

            SCORING GUIDE (Hard difficulty - expert-level expectations):
            - 0-59 (Needs Work): Missing core elements, lacks depth or specificity
            - 60-79 (Good): Has fundamentals but missing advanced techniques or details
            - 80-100 (Excellent): Exceptional work with all criteria, specific examples, and professional execution

            SCORING CRITERIA (100 points total):
            ${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n            ')}

            AUTOMATIC DEDUCTIONS:
            - Missing ANY required criterion: -25 points
            - No specific examples/details: -20 points
            - Submission <30 words: Maximum score 40
            - Vague or generic content: -20 points
            - Poor professional quality: -15 points

            HARD difficulty requires expert-level execution. Be strict.
        `,
};

// Game-specific configurations
const gameConfigs: Record<string, { context: string; criteria: string[] }> = {
  game5: {
    context: 'Goal: Marketing Directors, Series A/B Startups, SF Bay Area, Product Launch exp.\nSubmission: "${submission}"',
    criteria: [
      'TITLE TARGETING (25 pts): Includes role variations (Director, Head, VP)? Uses proper filters?',
      'STARTUP INDICATORS (25 pts): Uses company size or Series A/B keywords? Proper filtering?',
      'PRODUCT LAUNCH KEYWORDS (20 pts): Includes launch, GTM, go-to-market terms?',
      'LOCATION (20 pts): Specifies SF Bay Area correctly?',
      'SEARCH OPTIMIZATION (10 pts): Balanced query (not too narrow/broad)?',
    ],
  },
  // Add more game-specific configs as needed
  // For games not specified, we'll use generic criteria extraction
};

function extractCriteriaFromPrompt(prompt: string): string[] {
  // Extract evaluation criteria from existing prompt
  const criteriaMatch = prompt.match(/Evaluate:\s*([\s\S]*?)(?:Return your answer|SCORE:|Tips:)/i);
  if (criteriaMatch) {
    const criteriaText = criteriaMatch[1];
    return criteriaText
      .split('\n')
      .filter((line) => line.trim().match(/^\d+\./))
      .map((line, idx) => {
        const points = Math.round(100 / (idx + 5)); // Distribute points
        return `CRITERION ${idx + 1} (${points} pts): ${line.trim().substring(3)}`;
      });
  }
  return ['CRITERION 1 (100 pts): Evaluate based on task requirements.'];
}

function updateGamePrompts(filePath: string): void {
  console.log(`\nProcessing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');
  let updatedCount = 0;

  // Match each game object
  const gameRegex = /\{[^{]*id:\s*'(game\d+)'[\s\S]*?promptGenerator:\s*\(submission\)\s*=>\s*`([\s\S]*?)`\s*\}/g;

  let match;
  while ((match = gameRegex.exec(content)) !== null) {
    const gameId = match[1];
    const currentPrompt = match[2];

    // Skip if already updated (contains "SCORING GUIDE")
    if (currentPrompt.includes('SCORING GUIDE')) {
      console.log(`  ✓ ${gameId} already updated, skipping`);
      continue;
    }

    // Extract difficulty from the game object
    const gameObjStart = match.index;
    const gameObjEnd = content.indexOf('},', gameObjStart) + 2;
    const gameObj = content.substring(gameObjStart, gameObjEnd);

    const difficultyMatch = gameObj.match(/difficulty:\s*'(easy|medium|hard)'/);
    if (!difficultyMatch) {
      console.log(`  ⚠ ${gameId}: Could not determine difficulty, skipping`);
      continue;
    }

    const difficulty = difficultyMatch[1] as 'easy' | 'medium' | 'hard';

    // Get or extract game config
    const config = gameConfigs[gameId] || {
      context: currentPrompt.split('\n').slice(0, 3).join('\n'),
      criteria: extractCriteriaFromPrompt(currentPrompt),
    };

    // Generate new prompt
    const newPrompt = templates[difficulty](config.context, config.criteria);

    // Replace in content
    const oldPromptGenerator = `promptGenerator: (submission) => \`${currentPrompt}\``;
    const newPromptGenerator = `promptGenerator: (submission) => \`${newPrompt}\``;

    content = content.replace(oldPromptGenerator, newPromptGenerator);
    updatedCount++;
    console.log(`  ✓ Updated ${gameId} (${difficulty})`);
  }

  // Write updated content
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`\n✅ Updated ${updatedCount} games in ${path.basename(filePath)}`);
}

// Main execution
const files = [
  path.join(__dirname, '../data/games.ts'),
  path.join(__dirname, '../api/_lib/data/games.ts'),
];

console.log('🚀 Starting game prompt updates...\n');

for (const file of files) {
  if (fs.existsSync(file)) {
    updateGamePrompts(file);
  } else {
    console.log(`⚠ File not found: ${file}`);
  }
}

console.log('\n✨ All updates complete!');
