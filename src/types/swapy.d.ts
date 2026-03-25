// Minimal ambient declarations for swapy v1.x
// Covers only what WidgetGrid.tsx uses. Extend if the API surface grows.
declare module "swapy" {
  export interface SlotItemMapEntry {
    slot: string;
    item: string | null;
  }

  export interface SlotItemMap {
    asArray: SlotItemMapEntry[];
  }

  export interface SwapEndEvent {
    hasChanged: boolean;
    slotItemMap: SlotItemMap;
  }

  export interface SwapyOptions {
    animation?: "dynamic" | "spring" | "none";
    enabled?: boolean;
  }

  export interface SwapyInstance {
    onSwapEnd(callback: (event: SwapEndEvent) => void): void;
    enable(enabled: boolean): void;
    destroy(): void;
  }

  export function createSwapy(
    element: HTMLElement,
    options?: SwapyOptions
  ): SwapyInstance;
}
