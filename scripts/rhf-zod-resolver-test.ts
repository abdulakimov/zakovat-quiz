import { runRhfZodResolverTests } from "../src/validators/rhf-zod.test";

void (async () => {
  await runRhfZodResolverTests();
  console.log("All RHF Zod resolver compatibility tests passed.");
})();
