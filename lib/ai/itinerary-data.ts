/**
 * Curated points-of-interest knowledge base per destination, used by the AI
 * Travel Assistant to build itineraries. Deliberately compact + real. This is
 * the swap point for a live POI/Places API later — the generator only depends on
 * the `CityPois` shape.
 */

export interface Poi {
  name: string;
  note?: string;
  cuisine?: string; // for dining
}

export interface CityPois {
  transport: string;
  attractions: Poi[];
  dining: Poi[];
  cafes: Poi[];
  bars: Poi[];
  shopping: Poi[];
  museums: Poi[];
  parks: Poi[];
  entertainment: Poi[];
}

export const CITY_POIS: Record<string, CityPois> = {
  paris: {
    transport: "The Métro is fastest; central sights are walkable, taxis/Uber for evenings.",
    attractions: [
      { name: "Eiffel Tower" },
      { name: "Louvre Museum" },
      { name: "Notre-Dame & Île de la Cité" },
      { name: "Sacré-Cœur, Montmartre" },
      { name: "Arc de Triomphe & Champs-Élysées" },
    ],
    dining: [
      { name: "Le Jules Verne", cuisine: "french" },
      { name: "Septime", cuisine: "modern" },
      { name: "Breizh Café", cuisine: "casual" },
      { name: "Le Comptoir du Relais", cuisine: "bistro" },
    ],
    cafes: [{ name: "Café de Flore" }, { name: "Angelina" }],
    bars: [{ name: "Bar Hemingway at The Ritz" }, { name: "Little Red Door" }],
    shopping: [{ name: "Galeries Lafayette" }, { name: "Le Marais boutiques" }],
    museums: [{ name: "Musée d'Orsay" }, { name: "Musée Rodin" }],
    parks: [{ name: "Jardin du Luxembourg" }, { name: "Tuileries Garden" }],
    entertainment: [{ name: "Opéra Garnier" }, { name: "Seine dinner cruise" }],
  },
  london: {
    transport: "The Tube covers everything; black cabs/Uber for late nights.",
    attractions: [
      { name: "Tower of London" },
      { name: "Westminster & Big Ben" },
      { name: "The London Eye" },
      { name: "Buckingham Palace" },
      { name: "St Paul's Cathedral" },
    ],
    dining: [
      { name: "Dishoom", cuisine: "indian" },
      { name: "The Ledbury", cuisine: "modern" },
      { name: "Padella", cuisine: "italian" },
      { name: "Gymkhana", cuisine: "indian" },
    ],
    cafes: [{ name: "Monmouth Coffee" }, { name: "Fortnum & Mason tea" }],
    bars: [{ name: "The American Bar at The Savoy" }, { name: "Nightjar" }],
    shopping: [{ name: "Harrods" }, { name: "Covent Garden" }],
    museums: [{ name: "British Museum" }, { name: "Tate Modern" }],
    parks: [{ name: "Hyde Park" }, { name: "Regent's Park" }],
    entertainment: [{ name: "West End theatre" }, { name: "Shakespeare's Globe" }],
  },
  newyork: {
    transport: "The subway is 24/7 and quickest; walk Manhattan, yellow cabs anytime.",
    attractions: [
      { name: "Statue of Liberty & Ellis Island" },
      { name: "Times Square" },
      { name: "Empire State Building" },
      { name: "Brooklyn Bridge" },
      { name: "The High Line" },
    ],
    dining: [
      { name: "Katz's Delicatessen", cuisine: "american" },
      { name: "Le Bernardin", cuisine: "seafood" },
      { name: "Lucali", cuisine: "italian" },
      { name: "Xi'an Famous Foods", cuisine: "chinese" },
    ],
    cafes: [{ name: "Blue Bottle Coffee" }, { name: "Ralph's Coffee" }],
    bars: [{ name: "The Dead Rabbit" }, { name: "Please Don't Tell" }],
    shopping: [{ name: "Fifth Avenue" }, { name: "SoHo boutiques" }],
    museums: [{ name: "The Met" }, { name: "MoMA" }],
    parks: [{ name: "Central Park" }, { name: "Bryant Park" }],
    entertainment: [{ name: "A Broadway show" }, { name: "Jazz at the Village Vanguard" }],
  },
  tokyo: {
    transport: "The JR + Metro network is superb; get a Suica card, taxis for late nights.",
    attractions: [
      { name: "Senso-ji Temple, Asakusa" },
      { name: "Shibuya Crossing" },
      { name: "Meiji Shrine" },
      { name: "Tokyo Skytree" },
      { name: "teamLab digital art" },
    ],
    dining: [
      { name: "Sukiyabashi Jiro", cuisine: "sushi" },
      { name: "Afuri", cuisine: "ramen" },
      { name: "Ginza Kojyu", cuisine: "kaiseki" },
      { name: "Tonkatsu Maisen", cuisine: "japanese" },
    ],
    cafes: [{ name: "Blue Bottle Kiyosumi" }, { name: "% Arabica" }],
    bars: [{ name: "Bar High Five, Ginza" }, { name: "New York Bar, Park Hyatt" }],
    shopping: [{ name: "Ginza" }, { name: "Omotesando" }],
    museums: [{ name: "teamLab Planets" }, { name: "Mori Art Museum" }],
    parks: [{ name: "Shinjuku Gyoen" }, { name: "Ueno Park" }],
    entertainment: [{ name: "Sumo at Ryōgoku" }, { name: "Robot/kabuki show" }],
  },
  dubai: {
    transport: "Taxis and the Metro are cheap and easy; most resorts offer shuttles.",
    attractions: [
      { name: "Burj Khalifa" },
      { name: "The Dubai Mall & Fountain" },
      { name: "Palm Jumeirah" },
      { name: "Old Dubai & the souks" },
      { name: "Desert safari" },
    ],
    dining: [
      { name: "Ossiano", cuisine: "seafood" },
      { name: "Al Ustad Special Kebab", cuisine: "persian" },
      { name: "Zuma", cuisine: "japanese" },
      { name: "Pierchic", cuisine: "seafood" },
    ],
    cafes: [{ name: "Arabian Tea House" }, { name: "% Arabica, DIFC" }],
    bars: [{ name: "At.mosphere, Burj Khalifa" }, { name: "Zero Gravity" }],
    shopping: [{ name: "The Dubai Mall" }, { name: "Gold & Spice Souks" }],
    museums: [{ name: "Museum of the Future" }, { name: "Etihad Museum" }],
    parks: [{ name: "Dubai Miracle Garden" }, { name: "Al Barari" }],
    entertainment: [{ name: "Dubai Marina cruise" }, { name: "La Perle show" }],
  },
  bali: {
    transport: "Hire a private driver for the day; scooters/Grab for short hops.",
    attractions: [
      { name: "Uluwatu Temple & Kecak dance" },
      { name: "Tegallalang Rice Terraces" },
      { name: "Sacred Monkey Forest, Ubud" },
      { name: "Tanah Lot Temple" },
      { name: "Mount Batur sunrise trek" },
    ],
    dining: [
      { name: "Locavore, Ubud", cuisine: "modern" },
      { name: "Warung Babi Guling Ibu Oka", cuisine: "balinese" },
      { name: "La Brisa, Canggu", cuisine: "mediterranean" },
      { name: "Merah Putih", cuisine: "indonesian" },
    ],
    cafes: [{ name: "Revolver Espresso, Seminyak" }, { name: "Crate Café, Canggu" }],
    bars: [{ name: "Rock Bar, Ayana" }, { name: "Potato Head Beach Club" }],
    shopping: [{ name: "Seminyak boutiques" }, { name: "Ubud Art Market" }],
    museums: [{ name: "ARMA Museum, Ubud" }, { name: "Blanco Renaissance Museum" }],
    parks: [{ name: "Bali Botanic Garden" }, { name: "Campuhan Ridge Walk" }],
    entertainment: [{ name: "Beach club day, Canggu" }, { name: "Balinese spa ritual" }],
  },
  maldives: {
    transport: "Resorts are private islands — speedboat or seaplane transfers arranged for you.",
    attractions: [
      { name: "House-reef snorkelling" },
      { name: "Sandbank picnic" },
      { name: "Sunset dolphin cruise" },
      { name: "Manta & whale-shark safari" },
      { name: "Male city & Grand Friday Mosque" },
    ],
    dining: [
      { name: "Underwater restaurant", cuisine: "seafood" },
      { name: "Beach BBQ dinner", cuisine: "grill" },
      { name: "Overwater teppanyaki", cuisine: "japanese" },
      { name: "Private sandbank dining", cuisine: "fine" },
    ],
    cafes: [{ name: "Resort espresso bar" }, { name: "Poolside juice bar" }],
    bars: [{ name: "Overwater sunset bar" }, { name: "Wine cellar tasting" }],
    shopping: [{ name: "Resort boutique" }, { name: "Male local market" }],
    museums: [{ name: "National Museum, Male" }, { name: "Marine biology centre" }],
    parks: [{ name: "Island nature trail" }, { name: "Coral regeneration tour" }],
    entertainment: [{ name: "Sunset cruise" }, { name: "Overwater spa" }],
  },
  maui: {
    transport: "Rent a car — it's essential for the Road to Hana and beaches.",
    attractions: [
      { name: "Road to Hana" },
      { name: "Haleakalā sunrise" },
      { name: "Molokini snorkel tour" },
      { name: "Ka'anapali Beach" },
      { name: "Iao Valley State Park" },
    ],
    dining: [
      { name: "Mama's Fish House", cuisine: "seafood" },
      { name: "Lahaina Grill", cuisine: "american" },
      { name: "Star Noodle", cuisine: "asian" },
      { name: "Monkeypod Kitchen", cuisine: "hawaiian" },
    ],
    cafes: [{ name: "Maui Coffee Roasters" }, { name: "Belle Surf Café" }],
    bars: [{ name: "Fleetwood's on Front St" }, { name: "Four Seasons Missionary Bar" }],
    shopping: [{ name: "Front Street, Lahaina" }, { name: "The Shops at Wailea" }],
    museums: [{ name: "Whalers Village Museum" }, { name: "Bailey House Museum" }],
    parks: [{ name: "Wai'anapanapa State Park" }, { name: "Kepaniwai Park" }],
    entertainment: [{ name: "Old Lahaina Lū'au" }, { name: "Sunset catamaran sail" }],
  },
};
