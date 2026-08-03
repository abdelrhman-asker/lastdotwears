export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

export interface ContactMessageRecord {
  id: string;
  status: ContactStatus;
  name: string;
  email: string;
  phone: string | null;
  orderNumber: string | null;
  subject: string;
  message: string;
  adminNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: ContactStatus;
}
