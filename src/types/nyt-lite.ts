export type NYTListItem = {
  id: string;
  title: string;
  author: string;
  description: string;
  image: string;      // <— BUKAN 'book_image'
  publisher: string;
  rank: number;
  isbn13: string;
  amazonUrl: string;
};
