"use client";

import { useEffect } from "react";
import { usePreferences } from "@/store/preferences-store";

/** Records a hotel view into the "recently viewed" list (client-side). */
export function TrackView({
  hotel,
}: {
  hotel: { id: string; name: string; city: string; image: string; startingRate: number };
}) {
  const addRecentlyViewed = usePreferences((s) => s.addRecentlyViewed);
  useEffect(() => {
    addRecentlyViewed(hotel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);
  return null;
}
