export const ZOOM_TRIGGER_SELECTOR = '[data-zoom-target]';

export interface ZoomTarget {
  readonly trigger: HTMLElement;
  readonly image: HTMLImageElement;
  readonly source: string;
  readonly alt: string;
  readonly group: string | null;
}

function trimValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getZoomImage(trigger: HTMLElement): HTMLImageElement | null {
  return trigger.querySelector<HTMLImageElement>('img');
}

function isHiddenTarget(trigger: HTMLElement): boolean {
  return Boolean(trigger.closest('[hidden]'));
}

export function getZoomTrigger(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(ZOOM_TRIGGER_SELECTOR);
}

export function resolveZoomTarget(trigger: HTMLElement): ZoomTarget | null {
  const image = getZoomImage(trigger);
  if (!(image instanceof HTMLImageElement)) return null;

  const alt = image.alt.trim() || 'Expanded image';
  const source = trimValue(trigger.dataset.zoomSrc)
    ?? trimValue(image.dataset.zoomSrc)
    ?? trimValue(image.currentSrc)
    ?? trimValue(image.src);

  if (!source) return null;

  return {
    trigger,
    image,
    source,
    alt,
    group: trimValue(trigger.dataset.zoomGroup),
  };
}

export function resolveZoomCollection(root: ParentNode, trigger: HTMLElement): ZoomTarget[] {
  const group = trimValue(trigger.dataset.zoomGroup);
  const triggers = Array.from(root.querySelectorAll<HTMLElement>(ZOOM_TRIGGER_SELECTOR))
    .filter((candidate) => {
      if (isHiddenTarget(candidate)) return false;
      if (!group) return candidate === trigger;
      return candidate.dataset.zoomGroup?.trim() === group;
    });

  return triggers
    .map(resolveZoomTarget)
    .filter((target): target is ZoomTarget => target !== null);
}
