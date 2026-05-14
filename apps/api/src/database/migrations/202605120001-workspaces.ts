import { MigrationInterface, QueryRunner } from "typeorm";

export class Workspaces2026051200010 implements MigrationInterface {
  name = "Workspaces2026051200010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`workspaces\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(120) NOT NULL,
        \`description\` text NOT NULL,
        \`ownerId\` char(36) NOT NULL,
        \`createdById\` char(36) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_workspaces_owner\` FOREIGN KEY (\`ownerId\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_workspaces_created_by\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`workspace_members\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`workspaceId\` char(36) NOT NULL,
        \`userId\` char(36) NOT NULL,
        \`role\` varchar(24) NOT NULL,
        \`addedById\` char(36) NULL,
        UNIQUE INDEX \`UQ_workspace_members_workspace_user\` (\`workspaceId\`, \`userId\`),
        INDEX \`IDX_workspace_members_workspace\` (\`workspaceId\`),
        INDEX \`IDX_workspace_members_user\` (\`userId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_workspace_members_workspace\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspaces\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_workspace_members_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_workspace_members_added_by\` FOREIGN KEY (\`addedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await queryRunner.hasColumn("collections", "workspaceId"))) {
      await queryRunner.query("ALTER TABLE `collections` ADD COLUMN `workspaceId` char(36) NULL");
    }

    if (!(await queryRunner.hasColumn("environments", "workspaceId"))) {
      await queryRunner.query("ALTER TABLE `environments` ADD COLUMN `workspaceId` char(36) NULL");
    }

    // Existing data was user-owned. This preserves it by creating one default
    // workspace per user and moving their collections/environments into it.
    const users = await queryRunner.query(
      "SELECT `id`, `username` FROM `users`",
    ) as Array<{ id: string; username: string }>;

    for (const user of users) {
      const workspaceId = await this.ensureDefaultWorkspace(queryRunner, user.id, user.username);
      await queryRunner.query(
        "UPDATE `collections` SET `workspaceId` = ? WHERE `userId` = ? AND `workspaceId` IS NULL",
        [workspaceId, user.id],
      );
      await queryRunner.query(
        "UPDATE `environments` SET `workspaceId` = ? WHERE `userId` = ? AND `workspaceId` IS NULL",
        [workspaceId, user.id],
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`collections\`
      MODIFY \`workspaceId\` char(36) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`environments\`
      MODIFY \`workspaceId\` char(36) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`collections\`
      ADD INDEX \`IDX_collections_workspace\` (\`workspaceId\`)
    `);
    await queryRunner.query(`
      ALTER TABLE \`environments\`
      ADD INDEX \`IDX_environments_workspace\` (\`workspaceId\`)
    `);
    await queryRunner.query(`
      ALTER TABLE \`collections\`
      ADD CONSTRAINT \`FK_collections_workspace\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspaces\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`environments\`
      ADD CONSTRAINT \`FK_environments_workspace\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspaces\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `environments` DROP FOREIGN KEY `FK_environments_workspace`");
    await queryRunner.query("ALTER TABLE `collections` DROP FOREIGN KEY `FK_collections_workspace`");
    await queryRunner.query("ALTER TABLE `environments` DROP INDEX `IDX_environments_workspace`");
    await queryRunner.query("ALTER TABLE `collections` DROP INDEX `IDX_collections_workspace`");
    await queryRunner.query("ALTER TABLE `environments` DROP COLUMN `workspaceId`");
    await queryRunner.query("ALTER TABLE `collections` DROP COLUMN `workspaceId`");
    await queryRunner.query("DROP TABLE `workspace_members`");
    await queryRunner.query("DROP TABLE `workspaces`");
  }

  private async ensureDefaultWorkspace(
    queryRunner: QueryRunner,
    userId: string,
    username: string,
  ): Promise<string> {
    const existing = await queryRunner.query(
      `SELECT w.id FROM workspaces w
       INNER JOIN workspace_members wm ON wm.workspaceId = w.id
       WHERE wm.userId = ? AND wm.role = 'OWNER'
       ORDER BY w.createdAt ASC
       LIMIT 1`,
      [userId],
    ) as Array<{ id: string }>;

    if (existing[0]?.id) {
      return existing[0].id;
    }

    const workspaceId = await queryRunner.query("SELECT UUID() AS id") as Array<{ id: string }>;
    const memberId = await queryRunner.query("SELECT UUID() AS id") as Array<{ id: string }>;
    const id = workspaceId[0].id as string;
    const ownerMemberId = memberId[0].id as string;
    const name = username ? `${username}'s Workspace` : "My Workspace";

    await queryRunner.query(
      "INSERT INTO `workspaces` (`id`, `name`, `description`, `ownerId`, `createdById`) VALUES (?, ?, '', ?, ?)",
      [id, name, userId, userId],
    );
    await queryRunner.query(
      "INSERT INTO `workspace_members` (`id`, `workspaceId`, `userId`, `role`, `addedById`) VALUES (?, ?, ?, 'OWNER', ?)",
      [ownerMemberId, id, userId, userId],
    );

    return id;
  }
}
