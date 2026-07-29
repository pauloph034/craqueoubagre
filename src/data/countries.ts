export const profileCountries = [
  "Argentina", "Australia", "Austria", "Belgica", "Bolivia", "Brasil", "Canada", "Chile", "Colombia",
  "Coreia do Sul", "Costa Rica", "Croacia", "Dinamarca", "Egito", "Equador", "Escocia", "Espanha",
  "Estados Unidos", "Franca", "Gana", "Grecia", "Holanda", "Hungria", "Inglaterra", "Irlanda", "Italia",
  "Japao", "Marrocos", "Mexico", "Nigeria", "Noruega", "Nova Zelandia", "Paraguai", "Peru", "Polonia",
  "Portugal", "Republica Tcheca", "Romenia", "Senegal", "Servia", "Suecia", "Suica", "Turquia", "Ucrania",
  "Uruguai"
] as const;

export function isProfileCountry(value: string) {
  return profileCountries.includes(value as (typeof profileCountries)[number]);
}
