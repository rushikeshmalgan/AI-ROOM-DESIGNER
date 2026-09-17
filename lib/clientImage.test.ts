import { describe, it, expect } from 'vitest';
import { computeResizeDimensions } from '@/lib/clientImage';

describe('computeResizeDimensions', () => {
  it('leaves an image alone when already under the max dimension', () => {
    const result = computeResizeDimensions(1200, 800, 2000);
    expect(result).toEqual({ width: 1200, height: 800, needsResize: false });
  });

  it('leaves an image alone when exactly at the max dimension', () => {
    const result = computeResizeDimensions(2000, 1000, 2000);
    expect(result.needsResize).toBe(false);
  });

  it('scales down a landscape image preserving aspect ratio', () => {
    const result = computeResizeDimensions(4000, 2000, 2000);
    expect(result.needsResize).toBe(true);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1000);
  });

  it('scales down a portrait image preserving aspect ratio', () => {
    const result = computeResizeDimensions(2000, 4000, 2000);
    expect(result.needsResize).toBe(true);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(2000);
  });
});
