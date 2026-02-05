// Centralized Destination Store
// Single source of truth for all destination data

// Import local images
import yalaBackground from '../assets/yalaback.jpg';
import yala1 from '../assets/yala1.jpg';
import yala2 from '../assets/yala2.webp';
import yala3 from '../assets/yala3.jpg';
import yala4 from '../assets/yala4.webp';
import yala5 from '../assets/yala5.jpg';
import yala6 from '../assets/yala6.jpg';
import yala7 from '../assets/yala7.jpg';
import yala8 from '../assets/yala8.jpg';
import yala9 from '../assets/yala9.jpg';
import yala10 from '../assets/yala10.webp';
import yala11 from '../assets/yala11.jpg';
import yala12 from '../assets/yala12.jpg';
import back4ori2 from '../assets/back4ori2.avif';
import wilpattuBackground from '../assets/wilpattu.avif';
import mirissaBackground from '../assets/mirissa.avif';
import unaBackground from '../assets/una.avif';
import hortBackground from '../assets/hort.avif';
import knuckBackground from '../assets/knuck.avif';
import kumanaBackground from '../assets/kumana.jpg';
import lunuBackground from '../assets/lunu.jpg';
import sinBackground from '../assets/sin.avif';
import camera1Background from '../assets/camera1.avif';

/**
 * All destinations data
 * Each destination must have:
 * - id: unique identifier (used in URLs)
 * - name: display name
 * - coordinates: { lat, lng } for maps
 * - location: human-readable location
 */
