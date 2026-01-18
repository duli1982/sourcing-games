import { ValidationResult } from '../types';

/**
 * Job Description Validator
 *
 * Validates job descriptions for effectiveness in attracting qualified candidates.
 *
 * Validates:
 * - Clear job title and summary
 * - Well-defined responsibilities
 * - Realistic requirements (must-have vs nice-to-have)
 * - Compensation transparency
 * - Company/culture information
 * - Inclusive language
 * - Call to action
 */
export function validateJobDescription(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        hasClearTitle: false,
        hasResponsibilities: false,
        hasRequirements: false,
        hasCompensation: false,
        hasCompanyInfo: false,
        usesInclusiveLanguage: true, // Start true, penalize if biased language found
        hasCallToAction: false,
    };

    // ===== 1. JOB TITLE & SUMMARY =====
    // Check for clear job title and overview

    const titleSignals = [
        { pattern: /\b(job title|position|role|title):\s*\w+/gi, name: 'Explicit title', points: 8 },
        { pattern: /\b(senior|junior|lead|principal|staff|manager|director|vp)\b/gi, name: 'Level indicator', points: 6 },
        { pattern: /\b(summary|overview|about this role|about the position|the opportunity)\b/gi, name: 'Summary section', points: 7 },
        { pattern: /\b(full.?time|part.?time|contract|permanent|remote|hybrid|on.?site)\b/gi, name: 'Employment type', points: 6 },
        { pattern: /\b(team|department|reporting to|reports to)\b/gi, name: 'Team context', points: 5 },
    ];

    let titlePoints = 0;

    titleSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            titlePoints += signal.points;
        }
    });

    if (titlePoints >= 18) {
        checks.hasClearTitle = true;
        strengths.push(`Clear job title with level, team context, and summary`);
        score += 8;
    } else if (titlePoints >= 10) {
        checks.hasClearTitle = true;
        feedback.push(`✓ Has title basics. Consider adding: seniority level, team context, employment type (remote/hybrid).`);
    } else {
        feedback.push(`❌ UNCLEAR JOB TITLE: Start with a clear title including level (Senior, Lead), team, and a compelling summary.`);
        score -= 18;
    }

    // ===== 2. RESPONSIBILITIES =====
    // Check for well-defined responsibilities

    const responsibilitySignals = [
        { pattern: /\b(responsibilities|duties|what you('ll| will) do|day.?to.?day|your role)\b/gi, name: 'Responsibilities section', points: 8 },
        { pattern: /\b(own|lead|manage|drive|build|develop|create|design|implement)\b/gi, name: 'Action verbs', points: 6 },
        { pattern: /\b(collaborate|partner|work with|cross.?functional)\b/gi, name: 'Collaboration', points: 5 },
        { pattern: /•|▪|●|\d+\.|[-*]\s+\w/gm, name: 'Bullet points', points: 5 },
        { pattern: /\b(impact|outcomes?|goals?|objectives?|kpis?|metrics?)\b/gi, name: 'Impact/outcomes', points: 7 },
    ];

    let responsibilityPoints = 0;
    let responsibilityMatches = 0;

    responsibilitySignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            responsibilityPoints += signal.points;
            responsibilityMatches++;
        }
    });

    if (responsibilityPoints >= 20) {
        checks.hasResponsibilities = true;
        strengths.push(`Well-defined responsibilities with clear action items and expected impact`);
        score += 10;
    } else if (responsibilityPoints >= 10) {
        checks.hasResponsibilities = true;
        feedback.push(`💡 Strengthen responsibilities: Use action verbs, add expected impact/outcomes, organize as bullet points.`);
    } else {
        feedback.push(`❌ WEAK RESPONSIBILITIES: Include 5-7 bullet points starting with action verbs (Own, Lead, Build, Design).`);
        score -= 20;
    }

    // ===== 3. REQUIREMENTS =====
    // Check for clear must-have vs nice-to-have

    const requirementSignals = [
        { pattern: /\b(requirements|qualifications|what we('re| are) looking for|who you are)\b/gi, name: 'Requirements section', points: 8 },
        { pattern: /\b(must.?have|required|minimum|essential)\b/gi, name: 'Must-have', points: 7 },
        { pattern: /\b(nice.?to.?have|preferred|bonus|plus|ideal)\b/gi, name: 'Nice-to-have', points: 8 },
        { pattern: /\b(\d+\+?\s*years?|yrs?|experience)\b/gi, name: 'Experience level', points: 6 },
        { pattern: /\b(degree|bachelor|master|phd|education)\b/gi, name: 'Education', points: 4 },
        { pattern: /\b(skills?|proficien|expertise|knowledge)\b/gi, name: 'Skills mention', points: 5 },
    ];

    let requirementPoints = 0;
    const hasMustHave = /\b(must.?have|required|minimum|essential)\b/gi.test(submission);
    const hasNiceToHave = /\b(nice.?to.?have|preferred|bonus|plus|ideal)\b/gi.test(submission);

    requirementSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            requirementPoints += signal.points;
        }
    });

    if (requirementPoints >= 22 && hasMustHave && hasNiceToHave) {
        checks.hasRequirements = true;
        strengths.push(`Clear requirements with distinct must-have and nice-to-have sections`);
        score += 12;
    } else if (requirementPoints >= 15) {
        checks.hasRequirements = true;
        if (!hasNiceToHave) {
            feedback.push(`💡 SEPARATE REQUIREMENTS: Distinguish "Must-Have" from "Nice-to-Have" - reduces unqualified applications.`);
        }
    } else {
        feedback.push(`❌ VAGUE REQUIREMENTS: List clear must-haves (skills, years of experience) AND nice-to-haves separately.`);
        score -= 18;
    }

    // ===== 4. COMPENSATION & BENEFITS =====
    // Check for compensation transparency

    const compensationSignals = [
        { pattern: /\$\s*\d+[,\d]*\s*(k|K|,000)?(\s*[-–]\s*\$?\s*\d+[,\d]*(k|K|,000)?)?/g, name: 'Salary range', points: 15 },
        { pattern: /\b(salary|compensation|pay|wage|total comp)\b/gi, name: 'Compensation mention', points: 6 },
        { pattern: /\b(benefits|perks|401k|health|insurance|pto|vacation|equity|stock|rsu)\b/gi, name: 'Benefits', points: 8 },
        { pattern: /\b(bonus|commission|variable|incentive)\b/gi, name: 'Variable pay', points: 5 },
        { pattern: /\b(competitive|market|industry)\s*(salary|compensation|pay)\b/gi, name: 'Competitive pay claim', points: 2 },
    ];

    let compensationPoints = 0;
    const hasSalaryRange = /\$\s*\d+[,\d]*\s*(k|K|,000)?/g.test(submission);

    compensationSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            compensationPoints += signal.points;
        }
    });

    if (compensationPoints >= 20 && hasSalaryRange) {
        checks.hasCompensation = true;
        strengths.push(`Transparent compensation with salary range and benefits - increases quality applicants by 30%+`);
        score += 12;
    } else if (compensationPoints >= 10) {
        checks.hasCompensation = true;
        if (!hasSalaryRange) {
            feedback.push(`💰 ADD SALARY RANGE: JDs with salary ranges get 30% more applications. Even a range like "$120K-$150K" helps.`);
        }
    } else {
        feedback.push(`❌ NO COMPENSATION INFO: Include salary range and benefits. This is the #1 thing candidates look for.`);
        score -= 15;
    }

    // ===== 5. COMPANY & CULTURE =====
    // Check for company context

    const companySignals = [
        { pattern: /\b(about us|who we are|our company|our mission|our culture)\b/gi, name: 'About section', points: 7 },
        { pattern: /\b(mission|vision|values|purpose)\b/gi, name: 'Mission/values', points: 5 },
        { pattern: /\b(culture|environment|team|work.?life|balance)\b/gi, name: 'Culture mentions', points: 5 },
        { pattern: /\b(growth|learn|develop|career|opportunity)\b/gi, name: 'Growth opportunities', points: 6 },
        { pattern: /\b(diversity|inclusion|dei|belonging|equity)\b/gi, name: 'DEI commitment', points: 6 },
        { pattern: /\b(startup|series [a-d]|funded|profitable|growing|scale)\b/gi, name: 'Company stage', points: 5 },
    ];

    let companyPoints = 0;

    companySignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            companyPoints += signal.points;
        }
    });

    if (companyPoints >= 20) {
        checks.hasCompanyInfo = true;
        strengths.push(`Rich company context - helps candidates assess culture fit`);
        score += 8;
    } else if (companyPoints >= 10) {
        checks.hasCompanyInfo = true;
        feedback.push(`💡 Add more about your culture, growth opportunities, and what makes your company unique.`);
    } else {
        feedback.push(`🏢 MISSING COMPANY INFO: Candidates want to know about your mission, culture, and growth opportunities.`);
        score -= 10;
    }

    // ===== 6. INCLUSIVE LANGUAGE CHECK =====
    // Check for potentially exclusionary language

    const exclusionaryPatterns = [
        { pattern: /\b(rockstar|ninja|guru|wizard|superhero|hacker)\b/gi, issue: 'Tech bro language', penalty: 6 },
        { pattern: /\b(young|youthful|digital native|recent grad only)\b/gi, issue: 'Age-biased language', penalty: 10 },
        { pattern: /\b(aggressive|dominant|competitive)\b/gi, issue: 'Gendered language (masculine-coded)', penalty: 5 },
        { pattern: /\b(culture fit)\b/gi, issue: '"Culture fit" can mask bias - use "culture add" instead', penalty: 4 },
        { pattern: /\b(native speaker|native english|mother tongue)\b/gi, issue: 'Language bias - use "fluent" or "proficient"', penalty: 8 },
        { pattern: /\b(clean.?shaven|professional appearance|dress code)\b/gi, issue: 'Appearance requirements may exclude', penalty: 6 },
    ];

    exclusionaryPatterns.forEach(pattern => {
        if (pattern.pattern.test(submission)) {
            checks.usesInclusiveLanguage = false;
            feedback.push(`⚠️ INCLUSION: "${pattern.issue}" - Consider more inclusive alternatives.`);
            score -= pattern.penalty;
        }
    });

    // Check for inclusive signals
    const inclusiveSignals = [
        { pattern: /\b(diverse|diversity|inclusive|inclusion|belonging|dei)\b/gi, name: 'DEI language', bonus: 5 },
        { pattern: /\b(accommodation|accessible|accessibility)\b/gi, name: 'Accessibility mention', bonus: 4 },
        { pattern: /\b(equal opportunity|eeo|we welcome)\b/gi, name: 'EEO statement', bonus: 3 },
        { pattern: /\b(all backgrounds|underrepresented|minority)\b/gi, name: 'Encouraging underrepresented', bonus: 4 },
    ];

    inclusiveSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            if (checks.usesInclusiveLanguage) {
                strengths.push(`✅ ${signal.name} - promotes inclusive hiring`);
            }
            score += signal.bonus;
        }
    });

    // ===== 7. CALL TO ACTION =====
    // Check for clear next steps

    const ctaSignals = [
        { pattern: /\b(apply|submit|send|click|interested)\b.*\b(now|today|here|below)\b/gi, name: 'Apply CTA', points: 8 },
        { pattern: /\b(how to apply|application process|next steps)\b/gi, name: 'Process explanation', points: 7 },
        { pattern: /\b(we('d| would) love to hear|we want to meet|join us|join our team)\b/gi, name: 'Welcoming tone', points: 5 },
        { pattern: /\b(questions|contact|reach out|email us)\b/gi, name: 'Contact option', points: 4 },
    ];

    let ctaPoints = 0;

    ctaSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            ctaPoints += signal.points;
        }
    });

    if (ctaPoints >= 12) {
        checks.hasCallToAction = true;
        strengths.push(`Clear call-to-action - candidates know exactly how to apply`);
        score += 6;
    } else if (ctaPoints >= 5) {
        checks.hasCallToAction = true;
        feedback.push(`💡 Strengthen your CTA: Make it clear and inviting. "Apply now" + "Questions? Email us at..."`);
    } else {
        feedback.push(`📋 NO CALL TO ACTION: End with clear instructions: "Apply now" or "Send your resume to..."`);
        score -= 8;
    }

    // ===== 8. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(fast.?paced|wear many hats|self.?starter)\b/gi,
            message: 'Vague buzzwords - be specific about what the role actually involves',
            penalty: 4,
        },
        {
            pattern: /\b(other duties as assigned|anything else|whatever it takes)\b/gi,
            message: 'Unclear scope - define boundaries to attract right candidates',
            penalty: 5,
        },
        {
            pattern: /\b(10\+|15\+|20\+)\s*years?\b/gi,
            message: 'Excessive experience requirements may exclude qualified candidates',
            penalty: 6,
        },
        {
            pattern: /\b(immediately|asap|urgent|yesterday)\b/gi,
            message: 'Urgency language can signal disorganization or desperation',
            penalty: 4,
        },
    ];

    pitfalls.forEach(pitfall => {
        if (pitfall.pattern.test(submission)) {
            feedback.push(`⚠️ ${pitfall.message}`);
            score -= pitfall.penalty;
        }
    });

    // ===== 9. BEST PRACTICES BONUS =====

    const bestPractices = [
        {
            pattern: /\b(day in the life|typical day|what you('ll| will) work on)\b/gi,
            message: 'Shows day-to-day reality - helps candidates self-select',
            bonus: 6,
        },
        {
            pattern: /\b(interview process|hiring process|what to expect|timeline)\b/gi,
            message: 'Transparency about hiring process - reduces candidate anxiety',
            bonus: 5,
        },
        {
            pattern: /\b(we offer|you('ll| will) receive|in return)\b/gi,
            message: 'Clear value proposition for candidates',
            bonus: 4,
        },
        {
            pattern: /\b(location|office|remote|hybrid|wfh|work from home)\b/gi,
            message: 'Clear about work arrangement - top candidate concern',
            bonus: 5,
        },
    ];

    bestPractices.forEach(practice => {
        if (practice.pattern.test(submission)) {
            strengths.push(`✅ ${practice.message}`);
            score += practice.bonus;
        }
    });

    // ===== 10. LENGTH CHECK =====

    const wordCount = submission.split(/\s+/).length;

    if (wordCount < 150) {
        feedback.push(`📏 TOO SHORT (${wordCount} words): Good JDs are typically 400-800 words. Add more detail.`);
        score -= 10;
    } else if (wordCount > 1200) {
        feedback.push(`📏 TOO LONG (${wordCount} words): Consider condensing. Ideal length is 400-800 words.`);
        score -= 5;
    } else if (wordCount >= 400 && wordCount <= 800) {
        strengths.push(`✅ Optimal length (${wordCount} words) - detailed enough without overwhelming`);
    }

    // ===== 11. OVERALL QUALITY SUMMARY =====

    const checkScore = Object.values(checks).filter(Boolean).length;

    if (checkScore >= 6) {
        strengths.push(`✅ STRONG JOB DESCRIPTION: Comprehensive, inclusive, and compelling`);
    } else if (checkScore >= 4) {
        strengths.push(`✓ DECENT JOB DESCRIPTION: Has key elements but could improve in some areas`);
    } else {
        feedback.push(`⚠️ WEAK JOB DESCRIPTION: Missing critical elements that candidates need`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.hasResponsibilities || !checks.hasRequirements || !checks.hasCompensation) {
        feedback.push(`\n💡 JOB DESCRIPTION CHECKLIST:\n` +
            `  ${checks.hasClearTitle ? '✓' : '✗'} Clear title (level, team, employment type)\n` +
            `  ${checks.hasResponsibilities ? '✓' : '✗'} Responsibilities (5-7 bullet points with action verbs)\n` +
            `  ${checks.hasRequirements ? '✓' : '✗'} Requirements (must-have vs nice-to-have)\n` +
            `  ${checks.hasCompensation ? '✓' : '✗'} Compensation (salary range + benefits)\n` +
            `  ${checks.hasCompanyInfo ? '✓' : '✗'} Company info (mission, culture, growth)\n` +
            `  ${checks.usesInclusiveLanguage ? '✓' : '✗'} Inclusive language (no biased terms)\n` +
            `  ${checks.hasCallToAction ? '✓' : '✗'} Call to action (how to apply)\n\n` +
            `**EXAMPLE STRUCTURE:**\n` +
            `  1. Job Title & Level: "Senior Software Engineer - Platform Team"\n` +
            `  2. Summary: 2-3 sentences on the role and impact\n` +
            `  3. Responsibilities: 5-7 bullets starting with verbs (Own, Lead, Build)\n` +
            `  4. Must-Haves: 4-5 essential requirements\n` +
            `  5. Nice-to-Haves: 3-4 preferred qualifications\n` +
            `  6. Compensation: "$150K-$180K + equity + benefits"\n` +
            `  7. About Us: Mission, culture, stage\n` +
            `  8. Apply Now: Clear next steps`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
