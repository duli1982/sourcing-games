import { ValidationResult } from '../types';

/**
 * Screening Questions Validator
 *
 * Validates screening questions for effectiveness in candidate evaluation.
 *
 * Validates:
 * - Question clarity and structure
 * - Behavioral/situational question patterns (STAR format)
 * - Competency alignment
 * - Legal compliance (avoiding discriminatory questions)
 * - Scoring rubric presence
 * - Open vs. closed question balance
 */
export function validateScreeningQuestions(
    submission: string
): ValidationResult {
    const strengths: string[] = [];
    const feedback: string[] = [];
    let score = 100;

    const checks: Record<string, boolean> = {
        hasBehavioralQuestions: false,
        hasSituationalQuestions: false,
        hasCompetencyFocus: false,
        avoidsIllegalQuestions: true, // Start true, penalize if found
        hasScorableStructure: false,
        hasGoodQuestionMix: false,
    };

    // ===== 1. BEHAVIORAL QUESTIONS (STAR) =====
    // Check for behavioral interview patterns

    const behavioralPatterns = [
        { pattern: /\b(tell me about a time|describe a time|give me an example|can you share)\b/gi, name: 'Behavioral prompt', points: 8 },
        { pattern: /\b(past experience|previous role|former job|last position)\b/gi, name: 'Experience reference', points: 6 },
        { pattern: /\b(how did you handle|what did you do|how did you approach)\b/gi, name: 'Action inquiry', points: 7 },
        { pattern: /\b(what was the result|what was the outcome|how did it turn out)\b/gi, name: 'Result focus', points: 7 },
        { pattern: /\b(situation|task|action|result|STAR)\b/gi, name: 'STAR components', points: 8 },
        { pattern: /\b(challenge|obstacle|difficult|problem you faced)\b/gi, name: 'Challenge scenarios', points: 6 },
    ];

    let behavioralPoints = 0;
    let behavioralMatches = 0;

    behavioralPatterns.forEach(pattern => {
        if (pattern.pattern.test(submission)) {
            behavioralPoints += pattern.points;
            behavioralMatches++;
        }
    });

    if (behavioralPoints >= 20) {
        checks.hasBehavioralQuestions = true;
        strengths.push(`Strong behavioral questions - elicits specific past examples using STAR format`);
        score += 10;
    } else if (behavioralPoints >= 10) {
        checks.hasBehavioralQuestions = true;
        feedback.push(`✓ Has some behavioral elements. Consider more "Tell me about a time..." questions with follow-ups for results.`);
    } else {
        feedback.push(`❌ MISSING BEHAVIORAL QUESTIONS: Use STAR format - "Tell me about a time when..." to get concrete examples of past behavior.`);
        score -= 20;
    }

    // ===== 2. SITUATIONAL QUESTIONS =====
    // Check for hypothetical scenario questions

    const situationalPatterns = [
        { pattern: /\b(what would you do|how would you handle|imagine|hypothetically)\b/gi, name: 'Hypothetical prompt', points: 7 },
        { pattern: /\b(if you were|suppose|let's say|consider a scenario)\b/gi, name: 'Scenario setup', points: 6 },
        { pattern: /\b(what approach would you take|how might you|what would be your strategy)\b/gi, name: 'Strategy inquiry', points: 7 },
        { pattern: /\b(scenario|case|situation where)\b/gi, name: 'Scenario framing', points: 5 },
    ];

    let situationalPoints = 0;

    situationalPatterns.forEach(pattern => {
        if (pattern.pattern.test(submission)) {
            situationalPoints += pattern.points;
        }
    });

    if (situationalPoints >= 15) {
        checks.hasSituationalQuestions = true;
        strengths.push(`Good situational questions - tests problem-solving and decision-making approach`);
        score += 8;
    } else if (situationalPoints >= 7) {
        checks.hasSituationalQuestions = true;
        feedback.push(`💡 Consider adding more situational scenarios: "What would you do if..." to test judgment and problem-solving.`);
    } else {
        feedback.push(`💡 ADD SITUATIONAL QUESTIONS: Include "What would you do if..." scenarios to assess problem-solving and judgment.`);
        score -= 10;
    }

    // ===== 3. COMPETENCY FOCUS =====
    // Check for competency-aligned questions

    const competencySignals = [
        { pattern: /\b(leadership|lead|manage|team|supervised)\b/gi, name: 'Leadership', points: 5 },
        { pattern: /\b(communication|communicate|present|explain)\b/gi, name: 'Communication', points: 5 },
        { pattern: /\b(problem.?solving|analytical|analyze|critical thinking)\b/gi, name: 'Problem-solving', points: 6 },
        { pattern: /\b(collaboration|teamwork|cross.?functional|stakeholder)\b/gi, name: 'Collaboration', points: 5 },
        { pattern: /\b(initiative|proactive|self.?starter|ownership)\b/gi, name: 'Initiative', points: 5 },
        { pattern: /\b(adaptability|change|pivot|flexibility|ambiguity)\b/gi, name: 'Adaptability', points: 5 },
        { pattern: /\b(technical|skill|proficiency|expertise|competency)\b/gi, name: 'Technical skills', points: 5 },
        { pattern: /\b(deadline|pressure|prioritize|time management)\b/gi, name: 'Time management', points: 5 },
        { pattern: /\b(conflict|disagree|difficult conversation|feedback)\b/gi, name: 'Conflict resolution', points: 6 },
        { pattern: /\b(innovation|creative|new idea|improve)\b/gi, name: 'Innovation', points: 5 },
    ];

    let competencyMatches = 0;
    const competenciesCovered: string[] = [];

    competencySignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            competencyMatches++;
            competenciesCovered.push(signal.name);
        }
    });

    if (competencyMatches >= 5) {
        checks.hasCompetencyFocus = true;
        strengths.push(`Covers multiple competencies: ${competenciesCovered.slice(0, 4).join(', ')}${competenciesCovered.length > 4 ? '...' : ''}`);
        score += 10;
    } else if (competencyMatches >= 3) {
        checks.hasCompetencyFocus = true;
        feedback.push(`✓ Covers some competencies. Consider adding questions for: leadership, communication, adaptability, problem-solving.`);
    } else {
        feedback.push(`❌ NARROW COMPETENCY COVERAGE: Questions should assess multiple competencies: leadership, communication, problem-solving, teamwork.`);
        score -= 15;
    }

    // ===== 4. LEGAL COMPLIANCE CHECK =====
    // Check for potentially discriminatory questions

    const illegalPatterns = [
        { pattern: /\b(age|how old|when were you born|graduation year)\b/gi, issue: 'Age-related question', penalty: 15 },
        { pattern: /\b(married|spouse|children|kids|pregnant|family planning)\b/gi, issue: 'Family status question', penalty: 15 },
        { pattern: /\b(religion|religious|church|worship|faith)\b/gi, issue: 'Religion-related question', penalty: 15 },
        { pattern: /\b(national origin|birthplace|citizenship|where are you from originally|accent)\b/gi, issue: 'National origin question', penalty: 15 },
        { pattern: /\b(disability|handicap|medical condition|health issues)\b/gi, issue: 'Disability-related question', penalty: 15 },
        { pattern: /\b(arrested|criminal record|convictions)\b/gi, issue: 'Criminal history (may be restricted)', penalty: 8 },
        { pattern: /\b(military discharge|type of discharge)\b/gi, issue: 'Military discharge type question', penalty: 10 },
    ];

    illegalPatterns.forEach(pattern => {
        if (pattern.pattern.test(submission)) {
            checks.avoidsIllegalQuestions = false;
            feedback.push(`⚠️ LEGAL CONCERN: "${pattern.issue}" - This could be discriminatory. Avoid questions about protected characteristics.`);
            score -= pattern.penalty;
        }
    });

    if (checks.avoidsIllegalQuestions) {
        strengths.push(`No obvious discriminatory questions detected - good compliance awareness`);
    }

    // ===== 5. SCORABLE STRUCTURE =====
    // Check for evaluation criteria/rubric

    const scoringSignals = [
        { pattern: /\b(score|scoring|rate|rating|rubric)\b/gi, name: 'Scoring mention', points: 8 },
        { pattern: /\b(criteria|benchmark|standard|expectation)\b/gi, name: 'Evaluation criteria', points: 7 },
        { pattern: /\b(excellent|good|average|poor|meets|exceeds|below)\b/gi, name: 'Rating scale', points: 6 },
        { pattern: /\b(1-5|1 to 5|scale|points|weighted)\b/gi, name: 'Numeric scale', points: 7 },
        { pattern: /\b(look for|ideal answer|strong answer|red flag|green flag)\b/gi, name: 'Answer guidance', points: 8 },
        { pattern: /\b(must have|nice to have|dealbreaker|knockout)\b/gi, name: 'Requirement levels', points: 6 },
    ];

    let scoringPoints = 0;

    scoringSignals.forEach(signal => {
        if (signal.pattern.test(submission)) {
            scoringPoints += signal.points;
        }
    });

    if (scoringPoints >= 18) {
        checks.hasScorableStructure = true;
        strengths.push(`Well-structured scoring criteria - enables consistent evaluation`);
        score += 12;
    } else if (scoringPoints >= 8) {
        checks.hasScorableStructure = true;
        feedback.push(`💡 Add clearer scoring rubric: Define what "excellent" vs. "poor" answers look like for each question.`);
    } else {
        feedback.push(`📋 MISSING SCORING RUBRIC: Include criteria for evaluating responses. What does a strong/weak answer look like?`);
        score -= 12;
    }

    // ===== 6. QUESTION MIX =====
    // Check for variety of question types

    const questionTypes = [
        { pattern: /\?/g, name: 'Question marks' },
        { pattern: /\b(why|what|how|when|where|who|which)\b.*\?/gi, name: 'Open questions' },
        { pattern: /\b(do you|have you|are you|can you|did you)\b.*\?/gi, name: 'Closed questions' },
        { pattern: /\b(walk me through|explain|describe|elaborate)\b/gi, name: 'Elaboration prompts' },
        { pattern: /\b(follow.?up|probe|clarify|dig deeper)\b/gi, name: 'Follow-up prompts' },
    ];

    const questionCount = (submission.match(/\?/g) || []).length;
    const hasOpenQuestions = questionTypes[1].pattern.test(submission);
    const hasClosedQuestions = questionTypes[2].pattern.test(submission);
    const hasElaboration = questionTypes[3].pattern.test(submission);
    const hasFollowUps = questionTypes[4].pattern.test(submission);

    if (questionCount >= 5 && hasOpenQuestions && (hasElaboration || hasFollowUps)) {
        checks.hasGoodQuestionMix = true;
        strengths.push(`Good question variety - mix of open, probing, and follow-up questions`);
        score += 8;
    } else if (questionCount >= 3) {
        checks.hasGoodQuestionMix = true;
        feedback.push(`💡 Consider adding more open-ended questions and follow-up probes to get deeper answers.`);
    } else {
        feedback.push(`❌ NOT ENOUGH QUESTIONS: Include at least 5-7 questions with a mix of behavioral, situational, and competency-based.`);
        score -= 15;
    }

    // ===== 7. COMMON PITFALLS =====

    const pitfalls = [
        {
            pattern: /\b(greatest weakness|biggest weakness)\b/gi,
            message: 'Cliché question that gets rehearsed answers - ask specific challenges instead',
            penalty: 5,
        },
        {
            pattern: /\b(where do you see yourself|5 years|ten years|future goals)\b/gi,
            message: 'Generic question - better to ask about career interests and growth areas',
            penalty: 4,
        },
        {
            pattern: /\b(yes or no|simple yes|just yes)\b/gi,
            message: 'Yes/no questions limit insight - rephrase as open-ended',
            penalty: 6,
        },
        {
            pattern: /\b(trick question|gotcha|catch)\b/gi,
            message: 'Trick questions create negative candidate experience - use straightforward evaluation',
            penalty: 8,
        },
        {
            pattern: /\b(brainteaser|puzzle|riddle|manholes|golf balls)\b/gi,
            message: 'Brainteasers don\'t predict job performance - use role-relevant scenarios',
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
            pattern: /\b(role.?play|simulation|work sample|practical test)\b/gi,
            message: 'Includes practical assessment - strong predictor of job performance',
            bonus: 8,
        },
        {
            pattern: /\b(structured|consistent|standardized|same questions)\b/gi,
            message: 'Structured interview approach - reduces bias and improves consistency',
            bonus: 7,
        },
        {
            pattern: /\b(candidate experience|positive|welcoming|comfortable)\b/gi,
            message: 'Considers candidate experience - reflects well on employer brand',
            bonus: 5,
        },
        {
            pattern: /\b(bias|fair|objective|inclusive)\b/gi,
            message: 'Awareness of bias - promotes fair evaluation',
            bonus: 6,
        },
        {
            pattern: /\b(job.?related|role.?specific|day.?to.?day|actual work)\b/gi,
            message: 'Job-related questions - valid predictors of performance',
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
        strengths.push(`✅ STRONG SCREENING QUESTIONS: Well-structured, legally compliant, competency-focused approach`);
    } else if (checkScore >= 3) {
        strengths.push(`✓ DECENT SCREENING SET: Has key elements but could improve coverage or structure`);
    } else {
        feedback.push(`⚠️ WEAK SCREENING QUESTIONS: Missing critical elements like behavioral questions, competency focus, or scoring criteria`);
        score -= 15;
    }

    // Add comprehensive guidance if major elements missing
    if (!checks.hasBehavioralQuestions || !checks.hasCompetencyFocus || !checks.hasScorableStructure) {
        feedback.push(`\n💡 SCREENING QUESTIONS CHECKLIST:\n` +
            `  ${checks.hasBehavioralQuestions ? '✓' : '✗'} Behavioral questions (STAR format: "Tell me about a time...")\n` +
            `  ${checks.hasSituationalQuestions ? '✓' : '✗'} Situational questions ("What would you do if...")\n` +
            `  ${checks.hasCompetencyFocus ? '✓' : '✗'} Multiple competencies covered (leadership, communication, etc.)\n` +
            `  ${checks.avoidsIllegalQuestions ? '✓' : '✗'} Legally compliant (no discriminatory questions)\n` +
            `  ${checks.hasScorableStructure ? '✓' : '✗'} Scoring criteria (what good/bad answers look like)\n` +
            `  ${checks.hasGoodQuestionMix ? '✓' : '✗'} Question variety (open-ended, follow-ups, probes)\n\n` +
            `**EXAMPLE SCREENING QUESTION:**\n` +
            `  Question: "Tell me about a time you had to manage a project with competing priorities."\n` +
            `  Competency: Prioritization, Time Management\n` +
            `  Look for: Specific example, clear decision criteria, positive outcome\n` +
            `  Red flags: Vague answer, blamed others, no measurable result\n` +
            `  Follow-up: "What would you do differently next time?"`
        );
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        checks,
        feedback,
        strengths,
    };
}
