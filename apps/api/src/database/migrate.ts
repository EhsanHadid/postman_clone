import AppDataSource from "./data-source";

async function run(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
}

run().catch((error) => {
  console.error("Migration failed", error);
  process.exit(1);
});
