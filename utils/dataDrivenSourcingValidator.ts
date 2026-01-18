import { ValidationResult } from '../types';

/**
 * Data-Driven Sourcing Validation - Checks for realistic metrics and benchmarks
 *
 * Modern sourcing is quantitative. This validator ensures:
 * - Metrics are included in strategic responses
 * - Conversion rates are realistic (e.g., InMail: 15-30%)
 * - Time estimates are grounded in reality
 * - Pipeline velocity claims are achievable
 *
 * Based on industry benchmarks from LinkedIn Talent Solutions, Greenhouse, and SHRM.
 */
export function validateDataDrivenSourcing(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        includesMetrics: false,
        realisticConversion: true, // Default true, penalize if unrealistic
        realisticTimeEstimates: true,
        includesPipelineData: false,
        avoidsUnrealisticClaims: true,
    };

    // ===== 1. METRICS PRESENCE =====
    // Check if submission includes any quantitative data

    const metricPatterns = [
        /\d+%/,                                          // Percentages: 25%
        /\d+\s*(candidates?|profiles?|people|hires?)/i,  // Volume: 50 candidates
        /\d+\s*(hours?|days?|weeks?|months?)/i,          // Time: 2 weeks, 3 days
        /\d+\s*to\s*\d+/,                                // Ranges: 20 to 30
        /\$\d+[Kk]?/,                                    // Budget/Cost: $5K
        /\d+x/i,                                         // Multipliers: 3x faster
        /\d+:\d+/,                                       // Ratios: 1:5 ratio
    ];

    const hasMetrics = metricPatterns.some(pattern => pattern.test(submission));

    if (hasMetrics) {
        checks.includesMetrics = true;
        strengths.push('Includes quantitative metrics - shows data-driven thinking');
        score += 5; // Bonus for being data-driven
    } else {
        feedback.push('❌ NO METRICS: Modern sourcing requires quantitative thinking. Include numbers: conversion rates, time estimates, candidate volumes, or success metrics.');
        score -= 25;
    }

    // ===== 2. CONVERSION RATE REALITY CHECKS =====
    // Detect claims about response rates, conversion rates, etc.

    const conversionClaims = [
        // InMail/Email response rates
        {
            pattern: /inmail.*?(\d+)%|response.*?rate.*?(\d+)%|outreach.*?(\d+)%/gi,
            name: 'InMail/Email Response Rate',
            realistic: { min: 10, max: 35 },
            benchmark: '15-30% for targeted InMails, 5-15% for cold emails',
        },
        // Application to interview conversion
        {
            pattern: /application.*?to.*?interview.*?(\d+)%|screen.*?rate.*?(\d+)%/gi,
            name: 'Application → Interview',
            realistic: { min: 10, max: 30 },
            benchmark: '15-25% for well-qualified applicants',
        },
        // Interview to offer
        {
            pattern: /interview.*?to.*?offer.*?(\d+)%|offer.*?rate.*?(\d+)%/gi,
            name: 'Interview → Offer',
            realistic: { min: 20, max: 60 },
            benchmark: '30-50% for most roles',
        },
        // Offer acceptance
        {
            pattern: /offer.*?acceptance.*?(\d+)%|accept.*?rate.*?(\d+)%/gi,
            name: 'Offer Acceptance',
            realistic: { min: 60, max: 95 },
            benchmark: '75-90% for competitive offers',
        },
    ];

    conversionClaims.forEach((claim) => {
        const matches = Array.from(submission.matchAll(claim.pattern));

        matches.forEach((match) => {
            // Extract the percentage from capture groups
            const percentage = parseInt(match[1] || match[2] || match[3] || '0', 10);

            if (percentage > 0) {
                if (percentage < claim.realistic.min || percentage > claim.realistic.max) {
                    checks.realisticConversion = false;
                    feedback.push(
                        `⚠️ UNREALISTIC ${claim.name.toUpperCase()}: You mentioned ${percentage}%, ` +
                        `but industry benchmark is ${claim.benchmark}. ` +
                        `This could signal lack of real-world experience.`
                    );
                    score -= 15;
                } else {
                    strengths.push(`Realistic ${claim.name} assumption (${percentage}%) - aligns with industry benchmarks`);
                }
            }
        });
    });

    // ===== 3. TIME ESTIMATE REALITY CHECKS =====
    // Detect claims about sourcing speed, time-to-hire, etc.

    const timeEstimates = [
        // Candidates sourced per day/week
        {
            pattern: /(\d+)\s*candidates?.*?(per|in|within)\s*(day|week)/gi,
            validator: (num: number, period: string) => {
                if (period === 'day') {
                    // 10-30 candidates/day is realistic for active sourcing
                    if (num > 50) return { realistic: false, reason: 'Over 50 candidates/day is unlikely for quality sourcing' };
                    if (num < 5) return { realistic: false, reason: 'Under 5 candidates/day suggests inefficiency' };
                } else if (period === 'week') {
                    // 50-150 candidates/week is realistic
                    if (num > 300) return { realistic: false, reason: 'Over 300 candidates/week sacrifices quality for quantity' };
                }
                return { realistic: true, reason: '' };
            },
        },
        // Time to fill a role
        {
            pattern: /fill.*?in\s*(\d+)\s*(days?|weeks?)|hire.*?in\s*(\d+)\s*(days?|weeks?)/gi,
            validator: (num: number, period: string) => {
                const days = period.startsWith('week') ? num * 7 : num;
                // 30-60 days is typical for professional roles
                if (days < 14) return { realistic: false, reason: 'Under 2 weeks to fill is extremely rare (except for high-urgency/intern roles)' };
                if (days > 120) return { realistic: false, reason: 'Over 120 days suggests process inefficiency' };
                return { realistic: true, reason: '' };
            },
        },
    ];

    timeEstimates.forEach((estimate) => {
        const matches = Array.from(submission.matchAll(estimate.pattern));

        matches.forEach((match) => {
            const num = parseInt(match[1] || match[3] || '0', 10);
            const period = (match[2] || match[4] || '').toLowerCase();

            if (num > 0 && period) {
                const validation = estimate.validator(num, period);
                if (!validation.realistic) {
                    checks.realisticTimeEstimates = false;
                    feedback.push(`⚠️ UNREALISTIC TIME ESTIMATE: ${validation.reason}`);
                    score -= 12;
                } else {
                    strengths.push(`Realistic time estimate (${num} ${period}) - shows practical experience`);
                }
            }
        });
    });

    // ===== 4. PIPELINE DATA INCLUSION =====
    // Check if submission discusses pipeline stages, funnel metrics, etc.

    const pipelineSignals = [
        /\b(funnel|pipeline|conversion|stage|flow|velocity)\b/gi,
        /\b(application|screen|interview|offer|hire)\s+(to|→)\s+(screen|interview|offer|hire)\b/gi,
        /\b(top of funnel|middle of funnel|bottom of funnel|tofu|mofu|bofu)\b/gi,
        /\b(source|apply|screen|interview|offer|accept)\b.*?\b(rate|ratio|metric)\b/gi,
    ];

    const hasPipelineData = pipelineSignals.some(pattern => pattern.test(submission));

    if (hasPipelineData) {
        checks.includesPipelineData = true;
        strengths.push('Discusses pipeline/funnel metrics - demonstrates systems thinking');
    } else {
        // Only penalize if the response is strategy-focused (contains words like "strategy", "plan", "approach")
        const isStrategyResponse = /\b(strategy|plan|approach|process|funnel|pipeline)\b/i.test(submission);
        if (isStrategyResponse) {
            feedback.push('💡 MISSING PIPELINE THINKING: Consider including funnel metrics (e.g., application → screen → interview → offer conversion rates) to show systems thinking.');
            score -= 10;
        }
    }

    // ===== 5. UNREALISTIC CLAIMS DETECTION =====
    // Flag obviously unrealistic or exaggerated claims

    const unrealisticClaims = [
        {
            pattern: /\b(100%|perfect|always|never|guarantee)\b.*?\b(success|response|hire|conversion)\b/gi,
            message: 'AVOID ABSOLUTES: Claims like "100% success" or "always" are red flags. Recruiting is probabilistic - use realistic ranges instead.',
        },
        {
            pattern: /\b(\d+)\s*(candidates?|profiles?).*?(day|hour)\b/gi,
            validator: (num: number) => num > 100,
            message: 'UNREALISTIC VOLUME: Sourcing 100+ candidates per day/hour suggests spray-and-pray, not quality sourcing.',
        },
        {
            pattern: /\b(instant|immediate|overnight)\b.*?\b(results?|hires?|candidates?)\b/gi,
            message: 'UNREALISTIC SPEED: "Instant" or "overnight" results ignore the realities of candidate engagement and hiring timelines.',
        },
    ];

    unrealisticClaims.forEach((claim) => {
        const matches = claim.pattern.test(submission);

        if (matches) {
            // If there's a validator function, run it
            if ('validator' in claim) {
                const numMatches = Array.from(submission.matchAll(claim.pattern));
                numMatches.forEach((match) => {
                    const num = parseInt(match[1] || '0', 10);
                    if (claim.validator && claim.validator(num)) {
                        checks.avoidsUnrealisticClaims = false;
                        feedback.push(`🚨 ${claim.message}`);
                        score -= 20;
                    }
                });
            } else {
                checks.avoidsUnrealisticClaims = false;
                feedback.push(`🚨 ${claim.message}`);
                score -= 20;
            }
        }
    });

    // ===== 6. SOURCING CHANNEL BENCHMARKS =====
    // Check if mentions sourcing channels with realistic expectations

    const channelBenchmarks = [
        {
            pattern: /\b(linkedin|inmail)\b/gi,
            hasMetric: /linkedin.*?(\d+)%|inmail.*?(\d+)%/gi,
            expectedRange: '15-30% response rate for targeted InMails',
        },
        {
            pattern: /\b(referral|employee referral)\b/gi,
            hasMetric: /referral.*?(\d+)%/gi,
            expectedRange: '30-50% conversion rate (referrals typically outperform other sources)',
        },
        {
            pattern: /\b(cold email|cold outreach)\b/gi,
            hasMetric: /cold.*?(\d+)%|email.*?(\d+)%/gi,
            expectedRange: '5-15% response rate for cold emails',
        },
    ];

    channelBenchmarks.forEach((channel) => {
        const mentionsChannel = channel.pattern.test(submission);
        const includesMetric = channel.hasMetric.test(submission);

        if (mentionsChannel && !includesMetric) {
            feedback.push(
                `💡 CHANNEL BENCHMARK: You mention ${channel.pattern.source.replace(/\\b|\(/g, '').replace(/\|/g, '/')} ` +
                `but don't include metrics. Industry benchmark: ${channel.expectedRange}.`
            );
            score -= 5;
        }
    });

    // ===== 7. DATA-DRIVEN SUMMARY =====

    const dataDrivenScore = Object.values(checks).filter(Boolean).length;

    if (dataDrivenScore >= 4) {
        strengths.push('✅ STRONG DATA-DRIVEN APPROACH: Includes metrics, realistic benchmarks, and quantitative thinking');
    } else if (dataDrivenScore === 3) {
        strengths.push('✓ DECENT DATA USAGE: Some metrics included, but could be more quantitative');
    } else if (dataDrivenScore <= 2) {
        feedback.push('⚠️ WEAK DATA-DRIVEN THINKING: Missing metrics, benchmarks, or realistic estimates. Modern sourcing requires quantitative analysis.');
        score -= 15;
    }

    // Add guidance if metrics are missing or unrealistic
    if (!checks.includesMetrics || !checks.realisticConversion || !checks.realisticTimeEstimates) {
        feedback.push('\n💡 DATA-DRIVEN SOURCING CHECKLIST:\n' +
            `  ${checks.includesMetrics ? '✓' : '✗'} Include metrics (conversion rates, volumes, timelines)\n` +
            `  ${checks.realisticConversion ? '✓' : '✗'} Use realistic conversion rates (InMail: 15-30%, Interview→Offer: 30-50%)\n` +
            `  ${checks.realisticTimeEstimates ? '✓' : '✗'} Ground time estimates in reality (typical time-to-fill: 30-60 days)\n` +
            `  ${checks.includesPipelineData ? '✓' : '✗'} Discuss pipeline/funnel metrics when relevant\n` +
            `  ${checks.avoidsUnrealisticClaims ? '✓' : '✗'} Avoid absolutes like "100% success" or "instant results"`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
