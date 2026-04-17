export const IMAGE_RADIUS_STOPS = [
  { value: '0', label: 'Sharp', imageRadius: '0px', buttonRadius: '0px' },
  { value: '4', label: 'Soft', imageRadius: '4px', buttonRadius: '4px' },
  { value: '8', label: 'Rounded', imageRadius: '8px', buttonRadius: '8px' },
  { value: '16', label: 'Very Round', imageRadius: '16px', buttonRadius: '9999px' },
] as const;

export type ImageRadiusStop = (typeof IMAGE_RADIUS_STOPS)[number];
export type ImageRadiusValue = ImageRadiusStop['value'];

export const DEFAULT_IMAGE_RADIUS: ImageRadiusValue = '8';

export function getImageRadiusStop(rawValue: string | undefined): ImageRadiusStop {
  return IMAGE_RADIUS_STOPS.find((stop) => stop.value === rawValue) ?? IMAGE_RADIUS_STOPS[2];
}

export function getImageRadiusIndex(rawValue: string | undefined): number {
  const activeStop = getImageRadiusStop(rawValue);
  return IMAGE_RADIUS_STOPS.findIndex((stop) => stop.value === activeStop.value);
}

export function applyImageRadius(root: HTMLElement, rawValue: string | undefined): ImageRadiusStop {
  const activeStop = getImageRadiusStop(rawValue);
  root.dataset.radius = activeStop.value;
  root.style.setProperty('--image-radius', activeStop.imageRadius);
  root.style.setProperty('--image-button-radius', activeStop.buttonRadius);
  return activeStop;
}
