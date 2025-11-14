import React from "react";
import Navbar from "./Navbar";
import JeepHero from "./JeepHero";
import JeepSection2 from "./JeepSection2";

export default function JeepMain({ user, onLogin, onRegister, onLogout }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        user={user} 
        onLogin={onLogin} 
        onRegister={onRegister} 
        onLogout={onLogout} 
      />
      <JeepHero />
      <div className="h-1 bg-black"></div>
      <JeepSection2 />
    </div>
  );
}