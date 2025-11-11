// Tipis saja: hanya properti yang memang kita pakai.
// Tidak mengubah logic, hanya memberi tipe agar ESLint happy.

export interface GBImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
}

export interface GBIndustryIdentifier {
  type?: string;            // e.g. "ISBN_10" | "ISBN_13"
  identifier?: string;      // "9781234567890"
}

export interface GBVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: GBIndustryIdentifier[];
  imageLinks?: GBImageLinks;
  pageCount?: number;
  categories?: string[];
  infoLink?: string;
  previewLink?: string;
}

export interface GBItem {
  id: string;
  volumeInfo?: GBVolumeInfo;
}

export interface GBSearch {
  totalItems?: number;
  items?: GBItem[];
}

// (Opsional) Jika di route kamu memetakan ke bentuk "ringkas":
export interface LiteBook {
  id: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  isbn13?: string;
}
