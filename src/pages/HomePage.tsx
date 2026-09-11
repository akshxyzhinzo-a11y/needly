import Hero from "@/components/Hero";
import Popular from "@/components/Popular";
import HowItWorks from "@/components/HowItWorks";
import { usePageTitle } from "@/components/ui";

interface HomePageProps {
  city: string;
  onCity: (city: string) => void;
  notify: (text: string) => void;
}

export default function HomePage({ city, onCity, notify }: HomePageProps) {
  usePageTitle("Need it? Find it nearby.");
  return (
    <>
      <Hero city={city} onCity={onCity} />
      <Popular city={city} notify={notify} />
      <HowItWorks />
    </>
  );
}
