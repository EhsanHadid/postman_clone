import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import {
  BackupMetadataEntity,
  CollectionEntity,
  CookieEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  FolderEntity,
  HistoryEntryEntity,
  RequestEntity,
  RequestSnapshotEntity,
  SessionEntity,
  UserEntity,
} from "./entities";

export const getTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: "mysql",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "root",
  database: process.env.DB_NAME ?? "postman_clone",
  entities: [
    UserEntity,
    SessionEntity,
    CollectionEntity,
    FolderEntity,
    RequestEntity,
    RequestSnapshotEntity,
    EnvironmentEntity,
    EnvironmentVariableEntity,
    CookieEntity,
    HistoryEntryEntity,
    BackupMetadataEntity,
  ],
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: process.env.DB_SYNCHRONIZE === "true",
  logging: false,
});
