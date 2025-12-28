import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Heart,
  Globe,
  Users,
  Award,
  Shield,
  Sparkles,
  MapPin,
  Target,
  Zap,
  Star
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatList from '../ChatList';
import { ScrollToTopButton } from '../../App';

const AboutUs = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const location = useLocation();
  const [showChatList, setShowChatList] = useState(false);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const features = [
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Explore Sri Lanka",
      description: "Discover the breathtaking beauty of Sri Lankan national parks, wildlife, and natural wonders."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Connect with Locals",
      description: "Meet experienced guides and jeep drivers who know the land like the back of their hand."
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Verified Providers",
      description: "All service providers are verified and certified to ensure safe and reliable experiences."
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Memorable Experiences",
      description: "Create unforgettable memories with personalized safari and tour experiences."
    }
  ];

  const values = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Safety First",
      description: "Your safety is our top priority. All providers meet strict safety standards."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Authentic Experiences",
      description: "Experience the real Sri Lanka with local experts who share their passion."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Easy Booking",
      description: "Simple, fast, and secure booking process for all your adventure needs."
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "Quality Service",
      description: "We maintain high standards to ensure every experience exceeds expectations."
    }
  ];

  const stats = [
    { number: "500+", label: "Service Providers" },
    { number: "10K+", label: "Happy Customers" },
    { number: "50+", label: "Destinations" },
    { number: "4.8/5", label: "Average Rating" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <ScrollToTopButton />
      <Navbar
        user={user}
        onLogout={onLogout}
        onLogin={(screen) => (onShowAuth ? onShowAuth(screen || 'login') : null)}
        onRegister={(screen) => (onShowAuth ? onShowAuth(screen || 'register') : null)}
        onOpenChatList={() => setShowChatList(true)}
      />

      {/* Chat List Modal */}
      {showChatList && user && (
        <ChatList
          user={user}
          onClose={() => setShowChatList(false)}
        />
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">About SafariHub</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Connecting Adventure Seekers with
              <span className="block text-emerald-200">Nature's Wonders</span>
            </h1>

            <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Your trusted platform for discovering authentic wildlife safaris, expert tour guides,
              and unforgettable adventures across Sri Lanka's pristine national parks.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
                <MapPin className="h-5 w-5 inline-block mr-2" />
                <span className="font-semibold">Sri Lanka</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
                <span className="font-semibold">Since 2024</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Our Mission
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto"></div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                At SafariHub, we believe that everyone deserves to experience the magic of Sri Lanka's
                wildlife and natural beauty. Our mission is to bridge the gap between adventure enthusiasts
                and local experts, creating meaningful connections that benefit both tourists and service providers.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                We're committed to promoting sustainable tourism, supporting local communities, and ensuring
                every journey is safe, authentic, and unforgettable. Through our platform, we empower local
                guides and jeep drivers while helping visitors discover the hidden gems of this beautiful island.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose SafariHub?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for the perfect Sri Lankan adventure
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-100 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-emerald-500/30">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl md:text-6xl font-bold mb-2 text-emerald-200">
                  {stat.number}
                </div>
                <div className="text-lg text-emerald-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white mb-4">
                  {value.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Your Adventure?
            </h2>
            <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
              Join thousands of travelers exploring Sri Lanka's natural wonders.
              Find your perfect guide or start offering your services today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/driver'}
                className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Find a Jeep Driver
              </button>
              <button
                onClick={() => window.location.href = '/guide'}
                className="bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-800 border-2 border-white/20 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Find a Tour Guide
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;

