/**
 * WhataHotel country coverage — the countries WhataHotel lists hotels in, mapped
 * to their region browse page. Used as a knowledge base so the advisors know
 * what's covered (and never wrongly say "not available" for a listed country),
 * and can link a traveller to the right region page.
 *
 * Source: whatahotel.com/regions/* pages. A country can appear under more than
 * one region.
 */

export interface CountryLink {
  region: string;
  country: string;
  url: string;
}

/** [displayName, urlAnchor] per region. */
const REGIONS: { region: string; base: string; countries: [string, string][] }[] = [
  {
    region: "Africa",
    base: "https://whatahotel.com/regions/3/Africa.html",
    countries: [
      ["Botswana", "Botswana"], ["Egypt", "Egypt"], ["Ethiopia", "Ethiopia"], ["Jordan", "Jordan"],
      ["Kenya", "Kenya"], ["Mauritius", "Mauritius"], ["Morocco", "Morocco"], ["Mozambique", "Mozambique"],
      ["Namibia", "Namibia"], ["Republic of the Congo", "Republic-of-the-Congo"], ["Rwanda", "Rwanda"],
      ["Seychelles", "Seychelles"], ["South Africa", "South-Africa"], ["Tanzania", "Tanzania"],
      ["Tunisia", "Tunisia"], ["Zambia", "Zambia-"], ["Zimbabwe", "Zimbabwe"],
    ],
  },
  {
    region: "Asia & The Pacific",
    base: "https://whatahotel.com/regions/4/Asia_and_The_Pacific.html",
    countries: [
      ["Armenia", "Armenia"], ["Australia", "Australia"], ["Bangladesh", "Bangladesh"], ["Bhutan", "Buthan"],
      ["Cambodia", "Cambodia"], ["China", "China"], ["Fiji Islands", "Fiji-Islands"],
      ["French Polynesia (Tahiti)", "French-Polynesia-Tahiti-"], ["Guam", "Guam"], ["India", "India"],
      ["Indonesia", "Indonesia"], ["Japan", "Japan"], ["Jordan", "Jordan"], ["Kingdom of Bhutan", "Kingdom-of-Bhutan-"],
      ["Kuwait", "Kuwait"], ["Laos", "Laos"], ["Malaysia", "Malaysia"], ["Maldives", "Maldives"],
      ["Mongolia", "Mongolia"], ["Myanmar", "Myanmar"], ["Northern Mariana Islands", "Northern-Mariana-Islands"],
      ["Philippines", "Philippines"], ["Qatar", "Qatar"], ["Russia", "Russia"], ["Saint Lucia", "Saint-Lucia"],
      ["Saudi Arabia", "Saudi-Arabia"], ["Seychelles", "Seychelles"], ["Singapore", "Singapore"],
      ["South Korea", "South-Korea"], ["Sri Lanka", "Sri-Lanka"], ["Taiwan", "Taiwan"], ["Thailand", "Thailand"],
      ["The Maldives", "The-Maldives"], ["Turkey", "Turkey"], ["United Arab Emirates", "United-Arab-Emirates"],
      ["Uzbekistan", "Uzbekistan"], ["Vietnam", "Vietnam"],
    ],
  },
  {
    region: "Australia & New Zealand",
    base: "https://whatahotel.com/regions/5/Australia-New_Zealand.html",
    countries: [
      ["Australia", "Australia"], ["Fiji Islands", "Fiji-Islands"],
      ["French Polynesia (Tahiti)", "French-Polynesia-Tahiti-"], ["New Zealand", "New-Zealand"],
    ],
  },
  {
    region: "Canada",
    base: "https://whatahotel.com/regions/16/Canada.html",
    countries: [["Canada", "Canada"]],
  },
  {
    region: "Caribbean",
    base: "https://whatahotel.com/regions/6/Caribbean.html",
    countries: [
      ["Anguilla, BWI", "Anguilla-BWI"], ["Antigua", "Antigua"], ["Aruba", "Aruba"], ["Bahamas", "Bahamas"],
      ["Barbados", "Barbados"], ["Bermuda", "Bermuda"], ["British Virgin Islands", "British-Virgin-Islands"],
      ["Curacao", "Curacao"], ["Dominica", "Dominica"], ["Dominican Republic", "Dominican-Republic"],
      ["Grand Cayman", "Grand-Cayman"], ["Grenada", "Grenada"], ["Jamaica", "Jamaica"], ["Martinique", "Martinique"],
      ["Puerto Rico", "Puerto-Rico"], ["Saint Lucia", "Saint-Lucia"], ["St. Barts", "St-Barts"],
      ["St. Kitts and Nevis", "St-Kitts-and-Nevis"], ["St. Martin", "St-Martin"],
      ["St. Vincent & Grenadines", "St-Vincent-Grenadines"], ["Turks and Caicos Islands", "Turks-and-Caicos-Islands"],
      ["US Virgin Islands", "US-Virgin-Islands"],
    ],
  },
  {
    region: "Central America",
    base: "https://whatahotel.com/regions/7/Central_America.html",
    countries: [
      ["Belize", "Belize"], ["Costa Rica", "Costa-Rica"], ["Guatemala", "Guatemala"], ["Honduras", "Honduras"],
      ["Nicaragua", "Nicaragua"], ["Panama", "Panama"],
    ],
  },
  {
    region: "Europe",
    base: "https://whatahotel.com/regions/8/Europe.html",
    countries: [
      ["Austria", "Austria"], ["Azerbaijan", "Azerbaijan"], ["Belgium", "Belgium"], ["Bulgaria", "Bulgaria"],
      ["Croatia", "Croatia"], ["Czech Republic", "Czech-Republic"], ["Denmark", "Denmark-"], ["Estonia", "Estonia"],
      ["Finland", "Finland"], ["France", "France"], ["Georgia", "Georgia"], ["Germany", "Germany"],
      ["Greece", "Greece"], ["Hungary", "Hungary"], ["Iceland", "Iceland"], ["Ireland", "Ireland"],
      ["Italy", "Italy"], ["Kazakhstan", "Kazakhstan"], ["Latvia", "Latvia"], ["Luxembourg", "Luxembourg"],
      ["Malta", "Malta"], ["Monaco", "Monaco"], ["Montenegro", "Montenegro"], ["Netherlands", "Netherlands"],
      ["Norway", "Norway"], ["Poland", "Poland"], ["Portugal", "Portugal"], ["Romania", "Romania"],
      ["Russia", "Russia"], ["Scotland", "Scotland"], ["Serbia", "Serbia"], ["Slovakia", "Slovakia"],
      ["Slovenia", "Slovenia"], ["Spain", "Spain"], ["Sweden", "Sweden"], ["Switzerland", "Switzerland"],
      ["Turkey", "Turkey"], ["Turks and Caicos Islands", "Turks-and-Caicos-Islands"], ["Ukraine", "Ukraine"],
      ["United Kingdom", "United-Kingdom"],
    ],
  },
  {
    region: "Hawaii",
    base: "https://whatahotel.com/regions/14/Hawaii.html",
    countries: [["United States", "United-States"]],
  },
  {
    region: "Mexico",
    base: "https://whatahotel.com/regions/15/Mexico.html",
    countries: [["Mexico", "Mexico"], ["Mongolia", "Mongolia"]],
  },
  {
    region: "Middle East",
    base: "https://whatahotel.com/regions/18/Middle_East.html",
    countries: [
      ["Algeria", "Algeria"], ["Azerbaijan", "Azerbaijan"], ["Bahrain", "Bahrain"], ["Cyprus", "Cyprus"],
      ["Egypt", "Egypt"], ["India", "India"], ["Israel", "Israel"], ["Jordan", "Jordan"],
      ["Kazakhstan", "Kazakhstan"], ["Kuwait", "Kuwait"], ["Lebanon", "Lebanon"], ["Morocco", "Morocco"],
      ["Nepal", "Nepal"], ["Oman", "Oman"], ["Qatar", "Qatar"], ["Saudi Arabia", "Saudi-Arabia"],
      ["Taiwan", "Taiwan"], ["Thailand", "Thailand"], ["Turkey", "Turkey"], ["United Arab Emirates", "United-Arab-Emirates"],
    ],
  },
  {
    region: "North America",
    base: "https://whatahotel.com/regions/10/North_America_.html",
    countries: [
      ["Canada", "Canada"], ["Dominican Republic", "Dominican-Republic"], ["France", "France"],
      ["Mexico", "Mexico"], ["Puerto Rico", "Puerto-Rico"], ["United States", "United-States"],
    ],
  },
  {
    region: "South America",
    base: "https://whatahotel.com/regions/13/South_America.html",
    countries: [
      ["Argentina", "Argentina"], ["Brazil", "Brazil"], ["Chile", "Chile"], ["Colombia", "Colombia"],
      ["Ecuador", "Ecuador"], ["Mexico", "Mexico"], ["Peru", "Peru"], ["Uruguay", "Uruguay"],
    ],
  },
];

export const COUNTRY_LINKS: CountryLink[] = REGIONS.flatMap((r) =>
  r.countries.map(([country, anchor]) => ({ region: r.region, country, url: `${r.base}#${anchor}` })),
);

/** Unique, sorted list of covered country display names. */
export const COVERED_COUNTRIES: string[] = [
  ...new Set(COUNTRY_LINKS.map((c) => c.country)),
].sort((a, b) => a.localeCompare(b));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Find the region link(s) for a country the traveller mentions. */
export function findCountryLinks(text: string): CountryLink[] {
  const t = norm(text);
  if (!t) return [];
  const hits = COUNTRY_LINKS.filter((c) => {
    const n = norm(c.country);
    return t.includes(n) || n.includes(t);
  });
  // De-dupe by region so a country covered in two regions returns two links max.
  const seen = new Set<string>();
  return hits.filter((c) => {
    const k = `${c.country}|${c.region}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
