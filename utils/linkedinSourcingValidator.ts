import { ValidationResult } from '../types';

/**
 * LinkedIn Sourcing Validator
 *
 * Validates LinkedIn-based sourcing strategies for finding and evaluating
 * professional candidates through LinkedIn's platform.
 *
 * Validates:
 * - LinkedIn search syntax (Boolean operators, filters, X-Ray searches)
 * - Profile evaluation criteria (experience, skills, endorsements, activity)
 * - Connection and outreach strategies
 * - InMail best practices
 * - Recruiter Lite/Seat features
 * - Sales Navigator tactics
 */
export function validateLinkedinSourcing(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        usesSearchSyntax: false,
        hasProfileCriteria: false,
        hasOutreachStrategy: false,
        usesFilters: false,
        understandsPlatform: false,
        hasActionablePlan: false,
    };

    // ===== 1. LINKEDIN SEARCH SYNTAX =====
    // Check for LinkedIn-specific search operators and Boolean logic

    const searchOperators = [
        { pattern: /\b(AND|OR|NOT)\b/g, name: 'Boolean operators', points: 8 },
        { pattern: /[""][^""]+[""]/g, name: 'Exact phrase matching', points: 7 },
        { pattern: /\([^)]+\)/g, name: 'Parentheses grouping', points: 6 },
        { pattern: /\bsite:\s*linkedin\.com/gi, name: 'X-Ray search', points: 10 },
        { pattern: /\bintitle:|inurl:/gi, name: 'Google X-Ray operators', points: 8 },
        { pattern: /\b(title|headline):/gi, name: 'Title/headline search', points: 6 },
        { pattern: /\b(company|current company|past company):/gi, name: 'Company filter', points: 5 },
        { pattern: /\-\s*\w+|\bNOT\s+\w+/gi, name: 'Exclusion operators', points: 5 },
    ];

    let operatorCount = 0;
    let operatorPoints = 0;

    searchOperators.forEach(op => {
        if (op.pattern.test(submission)) {
            operatorCount++;
            operatorPoints += op.points;
            strengths.push(`Uses ${op.name} - demonstrates LinkedIn search proficiency`);
        }
    });

    if (operatorCount >= 4) {
        checks.usesSearchSyntax = true;
        score += 12; // Bonus for advanced search skills
    } else if (operatorCount >= 2) {
        checks.usesSearchSyntax = true;
        feedback.push(`✓ Uses some search operators. Consider adding: Boolean (AND/OR/NOT), exact phrases (""), X-Ray searches.`);
    } else {
        feedback.push(`❌ WEAK SEARCH SYNTAX: LinkedIn search requires Boolean logic. Use: "software engineer" AND (Python OR Java) NOT junior`);
        score -= 25;
    }

    // ===== 2. LINKEDIN FILTERS =====
    // Check for use of LinkedIn's built-in filters

    const filterSignals = [
        { pattern: /\b(location|geography|geo|region|city|country)\b/gi, name: 'Location filter', points: 6 },
        { pattern: /\b(industry|industries)\b/gi, name: 'Industry filter', points: 5 },
        { pattern: /\b(experience|years|seniority|level)\b/gi, name: 'Experience level', points: 7 },
        { pattern: /\b(current company|past company|employer)\b/gi, name: 'Company filter', points: 6 },
        { pattern: /\b(school|education|university|college|degree)\b/gi, name: 'Education filter', points: 5 },
        { pattern: /\b(connections|1st|2nd|3rd|degree connections)\b/gi, name: 'Connection degree', points: 6 },
        { pattern: /\b(open to|open to work|actively looking|opentowork)\b/gi, name: 'Open to Work filter', points: 8 },
        { pattern: /\b(posted|active|recent activity)\b/gi, name: 'Activity recency', points: 5 },
    ];

    let filterCount = 0;
    let filterPoints = 0;

    filterSignals.forEach(filter => {
        if (filter.pattern.test(submission)) {
            filterCount++;
            filterPoints += filter.points;
        }
    });

    if (filterCount >= 4) {
        checks.usesFilters = true;
        strengths.push(`Uses multiple LinkedIn filters - precise candidate targeting`);
        score += 8;
    } else if (filterCount >= 2) {
        checks.usesFilters = true;
        feedback.push(`💡 Consider more filters: location, experience level, current company, "Open to Work" badge.`);
    } else {
        feedback.push(`❌ MISSING FILTERS: LinkedIn filters narrow results effectively. Use: location, experience, industry, connection degree.`);
        score -= 15;
    }

    // ===== 3. PROFILE EVALUATION CRITERIA =====
    // Check if submission discusses how to evaluate profiles

    const profileCriteria = [
        { pattern: /\b(headline|title|current role|job title)\b/gi, name: 'Headline analysis', points: 6 },
        { pattern: /\b(experience|work history|employment|tenure)\b/gi, name: 'Experience evaluation', points: 7 },
        { pattern: /\b(skills|endorsements?|endorsed)\b/gi, name: 'Skills/endorsements', points: 6 },
        { pattern: /\b(recommendations?|recommended)\b/gi, name: 'Recommendations', points: 7 },
        { pattern: /\b(connections|network size|network)\b/gi, name: 'Network size', points: 4 },
        { pattern: /\b(activity|posts?|articles?|engagement|comments?)\b/gi, name: 'Activity/engagement', points: 6 },
        { pattern: /\b(summary|about section|profile summary)\b/gi, name: 'Summary/About', points: 5 },
        { pattern: /\b(certifications?|licenses?|credentials?)\b/gi, name: 'Certifications', points: 5 },
        { pattern: /\b(mutual|shared connections|common)\b/gi, name: 'Mutual connections', points: 5 },
    ];

    let profilePoints = 0;
    let profileMatches = 0;

    profileCriteria.forEach(criteria => {
        if (criteria.pattern.test(submission)) {
            profilePoints += criteria.points;
            profileMatches++;
        }
    });

    if (profilePoints >= 25) {
        checks.hasProfileCriteria = true;
        strengths.push(`Comprehensive profile evaluation - considers multiple quality signals`);
        score += 10;
    } else if (profilePoints >= 12) {
        checks.hasProfileCriteria = true;
        strengths.push(`Includes profile evaluation criteria - could add more depth`);
    } else {
        feedback.push(`👤 WEAK PROFILE EVALUATION: How do you assess profile quality? Consider: headline, experience, skills, recommendations, activity.`);
        score -= 18;
    }

    // ===== 4. OUTREACH STRATEGY =====
    // Check for connection and messaging strategies

    const outreachSignals = [
        { pattern: /\b(inmail|in-mail)\b/gi, name: 'InMail', points: 7 },
        { pattern: /\b(connection request|connect|add)\b/gi, name: 'Connection request', points: 6 },
        { pattern: /\b(message|messaging|reach out|outreach)\b/gi, name: 'Messaging strategy', points: 6 },
        { pattern: /\b(personalize|personal|customiz|tailor)\b/gi, name: 'Personalization', points: 8 },
        { pattern: /\b(follow.?up|follow up|second message|sequence)\b/gi, name: 'Follow-up strategy', points: 7 },
        { pattern: /\b(response rate|reply rate|acceptance)\b/gi, name: 'Response optimization', points: 6 },
        { pattern: /\b(subject line|hook|opener|opening)\b/gi, name: 'Message opener', points: 5 },
        { pattern: /\b(call to action|cta|next step)\b/gi, name: 'Call to action', points: 5 },
    ];

    let outreachPoints = 0;
    let outreachMatches = 0;

    outreachSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            outreachPoints += signal.points;
            outreachMatches++;
        }
    });

    if (outreachPoints >= 25) {
        checks.hasOutreachStrategy = true;
        strengths.push(`Strong outreach strategy - covers messaging, personalization, and follow-up`);
        score += 10;
    } else if (outreachPoints >= 12) {
        checks.hasOutreachStrategy = true;
        feedback.push(`💡 OUTREACH: Good start. Consider adding: personalization tactics, follow-up cadence, subject line optimization.`);
    } else {
        feedback.push(`✉️ MISSING OUTREACH STRATEGY: How will you engage candidates? Include: InMail vs. connection request, personalization, follow-up.`);
        score -= 15;
    }

    // ===== 5. PLATFORM UNDERSTANDING =====
    // Check for understanding of LinkedIn-specific features

    const platformFeatures = [
        { pattern: /\b(recruiter|recruiter lite|recruiter seat|linkedin recruiter)\b/gi, name: 'Recruiter tools', points: 8 },
        { pattern: /\b(sales navigator|sales nav)\b/gi, name: 'Sales Navigator', points: 7 },
        { pattern: /\b(talent insights|talent pool|pipeline)\b/gi, name: 'Talent Insights', points: 6 },
        { pattern: /\b(inmails?|credits?|inmail credits)\b/gi, name: 'InMail credits', points: 5 },
        { pattern: /\b(saved search|alert|search alert)\b/gi, name: 'Saved searches', points: 6 },
        { pattern: /\b(projects?|talent project|candidate pool)\b/gi, name: 'Recruiter projects', points: 5 },
        { pattern: /\b(spotlights?|spotlight filter)\b/gi, name: 'Spotlights', points: 6 },
        { pattern: /\b(boolean|x-ray|xray)\b/gi, name: 'Advanced search methods', points: 7 },
        { pattern: /\b(alumni|school|university)\b/gi, name: 'Alumni search', points: 5 },
        { pattern: /\b(groups?|linkedin groups?)\b/gi, name: 'LinkedIn Groups', points: 5 },
    ];

    let platformMatches = 0;

    platformFeatures.forEach(feature => {
        if (feature.pattern.test(submission)) {
            platformMatches++;
        }
    });

    if (platformMatches >= 4) {
        checks.understandsPlatform = true;
        strengths.push(`Deep LinkedIn platform knowledge - leverages advanced features`);
        score += 10;
    } else if (platformMatches >= 2) {
        checks.understandsPlatform = true;
        feedback.push(`💡 Consider leveraging: Recruiter Lite, Sales Navigator, Saved Searches, LinkedIn Groups.`);
    } else {
        feedback.push(`🔧 LIMITED PLATFORM KNOWLEDGE: LinkedIn offers powerful tools beyond basic search. Explore: Recruiter, Sales Navigator, Saved Searches.`);
        score -= 12;
    }

    // ===== 6. ACTIONABLE PLAN =====
    // Check if submission includes concrete steps

    const actionableSignals = [
        { pattern: /\b(step|steps|process|workflow|approach|strategy)\b/gi, points: 5 },
        { pattern: /\b(first|second|third|then|next|finally|start|begin)\b/gi, points: 4 },
        { pattern: /\b(target|targeting|ideal|criteria)\b/gi, points: 5 },
        { pattern: /\b(qualify|qualifying|screen|screening)\b/gi, points: 6 },
        { pattern: /\b(track|tracking|pipeline|crm|ats)\b/gi, points: 5 },
        { pattern: /\b(list|shortlist|candidates|prospects)\b/gi, points: 4 },
    ];

    let actionablePoints = 0;

    actionableSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            actionablePoints += signal.points;
        }
    });

    if (actionablePoints >= 15) {
        checks.hasActionablePlan = true;
        strengths.push(`Clear actionable plan - structured approach from search to outreach`);
        score += 7;
    } else if (actionablePoints >= 8) {
        checks.hasActionablePlan = true;
        feedback.push(`💡 Add structure: Step 1 (define criteria), Step 2 (search), Step 3 (evaluate), Step 4 (outreach), Step 5 (track).`);
    } else {
        feedback.push(`📋 NO ACTION PLAN: Outline concrete steps. Example: 1) Build Boolean, 2) Apply filters, 3) Review profiles, 4) Personalize outreach.`);
        score -= 10;
    }

    // ===== 7. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(spray and pray|mass message|blast|bulk)\b/gi,
            message: 'Mass messaging hurts response rates and damages reputation - personalize your outreach',
            penalty: 10,
        },
        {
            pattern: /\b(generic|template|same message)\b.*\b(everyone|all)\b/gi,
            message: 'Generic templates get low response rates - customize for each candidate',
            penalty: 8,
        },
        {
            pattern: /\b(immediately|urgent|asap)\b.*\b(hire|fill|position)\b/gi,
            message: 'Urgent language can seem desperate - focus on opportunity and fit instead',
            penalty: 5,
        },
        {
            pattern: /\b(job alert|apply now|click here)\b/gi,
            message: 'Promotional language gets ignored - focus on personalized conversation starters',
            penalty: 6,
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
            pattern: /\b(warm|mutual|referred|referral|introduction)\b/gi,
            message: 'Leverages warm connections and referrals - significantly higher response rates',
            bonus: 6,
        },
        {
            pattern: /\b(icebreaker|common ground|shared interest|commonality)\b/gi,
            message: 'Uses icebreakers based on common ground - builds rapport',
            bonus: 5,
        },
        {
            pattern: /\b(a\/b test|test|experiment|iterate)\b/gi,
            message: 'Tests and iterates on messaging - data-driven approach',
            bonus: 5,
        },
        {
            pattern: /\b(insight|market intel|competitive|competitor)\b/gi,
            message: 'Uses LinkedIn for market intelligence - strategic sourcing',
            bonus: 5,
        },
        {
            pattern: /\b(gdpr|compliance|privacy|consent)\b/gi,
            message: 'Considers compliance and privacy - professional approach',
            bonus: 4,
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
        strengths.push(`✅ STRONG LINKEDIN SOURCING STRATEGY: Comprehensive approach covering search, evaluation, and outreach`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT LINKEDIN STRATEGY: Has key elements but could add more depth`);
    } else {
        feedback.push(`⚠️ WEAK LINKEDIN STRATEGY: Missing critical elements like Boolean search, profile evaluation, or outreach strategy`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.usesSearchSyntax || !checks.hasProfileCriteria || !checks.hasOutreachStrategy) {
        feedback.push(`\n💡 LINKEDIN SOURCING CHECKLIST:\n` +
            `  ${checks.usesSearchSyntax ? '✓' : '✗'} Boolean search syntax (AND/OR/NOT, quotes, parentheses)\n` +
            `  ${checks.usesFilters ? '✓' : '✗'} LinkedIn filters (location, experience, industry, Open to Work)\n` +
            `  ${checks.hasProfileCriteria ? '✓' : '✗'} Profile evaluation (headline, experience, skills, recommendations)\n` +
            `  ${checks.hasOutreachStrategy ? '✓' : '✗'} Outreach strategy (InMail, personalization, follow-up)\n` +
            `  ${checks.understandsPlatform ? '✓' : '✗'} Platform features (Recruiter, Sales Navigator, Saved Searches)\n` +
            `  ${checks.hasActionablePlan ? '✓' : '✗'} Actionable plan (search → evaluate → outreach → track)\n\n` +
            `**EXAMPLE LINKEDIN SOURCING STRATEGY:**\n` +
            `  1. Boolean: "software engineer" AND (Python OR Java) AND ("machine learning" OR AI)\n` +
            `  2. Filters: Location: San Francisco, Experience: 5+ years, Open to Work\n` +
            `  3. Evaluate: Strong headline, relevant experience, skill endorsements, active poster\n` +
            `  4. Outreach: Personalized InMail mentioning specific project or mutual connection\n` +
            `  5. Follow-up: Day 3 if no response, reference their recent post or article\n` +
            `  6. Track: Add to ATS pipeline, note response rates for iteration`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
