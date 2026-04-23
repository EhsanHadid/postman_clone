import "reflect-metadata";
import AppDataSource from "./data-source";
import {
  CollectionEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  RequestEntity,
  UserEntity,
} from "./entities";
import { hashPassword } from "../modules/users/password.utils";

async function run(): Promise<void> {
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(UserEntity);
  const collectionRepository = AppDataSource.getRepository(CollectionEntity);
  const environmentRepository = AppDataSource.getRepository(EnvironmentEntity);
  const variableRepository = AppDataSource.getRepository(EnvironmentVariableEntity);
  const requestRepository = AppDataSource.getRepository(RequestEntity);

  let user = await userRepository.findOne({ where: { username: "demo" } });

  if (!user) {
    user = await userRepository.save(
      userRepository.create({
        username: "demo",
        password: hashPassword("demo123"),
      }),
    );
  }

  const existingCollection = await collectionRepository.findOne({
    where: { userId: user.id, name: "Demo APIs" },
  });

  if (!existingCollection) {
    const collection = await collectionRepository.save(
      collectionRepository.create({
        userId: user.id,
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

  const globalEnvironment = await environmentRepository.findOne({
    where: { userId: user.id, isGlobal: true },
  });

  if (!globalEnvironment) {
    const environment = await environmentRepository.save(
      environmentRepository.create({
        userId: user.id,
        name: "Global",
        isGlobal: true,
      }),
    );

    await variableRepository.save(
      variableRepository.create([
        {
          environmentId: environment.id,
          key: "base_url",
          value: "https://jsonplaceholder.typicode.com",
          enabled: true,
          description: "Base URL for demo requests",
        },
        {
          environmentId: environment.id,
          key: "todo_id",
          value: "1",
          enabled: true,
          description: "Demo path variable",
        },
      ]),
    );
  }

  await AppDataSource.destroy();
}

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
