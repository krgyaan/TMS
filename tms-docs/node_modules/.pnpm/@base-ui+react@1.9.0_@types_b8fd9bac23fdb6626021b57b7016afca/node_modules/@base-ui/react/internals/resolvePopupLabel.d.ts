interface PopupLabelProps {
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  render?: unknown;
}
export declare function resolvePopupLabel(props: PopupLabelProps, activeTriggerElement: Element | null, activeTriggerId: string | null): string | undefined;
export {};