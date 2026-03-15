import { Exclude } from 'class-transformer';
import * as primitives from '../../types/primitives';

export class ContactEntity {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  createdAt: Date;
  @Exclude() processedAt: primitives.Nullable<Date>;

  constructor(partial: Partial<ContactEntity>) {
    Object.assign(this, partial);
  }
}
