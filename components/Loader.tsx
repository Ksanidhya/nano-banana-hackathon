
import React from 'react';

type LoaderProps = {
  message: string;
};

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-lg border border-slate-200">
      <div className="w-16 h-16 border-4 border-t-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-lg font-semibold text-slate-700 animate-pulse">{message}</p>
    </div>
  );
};
