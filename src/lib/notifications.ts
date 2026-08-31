export type NotificationItem = {
  id: string;
  eventKey: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationFeed = {
  unreadCount: number;
  items: NotificationItem[];
};

export const EMPTY_NOTIFICATION_FEED: NotificationFeed = {
  unreadCount: 0,
  items: [],
};
