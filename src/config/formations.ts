import type { FormationSlot } from "@/types/game";

import type { TacticalStyle } from "@/types/game";

export const formations: Record<string, FormationSlot[]> = {
  "4-3-3": [
    { id: "gk", label: "GOL", position: "GK", x: 50, y: 91 },
    { id: "rb", label: "LD", position: "RB", x: 84, y: 72 },
    { id: "cb1", label: "ZAG", position: "CB", x: 61, y: 76 },
    { id: "cb2", label: "ZAG", position: "CB", x: 39, y: 76 },
    { id: "lb", label: "LE", position: "LB", x: 16, y: 72 },
    { id: "dm", label: "VOL", position: "DM", x: 50, y: 58 },
    { id: "cm1", label: "MC", position: "CM", x: 30, y: 45 },
    { id: "cm2", label: "MC", position: "CM", x: 70, y: 45 },
    { id: "rw", label: "PD", position: "RW", x: 82, y: 23 },
    { id: "st", label: "ATA", position: "ST", x: 50, y: 15 },
    { id: "lw", label: "PE", position: "LW", x: 18, y: 23 }
  ],
  "4-2-3-1": [
    { id: "gk", label: "GOL", position: "GK", x: 50, y: 91 },
    { id: "rb", label: "LD", position: "RB", x: 84, y: 72 },
    { id: "cb1", label: "ZAG", position: "CB", x: 61, y: 76 },
    { id: "cb2", label: "ZAG", position: "CB", x: 39, y: 76 },
    { id: "lb", label: "LE", position: "LB", x: 16, y: 72 },
    { id: "dm1", label: "VOL", position: "DM", x: 40, y: 56 },
    { id: "dm2", label: "VOL", position: "DM", x: 60, y: 56 },
    { id: "rw", label: "MD", position: "RM", x: 78, y: 36 },
    { id: "mei", label: "MEI", position: "MEI", x: 50, y: 34 },
    { id: "lw", label: "ME", position: "LM", x: 22, y: 36 },
    { id: "st", label: "ATA", position: "ST", x: 50, y: 15 }
  ],
  "4-4-2": [
    { id: "gk", label: "GOL", position: "GK", x: 50, y: 91 },
    { id: "rb", label: "LD", position: "RB", x: 84, y: 72 },
    { id: "cb1", label: "ZAG", position: "CB", x: 61, y: 76 },
    { id: "cb2", label: "ZAG", position: "CB", x: 39, y: 76 },
    { id: "lb", label: "LE", position: "LB", x: 16, y: 72 },
    { id: "rm", label: "MD", position: "RM", x: 78, y: 48 },
    { id: "cm1", label: "MC", position: "CM", x: 58, y: 50 },
    { id: "cm2", label: "MC", position: "CM", x: 42, y: 50 },
    { id: "lm", label: "ME", position: "LM", x: 22, y: 48 },
    { id: "st1", label: "ATA", position: "ST", x: 42, y: 18 },
    { id: "st2", label: "SA", position: "CF", x: 58, y: 18 }
  ],
  "3-5-2": [
    { id: "gk", label: "GOL", position: "GK", x: 50, y: 91 },
    { id: "cb1", label: "ZAG", position: "CB", x: 30, y: 73 },
    { id: "cb2", label: "ZAG", position: "CB", x: 50, y: 77 },
    { id: "cb3", label: "ZAG", position: "CB", x: 70, y: 73 },
    { id: "rwb", label: "ALA", position: "RWB", x: 86, y: 48 },
    { id: "lwb", label: "ALA", position: "LWB", x: 14, y: 48 },
    { id: "dm", label: "VOL", position: "DM", x: 50, y: 56 },
    { id: "cm1", label: "MC", position: "CM", x: 38, y: 40 },
    { id: "cm2", label: "MC", position: "CM", x: 62, y: 40 },
    { id: "st1", label: "ATA", position: "ST", x: 42, y: 17 },
    { id: "st2", label: "SA", position: "CF", x: 58, y: 17 }
  ],
  "3-4-3": [
    { id: "gk", label: "GOL", position: "GK", x: 50, y: 91 },
    { id: "cb1", label: "ZAG", position: "CB", x: 30, y: 73 },
    { id: "cb2", label: "ZAG", position: "CB", x: 50, y: 77 },
    { id: "cb3", label: "ZAG", position: "CB", x: 70, y: 73 },
    { id: "rm", label: "MD", position: "RM", x: 78, y: 50 },
    { id: "cm1", label: "MC", position: "CM", x: 58, y: 51 },
    { id: "cm2", label: "MC", position: "CM", x: 42, y: 51 },
    { id: "lm", label: "ME", position: "LM", x: 22, y: 50 },
    { id: "rw", label: "PD", position: "RW", x: 80, y: 23 },
    { id: "st", label: "ATA", position: "ST", x: 50, y: 14 },
    { id: "lw", label: "PE", position: "LW", x: 20, y: 23 }
  ],
  "4-1-2-1-2": [
    { id: "gk", label: "GOL", position: "GK", x: 50, y: 91 },
    { id: "rb", label: "LD", position: "RB", x: 84, y: 72 },
    { id: "cb1", label: "ZAG", position: "CB", x: 61, y: 76 },
    { id: "cb2", label: "ZAG", position: "CB", x: 39, y: 76 },
    { id: "lb", label: "LE", position: "LB", x: 16, y: 72 },
    { id: "dm", label: "VOL", position: "DM", x: 50, y: 58 },
    { id: "cm1", label: "MC", position: "CM", x: 34, y: 43 },
    { id: "cm2", label: "MC", position: "CM", x: 66, y: 43 },
    { id: "mei", label: "MEI", position: "MEI", x: 50, y: 29 },
    { id: "st1", label: "ATA", position: "ST", x: 42, y: 15 },
    { id: "st2", label: "SA", position: "CF", x: 58, y: 15 }
  ]
};

