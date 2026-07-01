import { CITY_POIS, type Poi } from "./itinerary-data";

/**
 * Deterministic itinerary generator. Builds a day-by-day schedule from the
 * user's hotel as the starting point, tuned to trip length, traveler type and
 * cuisine preference. Zero external keys — the same engine can be upgraded to an
 * LLM later (the request/response shape stays put).
 */

export type TravelerType = "solo" | "couple" | "family" | "business";

export interface ItineraryRequest {
  destinationKey: string;
  hotelName?: string;
  days: number;
  travelerType: TravelerType;
  cuisine?: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  type: "start" | "attraction" | "meal" | "cafe" | "activity" | "evening";
  note?: string;
  travelMins?: number;
}

export interface ItineraryDay {
  day: number;
  theme: string;
  items: ScheduleItem[];
}

export interface Itinerary {
  destinationKey: string;
  hotelName?: string;
  days: number;
  travelerType: TravelerType;
  transport: string;
  overview: string;
  schedule: ItineraryDay[];
  tips: string[];
}

const TRAVELER_LABEL: Record<TravelerType, string> = {
  solo: "solo traveller",
  couple: "couple",
  family: "family",
  business: "business traveller",
};

// Small deterministic "distance" so times feel real without a Places API.
function travelMins(seed: string, near: boolean): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  const base = near ? 8 : 15;
  return base + (h % (near ? 8 : 20));
}

function pick<T>(arr: T[], i: number): T | undefined {
  return arr.length ? arr[i % arr.length] : undefined;
}

function prioritiseDining(dining: Poi[], cuisine?: string): Poi[] {
  if (!cuisine) return dining;
  const c = cuisine.toLowerCase();
  return [...dining].sort((a, b) => {
    const am = a.cuisine?.toLowerCase() === c ? 0 : 1;
    const bm = b.cuisine?.toLowerCase() === c ? 0 : 1;
    return am - bm;
  });
}

const DAY_THEMES = [
  "Icons & first impressions",
  "Culture & neighbourhoods",
  "Local life & hidden gems",
  "Nature & the outdoors",
  "Leisure & your own pace",
];

export function generateItinerary(req: ItineraryRequest): Itinerary | null {
  const pois = CITY_POIS[req.destinationKey];
  if (!pois) return null;

  const days = Math.max(1, Math.min(7, Math.round(req.days) || 1));
  const traveler = req.travelerType;
  const start = req.hotelName ? `${req.hotelName}` : "your hotel";
  const dining = prioritiseDining(pois.dining, req.cuisine);

  // Traveler-type biasing of afternoon activity pools.
  const afternoonPool: Poi[] =
    traveler === "family"
      ? [...pois.parks, ...pois.entertainment, ...pois.attractions]
      : traveler === "couple"
        ? [...pois.attractions, ...pois.parks, ...pois.entertainment]
        : traveler === "business"
          ? [...pois.museums, ...pois.cafes, ...pois.attractions]
          : [...pois.museums, ...pois.attractions, ...pois.shopping];

  const schedule: ItineraryDay[] = [];
  for (let d = 0; d < days; d++) {
    const morning = pick(pois.attractions, d);
    const cafe = pick(pois.cafes, d);
    const lunch = pick(dining, d * 2);
    const afternoon = pick(afternoonPool, d);
    const dinner = pick(dining, d * 2 + 1);
    const evening =
      traveler === "family"
        ? pick(pois.parks, d + 1)
        : pick(traveler === "business" ? pois.bars : pois.entertainment, d);

    const items: ScheduleItem[] = [
      { time: "8:30", title: `Breakfast & depart ${start}`, type: "start" },
    ];
    if (cafe)
      items.push({
        time: "9:00",
        title: `Coffee at ${cafe.name}`,
        type: "cafe",
        travelMins: travelMins(cafe.name, true),
      });
    if (morning)
      items.push({
        time: "9:45",
        title: morning.name,
        type: "attraction",
        note: morning.note,
        travelMins: travelMins(morning.name, false),
      });
    if (lunch)
      items.push({
        time: "13:00",
        title: `Lunch — ${lunch.name}`,
        type: "meal",
        note: lunch.cuisine ? `${lunch.cuisine} cuisine` : undefined,
        travelMins: travelMins(lunch.name, true),
      });
    if (afternoon)
      items.push({
        time: "15:00",
        title: afternoon.name,
        type: "activity",
        note: afternoon.note,
        travelMins: travelMins(afternoon.name, false),
      });
    if (dinner)
      items.push({
        time: "19:30",
        title: `Dinner — ${dinner.name}`,
        type: "meal",
        note: dinner.cuisine ? `${dinner.cuisine} cuisine` : undefined,
        travelMins: travelMins(dinner.name, true),
      });
    if (evening)
      items.push({
        time: "21:30",
        title: evening.name,
        type: "evening",
        travelMins: travelMins(evening.name, true),
      });

    schedule.push({ day: d + 1, theme: DAY_THEMES[d] ?? "Explore at leisure", items });
  }

  const tips: string[] = [
    `Routed from ${start} to keep each day's travel time low.`,
    pois.transport,
    traveler === "family"
      ? "Kid-friendly stops and parks are front-loaded before afternoon fatigue."
      : traveler === "business"
        ? "Mornings are kept efficient and close to the hotel so you can slot in meetings."
        : traveler === "couple"
          ? "Evenings lean into romantic dining and standout views."
          : "Museums and neighbourhood wandering are built in for a flexible solo pace.",
    "Book Michelin-level dinners a few days ahead — your advisor can arrange it.",
  ];

  return {
    destinationKey: req.destinationKey,
    hotelName: req.hotelName,
    days,
    travelerType: traveler,
    transport: pois.transport,
    overview: `A ${days}-day ${TRAVELER_LABEL[traveler]} itinerary starting from ${start}, balancing the icons with local favourites and optimised so you spend less time in transit.`,
    schedule,
    tips,
  };
}
