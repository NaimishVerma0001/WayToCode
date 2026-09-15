class NotificationService {
  async requestPermission() {
    if (!("Notification" in window))
      return false;

    if (Notification.permission === "granted")
      return true;

    const permission =
      await Notification.requestPermission();

    return permission === "granted";
  }

  async notify(title, body) {
    const allowed =
      await this.requestPermission();

    if (!allowed) return;

    new Notification(title, {
      body,
      icon: "/logo192.png",
    });
  }
}

export default new NotificationService();