import React, { useState } from 'react';
import logo from '../assets/logo.png';

const SplashScreen = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleExploreClick = () => {
    setIsLoading(true);
    
    // Simulate loading time (2 seconds)
    setTimeout(() => {
      setFadeOut(true);
      // Wait for fade out animation to complete
      setTimeout(() => {
        onComplete();
      }, 800);
    }, 2000);
  };

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <img 
          src={logo} 
          alt="SafariHub Logo" 
          className="splash-logo"
        />
        
        {!isLoading ? (
          <button 
            className="splash-button"
            onClick={handleExploreClick}
          >
            EXPLORE
          </button>
        ) : (
          <div className="loading-line-container">
            <div className="loading-line"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
