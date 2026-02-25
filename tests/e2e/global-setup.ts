import { PrismaClient, UserStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const USERNAME = process.env.PW_USER ?? "playwright@example.com";
const PASSWORD = process.env.PW_PASS ?? "pw12345678";
const NAME = "Playwright User";

export default async function globalSetup() {
  const email = USERNAME.includes("@") ? USERNAME : `${USERNAME}@example.com`;
  const username = USERNAME.includes("@") ? "playwright" : USERNAME;
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      name: NAME,
      passwordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      username,
      email,
      name: NAME,
      passwordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    select: { id: true, username: true, name: true },
  });

  const outputDir = path.join(process.cwd(), ".tmp-tests");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "playwright-user.json"),
    JSON.stringify({ id: user.id, username: user.username, name: user.name }),
    "utf-8",
  );

  await prisma.$disconnect();
}