export function getFormationSlots(formation: string, style: TacticalStyle): FormationSlot[] {
  const slots = formations[formation] ?? formations["4-3-3"];
  return tacticalFormations[formation]?.[style] ?? slots;
}

const tacticalFormations: Record<string, Partial<Record<TacticalStyle, FormationSlot[]>>> = {
  "4-3-3": {
    defensivo: replaceSlots("4-3-3", [
      { id: "dm1", label: "VOL", position: "DM", x: 40, y: 58 },
      { id: "dm2", label: "VOL", position: "DM", x: 60, y: 58 },
      { id: "cm", label: "MC", position: "CM", x: 50, y: 45 }
    ], ["dm", "cm1", "cm2"]),
    equilibrado: replaceSlots("4-3-3", [
      { id: "cm1", label: "MC", position: "CM", x: 28, y: 47 },
      { id: "cm2", label: "MC", position: "CM", x: 50, y: 56 },
      { id: "cm3", label: "MC", position: "CM", x: 72, y: 47 }
    ], ["dm", "cm1", "cm2"]),
    ofensivo: replaceSlots("4-3-3", [
      { id: "cm1", label: "MC", position: "CM", x: 38, y: 50 },
      { id: "cm2", label: "MC", position: "CM", x: 62, y: 50 },
      { id: "mei", label: "MEI", position: "MEI", x: 50, y: 36 }
    ], ["dm", "cm1", "cm2"]),
    pressao: replaceSlots("4-3-3", [
      { id: "cm", label: "MC", position: "CM", x: 50, y: 51 },
      { id: "mei1", label: "MEI", position: "MEI", x: 38, y: 39 },
      { id: "mei2", label: "MEI", position: "MEI", x: 62, y: 39 }
    ], ["dm", "cm1", "cm2"])
  },
  "4-2-3-1": {
    defensivo: formations["4-2-3-1"],
    equilibrado: replaceSlots("4-2-3-1", [
      { id: "dm", label: "VOL", position: "DM", x: 42, y: 56 },
      { id: "cm", label: "MC", position: "CM", x: 58, y: 52 }
    ], ["dm1", "dm2"]),
    ofensivo: replaceSlots("4-2-3-1", [
      { id: "cm1", label: "MC", position: "CM", x: 40, y: 52 },
      { id: "cm2", label: "MC", position: "CM", x: 60, y: 52 }
    ], ["dm1", "dm2"]),
    pressao: replaceSlots("4-2-3-1", [
      { id: "cm", label: "MC", position: "CM", x: 42, y: 53 },
      { id: "mei2", label: "MEI", position: "MEI", x: 58, y: 42 }
    ], ["dm1", "dm2"])
  },
  "4-4-2": {
    defensivo: replaceSlots("4-4-2", [
      { id: "dm1", label: "VOL", position: "DM", x: 42, y: 52 },
      { id: "dm2", label: "VOL", position: "DM", x: 58, y: 52 }
    ], ["cm1", "cm2"]),
    equilibrado: formations["4-4-2"],
    ofensivo: replaceSlots("4-4-2", [
      { id: "cm", label: "MC", position: "CM", x: 43, y: 51 },
      { id: "mei", label: "MEI", position: "MEI", x: 57, y: 43 }
    ], ["cm1", "cm2"]),
    pressao: replaceSlots("4-4-2", [
      { id: "cm", label: "MC", position: "CM", x: 43, y: 51 },
      { id: "mei", label: "MEI", position: "MEI", x: 57, y: 42 }
    ], ["cm1", "cm2"])
  },
  "3-5-2": {
    defensivo: replaceSlots("3-5-2", [
      { id: "dm1", label: "VOL", position: "DM", x: 42, y: 56 },
      { id: "dm2", label: "VOL", position: "DM", x: 58, y: 56 },
      { id: "cm", label: "MC", position: "CM", x: 50, y: 41 }
    ], ["dm", "cm1", "cm2"]),
    equilibrado: replaceSlots("3-5-2", [
      { id: "cm1", label: "MC", position: "CM", x: 38, y: 43 },
      { id: "cm2", label: "MC", position: "CM", x: 50, y: 54 },
      { id: "cm3", label: "MC", position: "CM", x: 62, y: 43 }
    ], ["dm", "cm1", "cm2"]),
    ofensivo: replaceSlots("3-5-2", [
      { id: "cm1", label: "MC", position: "CM", x: 40, y: 48 },
      { id: "cm2", label: "MC", position: "CM", x: 60, y: 48 },
      { id: "mei", label: "MEI", position: "MEI", x: 50, y: 34 }
    ], ["dm", "cm1", "cm2"]),
    pressao: replaceSlots("3-5-2", [
      { id: "cm", label: "MC", position: "CM", x: 50, y: 52 },
      { id: "mei1", label: "MEI", position: "MEI", x: 38, y: 38 },
      { id: "mei2", label: "MEI", position: "MEI", x: 62, y: 38 }
    ], ["dm", "cm1", "cm2"])
  },
  "3-4-3": {
    defensivo: replaceSlots("3-4-3", [
      { id: "dm", label: "VOL", position: "DM", x: 42, y: 52 },
      { id: "cm", label: "MC", position: "CM", x: 58, y: 51 }
    ], ["cm1", "cm2"]),
    equilibrado: formations["3-4-3"],
    ofensivo: replaceSlots("3-4-3", [
      { id: "cm", label: "MC", position: "CM", x: 42, y: 51 },
      { id: "mei", label: "MEI", position: "MEI", x: 58, y: 42 }
    ], ["cm1", "cm2"]),
    pressao: replaceSlots("3-4-3", [
      { id: "cm", label: "MC", position: "CM", x: 42, y: 51 },
      { id: "mei", label: "MEI", position: "MEI", x: 58, y: 41 }
    ], ["cm1", "cm2"])
  },
  "4-1-2-1-2": {
    defensivo: replaceSlots("4-1-2-1-2", [
      { id: "dm1", label: "VOL", position: "DM", x: 42, y: 58 },
      { id: "dm2", label: "VOL", position: "DM", x: 58, y: 58 },
      { id: "cm", label: "MC", position: "CM", x: 50, y: 43 },
      { id: "mei", label: "MEI", position: "MEI", x: 50, y: 30 }
    ], ["dm", "cm1", "cm2", "mei"]),
    equilibrado: formations["4-1-2-1-2"],
    ofensivo: replaceSlots("4-1-2-1-2", [
      { id: "cm1", label: "MC", position: "CM", x: 38, y: 46 },
      { id: "cm2", label: "MC", position: "CM", x: 62, y: 46 },
      { id: "mei1", label: "MEI", position: "MEI", x: 45, y: 31 },
      { id: "mei2", label: "MEI", position: "MEI", x: 55, y: 31 }
    ], ["dm", "cm1", "cm2", "mei"]),
    pressao: replaceSlots("4-1-2-1-2", [
      { id: "dm", label: "VOL", position: "DM", x: 50, y: 56 },
      { id: "cm", label: "MC", position: "CM", x: 50, y: 45 },
      { id: "mei1", label: "MEI", position: "MEI", x: 42, y: 31 },
      { id: "mei2", label: "MEI", position: "MEI", x: 58, y: 31 }
    ], ["dm", "cm1", "cm2", "mei"])
  }
};

function replaceSlots(formation: string, replacements: FormationSlot[], replacedIds: string[]) {
  return [...formations[formation].filter((slot) => !replacedIds.includes(slot.id)), ...replacements];
}

