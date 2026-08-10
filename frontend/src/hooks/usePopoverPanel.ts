import { useRef, useState } from "react";

/** Gap kept between the panel and the viewport edge when picking which side
 * to open on (slightly larger than Radix's collisionPadding of 8). */
const EDGE_PADDING = 12;

/**
 * Positioning helpers shared by the searchable dropdown panels.
 *
 * `container`: Radix portals panels to <body> by default. Inside a modal dialog
 * that places the panel outside the dialog's scroll lock, which swallows wheel
 * events over the list, and outside its dismissable layer, which makes clicks
 * elsewhere in the dialog flicker. Portalling into the dialog keeps the panel in
 * that subtree while Popper still positions it against the viewport.
 *
 * `side`: chosen here, from the unfiltered panel height, instead of letting Radix
 * flip on its own. Radix only flips away from its preferred side when that side
 * does not fit, so pinning the side we picked stops the panel from jumping from
 * above the field to below it as search results shrink the list.
 */
export function usePopoverPanel() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [side, setSide] = useState<"top" | "bottom">("bottom");

  /** Call when the panel opens, with its expected unfiltered height in px. */
  const preparePanel = (panelHeight: number) => {
    const trigger = triggerRef.current;
    setContainer(
      trigger?.closest<HTMLElement>('[data-slot="dialog-content"]') ?? null,
    );
    if (!trigger) return;
    const spaceBelow =
      window.innerHeight - trigger.getBoundingClientRect().bottom - EDGE_PADDING;
    setSide(spaceBelow >= panelHeight ? "bottom" : "top");
  };

  return { triggerRef, container, side, preparePanel };
}
