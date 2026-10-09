export const TEMPLATE_IDS = [
  "resumake-classic",
  "resumake-classic-single",
  "modern",
  "classic",
  "minimal",
  "professional",
  "creative",
  "executive",
  "sidebar",
] as const;

export const TEMPLATE_NAMES: Record<TemplateId, string> = {
  "resumake-classic": "Classic",
  "resumake-classic-single": "Shaded Headers",
  modern: "Modern",
  classic: "Traditional",
  minimal: "Minimal",
  professional: "Professional",
  creative: "Creative",
  executive: "Executive",
  sidebar: "Sidebar",
};

export const PHOTO_TEMPLATE_IDS = ["modern", "classic", "creative", "executive", "sidebar"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}

export function templateSupportsPhoto(id: string): boolean {
  return (PHOTO_TEMPLATE_IDS as readonly string[]).includes(id);
}
