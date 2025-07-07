import { Component, inject } from "@angular/core";
import { HeaderComponent } from "../../component/header/header.component";
import { Router, RouterOutlet } from "@angular/router";
import { DataProcessingService } from "../../service/data-processing.service";

@Component({
	selector: "app-home",
	imports: [HeaderComponent, RouterOutlet],
	templateUrl: "./home.component.html",
	styleUrls: ["./home.component.css"],
})
export class HomeComponent {
	// Injects necessary services
	dataService = inject(DataProcessingService);
	//inject router to handle routing
	router = inject(Router);

	ngOnInit() {
		// Calls a function to route to correct page depending on the user's role
		this.dataService.rerouteHome();
		// if user id is 0 (not logged in), re-route to login page
		if (Number(this.dataService.getUserId()) === 0) {
			this.router.navigate([""]);
		}
	}
}
