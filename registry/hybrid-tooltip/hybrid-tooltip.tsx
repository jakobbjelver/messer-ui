"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { Info } from "@phosphor-icons/react/dist/ssr";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

/**
 * One tooltip for pointer and touch: hover shows a tooltip, a coarse pointer shows a popover on tap.
 * Types are derived from the app's own components, so this works on Radix and Base UI bases alike.
 */

type TooltipProps = ComponentProps<typeof Tooltip>;
type TooltipTriggerProps = ComponentProps<typeof TooltipTrigger>;
type TooltipContentProps = ComponentProps<typeof TooltipContent>;
type TooltipProviderProps = ComponentProps<typeof TooltipProvider>;
type PopoverProps = ComponentProps<typeof Popover>;
type PopoverTriggerProps = ComponentProps<typeof PopoverTrigger>;
type PopoverContentProps = ComponentProps<typeof PopoverContent>;

const TouchContext = createContext<boolean | undefined>(undefined);
const useTouch = () => useContext(TouchContext);

const TouchProvider = (props: PropsWithChildren) => {
  const [isTouch, setTouch] = useState<boolean>();

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setTouch(mq.matches);
    // A tablet with a mouse plugged in changes its primary pointer; sampling once would lie.
    const onChange = (event: MediaQueryListEvent) => setTouch(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return <TouchContext.Provider value={isTouch} {...props} />;
};

const HybridTooltipProvider = (props: TooltipProviderProps) => {
  // Pass the app's provider props through: Radix takes delayDuration, Base UI takes delay/timeout.
  // Hardcoding either one makes the block base-specific.
  return (
    <TouchProvider>
      <TooltipProvider {...props} />
    </TouchProvider>
  );
};

const HybridTooltip = (props: TooltipProps & PopoverProps) => {
  const isTouch = useTouch();
  return isTouch ? <Popover {...props} /> : <Tooltip {...props} />;
};

const HybridTooltipTrigger = (props: TooltipTriggerProps & PopoverTriggerProps) => {
  const isTouch = useTouch();
  return isTouch ? <PopoverTrigger {...props} /> : <TooltipTrigger {...props} />;
};

const HybridTooltipContent = (props: TooltipContentProps & PopoverContentProps) => {
  const isTouch = useTouch();
  return isTouch ? <PopoverContent {...props} /> : <TooltipContent {...props} />;
};

/**
 * The standard inline help trigger: a 28px hit area with a 16px Phosphor `Info`, used when a
 * sentence is genuinely needed but does not belong as standing copy (§12). The sentence lives in
 * the tooltip on a pointer and in the popover on touch; it is never a `title` attribute (§15).
 */
function InfoTip({
  children,
  label = "More information",
  className = "",
}: {
  children: ReactNode;
  /** Accessible name for the trigger; the sentence itself belongs in `children`. */
  label?: string;
  className?: string;
}) {
  return (
    <HybridTooltip>
      <HybridTooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-slot="info-tip"
          className={[
            "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-[var(--text-3)]",
            "transition-[color] duration-150 hover:text-[var(--foreground)]",
            className,
          ]
            .join(" ")
            .trim()}
        >
          <Info size={16} aria-hidden="true" />
        </button>
      </HybridTooltipTrigger>
      <HybridTooltipContent side="top">{children}</HybridTooltipContent>
    </HybridTooltip>
  );
}

export {
  TouchProvider,
  HybridTooltipProvider,
  HybridTooltip,
  HybridTooltipTrigger,
  HybridTooltipContent,
  InfoTip,
};
