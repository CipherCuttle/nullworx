import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { holoStyleVars, resolveHoloSettings } from "./presets";
import {
  resetHoloPointer,
  updateHoloPointer,
  updateHoloPointerAt,
} from "./pointer";
import type { HoloTextProps } from "./types";
import styles from "./holotype.module.css";

function joinClassNames(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

export const HoloText = forwardRef<HTMLElement, HoloTextProps>(function HoloText(
  {
    as = "span",
    children,
    className,
    style,
    preset,
    settings: settingOverrides,
    tone = "dark",
    motion = "auto",
    variant = "title",
    onPointerMove,
    onPointerLeave,
    onPointerDown,
    onTouchStart,
    ...rest
  },
  forwardedRef,
) {
  const elementRef = useRef<HTMLElement | null>(null);
  const settings = resolveHoloSettings(preset, settingOverrides);

  useImperativeHandle(
    forwardedRef,
    () => elementRef.current as HTMLElement,
    [],
  );

  const handlePointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (elementRef.current) {
      updateHoloPointer(elementRef.current, event, settings, motion);
    }
    onPointerMove?.(event);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (elementRef.current) {
      updateHoloPointer(elementRef.current, event, settings, motion);
    }
    onPointerDown?.(event);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (elementRef.current && event.pointerType !== "touch") {
      resetHoloPointer(elementRef.current);
    }
    onPointerLeave?.(event);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (touch && elementRef.current) {
      updateHoloPointerAt(
        elementRef.current,
        touch.clientX,
        touch.clientY,
        settings,
        motion,
      );
    }
    onTouchStart?.(event);
  };

  const Tag = as as ElementType;
  const vars = holoStyleVars(settings);
  const mergedStyle = { ...vars, ...style } as CSSProperties;

  return (
    <Tag
      {...rest}
      ref={elementRef as Ref<HTMLElement>}
      className={joinClassNames(styles.holo, styles[variant], className)}
      style={mergedStyle}
      data-holo-text=""
      data-variant={variant}
      data-tone={tone}
      data-motion={motion}
      data-animated={settings.animated ? "true" : "false"}
      data-pointer={settings.pointer > 0 ? "true" : "false"}
      onPointerMove={handlePointer}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
    >
      <span aria-hidden="true" className={styles.depth} data-holo-layer="depth">
        {children}
      </span>
      <span className={styles.base} data-holo-layer="base">{children}</span>
      <span aria-hidden="true" className={styles.spectral} data-holo-layer="spectral">
        {children}
      </span>
      <span aria-hidden="true" className={styles.specular} data-holo-layer="specular">
        {children}
      </span>
      <span aria-hidden="true" className={styles.grain} data-holo-layer="grain">
        {children}
      </span>
    </Tag>
  );
});
