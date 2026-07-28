const blockedTerms = [
  "arrombado",
  "arrombada",
  "babaca",
  "bosta",
  "buceta",
  "caralho",
  "cuzao",
  "desgracado",
  "desgracada",
  "escroto",
  "escrota",
  "foder",
  "fodase",
  "filhadaputa",
  "filhodaputa",
  "idiota",
  "imbecil",
  "lazarento",
  "lazarenta",
  "lixo",
  "merda",
  "nazista",
  "otario",
  "otaria",
  "piranha",
  "porra",
  "puta",
  "puto",
  "retardado",
  "retardada",
  "vagabundo",
  "vagabunda",
  "viado",
  "veado"
];

const blockedExactTerms = new Set([
  "cu",
  "fdp",
  "krl",
  "pqp",
  "vsf"
]);

function normalizeForModeration(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[@]/g, "a")
    .replace(/[$]/g, "s")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function moderationViews(value: string) {
  const spaced = normalizeForModeration(value);
  const compact = spaced.split(/\s+/).join("");
  const squeezed = compact.replace(/([a-z0-9])\1+/g, "$1");
  return { spaced, compact, squeezed };
}

export function validatePublicName(value: string) {
  const { spaced, compact, squeezed } = moderationViews(value);
  if (!spaced) return { allowed: false, reason: "Informe um nome valido." };

  const words = spaced.split(/\s+/);
  const blocked =
    words.some((word) => blockedExactTerms.has(word)) ||
    blockedTerms.some((term) => compact.includes(term) || squeezed.includes(term));

  return blocked
    ? { allowed: false, reason: "Esse nome nao e permitido. Escolha um nome sem xingamentos ou termos ofensivos." }
    : { allowed: true as const };
}

export function isPublicNameAllowed(value: string) {
  return validatePublicName(value).allowed;
}
