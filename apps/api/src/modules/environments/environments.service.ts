import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EnvironmentEntity,
  EnvironmentVariableEntity,
} from "../../database/entities";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import {
  CreateEnvironmentDto,
  CreateEnvironmentVariableDto,
  UpdateEnvironmentDto,
  UpdateEnvironmentVariableDto,
} from "./dto/environment.dto";

const STARTER_ENVIRONMENTS = [
  {
    name: "Global",
    isGlobal: true,
    variables: [
      {
        key: "base_url",
        value: "http://localhost:3001",
        description: "Shared base URL used across requests",
      },
      {
        key: "token",
        value: "",
        description: "Shared bearer token placeholder",
      },
      {
        key: "api_version",
        value: "v1",
        description: "Example API version variable",
      },
    ],
  },
  {
    name: "Local",
    isGlobal: false,
    variables: [
      {
        key: "base_url",
        value: "http://localhost:3001",
        description: "Starter local API URL",
      },
      {
        key: "token",
        value: "",
        description: "Local environment token placeholder",
      },
    ],
  },
  {
    name: "Staging",
    isGlobal: false,
    variables: [
      {
        key: "base_url",
        value: "https://staging.example.com/api",
        description: "Starter staging API URL",
      },
      {
        key: "token",
        value: "",
        description: "Staging environment token placeholder",
      },
    ],
  },
  {
    name: "Production",
    isGlobal: false,
    variables: [
      {
        key: "base_url",
        value: "https://api.example.com",
        description: "Starter production API URL",
      },
      {
        key: "token",
        value: "",
        description: "Production environment token placeholder",
      },
    ],
  },
] as const;

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepository: Repository<EnvironmentEntity>,
    @InjectRepository(EnvironmentVariableEntity)
    private readonly variableRepository: Repository<EnvironmentVariableEntity>,
    private readonly permissions: WorkspacePermissionsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listForDefaultWorkspace(userId: string) {
    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    return this.list(userId, workspaceId);
  }

  async list(userId: string, workspaceId: string) {
    await this.permissions.requireMember(userId, workspaceId);
    await this.ensureStarterEnvironments(userId, workspaceId);

    return this.environmentRepository.find({
      where: { workspaceId },
      relations: { variables: true },
      order: {
        isGlobal: "DESC",
        name: "ASC",
      },
    });
  }

  async createInDefaultWorkspace(
    userId: string,
    dto: CreateEnvironmentDto,
  ): Promise<EnvironmentEntity> {
    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    return this.create(userId, workspaceId, dto);
  }

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateEnvironmentDto,
  ): Promise<EnvironmentEntity> {
    await this.permissions.requireEnvironmentManage(userId, workspaceId);

    if (dto.isGlobal) {
      const currentGlobal = await this.environmentRepository.findOne({
        where: { workspaceId, isGlobal: true },
      });

      if (currentGlobal) {
        currentGlobal.isGlobal = false;
        await this.environmentRepository.save(currentGlobal);
      }
    }

    return this.environmentRepository.save(
      this.environmentRepository.create({
        userId,
        workspaceId,
        name: dto.name,
        isGlobal: dto.isGlobal ?? false,
      }),
    );
  }

  async update(
    userId: string,
    environmentId: string,
    dto: UpdateEnvironmentDto,
  ): Promise<EnvironmentEntity> {
    const environment = await this.findOwned(userId, environmentId);
    await this.permissions.requireEnvironmentManage(userId, environment.workspaceId);

    if (dto.isGlobal) {
      await this.unsetOtherGlobals(environment.workspaceId, environment.id);
    }

    Object.assign(environment, {
      name: dto.name ?? environment.name,
      isGlobal: dto.isGlobal ?? environment.isGlobal,
    });

    return this.environmentRepository.save(environment);
  }

  async delete(userId: string, environmentId: string): Promise<void> {
    const environment = await this.findOwned(userId, environmentId);
    await this.permissions.requireEnvironmentManage(userId, environment.workspaceId);
    await this.environmentRepository.remove(environment);
  }

  async addVariable(
    userId: string,
    environmentId: string,
    dto: CreateEnvironmentVariableDto,
  ): Promise<EnvironmentVariableEntity> {
    const environment = await this.findOwned(userId, environmentId);
    await this.permissions.requireEnvironmentManage(userId, environment.workspaceId);

    return this.variableRepository.save(
      this.variableRepository.create({
        environmentId,
        key: dto.key,
        value: dto.value,
        enabled: dto.enabled ?? true,
        description: dto.description ?? null,
      }),
    );
  }

  async updateVariable(
    userId: string,
    variableId: string,
    dto: UpdateEnvironmentVariableDto,
  ): Promise<EnvironmentVariableEntity> {
    const variable = await this.findVariableOwned(userId, variableId);
    await this.permissions.requireEnvironmentManage(userId, variable.environment.workspaceId);

    Object.assign(variable, {
      key: dto.key ?? variable.key,
      value: dto.value ?? variable.value,
      enabled: dto.enabled ?? variable.enabled,
      description: dto.description ?? variable.description,
    });

    return this.variableRepository.save(variable);
  }

  async deleteVariable(userId: string, variableId: string): Promise<void> {
    const variable = await this.findVariableOwned(userId, variableId);
    await this.permissions.requireEnvironmentManage(userId, variable.environment.workspaceId);
    await this.variableRepository.remove(variable);
  }

  async ensureGlobalEnvironment(userId: string, workspaceId?: string): Promise<EnvironmentEntity> {
    const resolvedWorkspaceId = workspaceId ?? await this.workspacesService.ensureDefaultWorkspace(userId);
    await this.ensureStarterEnvironments(userId, resolvedWorkspaceId);

    const existing = await this.environmentRepository.findOne({
      where: { workspaceId: resolvedWorkspaceId, isGlobal: true },
      relations: { variables: true },
    });

    if (existing) {
      return existing;
    }

    return this.environmentRepository.save(
      this.environmentRepository.create({
        userId,
        workspaceId: resolvedWorkspaceId,
        name: "Global",
        isGlobal: true,
      }),
    );
  }

  async getVariableMap(
    userId: string,
    activeEnvironmentId?: string | null,
  ): Promise<Record<string, string>> {
    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    const environments = await this.environmentRepository.find({
      where: { workspaceId },
      relations: { variables: true },
    });

    const globalEnvironment = environments.find((environment) => environment.isGlobal);
    const activeEnvironment = activeEnvironmentId
      ? environments.find((environment) => environment.id === activeEnvironmentId)
      : undefined;

    const globalMap = this.environmentToMap(globalEnvironment);
    const activeMap = this.environmentToMap(activeEnvironment);

    return {
      ...globalMap,
      ...activeMap,
    };
  }

  async applyScriptMutations(
    userId: string,
    activeEnvironmentId: string | null | undefined,
    nextVariables: Record<string, string>,
  ): Promise<void> {
    if (!Object.keys(nextVariables).length) {
      return;
    }

    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    const globalEnvironment = await this.ensureGlobalEnvironment(userId, workspaceId);
    const targetEnvironment = activeEnvironmentId
      ? await this.findOwned(userId, activeEnvironmentId)
      : globalEnvironment;

    for (const [key, value] of Object.entries(nextVariables)) {
      let variable = await this.variableRepository.findOne({
        where: { environmentId: targetEnvironment.id, key },
      });

      if (!variable && targetEnvironment.id !== globalEnvironment.id) {
        variable = await this.variableRepository.findOne({
          where: { environmentId: globalEnvironment.id, key },
        });
      }

      if (!variable) {
        variable = this.variableRepository.create({
          environmentId: targetEnvironment.id,
          key,
          value,
          enabled: true,
          description: null,
        });
      } else {
        variable.value = value;
        variable.enabled = true;
      }

      await this.variableRepository.save(variable);
    }
  }

  async findOwned(userId: string, environmentId: string): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findOne({
      where: { id: environmentId },
      relations: { variables: true },
    });

    if (!environment || !(await this.permissions.getRole(userId, environment.workspaceId))) {
      throw new NotFoundException("Environment not found.");
    }

    return environment;
  }

  async findVariableOwned(
    userId: string,
    variableId: string,
  ): Promise<EnvironmentVariableEntity> {
    const variable = await this.variableRepository.findOne({
      where: { id: variableId },
      relations: { environment: true },
    });

    if (!variable || !(await this.permissions.getRole(userId, variable.environment.workspaceId))) {
      throw new NotFoundException("Environment variable not found.");
    }

    return variable;
  }

  private environmentToMap(environment?: EnvironmentEntity): Record<string, string> {
    if (!environment) {
      return {};
    }

    return environment.variables.reduce<Record<string, string>>((accumulator, variable) => {
      if (variable.enabled) {
        accumulator[variable.key] = variable.value;
      }

      return accumulator;
    }, {});
  }

  private async unsetOtherGlobals(workspaceId: string, activeId: string): Promise<void> {
    const globals = await this.environmentRepository.find({
      where: { workspaceId, isGlobal: true },
    });

    for (const environment of globals) {
      if (environment.id !== activeId) {
        environment.isGlobal = false;
        await this.environmentRepository.save(environment);
      }
    }
  }

  private async ensureStarterEnvironments(userId: string, workspaceId: string): Promise<void> {
    const environments = await this.environmentRepository.find({
      where: { workspaceId },
    });
    const normalizedNames = new Set(
      environments.map((environment) => environment.name.trim().toLowerCase()),
    );
    const hasGlobal = environments.some((environment) => environment.isGlobal);
    const shouldCreateStarterProfiles =
      environments.length === 0 ||
      (environments.length === 1 &&
        hasGlobal &&
        normalizedNames.has(STARTER_ENVIRONMENTS[0].name.toLowerCase()));

    if (!hasGlobal) {
      const starter = STARTER_ENVIRONMENTS[0];
      await this.createStarterEnvironment(userId, workspaceId, starter.name, starter.isGlobal, starter.variables);
      normalizedNames.add(starter.name.toLowerCase());
    }

    if (shouldCreateStarterProfiles) {
      for (const starter of STARTER_ENVIRONMENTS.slice(1)) {
        if (!normalizedNames.has(starter.name.toLowerCase())) {
          await this.createStarterEnvironment(
            userId,
            workspaceId,
            starter.name,
            starter.isGlobal,
            starter.variables,
          );
        }
      }
    }
  }

  private async createStarterEnvironment(
    userId: string,
    workspaceId: string,
    name: string,
    isGlobal: boolean,
    variables: ReadonlyArray<{
      key: string;
      value: string;
      description: string;
    }>,
  ): Promise<void> {
    const environment = await this.environmentRepository.save(
      this.environmentRepository.create({
        userId,
        workspaceId,
        name,
        isGlobal,
      }),
    );

    if (!variables.length) {
      return;
    }

    await this.variableRepository.save(
      this.variableRepository.create(
        variables.map((variable) => ({
          environmentId: environment.id,
          key: variable.key,
          value: variable.value,
          enabled: true,
          description: variable.description,
        })),
      ),
    );
  }
}
