/**
 * Fotodokumentation pr. ordre/palle (v0.4.0).
 * Regler: højst MAX_PHOTOS_PER_ORDER billeder pr. ordre i alt; ingen nye
 * billeder på en afsluttet ordre. Komprimering sker i UI-laget (browser-
 * specifikt); servicen modtager det færdige billede.
 */
import { NotFoundError, ValidationError } from '@platform/config';

import type { RepositoriesV4 } from './interfaces';
import { MAX_PHOTOS_PER_ORDER, type PhotoRecord } from './types';

export interface PreparedPhoto {
  data: Blob;
  width: number;
  height: number;
  mimeType: string;
}

export class PhotoService {
  constructor(private readonly repos: Pick<RepositoriesV4, 'orders' | 'photos'>) {}

  listForOrder(orderId: string): Promise<PhotoRecord[]> {
    return this.repos.photos.listForOrder(orderId);
  }

  async remainingSlots(orderId: string): Promise<number> {
    const existing = await this.repos.photos.listForOrder(orderId);
    return Math.max(0, MAX_PHOTOS_PER_ORDER - existing.length);
  }

  async addPhoto(input: {
    companyId: string;
    orderId: string;
    palletId: string | null;
    userId: string;
    photo: PreparedPhoto;
  }): Promise<PhotoRecord> {
    const order = await this.repos.orders.getById(input.orderId);
    if (!order) throw new NotFoundError('Ordre');
    if (order.status === 'completed') {
      throw new ValidationError('Ordren er afsluttet — der kan ikke tilføjes flere billeder.');
    }
    if ((await this.remainingSlots(input.orderId)) <= 0) {
      throw new ValidationError(`Der kan højst gemmes ${MAX_PHOTOS_PER_ORDER} billeder pr. ordre.`);
    }
    if (input.palletId) {
      const pallets = await this.repos.orders.listPallets(input.orderId);
      if (!pallets.some((p) => p.id === input.palletId)) throw new NotFoundError('Palle');
    }
    return this.repos.photos.add(
      {
        companyId: input.companyId,
        orderId: input.orderId,
        palletId: input.palletId,
        createdBy: input.userId,
        width: input.photo.width,
        height: input.photo.height,
        sizeBytes: input.photo.data.size,
        mimeType: input.photo.mimeType,
      },
      input.photo.data,
    );
  }

  getPhotoData(photoId: string): Promise<Blob | null> {
    return this.repos.photos.getData(photoId);
  }

  async removePhoto(orderId: string, photoId: string): Promise<void> {
    const order = await this.repos.orders.getById(orderId);
    if (order?.status === 'completed') {
      throw new ValidationError('Ordren er afsluttet og kan ikke ændres.');
    }
    await this.repos.photos.remove(photoId);
  }
}
