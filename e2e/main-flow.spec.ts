import { test, expect } from "@playwright/test";

test("fluxo principal ate confirmar elenco", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Comecar campanha/i }).click();
  await page.getByRole("button", { name: /Iniciar draft/i }).click();

  for (let i = 0; i < 11; i++) {
    await page.getByRole("button", { name: /Sortear time/i }).click();
    if (i === 0) {
      await page.getByRole("button", { name: /Sortear novamente/i }).click();
    }
    await page.locator('[data-testid="choose-player"]:not([disabled])').first().click();
    await page.locator('[data-testid="field-position-option"]').first().click();
  }

  await expect(page.getByRole("button", { name: /Confirmar elenco/i })).toBeEnabled();
  await page.getByRole("button", { name: /Confirmar elenco/i }).click();
  await expect(page.getByRole("button", { name: /Confirmar tecnico/i })).toBeEnabled();
  await page.getByRole("button", { name: /Confirmar tecnico/i }).click();
  await expect(page.getByRole("button", { name: /Ir para campanha/i })).toBeEnabled();
  await page.getByRole("button", { name: /Ir para campanha/i }).click();
  await page.getByRole("button", { name: /Iniciar fase de grupos/i }).click();
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("heading", { name: /Classificacao final/i }).isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: /Avancar tempo|Prosseguir|Simular partida/i }).click();
  }
  await expect(page.getByRole("heading", { name: /Classificacao final/i })).toBeVisible();
  await page.getByRole("button", { name: /Prosseguir ao mata-mata/i }).click();
  await expect(page.getByRole("button", { name: /Avancar tempo|Prosseguir|Simular partida/i })).toBeEnabled();
});
