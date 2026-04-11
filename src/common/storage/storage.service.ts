import { Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { mkdir, unlink, access } from 'fs/promises';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly baseDir = join(
    process.cwd(),
    process.env.UPLOADS_DIR || 'uploads',
  );

  async onModuleInit() {
    await mkdir(this.baseDir, { recursive: true });
  }

  async save(
    directory: string,
    filename: string,
    buffer: Buffer,
  ): Promise<string> {
    const dir = join(this.baseDir, directory);
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, filename);
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, buffer);

    return join(directory, filename);
  }

  async delete(relativePath: string): Promise<void> {
    const filePath = join(this.baseDir, relativePath);
    try {
      await unlink(filePath);
    } catch {
      // File already deleted or doesn't exist
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(join(this.baseDir, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  getAbsolutePath(relativePath: string): string {
    return join(this.baseDir, relativePath);
  }
}
