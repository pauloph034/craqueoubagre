import { cn } from "@/lib/utils";

const COUNTRY_CODES: Record<string, string> = {
  alemanha: "DE",
  "africa do sul": "ZA",
  algeria: "DZ",
  argelia: "DZ",
  argentina: "AR",
  armenia: "AM",
  australia: "AU",
  austria: "AT",
  belarus: "BY",
  belgica: "BE",
  bolivia: "BO",
  bosnia: "BA",
  "bosnia e herzegovina": "BA",
  brasil: "BR",
  bulgaria: "BG",
  camaroes: "CM",
  cameroon: "CM",
  canada: "CA",
  chile: "CL",
  china: "CN",
  chipre: "CY",
  colombia: "CO",
  "coreia do sul": "KR",
  "costa do marfim": "CI",
  "costa rica": "CR",
  croacia: "HR",
  dinamarca: "DK",
  egito: "EG",
  equador: "EC",
  escocia: "GB",
  eslovaquia: "SK",
  eslovenia: "SI",
  espanha: "ES",
  "estados unidos": "US",
  finlandia: "FI",
  franca: "FR",
  gales: "GB",
  gana: "GH",
  georgia: "GE",
  grecia: "GR",
  guine: "GN",
  holanda: "NL",
  honduras: "HN",
  hungria: "HU",
  inglaterra: "GB",
  ira: "IR",
  irlanda: "IE",
  islandia: "IS",
  israel: "IL",
  italia: "IT",
  iugoslavia: "RS",
  jamaica: "JM",
  japao: "JP",
  kosovo: "XK",
  marrocos: "MA",
  "macedonia do norte": "MK",
  mali: "ML",
  mexico: "MX",
  mocambique: "MZ",
  montenegro: "ME",
  nigeria: "NG",
  noruega: "NO",
  "nova zelandia": "NZ",
  paisesbaixos: "NL",
  "paises baixos": "NL",
  panama: "PA",
  "pais de gales": "GB",
  paraguai: "PY",
  peru: "PE",
  polonia: "PL",
  portugal: "PT",
  "republica checa": "CZ",
  "republica tcheca": "CZ",
  "republica democratica do congo": "CD",
  "rd congo": "CD",
  "republica dominicana": "DO",
  romenia: "RO",
  russia: "RU",
  senegal: "SN",
  servia: "RS",
  suecia: "SE",
  suica: "CH",
  tunisia: "TN",
  togo: "TG",
  "trinidad e tobago": "TT",
  turquia: "TR",
  ucrania: "UA",
  uruguai: "UY",
  venezuela: "VE"
};

const REGIONAL_FLAG_URLS: Record<string, string> = {
  escocia: "https://flagcdn.com/w80/gb-sct.png"
};

function normalizeCountry(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countryCodeForNationality(nationality?: string) {
  if (!nationality) return undefined;
  const normalized = normalizeCountry(nationality);
  return COUNTRY_CODES[normalized] ?? COUNTRY_CODES[normalized.replace(/\s/g, "")];
}

export function flagUrlForNationality(nationality?: string) {
  if (!nationality) return undefined;
  const normalized = normalizeCountry(nationality);
  const regionalFlag = REGIONAL_FLAG_URLS[normalized];
  if (regionalFlag) return regionalFlag;
  const countryCode = countryCodeForNationality(nationality);
  return countryCode ? `https://flagsapi.com/${countryCode}/flat/64.png` : undefined;
}

export function NationalityFlag({
  nationality,
  className
}: {
  nationality?: string;
  className?: string;
}) {
  const flagUrl = flagUrlForNationality(nationality);

  if (!flagUrl) {
    return (
      <span
        className={cn("grid aspect-[4/3] w-7 place-items-center border border-white/35 bg-white/15 text-[7px] font-black text-white", className)}
        title={nationality || "Nacionalidade nao informada"}
        aria-label={nationality || "Nacionalidade nao informada"}
      >
        {nationality?.slice(0, 2).toUpperCase() ?? "--"}
      </span>
    );
  }

  return (
    <span
      className={cn("block aspect-[4/3] w-7 overflow-hidden border border-white/55 bg-white", className)}
      title={nationality}
    >
      <img
        src={flagUrl}
        alt={`Bandeira: ${nationality}`}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
