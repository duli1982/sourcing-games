/**
 * Real-Time Feedback Preview Component
 *
 * Displays instant validation feedback as players type their submissions.
 * Shows word count, quality indicators, checks, and contextual tips.
 *
 * @version 1.0.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useRealtimeFeedback, RealtimeValidationResult, RealtimeCheck, ContextualTip, QualitySignal } from '../hooks/useRealtimeFeedback';
import { Game } from '../types';

interface RealtimeFeedbackPreviewProps {
  submission: string;
  game: Game;
  isVisible?: boolean;
  compact?: boolean;
  playerId?: string | null;
}

const RealtimeFeedbackPreview: React.FC<RealtimeFeedbackPreviewProps> = ({
  submission,
  game,
  isVisible = true,
  compact = false,
  playerId = null,
}) => {
  const feedback = useRealtimeFeedback(submission, game);
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const [showOnceNotice, setShowOnceNotice] = useState(false);

  useEffect(() => {
    if (!isVisible || submission.length === 0) return;
    const storedPlayerId = playerId || window.localStorage.getItem('playerId');
    const accountKey = storedPlayerId ? `player:${storedPlayerId}` : 'anonymous';
    const storageKey = `realtimePreviewSeen:${accountKey}:${game.id}`;
    try {
      const seen = window.localStorage.getItem(storageKey);
      if (seen) {
        setShouldShow(false);
        setShowOnceNotice(false);
        return;
      }
      window.localStorage.setItem(storageKey, '1');
      setShouldShow(true);
      setShowOnceNotice(true);
    } catch {
      // If storage is unavailable, fall back to showing in-session only.
      setShouldShow(true);
      setShowOnceNotice(true);
    }
  }, [game.id, isVisible, playerId, submission.length]);

  if (!isVisible || submission.length === 0 || shouldShow === false || shouldShow === null) {
    return null;
  }

  if (compact) {
    return <CompactView feedback={feedback} />;
  }

  return <FullView feedback={feedback} game={game} showOnceNotice={showOnceNotice} />;
};

// ============================================================================
// Compact View - Shows minimal stats inline
// ============================================================================

const CompactView: React.FC<{ feedback: RealtimeValidationResult }> = ({ feedback }) => {
  const qualityColor = getQualityColor(feedback.overallQuality);
  const scoreRangeText = feedback.wordCount > 0
    ? `${feedback.estimatedScoreRange[0]}-${feedback.estimatedScoreRange[1]}`
    : '--';

  return (
    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
      {/* Word count */}
      <span className="flex items-center gap-1">
        <span className="text-gray-500">Words:</span>
        <span className={feedback.wordCount > 0 ? 'text-gray-300' : 'text-gray-500'}>
          {feedback.wordCount}
        </span>
      </span>

      {/* Character count */}
      <span className="flex items-center gap-1">
        <span className="text-gray-500">Chars:</span>
        <span className="text-gray-300">{feedback.charCount}</span>
      </span>

      {/* Estimated score */}
      {feedback.wordCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-gray-500">Est. Score:</span>
          <span className={`font-medium ${qualityColor}`}>{scoreRangeText}</span>
        </span>
      )}

      {/* Quick quality indicator */}
      {feedback.wordCount > 0 && (
        <span className={`px-2 py-0.5 rounded ${getQualityBadgeClasses(feedback.overallQuality)}`}>
          {getQualityLabel(feedback.overallQuality)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Full View - Shows detailed feedback panel
// ============================================================================

const FullView: React.FC<{
  feedback: RealtimeValidationResult;
  game: Game;
  showOnceNotice: boolean;
}> = ({ feedback, game, showOnceNotice }) => {
  const showBooleanSection = game.skillCategory === 'boolean' || game.skillCategory === 'xray';
  const showOutreachSection = game.skillCategory === 'outreach';

  return (
    <div className="mt-4 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header with overall quality */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-medium text-sm">Real-Time Preview</span>
          <span className="text-xs text-gray-500">(updates as you type)</span>
        </div>

        {feedback.wordCount > 0 && (
          <div className="flex items-center gap-3">
            <ScoreRangeIndicator
              range={feedback.estimatedScoreRange}
              confidence={feedback.confidenceLevel}
            />
            <QualityBadge quality={feedback.overallQuality} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {showOnceNotice && (
          <div className="text-xs text-gray-400 bg-gray-800/60 border border-gray-700 rounded-md px-3 py-2">
            One-time assist: this real-time preview appears only once, then it disappears.
          </div>
        )}
        {/* Quality Signals Row */}
        <div className="flex flex-wrap gap-2">
          {feedback.qualitySignals.map(signal => (
            <QualitySignalBadge key={signal.id} signal={signal} />
          ))}
        </div>

        {/* Checks Grid */}
        {feedback.checks.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {feedback.checks.map(check => (
              <CheckItem key={check.id} check={check} />
            ))}
          </div>
        )}

        {/* Boolean Analysis Section */}
        {showBooleanSection && feedback.booleanAnalysis && (
          <BooleanAnalysisSection analysis={feedback.booleanAnalysis} />
        )}

        {/* Outreach Analysis Section */}
        {showOutreachSection && feedback.outreachAnalysis && (
          <OutreachAnalysisSection analysis={feedback.outreachAnalysis} />
        )}

        {/* Keywords Section */}
        {(feedback.keywordsFound.length > 0 || feedback.keywordsMissing.length > 0) && (
          <KeywordsSection
            found={feedback.keywordsFound}
            missing={feedback.keywordsMissing}
          />
        )}

        {/* Tips Section */}
        {feedback.tips.length > 0 && (
          <TipsSection tips={feedback.tips} />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const ScoreRangeIndicator: React.FC<{
  range: [number, number];
  confidence: 'low' | 'medium' | 'high';
}> = ({ range, confidence }) => {
  const [min, max] = range;
  const avgScore = (min + max) / 2;

  // Determine color based on average score
  let colorClass = 'text-gray-400';
  if (avgScore >= 80) colorClass = 'text-green-400';
  else if (avgScore >= 60) colorClass = 'text-cyan-400';
  else if (avgScore >= 40) colorClass = 'text-yellow-400';
  else colorClass = 'text-red-400';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Est. Score:</span>
      <span className={`font-bold ${colorClass}`}>
        {min === max ? min : `${min}-${max}`}
      </span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        confidence === 'high' ? 'bg-green-900 text-green-300' :
        confidence === 'medium' ? 'bg-yellow-900 text-yellow-300' :
        'bg-gray-700 text-gray-400'
      }`}>
        {confidence === 'high' ? 'Confident' : confidence === 'medium' ? 'Moderate' : 'Low conf.'}
      </span>
    </div>
  );
};

const QualityBadge: React.FC<{ quality: 'poor' | 'needs_work' | 'good' | 'excellent' }> = ({ quality }) => {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getQualityBadgeClasses(quality)}`}>
      {getQualityLabel(quality)}
    </span>
  );
};

const QualitySignalBadge: React.FC<{ signal: QualitySignal }> = ({ signal }) => {
  const statusClasses = {
    good: 'bg-green-900 text-green-300 border-green-700',
    warning: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    error: 'bg-red-900 text-red-300 border-red-700',
  };

  return (
    <div className={`px-3 py-1.5 rounded border text-xs ${statusClasses[signal.status]}`}>
      <span className="text-gray-400 mr-1">{signal.label}:</span>
      <span className="font-medium">{signal.value}</span>
    </div>
  );
};

const CheckItem: React.FC<{ check: RealtimeCheck }> = ({ check }) => {
  const iconMap = {
    success: '✓',
    warning: '!',
    error: '✗',
    info: 'i',
  };

  const colorMap = {
    success: 'text-green-400 bg-green-900 border-green-700',
    warning: 'text-yellow-400 bg-yellow-900 border-yellow-700',
    error: 'text-red-400 bg-red-900 border-red-700',
    info: 'text-blue-400 bg-blue-900 border-blue-700',
  };

  return (
    <div className={`px-3 py-2 rounded border text-xs ${colorMap[check.severity]}`}>
      <div className="flex items-center gap-2">
        <span className="font-bold">{iconMap[check.severity]}</span>
        <span className="font-medium">{check.label}</span>
      </div>
      <p className="text-gray-300 mt-1 text-xs">{check.message}</p>
    </div>
  );
};

const BooleanAnalysisSection: React.FC<{ analysis: NonNullable<RealtimeValidationResult['booleanAnalysis']> }> = ({ analysis }) => {
  const operators = [
    { name: 'AND', active: analysis.hasAndOperator },
    { name: 'OR', active: analysis.hasOrOperator },
    { name: 'NOT', active: analysis.hasNotOperator },
    { name: '( )', active: analysis.hasParentheses },
    { name: '" "', active: analysis.hasQuotes },
    { name: 'site:', active: analysis.hasSiteOperator },
  ];

  return (
    <div className="bg-gray-800 rounded p-3 border border-gray-700">
      <h4 className="text-xs font-medium text-cyan-400 mb-2">Boolean Operators Used</h4>
      <div className="flex flex-wrap gap-2">
        {operators.map(op => (
          <span
            key={op.name}
            className={`px-2 py-1 rounded text-xs font-mono ${
              op.active
                ? 'bg-cyan-900 text-cyan-300 border border-cyan-700'
                : 'bg-gray-700 text-gray-500 border border-gray-600'
            }`}
          >
            {op.name}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="text-gray-400">
          Complexity: <span className={`font-medium ${
            analysis.complexity === 'complex' ? 'text-green-400' :
            analysis.complexity === 'moderate' ? 'text-yellow-400' : 'text-gray-300'
          }`}>{analysis.complexity}</span>
        </span>
        {!analysis.isBalanced && (
          <span className="text-red-400">Unbalanced parentheses!</span>
        )}
      </div>
    </div>
  );
};

const OutreachAnalysisSection: React.FC<{ analysis: NonNullable<RealtimeValidationResult['outreachAnalysis']> }> = ({ analysis }) => {
  const elements = [
    { name: 'Personalization', active: analysis.hasPersonalization },
    { name: 'Call to Action', active: analysis.hasCallToAction },
    { name: 'Value Prop', active: analysis.hasValueProposition },
    { name: 'Greeting', active: analysis.hasGreeting },
    { name: 'Sign-off', active: analysis.hasSignOff },
  ];

  const lengthStatus = {
    too_short: { label: 'Too Short', color: 'text-yellow-400' },
    optimal: { label: 'Good Length', color: 'text-green-400' },
    too_long: { label: 'Too Long', color: 'text-orange-400' },
  };

  return (
    <div className="bg-gray-800 rounded p-3 border border-gray-700">
      <h4 className="text-xs font-medium text-cyan-400 mb-2">Message Elements</h4>
      <div className="flex flex-wrap gap-2">
        {elements.map(el => (
          <span
            key={el.name}
            className={`px-2 py-1 rounded text-xs ${
              el.active
                ? 'bg-green-900 text-green-300 border border-green-700'
                : 'bg-gray-700 text-gray-500 border border-gray-600'
            }`}
          >
            {el.active ? '✓' : '○'} {el.name}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="text-gray-400">
          Length: <span className={`font-medium ${lengthStatus[analysis.wordCountStatus].color}`}>
            {lengthStatus[analysis.wordCountStatus].label}
          </span>
        </span>
        <span className="text-gray-400">
          Tone: <span className="text-gray-300 capitalize">{analysis.tone}</span>
        </span>
        {analysis.questionCount > 0 && (
          <span className="text-gray-400">
            Questions: <span className="text-cyan-300">{analysis.questionCount}</span>
          </span>
        )}
      </div>
    </div>
  );
};

const KeywordsSection: React.FC<{ found: string[]; missing: string[] }> = ({ found, missing }) => {
  if (found.length === 0 && missing.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded p-3 border border-gray-700">
      <h4 className="text-xs font-medium text-cyan-400 mb-2">Keywords</h4>
      <div className="flex flex-wrap gap-2">
        {found.map(kw => (
          <span key={kw} className="px-2 py-1 rounded text-xs bg-green-900 text-green-300 border border-green-700">
            ✓ {kw}
          </span>
        ))}
        {missing.map(kw => (
          <span key={kw} className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-400 border border-gray-600">
            ○ {kw}
          </span>
        ))}
      </div>
    </div>
  );
};

const TipsSection: React.FC<{ tips: ContextualTip[] }> = ({ tips }) => {
  const tipIcons = {
    hint: '💡',
    suggestion: '✨',
    warning: '⚠️',
    encouragement: '🎯',
  };

  const tipColors = {
    hint: 'border-blue-700 bg-blue-900/30',
    suggestion: 'border-purple-700 bg-purple-900/30',
    warning: 'border-yellow-700 bg-yellow-900/30',
    encouragement: 'border-green-700 bg-green-900/30',
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-400">Tips as you type:</h4>
      {tips.map(tip => (
        <div
          key={tip.id}
          className={`px-3 py-2 rounded border text-xs ${tipColors[tip.type]}`}
        >
          <span className="mr-2">{tipIcons[tip.type]}</span>
          <span className="text-gray-200">{tip.message}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function getQualityColor(quality: 'poor' | 'needs_work' | 'good' | 'excellent'): string {
  const colors = {
    excellent: 'text-green-400',
    good: 'text-cyan-400',
    needs_work: 'text-yellow-400',
    poor: 'text-red-400',
  };
  return colors[quality];
}

function getQualityBadgeClasses(quality: 'poor' | 'needs_work' | 'good' | 'excellent'): string {
  const classes = {
    excellent: 'bg-green-900 text-green-300 border border-green-700',
    good: 'bg-cyan-900 text-cyan-300 border border-cyan-700',
    needs_work: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
    poor: 'bg-red-900 text-red-300 border border-red-700',
  };
  return classes[quality];
}

function getQualityLabel(quality: 'poor' | 'needs_work' | 'good' | 'excellent'): string {
  const labels = {
    excellent: 'Excellent',
    good: 'Good',
    needs_work: 'Needs Work',
    poor: 'Poor',
  };
  return labels[quality];
}

export default RealtimeFeedbackPreview;
