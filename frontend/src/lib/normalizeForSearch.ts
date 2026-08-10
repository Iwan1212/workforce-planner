/**
 * Lowercase and strip diacritics so typing without Polish characters still
 * matches: "krol" finds "Król", "swiatek" finds "Świątek". NFD decomposition
 * covers accented letters; ł is a standalone letter in Unicode, so it needs
 * its own mapping.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}
