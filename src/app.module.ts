import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { DatabaseModule } from './common/database/database.module';

@Module({
  imports: [ProjectModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
