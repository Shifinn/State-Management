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
	data_service = inject(DataProcessingService);
	router = inject(Router);
	ngOnInit() {
		if (Number(this.data_service.getUserId()) === 0) {
			this.router.navigate([""]);
		}
	}
}
