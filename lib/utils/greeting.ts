type GreetingUser = {
  name?: string | null;
  email?: string | null;
};

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getDisplayName(user?: GreetingUser | null): string {
  const name = user?.name?.trim();
  if (name) {
    const firstName = name.split(/\s+/)[0];
    if (firstName) return firstName;
  }

  const email = user?.email?.trim();
  if (email) {
    const localPart = email.split("@")[0];
    if (localPart) return localPart;
  }

  return "there";
}

export function formatAppGreeting(user?: GreetingUser | null, date?: Date): string {
  const greeting = getTimeOfDayGreeting(date);
  const name = getDisplayName(user);
  return `${greeting}, ${name}`;
}
