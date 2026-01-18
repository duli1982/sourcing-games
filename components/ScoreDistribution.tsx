import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ScoreComparison } from '../utils/analyticsUtils';

interface ScoreDistributionProps {
  data: ScoreComparison[];
}

const ScoreDistribution: React.FC<ScoreDistributionProps> = ({ data }) => {
  if (data.length === 0 || data.every((d) => d.yourCount === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No score distribution data available yet.</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">
            Score Range: {payload[0].payload.range}
          </p>
          <p className="text-cyan-400">
            Your attempts: {payload[0].value}
          </p>
          <p className="text-purple-400">
            Community avg: {payload[1]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="range"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px', color: '#9CA3AF' }} />
          <Bar
            dataKey="yourCount"
            fill="#06B6D4"
            name="Your Scores"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="communityAvg"
            fill="#A855F7"
            name="Community Average"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Interpretation Text */}
      <div className="mt-4 text-center text-sm text-gray-400">
        <p>
          Compare your score distribution with the community average.
          {data.filter((d) => d.yourCount > 0 && d.range.startsWith('81')).length > 0 && (
            <span className="text-green-400 ml-1">
              Great job scoring in the top range!
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ScoreDistribution;
