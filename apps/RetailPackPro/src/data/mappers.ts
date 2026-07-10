/**
 * Rå-række (snake_case, sådan Postgres/Supabase returnerer dem) → domænetype
 * (camelCase). ALT kendskab til databasens kolonnenavne er isoleret her —
 * repositories bruger disse, resten af appen ser aldrig en rå database-række.
 */
import type {
  Customer,
  PackagingItem,
  PackFlowStep,
  PackProfile,
  PackSession,
  Product,
  ReferenceImage,
} from './types';

// Rå-række-typer holdes bevidst løse (Record) i stedet for at generere typer
// fra databasen — det er den eneste fil, der behøver at vide noget om det.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    logoUrl: row.logo_url,
    notes: row.notes,
    packFlowMode: row.pack_flow_mode,
  };
}

export function mapProductRow(row: any): Product {
  return {
    id: row.id,
    companyId: row.company_id,
    ean: row.ean,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    category: row.category,
  };
}

export function mapPackagingItemRow(row: any): PackagingItem {
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    name: row.name,
    imageUrl: row.image_url,
    dimensions: row.dimensions,
    notes: row.notes,
  };
}

export function mapPackProfileRow(row: any): PackProfile {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id,
    name: row.name,
    boxItemId: row.box_item_id,
    innerPackagingItemId: row.inner_packaging_item_id,
    dividerItemId: row.divider_item_id,
    cornerProtectorItemId: row.corner_protector_item_id,
    palletItemId: row.pallet_item_id,
    placementPatternImageUrl: row.placement_pattern_image_url,
    maxHeightCm: row.max_height_cm,
    maxWeightKg: row.max_weight_kg,
    layerCount: row.layer_count,
    mixedPalletAllowed: row.mixed_pallet_allowed,
    labelPosition: row.label_position,
    ssccLabelRequired: row.sscc_label_required,
    foilType: row.foil_type,
    overhangAllowed: row.overhang_allowed,
    specialInstructions: row.special_instructions_richtext,
    version: row.version,
    status: row.status,
    effectiveFrom: row.effective_from,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    lockedBy: row.locked_by,
    lockedAt: row.locked_at,
    publishedAt: row.published_at,
    lineageId: row.lineage_id,
  };
}

export function mapPackFlowStepRow(row: any): PackFlowStep {
  return {
    id: row.id,
    companyId: row.company_id,
    stepKey: row.step_key,
    sortOrder: row.sort_order,
    enabled: row.enabled,
  };
}

export function mapReferenceImageRow(row: any): ReferenceImage {
  return {
    id: row.id,
    packProfileId: row.pack_profile_id,
    url: row.url,
    sortOrder: row.sort_order,
    caption: row.caption,
    relatedStep: row.related_step,
  };
}

export function mapPackSessionRow(row: any): PackSession {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    customerId: row.customer_id,
    productId: row.product_id,
    packProfileId: row.pack_profile_id,
    scannedCode: row.scanned_code,
    stepsCompleted: row.steps_completed,
    approvedAt: row.approved_at,
    deviceInfo: row.device_info,
  };
}
