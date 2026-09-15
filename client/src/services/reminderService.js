class ReminderService {
  constructor() {
    this.storageKey = "way2code_reminders";
  }

  getAllReminders() {
    const reminders = localStorage.getItem(this.storageKey);

    return reminders ? JSON.parse(reminders) : [];
  }

  saveReminders(reminders) {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(reminders)
    );
  }

  addReminder(contest) {
    const reminders = this.getAllReminders();

    const exists = reminders.find(
      (item) => item.id === contest.id
    );

    if (exists) return;

    reminders.push({
      ...contest,
      enabled: true,
      createdAt: Date.now(),
    });

    this.saveReminders(reminders);
  }

  removeReminder(id) {
    const reminders = this.getAllReminders().filter(
      (item) => item.id !== id
    );

    this.saveReminders(reminders);
  }

  toggleReminder(id) {
    const reminders = this.getAllReminders().map(
      (item) =>
        item.id === id
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item
    );

    this.saveReminders(reminders);
  }

  isReminderEnabled(id) {
    return this.getAllReminders().some(
      (item) => item.id === id && item.enabled
    );
  }
}

export default new ReminderService();