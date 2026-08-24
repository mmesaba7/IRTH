export type Rating = 1 | 2 | 3 | 4 | 5;

export type Review = {
  id: string;
  orderId: string;
  productSlug: string;
  productName: string;
  artisanName: string;
  customerName: string;
  productRating: Rating;
  artisanRating: Rating;
  reviewText: string;
  images?: string[];
  status: "published" | "edited" | "pending_artisan_reply" | "artisan_replied";
  artisanReply?: {
    text: string;
    status: "pending_review" | "approved" | "rejected";
    createdAt: string;
    updatedAt?: string;
  };
  createdAt: string;
  updatedAt?: string;
  editCount: 0 | 1;
};

export type ReviewSummary = {
  productSlug: string;
  productName: string;
  artisanName: string;
  averageProductRating: number;
  averageArtisanRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};