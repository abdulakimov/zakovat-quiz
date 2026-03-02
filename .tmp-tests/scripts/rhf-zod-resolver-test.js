"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rhf_zod_test_1 = require("../src/validators/rhf-zod.test");
void (async () => {
    await (0, rhf_zod_test_1.runRhfZodResolverTests)();
    console.log("All RHF Zod resolver compatibility tests passed.");
})();
