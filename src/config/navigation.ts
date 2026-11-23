export interface NavItem { label: string; href: string; built: boolean }

/** The main menu is generated from this array: add an item here (and a page under src/app) to extend it. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", built: true },
  { label: "Tasks", href: "/tasks", built: true },
  { label: "Events", href: "/events", built: false },
  { label: "Calendar", href: "/calendar", built: false },
  { label: "Timebox", href: "/timebox", built: true },
  { label: "Layouts", href: "/layouts", built: false },
  { label: "Settings", href: "/settings", built: false },
];
