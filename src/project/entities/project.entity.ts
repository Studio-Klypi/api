import { Nullable } from '../../types/primitives';

export class ProjectEntity {
  id: number;
  slug: string;
  title: string;
  description: string;
  banner: Nullable<string>;
  status: string;
  visibility: string;
  sections: any;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Nullable<Date>;

  constructor(partial: Partial<ProjectEntity>) {
    Object.assign(this, partial);
  }
}
