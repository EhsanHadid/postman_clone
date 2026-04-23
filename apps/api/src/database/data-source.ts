import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { getTypeOrmConfig } from "./typeorm.config";

export const AppDataSource = new DataSource({
  ...(getTypeOrmConfig() as DataSourceOptions),
  migrations: [__dirname + "/migrations/*.{ts,js}"],
});

export default AppDataSource;
