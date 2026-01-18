import { ValidationResult } from '../types';

/**
 * Reddit Sourcing Validator
 *
 * Validates Reddit-based sourcing strategies for finding and evaluating
 * developers through community participation and engagement.
 *
 * Validates:
 * - Subreddit selection (relevance, size, activity)
 * - Post/comment quality and technical depth
 * - Karma and account age thresholds
 * - Community engagement patterns (frequency, helpfulness, leadership)
 * - Cultural fit assessment through communication style
 * - Passive candidate nurturing strategies
 */
export function validateRedditSourcing(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        identifiesSubreddits: false,
        assessesPostQuality: false,
        usesKarmaCriteria: false,
        evaluatesEngagement: false,
        checksCulturalFit: false,
        hasNurtureStrategy: false,
    };

    // ===== 1. SUBREDDIT IDENTIFICATION =====
    // Check for relevant subreddit targeting

    const subredditPatterns = [
        /\b(r\/|subreddit[:s]?)\s*[a-z][a-z0-9_]{2,20}/gi,
        /\b(community|communities|forum|forums)\b/gi,
    ];

    const subredditMentions = submission.match(/r\/[a-z][a-z0-9_]{2,20}/gi) || [];
    const uniqueSubreddits = new Set(subredditMentions.map(s => s.toLowerCase()));

    const hasSubredditMention = subredditPatterns.some(p => p.test(submission));

    if (uniqueSubreddits.size >= 3) {
        checks.identifiesSubreddits = true;
        strengths.push(`Identifies multiple subreddits (${uniqueSubreddits.size}) - demonstrates multi-community research`);
        score += 10;
    } else if (uniqueSubreddits.size >= 1) {
        checks.identifiesSubreddits = true;
        strengths.push(`Mentions ${uniqueSubreddits.size} subreddit(s) - consider targeting 3-5 related communities for broader reach`);
    } else if (hasSubredditMention) {
        checks.identifiesSubreddits = true;
        feedback.push(`💡 ADD SPECIFIC SUBREDDITS: Instead of just "subreddit", name specific ones: r/programming, r/cscareerquestions, etc.`);
    } else {
        feedback.push(`❌ NO SUBREDDIT TARGETING: Reddit sourcing starts with identifying relevant communities. Examples: r/javascript, r/webdev, r/reactjs.`);
        score -= 25;
    }

    // Technology-specific subreddit bonus
    const techSubreddits = [
        'programming', 'coding', 'webdev', 'javascript', 'python', 'reactjs',
        'django', 'machinelearning', 'datascience', 'devops', 'sysadmin',
        'gamedev', 'androiddev', 'iosprogramming', 'cpp', 'rust'
    ];

    const mentionedTechSubs = techSubreddits.filter(sub =>
        new RegExp(`r\\/${sub}\\b`, 'i').test(submission)
    );

    if (mentionedTechSubs.length >= 2) {
        strengths.push(`Targets relevant tech communities (${mentionedTechSubs.join(', ')}) - shows research`);
        score += 5;
    }

    // ===== 2. POST/COMMENT QUALITY ASSESSMENT =====
    // Check if submission discusses how to evaluate post quality

    const postQualitySignals = [
        { pattern: /\b(post\s+quality|quality\s+post|well.?written|thoughtful)/gi, name: 'Quality assessment', points: 8 },
        { pattern: /\b(upvote|upvotes|karma|score)\b/gi, name: 'Upvote/karma analysis', points: 7 },
        { pattern: /\b(comment|comments|discussion|engage|engagement)/gi, name: 'Comment participation', points: 7 },
        { pattern: /\b(technical\s+depth|in-depth|detailed|comprehensive)/gi, name: 'Technical depth', points: 9 },
        { pattern: /\b(helpful|helping|teach|teaching|explain)/gi, name: 'Helpfulness', points: 8 },
        { pattern: /\b(code\s+snippet|code\s+example|sample|demo)/gi, name: 'Code examples', points: 6 },
    ];

    let qualityPoints = 0;

    postQualitySignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            qualityPoints += signal.points;
        }
    });

    if (qualityPoints >= 25) {
        checks.assessesPostQuality = true;
        strengths.push(`Comprehensive post quality assessment - evaluates content depth, not just karma`);
        score += 10;
    } else if (qualityPoints >= 15) {
        checks.assessesPostQuality = true;
        strengths.push(`Includes post quality factors - consider adding: technical depth, helpfulness, code examples`);
    } else if (qualityPoints >= 5) {
        checks.assessesPostQuality = true;
        feedback.push(`💡 POST QUALITY BASICS: You mention some factors - also check: upvotes, comment depth, technical accuracy, teaching style.`);
    } else {
        feedback.push(`❌ NO POST QUALITY ASSESSMENT: How do you evaluate if someone's contributions are valuable? Check: upvotes, comment quality, technical depth, helpfulness.`);
        score -= 20;
    }

    // ===== 3. KARMA AND ACCOUNT AGE CRITERIA =====
    // Check for karma thresholds and account longevity

    const karmaPatterns = [
        /\bkarma.*?[><=]\s*(\d{1,3}),?(\d{3})/gi,
        /\bkarma.*?[><=]\s*(\d+)/gi,
        /\b(high|low|minimum|threshold)\s+karma/gi,
    ];

    let hasKarmaMention = false;
    let karmaThreshold = 0;

    karmaPatterns.forEach(kp => {
        const match = submission.match(kp);
        if (match) {
            hasKarmaMention = true;
            const nums = match[0].match(/\d+/g);
            if (nums) {
                karmaThreshold = Math.max(karmaThreshold, parseInt(nums[0], 10));
            }
        }
    });

    const hasAccountAgeMention = /\b(account\s+age|reddit\s+age|years?|months?)\b/gi.test(submission);

    if (hasKarmaMention || hasAccountAgeMention) {
        checks.usesKarmaCriteria = true;

        if (karmaThreshold >= 5000) {
            strengths.push(`High karma threshold (${karmaThreshold}+) - targets active, valuable contributors`);
            score += 8;
        } else if (karmaThreshold >= 1000) {
            strengths.push(`Moderate karma threshold (${karmaThreshold}+) - balances activity and pool size`);
            score += 5;
        } else if (karmaThreshold > 0) {
            feedback.push(`⚠️ LOW KARMA THRESHOLD (${karmaThreshold}): Consider 1000+ for active users, 5000+ for power users.`);
        }

        if (hasAccountAgeMention) {
            strengths.push(`Considers account age - helps filter out spam/throwaway accounts`);
            score += 4;
        }
    } else {
        feedback.push(`📊 NO KARMA/AGE CRITERIA: Reddit karma indicates contribution quality. Guidelines: 1K+ = active, 5K+ = power user, 10K+ = very active.`);
        score -= 15;
    }

    // ===== 4. COMMUNITY ENGAGEMENT EVALUATION =====
    // Check for broader community participation analysis

    const engagementSignals = [
        { pattern: /\b(regular|consistently|frequent|active|activity)/gi, name: 'Frequency', points: 8 },
        { pattern: /\b(moderator|mod|community\s+leader)/gi, name: 'Moderation', points: 10 },
        { pattern: /\b(original\s+content|oc|creator|create)/gi, name: 'Content creation', points: 7 },
        { pattern: /\b(response\s+rate|reply|replying|answer)/gi, name: 'Responsiveness', points: 6 },
        { pattern: /\b(flair|verified|badge)/gi, name: 'Flair/verification', points: 5 },
        { pattern: /\b(cross.?post|multiple\s+communities)/gi, name: 'Cross-posting', points: 5 },
    ];

    let engagementPoints = 0;

    engagementSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            engagementPoints += signal.points;
        }
    });

    if (engagementPoints >= 20) {
        checks.evaluatesEngagement = true;
        strengths.push(`Strong engagement evaluation - looks at participation patterns beyond just post count`);
        score += 10;
    } else if (engagementPoints >= 10) {
        checks.evaluatesEngagement = true;
        feedback.push(`✓ Mentions engagement - also consider: frequency, moderation, OC creation, responsiveness.`);
    } else {
        feedback.push(`🔥 LIMITED ENGAGEMENT ANALYSIS: Check community involvement: regularity of posts, moderator status, OC creation, cross-community participation.`);
        score -= 12;
    }

    // ===== 5. CULTURAL FIT ASSESSMENT =====
    // Check if submission discusses evaluating cultural fit through communication

    const culturalFitSignals = [
        /\b(communication\s+style|tone|voice|personality)/gi,
        /\b(culture|cultural\s+fit|values|alignment)/gi,
        /\b(collaborative|team\s+player|helpful|supportive)/gi,
        /\b(respectful|professional|toxic|negative)/gi,
        /\b(passion|passionate|enthusiasm|enthusiastic)/gi,
    ];

    const culturalMatches = culturalFitSignals.filter(p => p.test(submission)).length;

    if (culturalMatches >= 3) {
        checks.checksCulturalFit = true;
        strengths.push(`Evaluates cultural fit through communication style - Reddit is great for this`);
        score += 10;
    } else if (culturalMatches >= 1) {
        checks.checksCulturalFit = true;
        feedback.push(`💡 CULTURAL FIT: You mention fit - also assess: communication style, collaboration signals, tone, professionalism.`);
    } else {
        feedback.push(`🤝 NO CULTURAL FIT ASSESSMENT: Reddit shows personality! Check: communication tone, helpfulness, collaboration, professionalism, passion.`);
        score -= 12;
    }

    // ===== 6. NURTURE/ENGAGEMENT STRATEGY =====
    // Check for passive candidate nurturing approach

    const nurtureSignals = [
        /\b(nurture|nurturing|warm|relationship|long.?term)/gi,
        /\b(passive|not\s+looking|content\s+in\s+role)/gi,
        /\b(build\s+rapport|trust|connection)/gi,
        /\b(value.?add|provide\s+value|helpful|resource)/gi,
        /\b(sequence|touch|follow.?up|campaign)/gi,
        /\b(personalize|custom|specific|reference\s+their)/gi,
    ];

    const nurtureMatches = nurtureSignals.filter(p => p.test(submission)).length;

    if (nurtureMatches >= 3) {
        checks.hasNurtureStrategy = true;
        strengths.push(`Includes nurture strategy - recognizes Reddit users are typically passive candidates`);
        score += 10;
    } else if (nurtureMatches >= 1) {
        checks.hasNurtureStrategy = true;
        feedback.push(`💡 NURTURE APPROACH: Reddit users are passive - build rapport first, pitch later. Multi-touch, value-add approach.`);
    } else {
        feedback.push(`🌱 NO NURTURE STRATEGY: Reddit users aren't job hunting! Build relationship first: value-add comments, DM referencing specific posts, warm intro.`);
        score -= 15;
    }

    // ===== 7. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(mass\s+dm|bulk\s+message|spam)/gi,
            message: 'Mass messaging on Reddit is spam and will get you banned - personalize every outreach',
            penalty: 15,
        },
        {
            pattern: /\b(just|only)\s+(post|comment|karma)/gi,
            message: 'Single metric (karma/posts) is too simplistic - evaluate quality, engagement, cultural fit',
            penalty: 8,
        },
        {
            pattern: /\b(immediate|quick\s+hire|urgent)/gi,
            message: 'Reddit is for passive candidates - expect long nurture cycles (weeks/months), not immediate hires',
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
            pattern: /\b(lurker|lurking|passive\s+reader)/gi,
            message: 'Recognizes lurkers vs. active posters - shows understanding of Reddit dynamics',
            bonus: 6,
        },
        {
            pattern: /\b(ama|ask\s+me\s+anything|community\s+event)/gi,
            message: 'Considers community events (AMAs, etc.) for identifying thought leaders',
            bonus: 7,
        },
        {
            pattern: /\b(niche|specialized|specific)\s+(subreddit|community)/gi,
            message: 'Targets niche communities - better quality than broad subreddits',
            bonus: 8,
        },
        {
            pattern: /\b(reference\s+their|specific\s+post|mentioned\s+in\s+your)/gi,
            message: 'Plans personalized outreach referencing specific contributions - best practice',
            bonus: 9,
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
        strengths.push(`✅ STRONG REDDIT SOURCING STRATEGY: Comprehensive community-based approach with quality filters and nurture plan`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT REDDIT STRATEGY: Has core elements but could add more depth`);
    } else {
        feedback.push(`⚠️ WEAK REDDIT STRATEGY: Missing critical elements like subreddit targeting, post quality assessment, or nurture approach`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.identifiesSubreddits || !checks.assessesPostQuality || !checks.hasNurtureStrategy) {
        feedback.push(`\\n💡 REDDIT SOURCING CHECKLIST:\\n` +
            `  ${checks.identifiesSubreddits ? '✓' : '✗'} Subreddit targeting (3-5 relevant communities)\\n` +
            `  ${checks.assessesPostQuality ? '✓' : '✗'} Post/comment quality assessment (upvotes, depth, helpfulness)\\n` +
            `  ${checks.usesKarmaCriteria ? '✓' : '✗'} Karma/age criteria (1K+ active, 5K+ power user, account age >6mo)\\n` +
            `  ${checks.evaluatesEngagement ? '✓' : '✗'} Engagement patterns (frequency, moderation, OC, responsiveness)\\n` +
            `  ${checks.checksCulturalFit ? '✓' : '✗'} Cultural fit (communication style, tone, collaboration)\\n` +
            `  ${checks.hasNurtureStrategy ? '✓' : '✗'} Nurture strategy (passive candidates, value-add, relationship building)\\n\\n` +
            `**EXAMPLE REDDIT SOURCING STRATEGY:**\\n` +
            `  1. Target: r/MachineLearning, r/deeplearning, r/learnmachinelearning (niche > broad)\\n` +
            `  2. Filter: karma:>5000, account age >1 year, regular poster (not lurker)\\n` +
            `  3. Quality: Check top 5-10 posts/comments for technical depth and helpfulness\\n` +
            `  4. Cultural: Assess tone (collaborative? helpful? respectful?) and communication style\\n` +
            `  5. Nurture: Value-add comment on their post → DM referencing specific contribution → warm intro call\\n` +
            `  6. Outreach: "I saw your comment about [topic] in r/[subreddit] - really insightful! I'd love to chat..."`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
