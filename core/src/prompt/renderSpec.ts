/**
 * GameSpec → текстовая спека для LLM.
 * Это НЕ системный промпт, а уточнение к нему.
 */
import type { GameSpec } from "../types.ts";

export function renderSpec(spec: GameSpec): string {
  const lines: string[] = [];

  lines.push(`ЖАНР: ${spec.genre}`);
  lines.push(`АУДИТОРИЯ: ${spec.audience}`);

  if (spec.theme) {
    lines.push(`ТЕМА: ${spec.theme}`);
  }

  if (spec.mechanics.length > 0) {
    lines.push(`ОБЯЗАТЕЛЬНЫЕ МЕХАНИКИ: ${spec.mechanics.join(", ")}`);
  }

  const c = spec.constraints;
  const constraints: string[] = [];
  if (c.mobile) constraints.push("touch-управление обязательно");
  if (c.noTimer) constraints.push("без таймеров");
  if (c.highContrast) constraints.push("высокий контраст");
  if (c.largeElements) constraints.push("крупные элементы (60px+)");
  if (c.colorblindSafe) constraints.push("цвета, безопасные для дальтоников");
  if (c.noSound) constraints.push("без звука");

  if (constraints.length > 0) {
    lines.push(`ОГРАНИЧЕНИЯ: ${constraints.join("; ")}`);
  }

  return lines.join("\n");
}
