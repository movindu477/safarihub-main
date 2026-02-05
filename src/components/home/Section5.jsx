import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle } from "lucide-react";
import { getFirestore, collection, query, where, getCountFromServer } from "firebase/firestore";

// Import background image from src/assets
import cameraImage from "../../assets/camera1.avif";

export default function Section5() {
  const navigate = useNavigate();
  const [rentalCount, setRentalCount] = useState(0);

  useEffect(() => {
    const fetchRentalCount = async () => {
      try {
        const db = getFirestore();
        const q = query(
          collection(db, "serviceProviders"),
          where("serviceType", "==", "Renting")
        );
        const snapshot = await getCountFromServer(q);
        setRentalCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching rental count:", error);
        // Fallback to a default value if fetch fails, or keep 0
        setRentalCount(50);
      }
    };

    fetchRentalCount();
  }, []);

  const features = [
    "Professional DSLR cameras",
    "Action cameras & GoPros",
    "Lenses & accessories",
    "Flexible rental periods"
  ];

  return (
    <section className="relative w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-200/20 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 xl:gap-16">
          {/* Left Content Section */}
          <div className="w-full lg:w-1/2 space-y-6 sm:space-y-8 text-center lg:text-left order-2 lg:order-1">
            {/* Icon Badge */}
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mx-auto lg:mx-0">
              <Camera className="w-4 h-4" />
              <span>Equipment Rental</span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
              Find a place to rent
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Discover premium camera and adventure gear rental locations across Sri Lanka. From professional DSLRs to action cameras, we provide high-quality equipment for capturing every unforgettable moment of your journey.
            </p>

            {/* Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto lg:mx-0">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <button
                onClick={() => navigate('/rent')}
                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-8 sm:px-10 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
              >
                <Camera className="w-5 h-5" />
                <span className="text-base sm:text-lg">Rental Location</span>
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>

          {/* Right Image Section */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="relative w-full max-w-lg lg:max-w-2xl">
              {/* Main Image Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
                <img
                  src={cameraImage}
                  alt="Professional Camera Equipment"
                  className="w-full h-auto object-cover"
                />
                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
              </div>

              {/* Floating Stats Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 hidden sm:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {rentalCount}+
                    </p>
                    <p className="text-sm text-gray-600">Rental Locations</p>
                  </div>
                </div>
              </div>

              {/* Decorative Circle */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-20 blur-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
