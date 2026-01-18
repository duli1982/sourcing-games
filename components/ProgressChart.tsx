import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ProgressDataPoint } from '../utils/analyticsUtils';

interface ProgressChartProps {
  data: ProgressDataPoint[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No progress data available. Play more games to see your progression!</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{data.gameTitle}</p>
          <p className="text-cyan-400 text-sm">{data.date}</p>
          <p className="text-green-400 font-bold text-lg">Score: {data.score}/100</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '14px', color: '#9CA3AF' }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#06B6D4"
            strokeWidth={3}
            dot={{ fill: '#06B6D4', r: 4 }}
            activeDot={{ r: 6 }}
            name="Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