const destinations = {
  'yala-national-park': {
    id: 'yala-national-park',
    name: 'Yala National Park',
    province: 'Southern Province',
    description: 'Home to the highest density of leopards in the world. Experience thrilling jeep safaris and witness diverse wildlife in their natural habitat.',
    fullDescription: `Yala National Park is one of Sri Lanka's premier wildlife destinations, spanning over 979 square kilometers. It's world-renowned for having the highest density of leopards globally, making it a hotspot for wildlife enthusiasts and photographers.

The park features diverse ecosystems including dry monsoon forests, scrub jungles, freshwater lakes, and lagoons. With over 44 species of mammals and 215 species of birds, Yala offers an unparalleled safari experience.

Best visited during the dry season (February to June), the park provides excellent opportunities to spot the elusive Sri Lankan leopard, elephants, sloth bears, spotted deer, wild boar, and numerous bird species including peacocks and painted storks.`,
    location: 'Southern Province, Sri Lanka',
    coordinates: { lat: 6.2853, lng: 81.3397 },
    bestTimeToVisit: 'February to June (Dry Season)',
    area: '979 km²',
    established: '1938',
    backgroundImage: yalaBackground,
    images: [yalaBackground, yalaBackground, yalaBackground],
    animals: [
      {
        name: 'Sri Lankan Leopard',
        image: back4ori2,
        description: 'The apex predator of Yala and the park’s most iconic species.',
        populationEstimate: '250–300',
        abundance: 'One of the highest leopard densities in the world. Block 1 alone hosts ~25–40 individuals.',
        scientificName: 'Panthera pardus kotiya',
        sinhalaName: 'කොටියා (Kotiyā)',
        habitat: 'Dry zone forests, scrublands, rocky outcrops, and grasslands. Highly adaptable and territorial.',
        photographyTips: 'Use a 400-600mm telephoto lens. Early morning (6-9 AM) offers the best lighting. Look for leopards resting on trees or rocky outcrops. Be patient at waterholes during dry season. Keep ISO low (400-800) to reduce noise. Maintain a safe distance and never disturb the animal.'
      },
      {
        name: 'Sri Lankan Elephant',
        image: yala2,
        description: 'Family groups and lone bulls roam freely between scrub jungle and open grasslands.',
        populationEstimate: '250–350',
        abundance: 'Common, seasonal movement inside the park. Seen frequently near water sources during dry season.',
        scientificName: 'Elephas maximus maximus',
        sinhalaName: 'අලියා (Aliyā)',
        habitat: 'Open grasslands, forest edges, and near water bodies. Move between blocks seasonally in search of water and food.',
        photographyTips: 'Best photographed near waterholes and open grasslands. Use 200-400mm lens for close-ups and 70-200mm for herd shots. Capture behavior like bathing, dust bathing, and feeding. Golden hour (sunrise/sunset) provides warm tones. Always respect their space—elephants can be unpredictable.'
      },
      {
        name: 'Sri Lankan Sloth Bear',
        image: yala3,
        description: 'A shaggy, nocturnal bear often seen foraging near termite mounds.',
        populationEstimate: '30–50',
        abundance: 'Rare but established. Mostly nocturnal, sightings are occasional.',
        scientificName: 'Melursus ursinus inornatus',
        sinhalaName: 'වලසා (Walasā)',
        habitat: 'Dense forest areas, particularly near termite mounds and fruiting trees. Active at dawn and dusk.',
        photographyTips: 'Challenging subject—requires patience and luck. Best spotted early morning or late evening. Use 300-600mm lens with high shutter speed (1/500s+) as they move quickly. Increase ISO (800-1600) in low light. Capture feeding behavior at termite mounds. Maintain maximum distance for safety.'
      },
      {
        name: 'Wild Water Buffalo',
        image: yala4,
        description: 'Powerful wild buffalo frequently seen wallowing in villus and marshy areas.',
        populationEstimate: '400–600',
        abundance: 'Common near wetlands. Both wild and feral individuals present.',
        scientificName: 'Bubalus arnee',
        sinhalaName: 'වල් මී හරකා (Wal Mee Harakā)',
        habitat: 'Wetlands, villus (natural lakes), and marshy grasslands. Often seen wallowing in mud to cool down.',
        photographyTips: 'Photograph at villu edges during early morning or late afternoon. Use 200-400mm lens. Capture wallowing behavior and reflections in water. Shoot at eye level for powerful compositions. Be cautious—bulls can be aggressive during mating season.'
      },
      {
        name: 'Sambar Deer',
        image: yala5,
        description: 'Largest deer species in the park, often found in forested areas.',
        populationEstimate: '800–1,200',
        abundance: 'Common. Largest deer species in the park.',
        scientificName: 'Rusa unicolor',
        sinhalaName: 'ගොන් මුවා (Gon Muwā)',
        habitat: 'Dense forests, forest edges, and near water sources. Often solitary or in small groups.',
        photographyTips: 'Best photographed in soft morning or evening light. Use 300-500mm lens for portraits. Capture alert poses with ears forward. Focus on the eyes. Males with antlers make impressive subjects during rutting season. Photograph them at waterholes for added interest.'
      },
      {
        name: 'Mugger Crocodile',
        image: yala6,
        description: 'Large freshwater crocodile basking on riverbanks and lake shores.',
        populationEstimate: '150–200',
        abundance: 'Common. Seen in lakes and reservoirs.',
        scientificName: 'Crocodylus palustris',
        sinhalaName: 'කිඹුලා (Kimbulā)',
        habitat: 'Freshwater lakes, reservoirs, and slow-moving rivers. Often basking on banks or rocks.',
        photographyTips: 'Photograph basking crocodiles mid-morning when they are most active. Use 400-600mm lens for close-ups from a safe distance. Capture open-mouth thermoregulation behavior. Shoot from low angles to emphasize size and power. Watch for interesting interactions with birds or other wildlife.'
      },
      {
        name: 'Indian Peafowl',
        image: yala7,
        description: 'Sri Lanka’s national bird, famous for its dramatic courtship displays.',
        populationEstimate: '10,000+',
        abundance: 'Extremely common. National bird of Sri Lanka.',
        scientificName: 'Pavo cristatus',
        sinhalaName: 'මොනරා (Monarā)',
        habitat: 'Open forests, grasslands, near water sources, and around park bungalows. Very adaptable.',
        photographyTips: 'Best photographed during mating displays (monsoon season). Use 200-400mm lens. Capture the full fan display from the front. Fast shutter speed (1/1000s+) for flying shots. Photograph males calling at dawn for dramatic images. Reflections in water add impact.'
      },
      {
        name: 'Wild Boar',
        image: yala8,
        description: 'Important prey species found throughout the park.',
        populationEstimate: '2,000–3,000',
        abundance: 'Common. Important prey species.',
        scientificName: 'Sus scrofa',
        sinhalaName: 'වල් ඌරා (Wal Ūrā)',
        habitat: 'Forest undergrowth, grasslands, and near water sources. Often seen foraging in groups.',
        photographyTips: 'Photograph families with piglets for engaging shots. Use 300-400mm lens. Capture foraging behavior. Early morning or late afternoon provides best light. Focus on piglets with distinctive striped patterns. Shoot from vehicle—wild boars can be aggressive if cornered.'
      },
      {
        name: 'Grey / Purple-faced Langur',
        image: yala9,
        description: 'Endemic primate species with distinctive grey and purple facial markings, commonly seen in tree canopies.',
        populationEstimate: '600–1,000',
        abundance: 'Common in forested areas. Often seen in troops in the tree canopy.',
        scientificName: 'Semnopithecus vetulus',
        sinhalaName: 'කළු වඳුරා (Kalu Wandurā)',
        habitat: 'Tree canopies in dry mixed forests. Live in troops of 5-15 individuals. Territorial and vocal.',
        photographyTips: 'Photograph in morning or late afternoon when they are most active. Use 300-500mm lens. Capture interactions between troop members, especially mothers with infants. Focus on facial expressions and purple face coloration. Shoot from slightly below to show canopy habitat. Fast shutter speed (1/500s+) for moving subjects.'
      },
      {
        name: 'Fishing Cat',
        image: yala10,
        description: 'A medium-sized wild cat adapted to wetland habitats, known for its exceptional fishing abilities.',
        populationEstimate: '20–40',
        abundance: 'Rare. Nocturnal and elusive, mostly found near water bodies and wetlands.',
        scientificName: 'Prionailurus viverrinus',
        sinhalaName: 'හඳුන් දිවියා (Handun Diviyā)',
        habitat: 'Wetlands, marshes, and mangrove areas. Primarily nocturnal and semi-aquatic.',
        photographyTips: 'Extremely rare sighting—requires immense patience and luck. Best chance at dawn or dusk near wetlands. Use high ISO (1600-3200) and fast lens (f/2.8-f/4). Stabilization is crucial. Use 400-600mm lens. If spotted, avoid sudden movements. Any photo of this species is valuable for conservation.'
      },
      {
        name: 'Painted Stork',
        image: yala11,
        description: 'Among the over 200 bird species, the painted stork is one of the common and beautiful waterbirds attracted to the park\'s lagoons.',
        populationEstimate: 'Common',
        abundance: 'Frequently seen in lagoons and wetland areas during the dry season.',
        scientificName: 'Mycteria leucocephala',
        sinhalaName: 'චිත්‍ර හංසයා (Chithra Hansayā)',
        habitat: 'Shallow lagoons, wetlands, and marshy areas. Often in flocks, especially during breeding season.',
        photographyTips: 'Photograph at lagoon edges during golden hour. Use 400-600mm lens. Capture feeding behavior (sweeping bill motion). Flight shots with wings spread show beautiful wing patterns. Shoot reflections for added interest. Group shots during nesting season are spectacular. Use fast shutter (1/1000s+) for flight photography.'
      },
      {
        name: 'Land Monitor',
        image: yala12,
        description: 'These large, slow-moving lizards are often visible near the safari roads.',
        populationEstimate: 'Common',
        abundance: 'Frequently spotted basking on roads and rocks, especially during warm weather.',
        scientificName: 'Varanus bengalensis',
        sinhalaName: 'තලගොයා (Thalagoyā)',
        habitat: 'Open areas, grasslands, forest edges, and along roads. Often seen basking on rocks or crossing paths.',
        photographyTips: 'Easy to photograph—often stationary while basking. Use 200-400mm lens. Shoot from low angle to emphasize size. Capture tongue flicking behavior. Focus on textured scales and eye detail. Best light in early morning or late afternoon. If they\'re crossing the road, photograph from vehicle without disturbing them.'
      }
    ],
    accommodations: [
      {
        name: 'Yala Safari Lodge',
        distance: '2 km from entrance',
        price: '$150-250/night',
        rating: 4.8,
        image: yalaBackground,
        amenities: ['Luxury Tents', 'Safari Packages', 'Restaurant', 'Pool', 'WiFi'],
        description: 'Premium safari lodge with exclusive access'
      },
      {
        name: 'Yala Village Hotel',
        distance: '5 km from entrance',
        price: '$80-120/night',
        rating: 4.4,
        image: yalaBackground,
        amenities: ['AC Rooms', 'Restaurant', 'Bar', 'Garden', 'Free WiFi'],
        description: 'Comfortable mid-range hotel with great value'
      }
    ],
    tips: [
      'Book safari slots in advance, especially during peak season (February to June)',
      'Early morning (6-10 AM) and late afternoon (3-7 PM) are the best times for wildlife spotting',
      'Wear neutral colors (beige, khaki, olive) to blend with the environment',
      'Bring binoculars and a good camera with zoom lens for photography',
      'Carry sufficient water, sunscreen, and insect repellent',
      'Respect wildlife by maintaining a safe distance and following park regulations'
    ],
    parkHours: {
      openTime: '6:00 AM',
      closeTime: '6:00 PM',
      note: 'Safari sessions are typically 5-6 hours. Morning session: 6:00 AM - 12:00 PM, Afternoon session: 2:00 PM - 6:00 PM'
    },
    lawEnforcement: [
      'Remain inside your vehicle at all times unless in designated safe zones',
      'Do not feed or disturb wildlife - feeding animals is strictly prohibited',
      'Maintain a minimum distance of 25 meters from all wildlife',
      'No littering - carry all waste out of the park',
      'Speed limit is 25 km/h throughout the park',
      'No loud noises, music, or shouting - respect the natural habitat',
      'Photography is allowed but drones are strictly prohibited',
      'No walking or trekking is permitted inside the park',
      'Smoking is prohibited throughout the park premises',
      'Follow your guide\'s instructions at all times for safety'
    ],
    mapZoom: 12,
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14185.313161698377!2d81.46158493853646!3d6.463982517866302!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae5d3a62ffb9359%3A0x3bb623d70b5a3314!2sYala%20National%20Park!5e1!3m2!1sen!2slk!4v1765894171601!5m2!1sen!2slk'
  },
  'wilpattu-national-park': {
    id: 'wilpattu-national-park',
    name: 'Wilpattu National Park',
    province: 'North Western Province',
    description: "Sri Lanka's largest national park known for its natural lakes and rich biodiversity.",
    fullDescription: `Wilpattu National Park is Sri Lanka's largest and one of its oldest national parks, covering approximately 1,317 square kilometers. The name "Wilpattu" translates to "Land of Lakes," referring to the unique feature of about 50 natural lakes (villu) scattered throughout the park.

This pristine wilderness is characterized by dense forests, open grasslands, and these remarkable villu that attract wildlife throughout the year. The park provides an authentic safari experience with fewer crowds compared to other popular parks.`,
    location: 'North Western Province, Sri Lanka',
    coordinates: { lat: 8.4500, lng: 80.0333 },
    bestTimeToVisit: 'May to September (Dry Season)',
    area: '1,317 km²',
    established: '1905',
    backgroundImage: wilpattuBackground,
    images: [wilpattuBackground, wilpattuBackground, wilpattuBackground],
    animals: [
      { name: 'Sri Lankan Leopard', image: wilpattuBackground, description: 'Elusive big cats roaming the vast wilderness' },
      { name: 'Sloth Bear', image: wilpattuBackground, description: 'Commonly seen foraging for termites' },
      { name: 'Spotted Deer', image: wilpattuBackground, description: 'Large herds near water sources' },
      { name: 'Water Buffalo', image: wilpattuBackground, description: 'Wild buffalo herds in wetland areas' }
    ],
    accommodations: [
      {
        name: 'Wilpattu Safari Camp',
        distance: '2.5 km from entrance',
        price: '$120-200/night',
        rating: 4.7,
        image: wilpattuBackground,
        amenities: ['Tented Camp', 'Safari Guides', 'Meals', 'Campfire'],
        description: 'Authentic camping experience near the park'
      }
    ],
    tips: [
      'Best visited during dry season (May-September) when animals gather at water sources',
      'The park is less crowded than Yala, offering a more intimate experience',
      'Bring insect repellent - mosquitoes can be abundant near lakes'
    ],
    mapZoom: 11
  },
  'mirissa-beach': {
    id: 'mirissa-beach',
    name: 'Mirissa Beach',
    province: 'Southern Province',
    description: 'Famous for its golden sands, whale watching opportunities, and vibrant nightlife.',
    fullDescription: `Mirissa is a small town on the south coast of Sri Lanka, located in the Matara District. It's one of the country's most popular beach destinations, known for its stunning golden sands, turquoise waters, and laid-back atmosphere.

The beach is famous for being one of the best whale watching destinations in the world, with opportunities to see blue whales, sperm whales, and dolphins between November and April.`,
    location: 'Southern Province, Sri Lanka',
    coordinates: { lat: 5.9493, lng: 80.4552 },
    bestTimeToVisit: 'November to April',
    area: 'Coastal Area',
    established: 'Tourist Destination',
    backgroundImage: mirissaBackground,
    images: [mirissaBackground, mirissaBackground, mirissaBackground],
    animals: [
      { name: 'Blue Whale', image: mirissaBackground, description: 'World\'s largest mammal, seen on whale watching tours' },
      { name: 'Dolphins', image: mirissaBackground, description: 'Spinner and bottlenose dolphins in large pods' },
      { name: 'Sea Turtles', image: mirissaBackground, description: 'Multiple species nesting on nearby beaches' }
    ],
    accommodations: [
      {
        name: 'Paradise Beach Club',
        distance: 'Beachfront',
        price: '$80-150/night',
        rating: 4.6,
        image: mirissaBackground,
        amenities: ['Beach Access', 'Pool', 'Restaurant', 'Bar', 'WiFi'],
        description: 'Beachfront resort with stunning ocean views'
      }
    ],
    tips: [
      'Best whale watching season is November to April',
      'Book whale watching tours early morning (6-7 AM) for better sightings',
      'Wear reef-safe sunscreen to protect marine life'
    ],
    mapZoom: 14
  },
  'unawatuna-beach': {
    id: 'unawatuna-beach',
    name: 'Unawatuna Beach',
    province: 'Southern Province',
    description: 'A beautiful crescent-shaped bay with calm turquoise waters.',
    fullDescription: 'A beautiful crescent-shaped bay with calm turquoise waters. Ideal for snorkeling, diving, and enjoying spectacular sunsets in a tropical paradise.',
    location: 'Southern Province, Sri Lanka',
    coordinates: { lat: 5.9939, lng: 80.2397 },
    bestTimeToVisit: 'Year Round',
    area: 'Coastal Area',
    established: 'Tourist Destination',
    backgroundImage: unaBackground,
    images: [unaBackground, unaBackground, unaBackground],
    animals: [
      { name: 'Tropical Fish', image: unaBackground, description: 'Colorful reef fish for snorkeling' },
      { name: 'Sea Turtles', image: unaBackground, description: 'Sea turtles in the coral reef' }
    ],
    accommodations: [
      {
        name: 'Unawatuna Beach Resort',
        distance: 'Beachfront',
        price: '$60-100/night',
        rating: 4.5,
        image: unaBackground,
        amenities: ['Beach Access', 'Restaurant', 'WiFi'],
        description: 'Beachfront accommodation'
      }
    ],
    tips: ['Perfect for snorkeling and diving', 'Great sunset views'],
    mapZoom: 15
  },
  'horton-plains': {
    id: 'horton-plains',
    name: 'Horton Plains',
    province: 'Central Province',
    description: 'A beautiful highland plateau offering breathtaking views and unique camping experiences.',
    fullDescription: 'A beautiful highland plateau offering breathtaking views and unique camping experiences. Perfect for hiking and witnessing World\'s End viewpoint.',
    location: 'Central Province, Sri Lanka',
    coordinates: { lat: 6.8022, lng: 80.8081 },
    bestTimeToVisit: 'December to March',
    area: '31.6 km²',
    established: '1969',
    backgroundImage: hortBackground,
    images: [hortBackground, hortBackground, hortBackground],
    animals: [
      { name: 'Sambar Deer', image: hortBackground, description: 'Largest deer species in Sri Lanka' },
      { name: 'Highland Birds', image: hortBackground, description: 'Various endemic bird species' }
    ],
    accommodations: [
      {
        name: 'Horton Plains Guest House',
        distance: 'Near entrance',
        price: '$40-80/night',
        rating: 4.3,
        image: hortBackground,
        amenities: ['Basic Rooms', 'Restaurant'],
        description: 'Simple accommodation near the plains'
      }
    ],
    tips: ['Start early for World\'s End before clouds set in', 'Wear warm clothing', 'Bring water for hiking'],
    mapZoom: 13
  },
  'knuckles-mountain-range': {
    id: 'knuckles-mountain-range',
    name: 'Knuckles Mountain Range',
    province: 'Central Province',
    description: 'A UNESCO World Heritage site with diverse ecosystems.',
    fullDescription: 'A UNESCO World Heritage site with diverse ecosystems. Ideal for adventure camping, trekking, and exploring pristine mountain landscapes.',
    location: 'Central Province, Sri Lanka',
    coordinates: { lat: 7.3833, lng: 80.7667 },
    bestTimeToVisit: 'December to April',
    area: '234 km²',
    established: 'UNESCO World Heritage',
    backgroundImage: knuckBackground,
    images: [knuckBackground, knuckBackground, knuckBackground],
    animals: [
      { name: 'Endemic Birds', image: knuckBackground, description: 'Many endemic bird species' },
      { name: 'Mountain Wildlife', image: knuckBackground, description: 'Diverse mountain ecosystem' }
    ],
    accommodations: [
      {
        name: 'Knuckles Mountain Lodge',
        distance: 'Base of range',
        price: '$50-90/night',
        rating: 4.4,
        image: knuckBackground,
        amenities: ['Mountain Views', 'Guided Tours'],
        description: 'Lodge at the base of the range'
      }
    ],
    tips: ['Requires good fitness for trekking', 'Hire a local guide', 'Check weather conditions'],
    mapZoom: 12
  },
  'lunugamvehera': {
    id: 'lunugamvehera',
    name: 'Lunugamvehera',
    province: 'Southern Province',
    description: 'An important elephant corridor connecting Yala and Uda Walawe national parks.',
    fullDescription: 'An important elephant corridor connecting Yala and Uda Walawe national parks. Home to elephants, deer, and various bird species in a dry zone habitat.',
    location: 'Southern Province, Sri Lanka',
    coordinates: { lat: 6.3167, lng: 81.3167 },
    bestTimeToVisit: 'Year Round',
    area: '235 km²',
    established: '1995',
    backgroundImage: lunuBackground,
    images: [lunuBackground, lunuBackground, lunuBackground],
    animals: [
      { name: 'Asian Elephant', image: lunuBackground, description: 'Large herds crossing the corridor' },
      { name: 'Spotted Deer', image: lunuBackground, description: 'Common throughout the sanctuary' }
    ],
    accommodations: [
      {
        name: 'Lunugamvehera Lodge',
        distance: 'Near entrance',
        price: '$50-90/night',
        rating: 4.2,
        image: lunuBackground,
        amenities: ['Basic Rooms', 'Restaurant'],
        description: 'Simple accommodation near the sanctuary'
      }
    ],
    tips: ['Great for elephant watching', 'Best visited early morning'],
    mapZoom: 13
  },
  'kumana-wildlife': {
    id: 'kumana-wildlife',
    name: 'Kumana Wildlife',
    province: 'Eastern Province',
    description: 'Famous for its bird sanctuary and mangrove swamps.',
    fullDescription: 'Famous for its bird sanctuary and mangrove swamps. A paradise for birdwatchers with over 200 species including migratory birds during nesting season.',
    location: 'Eastern Province, Sri Lanka',
    coordinates: { lat: 6.5167, lng: 81.6500 },
    bestTimeToVisit: 'May to July',
    area: '357 km²',
    established: '1970',
    backgroundImage: kumanaBackground,
    images: [kumanaBackground, kumanaBackground, kumanaBackground],
    animals: [
      { name: 'Migratory Birds', image: kumanaBackground, description: 'Over 200 bird species' },
      { name: 'Water Birds', image: kumanaBackground, description: 'Various waterfowl and waders' }
    ],
    accommodations: [
      {
        name: 'Kumana Bird Lodge',
        distance: 'Near entrance',
        price: '$60-100/night',
        rating: 4.3,
        image: kumanaBackground,
        amenities: ['Bird Watching Tours', 'Basic Rooms'],
        description: 'Lodge focused on bird watching'
      }
    ],
    tips: ['Bring binoculars for bird watching', 'Visit during nesting season'],
    mapZoom: 13
  },
  'sinharaja-forest-reserve': {
    id: 'sinharaja-forest-reserve',
    name: 'Sinharaja Forest Reserve',
    province: 'Sabaragamuwa Province',
    description: 'A UNESCO World Heritage site and biodiversity hotspot.',
    fullDescription: 'A UNESCO World Heritage site and biodiversity hotspot. Home to numerous endemic species, rare birds, and lush tropical rainforest vegetation.',
    location: 'Sabaragamuwa & Southern Provinces, Sri Lanka',
    coordinates: { lat: 6.4167, lng: 80.5000 },
    bestTimeToVisit: 'December to April',
    area: '111.87 km²',
    established: '1988 (UNESCO)',
    backgroundImage: sinBackground,
    images: [sinBackground, sinBackground, sinBackground],
    animals: [
      { name: 'Endemic Birds', image: sinBackground, description: 'Many rare endemic bird species' },
      { name: 'Forest Wildlife', image: sinBackground, description: 'Diverse rainforest ecosystem' }
    ],
    accommodations: [
      {
        name: 'Sinharaja Rainforest Lodge',
        distance: 'Edge of forest',
        price: '$70-120/night',
        rating: 4.5,
        image: sinBackground,
        amenities: ['Guided Tours', 'Eco Lodge'],
        description: 'Eco-friendly lodge near the forest'
      }
    ],
    tips: ['Requires guide for entry', 'Wear appropriate footwear', 'Be prepared for rain'],
    mapZoom: 12
  },
  'knuckles-forest-reserve': {
    id: 'knuckles-forest-reserve',
    name: 'Knuckles Forest Reserve',
    province: 'Central Province',
    description: 'Part of the Knuckles Mountain Range with montane forests.',
    fullDescription: 'Part of the Knuckles Mountain Range with montane forests, waterfalls, and diverse flora and fauna. Perfect for eco-tourism and nature photography.',
    location: 'Central Province, Sri Lanka',
    coordinates: { lat: 7.3833, lng: 80.7667 },
    bestTimeToVisit: 'December to April',
    area: '234 km²',
    established: 'UNESCO World Heritage',
    backgroundImage: knuckBackground,
    images: [knuckBackground, knuckBackground, knuckBackground],
    animals: [
      { name: 'Mountain Birds', image: knuckBackground, description: 'Highland bird species' },
      { name: 'Forest Wildlife', image: knuckBackground, description: 'Diverse mountain ecosystem' }
    ],
    accommodations: [
      {
        name: 'Knuckles Mountain Lodge',
        distance: 'Base of range',
        price: '$50-90/night',
        rating: 4.4,
        image: knuckBackground,
        amenities: ['Mountain Views', 'Guided Tours'],
        description: 'Lodge at the base of the range'
      }
    ],
    tips: ['Requires good fitness for trekking', 'Hire a local guide', 'Check weather conditions'],
    mapZoom: 12
  }
};

/**
 * Map destination IDs to their names as stored in Firestore
 * Used for querying service providers by destination
 */
export const destinationNameMap = {
  'yala-national-park': 'Yala National Park',
  'wilpattu-national-park': 'Wilpattu National Park',
  'mirissa-beach': 'Mirissa Beach',
  'unawatuna-beach': 'Unawatuna Beach',
  'horton-plains': 'Horton Plains',
  'knuckles-mountain-range': 'Knuckles Mountain Range',
  'lunugamvehera': 'Lunugamvehera',
  'kumana-wildlife': 'Kumana Wildlife',
  'sinharaja-forest-reserve': 'Sinharaja Forest Reserve',
  'knuckles-forest-reserve': 'Knuckles Forest Reserve'
};

/**
 * Get destination by ID
 * @param {string} destinationId - The destination ID
 * @returns {object|null} - Destination data or null if not found
 */
export const getDestinationById = (destinationId) => {
  return destinations[destinationId] || null;
};

/**
 * Get all destinations
 * @returns {object} - All destinations
 */
export const getAllDestinations = () => {
  return destinations;
};

// Export default destinations object
export default destinations;

