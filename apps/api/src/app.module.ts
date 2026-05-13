import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { getTypeOrmConfig } from "./database/typeorm.config";
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CollectionsModule } from "./modules/collections/collections.module";
import { FoldersModule } from "./modules/folders/folders.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { EnvironmentsModule } from "./modules/environments/environments.module";
import { CookiesModule } from "./modules/cookies/cookies.module";
import { HistoryModule } from "./modules/history/history.module";
import { ExecutionModule } from "./modules/execution/execution.module";
import { ImportExportModule } from "./modules/import-export/import-export.module";
import { BackupModule } from "./modules/backup/backup.module";
import { TrpcModule } from "./modules/trpc/trpc.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { AppConfigModule } from "./modules/app-config/app-config.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    UsersModule,
    WorkspacesModule,
    AuthModule,
    CollectionsModule,
    FoldersModule,
    RequestsModule,
    EnvironmentsModule,
    CookiesModule,
    HistoryModule,
    TrpcModule,
    ExecutionModule,
    ImportExportModule,
    BackupModule,
    AppConfigModule,
  ],
})
export class AppModule {}
