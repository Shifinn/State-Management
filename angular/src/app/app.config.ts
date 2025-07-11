import {
	type ApplicationConfig,
	provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { provideHttpClient } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
	providers: [
		provideHttpClient(), // Enables the use of HTTP client calls for the application
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(routes),
	],
};
