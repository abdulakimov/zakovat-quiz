import { getPrismaEnv } from "../src/env";

const config = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: getPrismaEnv().DATABASE_URL,
  },
};

export default config;
