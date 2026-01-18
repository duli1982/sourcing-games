import { ValidationResult } from '../types';

/**
 * Passive Candidate Conversion Path Validator
 *
 * 70% of the workforce is passive (LinkedIn). This validator ensures multi-touch
 * sequences that build relationships over time, not just one-shot outreach.
 *
 * Validates:
 * - Multi-touch sequence structure (initial → follow-up → value-add)
 * - Proper cadence/timing between touches
 * - Content progression (not repeating same pitch)
 * - Relationship-building elements
 * - Value-add content sharing strategies
 */
export function validatePassiveCandidateSequence(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        hasMultipleTouches: false,
        includesTiming: false,
        hasContentProgression: false,
        includesValueAdd: false,
        avoidsRepetition: false,
        hasRelationshipBuilding: false,
    };

    // ===== 1. MULTI-TOUCH SEQUENCE DETECTION =====
    // Check if submission describes multiple touchpoints/emails

    const sequenceIndicators = [
        /\b(email|touch|message|outreach)\s*[#]?[12345]|\b(first|second|third|fourth|fifth)\s+(email|touch|message|outreach)/gi,
        /\b(step|phase|stage)\s*[12345]|\b(day|week)\s*[0-9]+/gi,
        /\b(initial|follow.?up|final|last)\s+(email|message|touch|outreach)/gi,
        /\b(sequence|cadence|campaign|series|drip)/gi,
    ];

    const touchMatches = sequenceIndicators.map(pattern =>
        Array.from(submission.matchAll(pattern))
    ).flat();

    const touchCount = new Set(
        touchMatches.map(m => m[0].toLowerCase())
    ).size;

    if (touchCount >= 3) {
        checks.hasMultipleTouches = true;
        score += 10; // Bonus for multi-touch thinking
        strengths.push(`Multi-touch sequence (${touchCount} touchpoints) - understands passive candidate engagement requires patience`);
    } else if (touchCount === 2) {
        checks.hasMultipleTouches = true;
        strengths.push('Includes follow-up strategy (2 touchpoints) - but passive candidates need 3-5 touches');
    } else {
        feedback.push('❌ SINGLE-TOUCH APPROACH: Passive candidates need 3-5 touchpoints. Add: initial outreach → value-add follow-up → final check-in.');
        score -= 30;
    }

    // ===== 2. TIMING/CADENCE VALIDATION =====
    // Check if submission includes timing between touches

    const timingPatterns = [
        /\b(day|week|month)\s*[0-9]+/gi,
        /\b(after|wait|then)\s+([0-9]+)?\s*(day|week)/gi,
        /\b([0-9]+)\s*(day|week)s?\s+(later|after)/gi,
        /\b(immediate|within|next)\s+(day|week)/gi,
    ];

    const hasTimingMentions = timingPatterns.some(p => p.test(submission));

    if (hasTimingMentions) {
        checks.includesTiming = true;

        // Check for realistic timing (3-7 days between touches is ideal)
        const dayMatches = Array.from(submission.matchAll(/([0-9]+)\s*day/gi));
        const weekMatches = Array.from(submission.matchAll(/([0-9]+)\s*week/gi));

        const days = dayMatches.map(m => parseInt(m[1], 10));
        const weeks = weekMatches.map(m => parseInt(m[1], 10) * 7);
        const allDays = [...days, ...weeks];

        const hasRealisticCadence = allDays.some(d => d >= 3 && d <= 10);

        if (hasRealisticCadence) {
            strengths.push('Realistic cadence (3-10 days between touches) - balances persistence with respect');
            score += 5;
        } else if (allDays.some(d => d < 3)) {
            feedback.push('⚠️ CADENCE TOO AGGRESSIVE: Less than 3 days between touches feels pushy. Best practice: 5-7 days for passive candidates.');
            score -= 10;
        } else {
            strengths.push('Includes timing strategy - consider 5-7 day cadence for passive candidates');
        }
    } else {
        feedback.push('⏰ NO TIMING/CADENCE: Specify when each touch happens (e.g., "Day 0: initial, Day 5: follow-up, Day 12: final check-in").');
        score -= 15;
    }

    // ===== 3. CONTENT PROGRESSION =====
    // Check if each touch adds new value vs. repeating same pitch

    const progressionSignals = {
        // Touch 1: Introduction
        initial: [
            /\b(introduce|introduction|reach out|noticed|impressed by)/gi,
            /\b(your work|your profile|your experience|your background)/gi,
        ],

        // Touch 2: Value-add
        valueAdd: [
            /\b(share|sharing|thought you.?d|might find|article|resource|insight)/gi,
            /\b(industry trends?|market update|case study|white.?paper|research)/gi,
            /\b(no pressure|no obligation|just wanted to)/gi,
        ],

        // Touch 3: Final check-in
        closing: [
            /\b(last|final|closing the loop|one more time|wanted to make sure)/gi,
            /\b(if (not|you.?re not) interested|totally understand|no worries)/gi,
            /\b(keep you in mind|future opportunities|stay connected)/gi,
        ],
    };

    let progressionScore = 0;
    const progressionMatches: string[] = [];

    Object.entries(progressionSignals).forEach(([stage, patterns]) => {
        const hasStage = patterns.some(p => p.test(submission));
        if (hasStage) {
            progressionScore++;
            progressionMatches.push(stage);
        }
    });

    if (progressionScore >= 2) {
        checks.hasContentProgression = true;
        strengths.push(`Content progression (${progressionMatches.join(' → ')}) - each touch adds new value, not repetition`);
        score += 8;
    } else if (progressionScore === 1) {
        feedback.push('📧 WEAK CONTENT PROGRESSION: Each touch should serve different purpose - Touch 1: intro, Touch 2: value-add, Touch 3: closing.');
        score -= 12;
    } else {
        feedback.push('❌ NO CONTENT PROGRESSION: Avoid repeating same pitch. Try: Touch 1 = intro, Touch 2 = share article, Touch 3 = final check-in.');
        score -= 20;
    }

    // ===== 4. VALUE-ADD CONTENT =====
    // Check for content sharing, insights, not just "checking in"

    const valueAddSignals = [
        /\b(article|blog post|whitepaper|case study|research|report|study)/gi,
        /\b(thought leadership|industry insights?|trends?|market update)/gi,
        /\b(webinar|event|conference|podcast|video)/gi,
        /\b(share|sharing|send|sending|forward)/gi,
        /\b(might find (interesting|helpful|useful|valuable))/gi,
        /\b(related to your (work|interests?|expertise))/gi,
    ];

    const hasValueAdd = valueAddSignals.some(p => p.test(submission));

    if (hasValueAdd) {
        checks.includesValueAdd = true;
        score += 10; // Major bonus for value-add
        strengths.push('Includes value-add content (articles, insights, resources) - builds credibility and relationship');
    } else {
        feedback.push('📚 MISSING VALUE-ADD: Passive candidates respond to value, not "just checking in". Share industry insights, articles, or resources in Touch 2.');
        score -= 15;
    }

    // ===== 5. AVOID "CHECKING IN" REPETITION =====
    // Detect lazy follow-ups that just say "checking in"

    const lazyFollowUpSignals = [
        /\b(just checking in|wanted to check in|checking back|circling back)/gi,
        /\b(bumping this|bump|resending|re.?sending)/gi,
        /\b(did you (get|see|have a chance))/gi,
    ];

    const hasLazyFollowUp = lazyFollowUpSignals.some(p => p.test(submission));

    if (hasLazyFollowUp && !checks.includesValueAdd) {
        checks.avoidsRepetition = false;
        feedback.push('🚨 LAZY FOLLOW-UP: "Just checking in" or "bumping this" shows no new value. Each touch should offer something NEW.');
        score -= 15;
    } else {
        checks.avoidsRepetition = true;
        if (!hasLazyFollowUp) {
            strengths.push('Avoids lazy "checking in" language - each touch offers fresh angle');
        }
    }

    // ===== 6. RELATIONSHIP BUILDING ELEMENTS =====
    // Check for genuine connection attempts, not transactional outreach

    const relationshipSignals = [
        /\b(admire|impressed|respect|appreciate) (your|the)/gi,
        /\b(noticed|saw|read) (your|that you)/gi,
        /\b(conference|speaking|article|post|contribution)/gi,
        /\b(shared interest|mutual|both|similar)/gi,
        /\b(keep in touch|stay connected|build a relationship|long.?term)/gi,
        /\b(even if|whether or not|regardless of)/gi, // Shows genuine interest beyond the role
    ];

    const relationshipMatches = relationshipSignals.filter(p => p.test(submission)).length;

    if (relationshipMatches >= 3) {
        checks.hasRelationshipBuilding = true;
        score += 8;
        strengths.push('Strong relationship-building approach - genuine interest in candidate beyond role-filling');
    } else if (relationshipMatches >= 1) {
        checks.hasRelationshipBuilding = true;
        strengths.push('Includes relationship elements - consider adding more personal connection points');
    } else {
        feedback.push('🤝 TRANSACTIONAL APPROACH: Passive candidates want relationships, not transactions. Reference their work, show genuine interest.');
        score -= 12;
    }

    // ===== 7. SEQUENCE BEST PRACTICES =====

    const bestPractices = [
        // Personalization in each touch
        {
            pattern: /\b(personalize|customize|tailored|specific to)/gi,
            found: false,
            message: 'Mentions personalization strategy',
            penalty: 8,
            feedbackMissing: 'Each touch should be personalized to the candidate, not templated',
        },
        // Exit strategy (knowing when to stop)
        {
            pattern: /\b(final|last|closing the loop|won.?t bother|remove you)/gi,
            found: false,
            message: 'Includes exit strategy (final touch)',
            penalty: 10,
            feedbackMissing: 'Define final touch - passive candidates respect knowing when you\'ll stop',
        },
        // Metrics/tracking
        {
            pattern: /\b(track|measure|response rate|open rate|conversion)/gi,
            found: false,
            message: 'Plans to track sequence performance',
            penalty: 5,
            feedbackMissing: 'Consider tracking: open rates, reply rates, conversion to call',
        },
    ];

    bestPractices.forEach(practice => {
        if (practice.pattern.test(submission)) {
            practice.found = true;
            strengths.push(practice.message);
        } else {
            feedback.push(`💡 ${practice.feedbackMissing}`);
            score -= practice.penalty;
        }
    });

    // ===== 8. PASSIVE CANDIDATE PSYCHOLOGY =====
    // Check if submission shows understanding of passive candidate mindset

    const passiveCandidateMindset = [
        /\b(passive|not actively|happy (in|at) current|not looking)/gi,
        /\b(warm up|nurture|relationship|long.?term)/gi,
        /\b(patience|patient|time|gradually)/gi,
    ];

    const understandsPassive = passiveCandidateMindset.some(p => p.test(submission));

    if (understandsPassive) {
        strengths.push('✅ UNDERSTANDS PASSIVE MINDSET: Recognizes passive candidates need warming up, not immediate asks');
        score += 5;
    }

    // ===== 9. OVERALL SEQUENCE QUALITY =====

    const sequenceScore = Object.values(checks).filter(Boolean).length;

    if (sequenceScore >= 5) {
        strengths.push('✅ STRONG PASSIVE CANDIDATE SEQUENCE: Multi-touch, value-driven, relationship-focused approach');
    } else if (sequenceScore >= 3) {
        strengths.push('✓ DECENT SEQUENCE: Has multiple touches but could add more value-add content');
    } else {
        feedback.push('⚠️ WEAK SEQUENCE: Missing key elements of passive candidate engagement (multi-touch, timing, value-add, relationship)');
        score -= 15;
    }

    // Add comprehensive guidance
    if (!checks.hasMultipleTouches || !checks.includesValueAdd || !checks.includesTiming) {
        feedback.push('\n💡 PASSIVE CANDIDATE SEQUENCE CHECKLIST:\n' +
            `  ${checks.hasMultipleTouches ? '✓' : '✗'} Multi-touch sequence (3-5 touchpoints, not single outreach)\n` +
            `  ${checks.includesTiming ? '✓' : '✗'} Realistic cadence (5-7 days between touches)\n` +
            `  ${checks.hasContentProgression ? '✓' : '✗'} Content progression (intro → value-add → closing)\n` +
            `  ${checks.includesValueAdd ? '✓' : '✗'} Value-add content (articles, insights, not "checking in")\n` +
            `  ${checks.avoidsRepetition ? '✓' : '✗'} Avoids repetition (each touch offers something new)\n` +
            `  ${checks.hasRelationshipBuilding ? '✓' : '✗'} Relationship building (genuine interest, personal connection)\n\n` +
            '**IDEAL SEQUENCE:**\n' +
            '  Touch 1 (Day 0): Personalized intro, reference their work, brief role pitch\n' +
            '  Touch 2 (Day 5-7): Share relevant article/insight, no ask, just value\n' +
            '  Touch 3 (Day 12-14): Brief check-in, offer coffee chat (low pressure)\n' +
            '  Touch 4 (Day 21-25): Final touch, give them "out", keep door open for future'
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
