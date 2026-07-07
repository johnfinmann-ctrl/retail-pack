import { describe, expect, it, vi } from 'vitest';

import { captureWithoutBlockingFlow, type CameraService } from '../types';

describe('captureWithoutBlockingFlow', () => {
  it('returnerer captured, når kameraet virker', async () => {
    const fakeCamera: CameraService = {
      capture: async () => ({
        blob: new Blob(),
        width: 800,
        height: 600,
        capturedAt: new Date().toISOString(),
      }),
    };
    const onFailure = vi.fn();
    const result = await captureWithoutBlockingFlow(fakeCamera, onFailure);
    expect(result.status).toBe('captured');
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('returnerer skipped_due_to_failure i stedet for at kaste en fejl, når kameraet fejler', async () => {
    const brokenCamera: CameraService = {
      capture: async () => {
        throw new Error('permission denied');
      },
    };
    const onFailure = vi.fn();
    const result = await captureWithoutBlockingFlow(brokenCamera, onFailure);
    expect(result.status).toBe('skipped_due_to_failure');
    expect(onFailure).toHaveBeenCalledWith('unknown');
  });
});
