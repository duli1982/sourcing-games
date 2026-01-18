import { ValidationResult } from '../types';

/**
 * GitHub Sourcing Validator
 *
 * Validates GitHub-based sourcing strategies for finding and evaluating
 * software developers through open-source contributions.
 *
 * Validates:
 * - GitHub search syntax (language:, stars:, fork:, pushed:, topics:)
 * - Repository evaluation criteria (popularity, activity, relevance)
 * - Contributor identification strategies (commits, PRs, issues, code reviews)
 * - Code quality indicators (documentation, tests, maintainability)
 * - Community engagement signals (followers, sponsorships, contributions)
 */
export function validateGithubSourcing(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        usesSearchSyntax: false,
        hasRepositoryCriteria: false,
        identifiesContributors: false,
        assessesCodeQuality: false,
        evaluatesCommunity: false,
        hasActionablePlan: false,
    };

    // ===== 1. GITHUB SEARCH SYNTAX =====
    // Check for GitHub-specific search operators

    const searchOperators = [
        { pattern: /\blanguage:\s*\w+/gi, name: 'language:', points: 8 },
        { pattern: /\bstars:\s*[><=]\s*\d+/gi, name: 'stars:', points: 6 },
        { pattern: /\b(fork|forks):\s*[><=]\s*\d+/gi, name: 'fork:', points: 5 },
        { pattern: /\bpushed:\s*[><=]?\s*[\d-]+/gi, name: 'pushed:', points: 7 },
        { pattern: /\btopics?:\s*\w+/gi, name: 'topics:', points: 5 },
        { pattern: /\b(is|type):\s*(public|private)/gi, name: 'is:/type:', points: 3 },
        { pattern: /\bsize:\s*[><=]\s*\d+/gi, name: 'size:', points: 3 },
        { pattern: /\barchived:\s*(true|false)/gi, name: 'archived:', points: 4 },
    ];

    let operatorCount = 0;
    let operatorPoints = 0;

    searchOperators.forEach(op => {
        if (op.pattern.test(submission)) {
            operatorCount++;
            operatorPoints += op.points;
            strengths.push(`Uses GitHub ${op.name} operator - demonstrates platform-specific knowledge`);
        }
    });

    if (operatorCount >= 3) {
        checks.usesSearchSyntax = true;
        score += 10; // Bonus for multi-operator proficiency
    } else if (operatorCount >= 1) {
        checks.usesSearchSyntax = true;
        feedback.push(`✓ Uses some GitHub operators, but consider adding more: language:, stars:, pushed: for better targeting`);
    } else {
        feedback.push(`❌ NO GITHUB SEARCH SYNTAX: GitHub has powerful operators like language:Python stars:>100 pushed:>2024-01-01. Use them!`);
        score -= 25;
    }

    // ===== 2. REPOSITORY EVALUATION CRITERIA =====
    // Check if submission discusses how to evaluate repositories

    const repositoryCriteria = [
        { pattern: /\b(star|starred|stars|popularity)\b/gi, name: 'Star count/popularity', points: 6 },
        { pattern: /\b(fork|forked|forks)\b/gi, name: 'Fork count', points: 5 },
        { pattern: /\b(commit|commits|activity|active|recent)\b/gi, name: 'Commit activity', points: 8 },
        { pattern: /\b(issues?|pull requests?|prs?)\b/gi, name: 'Issues/PRs', points: 7 },
        { pattern: /\b(readme|documentation|docs|wiki)\b/gi, name: 'Documentation quality', points: 6 },
        { pattern: /\b(test|tests|testing|ci\/cd|continuous integration)\b/gi, name: 'Testing/CI', points: 5 },
        { pattern: /\b(license|licensing|open.?source)\b/gi, name: 'License/OSS', points: 4 },
    ];

    let repoPoints = 0;

    repositoryCriteria.forEach(criteria => {
        if (criteria.pattern.test(submission)) {
            repoPoints += criteria.points;
        }
    });

    if (repoPoints >= 20) {
        checks.hasRepositoryCriteria = true;
        strengths.push(`Comprehensive repository evaluation criteria - considers multiple quality signals`);
        score += 8;
    } else if (repoPoints >= 10) {
        checks.hasRepositoryCriteria = true;
        strengths.push(`Includes repository evaluation criteria - could add more depth`);
    } else {
        feedback.push(`📦 WEAK REPOSITORY CRITERIA: How do you evaluate repository quality? Consider: stars, activity, documentation, tests.`);
        score -= 15;
    }

    // ===== 3. CONTRIBUTOR IDENTIFICATION =====
    // Check for strategies to identify and evaluate contributors

    const contributorSignals = [
        /\b(contributor|contributors|maintainer|maintainers|author|authors)\b/gi,
        /\b(commit history|commit activity|contributions)\b/gi,
        /\b(pull request|pr|merge|merged)\b/gi,
        /\b(code review|review|reviewer|reviewed)\b/gi,
        /\b(issue|issues|bug|bugs|feature request)\b/gi,
        /\b(top contributors|most active|frequent)\b/gi,
    ];

    const contributorMatches = contributorSignals.filter(p => p.test(submission)).length;

    if (contributorMatches >= 4) {
        checks.identifiesContributors = true;
        strengths.push(`Strong contributor identification strategy - looks beyond just commits`);
        score += 10;
    } else if (contributorMatches >= 2) {
        checks.identifiesContributors = true;
        strengths.push(`Includes contributor analysis - consider adding code review and issue triage signals`);
    } else {
        feedback.push(`👤 MISSING CONTRIBUTOR ANALYSIS: How do you identify maintainers vs. casual contributors? Look at: commits, PRs, code reviews, issue responses.`);
        score -= 20;
    }

    // ===== 4. CODE QUALITY ASSESSMENT =====
    // Check if submission mentions code quality evaluation

    const codeQualitySignals = [
        /\b(code quality|clean code|well.?written|readable)\b/gi,
        /\b(documentation|documented|comments|comment)\b/gi,
        /\b(test|tests|testing|unit test|integration test)\b/gi,
        /\b(best practices|patterns|architecture|design)\b/gi,
        /\b(performance|optimization|efficient)\b/gi,
        /\b(security|secure|vulnerability|vulnerabilities)\b/gi,
    ];

    const qualityMatches = codeQualitySignals.filter(p => p.test(submission)).length;

    if (qualityMatches >= 3) {
        checks.assessesCodeQuality = true;
        strengths.push(`Evaluates code quality - looks beyond just "does it work"`);
        score += 8;
    } else if (qualityMatches >= 1) {
        checks.assessesCodeQuality = true;
        feedback.push(`💡 CODE QUALITY: You mention some quality factors - also consider: documentation, tests, architecture, security.`);
    } else {
        feedback.push(`⚠️ NO CODE QUALITY ASSESSMENT: How do you evaluate if a developer writes good code? Check: documentation, tests, architecture patterns.`);
        score -= 12;
    }

    // ===== 5. COMMUNITY ENGAGEMENT =====
    // Check for community and influence indicators

    const communitySignals = [
        /\b(follower|followers|following|network)\b/gi,
        /\b(sponsor|sponsored|sponsorship)\b/gi,
        /\b(organization|org|company)\b/gi,
        /\b(discussion|discussions|community)\b/gi,
        /\b(conference|speaking|speaker|talk)\b/gi,
        /\b(blog|article|writing|content)\b/gi,
    ];

    const communityMatches = communitySignals.filter(p => p.test(submission)).length;

    if (communityMatches >= 3) {
        checks.evaluatesCommunity = true;
        strengths.push(`Considers community engagement - looks for influence beyond code`);
        score += 8;
    } else if (communityMatches >= 1) {
        checks.evaluatesCommunity = true;
        feedback.push(`💡 COMMUNITY SIGNALS: You mention some community factors - also look at: followers, sponsorships, speaking, writing.`);
    } else {
        feedback.push(`🌐 MISSING COMMUNITY ANALYSIS: Great developers often have influence beyond code. Check: followers, sponsors, conference talks, blog posts.`);
        score -= 10;
    }

    // ===== 6. ACTIONABLE PLAN =====
    // Check if submission includes concrete next steps

    const actionableSignals = [
        /\b(step|steps|process|workflow|approach)\b/gi,
        /\b(first|second|third|then|next|finally)\b/gi,
        /\b(outreach|contact|message|reach out)\b/gi,
        /\b(evaluation|evaluate|assess|analyze)\b/gi,
        /\b(shortlist|candidates?|prospects?)\b/gi,
    ];

    const actionableMatches = actionableSignals.filter(p => p.test(submission)).length;

    if (actionableMatches >= 3) {
        checks.hasActionablePlan = true;
        strengths.push(`Includes actionable plan - clear steps from search to outreach`);
        score += 7;
    } else if (actionableMatches >= 1) {
        checks.hasActionablePlan = true;
        feedback.push(`💡 Add more structure to your plan: Step 1 (search), Step 2 (evaluate), Step 3 (prioritize), Step 4 (outreach).`);
    } else {
        feedback.push(`📋 NO ACTION PLAN: What are the concrete steps? Outline: 1) Search repos, 2) Evaluate contributors, 3) Assess fit, 4) Outreach.`);
        score -= 10;
    }

    // ===== 7. COMMON PITFALLS =====
    // Check for common mistakes

    const pitfalls = [
        {
            pattern: /\b(just|only|simply)\s+(star|fork|commit)/gi,
            message: 'Relying on single metric (stars/forks) is too simplistic - use multiple quality signals',
            penalty: 8,
        },
        {
            pattern: /\b(any|all)\s+(repository|repo|contributor)/gi,
            message: 'Too broad - add filters to target specific quality thresholds and activity levels',
            penalty: 6,
        },
        {
            pattern: /\blive coding|leetcode|hackerrank/gi,
            message: 'GitHub is about real-world contributions, not coding challenges - focus on actual projects',
            penalty: 5,
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
            pattern: /\b(recent|active|last\s+(month|week|year)|pushed.*20\d{2})/gi,
            message: 'Filters for recent activity - good for finding currently active developers',
            bonus: 5,
        },
        {
            pattern: /\b(README|contributing|code of conduct)/gi,
            message: 'Checks project health indicators beyond code - shows maturity',
            bonus: 4,
        },
        {
            pattern: /\b(org:|user:|in:)/gi,
            message: 'Uses advanced GitHub search syntax for precise targeting',
            bonus: 6,
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
        strengths.push(`✅ STRONG GITHUB SOURCING STRATEGY: Comprehensive approach covering search, evaluation, and engagement`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT GITHUB STRATEGY: Has key elements but could add more depth`);
    } else {
        feedback.push(`⚠️ WEAK GITHUB STRATEGY: Missing critical elements like search syntax, contributor analysis, or quality assessment`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.usesSearchSyntax || !checks.identifiesContributors || !checks.hasRepositoryCriteria) {
        feedback.push(`\\n💡 GITHUB SOURCING CHECKLIST:\\n` +
            `  ${checks.usesSearchSyntax ? '✓' : '✗'} GitHub search operators (language:, stars:, pushed:, etc.)\\n` +
            `  ${checks.hasRepositoryCriteria ? '✓' : '✗'} Repository evaluation criteria (stars, activity, docs, tests)\\n` +
            `  ${checks.identifiesContributors ? '✓' : '✗'} Contributor identification (commits, PRs, code reviews)\\n` +
            `  ${checks.assessesCodeQuality ? '✓' : '✗'} Code quality assessment (documentation, tests, architecture)\\n` +
            `  ${checks.evaluatesCommunity ? '✓' : '✗'} Community engagement (followers, sponsors, influence)\\n` +
            `  ${checks.hasActionablePlan ? '✓' : '✗'} Actionable plan (search → evaluate → outreach)\\n\\n` +
            `**EXAMPLE GITHUB SOURCING STRATEGY:**\\n` +
            `  1. Search: language:Python stars:>100 pushed:>2024-01-01 topics:machine-learning\\n` +
            `  2. Filter: Repos with >50 commits in last 6 months, good README, tests\\n` +
            `  3. Identify: Top 3 contributors per repo (commits + code reviews)\\n` +
            `  4. Assess: Check code quality, documentation, test coverage\\n` +
            `  5. Prioritize: Maintainers > frequent contributors > casual contributors\\n` +
            `  6. Outreach: Personalized message referencing their specific contributions`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
