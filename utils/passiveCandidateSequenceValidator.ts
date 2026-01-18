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
        hasOptimalTiming: false,
        hasContentProgression: false,
        includesValueAdd: false,
        avoidsRepetition: false,
        hasRelationshipBuilding: false,
        hasChannelEscalation: false,
    };

    // ===== 1. MULTI-TOUCH SEQUENCE DETECTION =====
    // Check if submission describes multiple touchpoints/emails with explicit counting

    // Explicit numbered touch patterns
    const numberedTouchPatterns = [
        // "Email 1", "Email #1", "Touch 1", "Message 1"
        /\b(email|touch|message|outreach)\s*[#]?\s*([1-9])/gi,
        // "1st email", "2nd touch", "3rd message"
        /\b([1-9])(st|nd|rd|th)\s+(email|touch|message|outreach)/gi,
        // "First email", "Second touch", etc.
        /\b(first|second|third|fourth|fifth|sixth|seventh)\s+(email|touch|message|outreach|contact)/gi,
        // "Day 1:", "Day 3:", "Day 7:" format
        /\bday\s*([0-9]+)\s*[:\-]/gi,
        // "Step 1", "Step 2", "Phase 1"
        /\b(step|phase|stage)\s*[#]?\s*([1-9])/gi,
    ];

    // Count distinct touch numbers explicitly mentioned
    const explicitTouchNumbers = new Set<number>();
    const touchLabels: string[] = [];

    // Check for numbered patterns (Email 1, Email 2, etc.)
    const emailTouchMatches = submission.matchAll(/\b(email|touch|message|outreach)\s*[#]?\s*([1-9])/gi);
    for (const match of emailTouchMatches) {
        const num = parseInt(match[2], 10);
        explicitTouchNumbers.add(num);
        touchLabels.push(`${match[1]} ${num}`);
    }

    // Check for ordinal patterns (first email, second touch, etc.)
    const ordinalMap: Record<string, number> = {
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4,
        'fifth': 5, 'sixth': 6, 'seventh': 7
    };
    const ordinalMatches = submission.matchAll(/\b(first|second|third|fourth|fifth|sixth|seventh)\s+(email|touch|message|outreach|contact)/gi);
    for (const match of ordinalMatches) {
        const num = ordinalMap[match[1].toLowerCase()];
        if (num) {
            explicitTouchNumbers.add(num);
            touchLabels.push(`${match[1]} ${match[2]}`);
        }
    }

    // Check for day-based sequences (Day 1, Day 3, Day 7)
    const dayMatches = submission.matchAll(/\bday\s*([0-9]+)\s*[:\-]/gi);
    const dayNumbers: number[] = [];
    for (const match of dayMatches) {
        dayNumbers.push(parseInt(match[1], 10));
    }
    // Each unique day represents a touch
    if (dayNumbers.length > 0) {
        const uniqueDays = new Set(dayNumbers);
        uniqueDays.forEach((_, idx) => explicitTouchNumbers.add(idx + 1));
    }

    // Check for step/phase patterns
    const stepMatches = submission.matchAll(/\b(step|phase|stage)\s*[#]?\s*([1-9])/gi);
    for (const match of stepMatches) {
        const num = parseInt(match[2], 10);
        explicitTouchNumbers.add(num);
        touchLabels.push(`${match[1]} ${num}`);
    }

    // Fallback: check for general sequence indicators
    const generalSequenceIndicators = [
        /\b(initial|follow.?up|final|last)\s+(email|message|touch|outreach)/gi,
        /\b(sequence|cadence|campaign|series|drip)/gi,
    ];

    const hasGeneralSequence = generalSequenceIndicators.some(p => p.test(submission));

    // Calculate touch count
    let touchCount = explicitTouchNumbers.size;
    if (touchCount === 0 && hasGeneralSequence) {
        // If no explicit numbers but mentions sequence concepts, assume at least 2
        touchCount = 2;
    }

    // Validate touch sequence
    if (touchCount >= 4) {
        checks.hasMultipleTouches = true;
        score += 15; // Strong bonus for comprehensive sequence
        strengths.push(`Comprehensive ${touchCount}-touch sequence explicitly defined - excellent passive candidate approach`);
    } else if (touchCount === 3) {
        checks.hasMultipleTouches = true;
        score += 10;
        strengths.push(`3-touch sequence defined - solid multi-touch approach for passive candidates`);
    } else if (touchCount === 2) {
        checks.hasMultipleTouches = true;
        strengths.push('Includes follow-up (2 touchpoints) - passive candidates typically need 3-5 touches for engagement');
        score -= 5;
    } else {
        feedback.push('❌ SINGLE-TOUCH APPROACH: Passive candidates need 3-5 explicitly defined touchpoints. Structure as: Email 1 (Day 0), Email 2 (Day 5), Email 3 (Day 12), etc.');
        score -= 30;
    }

    // Bonus for explicit labeling
    if (touchLabels.length >= 3) {
        strengths.push(`Clear touch labeling (${touchLabels.slice(0, 3).join(', ')}${touchLabels.length > 3 ? '...' : ''}) - easy to follow and implement`);
        score += 5;
    }

    // ===== 2. TIMING/CADENCE VALIDATION =====
    // Check if submission includes timing between touches with 3-7 day optimal range

    const timingPatterns = [
        /\b(day|week|month)\s*[0-9]+/gi,
        /\b(after|wait|then)\s+([0-9]+)?\s*(day|week|hour)/gi,
        /\b([0-9]+)\s*(day|week)s?\s+(later|after|between|apart)/gi,
        /\b(immediate|within|next)\s+(day|week)/gi,
        /\b([0-9]+)\s*[-–]\s*([0-9]+)\s*(day|week)s?\b/gi, // "3-5 days", "5-7 days"
    ];

    const hasTimingMentions = timingPatterns.some(p => p.test(submission));

    if (hasTimingMentions) {
        checks.includesTiming = true;

        // Extract all day intervals mentioned
        const dayIntervalMatches = Array.from(submission.matchAll(/([0-9]+)\s*day/gi));
        const weekIntervalMatches = Array.from(submission.matchAll(/([0-9]+)\s*week/gi));
        const rangeMatches = Array.from(submission.matchAll(/([0-9]+)\s*[-–]\s*([0-9]+)\s*(day|week)s?\b/gi));

        const days = dayIntervalMatches.map(m => parseInt(m[1], 10));
        const weeks = weekIntervalMatches.map(m => parseInt(m[1], 10) * 7);

        // Handle ranges like "3-5 days" or "5-7 days"
        const rangeDays: number[] = [];
        for (const match of rangeMatches) {
            const low = parseInt(match[1], 10);
            const high = parseInt(match[2], 10);
            const multiplier = match[3].toLowerCase().startsWith('week') ? 7 : 1;
            rangeDays.push(low * multiplier, high * multiplier);
        }

        const allDays = [...days, ...weeks, ...rangeDays].filter(d => d > 0 && d < 60);

        // Optimal timing: 3-7 days between touches
        const optimalDays = allDays.filter(d => d >= 3 && d <= 7);
        const goodDays = allDays.filter(d => d >= 3 && d <= 10);
        const tooFastDays = allDays.filter(d => d > 0 && d < 3);
        const tooSlowDays = allDays.filter(d => d > 14);

        if (optimalDays.length >= 2) {
            checks.hasOptimalTiming = true;
            strengths.push(`Optimal cadence (3-7 days between touches) - perfect balance of persistence and respect`);
            score += 12;
        } else if (optimalDays.length >= 1 || goodDays.length >= 2) {
            checks.hasOptimalTiming = true;
            strengths.push('Good cadence timing - within recommended 3-10 day range');
            score += 6;
        } else if (tooFastDays.length > 0 && goodDays.length === 0) {
            feedback.push(`⚠️ CADENCE TOO AGGRESSIVE: ${tooFastDays.join(', ')} day intervals feel pushy. Optimal: 3-7 days between touches for passive candidates.`);
            score -= 12;
        } else if (tooSlowDays.length > 0 && goodDays.length === 0) {
            feedback.push(`⚠️ CADENCE TOO SLOW: ${tooSlowDays.join(', ')}+ day gaps lose momentum. Optimal: 3-7 days keeps you top of mind without being pushy.`);
            score -= 8;
        } else {
            strengths.push('Includes timing mentions - aim for 3-7 days between touches for optimal response rates');
        }

        // Specific validation for common timing patterns
        const has3to7Pattern = /\b(3|4|5|6|7)\s*[-–]?\s*(day|days)\b/i.test(submission) ||
                               /\b(3|4|5|6|7)\s*[-–]\s*(5|6|7|8|9|10)\s*days?\b/i.test(submission);

        if (has3to7Pattern && !checks.hasOptimalTiming) {
            checks.hasOptimalTiming = true;
            strengths.push('Uses 3-7 day cadence - research shows this is optimal for passive candidate response rates');
            score += 5;
        }
    } else {
        feedback.push('⏰ NO TIMING/CADENCE: Specify intervals between touches. Optimal: 3-7 days. Example: "Email 1 (Day 0) → Email 2 (Day 5) → Email 3 (Day 12)"');
        score -= 18;
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

    // ===== 7. CHANNEL ESCALATION STRATEGY =====
    // Check for multi-channel approach with escalation (InMail → Email → LinkedIn message → Phone)

    const channelPatterns = {
        inmail: /\b(inmail|in-mail|in mail|linkedin message|li message)\b/gi,
        email: /\b(email|e-mail|mail|gmail|outlook)\b/gi,
        linkedin: /\b(linkedin|li connect|connection request|connect on li)\b/gi,
        phone: /\b(phone|call|voicemail|vm|cold call)\b/gi,
        sms: /\b(sms|text|text message)\b/gi,
        social: /\b(twitter|x\.com|github|stackoverflow|reddit)\b/gi,
    };

    const channelsUsed: string[] = [];
    const channelOrder: { channel: string; position: number }[] = [];

    Object.entries(channelPatterns).forEach(([channel, pattern]) => {
        const match = submission.match(pattern);
        if (match) {
            channelsUsed.push(channel);
            // Find position in submission to determine order
            const pos = submission.toLowerCase().indexOf(match[0].toLowerCase());
            channelOrder.push({ channel, position: pos });
        }
    });

    // Sort by position to get escalation order
    channelOrder.sort((a, b) => a.position - b.position);
    const escalationSequence = channelOrder.map(c => c.channel);

    // Check for multi-channel approach
    if (channelsUsed.length >= 3) {
        checks.hasChannelEscalation = true;
        score += 12;
        strengths.push(`Multi-channel escalation (${escalationSequence.join(' → ')}) - maximizes touchpoints without being repetitive on one channel`);
    } else if (channelsUsed.length === 2) {
        checks.hasChannelEscalation = true;
        score += 6;
        strengths.push(`Uses ${channelsUsed.length} channels (${escalationSequence.join(' → ')}) - consider adding a third channel for better reach`);
    } else if (channelsUsed.length === 1) {
        feedback.push(`📱 SINGLE CHANNEL (${channelsUsed[0]}): Passive candidates respond better to multi-channel sequences. Try: InMail (Day 0) → Email (Day 5) → LinkedIn comment (Day 10)`);
        score -= 10;
    } else {
        feedback.push('📱 NO CHANNEL STRATEGY: Specify which channels you\'ll use. Best practice: Start with InMail/Email, escalate to LinkedIn engagement, then phone.');
        score -= 8;
    }

    // Check for smart escalation patterns
    const smartEscalationPatterns = [
        // InMail first, then email
        { pattern: /\b(inmail|linkedin).*(then|followed by|after).*(email|e-mail)/gi, name: 'InMail → Email escalation' },
        // If no response, try different channel
        { pattern: /\b(no response|no reply|didn't hear).*(try|switch|move to|reach out via)/gi, name: 'Response-based channel switching' },
        // Multi-channel mention
        { pattern: /\b(multi.?channel|omni.?channel|cross.?channel|different channel)/gi, name: 'Multi-channel awareness' },
        // Escalation to phone
        { pattern: /\b(escalate|last resort|finally|if all else).*(phone|call)/gi, name: 'Phone as final escalation' },
    ];

    let escalationBonus = 0;
    smartEscalationPatterns.forEach(ep => {
        if (ep.pattern.test(submission)) {
            escalationBonus += 4;
            strengths.push(`Smart escalation: ${ep.name}`);
        }
    });

    if (escalationBonus > 0) {
        score += Math.min(escalationBonus, 12); // Cap bonus at 12
    }

    // Warn about common channel mistakes
    const channelMistakes = [
        {
            pattern: /\b(phone|call)\s*(first|initially|start)/gi,
            message: 'Starting with phone can be off-putting for passive candidates - warm them up with email/InMail first',
            penalty: 6,
        },
        {
            pattern: /\b(same|only|just)\s*(channel|email|inmail)/gi,
            message: 'Sticking to one channel limits reach - passive candidates have channel preferences',
            penalty: 5,
        },
    ];

    channelMistakes.forEach(mistake => {
        if (mistake.pattern.test(submission)) {
            feedback.push(`⚠️ ${mistake.message}`);
            score -= mistake.penalty;
        }
    });

    // ===== 8. SEQUENCE BEST PRACTICES =====

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

    // ===== 10. OVERALL SEQUENCE QUALITY =====

    const sequenceScore = Object.values(checks).filter(Boolean).length;

    if (sequenceScore >= 7) {
        strengths.push('✅ EXCELLENT PASSIVE CANDIDATE SEQUENCE: Multi-touch, multi-channel, value-driven, relationship-focused approach with optimal timing');
    } else if (sequenceScore >= 5) {
        strengths.push('✅ STRONG SEQUENCE: Comprehensive approach covering multiple key elements');
    } else if (sequenceScore >= 3) {
        strengths.push('✓ DECENT SEQUENCE: Has core elements but could add channel escalation or optimal timing');
    } else {
        feedback.push('⚠️ WEAK SEQUENCE: Missing key elements of passive candidate engagement (multi-touch, timing, channels, value-add)');
        score -= 15;
    }

    // Add comprehensive guidance
    if (!checks.hasMultipleTouches || !checks.includesValueAdd || !checks.includesTiming || !checks.hasChannelEscalation) {
        feedback.push('\n💡 PASSIVE CANDIDATE SEQUENCE CHECKLIST:\n' +
            `  ${checks.hasMultipleTouches ? '✓' : '✗'} Multi-touch sequence (3-5 explicitly numbered touchpoints)\n` +
            `  ${checks.includesTiming ? '✓' : '✗'} Timing specified (intervals between touches)\n` +
            `  ${checks.hasOptimalTiming ? '✓' : '✗'} Optimal cadence (3-7 days between touches)\n` +
            `  ${checks.hasChannelEscalation ? '✓' : '✗'} Channel escalation (InMail → Email → LinkedIn → Phone)\n` +
            `  ${checks.hasContentProgression ? '✓' : '✗'} Content progression (intro → value-add → closing)\n` +
            `  ${checks.includesValueAdd ? '✓' : '✗'} Value-add content (articles, insights, not "checking in")\n` +
            `  ${checks.avoidsRepetition ? '✓' : '✗'} Avoids repetition (each touch offers something new)\n` +
            `  ${checks.hasRelationshipBuilding ? '✓' : '✗'} Relationship building (genuine interest, personal connection)\n\n` +
            '**IDEAL MULTI-CHANNEL SEQUENCE:**\n' +
            '  Email 1 (Day 0): InMail - Personalized intro, reference their work, brief role pitch\n' +
            '  Email 2 (Day 5): Email - Share relevant article/insight, no ask, just value\n' +
            '  Email 3 (Day 10): LinkedIn - Comment on their post or engage with content\n' +
            '  Email 4 (Day 15): Email - Brief check-in, offer coffee chat (low pressure)\n' +
            '  Email 5 (Day 22): Phone/VM - Final touch, give them "out", keep door open\n\n' +
            '**OPTIMAL TIMING:** 3-7 days between touches maximizes response while showing respect'
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
