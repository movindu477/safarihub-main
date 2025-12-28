import React from 'react';
import logo from '../assets/logo.png';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-green-900 via-emerald-900 to-green-800 flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Logo with animation */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Spinning circle loader */}
          <div className="absolute inset-0 -m-4">
            <div className="w-full h-full border-4 border-transparent border-t-emerald-400 border-r-emerald-400 rounded-full animate-spin"></div>
          </div>
          <div className="absolute inset-0 -m-6">
            <div className="w-full h-full border-4 border-transparent border-b-emerald-300 border-l-emerald-300 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>

          {/* Logo image with dark background */}
          <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-full p-8 border-2 border-gray-700/50 shadow-2xl">
            <img
              src={logo}
              alt="SafariHub Logo"
              className="h-32 md:h-40 lg:h-48 w-auto object-contain"
            />
          </div>
        </div>

        {/* Loading text */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-emerald-100 text-sm md:text-base mt-4 font-medium">Loading SafariHub...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
