import type { Routes } from "@angular/router";
// Notice we only import the main layout components now!
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
			// Your redirect will still work perfectly!
			{
				path: "",
				pathMatch: "full",
				redirectTo: "/home/(home:dashboard)",
				outlet: "home",
			},
			{
				path: "dashboard",
				// This component is now LAZY LOADED
				loadComponent: () =>
					import(
						"./page_component/dashboard-page/dashboard-page.component"
					).then((c) => c.DashboardPageComponent),
				outlet: "home",
			},
			{
				path: "todo",
				// This component is now LAZY LOADED
				loadComponent: () =>
					import("./page_component/todo-page/todo-page.component").then(
						(c) => c.TodoPageComponent,
					),
				outlet: "home",
			},
			{
				path: "progress",
				// This component is now LAZY LOADED
				loadComponent: () =>
					import("./page_component/progress-page/progress-page.component").then(
						(c) => c.ProgressPageComponent,
					),
				outlet: "home",
			},
			// You can apply the same pattern to your Profile page and others
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
