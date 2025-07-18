import React from 'react';

const StatsCard = ({ title, value, change, icon }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      {change !== 0 && (
        <div className="mt-2 flex items-center">
          <span
            className={`text-sm font-medium ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {isPositive && '+'}
            {change}
          </span>
          <span className="text-sm text-gray-500 ml-1">前日比</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;