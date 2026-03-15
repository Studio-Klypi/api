import { Exclude } from 'class-transformer';
import * as primitives from '../../types/primitives';

export class TestimonialEntity {
  id: number;
  firstName: string;
  lastName: string;
  @Exclude()
  email: string;
  role: primitives.Nullable<string>;
  avatar: primitives.Nullable<string>;
  text: string;
  createdAt: Date;
  @Exclude()
  verifiedAt: primitives.Nullable<Date>;
  @Exclude()
  processedAt: primitives.Nullable<Date>;

  constructor(partial: Partial<TestimonialEntity>) {
    Object.assign(this, partial);
  }
}
