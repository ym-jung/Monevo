import { createServerRunner } from "@aws-amplify/adapter-nextjs";

import { publicConfig } from "@/lib/env";

import { amplifyConfig } from "./config";

let runner: ReturnType<typeof createServerRunner> | undefined;

export function amplifyServerRunner() {
	if (!runner) {
		runner = createServerRunner({
			config: amplifyConfig(publicConfig()),
			runtimeOptions: {
				cookies: {

					sameSite: "strict",
				},
			},
		});
	}
	return runner;
}
