import React from 'react';

const Spinner = ({ size = 'md', color = 'blue' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colors = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-4 border-t-transparent ${sizes[size]} ${colors[color]}`} />
    </div>
  );
};

export default Spinner;