import type { WheelEvent } from "react";

type WheelScrollAxis = "horizontal" | "vertical";

function getDelta(event: WheelEvent<HTMLElement>, axis: WheelScrollAxis) {
  return axis === "horizontal"
    ? event.deltaX || event.deltaY
    : event.deltaY || event.deltaX;
}

function getScrollState(element: HTMLElement, axis: WheelScrollAxis) {
  const maxScroll =
    axis === "horizontal"
      ? element.scrollWidth - element.clientWidth
      : element.scrollHeight - element.clientHeight;
  const currentScroll =
    axis === "horizontal" ? element.scrollLeft : element.scrollTop;

  return { currentScroll, maxScroll };
}

function canScrollInDirection(
  element: HTMLElement,
  axis: WheelScrollAxis,
  delta: number,
) {
  const { currentScroll, maxScroll } = getScrollState(element, axis);

  if (maxScroll <= 0) {
    return false;
  }

  return delta < 0 ? currentScroll > 0 : currentScroll < maxScroll;
}

function hasScrollableChildInDirection(
  target: EventTarget | null,
  boundary: HTMLElement,
  axis: WheelScrollAxis,
  delta: number,
) {
  let element = target instanceof Element ? target : null;

  while (element && element !== boundary) {
    if (
      element instanceof HTMLElement &&
      canScrollInDirection(element, axis, delta)
    ) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
}

export function handleWheelScroll(
  event: WheelEvent<HTMLElement>,
  axis: WheelScrollAxis,
) {
  const element = event.currentTarget;
  const delta = getDelta(event, axis);

  if (!delta || hasScrollableChildInDirection(event.target, element, axis, delta)) {
    return;
  }

  const { currentScroll, maxScroll } = getScrollState(element, axis);

  if (maxScroll <= 0) {
    return;
  }

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
