export function sanitizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const text = String(value).trim();
  if (!text) {
    return "";
  }

  const repairedKnownText = text
    .replace(/Caf�/g, "Café")
    .replace(/l'�pera/g, "l'Òpera")
    .replace(/M�sica/g, "Música")
    .replace(/M�nica/g, "Mònica")
    .replace(/M�n/g, "Món")
    .replace(/Fotogr�fico/g, "Fotográfico")
    .replace(/Orfe�/g, "Orfeó")
    .replace(/Dioces�/g, "Diocesà")
    .replace(/Mar�a/g, "María")
    .replace(/Montsi�/g, "Montsió")
    .replace(/Catalu�a/g, "Cataluña");

  if (repairedKnownText !== text) {
    return repairedKnownText;
  }

  if (/Ãƒ|Ã¢|ÃŠ|Ã°/.test(text)) {
    try {
      return Buffer.from(text, "latin1").toString("utf8");
    } catch {
      return text;
    }
  }

  return text;
}

export function toSlug(value) {
  return sanitizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
