import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type Ref,
} from "react";
import {
  crtStyleVars,
  resolveCRTSettings,
} from "./presets";
import type { CRTScreenProps } from "./types";
import styles from "./crt.module.css";

function joinClassNames(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

export const CRTScreen = forwardRef<HTMLDivElement, CRTScreenProps>(
  function CRTScreen(
    {
      preset = "green",
      settings: settingOverrides,
      motion = "auto",
      children,
      className,
      style,
      ...rest
    },
    forwardedRef,
  ) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const settings = resolveCRTSettings(preset, settingOverrides);
    const motionState =
      motion === "reduced" || settings.animation <= 0
        ? "off"
        : motion === "full"
          ? "full"
          : "auto";
    const vars = crtStyleVars(preset, settings);
    const mergedStyle = { ...vars, ...style } as CSSProperties;

    useImperativeHandle(
      forwardedRef,
      () => rootRef.current as HTMLDivElement,
      [],
    );

    return (
      <div
        {...rest}
        ref={rootRef as Ref<HTMLDivElement>}
        className={joinClassNames(styles.crt, className)}
        style={mergedStyle}
        data-crt=""
        data-preset={typeof preset === "string" ? preset : preset.id}
        data-motion={motionState}
      >
        <div className={styles.bezel}>
          <div className={styles.screen}>
            <div className={styles.content}>{children}</div>
            <div aria-hidden="true" className={styles.scanlines} data-crt-layer="scanlines" />
            <div aria-hidden="true" className={styles.noise} data-crt-layer="noise" />
            <div aria-hidden="true" className={styles.tearA} data-crt-layer="tear-a" />
            <div aria-hidden="true" className={styles.tearB} data-crt-layer="tear-b" />
            <div aria-hidden="true" className={styles.tearStatic} data-crt-layer="tear-static" />
          </div>
        </div>
      </div>
    );
  },
);
