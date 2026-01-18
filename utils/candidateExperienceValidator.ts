import { ValidationResult } from '../types';

/**
 * Candidate Experience Scoring - Evaluates outreach from candidate's perspective
 *
 * Based on research: 60% of candidates have had poor experience (Talent Board)
 *
 * This validator checks:
 * - WIIFM (What's In It For Me) - Does it explain benefits?
 * - Compensation transparency
 * - Respect for candidate's time (specific vs vague asks)
 * - Empathy and candidate-centric language
 */
export function validateCandidateExperience(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        hasWIIFM: false,
        hasCompensation: false,
        respectsTime: false,
        hasEmpathy: false,
        isSpecificAsk: false,
        avoidsRedFlags: true,
    };

    // ===== 1. WIIFM (What's In It For Me) Analysis =====
    // Candidates need to understand "Why should I care?"

    const wiifmSignals = {
        // Career growth & impact
        growth: [
            /\b(career growth|advancement|development|learning|mentorship|coaching)\b/i,
            /\b(grow your|expand your|develop your|build your)\s+(skills?|career|expertise)\b/i,
            /\b(technical challenges?|interesting problems?|cutting.?edge|innovative)\b/i,
            /\b(impact|influence|shape|build|create|design|lead|own)\b/i,
        ],

        // Concrete benefits
        benefits: [
            /\b(equity|stock|rsu|options|ownership)\b/i,
            /\b(bonus|compensation|salary|pay|benefits?|perks?)\b/i,
            /\b(remote|flexible|work.?life balance|pto|unlimited vacation)\b/i,
            /\b(health|medical|dental|vision|insurance|401k|retirement)\b/i,
        ],

        // Team & culture value
        team: [
            /\b(work with|collaborate with|team of|alongside)\s+(talented|experienced|expert|senior|world.?class)\b/i,
            /\b(culture|mission|values|purpose|meaningful work)\b/i,
            /\b(diverse team|inclusive|supportive)\b/i,
        ],

        // Company/product appeal
        product: [
            /\b(product|platform|technology|solution)\s+(that|which|to)\s+(solves?|helps?|enables?|empowers?)\b/i,
            /\b(used by|serving|helping)\s+\d+[MKmk\+]?\s+(users?|customers?|companies?)\b/i,
            /\b(backed by|funded by|series [A-D]|raised)\b/i,
            /\b(recognized|awarded|rated|ranked)\b/i,
        ],
    };

    let wiifmMatches = 0;
    let wiifmCategories: string[] = [];

    Object.entries(wiifmSignals).forEach(([category, patterns]) => {
        if (patterns.some(p => p.test(submission))) {
            wiifmMatches++;
            wiifmCategories.push(category);
        }
    });

    if (wiifmMatches >= 3) {
        checks.hasWIIFM = true;
        score += 10; // Bonus for strong WIIFM
        strengths.push(`Strong WIIFM: Covers ${wiifmMatches} benefit categories (${wiifmCategories.join(', ')})`);
    } else if (wiifmMatches >= 2) {
        checks.hasWIIFM = true;
        strengths.push(`Good WIIFM: Mentions ${wiifmCategories.join(' + ')}`);
    } else if (wiifmMatches === 1) {
        checks.hasWIIFM = true;
        feedback.push(`⚠️ WIIFM is weak. You mention "${wiifmCategories[0]}" but candidates want to see 2-3 compelling reasons (growth + team + impact, etc.).`);
        score -= 15;
    } else {
        feedback.push(`❌ NO WIIFM (What's In It For Me): Candidates can't see why they should care. Add: career growth, impact, team quality, or concrete benefits.`);
        score -= 30;
    }

    // ===== 2. Compensation Transparency =====
    // Salary transparency laws (CO, CA, NY, WA) + candidate expectations

    const compensationSignals = [
        // Explicit ranges
        /\$\d{2,3}[Kk,\d]*[-–]\$?\d{2,3}[Kk]/,  // $120K-$160K or $120-$160K
        /\d{2,3}[Kk,\d]*[-–]\d{2,3}[Kk]\s+(salary|base|total comp)/i,

        // Range descriptors
        /\b(salary|compensation|base pay|total comp|tc)\s+(range|is|of)\s+\$?\d/i,
        /\b(up to|starting at|base of)\s+\$?\d{2,3}[Kk]/i,

        // Band references
        /\b(level|band|grade)\s+\d+/i,
        /\b(competitive compensation|market rate|commensurate with experience)\b/i,
    ];

    const hasCompRange = compensationSignals.some(p => p.test(submission));

    if (hasCompRange) {
        checks.hasCompensation = true;

        // Check if it's a real range or vague
        const hasSpecificRange = /\$\d{2,3}[Kk,\d]*[-–]\$?\d{2,3}[Kk]/.test(submission);

        if (hasSpecificRange) {
            score += 8; // Bonus for transparency
            strengths.push('Includes specific compensation range - builds trust and respects candidate time');
        } else {
            strengths.push('Mentions compensation (but consider adding specific range for transparency)');
        }
    } else {
        feedback.push('💰 NO COMPENSATION MENTION: 75% of candidates want salary upfront (LinkedIn 2024). Add range or "compensation discussed in first call" to respect their time.');
        score -= 20;
    }

    // ===== 3. Respect for Candidate's Time =====
    // Specific ask vs vague "let's chat sometime"

    const timeRespectSignals = {
        // GOOD: Specific, low-friction asks
        specific: [
            /\b(15|20|30).?min(ute)?(s)?\s+(call|chat|conversation|coffee)/i,
            /\b(quick|brief|short)\s+(call|chat|conversation)/i,
            /\b(next (week|tuesday|wednesday|thursday)|this (week|friday))/i,
            /\b(specific (date|time)|calendar link|schedule|calendly|book a time)/i,
            /\b(reply (yes|no)|simple (yes|no)|just (say|reply))/i,
        ],

        // BAD: Vague, high-friction asks
        vague: [
            /\b(let'?s connect|let'?s chat|let'?s talk)\b(?!\s+(next|this|on|for \d+))/i,
            /\b(hop on a call|jump on a call)\b(?!\s+(next|this|for \d+))/i,
            /\b(when you (have|get) (a )?chance)\b/i,
            /\b(whenever you'?re (free|available))\b/i,
            /\b(at your (earliest )?convenience)\b/i,
        ],
    };

    const hasSpecificAsk = timeRespectSignals.specific.some(p => p.test(submission));
    const hasVagueAsk = timeRespectSignals.vague.some(p => p.test(submission));

    if (hasSpecificAsk) {
        checks.isSpecificAsk = true;
        checks.respectsTime = true;
        strengths.push('Specific, low-friction ask (15-min call, reply yes/no, calendar link) - respects candidate time');
    } else if (hasVagueAsk) {
        feedback.push('⏰ VAGUE ASK: "Let\'s chat sometime" puts burden on candidate. Make it specific: "15-min call next week?" or "Reply YES if interested"');
        score -= 18;
    } else {
        feedback.push('❓ NO CLEAR ASK: What should the candidate do next? Add a specific, low-friction CTA (15-min call, reply yes/no, etc.)');
        score -= 15;
    }

    // ===== 4. Empathy & Candidate-Centric Language =====
    // "What would YOU feel if you received this?"

    const empathySignals = {
        // GOOD: Acknowledges candidate situation
        positive: [
            /\b(I know|I understand|I realize)\s+(you'?re|this)\b/i,
            /\b(no pressure|no obligation|totally understand if)\b/i,
            /\b(if (this |you'?re |it'?s )?(not |isn't )?(a fit|right|interested))\b/i,
            /\b(thought you might|wondered if you|checking if you)\b/i,
            /\b(your time is valuable|respect your time)\b/i,
        ],

        // BAD: Self-centered, pushy language
        negative: [
            /\b(we need|we'?re looking for|we want|we require)\b/i,
            /\b(urgent|asap|immediately|right away)\b/i,
            /\b(must respond|respond by|deadline|last chance)\b/i,
            /\b(I need you to|you must|you should|you need to)\b/i,
        ],
    };

    const hasEmpathy = empathySignals.positive.some(p => p.test(submission));
    const hasNegativeLanguage = empathySignals.negative.some(p => p.test(submission));

    if (hasEmpathy && !hasNegativeLanguage) {
        checks.hasEmpathy = true;
        score += 5; // Bonus for empathy
        strengths.push('Uses empathetic, candidate-centric language - acknowledges their situation');
    } else if (hasNegativeLanguage) {
        checks.hasEmpathy = false;
        feedback.push('🚩 PUSHY LANGUAGE: Avoid "we need", "urgent", "must respond". Frame from candidate POV: "thought you might be interested" or "no pressure"');
        score -= 12;
    } else {
        feedback.push('💡 ADD EMPATHY: Use candidate-centric language - "I know you\'re busy" or "no pressure, just curious if"');
        score -= 8;
    }

    // ===== 5. Red Flags That Kill Candidate Experience =====

    const redFlags = {
        spam: [
            /\b(mass email|batch|blast|template)\b/i,
            /\{name\}|\[name\]|\[first.?name\]/i,  // Template placeholders
            /hi there|dear candidate|hello everyone/i,
        ],

        manipulation: [
            /\b(limited time|only \d+ spots?|exclusive|invitation.only)\b/i,
            /\b(life.?changing|dream job|once.?in.?a.?lifetime)\b/i,
            /\b(you'?d be crazy|you'?d be stupid|why wouldn'?t you)\b/i,
        ],

        disrespect: [
            /\b(your resume|your cv)\s+(?!shows|demonstrates|highlights)/i,  // "Your resume is lacking" etc.
            /\b(overqualified|underqualified|not quite|almost|close but)\b/i,
            /\b(however|unfortunately|sadly|regrettably)\s+(you|we)\b/i,
        ],
    };

    const foundRedFlags: string[] = [];

    Object.entries(redFlags).forEach(([category, patterns]) => {
        patterns.forEach(pattern => {
            if (pattern.test(submission)) {
                foundRedFlags.push(category);
                checks.avoidsRedFlags = false;
            }
        });
    });

    if (foundRedFlags.length > 0) {
        const uniqueFlags = [...new Set(foundRedFlags)];
        feedback.push(`🚨 RED FLAGS: Detected ${uniqueFlags.join(', ')} signals. These kill candidate trust. Remove manipulative/disrespectful language.`);
        score -= 25 * uniqueFlags.length;
    } else {
        strengths.push('Avoids red flags (spam, manipulation, disrespect)');
    }

    // ===== 6. Overall Candidate POV Check =====
    // "What would YOU feel if you received this?"

    const candidatePOVScore = {
        hasWIIFM: checks.hasWIIFM,
        hasCompensation: checks.hasCompensation,
        respectsTime: checks.respectsTime || checks.isSpecificAsk,
        hasEmpathy: checks.hasEmpathy,
        avoidsRedFlags: checks.avoidsRedFlags,
    };

    const povScore = Object.values(candidatePOVScore).filter(Boolean).length;

    if (povScore >= 4) {
        strengths.push('✅ STRONG CANDIDATE EXPERIENCE: Message would resonate well from candidate POV (4-5 best practices)');
    } else if (povScore === 3) {
        strengths.push('✓ DECENT CANDIDATE EXPERIENCE: Message is candidate-friendly (3/5 best practices)');
    } else if (povScore === 2) {
        feedback.push('⚠️ WEAK CANDIDATE EXPERIENCE: Only 2/5 best practices met. Candidates may ignore or delete this.');
        score -= 10;
    } else {
        feedback.push('❌ POOR CANDIDATE EXPERIENCE: 0-1/5 best practices. This would frustrate candidates and harm employer brand.');
        score -= 20;
    }

    // Add summary guidance
    if (!checks.hasWIIFM || !checks.hasCompensation || !checks.isSpecificAsk) {
        feedback.push('\n💡 CANDIDATE EXPERIENCE CHECKLIST:\n' +
            `  ${checks.hasWIIFM ? '✓' : '✗'} WIIFM (What's In It For Me - 2-3 compelling reasons)\n` +
            `  ${checks.hasCompensation ? '✓' : '✗'} Compensation transparency (range or "discussed in first call")\n` +
            `  ${checks.isSpecificAsk ? '✓' : '✗'} Specific, low-friction ask (15-min call, reply yes/no)\n` +
            `  ${checks.hasEmpathy ? '✓' : '✗'} Empathetic language (acknowledges candidate situation)\n` +
            `  ${checks.avoidsRedFlags ? '✓' : '✗'} Avoids red flags (spam, manipulation, disrespect)`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
