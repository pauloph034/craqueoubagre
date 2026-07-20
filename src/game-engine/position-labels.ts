import type { Position } from "@/types/game";

const positionLabels: Record<Position, string> = {
  GK: "GOL",
  RB: "LD",
  CB: "ZAG",
  LB: "LE",
  RWB: "ALA",
  LWB: "ALA",
  DM: "VOL",
  CM: "MC",
  MEI: "MEI",
  RM: "MD",
  LM: "ME",
  RW: "PD",
  LW: "PE",
  CF: "SA",
  ST: "ATA"
};

export function positionLabel(position: Position) {
  return positionLabels[position] ?? position;
}
