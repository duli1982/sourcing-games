import { ValidationResult } from '../types';

/**
 * Talent Intelligence Validator
 *
 * Validates talent market analysis and intelligence gathering strategies.
 *
 * Validates:
 * - Market mapping and competitor analysis
 * - Talent pool identification
 * - Compensation benchmarking
 * - Skills and trends analysis
 * - Data sources and methodology
 * - Actionable insights and recommendations
 */
export function validateTalentIntelligence(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        hasMarketMapping: false,
        hasTalentPoolAnalysis: false,
        hasCompBenchmarking: false,
        analyzesSkillsTrends: false,
        citesDataSources: false,
        providesActionableInsights: false,
    };

    // ===== 1. MARKET MAPPING & COMPETITOR ANALYSIS =====
    // Check for competitor and market landscape analysis

    const marketMappingSignals = [
        { pattern: /\b(competitor|competition|rival|peer companies|similar companies)\b/gi, name: 'Competitor focus', points: 8 },
        { pattern: /\b(market map|mapping|landscape|ecosystem)\b/gi, name: 'Market mapping', points: 8 },
        { pattern: /\b(industry|sector|vertical|space|market)\b/gi, name: 'Industry context', points: 5 },
        { pattern: /\b(org chart|organization|structure|hierarchy|team structure)\b/gi, name: 'Org structure', points: 7 },
        { pattern: /\b(headcount|size|growth|hiring|expansion)\b/gi, name: 'Company size/growth', points: 6 },
        { pattern: /\b(target companies|target list|prospect|account)\b/gi, name: 'Target companies', points: 7 },
        { pattern: /\b(location|geography|region|hub|office)\b/gi, name: 'Geographic analysis', points: 5 },
    ];

    let marketPoints = 0;

    marketMappingSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            marketPoints += signal.points;
        }
    });

    if (marketPoints >= 25) {
        checks.hasMarketMapping = true;
        strengths.push(`Strong market mapping - comprehensive competitor and landscape analysis`);
        score += 12;
    } else if (marketPoints >= 12) {
        checks.hasMarketMapping = true;
        feedback.push(`✓ Has market analysis basics. Consider: competitor org charts, geographic hubs, growth trends.`);
    } else {
        feedback.push(`❌ WEAK MARKET MAPPING: Include competitor analysis, target companies, industry landscape, and geographic hubs.`);
        score -= 18;
    }

    // ===== 2. TALENT POOL ANALYSIS =====
    // Check for talent supply/demand analysis

    const talentPoolSignals = [
        { pattern: /\b(talent pool|candidate pool|supply|available talent)\b/gi, name: 'Talent pool', points: 8 },
        { pattern: /\b(demand|competition for|scarcity|shortage|surplus)\b/gi, name: 'Supply/demand', points: 7 },
        { pattern: /\b(pipeline|funnel|source|channel)\b/gi, name: 'Pipeline/sourcing', points: 6 },
        { pattern: /\b(diversity|demographics|representation)\b/gi, name: 'Diversity analysis', points: 6 },
        { pattern: /\b(passive|active|employed|unemployed|looking)\b/gi, name: 'Candidate status', points: 5 },
        { pattern: /\b(experience level|seniority|junior|senior|mid)\b/gi, name: 'Experience levels', points: 5 },
        { pattern: /\b(volume|count|number|how many|quantity)\b/gi, name: 'Quantification', points: 6 },
    ];

    let poolPoints = 0;

    talentPoolSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            poolPoints += signal.points;
        }
    });

    if (poolPoints >= 22) {
        checks.hasTalentPoolAnalysis = true;
        strengths.push(`Comprehensive talent pool analysis - understands supply, demand, and candidate demographics`);
        score += 10;
    } else if (poolPoints >= 12) {
        checks.hasTalentPoolAnalysis = true;
        feedback.push(`💡 Deepen talent pool analysis: How many candidates exist? What's the competition? Diversity breakdown?`);
    } else {
        feedback.push(`❌ MISSING TALENT POOL ANALYSIS: How big is the talent pool? Is it growing or shrinking? What's the competition level?`);
        score -= 15;
    }

    // ===== 3. COMPENSATION BENCHMARKING =====
    // Check for salary and comp analysis

    const compBenchmarkSignals = [
        { pattern: /\b(salary|compensation|pay|comp|wages)\b/gi, name: 'Comp mention', points: 6 },
        { pattern: /\b(benchmark|market rate|competitive|range|band)\b/gi, name: 'Benchmarking', points: 8 },
        { pattern: /\b(percentile|median|average|mean|p50|p75|p90)\b/gi, name: 'Statistical terms', points: 8 },
        { pattern: /\b(total comp|base|bonus|equity|stock|rsu)\b/gi, name: 'Comp components', points: 6 },
        { pattern: /\b(levels?\.fyi|glassdoor|payscale|salary\.com|comparably)\b/gi, name: 'Comp data sources', points: 7 },
        { pattern: /\$\s*\d+[,\d]*(k|K|,000)?/g, name: 'Actual numbers', points: 7 },
        { pattern: /\b(cost of living|col|adjustment|premium)\b/gi, name: 'COL awareness', points: 5 },
    ];

    let compPoints = 0;
    const hasNumbers = /\$\s*\d+[,\d]*(k|K|,000)?/.test(submission) || /\d+%/.test(submission);

    compBenchmarkSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            compPoints += signal.points;
        }
    });

    if (compPoints >= 25 && hasNumbers) {
        checks.hasCompBenchmarking = true;
        strengths.push(`Strong compensation benchmarking with actual data points and market context`);
        score += 12;
    } else if (compPoints >= 15) {
        checks.hasCompBenchmarking = true;
        if (!hasNumbers) {
            feedback.push(`💰 Add specific numbers: "Market rate is $150K-$180K base, P75 is $165K" is more useful than "competitive pay".`);
        }
    } else {
        feedback.push(`❌ WEAK COMP BENCHMARKING: Include salary ranges, percentiles, and total comp breakdown for the target market.`);
        score -= 15;
    }

    // ===== 4. SKILLS & TRENDS ANALYSIS =====
    // Check for skills demand and market trends

    const skillsTrendsSignals = [
        { pattern: /\b(skills?|competenc|capabilit|expertise)\b/gi, name: 'Skills focus', points: 6 },
        { pattern: /\b(trend|trending|emerging|growing|declining)\b/gi, name: 'Trends', points: 7 },
        { pattern: /\b(demand|in.?demand|hot|sought.?after)\b/gi, name: 'Demand signals', points: 6 },
        { pattern: /\b(technology|tech stack|tools|platforms)\b/gi, name: 'Tech focus', points: 5 },
        { pattern: /\b(future|forecast|predict|projection)\b/gi, name: 'Forward-looking', points: 6 },
        { pattern: /\b(upskill|reskill|training|certification)\b/gi, name: 'Skill development', points: 5 },
        { pattern: /\b(adjacent|transferable|similar|related)\b/gi, name: 'Adjacent skills', points: 6 },
        { pattern: /\b(ai|machine learning|cloud|devops|data|cyber)\b/gi, name: 'Hot skill areas', points: 5 },
    ];

    let skillsPoints = 0;

    skillsTrendsSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            skillsPoints += signal.points;
        }
    });

    if (skillsPoints >= 25) {
        checks.analyzesSkillsTrends = true;
        strengths.push(`Strong skills and trends analysis - identifies emerging demands and adjacencies`);
        score += 10;
    } else if (skillsPoints >= 12) {
        checks.analyzesSkillsTrends = true;
        feedback.push(`💡 Deepen skills analysis: What skills are trending up/down? What adjacent skills could work? Future demands?`);
    } else {
        feedback.push(`📈 MISSING SKILLS TRENDS: What skills are in demand? Growing or declining? What are adjacent/transferable skills?`);
        score -= 12;
    }

    // ===== 5. DATA SOURCES =====
    // Check for credible data sources and methodology

    const dataSourceSignals = [
        { pattern: /\b(linkedin|indeed|glassdoor|levels\.fyi|blind)\b/gi, name: 'Job/comp platforms', points: 7 },
        { pattern: /\b(bureau of labor|bls|government data)\b/gi, name: 'Government data', points: 6 },
        { pattern: /\b(survey|report|study|research|analysis)\b/gi, name: 'Research sources', points: 6 },
        { pattern: /\b(data|dataset|database|records)\b/gi, name: 'Data mention', points: 4 },
        { pattern: /\b(source|according to|per|based on|from)\b/gi, name: 'Attribution', points: 5 },
        { pattern: /\b(methodology|approach|method|how we)\b/gi, name: 'Methodology', points: 6 },
        { pattern: /\b(crunchbase|pitchbook|owler|zoominfo)\b/gi, name: 'Company intel tools', points: 7 },
        { pattern: /\b(ats|hris|internal data|our data)\b/gi, name: 'Internal data', points: 5 },
    ];

    let dataPoints = 0;

    dataSourceSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            dataPoints += signal.points;
        }
    });

    if (dataPoints >= 22) {
        checks.citesDataSources = true;
        strengths.push(`Well-sourced intelligence - cites credible data sources and methodology`);
        score += 10;
    } else if (dataPoints >= 10) {
        checks.citesDataSources = true;
        feedback.push(`💡 Strengthen credibility: Cite specific sources (LinkedIn, Levels.fyi, industry reports, internal data).`);
    } else {
        feedback.push(`📊 MISSING DATA SOURCES: Where does this intelligence come from? Cite: LinkedIn, Glassdoor, reports, internal data.`);
        score -= 12;
    }

    // ===== 6. ACTIONABLE INSIGHTS =====
    // Check for recommendations and next steps

    const actionableSignals = [
        { pattern: /\b(recommend|suggestion|should|consider|advise)\b/gi, name: 'Recommendations', points: 7 },
        { pattern: /\b(strategy|approach|tactic|plan|action)\b/gi, name: 'Strategy language', points: 6 },
        { pattern: /\b(opportunity|risk|challenge|threat|advantage)\b/gi, name: 'SWOT elements', points: 6 },
        { pattern: /\b(implication|impact|meaning|therefore|so what)\b/gi, name: 'Implications', points: 7 },
        { pattern: /\b(prioritize|focus|target|concentrate)\b/gi, name: 'Prioritization', points: 6 },
        { pattern: /\b(timeline|when|timing|now|soon|q[1-4])\b/gi, name: 'Timing', points: 5 },
        { pattern: /\b(budget|invest|resource|cost)\b/gi, name: 'Resource implications', points: 5 },
    ];

    let actionablePoints = 0;

    actionableSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            actionablePoints += signal.points;
        }
    });

    if (actionablePoints >= 24) {
        checks.providesActionableInsights = true;
        strengths.push(`Highly actionable - clear recommendations, implications, and strategic guidance`);
        score += 10;
    } else if (actionablePoints >= 12) {
        checks.providesActionableInsights = true;
        feedback.push(`💡 Make it more actionable: What should we DO with this intelligence? Priorities? Risks? Timeline?`);
    } else {
        feedback.push(`❌ NOT ACTIONABLE: Intelligence without recommendations is just data. What should we DO? Priorities? Risks?`);
        score -= 15;
    }

    // ===== 7. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(obviously|everyone knows|it's clear|common knowledge)\b/gi,
            message: 'Unsupported assumptions - back claims with data',
            penalty: 6,
        },
        {
            pattern: /\b(always|never|all|none|every|no one)\b/gi,
            message: 'Absolute statements are rarely accurate - use nuanced language',
            penalty: 4,
        },
        {
            pattern: /\b(just|simply|easily|obviously)\b.*\b(hire|find|source)\b/gi,
            message: 'Oversimplification - acknowledge complexity and challenges',
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
            pattern: /\b(visual|chart|graph|diagram|map|table)\b/gi,
            message: 'Uses visual representations - makes data more digestible',
            bonus: 5,
        },
        {
            pattern: /\b(executive summary|key findings|tldr|highlights)\b/gi,
            message: 'Includes executive summary - respects stakeholder time',
            bonus: 5,
        },
        {
            pattern: /\b(compare|comparison|versus|vs\.?|relative to)\b/gi,
            message: 'Uses comparative analysis - provides context',
            bonus: 4,
        },
        {
            pattern: /\b(segment|cohort|breakdown|by|split)\b/gi,
            message: 'Segments data appropriately - enables targeted strategies',
            bonus: 5,
        },
        {
            pattern: /\b(refresh|update|monitor|track|ongoing)\b/gi,
            message: 'Plans for ongoing monitoring - intelligence needs refreshing',
            bonus: 4,
        },
        {
            pattern: /\b(caveat|limitation|note|however|although)\b/gi,
            message: 'Acknowledges limitations - builds credibility',
            bonus: 4,
        },
    ];

    bestPractices.forEach(practice => {
        if (practice.pattern.test(submission)) {
            strengths.push(`✅ ${practice.message}`);
            score += practice.bonus;
        }
    });

    // ===== 9. QUANTIFICATION CHECK =====
    // Check for specific numbers and data points

    const numberPatterns = [
        /\d+%/g,                          // Percentages
        /\$\s*\d+[,\d]*(k|K|M|B)?/g,      // Dollar amounts
        /\d+[,\d]*\s*(candidates|people|employees|positions|roles)/gi,  // Counts
        /\d+x|\d+\s*times/gi,             // Multipliers
    ];

    let hasQuantification = false;
    numberPatterns.forEach(pattern => {
        if (pattern.test(submission)) {
            hasQuantification = true;
        }
    });

    if (hasQuantification) {
        strengths.push(`Uses specific numbers and data points - makes intelligence concrete`);
        score += 5;
    } else {
        feedback.push(`📊 ADD QUANTIFICATION: Use specific numbers: "Pool of 5,000 candidates", "25% growth YoY", "$150K median".`);
        score -= 8;
    }

    // ===== 10. OVERALL QUALITY SUMMARY =====

    const checkScore = Object.values(checks).filter(Boolean).length;

    if (checkScore >= 5) {
        strengths.push(`✅ STRONG TALENT INTELLIGENCE: Comprehensive, data-driven, and actionable analysis`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT TALENT INTELLIGENCE: Has key elements but could improve depth or actionability`);
    } else {
        feedback.push(`⚠️ WEAK TALENT INTELLIGENCE: Missing critical elements like market mapping, data sources, or recommendations`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.hasMarketMapping || !checks.hasCompBenchmarking || !checks.providesActionableInsights) {
        feedback.push(`\n💡 TALENT INTELLIGENCE CHECKLIST:\n` +
            `  ${checks.hasMarketMapping ? '✓' : '✗'} Market mapping (competitors, target companies, geography)\n` +
            `  ${checks.hasTalentPoolAnalysis ? '✓' : '✗'} Talent pool analysis (supply, demand, demographics)\n` +
            `  ${checks.hasCompBenchmarking ? '✓' : '✗'} Compensation benchmarking (ranges, percentiles, components)\n` +
            `  ${checks.analyzesSkillsTrends ? '✓' : '✗'} Skills & trends (in-demand skills, emerging areas)\n` +
            `  ${checks.citesDataSources ? '✓' : '✗'} Data sources (LinkedIn, Glassdoor, reports, methodology)\n` +
            `  ${checks.providesActionableInsights ? '✓' : '✗'} Actionable insights (recommendations, priorities, risks)\n\n` +
            `**EXAMPLE TALENT INTELLIGENCE STRUCTURE:**\n` +
            `  1. Executive Summary: Key findings and recommendations\n` +
            `  2. Market Landscape: Top 10 competitors, org structures, hiring trends\n` +
            `  3. Talent Pool: 8,500 candidates in market, 60% passive, diversity breakdown\n` +
            `  4. Compensation: P50 base $145K, total comp $180K, 15% premium for AI skills\n` +
            `  5. Skills Trends: Python +25% demand, legacy skills declining\n` +
            `  6. Recommendations: Target Companies A, B, C; adjust comp to P60; expand geo\n` +
            `  7. Risks: High competition from FAANG, 6-month hiring timeline needed`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
