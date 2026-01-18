import { ValidationResult } from '../types';

/**
 * Stack Overflow Sourcing Validator
 *
 * Validates Stack Overflow-based sourcing strategies for finding and evaluating
 * software developers through their Q&A participation and expertise.
 *
 * Validates:
 * - SO search syntax ([tags], user:, reputation:, votes:, accepted:)
 * - Reputation thresholds and their meaning
 * - Answer quality assessment (upvotes, accepted, code examples, explanations)
 * - Tag expertise and consistency across related technologies
 * - Community involvement (moderation, badges, editing)
 * - Teaching ability and communication skills
 */
export function validateStackOverflowSourcing(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        usesSearchSyntax: false,
        hasReputationCriteria: false,
        assessesAnswerQuality: false,
        evaluatesTagExpertise: false,
        checksCommunityInvolvement: false,
        hasActionablePlan: false,
    };

    // ===== 1. STACK OVERFLOW SEARCH SYNTAX =====
    // Check for SO-specific search operators

    const searchOperators = [
        { pattern: /\[[a-z0-9\-\.]+\]/gi, name: '[tag]', points: 10, example: '[python]' },
        { pattern: /\buser:\s*\d+/gi, name: 'user:', points: 6, example: 'user:12345' },
        { pattern: /\breputation:\s*[><=]\s*\d+/gi, name: 'reputation:', points: 8, example: 'reputation:>5000' },
        { pattern: /\bvotes?:\s*[><=]\s*\d+/gi, name: 'votes:', points: 7, example: 'votes:>10' },
        { pattern: /\baccepted:\s*(yes|true|1)/gi, name: 'accepted:', points: 7, example: 'accepted:yes' },
        { pattern: /\banswers?:\s*[><=]\s*\d+/gi, name: 'answers:', points: 5, example: 'answers:>0' },
        { pattern: /\bscore:\s*[><=]\s*\d+/gi, name: 'score:', points: 5, example: 'score:>5' },
    ];

    let operatorCount = 0;
    let tagUsed = false;

    searchOperators.forEach(op => {
        if (op.pattern.test(submission)) {
            operatorCount++;
            if (op.name === '[tag]') tagUsed = true;
            strengths.push(`Uses Stack Overflow ${op.name} - demonstrates platform knowledge`);
        }
    });

    if (operatorCount >= 3 && tagUsed) {
        checks.usesSearchSyntax = true;
        score += 10; // Bonus for multi-operator proficiency with tags
        strengths.push(`Strong SO search syntax - combines tags with quality filters`);
    } else if (operatorCount >= 2) {
        checks.usesSearchSyntax = true;
        feedback.push(`✓ Uses some SO operators - consider adding more: [tags], reputation:, votes:, accepted:`);
    } else {
        feedback.push(`❌ NO STACK OVERFLOW SYNTAX: SO has powerful operators like [python] reputation:>5000 accepted:yes. Use them!`);
        score -= 25;
    }

    // ===== 2. REPUTATION CRITERIA =====
    // Check for reputation thresholds and understanding of SO reputation system

    const reputationPatterns = [
        { pattern: /reputation.*?(\d{1,3}),?(\d{3})/gi, threshold: 1000, name: 'specific threshold' },
        { pattern: /reputation.*?[><=]\s*(\d+)/gi, threshold: 100, name: 'comparative threshold' },
        { pattern: /\b(top|high|expert|senior)\s+(reputation|rep)/gi, threshold: 0, name: 'qualitative' },
    ];

    let hasReputationMention = false;
    let reputationThreshold = 0;

    reputationPatterns.forEach(rp => {
        const match = submission.match(rp.pattern);
        if (match) {
            hasReputationMention = true;
            // Extract number if present
            const nums = match[0].match(/\d+/g);
            if (nums) {
                reputationThreshold = Math.max(reputationThreshold, parseInt(nums[0], 10));
            }
        }
    });

    if (hasReputationMention) {
        checks.hasReputationCriteria = true;

        if (reputationThreshold >= 10000) {
            strengths.push(`High reputation threshold (${reputationThreshold}+) - targets expert contributors`);
            score += 8;
        } else if (reputationThreshold >= 1000) {
            strengths.push(`Moderate reputation threshold (${reputationThreshold}+) - balances quality and pool size`);
            score += 5;
        } else if (reputationThreshold > 0) {
            feedback.push(`⚠️ LOW REPUTATION THRESHOLD (${reputationThreshold}): Consider 1000+ for active contributors, 5000+ for experts, 10000+ for top 5%.`);
        } else {
            strengths.push(`Mentions reputation criteria - consider specific thresholds: 1K (active), 5K (expert), 10K+ (top 5%)`);
        }
    } else {
        feedback.push(`📊 NO REPUTATION CRITERIA: SO reputation is key! Guidelines: 1K+ = active, 5K+ = expert, 10K+ = top 5%, 25K+ = elite.`);
        score -= 18;
    }

    // ===== 3. ANSWER QUALITY ASSESSMENT =====
    // Check if submission discusses how to evaluate answer quality

    const answerQualitySignals = [
        { pattern: /\b(upvote|upvotes|votes|score)\b/gi, name: 'Upvote/score analysis', points: 8 },
        { pattern: /\b(accepted|accept|green check)/gi, name: 'Accepted answers', points: 9 },
        { pattern: /\b(code\s+example|code\s+sample|snippet|example code)/gi, name: 'Code examples', points: 7 },
        { pattern: /\b(explanation|explain|detailed|in-depth|thorough)/gi, name: 'Explanation quality', points: 8 },
        { pattern: /\b(educational|teaching|helpful|clear)/gi, name: 'Teaching ability', points: 7 },
        { pattern: /\b(answer\s+length|comprehensive|complete)/gi, name: 'Answer completeness', points: 6 },
    ];

    let qualityPoints = 0;

    answerQualitySignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            qualityPoints += signal.points;
        }
    });

    if (qualityPoints >= 25) {
        checks.assessesAnswerQuality = true;
        strengths.push(`Comprehensive answer quality assessment - looks beyond just upvotes`);
        score += 10;
    } else if (qualityPoints >= 15) {
        checks.assessesAnswerQuality = true;
        strengths.push(`Includes answer quality factors - consider adding: code examples, explanations, teaching ability`);
    } else if (qualityPoints >= 5) {
        checks.assessesAnswerQuality = true;
        feedback.push(`💡 BASIC ANSWER QUALITY: You mention some factors - also consider: accepted answers, code examples, explanation depth, teaching style.`);
    } else {
        feedback.push(`❌ NO ANSWER QUALITY ASSESSMENT: How do you evaluate if someone gives good answers? Check: upvotes, accepted, code examples, explanation quality.`);
        score -= 20;
    }

    // ===== 4. TAG EXPERTISE EVALUATION =====
    // Check for strategies to evaluate expertise across tags

    const tagExpertiseSignals = [
        /\b(tag|tags)\b.*?\b(multiple|several|cross|related|consistent)/gi,
        /\b(specialization|specialize|expert|expertise)\b/gi,
        /\b(badge|badges|gold|silver|bronze)/gi,
        /\b(tag\s+score|tag\s+reputation)/gi,
        /\b(consistency|consistently|frequent|regularly)/gi,
    ];

    const tagMatches = tagExpertiseSignals.filter(p => p.test(submission)).length;

    if (tagMatches >= 3) {
        checks.evaluatesTagExpertise = true;
        strengths.push(`Evaluates tag expertise - looks for consistency across related technologies`);
        score += 10;
    } else if (tagMatches >= 1) {
        checks.evaluatesTagExpertise = true;
        feedback.push(`💡 TAG EXPERTISE: You mention tags - also check: tag badges, cross-tag consistency (e.g., React + Redux + Jest = full-stack front-end).`);
    } else {
        feedback.push(`🏷️ MISSING TAG ANALYSIS: Check expertise across related tags. Example: [python] + [pandas] + [numpy] = data science, [python] + [django] + [postgresql] = backend.`);
        score -= 15;
    }

    // ===== 5. COMMUNITY INVOLVEMENT =====
    // Check for broader community participation beyond answering

    const communitySignals = [
        { pattern: /\b(moderator|mod|diamond)/gi, name: 'Moderation', points: 8 },
        { pattern: /\b(badge|badges|achievement)/gi, name: 'Badges', points: 6 },
        { pattern: /\b(edit|editing|improve|improvement)/gi, name: 'Content editing', points: 5 },
        { pattern: /\b(question|questions|ask|asking)/gi, name: 'Question quality', points: 4 },
        { pattern: /\b(review|reviewing|close vote|reopen)/gi, name: 'Review queues', points: 6 },
        { pattern: /\b(meta|community)/gi, name: 'Meta participation', points: 5 },
    ];

    let communityPoints = 0;

    communitySignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            communityPoints += signal.points;
        }
    });

    if (communityPoints >= 15) {
        checks.checksCommunityInvolvement = true;
        strengths.push(`Considers broader community involvement - looks beyond just answering`);
        score += 8;
    } else if (communityPoints >= 8) {
        checks.checksCommunityInvolvement = true;
        feedback.push(`✓ Mentions community involvement - also consider: badges, editing, review participation.`);
    } else {
        feedback.push(`🌐 LIMITED COMMUNITY ANALYSIS: Great SO users contribute beyond answers: editing, moderation, reviewing. Check badges and meta participation.`);
        score -= 10;
    }

    // ===== 6. ACTIONABLE PLAN =====
    // Check if submission includes concrete sourcing workflow

    const actionableSignals = [
        /\b(step|steps|process|workflow|strategy|approach)\b/gi,
        /\b(search|find|identify|filter|evaluate)\b/gi,
        /\b(shortlist|select|prioritize|rank)\b/gi,
        /\b(outreach|contact|message|reach out|engage)\b/gi,
    ];

    const actionableMatches = actionableSignals.filter(p => p.test(submission)).length;

    if (actionableMatches >= 3) {
        checks.hasActionablePlan = true;
        strengths.push(`Includes actionable sourcing plan - clear workflow from search to outreach`);
        score += 7;
    } else if (actionableMatches >= 1) {
        checks.hasActionablePlan = true;
        feedback.push(`💡 Add workflow structure: 1) Tag-based search, 2) Reputation filter, 3) Answer quality check, 4) Outreach.`);
    } else {
        feedback.push(`📋 NO SOURCING WORKFLOW: Outline steps: 1) Search by tags + reputation, 2) Review top answers, 3) Assess consistency, 4) Personalized outreach.`);
        score -= 10;
    }

    // ===== 7. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(any\s+reputation|all\s+users|no\s+filter)/gi,
            message: 'No quality threshold - you\'ll get noise. Set minimum reputation (1K+) and answer quality filters.',
            penalty: 12,
        },
        {
            pattern: /\b(only|just)\s+(reputation|rep)/gi,
            message: 'Reputation alone isn\'t enough - also check answer quality, tags, and teaching ability.',
            penalty: 8,
        },
        {
            pattern: /\b(spam|mass\s+message|bulk)/gi,
            message: 'Mass outreach to SO users is frowned upon - personalize based on their specific answers/expertise.',
            penalty: 10,
        },
    ];

    pitfalls.forEach(pitfall => {
        if (pitfall.pattern.test(submission)) {
            feedback.push(`⚠️ ${pitfall.message}`);
            score -= pitfall.penalty;
        }
    });

    // ===== 8. BEST PRACTICES BONUS =====

    const bestPractices = [
        {
            pattern: /\b(top\s+(1%|5%|10%)|percentile)/gi,
            message: 'Targets top percentile users - shows understanding of SO reputation distribution',
            bonus: 6,
        },
        {
            pattern: /\b(communication\s+skill|writing|articulate|clear)/gi,
            message: 'Evaluates communication skills through answers - key hiring signal',
            bonus: 7,
        },
        {
            pattern: /\b(recent|active|last\s+(month|year)|activity)/gi,
            message: 'Filters for recent activity - finds currently engaged developers',
            bonus: 5,
        },
        {
            pattern: /\b(personalize|specific\s+answer|reference\s+their)/gi,
            message: 'Plans personalized outreach based on specific contributions - best practice',
            bonus: 8,
        },
    ];

    bestPractices.forEach(practice => {
        if (practice.pattern.test(submission)) {
            strengths.push(`✅ ${practice.message}`);
            score += practice.bonus;
        }
    });

    // ===== 9. OVERALL QUALITY SUMMARY =====

    const checkScore = Object.values(checks).filter(Boolean).length;

    if (checkScore >= 5) {
        strengths.push(`✅ STRONG STACK OVERFLOW STRATEGY: Comprehensive tag-based search with quality filters and engagement plan`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT SO STRATEGY: Has core elements but could add more depth`);
    } else {
        feedback.push(`⚠️ WEAK SO STRATEGY: Missing critical elements like reputation thresholds, answer quality assessment, or tag expertise`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.usesSearchSyntax || !checks.hasReputationCriteria || !checks.assessesAnswerQuality) {
        feedback.push(`\\n💡 STACK OVERFLOW SOURCING CHECKLIST:\\n` +
            `  ${checks.usesSearchSyntax ? '✓' : '✗'} SO search syntax ([tag], reputation:, votes:, accepted:)\\n` +
            `  ${checks.hasReputationCriteria ? '✓' : '✗'} Reputation thresholds (1K+ active, 5K+ expert, 10K+ top 5%)\\n` +
            `  ${checks.assessesAnswerQuality ? '✓' : '✗'} Answer quality assessment (upvotes, accepted, code examples, explanations)\\n` +
            `  ${checks.evaluatesTagExpertise ? '✓' : '✗'} Tag expertise evaluation (consistency across related tags, badges)\\n` +
            `  ${checks.checksCommunityInvolvement ? '✓' : '✗'} Community involvement (badges, editing, moderation)\\n` +
            `  ${checks.hasActionablePlan ? '✓' : '✗'} Actionable workflow (search → evaluate → outreach)\\n\\n` +
            `**EXAMPLE STACK OVERFLOW SOURCING STRATEGY:**\\n` +
            `  1. Search: [python] [pandas] [data-science] reputation:>5000\\n` +
            `  2. Filter: accepted:yes votes:>10 (high-quality answers)\\n` +
            `  3. Check: Tag consistency (Python + Pandas + NumPy + Matplotlib = data science)\\n` +
            `  4. Badges: Look for gold badges in target tags (deep expertise)\\n` +
            `  5. Review: Read top 3-5 answers to assess teaching ability and communication\\n` +
            `  6. Outreach: "I was impressed by your answer on [specific question] about [topic]..."`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
