import { compareTwoStrings } from 'string-similarity';
import { ValidationConfig, ValidationResult } from '../types';

const ensureFeedback = (feedback: string[]) => {
    if (feedback.length === 0) {
        feedback.push('Automated checks passed; AI will handle nuanced scoring.');
    }
};

export function validateSimilarity(
    submission: string,
    exampleSolution?: string
): number {
    if (!exampleSolution) return 0;
    return compareTwoStrings(submission.toLowerCase(), exampleSolution.toLowerCase());
}

export function validateBooleanSearch(
    submission: string,
    requirements: { keywords?: string[]; location?: string } = {}
): ValidationResult {
    const strengths: string[] = [];
    const operatorCount = (submission.match(/\b(AND|OR|NOT)\b/gi) || []).length;
    const checks: Record<string, boolean> = {
        hasParentheses: /\([^)]+\)/.test(submission),
        hasAND: /\bAND\b/.test(submission), // Case sensitive usually for Boolean, but let's be strict
        hasOR: /\bOR\b/.test(submission),
        hasNot: /\bNOT\b/.test(submission) || /-/.test(submission),
        hasProximity: /\b(NEAR|AROUND\/?\d*)\b/i.test(submission),
        isOverlyComplex: operatorCount > 12,
    };

    const feedback: string[] = [];
    let score = 100;

    if (!checks.hasParentheses && (checks.hasOR || checks.hasAND)) {
        feedback.push(
            'Missing parentheses for grouping logic. Parentheses control operator precedence. Example: (React OR Vue) AND (senior OR lead) ensures you get React OR Vue candidates who are ALSO senior or lead level.'
        );
        score -= 15;
    } else if (checks.hasParentheses) {
        strengths.push('Good use of parentheses for grouping');
    }

    if (checks.hasAND && checks.hasOR) {
        strengths.push('Combines AND/OR operators effectively');
    } else if (!checks.hasAND && !checks.hasOR) {
        feedback.push('Search string lacks basic boolean operators (AND, OR).');
        score -= 20;
    }

    if (checks.hasProximity) {
        strengths.push('Uses proximity operators (NEAR/AROUND) to keep terms close');
    } else if (submission.length > 0) {
        feedback.push('Consider adding proximity operators (NEAR/AROUND) to keep critical terms closer together.');
        score -= 5;
    }

    if (checks.isOverlyComplex) {
        feedback.push(`Search might be overly complex with ${operatorCount} operators. Simplify groups to avoid platform limits and noise.`);
        score -= 10;
    }

    if (requirements.location) {
        const hasLocation = new RegExp(requirements.location, 'i').test(submission);
        checks.hasLocation = hasLocation;
        if (!hasLocation) {
            feedback.push(`Missing required location targeting (${requirements.location}). Include it to focus results.`);
            score -= 10;
        } else {
            strengths.push(`Includes location targeting (${requirements.location})`);
        }
    }

    // Keyword checks
    if (requirements.keywords) {
        const missingKeywords = requirements.keywords.filter(
            (k) => !new RegExp(k, 'i').test(submission)
        );
        if (missingKeywords.length > 0) {
            checks.hasKeywords = false;
            feedback.push(`Missing required keywords: ${missingKeywords.join(', ')}`);
            score -= 10 * missingKeywords.length;
        } else {
            checks.hasKeywords = true;
            strengths.push('Covers all required keywords');
        }
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

export function validateOutreach(
    submission: string,
    maxWords: number = 150
): ValidationResult {
    const trimmed = submission.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const strengths: string[] = [];
    const checks: Record<string, boolean> = {
        lengthOK: wordCount <= maxWords && wordCount > 10,
        hasSubjectLine: /Subject:/i.test(submission),
        hasCallToAction: /(call|chat|connect|interested|open to|schedule|time to talk|let (?:me|us) know|reply)/i.test(submission),
        hasPersonalization: /\b(hi|hello|hey)\s+\w+/i.test(submission) || /\[(name|candidate)\]/i.test(submission) || /\{name\}/i.test(submission),
    };

    const feedback: string[] = [];
    let score = 100;

    if (wordCount < 10) {
        feedback.push('Message is too short.');
        score -= 40;
    } else if (wordCount > maxWords) {
        feedback.push(`Message is too long (${wordCount} words). Aim for under ${maxWords}.`);
        score -= 10;
    } else {
        strengths.push('Clear, concise length for outreach');
    }

    const cliches = ['just checking in', 'circling back', 'per my last email'];
    const foundCliches = cliches.filter((c) =>
        new RegExp(c, 'i').test(submission)
    );

    if (foundCliches.length > 0) {
        checks.hasCliches = true;
        feedback.push(`Avoid cliches: ${foundCliches.join(', ')}`);
        score -= 5 * foundCliches.length;
    } else {
        checks.hasCliches = false;
        strengths.push('Avoids common outreach cliches');
    }

    if (!checks.hasPersonalization) {
        feedback.push('Message lacks personalization (name/company). Add a specific hook to increase replies.');
        score -= 15;
    } else {
        strengths.push('Personalizes with a name/company hook');
    }

    const genericTemplates = ['hope you are well', 'to whom it may concern', 'I am reaching out to you because', 'dear sir or madam'];
    const foundGeneric = genericTemplates.filter(p => new RegExp(p, 'i').test(submission));
    if (foundGeneric.length > 0) {
        checks.isGeneric = true;
        feedback.push(`Message feels generic (${foundGeneric.join(', ')}). Swap in specific details or proof of research.`);
        score -= 10;
    } else {
        checks.isGeneric = false;
    }

    if (!checks.hasCallToAction) {
        feedback.push('Add a clear call-to-action (e.g., quick call this week, reply yes/no).');
        score -= 12;
    } else {
        strengths.push('Includes a clear call-to-action');
    }

    if (!checks.hasSubjectLine) {
        feedback.push('Add a subject line to catch attention and set context.');
        score -= 8;
    } else {
        const subjectMatch = submission.match(/Subject:\s*(.+)/i);
        const subject = subjectMatch?.[1]?.trim() ?? '';
        if (subject.length < 8 || /^(hi|hello|follow up)$/i.test(subject)) {
            feedback.push('Subject line is weak or too short. Make it specific and benefit-driven.');
            score -= 8;
        } else {
            strengths.push('Uses a specific subject line');
        }
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}

export function validateGeneral(submission: string, config: ValidationConfig = {}): ValidationResult {
    const text = submission.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const sentenceCount = (text.match(/[.!?]/g) || []).length;

    const minWords = config.minWords ?? 25;
    const recommendedMinWords = config.recommendedMinWords ?? Math.max(45, (config.minWords ?? 0) + 5);
    const minSentences = config.minSentences ?? 2;
    const minChars = config.minChars ?? 0;

    const feedback: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (minChars > 0 && text.length < minChars) {
        feedback.push(`Too short; add more detail (at least ${minChars} characters).`);
        score = Math.min(score, 30);
    }

    if (wordCount < minWords) {
        feedback.push(`Too short; aim for at least ${minWords} words so we can evaluate your reasoning.`);
        score = Math.min(score, 25);
    } else if (wordCount < recommendedMinWords) {
        feedback.push(`Add more depth (aim for ~${recommendedMinWords} words) to cover the key points.`);
        score -= 15;
    } else {
        strengths.push('Provides enough detail to evaluate reasoning');
    }

    if (sentenceCount < minSentences) {
        feedback.push(`Provide at least ${minSentences} sentences (e.g., set up the issue + your recommendation).`);
        score -= 20;
    } else {
        strengths.push('Structured response with clear sentences');
    }

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks: {
            lengthOK: wordCount >= minWords,
            hasStructure: sentenceCount >= minSentences,
            meetsCharFloor: minChars === 0 || text.length >= minChars,
        },
        feedback,
        strengths,
    };
}

export function validateCultureAddNote(submission: string): ValidationResult {
    const text = submission.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;

    const checks: Record<string, boolean> = {
        hasEnoughDetail: wordCount >= 60,
        hasStructure: (text.match(/[.!?]/g) || []).length >= 2,
        callsOutRisk: /(danger|risk|bias|groupthink|homogen|exclusion)/i.test(text),
        explainsValue: /(value|benefit|strength|adds?\s+value|complement|diversity)/i.test(text),
        referencesCandidate: /(candidate|they|their|this person)/i.test(text),
    };

    const feedback: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (!checks.hasEnoughDetail) {
        feedback.push('Too short; aim for ~60-150 words with a clear argument.');
        score -= 60;
    }
    if (!checks.hasStructure) {
        feedback.push('Provide at least two sentences (risk + value) instead of a fragment.');
        score -= 15;
    }
    if (!checks.callsOutRisk) {
        feedback.push('Call out why over-indexing on "culture fit" is risky (bias, groupthink, sameness).');
        score -= 25;
    }
    if (!checks.explainsValue) {
        feedback.push('Explain the specific value this candidate adds to the team (skills, balance, outcomes).');
        score -= 20;
    }
    if (!checks.referencesCandidate) {
        feedback.push('Refer directly to the candidate and their strengths, not just abstract ideas.');
        score -= 10;
    } else {
        strengths.push('References the candidate directly');
    }
    if (checks.callsOutRisk) strengths.push('Flags culture-fit risk (bias/groupthink)');
    if (checks.explainsValue) strengths.push("Explains the candidate's unique value");
    if (checks.hasStructure) strengths.push('Uses at least two sentences (risk + value)');

    ensureFeedback(feedback);
    return {
        score: Math.max(0, score),
        checks,
        feedback,
        strengths,
    };
}
