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
import { HttpEventType } from "@angular/common/http";

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
	isUploading = signal(false);
	uploadProgress = signal(0);
	docxUploadSizewarning = signal<string | null>(null);
	excelUploadSizewarning = signal<string | null>(null);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
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

			this.isUploading.set(true);
			this.uploadProgress.set(0);
			this.resizeForUploadProgress();
			this.dataService.postNewRequest(this.data).subscribe({
				next: (event) => {
					// We check the type of event
					if (event.type === HttpEventType.UploadProgress) {
						// This event gives us the loaded and total bytes
						if (event.total) {
							const progress = Math.round(100 * (event.loaded / event.total));
							this.uploadProgress.set(progress); // Update the signal
						}
					} else if (event.type === HttpEventType.Response) {
						// This event means the upload is complete and we have a server response
						this.dialogRef.close("1"); // Close the dialog on success
					}
				},
				error: (err) => {
					// Handle any upload errors
					console.error("Upload failed:", err);
					this.isUploading.set(false);
					this.uploadProgress.set(0);
					this.resizeForUploadProgress();
				},
			});
			// .subscribe((result) => {
			// 	console.log(`the new request id from new request is:${result}`);
			// 	this.dialogRef.close("1");
			// });
		}
	}

	resizeForUploadProgress() {
		if (this.isUploading()) {
			this.dialogRef.updateSize("");
		} else {
			this.dialogRef.updateSize("90vw");
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
			if (file.size > 4.5 * 1024 * 1024) {
				if (type === "EXCEL") {
					this.excelUploadSizewarning.set("Excel file lebih dari 4.5MB");
					this.data.excelAttachment = null;
					this.data.excelFilename = null;
				} else {
					this.docxUploadSizewarning.set("file lebih dari 4.5MB");
					this.data.docxAttachment = null;
					this.data.docxFilename = null;
				}
				return;
			}
			if (type === "EXCEL") {
				this.excelUploadSizewarning.set(null);
				this.data.excelAttachment = file;
				this.data.excelFilename = file.name;
			} else {
				this.docxUploadSizewarning.set(null);
				this.data.docxAttachment = file;
				this.data.docxFilename = file.name;
			}
		}
	}
}
