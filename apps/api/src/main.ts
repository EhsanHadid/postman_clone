import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? "50mb";
  app.use(json({ limit: requestBodyLimit }));
  app.use(urlencoded({ extended: true, limit: requestBodyLimit }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  const allowedOrigins = (process.env.APP_ORIGIN ?? "http://localhost:5173,null")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`), false);
    },
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
