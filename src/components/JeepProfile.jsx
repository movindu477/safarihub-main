import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Star, Calendar, Clock, Users, Shield, Award, Globe } from 'lucide-react';

const JeepProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { jeep } = location.state || {};
  
  const [selectedImage, setSelectedImage] = useState(0);

  // If no jeep data, redirect back
  if (!jeep) {
    navigate('/driver');
    return null;
  }

  // Format price with commas
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  // Handle WhatsApp redirect
  const handleWhatsAppClick = () => {
    if (jeep.contactPhone && jeep.contactPhone !== 'Not provided') {
      const phoneNumber = jeep.contactPhone.replace(/\D/g, '');
      const message = `Hello ${jeep.driverName}, I'm interested in booking your safari jeep service. Could you please provide more details?`;
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Handle phone call
  const handleCallClick = () => {
    if (jeep.contactPhone && jeep.contactPhone !== 'Not provided') {
      const phoneNumber = jeep.contactPhone.replace(/\D/g, '');
      window.open(`tel:${phoneNumber}`, '_self');
    }
  };

  // Handle email
  const handleEmailClick = () => {
    if (jeep.contactEmail) {
      const subject = `Safari Jeep Booking Inquiry - ${jeep.driverName}`;
      const body = `Hello ${jeep.driverName},\n\nI'm interested in booking your safari jeep service. Could you please provide more information about availability and pricing?\n\nThank you!`;
      window.open(`mailto:${jeep.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    }
  };

  // Sample gallery images (in real app, this would come from the driver's data)
  const galleryImages = [
    jeep.imageUrl,
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1552083375-1447ce886485?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/driver')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium text-sm">Back to Drivers</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Profile Image & Gallery */}
          <div className="lg:col-span-1 space-y-4">
            {/* Main Profile Image */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="h-48 w-full relative">
                {jeep.imageUrl ? (
                  <img
                    src={jeep.imageUrl}
                    alt={jeep.driverName}
                    className="w-full h-full object-cover rounded-t-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">🚙</span>
                      </div>
                      <p className="text-sm font-medium text-gray-600">No Photo</p>
                    </div>
                  </div>
                )}
                
                {/* Experience Badge */}
                {jeep.experience > 0 && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                    {jeep.experience}+ years
                  </div>
                )}
              </div>
              
              {/* Rating and Location */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <div className="flex text-yellow-400 text-sm">
                      {'★'.repeat(Math.floor(jeep.rating || 0))}
                      {'☆'.repeat(5 - Math.floor(jeep.rating || 0))}
                    </div>
                    <span className="text-xs text-gray-600 ml-1">
                      ({jeep.rating > 0 ? jeep.rating.toFixed(1) : 'New'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">{jeep.location}</span>
                  </div>
                </div>
                
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Shield className="h-3 w-3 text-green-500" />
                    <span>Verified</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span>6-8 People</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-3 w-3 text-purple-500" />
                    <span>Flexible</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Award className="h-3 w-3 text-orange-500" />
                    <span>Professional</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery */}
            {galleryImages.length > 1 && (
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Gallery</h3>
                <div className="grid grid-cols-2 gap-2">
                  {galleryImages.map((image, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 ${
                        selectedImage === index ? 'border-yellow-500' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details & Actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Driver Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900 mb-1">{jeep.driverName}</h1>
                  <div className="flex items-center gap-3 text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">{jeep.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      <span className="text-sm">{jeep.rating > 0 ? jeep.rating.toFixed(1) : 'New'} Rating</span>
                    </div>
                  </div>
                </div>
                
                {/* Price */}
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {jeep.pricePerDay > 0 ? (
                      <>LKR {formatPrice(jeep.pricePerDay)}<span className="text-xs font-normal text-gray-500">/day</span></>
                    ) : (
                      <span className="text-sm text-gray-500">Contact for price</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">All inclusive</p>
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="mb-4">
                <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  {jeep.vehicleType}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {jeep.description}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destinations */}
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Destinations
                  </h4>
                  <div className="space-y-1">
                    {jeep.destinations?.slice(0, 3).map((destination, index) => (
                      <div key={index} className="flex items-center gap-1 text-gray-600 text-xs">
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                        <span className="truncate">{destination}</span>
                      </div>
                    ))}
                    {jeep.destinations?.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{jeep.destinations.length - 3} more destinations
                      </div>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Languages
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {jeep.languages?.slice(0, 3).map((language, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs"
                      >
                        {language}
                      </span>
                    ))}
                    {jeep.languages?.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{jeep.languages.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Special Skills */}
                {jeep.specialSkills && jeep.specialSkills.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-800 text-sm mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {jeep.specialSkills.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {jeep.specialSkills.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{jeep.specialSkills.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {jeep.certifications && jeep.certifications.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-800 text-sm mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-1">
                      {jeep.certifications.slice(0, 3).map((cert, index) => (
                        <span
                          key={index}
                          className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs"
                        >
                          {cert}
                        </span>
                      ))}
                      {jeep.certifications.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{jeep.certifications.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact & Action Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Get in Touch</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Phone */}
                <button
                  onClick={handleCallClick}
                  disabled={!jeep.contactPhone || jeep.contactPhone === 'Not provided'}
                  className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="h-4 w-4 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-700 text-sm">Call</div>
                    <div className="text-xs text-gray-500">
                      {jeep.contactPhone && jeep.contactPhone !== 'Not provided' ? jeep.contactPhone : 'Not available'}
                    </div>
                  </div>
                </button>

                {/* Email */}
                <button
                  onClick={handleEmailClick}
                  disabled={!jeep.contactEmail}
                  className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="h-4 w-4 text-blue-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-700 text-sm">Email</div>
                    <div className="text-xs text-gray-500">
                      {jeep.contactEmail || 'Not available'}
                    </div>
                  </div>
                </button>

                {/* Location */}
                <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-700 text-sm">Location</div>
                    <div className="text-xs text-gray-500">{jeep.location}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleWhatsAppClick}
                  disabled={!jeep.contactPhone || jeep.contactPhone === 'Not provided'}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>💬</span>
                  WhatsApp
                </button>
                
                <button className="flex-1 bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-semibold text-sm flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Book Now
                </button>
              </div>
            </div>

            {/* Safety & Features */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Safety & Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">Safety Certified</div>
                    <div className="text-xs text-gray-500">Verified</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Award className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">Experienced</div>
                    <div className="text-xs text-gray-500">{jeep.experience}+ years</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Globe className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">Multi-lingual</div>
                    <div className="text-xs text-gray-500">{jeep.languages?.length || 0} languages</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JeepProfile;