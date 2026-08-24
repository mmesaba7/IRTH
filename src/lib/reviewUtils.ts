import { Review, Rating, ReviewSummary } from "@/types/review";
import { Order } from "@/types/order";

export const saveReview = (review: Review): void => {
  const reviews = getReviews();
  reviews.push(review);
  localStorage.setItem("irth-reviews", JSON.stringify(reviews));

  const orders: Order[] = JSON.parse(
    localStorage.getItem("irth-orders") || "[]"
  );
  const updatedOrders = orders.map((order) =>
    order.id === review.orderId ? { ...order, reviewed: true } : order
  );
  localStorage.setItem("irth-orders", JSON.stringify(updatedOrders));
};

export const getReviews = (): Review[] => {
  return JSON.parse(localStorage.getItem("irth-reviews") || "[]");
};

export const getProductReviews = (productSlug: string): Review[] => {
  return getReviews().filter(
    (review) => review.productSlug === productSlug && review.status !== "pending_artisan_reply"
  );
};

export const getArtisanReviews = (artisanName: string): Review[] => {
  return getReviews().filter(
    (review) => review.artisanName === artisanName && review.status !== "pending_artisan_reply"
  );
};

export const canReviewOrder = (orderId: string): boolean => {
  const orders: Order[] = JSON.parse(
    localStorage.getItem("irth-orders") || "[]"
  );
  const order = orders.find((o) => o.id === orderId);
  if (!order) return false;
  if (order.status !== "تم التسليم") return false;
  if (order.reviewed) return false;
  return true;
};

export const getProductReviewSummary = (productSlug: string): ReviewSummary | null => {
  const reviews = getProductReviews(productSlug);
  if (reviews.length === 0) return null;

  const totalProductRating = reviews.reduce((sum, r) => sum + r.productRating, 0);
  const totalArtisanRating = reviews.reduce((sum, r) => sum + r.artisanRating, 0);
  const averageProductRating = totalProductRating / reviews.length;
  const averageArtisanRating = totalArtisanRating / reviews.length;

  const distribution: ReviewSummary["ratingDistribution"] = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  };
  reviews.forEach((r) => {
    distribution[r.productRating] = (distribution[r.productRating] || 0) + 1;
  });

  return {
    productSlug,
    productName: reviews[0].productName,
    artisanName: reviews[0].artisanName,
    averageProductRating,
    averageArtisanRating,
    totalReviews: reviews.length,
    ratingDistribution: distribution,
  };
};

export const updateReview = (reviewId: string, updatedData: Partial<Review>): boolean => {
  const reviews = getReviews();
  const reviewIndex = reviews.findIndex((r) => r.id === reviewId);
  if (reviewIndex === -1) return false;
  if (reviews[reviewIndex].editCount >= 1) return false;

  reviews[reviewIndex] = {
    ...reviews[reviewIndex],
    ...updatedData,
    updatedAt: new Date().toISOString(),
    editCount: 1,
    status: "edited",
  };
  localStorage.setItem("irth-reviews", JSON.stringify(reviews));
  return true;
};

export const addArtisanReply = (
  reviewId: string,
  replyText: string,
  artisanName: string
): boolean => {
  const reviews = getReviews();
  const reviewIndex = reviews.findIndex((r) => r.id === reviewId);
  if (reviewIndex === -1) return false;
  if (reviews[reviewIndex].artisanName !== artisanName) return false;

  reviews[reviewIndex] = {
    ...reviews[reviewIndex],
    artisanReply: {
      text: replyText,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    },
    status: "pending_artisan_reply",
  };
  localStorage.setItem("irth-reviews", JSON.stringify(reviews));
  return true;
};

export const reviewArtisanReply = (
  reviewId: string,
  action: "approve" | "reject"
): boolean => {
  const reviews = getReviews();
  const reviewIndex = reviews.findIndex((r) => r.id === reviewId);
  if (reviewIndex === -1) return false;
  if (!reviews[reviewIndex].artisanReply) return false;

  const reply = reviews[reviewIndex].artisanReply!;
  if (action === "approve") {
    reply.status = "approved";
    reviews[reviewIndex].status = "artisan_replied";
  } else {
    reply.status = "rejected";
    reviews[reviewIndex].status = "published";
  }
  reviews[reviewIndex].artisanReply = reply;
  localStorage.setItem("irth-reviews", JSON.stringify(reviews));
  return true;
};

export const getPendingArtisanReplies = (): Review[] => {
  return getReviews().filter(
    (review) =>
      review.artisanReply &&
      review.artisanReply.status === "pending_review"
  );
};