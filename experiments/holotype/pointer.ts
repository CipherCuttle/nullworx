import type { PointerEvent as ReactPointerEvent } from "react";
import type { HoloMotionMode, HoloSettings } from "./presets";

export function updateHoloPointerAt(
  element: HTMLElement,
  clientX: number,
  clientY: number,
  settings: HoloSettings,
  motion: HoloMotionMode,
): void {
  if (settings.pointer <= 0 || motion === "reduced") return;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  const power = settings.pointer;
  const yaw = (nx - 0.5) * 8 * power;
  const pitch = (0.5 - ny) * 6 * power;

  element.style.setProperty("--holo-mx", `${(nx * 100).toFixed(2)}%`);
  element.style.setProperty("--holo-my", `${(ny * 100).toFixed(2)}%`);
  element.style.setProperty("--holo-rx", `${pitch.toFixed(2)}deg`);
  element.style.setProperty("--holo-ry", `${yaw.toFixed(2)}deg`);
}

export function updateHoloPointer(
  element: HTMLElement,
  event: ReactPointerEvent<HTMLElement>,
  settings: HoloSettings,
  motion: HoloMotionMode,
): void {
  updateHoloPointerAt(
    element,
    event.clientX,
    event.clientY,
    settings,
    motion,
  );
}

export function resetHoloPointer(element: HTMLElement): void {
  element.style.setProperty("--holo-mx", "50%");
  element.style.setProperty("--holo-my", "46%");
  element.style.setProperty("--holo-rx", "0deg");
  element.style.setProperty("--holo-ry", "0deg");
}
