import {
  validateBooleanSearch,
  validateCultureAddNote,
  validateGeneral,
  validateOutreach,
  validatePromptInstructions,
} from '../../utils/answerValidators.js';
import { validateCandidateExperience } from '../../utils/candidateExperienceValidator.js';
import { validateDataDrivenSourcing } from '../../utils/dataDrivenSourcingValidator.js';
import { validatePassiveCandidateSequence } from '../../utils/passiveCandidateSequenceValidator.js';
import { validateGithubSourcing } from '../../utils/githubSourcingValidator.js';
import { validateStackOverflowSourcing } from '../../utils/stackOverflowSourcingValidator.js';
import { validateRedditSourcing } from '../../utils/redditSourcingValidator.js';
import { validateLinkedinSourcing } from '../../utils/linkedinSourcingValidator.js';
import { validateScreeningQuestions } from '../../utils/screeningValidator.js';
import { validateJobDescription } from '../../utils/jobDescriptionValidator.js';
import { validateNegotiation } from '../../utils/negotiationValidator.js';
import { validateTalentIntelligence } from '../../utils/talentIntelligenceValidator.js';

export type ServerValidationResult = {
  score: number;
  checks?: Record<string, boolean>;
  feedback: string[];
  strengths: string[];
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const normalizeValidation = (result: any): ServerValidationResult => ({
  score: clampScore(typeof result?.score === 'number' ? result.score : 0),
  checks: result?.checks && typeof result.checks === 'object' ? result.checks : {},
  feedback: Array.isArray(result?.feedback) ? result.feedback : [],
  strengths: Array.isArray(result?.strengths) ? result.strengths : [],
});

export const computeServerValidation = (game: any, submission: string): ServerValidationResult => {
  const validationType = (game?.validation as any)?.type;

  if (game?.id === 'game48') {
    return normalizeValidation(validateCultureAddNote(submission));
  }

  if (validationType === 'promptInstructions') {
    return normalizeValidation(
      validatePromptInstructions(submission, {
        mustMention: (game.validation as any)?.mustMention,
      })
    );
  }

  if (game?.skillCategory === 'boolean' || game?.skillCategory === 'xray') {
    return normalizeValidation(
      validateBooleanSearch(
        submission,
        {
          keywords: (game.validation as any)?.keywords,
          location: (game.validation as any)?.location,
        },
        game.validation as any
      )
    );
  }

  if (game?.skillCategory === 'outreach') {
    const outreachValidation = validateOutreach(
      submission,
      (game.validation as any)?.maxWords,
      game.validation as any
    );
    const candidateExpValidation = validateCandidateExperience(submission);

    const isSequenceRelated =
      /\b(sequence|cadence|campaign|multi.?touch|follow.?up|email [0-9]|touch [0-9]|step [0-9]|day [0-9]|nurture|drip|series)\b/i.test(
        submission + ' ' + (game.description || '') + ' ' + (game.task || '')
      );

    if (isSequenceRelated) {
      const sequenceValidation = validatePassiveCandidateSequence(submission);
      return normalizeValidation({
        score:
          candidateExpValidation.score * 0.4 +
          outreachValidation.score * 0.3 +
          sequenceValidation.score * 0.3,
        checks: {
          ...outreachValidation.checks,
          ...candidateExpValidation.checks,
          ...sequenceValidation.checks,
        },
        feedback: [
          ...(candidateExpValidation.feedback.length > 0 ? ['dYZ_ Candidate POV:', ...candidateExpValidation.feedback] : []),
          ...(sequenceValidation.feedback.length > 0 ? ['dY", Multi-Touch Strategy:', ...sequenceValidation.feedback] : []),
          ...(outreachValidation.feedback.length > 0 ? ['dY"? Technical Quality:', ...outreachValidation.feedback] : []),
        ],
        strengths: [
          ...(candidateExpValidation.strengths.length > 0 ? ['バ. Candidate Experience:', ...candidateExpValidation.strengths] : []),
          ...(sequenceValidation.strengths.length > 0 ? ['バ. Sequence Strategy:', ...sequenceValidation.strengths] : []),
          ...(outreachValidation.strengths.length > 0 ? ['バ. Message Quality:', ...outreachValidation.strengths] : []),
        ],
      });
    }

    return normalizeValidation({
      score: candidateExpValidation.score * 0.6 + outreachValidation.score * 0.4,
      checks: { ...outreachValidation.checks, ...candidateExpValidation.checks },
      feedback: [
        ...(candidateExpValidation.feedback.length > 0 ? ['dYZ_ Candidate POV:', ...candidateExpValidation.feedback] : []),
        ...(outreachValidation.feedback.length > 0 ? ['dY"? Technical Quality:', ...outreachValidation.feedback] : []),
      ],
      strengths: [
        ...(candidateExpValidation.strengths.length > 0 ? ['バ. Candidate Experience:', ...candidateExpValidation.strengths] : []),
        ...(outreachValidation.strengths.length > 0 ? ['バ. Message Quality:', ...outreachValidation.strengths] : []),
      ],
    });
  }

  if (game?.skillCategory === 'ats' || game?.skillCategory === 'diversity' || game?.skillCategory === 'persona') {
    const baseValidation = validateGeneral(submission, game.validation as any);
    const dataDrivenValidation = validateDataDrivenSourcing(submission);

    const isCampaignStrategy = /\b(campaign|sequence|re.?engage|nurture|multi.?touch|email [0-9]|step [0-9]|silver medalist)\b/i.test(
      submission + ' ' + (game.description || '') + ' ' + (game.task || '')
    );

    if (isCampaignStrategy) {
      const sequenceValidation = validatePassiveCandidateSequence(submission);
      return normalizeValidation({
        score:
          baseValidation.score * 0.4 +
          dataDrivenValidation.score * 0.3 +
          sequenceValidation.score * 0.3,
        checks: {
          ...baseValidation.checks,
          ...dataDrivenValidation.checks,
          ...sequenceValidation.checks,
        },
        feedback: [
          ...(baseValidation.feedback.length > 0 ? baseValidation.feedback : []),
          ...(dataDrivenValidation.feedback.length > 0 ? ['dY"S Data & Metrics:', ...dataDrivenValidation.feedback] : []),
          ...(sequenceValidation.feedback.length > 0 ? ['dY", Campaign Strategy:', ...sequenceValidation.feedback] : []),
        ],
        strengths: [
          ...(baseValidation.strengths.length > 0 ? baseValidation.strengths : []),
          ...(dataDrivenValidation.strengths.length > 0 ? ['dY"S Quantitative Thinking:', ...dataDrivenValidation.strengths] : []),
          ...(sequenceValidation.strengths.length > 0 ? ['バ. Multi-Touch Strategy:', ...sequenceValidation.strengths] : []),
        ],
      });
    }

    return normalizeValidation({
      score: baseValidation.score * 0.6 + dataDrivenValidation.score * 0.4,
      checks: { ...baseValidation.checks, ...dataDrivenValidation.checks },
      feedback: [
        ...(baseValidation.feedback.length > 0 ? baseValidation.feedback : []),
        ...(dataDrivenValidation.feedback.length > 0 ? ['dY"S Data & Metrics:', ...dataDrivenValidation.feedback] : []),
      ],
      strengths: [
        ...(baseValidation.strengths.length > 0 ? baseValidation.strengths : []),
        ...(dataDrivenValidation.strengths.length > 0 ? ['dY"S Quantitative Thinking:', ...dataDrivenValidation.strengths] : []),
      ],
    });
  }

  if (game?.skillCategory === 'multiplatform') {
    const gameContext = (game.description || '') + ' ' + (game.task || '') + ' ' + (game.title || '');
    const isGitHub = /\b(github|git hub|repository|repo|open.?source|oss|commit|pull request|pr)\b/i.test(gameContext);
    const isStackOverflow = /\b(stack\s*overflow|so|tag|reputation|answer|question)\b/i.test(gameContext);
    const isReddit = /\b(reddit|subreddit|r\/|community|post|karma)\b/i.test(gameContext);

    let platformValidation: any;
    let platformName = 'Multi-Platform';

    if (isGitHub) {
      platformValidation = validateGithubSourcing(submission);
      platformName = 'GitHub';
    } else if (isStackOverflow) {
      platformValidation = validateStackOverflowSourcing(submission);
      platformName = 'Stack Overflow';
    } else if (isReddit) {
      platformValidation = validateRedditSourcing(submission);
      platformName = 'Reddit';
    } else {
      platformValidation = validateGithubSourcing(submission);
    }

    const dataDrivenValidation = validateDataDrivenSourcing(submission);

    return normalizeValidation({
      score: platformValidation.score * 0.6 + dataDrivenValidation.score * 0.4,
      checks: { ...platformValidation.checks, ...dataDrivenValidation.checks },
      feedback: [
        ...(platformValidation.feedback.length > 0 ? [`dY"? ${platformName} Strategy:`, ...platformValidation.feedback] : []),
        ...(dataDrivenValidation.feedback.length > 0 ? ['dY"S Data & Metrics:', ...dataDrivenValidation.feedback] : []),
      ],
      strengths: [
        ...(platformValidation.strengths.length > 0 ? [`バ. ${platformName} Sourcing:`, ...platformValidation.strengths] : []),
        ...(dataDrivenValidation.strengths.length > 0 ? ['dY"S Quantitative Thinking:', ...dataDrivenValidation.strengths] : []),
      ],
    });
  }

  // LinkedIn sourcing validation
  if (game?.skillCategory === 'linkedin') {
    const linkedinValidation = validateLinkedinSourcing(submission);
    const dataDrivenValidation = validateDataDrivenSourcing(submission);

    return normalizeValidation({
      score: linkedinValidation.score * 0.7 + dataDrivenValidation.score * 0.3,
      checks: { ...linkedinValidation.checks, ...dataDrivenValidation.checks },
      feedback: [
        ...(linkedinValidation.feedback.length > 0 ? ['🔗 LinkedIn Strategy:', ...linkedinValidation.feedback] : []),
        ...(dataDrivenValidation.feedback.length > 0 ? ['📊 Data & Metrics:', ...dataDrivenValidation.feedback] : []),
      ],
      strengths: [
        ...(linkedinValidation.strengths.length > 0 ? ['✅ LinkedIn Sourcing:', ...linkedinValidation.strengths] : []),
        ...(dataDrivenValidation.strengths.length > 0 ? ['📊 Quantitative Thinking:', ...dataDrivenValidation.strengths] : []),
      ],
    });
  }

  // Screening questions validation
  if (game?.skillCategory === 'screening') {
    const screeningValidation = validateScreeningQuestions(submission);

    return normalizeValidation({
      score: screeningValidation.score,
      checks: screeningValidation.checks,
      feedback: screeningValidation.feedback.length > 0
        ? ['📋 Screening Questions:', ...screeningValidation.feedback]
        : [],
      strengths: screeningValidation.strengths.length > 0
        ? ['✅ Interview Design:', ...screeningValidation.strengths]
        : [],
    });
  }

  // Job description validation
  if (game?.skillCategory === 'job-description') {
    const jdValidation = validateJobDescription(submission);

    return normalizeValidation({
      score: jdValidation.score,
      checks: jdValidation.checks,
      feedback: jdValidation.feedback.length > 0
        ? ['📝 Job Description:', ...jdValidation.feedback]
        : [],
      strengths: jdValidation.strengths.length > 0
        ? ['✅ JD Quality:', ...jdValidation.strengths]
        : [],
    });
  }

  // Negotiation validation
  if (game?.skillCategory === 'negotiation') {
    const negotiationValidation = validateNegotiation(submission);

    return normalizeValidation({
      score: negotiationValidation.score,
      checks: negotiationValidation.checks,
      feedback: negotiationValidation.feedback.length > 0
        ? ['🤝 Negotiation Strategy:', ...negotiationValidation.feedback]
        : [],
      strengths: negotiationValidation.strengths.length > 0
        ? ['✅ Offer Negotiation:', ...negotiationValidation.strengths]
        : [],
    });
  }

  // Talent intelligence validation
  if (game?.skillCategory === 'talent-intelligence') {
    const talentIntelValidation = validateTalentIntelligence(submission);
    const dataDrivenValidation = validateDataDrivenSourcing(submission);

    return normalizeValidation({
      score: talentIntelValidation.score * 0.7 + dataDrivenValidation.score * 0.3,
      checks: { ...talentIntelValidation.checks, ...dataDrivenValidation.checks },
      feedback: [
        ...(talentIntelValidation.feedback.length > 0 ? ['🎯 Talent Intelligence:', ...talentIntelValidation.feedback] : []),
        ...(dataDrivenValidation.feedback.length > 0 ? ['📊 Data & Metrics:', ...dataDrivenValidation.feedback] : []),
      ],
      strengths: [
        ...(talentIntelValidation.strengths.length > 0 ? ['✅ Market Analysis:', ...talentIntelValidation.strengths] : []),
        ...(dataDrivenValidation.strengths.length > 0 ? ['📊 Quantitative Thinking:', ...dataDrivenValidation.strengths] : []),
      ],
    });
  }

  return normalizeValidation(validateGeneral(submission, game?.validation as any));
};

