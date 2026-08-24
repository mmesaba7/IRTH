export type CartItem = {
  slug: string;
  artisan: string;
  name: string;
  price: number;
};

export type Order = {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes: string;
  };
  paymentMethod: string;
  items: CartItem[];
  total: number;
  status: "تم استلام الطلب" | "قيد التجهيز" | "جاهز للشحن" | "تم التسليم" | "ملغي" | "مرتجع";
  createdAt: string;
  deliveredAt?: string;
  reviewed?: boolean;
  artisanReviewed?: {
    [artisanName: string]: boolean;
  };
};