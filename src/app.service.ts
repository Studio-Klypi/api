import { Injectable } from '@nestjs/common';
import { DatabaseService } from './common/database/database.service';
import { MailerService } from '@nestjs-modules/mailer';
import { StorageService } from './common/storage/storage.service';

@Injectable()
export class AppService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mailer: MailerService,
    private readonly storage: StorageService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const results: Record<string, { status: string; message?: string }> = {};

    try {
      await this.db.$queryRaw`SELECT 1`;
      results.database = { status: 'ok' };
    } catch (e) {
      results.database = { status: 'error', message: (e as Error).message };
    }

    try {
      const transporter = (this.mailer as any).transporter;
      await transporter.verify();
      results.smtp = { status: 'ok' };
    } catch (e) {
      results.smtp = { status: 'error', message: (e as Error).message };
    }

    try {
      await this.storage.ping();
      results.s3 = { status: 'ok' };
    } catch (e: any) {
      results.s3 = {
        status: 'error',
        message: `${e.name}: ${e.message} (HTTP ${e.$metadata?.httpStatusCode ?? 'N/A'})`,
      };
    }

    const allOk = Object.values(results).every((r) => r.status === 'ok');

    return { status: allOk ? 'healthy' : 'unhealthy', services: results };
  }
}
