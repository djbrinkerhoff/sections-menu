import { applyImageRadius, getImageRadiusIndex, IMAGE_RADIUS_STOPS } from './image-radius';
import { createLabeledRangeGroup } from './range-control';

export interface SingleImageControlsHandle {
  cleanup(): void;
}

export function initSingleImageControls(
  singleImageRoot: HTMLElement,
  container: HTMLElement,
  onStateChange: () => void = () => {},
): SingleImageControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';
  applyImageRadius(singleImageRoot, singleImageRoot.dataset.radius);

  wrapper.appendChild(createLabeledRangeGroup({
    name: 'radius',
    label: 'Border radius',
    steps: IMAGE_RADIUS_STOPS.map((stop) => stop.label),
    initialIndex: getImageRadiusIndex(singleImageRoot.dataset.radius),
    onInput(stepIndex) {
      const stop = IMAGE_RADIUS_STOPS[stepIndex];
      if (!stop) return;
      applyImageRadius(singleImageRoot, stop.value);
      onStateChange();
    },
    signal,
  }));

  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
