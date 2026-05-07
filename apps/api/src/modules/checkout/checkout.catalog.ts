export interface Sku {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export const CATALOG: Sku[] = [
  {
    id: "card_single",
    name: "Single Card",
    description: "One Timewell greeting card",
    quantity: 1,
    unitPriceCents: 1999,
  },
  {
    id: "card_5pack",
    name: "5-Pack",
    description: "Five Timewell greeting cards — save 20%",
    quantity: 5,
    unitPriceCents: 1599,
  },
  {
    id: "card_10pack",
    name: "10-Pack",
    description: "Ten Timewell greeting cards — save 30%",
    quantity: 10,
    unitPriceCents: 1399,
  },
];

export function skuById(id: string): Sku | undefined {
  return CATALOG.find((s) => s.id === id);
}
