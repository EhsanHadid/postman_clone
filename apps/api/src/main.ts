import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.enableCors({
    origin: process.env.APP_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  app.setGlobalPrefix("api");

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error("Bootstrap failed", error);
  process.exit(1);
});
