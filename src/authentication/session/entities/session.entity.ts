import { Nullable } from '../../../types/primitives';

export class SessionEntity {
  sid: string;
  userId: number;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Nullable<Date>;

  constructor(partial: SessionEntity) {
    Object.assign(this, partial);
  }
}
