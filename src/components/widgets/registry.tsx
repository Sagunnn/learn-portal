import type { ComponentType } from "react";
import type { WidgetName } from "../../types/content";
import AreaOverlap from "./AreaOverlap";
import EquivalentFractions from "./EquivalentFractions";
import GridMerger from "./GridMerger";
import MixedNumberTank from "./MixedNumberTank";

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
};
