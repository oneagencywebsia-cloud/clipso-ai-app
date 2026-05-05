/**
 * useColorGrading — Devuelve el CSS filter string para cada color grade.
 * Valores calibrados para producción (no destruir el video original).
 */
import { ColorGrading } from "../types/timeline";

const GRADING_FILTERS: Record<ColorGrading, string> = {
  cinematico: "contrast(1.18) saturate(0.85) brightness(0.96)",
  vibrante:   "contrast(1.12) saturate(1.35) brightness(1.02)",
  minimalista:"contrast(1.05) saturate(0.75) brightness(1.04)",
  oscuro:     "contrast(1.25) saturate(0.90) brightness(0.88)",
  neutral:    "none",
};

export function useColorGrading(grade: ColorGrading): string {
  return GRADING_FILTERS[grade] ?? "none";
}
