import type { ResourcesConfig } from "aws-amplify";

import type { PublicConfig } from "@/lib/env";

export function amplifyConfig(cfg: PublicConfig): ResourcesConfig {
	return {
		Auth: {
			Cognito: {
				userPoolId: cfg.userPoolId,
				userPoolClientId: cfg.userPoolClientId,
			},
		},
	};
}
