import { ValidationResult } from '../types';

/**
 * Negotiation Validator
 *
 * Validates negotiation strategies for offer discussions with candidates.
 *
 * Validates:
 * - Understanding of candidate motivations
 * - Compensation components (base, bonus, equity, benefits)
 * - Negotiation tactics and framing
 * - BATNA awareness (Best Alternative to Negotiated Agreement)
 * - Win-win approach
 * - Closing techniques
 * - Counter-offer handling
 */
export function validateNegotiation(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        understandsMotivations: false,
        coversCompComponents: false,
        hasNegotiationTactics: false,
        considersAlternatives: false,
        usesWinWinApproach: false,
        hasClosingStrategy: false,
    };

    // ===== 1. UNDERSTANDING CANDIDATE MOTIVATIONS =====
    // Check for focus on what the candidate values

    const motivationSignals = [
        { pattern: /\b(motivation|motivate|priorities|what matters|important to)\b/gi, name: 'Motivation focus', points: 7 },
        { pattern: /\b(career|growth|opportunity|advancement|development)\b/gi, name: 'Career growth', points: 6 },
        { pattern: /\b(work.?life|balance|flexibility|remote|hybrid)\b/gi, name: 'Work-life balance', points: 6 },
        { pattern: /\b(culture|team|environment|mission|purpose)\b/gi, name: 'Culture/mission', points: 5 },
        { pattern: /\b(learn|learning|skill|challenge|impact)\b/gi, name: 'Learning/impact', points: 5 },
        { pattern: /\b(family|location|commute|relocation)\b/gi, name: 'Personal factors', points: 5 },
        { pattern: /\b(listen|understand|discover|ask|question)\b/gi, name: 'Discovery approach', points: 7 },
    ];

    let motivationPoints = 0;

    motivationSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            motivationPoints += signal.points;
        }
    });

    if (motivationPoints >= 22) {
        checks.understandsMotivations = true;
        strengths.push(`Strong focus on understanding candidate motivations - key to successful negotiation`);
        score += 10;
    } else if (motivationPoints >= 12) {
        checks.understandsMotivations = true;
        feedback.push(`✓ Considers some motivations. Dig deeper: What does the candidate really value? Career growth? Flexibility? Impact?`);
    } else {
        feedback.push(`❌ MISSING MOTIVATION ANALYSIS: Negotiation starts with understanding what the candidate values beyond just money.`);
        score -= 18;
    }

    // ===== 2. COMPENSATION COMPONENTS =====
    // Check for understanding of total comp package

    const compComponents = [
        { pattern: /\b(base|base salary|base pay|base compensation)\b/gi, name: 'Base salary', points: 7 },
        { pattern: /\b(bonus|annual bonus|signing bonus|sign.?on|performance bonus)\b/gi, name: 'Bonus', points: 7 },
        { pattern: /\b(equity|stock|options|rsu|shares|vesting)\b/gi, name: 'Equity', points: 8 },
        { pattern: /\b(benefits|health|insurance|401k|retirement|pto|vacation)\b/gi, name: 'Benefits', points: 6 },
        { pattern: /\b(total comp|total compensation|package|overall)\b/gi, name: 'Total comp view', points: 6 },
        { pattern: /\b(relocation|moving|stipend|allowance)\b/gi, name: 'Relocation', points: 4 },
        { pattern: /\b(title|level|promotion|start date)\b/gi, name: 'Non-monetary terms', points: 5 },
    ];

    let compPoints = 0;
    let compMatches = 0;

    compComponents.forEach(comp => {
        if (comp.pattern.test(submission)) {
            compPoints += comp.points;
            compMatches++;
        }
    });

    if (compPoints >= 25) {
        checks.coversCompComponents = true;
        strengths.push(`Comprehensive compensation understanding - considers multiple levers beyond base salary`);
        score += 12;
    } else if (compPoints >= 15) {
        checks.coversCompComponents = true;
        feedback.push(`💡 Consider more comp levers: base, bonus, equity, benefits, signing bonus, title, start date.`);
    } else {
        feedback.push(`❌ LIMITED COMP VIEW: Negotiation isn't just about base salary. Consider: bonus, equity, benefits, signing bonus, title.`);
        score -= 15;
    }

    // ===== 3. NEGOTIATION TACTICS =====
    // Check for negotiation strategies and techniques

    const tacticSignals = [
        { pattern: /\b(anchor|anchoring|first offer|initial offer)\b/gi, name: 'Anchoring', points: 8 },
        { pattern: /\b(range|band|flexibility|room|wiggle)\b/gi, name: 'Range/flexibility', points: 6 },
        { pattern: /\b(justify|rationale|reason|explain|because)\b/gi, name: 'Justification', points: 6 },
        { pattern: /\b(market|data|benchmark|comparable|competitive)\b/gi, name: 'Market data', points: 8 },
        { pattern: /\b(trade.?off|exchange|instead|alternative|option)\b/gi, name: 'Trade-offs', points: 7 },
        { pattern: /\b(silence|pause|wait|patience|time)\b/gi, name: 'Timing/patience', points: 5 },
        { pattern: /\b(walk away|decline|pass|reject)\b/gi, name: 'Walk-away power', points: 6 },
        { pattern: /\b(frame|framing|position|perspective)\b/gi, name: 'Framing', points: 7 },
    ];

    let tacticPoints = 0;

    tacticSignals.forEach(tactic => {
        if (tactic.pattern.test(submission)) {
            tacticPoints += tactic.points;
        }
    });

    if (tacticPoints >= 25) {
        checks.hasNegotiationTactics = true;
        strengths.push(`Strong negotiation tactics - uses anchoring, market data, and strategic framing`);
        score += 10;
    } else if (tacticPoints >= 12) {
        checks.hasNegotiationTactics = true;
        feedback.push(`💡 Add more tactics: anchoring, using market data, framing the offer, strategic silence.`);
    } else {
        feedback.push(`❌ WEAK NEGOTIATION TACTICS: Include strategies like anchoring, market benchmarking, and trade-off proposals.`);
        score -= 15;
    }

    // ===== 4. ALTERNATIVES & BATNA =====
    // Check for awareness of alternatives

    const alternativeSignals = [
        { pattern: /\b(batna|alternative|backup|other offers?|competing)\b/gi, name: 'BATNA awareness', points: 8 },
        { pattern: /\b(current (offer|situation|role|job)|where they are)\b/gi, name: 'Current situation', points: 6 },
        { pattern: /\b(other candidates|pipeline|backup candidate)\b/gi, name: 'Candidate alternatives', points: 5 },
        { pattern: /\b(deadline|timeline|expiration|decision date)\b/gi, name: 'Timeline pressure', points: 6 },
        { pattern: /\b(leverage|position|power|advantage)\b/gi, name: 'Leverage awareness', points: 7 },
        { pattern: /\b(counter.?offer|current employer|retention)\b/gi, name: 'Counter-offer risk', points: 8 },
    ];

    let altPoints = 0;

    alternativeSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            altPoints += signal.points;
        }
    });

    if (altPoints >= 20) {
        checks.considersAlternatives = true;
        strengths.push(`Strong BATNA awareness - considers both sides' alternatives and leverage`);
        score += 10;
    } else if (altPoints >= 10) {
        checks.considersAlternatives = true;
        feedback.push(`💡 Consider: What are their alternatives? Counter-offer risk? Other offers? This affects your leverage.`);
    } else {
        feedback.push(`⚖️ MISSING BATNA ANALYSIS: What are their alternatives? Other offers? Counter-offer risk? Know your leverage.`);
        score -= 12;
    }

    // ===== 5. WIN-WIN APPROACH =====
    // Check for collaborative negotiation mindset

    const winWinSignals = [
        { pattern: /\b(win.?win|mutual|both parties|collaborative)\b/gi, name: 'Win-win language', points: 8 },
        { pattern: /\b(relationship|long.?term|partnership|together)\b/gi, name: 'Relationship focus', points: 6 },
        { pattern: /\b(fair|reasonable|honest|transparent|trust)\b/gi, name: 'Fairness', points: 6 },
        { pattern: /\b(value|contribution|worth|deserve|merit)\b/gi, name: 'Value focus', points: 5 },
        { pattern: /\b(creative|solution|solve|find a way|work out)\b/gi, name: 'Creative solutions', points: 7 },
        { pattern: /\b(respect|professional|positive|constructive)\b/gi, name: 'Professional tone', points: 5 },
    ];

    let winWinPoints = 0;

    winWinSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            winWinPoints += signal.points;
        }
    });

    if (winWinPoints >= 20) {
        checks.usesWinWinApproach = true;
        strengths.push(`Win-win mindset - focuses on mutual value and long-term relationship`);
        score += 8;
    } else if (winWinPoints >= 10) {
        checks.usesWinWinApproach = true;
        feedback.push(`💡 Emphasize win-win: Negotiation shouldn't feel adversarial. Focus on mutual value and creative solutions.`);
    } else {
        feedback.push(`🤝 ADOPT WIN-WIN APPROACH: Best negotiations create value for both sides. Focus on relationship, not just terms.`);
        score -= 10;
    }

    // ===== 6. CLOSING STRATEGY =====
    // Check for closing and commitment tactics

    const closingSignals = [
        { pattern: /\b(close|closing|commitment|commit|decision|decide)\b/gi, name: 'Closing language', points: 7 },
        { pattern: /\b(accept|acceptance|yes|agree|agreement)\b/gi, name: 'Acceptance', points: 6 },
        { pattern: /\b(sign|signed|offer letter|written|formalize)\b/gi, name: 'Formal acceptance', points: 6 },
        { pattern: /\b(next steps?|moving forward|proceed|onboarding)\b/gi, name: 'Next steps', points: 5 },
        { pattern: /\b(excited|enthusiasm|looking forward|welcome)\b/gi, name: 'Positive close', points: 5 },
        { pattern: /\b(trial close|temperature check|where are you|how do you feel)\b/gi, name: 'Trial close', points: 7 },
        { pattern: /\b(objection|concern|hesitation|reservation)\b/gi, name: 'Objection handling', points: 7 },
    ];

    let closingPoints = 0;

    closingSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            closingPoints += signal.points;
        }
    });

    if (closingPoints >= 22) {
        checks.hasClosingStrategy = true;
        strengths.push(`Strong closing strategy - handles objections and drives to commitment`);
        score += 8;
    } else if (closingPoints >= 12) {
        checks.hasClosingStrategy = true;
        feedback.push(`💡 Strengthen closing: Address objections, trial close ("How does that sound?"), clear next steps.`);
    } else {
        feedback.push(`📋 WEAK CLOSING: Include how to handle objections, trial close techniques, and drive to acceptance.`);
        score -= 10;
    }

    // ===== 7. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(take it or leave it|final offer|non.?negotiable|this is it)\b/gi,
            message: 'Ultimatums damage relationships and can lose great candidates',
            penalty: 10,
        },
        {
            pattern: /\b(lowball|cheap|save money|cut costs)\b/gi,
            message: 'Cost-focused language signals you don\'t value the candidate',
            penalty: 8,
        },
        {
            pattern: /\b(desperate|really need|can\'t lose|must have)\b/gi,
            message: 'Showing desperation weakens your negotiating position',
            penalty: 6,
        },
        {
            pattern: /\b(pressure|push|force|demand)\b/gi,
            message: 'High-pressure tactics create resentment and acceptance regret',
            penalty: 7,
        },
        {
            pattern: /\b(everyone gets|standard|policy|no exceptions)\b/gi,
            message: 'Hiding behind policy limits creative solutions',
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
            pattern: /\b(exploding offer|deadline|expire)\b.*\b(avoid|don't|careful)\b/gi,
            message: 'Aware of exploding offer risks - respects candidate decision time',
            bonus: 5,
        },
        {
            pattern: /\b(verbal|written|documented|email|confirm)\b/gi,
            message: 'Documents agreements - prevents misunderstandings',
            bonus: 4,
        },
        {
            pattern: /\b(pre.?close|before.*offer|expectation|alignment)\b/gi,
            message: 'Pre-closes before formal offer - reduces rejection risk',
            bonus: 7,
        },
        {
            pattern: /\b(peer|team|meet|sell|convince)\b.*\b(role|opportunity|company)\b/gi,
            message: 'Uses team/peers to sell the opportunity - builds excitement',
            bonus: 5,
        },
        {
            pattern: /\b(follow.?up|check.?in|touch base|stay in contact)\b/gi,
            message: 'Plans follow-up during decision period - maintains engagement',
            bonus: 5,
        },
    ];

    bestPractices.forEach(practice => {
        if (practice.pattern.test(submission)) {
            strengths.push(`✅ ${practice.message}`);
            score += practice.bonus;
        }
    });

    // ===== 9. COUNTER-OFFER HANDLING =====
    // Specific check for counter-offer scenarios

    const counterOfferSignals = [
        /\b(counter.?offer|current employer|retention|stay|match)\b/gi,
        /\b(buy back|bidding war|competing offer)\b/gi,
        /\b(why (leave|leaving)|reason for change|push factors)\b/gi,
    ];

    const counterOfferMatches = counterOfferSignals.filter(p => p.test(submission)).length;

    if (counterOfferMatches >= 2) {
        strengths.push(`Addresses counter-offer risk - proactively handles retention attempts`);
        score += 6;
    } else if (counterOfferMatches === 0) {
        feedback.push(`💡 COUNTER-OFFER RISK: Many candidates get counter-offers. Plan how to handle: reinforce why they're leaving.`);
    }

    // ===== 10. OVERALL QUALITY SUMMARY =====

    const checkScore = Object.values(checks).filter(Boolean).length;

    if (checkScore >= 5) {
        strengths.push(`✅ STRONG NEGOTIATION STRATEGY: Comprehensive approach covering motivation, tactics, and closing`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT NEGOTIATION APPROACH: Has key elements but could strengthen tactics or closing`);
    } else {
        feedback.push(`⚠️ WEAK NEGOTIATION STRATEGY: Missing critical elements like motivation understanding, tactics, or closing`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.understandsMotivations || !checks.coversCompComponents || !checks.hasNegotiationTactics) {
        feedback.push(`\n💡 NEGOTIATION CHECKLIST:\n` +
            `  ${checks.understandsMotivations ? '✓' : '✗'} Understand motivations (what does candidate value?)\n` +
            `  ${checks.coversCompComponents ? '✓' : '✗'} Compensation components (base, bonus, equity, benefits)\n` +
            `  ${checks.hasNegotiationTactics ? '✓' : '✗'} Negotiation tactics (anchoring, market data, framing)\n` +
            `  ${checks.considersAlternatives ? '✓' : '✗'} Alternatives/BATNA (their options, counter-offer risk)\n` +
            `  ${checks.usesWinWinApproach ? '✓' : '✗'} Win-win approach (mutual value, relationship focus)\n` +
            `  ${checks.hasClosingStrategy ? '✓' : '✗'} Closing strategy (objection handling, commitment)\n\n` +
            `**EXAMPLE NEGOTIATION APPROACH:**\n` +
            `  1. Discovery: "What's most important to you in your next role?"\n` +
            `  2. Present: Frame offer around their stated priorities\n` +
            `  3. Anchor: Start with strong total comp story, not just base\n` +
            `  4. Trade-offs: "We can't move on base, but could add signing bonus"\n` +
            `  5. Address concerns: "What would need to be true for you to accept?"\n` +
            `  6. Counter-offer prep: "When your employer counters, remember why you're leaving"\n` +
            `  7. Close: "We're excited about you joining. What questions remain?"`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
