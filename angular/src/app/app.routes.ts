import type { Routes } from "@angular/router";
import { LoginPageComponent } from "./page_component/login-page/login-page.component";
import { HomeComponent } from "./page_component/home/home.component";

export const routes: Routes = [
	{
		path: "",
		pathMatch: "full",
		component: LoginPageComponent, // Login page is loaded first.
	},
	{
		path: "home",
		component: HomeComponent, // The main layout is loaded after login.
		children: [
			{
				path: "",
				pathMatch: "full",
				redirectTo: "/home/(home:dashboard)",
				outlet: "home",
			},
			{
				path: "dashboard",
				loadComponent: () =>
					import(
						"./page_component/dashboard-page/dashboard-page.component"
					).then((c) => c.DashboardPageComponent),
				outlet: "home",
			},
			{
				path: "todo",
				loadComponent: () =>
					import("./page_component/todo-page/todo-page.component").then(
						(c) => c.TodoPageComponent,
					),
				outlet: "home",
			},
			{
				path: "progress",
				loadComponent: () =>
					import("./page_component/progress-page/progress-page.component").then(
						(c) => c.ProgressPageComponent,
					),
				outlet: "home",
			},
			{
				path: "profile",
				loadComponent: () =>
					import("./page_component/profile-page/profile-page.component").then(
						(c) => c.ProfilePageComponent,
					),
				outlet: "home",
			},
		],
	},
];
