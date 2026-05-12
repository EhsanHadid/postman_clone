import "reflect-metadata";
import AppDataSource from "./data-source";
import {
  CollectionEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  RequestEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "./entities";
import { hashPassword } from "../modules/users/password.utils";

async function run(): Promise<void> {
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(UserEntity);
  const collectionRepository = AppDataSource.getRepository(CollectionEntity);
  const environmentRepository = AppDataSource.getRepository(EnvironmentEntity);
  const variableRepository = AppDataSource.getRepository(EnvironmentVariableEntity);
  const requestRepository = AppDataSource.getRepository(RequestEntity);
  const workspaceRepository = AppDataSource.getRepository(WorkspaceEntity);
  const workspaceMemberRepository = AppDataSource.getRepository(WorkspaceMemberEntity);

  let user = await userRepository.findOne({ where: { username: "demo" } });

  if (!user) {
    user = await userRepository.save(
      userRepository.create({
        username: "demo",
        password: hashPassword("demo123"),
      }),
    );
  }

  let workspace = await workspaceRepository.findOne({
    where: { ownerId: user.id, name: "demo's Workspace" },
  });

  if (!workspace) {
    workspace = await workspaceRepository.save(
      workspaceRepository.create({
        name: "demo's Workspace",
        description: "Default workspace for demo data",
        ownerId: user.id,
        createdById: user.id,
      }),
    );
  }

  const existingOwnerMembership = await workspaceMemberRepository.findOne({
    where: { workspaceId: workspace.id, userId: user.id },
  });

  if (!existingOwnerMembership) {
    await workspaceMemberRepository.save(
      workspaceMemberRepository.create({
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
        addedById: user.id,
      }),
    );
  }

  const existingCollection = await collectionRepository.findOne({
    where: { userId: user.id, workspaceId: workspace.id, name: "Demo APIs" },
  });

  if (!existingCollection) {
    const collection = await collectionRepository.save(
      collectionRepository.create({
        userId: user.id,
        workspaceId: workspace.id,
        name: "Demo APIs",
        description: "Starter collection for Postman Clone",
        sortOrder: 100,
      }),
    );

    await requestRepository.save(
      requestRepository.create({
        collectionId: collection.id,
        folderId: null,
        name: "Get Todo",
        protocolType: "http",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/{{todo_id}}",
        trpcProcedurePath: null,
        headers: [],
        queryParams: [],
        bodyType: "none",
        body: "",
        formData: [],
        authType: "none",
        authConfig: null,
        preRequestScript: "",
        postResponseScript:
          "const payload = response.json();\nif (payload?.id) env.set('last_todo_id', String(payload.id));",
        sortOrder: 100,
      }),
    );
  }

  const existingEnvironments = await environmentRepository.find({
    where: { userId: user.id, workspaceId: workspace.id },
  });
  const existingEnvironmentNames = new Set(
    existingEnvironments.map((environment) => environment.name.trim().toLowerCase()),
  );
  const starterEnvironments = [
    {
      name: "Global",
      isGlobal: true,
      variables: [
        {
          key: "base_url",
          value: "https://jsonplaceholder.typicode.com",
          description: "Base URL shared by the demo requests",
        },
        {
          key: "todo_id",
          value: "1",
          description: "Demo path variable",
        },
        {
          key: "token",
          value: "",
          description: "Demo bearer token placeholder",
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
          description: "Local development API URL",
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
      ],
    },
  ];

  for (const starterEnvironment of starterEnvironments) {
    if (existingEnvironmentNames.has(starterEnvironment.name.toLowerCase())) {
      continue;
    }

    const environment = await environmentRepository.save(
      environmentRepository.create({
        userId: user.id,
        workspaceId: workspace.id,
        name: starterEnvironment.name,
        isGlobal: starterEnvironment.isGlobal,
      }),
    );

    await variableRepository.save(
      variableRepository.create(
        starterEnvironment.variables.map((variable) => ({
          environmentId: environment.id,
          key: variable.key,
          value: variable.value,
          enabled: true,
          description: variable.description,
        })),
      ),
    );
  }

  await AppDataSource.destroy();
}

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
