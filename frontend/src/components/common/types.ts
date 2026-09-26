export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'info'

export interface TabItem<Key extends string> {
  key: Key
  label: string
  /** 건수 표시. undefined이면 표시하지 않고, null이면 '-' */
  count?: string | number | null
}
