import type { ComponentType } from "react";
import type { WidgetName } from "../../types/content";
import AreaOverlap from "./AreaOverlap";
import EquivalentFractions from "./EquivalentFractions";
import GridMerger from "./GridMerger";
import MixedNumberTank from "./MixedNumberTank";
import CratePush from "./physics/CratePush";
import GridRunner from "./physics/GridRunner";
import SkateTrack from "./physics/SkateTrack";
import WorkDetector from "./physics/WorkDetector";
import Sorter from "./Sorter";
import AvyayaShield from "./nepali/AvyayaShield";
import WordMagnet from "./nepali/WordMagnet";
import AlkaliVenn from "./chemistry/AlkaliVenn";
import CureGame from "./chemistry/CureGame";
import DissolveTest from "./chemistry/DissolveTest";
import WaterActivation from "./chemistry/WaterActivation";
import IndicatorLab from "./chemistry/IndicatorLab";

/**
 * Interactive widgets a lesson can place with
 *   { "type": "interactive", "widget": "<name>", "props": { … starting values … } }
 * To add one: build the component, register it here, and add its name to
 * WidgetName (types/content.ts) and the "widget" enum in schema/lesson.schema.json.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WIDGETS: Record<WidgetName, ComponentType<any>> = {
  equivalentFractions: EquivalentFractions,
  mixedNumberTank: MixedNumberTank,
  gridMerger: GridMerger,
  areaOverlap: AreaOverlap,
  gridRunner: GridRunner,
  vectorSorter: Sorter, // deck 0 by default
  sorter: Sorter,
  skateTrack: SkateTrack,
  cratePush: CratePush,
  workDetector: WorkDetector,
  indicatorLab: IndicatorLab,
  cureGame: CureGame,
  waterActivation: WaterActivation,
  dissolveTest: DissolveTest,
  alkaliVenn: AlkaliVenn,
  wordMagnet: WordMagnet,
  avyayaShield: AvyayaShield,
};
