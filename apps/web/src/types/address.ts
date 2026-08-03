export interface Address {
  id: string;
  userId: string;
  label: string;
  recipientFirstName: string;
  recipientLastName: string;
  phone: string;
  governorateCode: string;
  governorateName: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  deliveryNotes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
