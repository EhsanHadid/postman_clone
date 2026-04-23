import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema2026042300010 implements MigrationInterface {
  name = "InitialSchema2026042300010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`username\` varchar(64) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        UNIQUE INDEX \`IDX_users_username\` (\`username\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`sessionToken\` varchar(128) NOT NULL,
        \`userId\` char(36) NOT NULL,
        UNIQUE INDEX \`IDX_sessions_token\` (\`sessionToken\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_sessions_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`collections\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`userId\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` text NOT NULL,
        \`sortOrder\` int NOT NULL DEFAULT 0,
        \`authType\` varchar(24) NULL,
        \`authConfig\` json NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_collections_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`folders\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`collectionId\` char(36) NOT NULL,
        \`parentFolderId\` char(36) NULL,
        \`name\` varchar(120) NOT NULL,
        \`sortOrder\` int NOT NULL DEFAULT 0,
        \`authType\` varchar(24) NULL,
        \`authConfig\` json NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_folders_collection\` FOREIGN KEY (\`collectionId\`) REFERENCES \`collections\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_folders_parent\` FOREIGN KEY (\`parentFolderId\`) REFERENCES \`folders\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`requests\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`collectionId\` char(36) NOT NULL,
        \`folderId\` char(36) NULL,
        \`name\` varchar(120) NOT NULL,
        \`protocolType\` varchar(24) NOT NULL,
        \`method\` varchar(8) NOT NULL DEFAULT 'GET',
        \`url\` text NOT NULL,
        \`trpcProcedurePath\` varchar(255) NULL,
        \`headers\` json NOT NULL,
        \`queryParams\` json NOT NULL,
        \`bodyType\` varchar(40) NOT NULL DEFAULT 'none',
        \`body\` longtext NOT NULL,
        \`formData\` json NOT NULL,
        \`authType\` varchar(24) NULL,
        \`authConfig\` json NULL,
        \`preRequestScript\` longtext NOT NULL,
        \`postResponseScript\` longtext NOT NULL,
        \`sortOrder\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_requests_collection\` FOREIGN KEY (\`collectionId\`) REFERENCES \`collections\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_requests_folder\` FOREIGN KEY (\`folderId\`) REFERENCES \`folders\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`request_snapshots\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`requestId\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`method\` varchar(8) NOT NULL DEFAULT 'GET',
        \`url\` text NOT NULL,
        \`body\` longtext NOT NULL,
        \`headers\` json NOT NULL,
        \`queryParams\` json NOT NULL,
        \`bodyType\` varchar(40) NOT NULL DEFAULT 'none',
        \`authType\` varchar(24) NULL,
        \`authConfig\` json NULL,
        \`preRequestScript\` longtext NOT NULL,
        \`postResponseScript\` longtext NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_request_snapshots_request\` FOREIGN KEY (\`requestId\`) REFERENCES \`requests\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`environments\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`userId\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`isGlobal\` tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_environments_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`environment_variables\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`environmentId\` char(36) NOT NULL,
        \`key\` varchar(120) NOT NULL,
        \`value\` longtext NOT NULL,
        \`enabled\` tinyint NOT NULL DEFAULT 1,
        \`description\` text NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_environment_variables_environment\` FOREIGN KEY (\`environmentId\`) REFERENCES \`environments\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cookies\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`userId\` char(36) NOT NULL,
        \`domain\` varchar(191) NOT NULL,
        \`path\` varchar(191) NOT NULL DEFAULT '/',
        \`name\` varchar(191) NOT NULL,
        \`value\` longtext NOT NULL,
        \`secure\` tinyint NOT NULL DEFAULT 0,
        \`httpOnly\` tinyint NOT NULL DEFAULT 0,
        \`sameSite\` varchar(24) NULL,
        \`expiresAt\` datetime NULL,
        UNIQUE INDEX \`IDX_cookies_unique\` (\`userId\`, \`domain\`, \`path\`, \`name\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_cookies_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`history_entries\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`userId\` char(36) NOT NULL,
        \`requestId\` char(36) NULL,
        \`protocolType\` varchar(24) NOT NULL,
        \`method\` varchar(8) NOT NULL,
        \`url\` text NOT NULL,
        \`requestHeaders\` json NOT NULL,
        \`requestBody\` longtext NOT NULL,
        \`responseStatus\` int NOT NULL,
        \`responseHeaders\` json NOT NULL,
        \`responseBody\` longtext NOT NULL,
        \`durationMs\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_history_entries_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_history_entries_request\` FOREIGN KEY (\`requestId\`) REFERENCES \`requests\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`backup_metadata\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`userId\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`version\` int NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_backup_metadata_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE `backup_metadata`");
    await queryRunner.query("DROP TABLE `history_entries`");
    await queryRunner.query("DROP TABLE `cookies`");
    await queryRunner.query("DROP TABLE `environment_variables`");
    await queryRunner.query("DROP TABLE `environments`");
    await queryRunner.query("DROP TABLE `request_snapshots`");
    await queryRunner.query("DROP TABLE `requests`");
    await queryRunner.query("DROP TABLE `folders`");
    await queryRunner.query("DROP TABLE `collections`");
    await queryRunner.query("DROP TABLE `sessions`");
    await queryRunner.query("DROP TABLE `users`");
  }
}
