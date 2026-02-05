import React from 'react';
import {
    X, User, Mail, Phone, MapPin, Globe, Calendar, Award,
    Settings, Heart, LogOut, ChevronRight, TrendingUp, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserProfileSidePanel = ({
    isOpen,
    onClose,
    userProfileData,
    profileMenuItems,
    handleLogout,
    isServiceProvider
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 animate-fadeIn"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[#0a0f16] shadow-2xl z-110 animate-slideInRight border-l border-white/5 overflow-hidden flex flex-col">

                {/* Header with Gradient Background */}
                <div className="relative h-56 shrink-0">
                    <div className="absolute inset-0 bg-linear-to-b from-emerald-900/40 via-teal-900/20 to-transparent" />


                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all z-10 border border-white/10"
                    >
                        <X size={20} />
                    </button>

                    {/* User Hero Section */}
                    <div className="relative h-full flex flex-col items-center justify-center pt-8 pb-4 px-6">
                        <div className="relative mb-3">
                            <div className="w-20 h-20 rounded-full border-4 border-[#0a0f16] shadow-2xl overflow-hidden bg-gray-800">
                                <img
                                    src={userProfileData.avatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.src = '/assets/user.png';
                                        e.target.onerror = null;
                                    }}
                                />
                            </div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-3 border-[#0a0f16]" />
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">{userProfileData.name}</h3>
                            <p className="text-white/50 text-xs mb-3">{userProfileData.email}</p>
                            <div className="inline-flex items-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                                {userProfileData.membership}
                            </div>
                            <p className="mt-3 flex items-center justify-center gap-2 text-white/40 text-xs">
                                <Calendar size={12} />
                                Member since {userProfileData.joinDate}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                    {/* Section: Profile Information */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest px-1">
                            <User size={14} />
                            Profile Information
                        </h4>

                        <div className="space-y-2">
                            <div className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/5 flex items-center gap-4 group">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-tight">Phone</p>
                                    <p className="text-white/80 text-sm font-medium">{userProfileData.phone}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/5 flex items-center gap-4 group">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-tight">Country</p>
                                    <p className="text-white/80 text-sm font-medium">{userProfileData.location}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/5 flex items-center gap-4 group">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Award size={18} />
                                </div>
                                <div>
                                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-tight">Role</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-white/80 text-sm font-medium">{userProfileData.membership}</p>
                                        <span className="px-2 py-0.5 bg-white/10 rounded text-[9px] text-white/60">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-2 mt-4">
                        <h4 className="text-white/30 text-xs font-bold uppercase tracking-widest px-1 mb-4">
                            Dashboard & Settings
                        </h4>

                        <div className="grid grid-cols-1 gap-2">
                            {/* My Profile Button - Moved here */}
                            <button
                                onClick={() => {
                                    const myProfileItem = profileMenuItems.find(item => item.label === "My Profile");
                                    if (myProfileItem && myProfileItem.onClick) {
                                        myProfileItem.onClick();
                                    } else {
                                        navigate('/profile');
                                    }
                                    onClose();
                                }}
                                className="flex items-center justify-between p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 rounded-2xl transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white/5 rounded-lg text-white/50 group-hover:text-emerald-400 group-hover:bg-emerald-500/5 transition-all">
                                        <User size={18} />
                                    </div>
                                    <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
                                        My Profile
                                    </span>
                                </div>
                                <ChevronRight size={16} className="text-white/20 group-hover:text-emerald-400 transition-all group-hover:translate-x-1" />
                            </button>

                            {profileMenuItems.filter(item => item.label !== "My Profile").map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            item.onClick();
                                            onClose();
                                        }}
                                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white/5 rounded-lg text-white/50 group-hover:text-emerald-400 group-hover:bg-emerald-500/5 transition-all">
                                                <Icon size={18} />
                                            </div>
                                            <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
                                                {item.label}
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-white/20 group-hover:text-emerald-400 transition-all group-hover:translate-x-1" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col gap-3">


                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/10"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </>
    );
};

export default UserProfileSidePanel;
