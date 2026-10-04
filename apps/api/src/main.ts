import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { config } from "dotenv";
import { resolve } from "node:path";
import { AppModule } from "./app.module.js";

config({ path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")] });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`Zyteron Control API listening on http://localhost:${port}/api`);
}

void bootstrap();
