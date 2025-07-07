import { Component, EventEmitter, Input, Output } from "@angular/core";

import { MatButtonModule } from "@angular/material/button";

@Component({
	selector: "app-custom-square-button",
	imports: [MatButtonModule],
	templateUrl: "./custom-square-button.component.html",
	styleUrl: "./custom-square-button.component.css",
})
export class CustomSquareButtonComponent {
	// The label of the button
	@Input() buttonLabel!: string;
	// Emitter for onClick
	@Output() buttonClick = new EventEmitter<void>();

	// Emit on click
	onClick() {
		this.buttonClick.emit();
	}
}
