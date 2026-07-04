/**
 * Extract durable traveller preferences from a message — the things worth
 * remembering across conversations so no chatbot re-asks them. Deterministic and
 * cheap (runs on every user message, client-side). Returns short canonical notes.
 *
 * Negation-aware: "no kids", "without a pool", "not a honeymoon" won't be added.
 */
export function extractPreferences(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  const out: string[] = [];
  const add = (s: string) => {
    if (!out.includes(s)) out.push(s);
  };

  // Matches `re`, but NOT when the match is immediately preceded by a negation
  // ("no kids", "without a pool", "don't want a spa").
  const pos = (re: RegExp): boolean => {
    const m = t.match(re);
    if (!m || m.index == null) return false;
    const before = t.slice(Math.max(0, m.index - 16), m.index);
    return !/\b(no|not|without|never|dont|don't|do n't|isn't|aren't|won't|avoid|hate|except)\s+(a |an |the |any )?\w*\s*$/.test(
      before,
    );
  };

  // Occasion
  if (pos(/honeymoon/)) add("On their honeymoon");
  if (pos(/anniversary/)) add("Celebrating an anniversary");
  if (pos(/\bwedding\b/)) add("Planning around a wedding");
  if (pos(/birthday/)) add("Celebrating a birthday");

  // Party
  if (pos(/\bkids?\b|children|toddler|infant|\bbaby\b/) || pos(/\bfamily\b/)) add("Travelling with children");
  if (pos(/business|work trip|conference|\bmeeting\b/)) add("Business trip");
  if (pos(/\bsolo\b|by myself|travelling alone|traveling alone/)) add("Travelling solo");
  if (pos(/\bcouple\b|my (wife|husband|partner|girlfriend|boyfriend|fianc)/)) add("Travelling as a couple");

  // Budget / tier
  if (pos(/budget|cheap|affordable|save money|inexpensive|good value/)) add("Budget-conscious / values value");
  if (pos(/luxury|five[-\s]?star|5[-\s]?star|splurge|best available|top[-\s]?tier|no expense/))
    add("Wants a top-tier luxury stay");

  // Interests / amenities
  if (pos(/\bpool\b/)) add("Wants a pool");
  if (pos(/\bspa\b|massage|wellness/)) add("Interested in the spa");
  if (pos(/beach|ocean|sea ?view|oceanfront|seafront/)) add("Wants beach / ocean");
  if (pos(/\bgym\b|fitness/)) add("Wants a gym");
  if (pos(/quiet|high floor/)) add("Prefers a quiet / high room");
  if (pos(/romantic/)) add("Wants a romantic feel");

  // Dietary
  if (pos(/\bvegan\b/)) add("Dietary: vegan");
  else if (pos(/vegetarian/)) add("Dietary: vegetarian");
  if (pos(/gluten[-\s]?free|celiac|coeliac/)) add("Dietary: gluten-free");
  if (pos(/\bhalal\b/)) add("Dietary: halal");
  if (pos(/\bkosher\b/)) add("Dietary: kosher");

  // Constraints
  if (pos(/\bpet\b|\bdog\b|\bcat\b/)) add("Travelling with a pet");
  if (pos(/connecting rooms?|adjoining/)) add("Needs connecting rooms");
  if (pos(/wheelchair|accessible|accessibility|mobility|step[-\s]?free/)) add("Needs accessibility");
  if (pos(/allerg/)) add("Has an allergy to confirm");

  // Party size, e.g. "2 adults", "family of 4"
  const guests = t.match(/(\d+)\s*(adults?|guests?|people|pax|travellers?|travelers?)/);
  if (guests) add(`Party size mentioned: ${guests[1]} ${guests[2].replace(/s?$/, "s")}`);
  const familyOf = t.match(/family of (\d+)/);
  if (familyOf) add(`Family of ${familyOf[1]}`);

  return out;
}
