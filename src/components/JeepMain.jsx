import React from "react";
import Navbar from "./Navbar";
import JeepHero from "./JeepHero";

export default function JeepDriversPage({ user, onLogin, onRegister, onLogout }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        user={user} 
        onLogin={onLogin} 
        onRegister={onRegister} 
        onLogout={onLogout} 
      />
      <JeepHero />
    </div>
  );
}