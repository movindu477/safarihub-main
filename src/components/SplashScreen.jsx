import React, { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

const SplashScreen = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const duration = 3000; // 3 seconds total
    const interval = 20; // Update every 20ms
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          // Start exit animation
          setTimeout(() => {
            setIsExiting(true);
            // Complete loading after exit animation
            setTimeout(() => {
              onLoadingComplete();
            }, 500);
          }, 300);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 px-4">
        {/* Logo Container with Animation */}
        <div
          className={`transform transition-all duration-1000 ${
            progress > 10 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Logo */}
            <img
              src={logo}
              alt="SafariHub Logo"
              className="relative w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl animate-float"
            />
          </div>
        </div>

        {/* Brand Name */}
        <div
          className={`transform transition-all duration-1000 delay-300 ${
            progress > 20 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider drop-shadow-lg">
            Safari<span className="text-emerald-300">Hub</span>
          </h1>
          <p className="text-emerald-200 text-center mt-2 text-sm md:text-base font-light tracking-wide">
            Your Gateway to Wildlife Adventures
          </p>
        </div>

        {/* Loading Bar Container */}
        <div
          className={`w-64 md:w-80 transform transition-all duration-1000 delay-500 ${
            progress > 30 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {/* Loading Bar Background */}
          <div className="relative h-2 bg-emerald-950/50 rounded-full overflow-hidden backdrop-blur-sm border border-emerald-700/30">
            {/* Animated Gradient Bar */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-lg shadow-emerald-500/50"
              style={{ width: `${progress}%` }}
            >
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
            
            {/* Glow Effect on Progress */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-400 rounded-full blur-md"
              style={{ left: `${progress}%`, transition: 'left 0.3s ease-out' }}
            ></div>
          </div>

          {/* Loading Percentage */}
          <div className="flex justify-between items-center mt-3">
            <span className="text-emerald-300 text-xs font-medium">Loading...</span>
            <span className="text-emerald-200 text-xs font-bold">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Loading Dots Animation */}
        <div className="flex space-x-2 mt-4">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>

      {/* Bottom Decorative Element */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-emerald-400/50 text-xs tracking-widest">
        EST. 2024
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
