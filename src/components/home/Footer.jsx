import React from "react";
import { Facebook, Twitter, Youtube, Linkedin, MapPin, Phone, Mail, ArrowRight } from "lucide-react";

// Import logo from src/assets
import logo from "../../assets/logo.png";

export default function Footer() {
  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Our Services", href: "/services" },
    { name: "Adventure Packages", href: "/packages" },
    { name: "Rentals", href: "/rentals" },
    { name: "Gallery", href: "/gallery" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  const contactInfo = [
    {
      icon: MapPin,
      text: "Union Place Colombo",
      label: "Address"
    },
    {
      icon: Phone,
      text: "+94 77 266 5555",
      label: "Hotline"
    },
    {
      icon: Mail,
      text: "APIIT",
      label: "Email Us"
    },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 to-black text-white overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-600/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="text-center sm:text-left">
            <div className="flex justify-center sm:justify-start mb-4">
              <img
                src={logo}
                alt="SafariHub Logo"
                className="h-20 w-auto cursor-pointer transform hover:scale-105 transition-transform duration-300"
                onClick={() => window.location.href = '/'}
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Your All in One Gateway to Adventure. Discover the wild, embrace the journey.
            </p>

            {/* Social Media Icons */}
            <div className="flex justify-center sm:justify-start gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-green-600 flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold mb-4 text-white">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center text-gray-400 hover:text-green-400 transition-colors duration-300 text-sm"
                  >
                    <ArrowRight className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                    <span>{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold mb-4 text-white">
              Contact Us
            </h3>
            <div className="space-y-4">
              {contactInfo.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-start justify-center sm:justify-start gap-3 group">
                    <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-600/30 transition-colors">
                      <Icon className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm text-gray-300 font-medium">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-gray-400 text-sm text-center md:text-left">
              © 2024 <span className="text-white font-semibold">SafariHub</span>. All Rights Reserved.
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/privacy" className="text-gray-400 hover:text-green-400 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-green-400 transition-colors">
                Terms of Service
              </a>
              <a href="/cookies" className="text-gray-400 hover:text-green-400 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}