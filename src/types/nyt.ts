export interface NYTBook {
  rank?: number;
  title?: string;
  author?: string;
  description?: string;
  publisher?: string;
  primary_isbn13?: string;
  book_image?: string;
  amazon_product_url?: string;
}

export interface NYTResults {
  books?: NYTBook[];
  list_name?: string;
  display_name?: string;
}

export interface NYTResponse {
  status?: string;
  results?: NYTResults;
}
