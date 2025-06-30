import {
	Component,
	HostListener,
	inject,
	signal,
	ViewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
	DateAdapter,
	MAT_DATE_FORMATS,
	MAT_NATIVE_DATE_FORMATS,
	MatNativeDateModule,
	MatOption,
	NativeDateAdapter,
} from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDialogClose, MatDialogRef } from "@angular/material/dialog";
import { MatSelectModule } from "@angular/material/select";
import { MatError, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule, type NgForm } from "@angular/forms";
import type { NewRequest, Question } from "../../model/format.type";
import { DataProcessingService } from "../../service/data-processing.service";
import { NgIf } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: "app-dialog-new-request-questionnaire",
	imports: [
		MatInputModule,
		MatDatepickerModule,
		MatFormFieldModule,
		MatDialogClose,
		MatSelectModule,
		MatNativeDateModule,
		MatButtonModule,
		FormsModule,
		MatError,
		MatIconModule,
		NgIf,
	],
	templateUrl: "./dialog-new-request-questionnaire.component.html",
	styleUrl: "./dialog-new-request-questionnaire.component.css",
	providers: [
		{ provide: DateAdapter, useClass: NativeDateAdapter },
		{ provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
	],
})
export class DialogNewRequestQuestionnaireComponent {
	dataService = inject(DataProcessingService);
	questions = signal<Array<Question>>([]);
	dialogRef = inject(MatDialogRef<DialogNewRequestQuestionnaireComponent>);
	@ViewChild("requestForm") requestForm!: NgForm; // Get reference to the form

	today = new Date();
	data: NewRequest = {
		requestTitle: "",
		userId: 0,
		requesterName: "",
		analysisPurpose: "",
		requestedFinishDate: null,
		picRequest: "",
		urgent: null,
		requirementType: null,
		remark: "",
		answers: [],
		docxAttachment: null,
		docxFilename: null,
		excelAttachment: null,
		excelFilename: null,
	};
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit() {
		this.innerWidth.set(window.innerWidth);
	}

	submitRequest() {
		this.requestForm.form.markAllAsTouched();
		if (this.allRequirementsAnswered()) {
			this.data.requestTitle = this.data.requestTitle
				.toLowerCase()
				.replace(/\b\w/g, (char) => char.toUpperCase());
			this.data.picRequest = this.data.picRequest.toLowerCase();
			this.data.userId = Number(this.dataService.getUserId());
			this.data.requesterName = this.dataService.getUserName();
			this.data.answers = this.questions().map((q) => q.answer);

			this.dataService.postNewRequest(this.data).subscribe((result) => {
				console.log(`the new request id from new request is:${result}`);
				this.dialogRef.close("1");
			});
		}
	}

	getQuestion() {
		if (this.data.requirementType != null) {
			this.dataService
				.getRequirementQuestion(this.data.requirementType)
				.subscribe((input) => {
					this.questions.set(input);
				});
		}
	}

	allRequirementsAnswered(): boolean {
		if (this.requestForm.valid == null || this.requestForm.valid === false) {
			return false;
		}
		return true;
	}

	submitFile(event: Event, type: "EXCEL" | "DOCX") {
		console.log("submit file trigger");
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			if (type === "EXCEL") {
				this.data.excelAttachment = file;
				this.data.excelFilename = file.name;
			} else {
				this.data.docxAttachment = file;
				this.data.docxFilename = file.name;
			}
		}
	}
}
