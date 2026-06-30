import type { Hotel } from "./types";

/** Build a sized Unsplash URL; the UI falls back to a seeded image on error. */
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=70`;

/**
 * Canonical destination registry. Keys are what the NLU resolves to, labels are
 * what we show. `aliases` lets the parser map "the maldives", "venice italy",
 * etc. to a key. In production this is the Destination Knowledge service.
 */
export const DESTINATIONS: Record<
  string,
  { label: string; country: string; aliases: string[]; blurb: string }
> = {
  paris: {
    label: "Paris, France",
    country: "France",
    aliases: ["paris", "city of light"],
    blurb:
      "Haussmann grandeur, Michelin tables and the Seine at dusk — Paris rewards travellers who love art, romance and unhurried luxury.",
  },
  tokyo: {
    label: "Tokyo, Japan",
    country: "Japan",
    aliases: ["tokyo", "japan"],
    blurb:
      "Where centuries-old ritual meets sky-high modernity. Tokyo is for the curious — flawless service, world-class spas and quiet design.",
  },
  bali: {
    label: "Bali, Indonesia",
    country: "Indonesia",
    aliases: ["bali", "ubud", "seminyak", "indonesia"],
    blurb:
      "Jungle infinity pools, beach clubs and barefoot luxury. Bali balances spiritual calm with some of Asia's best resorts.",
  },
  maldives: {
    label: "The Maldives",
    country: "Maldives",
    aliases: ["maldives", "the maldives"],
    blurb:
      "Overwater villas, house reefs and absolute privacy. The Maldives is the benchmark for honeymoons and pure escape.",
  },
  newyork: {
    label: "New York City, USA",
    country: "United States",
    aliases: ["new york", "nyc", "manhattan", "new york city"],
    blurb:
      "The original city that never sleeps — landmark hotels, rooftop bars and the best of food, theatre and design.",
  },
  london: {
    label: "London, United Kingdom",
    country: "United Kingdom",
    aliases: ["london", "uk", "england"],
    blurb:
      "Heritage townhouses, afternoon tea and Mayfair polish. London does timeless, understated luxury better than anywhere.",
  },
  lasvegas: {
    label: "Las Vegas, USA",
    country: "United States",
    aliases: ["las vegas", "vegas"],
    blurb:
      "High-energy glamour — suites with Strip views, world-class shows, pools and dining built for a celebration.",
  },
  dubai: {
    label: "Dubai, UAE",
    country: "United Arab Emirates",
    aliases: ["dubai", "uae"],
    blurb:
      "Superlative everything — beach resorts, sky-high suites and service calibrated to the most discerning travellers.",
  },
  alps: {
    label: "Swiss Alps, Switzerland",
    country: "Switzerland",
    aliases: ["swiss alps", "alps", "switzerland", "zermatt", "st moritz"],
    blurb:
      "Ski-in chalets, alpine spas and fireside dining beneath the Matterhorn. The Alps are a mountain retreat without compromise.",
  },
};

export const HOTELS: Hotel[] = [
  // ---------------------------------------------------------------- PARIS ---
  {
    id: "ritz-paris",
    name: "The Ritz Paris",
    brand: "The Ritz",
    city: "Paris",
    destinationKey: "paris",
    country: "France",
    neighborhood: "Place Vendôme, 1st",
    shortPitch:
      "The legendary Place Vendôme palace — couture service, a Chanel spa and a Michelin-starred kitchen.",
    description:
      "An icon since 1898, The Ritz Paris pairs Belle Époque grandeur with impeccably modern service. Hemingway's bar, the Ritz Escoffier school and the only Chanel spa in the world sit within walking distance of the Louvre and the Tuileries.",
    image: img("1551882547-ff40c63fe5fa"),
    gallery: [img("1564501049412-61c2a3083791"), img("1582719478250-c89cae4dc85b")],
    rating: 9.6,
    reviewCount: 2841,
    starRating: 5,
    startingRate: 1450,
    currency: "USD",
    amenities: ["spa", "pool", "michelin", "butler", "gym", "breakfast", "connecting"],
    highlights: [
      "Chanel au Ritz spa & 17m gold-leaf pool",
      "Michelin-starred Table de l'Espadon",
      "Hemingway Bar — legendary cocktails",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary in L'Espadon" },
      { id: "p2", label: "$100 spa credit", detail: "Advisor-exclusive at Chanel au Ritz" },
      { id: "p3", label: "Guaranteed 4pm late checkout", detail: "Subject to availability" },
    ],
    vibes: ["romantic", "city"],
    goodFor: ["anniversary", "honeymoon", "celebration", "wedding", "leisure"],
    distances: [
      { label: "Louvre Museum", value: "8 min walk" },
      { label: "Eiffel Tower", value: "12 min drive" },
      { label: "CDG Airport", value: "45 min drive" },
    ],
    coordinates: { lat: 48.8682, lng: 2.3287 },
  },
  {
    id: "cheval-blanc-paris",
    name: "Cheval Blanc Paris",
    brand: "Cheval Blanc",
    city: "Paris",
    destinationKey: "paris",
    country: "France",
    neighborhood: "La Samaritaine, 1st",
    shortPitch:
      "LVMH's contemporary palace above the Seine — a Dior spa and the city's most coveted river views.",
    description:
      "Set within the restored La Samaritaine, Cheval Blanc Paris is the city's most contemporary palace. Floor-to-ceiling Seine views, the first Dior spa, and Plénitude — Arnaud Donckele's three-Michelin-star restaurant.",
    image: img("1566073771259-6a8506099945"),
    gallery: [img("1611892440504-42a792e24d32"), img("1631049307264-da0ec9d70304")],
    rating: 9.7,
    reviewCount: 1190,
    starRating: 5,
    startingRate: 1850,
    currency: "USD",
    amenities: ["spa", "pool", "michelin", "butler", "gym", "breakfast", "rooftop"],
    highlights: [
      "Dior Spa with 30m pool",
      "Plénitude — 3 Michelin stars",
      "Seine & Pont Neuf panoramas",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Room upgrade on arrival", detail: "Subject to availability" },
      { id: "p3", label: "$150 dining credit", detail: "Advisor-exclusive" },
    ],
    vibes: ["romantic", "city"],
    goodFor: ["anniversary", "honeymoon", "celebration", "leisure"],
    distances: [
      { label: "Louvre Museum", value: "6 min walk" },
      { label: "Notre-Dame", value: "10 min walk" },
      { label: "CDG Airport", value: "45 min drive" },
    ],
    coordinates: { lat: 48.8595, lng: 2.3424 },
  },
  {
    id: "le-bristol-paris",
    name: "Le Bristol Paris",
    brand: "Oetker Collection",
    city: "Paris",
    destinationKey: "paris",
    country: "France",
    neighborhood: "Rue du Faubourg Saint-Honoré, 8th",
    shortPitch:
      "Garden-wrapped grande dame on the city's best shopping street, beloved for families and a rooftop pool.",
    description:
      "A favourite of style insiders, Le Bristol surrounds a 1,200 m² French garden and crowns it with a teak rooftop pool shaped like a boat. Epicure holds three Michelin stars, and the kids' programme makes it quietly excellent for families.",
    image: img("1631049035182-249067d7618e"),
    gallery: [img("1578683010236-d716f9a3f461"), img("1582719508461-905c673771fd")],
    rating: 9.5,
    reviewCount: 2030,
    starRating: 5,
    startingRate: 1290,
    currency: "USD",
    amenities: ["spa", "pool", "michelin", "kidsclub", "gym", "breakfast", "rooftop", "connecting"],
    highlights: [
      "Rooftop pool with Sacré-Cœur views",
      "Epicure — 3 Michelin stars",
      "French garden & resident cats",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Family connecting rooms", detail: "Priority hold for advisor guests" },
      { id: "p3", label: "$100 hotel credit", detail: "Advisor-exclusive" },
    ],
    vibes: ["romantic", "city", "family"],
    goodFor: ["anniversary", "family", "celebration", "leisure"],
    distances: [
      { label: "Champs-Élysées", value: "7 min walk" },
      { label: "Eiffel Tower", value: "14 min drive" },
      { label: "CDG Airport", value: "40 min drive" },
    ],
    coordinates: { lat: 48.8721, lng: 2.3147 },
  },

  // ---------------------------------------------------------------- TOKYO ---
  {
    id: "aman-tokyo",
    name: "Aman Tokyo",
    brand: "Aman",
    city: "Tokyo",
    destinationKey: "tokyo",
    country: "Japan",
    neighborhood: "Otemachi, Chiyoda",
    shortPitch:
      "An urban sanctuary in the sky — a 2,500 m² spa and the calmest luxury in the city.",
    description:
      "Occupying the top six floors of the Otemachi Tower, Aman Tokyo is a vertical ryokan: washi-paper lanterns, soaring stone and a 30m pool framing the skyline. The 2,500 m² Aman Spa is among the finest in Asia.",
    image: img("1542051841857-5f90071e7989"),
    gallery: [img("1540959733332-eab4deabeeaf"), img("1493976040374-85c8e12f0c0e")],
    rating: 9.8,
    reviewCount: 1486,
    starRating: 5,
    startingRate: 1320,
    currency: "USD",
    amenities: ["spa", "pool", "gym", "breakfast", "butler", "michelin"],
    highlights: [
      "2,500 m² Aman Spa with onsen-style baths",
      "30m pool with skyline views",
      "Serene minimalist suites",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "90-min spa journey", detail: "Advisor-exclusive welcome ritual" },
      { id: "p3", label: "Late checkout to 2pm", detail: "Subject to availability" },
    ],
    vibes: ["wellness", "city", "romantic"],
    goodFor: ["wellness", "anniversary", "celebration", "leisure", "business"],
    distances: [
      { label: "Imperial Palace", value: "9 min walk" },
      { label: "Ginza", value: "10 min drive" },
      { label: "Haneda Airport", value: "35 min drive" },
    ],
    coordinates: { lat: 35.6876, lng: 139.7665 },
  },
  {
    id: "four-seasons-otemachi",
    name: "Four Seasons Hotel Tokyo at Otemachi",
    brand: "Four Seasons",
    city: "Tokyo",
    destinationKey: "tokyo",
    country: "Japan",
    neighborhood: "Otemachi, Chiyoda",
    shortPitch:
      "A glass tower crowned by a sky spa and infinity pool with Mt. Fuji views on clear days.",
    description:
      "Modern, light-filled and impeccably run, the Four Seasons at Otemachi puts a top-floor spa, infinity pool and the panoramic est restaurant above the city. Faultless for couples and business travellers alike.",
    image: img("1445019980597-93fa8acb246c"),
    gallery: [img("1496417263034-38ec4f0b665a"), img("1551105378-78e609e1d468")],
    rating: 9.6,
    reviewCount: 980,
    starRating: 5,
    startingRate: 990,
    currency: "USD",
    amenities: ["spa", "pool", "gym", "breakfast", "michelin", "rooftop"],
    highlights: [
      "39th-floor infinity pool & spa",
      "est — Michelin-starred dining",
      "Mt. Fuji views on clear days",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Room upgrade on arrival", detail: "Subject to availability" },
      { id: "p3", label: "$100 spa credit", detail: "Advisor-exclusive" },
    ],
    vibes: ["city", "wellness", "business", "romantic"],
    goodFor: ["business", "anniversary", "wellness", "leisure"],
    distances: [
      { label: "Tokyo Station", value: "5 min walk" },
      { label: "Ginza", value: "8 min drive" },
      { label: "Haneda Airport", value: "35 min drive" },
    ],
    coordinates: { lat: 35.6864, lng: 139.7641 },
  },

  // ----------------------------------------------------------------- BALI ---
  {
    id: "four-seasons-sayan",
    name: "Four Seasons Resort Bali at Sayan",
    brand: "Four Seasons",
    city: "Ubud",
    destinationKey: "bali",
    country: "Indonesia",
    neighborhood: "Sayan, Ubud",
    shortPitch:
      "A river-valley sanctuary of jungle villas, rice terraces and one of Bali's great spas.",
    description:
      "Reached across a teak bridge into the rainforest canopy, this Ayung River retreat is pure calm: plunge-pool villas, a riverside spa, and sound-healing among the rice paddies. Ubud's culture is minutes away.",
    image: img("1540541338287-41700207dee6"),
    gallery: [img("1582719478250-c89cae4dc85b"), img("1571003123894-1f0594d2b5d9")],
    rating: 9.7,
    reviewCount: 2210,
    starRating: 5,
    startingRate: 780,
    currency: "USD",
    amenities: ["spa", "pool", "breakfast", "gym", "kidsclub", "butler"],
    highlights: [
      "Plunge-pool jungle villas",
      "Riverside Sacred River Spa",
      "Sound-healing & yoga over the rice paddies",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "One-time villa upgrade", detail: "Advisor-exclusive, on availability" },
      { id: "p3", label: "$100 resort credit", detail: "Advisor-exclusive" },
    ],
    vibes: ["wellness", "romantic", "adventure", "family"],
    goodFor: ["honeymoon", "wellness", "anniversary", "family", "leisure"],
    distances: [
      { label: "Ubud centre", value: "15 min drive" },
      { label: "Tegallalang rice terraces", value: "25 min drive" },
      { label: "Denpasar Airport", value: "75 min drive" },
    ],
    coordinates: { lat: -8.4979, lng: 115.2533 },
  },
  {
    id: "the-mulia-bali",
    name: "The Mulia, Nusa Dua",
    brand: "Mulia",
    city: "Nusa Dua",
    destinationKey: "bali",
    country: "Indonesia",
    neighborhood: "Nusa Dua",
    shortPitch:
      "Beachfront grandeur with cascading pools, a destination spa and an iconic beach club.",
    description:
      "On a private stretch of Geger Beach, The Mulia is all scale and drama — oversized suites, six swimming pools, a 24/7 butler service and one of Asia's best Sunday brunches. A beachfront choice for those who like energy with their calm.",
    image: img("1571896349842-33c89424de2d"),
    gallery: [img("1520250497591-112f2f40a3f4"), img("1455587734955-081b22074882")],
    rating: 9.4,
    reviewCount: 4120,
    starRating: 5,
    startingRate: 540,
    currency: "USD",
    amenities: ["beachfront", "spa", "pool", "breakfast", "gym", "kidsclub", "oceanview"],
    highlights: [
      "Private Geger Beach frontage",
      "Six oceanfront pools",
      "24-hour butler service",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "$120 spa credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Welcome amenity", detail: "On arrival" },
    ],
    vibes: ["beach", "family", "wellness", "romantic"],
    goodFor: ["family", "honeymoon", "celebration", "leisure"],
    distances: [
      { label: "Geger Beach", value: "On property" },
      { label: "Uluwatu Temple", value: "35 min drive" },
      { label: "Denpasar Airport", value: "25 min drive" },
    ],
    coordinates: { lat: -8.8087, lng: 115.2293 },
  },

  // ------------------------------------------------------------- MALDIVES ---
  {
    id: "soneva-jani",
    name: "Soneva Jani",
    brand: "Soneva",
    city: "Noonu Atoll",
    destinationKey: "maldives",
    country: "Maldives",
    neighborhood: "Medhufaru, Noonu Atoll",
    shortPitch:
      "Overwater villas with retractable roofs and water slides — the Maldives at its most magical.",
    description:
      "Barefoot-luxury pioneer Soneva sets the standard: overwater villas with slides into the lagoon, retractable bedroom roofs for stargazing, an overwater observatory and dining in the trees. Pure honeymoon territory.",
    image: img("1439066615861-d1af74d74000"),
    gallery: [img("1505881502353-a1986add3762"), img("1573843981267-be1999ff37cd")],
    rating: 9.9,
    reviewCount: 860,
    starRating: 5,
    startingRate: 2200,
    currency: "USD",
    amenities: ["beachfront", "spa", "pool", "breakfast", "butler", "oceanview"],
    highlights: [
      "Overwater villas with water slides",
      "Retractable roofs for stargazing",
      "Private chef & barefoot dining",
    ],
    perks: [
      { id: "p1", label: "Full board for two", detail: "Advisor-exclusive dining inclusion" },
      { id: "p2", label: "Sunset dolphin cruise", detail: "Complimentary once per stay" },
      { id: "p3", label: "Seaplane priority", detail: "Coordinated by your advisor" },
    ],
    vibes: ["beach", "romantic", "wellness"],
    goodFor: ["honeymoon", "anniversary", "celebration", "leisure"],
    distances: [
      { label: "House reef", value: "On villa" },
      { label: "Overwater observatory", value: "5 min boat" },
      { label: "Malé (by seaplane)", value: "40 min flight" },
    ],
    coordinates: { lat: 5.6667, lng: 73.3333 },
  },
  {
    id: "waldorf-astoria-maldives",
    name: "Waldorf Astoria Maldives Ithaafushi",
    brand: "Waldorf Astoria",
    city: "South Malé Atoll",
    destinationKey: "maldives",
    country: "Maldives",
    neighborhood: "Ithaafushi, South Malé Atoll",
    shortPitch:
      "Three-island resort with 11 restaurants, an overwater spa and a private-island option.",
    description:
      "A short speedboat from Malé, this three-island resort blends reef-house villas with eleven distinct restaurants and a transcendent overwater spa. The standalone Private Island sleeps up to 24 for the ultimate celebration.",
    image: img("1582610116397-edb318620f90"),
    gallery: [img("1540202404-a2f29016b523"), img("1559599189-fe84dea4eb79")],
    rating: 9.6,
    reviewCount: 1340,
    starRating: 5,
    startingRate: 1700,
    currency: "USD",
    amenities: ["beachfront", "spa", "pool", "breakfast", "butler", "oceanview", "kidsclub"],
    highlights: [
      "11 restaurants & bars",
      "Overwater spa & cold-plunge",
      "Private-island buyout option",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "$200 resort credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Speedboat transfers", detail: "Priority scheduling" },
    ],
    vibes: ["beach", "romantic", "family", "wellness"],
    goodFor: ["honeymoon", "family", "celebration", "leisure"],
    distances: [
      { label: "House reef", value: "On property" },
      { label: "Malé (by speedboat)", value: "30 min" },
      { label: "Velana Airport", value: "30 min boat" },
    ],
    coordinates: { lat: 4.0333, lng: 73.4667 },
  },

  // -------------------------------------------------------------- NEW YORK ---
  {
    id: "the-mark-nyc",
    name: "The Mark",
    brand: "The Mark",
    city: "New York",
    destinationKey: "newyork",
    country: "United States",
    neighborhood: "Upper East Side",
    shortPitch:
      "Jacques Grange design steps from Central Park, with a Jean-Georges restaurant and Frédéric Fekkai salon.",
    description:
      "The Upper East Side's most fashionable address, The Mark fuses bold Jacques Grange interiors with white-glove service. A Jean-Georges restaurant, a rooftop suite with terrace, and Central Park a block away.",
    image: img("1551105378-78e609e1d468"),
    gallery: [img("1631049307264-da0ec9d70304"), img("1611892440504-42a792e24d32")],
    rating: 9.4,
    reviewCount: 1520,
    starRating: 5,
    startingRate: 1100,
    currency: "USD",
    amenities: ["breakfast", "gym", "butler", "michelin", "connecting"],
    highlights: [
      "Jean-Georges at The Mark",
      "Block from Central Park & The Met",
      "Iconic Jacques Grange interiors",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "$100 dining credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Late checkout to 2pm", detail: "Subject to availability" },
    ],
    vibes: ["city", "romantic", "family"],
    goodFor: ["anniversary", "business", "family", "celebration", "leisure"],
    distances: [
      { label: "Central Park", value: "1 min walk" },
      { label: "The Met", value: "5 min walk" },
      { label: "JFK Airport", value: "45 min drive" },
    ],
    coordinates: { lat: 40.7758, lng: -73.9636 },
  },
  {
    id: "aman-new-york",
    name: "Aman New York",
    brand: "Aman",
    city: "New York",
    destinationKey: "newyork",
    country: "United States",
    neighborhood: "Crown Building, Fifth Avenue",
    shortPitch:
      "A serene three-floor spa house above Fifth Avenue — the calmest address in Manhattan.",
    description:
      "Inside the landmark Crown Building, Aman New York brings its signature stillness to Midtown: a 2,300 m² three-floor spa, a garden terrace, and suites with working fireplaces overlooking Central Park.",
    image: img("1496417263034-38ec4f0b665a"),
    gallery: [img("1445019980597-93fa8acb246c"), img("1564501049412-61c2a3083791")],
    rating: 9.5,
    reviewCount: 410,
    starRating: 5,
    startingRate: 2400,
    currency: "USD",
    amenities: ["spa", "pool", "gym", "breakfast", "butler", "fireplace", "rooftop"],
    highlights: [
      "Three-floor, 2,300 m² spa",
      "Fireplaces in every room",
      "Garden terrace & jazz club",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Spa welcome ritual", detail: "Advisor-exclusive" },
      { id: "p3", label: "Room upgrade on arrival", detail: "Subject to availability" },
    ],
    vibes: ["city", "wellness", "romantic"],
    goodFor: ["anniversary", "wellness", "celebration", "business", "leisure"],
    distances: [
      { label: "Central Park", value: "4 min walk" },
      { label: "MoMA", value: "6 min walk" },
      { label: "JFK Airport", value: "50 min drive" },
    ],
    coordinates: { lat: 40.7626, lng: -73.9741 },
  },

  // ---------------------------------------------------------------- LONDON ---
  {
    id: "claridges-london",
    name: "Claridge's",
    brand: "Maybourne",
    city: "London",
    destinationKey: "london",
    country: "United Kingdom",
    neighborhood: "Mayfair",
    shortPitch:
      "The art deco heart of Mayfair — legendary afternoon tea and timeless service.",
    description:
      "Royalty's favourite since the 1850s, Claridge's is the definition of London glamour: shimmering art deco, the famous foyer for afternoon tea, and a spa hidden beneath Brook Street.",
    image: img("1578683010236-d716f9a3f461"),
    gallery: [img("1455587734955-081b22074882"), img("1551882547-ff40c63fe5fa")],
    rating: 9.5,
    reviewCount: 2640,
    starRating: 5,
    startingRate: 980,
    currency: "USD",
    amenities: ["spa", "gym", "breakfast", "butler", "michelin", "connecting"],
    highlights: [
      "Iconic art deco afternoon tea",
      "Spa with couples' suites",
      "Heart of Mayfair shopping",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Afternoon tea for two", detail: "Advisor-exclusive once per stay" },
      { id: "p3", label: "Room upgrade on arrival", detail: "Subject to availability" },
    ],
    vibes: ["city", "romantic", "family"],
    goodFor: ["anniversary", "celebration", "family", "business", "leisure"],
    distances: [
      { label: "Bond Street", value: "5 min walk" },
      { label: "Hyde Park", value: "12 min walk" },
      { label: "Heathrow Airport", value: "55 min drive" },
    ],
    coordinates: { lat: 51.5125, lng: -0.1476 },
  },
  {
    id: "the-savoy-london",
    name: "The Savoy",
    brand: "Fairmont",
    city: "London",
    destinationKey: "london",
    country: "United Kingdom",
    neighborhood: "The Strand, Covent Garden",
    shortPitch:
      "Thames-side icon with the famous American Bar and river-view suites by the West End.",
    description:
      "A theatreland legend on the Strand, The Savoy blends Edwardian and art deco wings, the world-famous American Bar, and suites overlooking the Thames — minutes from Covent Garden and the West End.",
    image: img("1631049035182-249067d7618e"),
    gallery: [img("1582719508461-905c673771fd"), img("1520250497591-112f2f40a3f4")],
    rating: 9.3,
    reviewCount: 3180,
    starRating: 5,
    startingRate: 820,
    currency: "USD",
    amenities: ["spa", "pool", "gym", "breakfast", "michelin", "connecting"],
    highlights: [
      "The American Bar — world's best",
      "Thames-view suites",
      "Steps from the West End",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "$100 hotel credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Late checkout", detail: "Subject to availability" },
    ],
    vibes: ["city", "romantic", "family"],
    goodFor: ["anniversary", "family", "business", "celebration", "leisure"],
    distances: [
      { label: "Covent Garden", value: "6 min walk" },
      { label: "West End theatres", value: "5 min walk" },
      { label: "Heathrow Airport", value: "55 min drive" },
    ],
    coordinates: { lat: 51.5101, lng: -0.1206 },
  },

  // ------------------------------------------------------------- LAS VEGAS ---
  {
    id: "wynn-las-vegas",
    name: "Wynn Las Vegas",
    brand: "Wynn",
    city: "Las Vegas",
    destinationKey: "lasvegas",
    country: "United States",
    neighborhood: "The Strip",
    shortPitch:
      "Five-star Strip glamour — a Forbes spa, golf course and the city's best pool scene.",
    description:
      "Steve Wynn's flagship sets the bar on the Strip: lush, light-filled interiors, a Forbes Five-Star spa, an 18-hole golf course out back, and a roster of restaurants and nightlife built for a celebration.",
    image: img("1605346576608-92f1346b67d6"),
    gallery: [img("1542314831-068cd1dbfeeb"), img("1571896349842-33c89424de2d")],
    rating: 9.2,
    reviewCount: 5210,
    starRating: 5,
    startingRate: 420,
    currency: "USD",
    amenities: ["spa", "pool", "casino", "gym", "michelin", "rooftop", "connecting"],
    highlights: [
      "Forbes Five-Star spa",
      "Encore Beach Club pools",
      "On-site golf & casino",
    ],
    perks: [
      { id: "p1", label: "Resort fee waived", detail: "Advisor-exclusive value" },
      { id: "p2", label: "$100 dining credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Room upgrade on arrival", detail: "Subject to availability" },
    ],
    vibes: ["city", "beach", "adventure"],
    goodFor: ["celebration", "birthday", "business", "leisure"],
    distances: [
      { label: "Las Vegas Strip", value: "On property" },
      { label: "Fashion Show Mall", value: "5 min walk" },
      { label: "Harry Reid Airport", value: "15 min drive" },
    ],
    coordinates: { lat: 36.1264, lng: -115.1657 },
  },

  // ----------------------------------------------------------------- DUBAI ---
  {
    id: "burj-al-arab",
    name: "Burj Al Arab Jumeirah",
    brand: "Jumeirah",
    city: "Dubai",
    destinationKey: "dubai",
    country: "United Arab Emirates",
    neighborhood: "Jumeirah Beach",
    shortPitch:
      "The sail-shaped icon — all-suite, butler-served, with a private beach and helipad.",
    description:
      "The world's most photographed hotel is all-suite and all-spectacle: a private beach, a Talise spa, nine restaurants, and a personal butler for every duplex suite. Pure Dubai theatre.",
    image: img("1512453979798-5ea266f8880c"),
    gallery: [img("1582719478250-c89cae4dc85b"), img("1518684079-3c830dcef090")],
    rating: 9.4,
    reviewCount: 6120,
    starRating: 5,
    startingRate: 1600,
    currency: "USD",
    amenities: ["beachfront", "spa", "pool", "butler", "michelin", "oceanview", "kidsclub"],
    highlights: [
      "All-suite with personal butlers",
      "Private beach & Wild Wadi access",
      "Talise spa & sky restaurants",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Airport transfer", detail: "Advisor-exclusive arrival" },
      { id: "p3", label: "$150 hotel credit", detail: "Advisor-exclusive" },
    ],
    vibes: ["beach", "city", "family", "romantic"],
    goodFor: ["celebration", "honeymoon", "family", "business", "leisure"],
    distances: [
      { label: "Jumeirah Beach", value: "On property" },
      { label: "Mall of the Emirates", value: "15 min drive" },
      { label: "DXB Airport", value: "30 min drive" },
    ],
    coordinates: { lat: 25.1413, lng: 55.1853 },
  },
  {
    id: "atlantis-the-royal",
    name: "Atlantis The Royal",
    brand: "Atlantis",
    city: "Dubai",
    destinationKey: "dubai",
    country: "United Arab Emirates",
    neighborhood: "Palm Jumeirah",
    shortPitch:
      "Architectural showpiece on the Palm — sky pools, celebrity chefs and a water park next door.",
    description:
      "Dubai's boldest opening in years: a stacked-block skyline of sky pools and infinity edges, a roster of celebrity-chef restaurants, and Aquaventure water park on the doorstep. Built for families and big celebrations.",
    image: img("1518684079-3c830dcef090"),
    gallery: [img("1512453979798-5ea266f8880c"), img("1540202404-a2f29016b523")],
    rating: 9.3,
    reviewCount: 2890,
    starRating: 5,
    startingRate: 1050,
    currency: "USD",
    amenities: ["beachfront", "spa", "pool", "kidsclub", "gym", "michelin", "oceanview", "connecting"],
    highlights: [
      "Sky pool with skyline views",
      "Celebrity-chef restaurant collection",
      "Aquaventure water park access",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "Water park passes", detail: "Advisor-exclusive for the family" },
      { id: "p3", label: "Room upgrade on arrival", detail: "Subject to availability" },
    ],
    vibes: ["beach", "family", "city"],
    goodFor: ["family", "celebration", "birthday", "leisure"],
    distances: [
      { label: "Palm Jumeirah beach", value: "On property" },
      { label: "Aquaventure water park", value: "Adjacent" },
      { label: "DXB Airport", value: "35 min drive" },
    ],
    coordinates: { lat: 25.1318, lng: 55.1175 },
  },

  // ------------------------------------------------------------------ ALPS ---
  {
    id: "the-chedi-andermatt",
    name: "The Chedi Andermatt",
    brand: "GHM",
    city: "Andermatt",
    destinationKey: "alps",
    country: "Switzerland",
    neighborhood: "Andermatt",
    shortPitch:
      "Alpine-Asian design with a 35m indoor pool, ski-in access and a celebrated cheese cellar.",
    description:
      "A serene fusion of Alpine chalet and Asian minimalism, The Chedi Andermatt pairs fireplaces and floor-to-ceiling glass with a spectacular spa, a 35m indoor pool and ski-in/ski-out access to the Gemsstock.",
    image: img("1551524559-8af4e6624178"),
    gallery: [img("1517320964276-a002fa203177"), img("1488747279002-c8523379faaa")],
    rating: 9.6,
    reviewCount: 740,
    starRating: 5,
    startingRate: 920,
    currency: "USD",
    amenities: ["spa", "pool", "ski", "fireplace", "gym", "breakfast", "michelin"],
    highlights: [
      "Ski-in / ski-out to Gemsstock",
      "35m indoor & outdoor pools",
      "The Japanese Restaurant & cheese cellar",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "$120 spa credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Ski valet & storage", detail: "Complimentary" },
    ],
    vibes: ["mountain", "wellness", "romantic", "adventure"],
    goodFor: ["anniversary", "wellness", "celebration", "leisure", "family"],
    distances: [
      { label: "Gemsstock lift", value: "5 min" },
      { label: "Andermatt village", value: "2 min walk" },
      { label: "Zurich Airport", value: "90 min drive" },
    ],
    coordinates: { lat: 46.6339, lng: 8.5944 },
  },
  {
    id: "the-cervo-zermatt",
    name: "CERVO Mountain Resort",
    brand: "CERVO",
    city: "Zermatt",
    destinationKey: "alps",
    country: "Switzerland",
    neighborhood: "Zermatt",
    shortPitch:
      "Design-led chalets beneath the Matterhorn with an Overard spa and superb mountain dining.",
    description:
      "A cluster of contemporary chalets above car-free Zermatt, CERVO frames the Matterhorn from its terraces. The Mountain Ashram Spa, lively après-ski and three distinct restaurants make it a stylish alpine retreat.",
    image: img("1517320964276-a002fa203177"),
    gallery: [img("1551524559-8af4e6624178"), img("1486078695445-0497c2f58cfe")],
    rating: 9.4,
    reviewCount: 620,
    starRating: 5,
    startingRate: 700,
    currency: "USD",
    amenities: ["spa", "ski", "fireplace", "gym", "breakfast", "pool"],
    highlights: [
      "Matterhorn views from the terrace",
      "Mountain Ashram Spa",
      "Ski-in access & lively après",
    ],
    perks: [
      { id: "p1", label: "Daily breakfast for two", detail: "Complimentary" },
      { id: "p2", label: "$100 spa credit", detail: "Advisor-exclusive" },
      { id: "p3", label: "Late checkout", detail: "Subject to availability" },
    ],
    vibes: ["mountain", "romantic", "wellness", "adventure"],
    goodFor: ["anniversary", "celebration", "wellness", "leisure"],
    distances: [
      { label: "Sunnegga funicular", value: "3 min walk" },
      { label: "Zermatt centre", value: "8 min walk" },
      { label: "Zurich Airport", value: "3.5 hr drive" },
    ],
    coordinates: { lat: 46.0207, lng: 7.7491 },
  },
];

/** Resolve a free-text destination to a canonical key, or null. */
export function resolveDestination(text: string): string | null {
  const t = text.toLowerCase();
  for (const [key, meta] of Object.entries(DESTINATIONS)) {
    if (meta.aliases.some((alias) => t.includes(alias))) return key;
  }
  return null;
}
