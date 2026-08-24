// src/lib/notifications.ts

export type Notification = {
  id: string;
  userId: string;
  userType: "customer" | "artisan" | "admin";
  title: string;
  message: string;
  type: "order" | "payment" | "product" | "commission" | "system";
  read: boolean;
  createdAt: string;
  link?: string; // رابط للصفحة ذات الصلة (اختياري)
};

// دالة لإضافة إشعار جديد
export const addNotification = (
  userId: string,
  userType: "customer" | "artisan" | "admin",
  title: string,
  message: string,
  type: Notification["type"],
  link?: string
) => {
  const notifications: Notification[] = JSON.parse(
    localStorage.getItem("irth-notifications") || "[]"
  );

  const newNotification: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    userType,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    link,
  };

  notifications.unshift(newNotification); // الأحدث في الأول
  localStorage.setItem("irth-notifications", JSON.stringify(notifications));
};

// دالة لجلب الإشعارات لمستخدم معين
export const getNotifications = (
  userId: string
): Notification[] => {
  const notifications: Notification[] = JSON.parse(
    localStorage.getItem("irth-notifications") || "[]"
  );
  return notifications.filter((n) => n.userId === userId);
};

// دالة لتحديث حالة الإشعار (قراءة)
export const markNotificationAsRead = (notificationId: string) => {
  const notifications: Notification[] = JSON.parse(
    localStorage.getItem("irth-notifications") || "[]"
  );
  const updated = notifications.map((n) =>
    n.id === notificationId ? { ...n, read: true } : n
  );
  localStorage.setItem("irth-notifications", JSON.stringify(updated));
};

// دالة لحذف إشعار
export const deleteNotification = (notificationId: string) => {
  const notifications: Notification[] = JSON.parse(
    localStorage.getItem("irth-notifications") || "[]"
  );
  const updated = notifications.filter((n) => n.id !== notificationId);
  localStorage.setItem("irth-notifications", JSON.stringify(updated));
};