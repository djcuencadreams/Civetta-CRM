import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { 
    responsive?: boolean,
    compact?: boolean
  }
>(({ className, responsive = true, compact = false, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <div className={cn(
      "w-full", 
      responsive ? "overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0" : "overflow-x-auto"
    )}>
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom", 
          compact ? "text-xs sm:text-sm" : "text-sm",
          className
        )}
        {...props}
      />
    </div>
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { 
    compact?: boolean
  }
>(({ className, compact = false, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      compact && "h-10 sm:h-12",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { 
    hiddenOnMobile?: boolean,
    compact?: boolean,
    truncate?: boolean,
    maxWidth?: string
  }
>(({ className, hiddenOnMobile, compact = false, truncate = false, maxWidth, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      hiddenOnMobile && "hidden sm:table-cell",
      compact && "text-xs sm:text-sm",
      truncate && "truncate",
      maxWidth && `max-w-[${maxWidth}]`,
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { 
    hiddenOnMobile?: boolean, 
    priorityOnMobile?: 'high' | 'medium' | 'low',
    truncate?: boolean,
    maxWidth?: string
  }
>(({ className, hiddenOnMobile, priorityOnMobile, truncate = false, maxWidth, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-3 sm:p-4 align-middle [&:has([role=checkbox])]:pr-0", 
      hiddenOnMobile && "hidden sm:table-cell",
      priorityOnMobile === 'high' && "font-medium",
      priorityOnMobile === 'medium' && "text-sm sm:text-base",
      priorityOnMobile === 'low' && "text-xs text-muted-foreground sm:text-sm sm:text-foreground",
      truncate && "truncate",
      maxWidth && `max-w-[${maxWidth}]`,
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-3 text-xs sm:text-sm text-muted-foreground sm:mt-4", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
