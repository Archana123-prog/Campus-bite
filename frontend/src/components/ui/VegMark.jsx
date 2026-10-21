import React from 'react';

export default function VegMark({ isVeg = true }) {
  const color = isVeg ? 'border-leaf-500' : 'border-chili-500';
  const dot = isVeg ? 'bg-leaf-500' : 'bg-chili-500';
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 bg-white ${color}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
    </span>
  );
}
