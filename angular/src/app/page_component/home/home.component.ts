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
	dataService = inject(DataProcessingService);
	router = inject(Router);

	ngOnInit() {
		this.dataService.rerouteHome();
		if (Number(this.dataService.getUserId()) === 0) {
			this.router.navigate([""]);
		}
	}
}
