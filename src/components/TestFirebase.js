import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test if we can access any collection
    const collections = ['serviceProviders', 'onlineStatus', 'messages'];
    
    for (const collName of collections) {
      try {
        const querySnapshot = await getDocs(collection(db, collName));
        console.log(`✅ ${collName} collection: ${querySnapshot.size} documents found`);
        
        if (querySnapshot.size > 0) {
          querySnapshot.forEach((doc) => {
            console.log(`   📄 ${doc.id}:`, doc.data());
          });
        } else {
          console.log(`   ℹ️  No documents found in ${collName}`);
        }
      } catch (error) {
        console.log(`❌ ${collName} collection:`, error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Function to add sample data if database is empty
export const addSampleJeepDrivers = async () => {
  const sampleDrivers = [
    {
      fullName: "Kamal Perera",
      serviceType: "Jeep Driver",
      location: "Yala",
      pricePerDay: 8000,
      rating: 4.5,
      experienceYears: 8,
      vehicleType: "Standard Safari Jeep",
      destinations: ["Yala National Park", "Bundala National Park"],
      languages: ["English", "Sinhala"],
      specialSkills: ["Wildlife photography knowledge", "Birdwatching expertise"],
      certifications: ["Wildlife Department Certified"],
      contactPhone: "+94771234567",
      email: "kamal@example.com",
      description: "Experienced safari driver with excellent knowledge of Yala National Park",
      online: true,
      createdAt: new Date()
    },
    {
      fullName: "Sunil Fernando",
      serviceType: "Jeep Driver", 
      location: "Wilpattu",
      pricePerDay: 7500,
      rating: 4.2,
      experienceYears: 6,
      vehicleType: "Open Roof Jeep",
      destinations: ["Wilpattu National Park"],
      languages: ["English", "Sinhala", "Tamil"],
      specialSkills: ["Private tours", "Full-day safari"],
      contactPhone: "+94771234568",
      email: "sunil@example.com",
      description: "Specialized in Wilpattu safari tours",
      online: false,
      createdAt: new Date()
    },
    {
      fullName: "Anura Bandara",
      serviceType: "Jeep Driver",
      location: "Udawalawe",
      pricePerDay: 7000,
      rating: 4.7,
      experienceYears: 10,
      vehicleType: "Luxury Safari Jeep",
      destinations: ["Udawalawe National Park", "Yala National Park"],
      languages: ["English", "Sinhala"],
      specialSkills: ["Elephant tracking", "Family-friendly tours"],
      certifications: ["Tourism Board Licensed", "First Aid Certified"],
      contactPhone: "+94771234569",
      email: "anura@example.com",
      description: "Expert in elephant safaris with 10 years of experience",
      online: true,
      createdAt: new Date()
    }
  ];

  try {
    for (const driver of sampleDrivers) {
      const docRef = await addDoc(collection(db, 'serviceProviders'), driver);
      console.log('✅ Added driver:', docRef.id, driver.fullName);
    }
    console.log('🎉 Sample data added successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    return false;
  }
};