import type { Routes } from "@angular/router";
import { LoginPageComponent } from "./page_component/login-page/login-page.component";
import { HomeComponent } from "./page_component/home/home.component";
import { DashboardPageComponent } from "./page_component/dashboard-page/dashboard-page.component";
import { ProgressPageComponent } from "./page_component/progress-page/progress-page.component";
import { ProfilePageComponent } from "./page_component/profile-page/profile-page.component";
import { CardProgressCountComponent } from "./component/card-progress-count/card-progress-count.component";
import { TodoPageComponent } from "./page_component/todo-page/todo-page.component";

export const routes: Routes = [
	{
		path: "",
		pathMatch: "full",
		component: LoginPageComponent, // Default route to login page
	},
	{
		path: "home",
		component: HomeComponent, // Main page with header and router outlet
		children: [
			// Child routes for the main page
			{
				path: "",
				pathMatch: "full",
				redirectTo: "/home/(home:dashboard)", // Redirect to dashboard by default
				outlet: "home",
			},
			{
				path: "dashboard",
				component: DashboardPageComponent, // Dashboard page
				outlet: "home",
			},
			{
				path: "todo",
				component: TodoPageComponent, // Progress page
				outlet: "home",
			},
			{
				path: "progress",
				component: ProgressPageComponent, // Profile page
				outlet: "home",
			},
		],
	},
];
