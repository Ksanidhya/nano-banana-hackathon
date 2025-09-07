import React from 'react';

type NotificationProps = {
  message: string;
  onClose: () => void;
};

export const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md shadow-md animate-fade-in" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5.414V8a1 1 0 012 0v4.586a1 1 0 11-2 0zM10 5.5a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold">Heads up!</p>
          <p className="text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 bg-yellow-100 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 hover:bg-yellow-200 inline-flex h-8 w-8" aria-label="Dismiss">
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
        </button>
      </div>
    </div>
  );
};
