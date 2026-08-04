// Aircraft data processing helpers for WebGL rendering

const altitudeStateLimit = 1000; // meters

export const getFormattedValue = (rawValue: number, maxFractionDigits: number) => {
  const NumberFormatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    useGrouping: false,
    maximumFractionDigits: maxFractionDigits
  });
  return NumberFormatter.format(rawValue);
};

export const getRotation = (trueTrack: number, verticalRate: number, altitude: number) => {
  if (verticalRate > 0 && altitude < altitudeStateLimit) return 0.0;
  if (verticalRate < 0 && altitude < altitudeStateLimit) return 0.0;
  return trueTrack;
};

// Calculate HSL/HEX color based on altitude gradient
export const getColorByAltitude = (altitudeMeters: number, isOnGround: boolean, isSelected: boolean) => {
  if (isSelected) return '#3b82f6'; // Blue highlight
  if (isOnGround) return '#f59e0b'; // Amber for ground

  let percent = (altitudeMeters / 13000) * 100;
  if (percent > 100) percent = 100;
  if (percent < 0) percent = 0;

  let r = 0, g = 0, b = 0;
  if (percent < 50) {
    r = 255;
    g = Math.round(5.1 * percent);
  } else {
    g = 255;
    r = Math.round(510 - 5.10 * percent);
  }

  const h = r * 0x10000 + g * 0x100 + b * 0x1;
  return '#' + ('000000' + h.toString(16)).slice(-6);
};

export const getStatusText = (isOnGround: boolean, verticalRate: number, altitude: number): string => {
  if (isOnGround || altitude <= 0) return 'On Ground';
  if (verticalRate > 0 && altitude < altitudeStateLimit) return 'Taking off';
  if (verticalRate < 0 && altitude < altitudeStateLimit) return 'Landing';
  return 'En Route';
};
