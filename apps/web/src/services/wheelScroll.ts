import type { WheelEvent } from "react";

type WheelScrollAxis = "horizontal" | "vertical";

const nativeWheelTargets = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  ".monaco-editor",
].join(",");

function shouldUseNativeWheel(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(nativeWheelTargets));
}

export function handleWheelScroll(
  event: WheelEvent<HTMLElement>,
  axis: WheelScrollAxis,
) {
  if (shouldUseNativeWheel(event.target)) {
    return;
  }

  const element = event.currentTarget;
  const delta =
    axis === "horizontal"
      ? event.deltaX || event.deltaY
      : event.deltaY || event.deltaX;

  if (!delta) {
    return;
  }

  const maxScroll =
    axis === "horizontal"
      ? element.scrollWidth - element.clientWidth
      : element.scrollHeight - element.clientHeight;

  if (maxScroll <= 0) {
    return;
  }

  const currentScroll = axis === "horizontal" ? element.scrollLeft : element.scrollTop;
  const nextScroll = Math.min(Math.max(currentScroll + delta, 0), maxScroll);

  if (nextScroll === currentScroll) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (axis === "horizontal") {
    element.scrollLeft = nextScroll;
  } else {
    element.scrollTop = nextScroll;
  }
}
