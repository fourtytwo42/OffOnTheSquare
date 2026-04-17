import VaultBook, { type VaultBookItem } from "@/components/vault/VaultBook";

const MAGIC_CARD_ITEMS: VaultBookItem[] = [
  {
    id: "magic-card-01",
    title: "Dig Through Time",
    href: "/shop",
    imageSrc: "/cards/magic-card-01.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-02",
    title: "Alhammarret, High Arbiter",
    href: "/shop",
    imageSrc: "/cards/magic-card-02.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-03",
    title: "City on Fire",
    href: "/shop",
    imageSrc: "/cards/magic-card-03.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-04",
    title: "Witch's Cottage",
    href: "/shop",
    imageSrc: "/cards/magic-card-04.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-05",
    title: "Winter, Misanthropic Guide",
    href: "/shop",
    imageSrc: "/cards/magic-card-05.jpeg",
    badge: "Magic",
  },
  {
    id: "magic-card-06",
    title: "Totally Lost",
    href: "/shop",
    imageSrc: "/cards/magic-card-06.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-07",
    title: "Take Flight",
    href: "/shop",
    imageSrc: "/cards/magic-card-07.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-08",
    title: "Frantic Search",
    href: "/shop",
    imageSrc: "/cards/magic-card-08.jpg",
    badge: "Magic",
  },
  {
    id: "magic-card-09",
    title: "Harrow",
    href: "/shop",
    imageSrc: "/cards/magic-card-09.jpg",
    badge: "Magic",
  },
];

export default async function HomePage() {
  return <VaultBook items={MAGIC_CARD_ITEMS} />;
}
