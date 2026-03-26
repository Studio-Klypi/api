import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { AuthGuard } from '../guards/auth.guard';

@Global()
@Module({
  providers: [DatabaseService, AuthGuard],
  controllers: [DatabaseController],
  exports: [DatabaseService, AuthGuard],
})
export class DatabaseModule {}
