import { Hero } from "@/components/hero";
import { PopularDestinations } from "@/components/sections/popular-destinations";
import { StatsBar } from "@/components/sections/stats-bar";
import { Testimonials } from "@/components/sections/testimonials";
import { HowItWorks } from "@/components/sections/how-it-works";
import { FeatureCallout } from "@/components/sections/feature-callout";
import { SiteFooter } from "@/components/layout/site-footer";

/** The full marketing landing — hero plus the Travvi-style sections. */
export function Landing() {
  return (
    <>
      <Hero />
      <PopularDestinations />
      <StatsBar />
      <Testimonials />
      <HowItWorks />
      <FeatureCallout />
      <SiteFooter />
    </>
  );
}
