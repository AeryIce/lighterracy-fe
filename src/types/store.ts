export type StoreHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  string[]
>;

export interface StoreImage {
  hero?: string;
  thumb?: string;
  icon?: string;
}

export interface StoreLinks {
  maps?: string;
  wa?: string;
  tel?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  hours: StoreHours;
  image?: StoreImage;
  links?: StoreLinks;
}
