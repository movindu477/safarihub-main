import React from "react";
import { FaFacebookF, FaTwitter, FaYoutube, FaLinkedinIn, FaMapMarkerAlt, FaPhone, FaEnvelope, FaArrowRight } from "react-icons/fa";

// Import logo from src/assets
import logo from "../assets/logo.png";

export default function Footer() {
  // Quick links data for better maintainability
  const quickLinks = [
    { name: "Home", href: "/", icon: <FaArrowRight className="text-xs" /> },
    { name: "About Us", href: "/about", icon: <FaArrowRight className="text-xs" /> },
    { name: "Our Services", href: "/services", icon: <FaArrowRight className="text-xs" /> },
    { name: "Adventure Packages", href: "/packages", icon: <FaArrowRight className="text-xs" /> },
    { name: "Rentals", href: "/rentals", icon: <FaArrowRight className="text-xs" /> },
    { name: "Gallery", href: "/gallery", icon: <FaArrowRight className="text-xs" /> },
  ];

  const socialLinks = [
    { icon: <FaFacebookF />, href: "#", color: "hover:text-blue-500" },
    { icon: <FaTwitter />, href: "#", color: "hover:text-sky-400" },
    { icon: <FaYoutube />, href: "#", color: "hover:text-red-500" },
    { icon: <FaLinkedinIn />, href: "#", color: "hover:text-blue-600" },
  ];

  const contactInfo = [
    {
      icon: <FaMapMarkerAlt className="text-green-400" />,
      text: "Union Place Colombo",
    },
    {
      icon: <FaPhone className="text-green-400" />,
      text: "+94 77 266 5555",
      subtext: "Hotline",
    },
    {
      icon: <FaEnvelope className="text-green-400" />,
      text: "APIIT",
      subtext: "Email Us",
    },
  ];

  // Newsletter Component
  const NewsletterSignup = () => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
        Newsletter
      </h3>
      <p className="text-gray-400 text-sm mb-3">Subscribe for adventure updates</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
        />
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300 text-sm whitespace-nowrap">
          Subscribe
        </button>
      </div>
    </div>
  );

  // Contact Item Component
  const ContactItem = ({ icon, text, subtext }) => (
    <div className="flex items-start space-x-3 mb-4 group cursor-pointer">
      <div className="mt-1 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <p className="text-white text-sm font-medium group-hover:text-green-400 transition-colors">
          {text}
        </p>
        {subtext && (
          <p className="text-gray-400 text-xs mt-1">{subtext}</p>
        )}
      </div>
    </div>
  );

  // Quick Link Item Component
  const QuickLinkItem = ({ name, href, icon }) => (
    <li>
      <a
        href={href}
        className="flex items-center text-gray-300 hover:text-green-400 transition-all duration-300 group py-1"
      >
        <span className="mr-2 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300">
          {icon}
        </span>
        <span className="group-hover:translate-x-2 transition-transform duration-300">
          {name}
        </span>
      </a>
    </li>
  );

  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500"></div>
      </div>
      
      <div className="relative z-10 py-12 px-6 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-10">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src={logo} 
                alt="SafariHub Logo" 
                className="w-40 h-auto transform hover:scale-105 transition-transform duration-300" 
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">
              Your All in One Gateway to Adventure. Discover the wild, embrace the journey.
            </p>
            <NewsletterSignup />
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-white relative inline-block">
              Quick Links
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-blue-500 transform scale-x-0 hover:scale-x-100 transition-transform duration-300"></span>
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <QuickLinkItem key={index} {...link} />
              ))}
            </ul>
          </div>

          {/* Contact Us Section */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-white relative inline-block">
              Contact Us
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-blue-500 transform scale-x-0 hover:scale-x-100 transition-transform duration-300"></span>
            </h3>
            <div className="space-y-1">
              {contactInfo.map((item, index) => (
                <ContactItem key={index} {...item} />
              ))}
            </div>
          </div>

          {/* Social Media Section */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-white relative inline-block">
              Follow Us
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-blue-500 transform scale-x-0 hover:scale-x-100 transition-transform duration-300"></span>
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Stay connected with our latest adventures and offers
            </p>
            <div className="flex space-x-3 mb-6">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className={`w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 ${social.color} hover:bg-gray-700`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            
            {/* Opening Hours */}
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
              <h4 className="font-semibold text-white mb-2 text-sm">Opening Hours</h4>
              <p className="text-gray-300 text-sm">Mon - Sun: 24/7</p>
              <p className="text-gray-300 text-sm">Customer Support</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              Copyright © 2024 - <span className="text-white font-semibold">SAFARIHUB</span> - All Rights Reserved.
            </div>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-green-400 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-green-400 transition-colors">Terms of Service</a>
              <a href="/cookies" className="hover:text-green-400 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}