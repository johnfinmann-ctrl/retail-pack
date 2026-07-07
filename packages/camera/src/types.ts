/**
 * Camera Service — kontrakt (PRS §17). Aktiveres kun når en virksomheds
 * pakkeprofil kræver det. Fejler ALDRIG blokerende — hvis kameraet ikke
 * virker/nægtes, skal flowet kunne fortsætte og markere "foto mangler"
 * (PRS §4.2 afvigelsesscenarie).
 */
export interface CapturedPhoto {
  blob: Blob;
  width: number;
  height: number;
  capturedAt: string; // ISO 8601
}

export type CameraFailureReason = 'permission_denied' | 'no_device' | 'unknown';

export interface CameraService {
  capture(options?: { compressToMaxWidth?: number }): Promise<CapturedPhoto>;
}

export interface CameraCaptureOutcome {
  status: 'captured' | 'skipped_due_to_failure';
  photo?: CapturedPhoto;
  failureReason?: CameraFailureReason;
}

/**
 * Wrapper der ALDRIG lader en kamera-fejl stoppe pakkeflowet — den
 * konverterer en fejl til et "skipped"-resultat, som den kaldende app kan
 * vise som "foto mangler" og sende videre til Admin (PRS §4.2/§17).
 */
export async function captureWithoutBlockingFlow(
  camera: CameraService,
  onFailure: (reason: CameraFailureReason) => void,
): Promise<CameraCaptureOutcome> {
  try {
    const photo = await camera.capture();
    return { status: 'captured', photo };
  } catch {
    const reason: CameraFailureReason = 'unknown';
    onFailure(reason);
    return { status: 'skipped_due_to_failure', failureReason: reason };
  }
}
