export interface ShippingRateRecord {
  id: string;
  governorateCode: string;
  governorateName: string;
  feePiasters: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ShippingRateWriteInput = Omit<ShippingRateRecord, 'id' | 'createdAt' | 'updatedAt'>;
