import { Injectable } from '@nestjs/common';
import { DatabaseService } from './common/database/database.service';
import { MailerService } from '@nestjs-modules/mailer';
import { StorageService } from './common/storage/storage.service';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      const transporter = (this.mailer as any).transporter;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message: `${e.name}: ${e.message} (HTTP ${e.$metadata?.httpStatusCode ?? 'N/A'})`,
      };
    }

    const allOk = Object.values(results).every((r) => r.status === 'ok');

    return { status: allOk ? 'healthy' : 'unhealthy', services: results };
  }
}
