/**
 * Plain-text CV content. Descriptions are stored as simple HTML (a bullet list or a paragraph)
 * so every template renders them the same; these helpers move between that and plain text.
 */

export const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Capital first letter and a full stop, so points written on a phone read cleanly. */
export const sentence = (t: string) => {
  const v = t.trim().replace(/\s+/g, " ");
  if (!v) return "";
  const capped = v.charAt(0).toUpperCase() + v.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
};

export const bulletsToHtml = (bullets: string[]) => {
  const kept = bullets.map((b) => b.trim()).filter(Boolean);
  return kept.length ? `<ul>${kept.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : "";
};

/** Bullet points from stored HTML. Older rich-text content without a list becomes one point per paragraph. */
export const htmlToBullets = (html: string): string[] => {
  if (!html?.trim()) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = (el: Element) => el.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const lis = Array.from(doc.querySelectorAll("li")).map(text).filter(Boolean);
  if (lis.length) return lis;
  const paragraphs = Array.from(doc.querySelectorAll("p")).map(text).filter(Boolean);
  if (paragraphs.length) return paragraphs;
  const rest = text(doc.body);
  return rest ? [rest] : [];
};

export const promptsToHtml = (boxes: string[]) => bulletsToHtml(boxes.map(sentence));

export const paragraphToHtml = (t: string) => (t.trim() ? `<p>${escapeHtml(t.trim().replace(/\s+/g, " "))}</p>` : "");

export const htmlToParagraph = (html: string) => htmlToBullets(html).join(" ");
