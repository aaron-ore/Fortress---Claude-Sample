"use client"

import {
  Panel,
  PanelGroup,
  PanelProps,
  PanelGroupProps,
  PanelResizeHandle as ResizeHandle, // Renamed import
  PanelResizeHandleProps as ResizeHandleProps, // Renamed import
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: PanelGroupProps) => (
  <PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ({
  className,
  ...props
}: PanelProps) => (
  <Panel className={cn(className)} {...props} />
)

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: ResizeHandleProps & { withHandle?: boolean }) => (
  <ResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-[6px] after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-[6px] data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 10L12 15L7 10" />
          <path d="M17 14L12 19L7 14" />
        </svg>
      </div>
    )}
  </ResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }