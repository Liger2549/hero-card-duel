import { bianca } from "./bianca.ts";
import { eira } from "./eira.ts";
import { falka } from "./falka.ts";
import { karas } from "./karas.ts";
import { konrad } from "./konrad.ts";
import { leilani } from "./leilani.ts";
import { linnet } from "./linnet.ts";
import { pley, pleyDemon } from "./pley.ts";
import { rocco } from "./rocco.ts";
import { serie } from "./serie.ts";
import { valen } from "./valen.ts";
import { zoran } from "./zoran.ts";

// Heroes in the game. Remove a line to take a hero out of the draft.
// The prototype's other heroes are archived in docs/heroes/archive/prototype-heroes.md.
// pleyDemon is Pley's second form: not in the draft (HeroDef.inDraft).
export const heroes = [valen, bianca, serie, karas, falka, linnet, zoran, pley, leilani, rocco, konrad, eira, pleyDemon];
