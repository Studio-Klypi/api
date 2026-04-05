import { Injectable } from '@nestjs/common';
import { DatabaseService } from './common/database/database.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AppService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mailer: MailerService,
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

    const allOk = Object.values(results).every((r) => r.status === 'ok');

    return { status: allOk ? 'healthy' : 'unhealthy', services: results };
  }
}
