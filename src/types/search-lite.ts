export type SearchItem = {
  id: string;
  title: string;
  authors: string[];
  thumbnail?: string | null;
  infoLink: string;
  publisher: string;
  publishedDate: string;
  isbn13?: string; // ⬅️ baru
};
