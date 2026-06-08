// Shared Recharts tooltip prop types
// Avoids using `any` in CustomTooltip components across charts

export interface TooltipPayloadEntry {
  dataKey:  string
  value:    number
  color:    string
  name:     string
  payload:  Record<string, unknown>
}

export interface RechartsTooltipProps {
  active?:  boolean
  payload?: TooltipPayloadEntry[]
  label?:   string
}
