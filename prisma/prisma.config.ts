import { defineConfig } from "prisma/config";
import { getPrismaEnv } from "../src/env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: getPrismaEnv().DATABASE_URL,
  },
});
