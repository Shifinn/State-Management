import { Component, inject, signal } from "@angular/core";
import { CompleteData, Question } from "../../model/format.type";

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogClose,
  MatDialogRef,
} from "@angular/material/dialog";
import { DataProcessingService } from "../../service/data-processing.service";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { ChangeStatusConfirmationComponent } from "../change-status-confirmation/change-status-confirmation.component";
import { UpdateState } from "../../model/format.type";

@Component({
  selector: "app-more-detail",
  imports: [CommonModule, MatButtonModule, MatDialogClose],
  templateUrl: "./more-detail.component.html",
  styleUrl: "./more-detail.component.css",
})
export class MoreDetailComponent {
  data: CompleteData = {
    request_id: 0,
    request_title: "",
    requester_name: "",
    analysis_purpose: "",
    requested_completed_date: new Date(""),
    pic_submitter: "",
    urgent: false,
    request_date: new Date(""),
    user_name: "",
    state_name: "",
    data_type_name: "",
    remark: "",
    state_comment: null,
  };

  state_update_data: UpdateState = {
    user_id: 0,
    request_id: 0,
    comment: "",
  };
  answers = signal<Array<Question>>([]);
  input_data = inject(MAT_DIALOG_DATA);
  data_service = inject(DataProcessingService);
  router = inject(Router);
  dialog = inject(MatDialog);
  dialogRef = inject(MatDialogRef<MoreDetailComponent>);

  ngOnInit() {
    this.data_service
      .getCompleteData(this.input_data.request_id)
      .subscribe((result) => {
        this.data = result;
      });

    this.data_service
      .getAnswer(this.input_data.request_id)
      .subscribe((result) => {
        this.answers.set(result);
      });
  }

  changeState(change: string) {
    const dialogRef2 = this.dialog.open(ChangeStatusConfirmationComponent, {
      autoFocus: false,
      data: { type: change },
      width: "360px",
      maxWidth: "90vw",
      panelClass: "compact-dialog",
    });
    dialogRef2.afterClosed().subscribe((result) => {
      if (result || result === "") {
        this.state_update_data.comment = result;
        this.state_update_data.request_id = this.input_data.request_id;
        console.log("this is before input to user_id user id:" + this.data_service.getUserId())
        this.state_update_data.user_id = Number(this.data_service.getUserId());
        console.log("this is after input to user_id user id:" + this.state_update_data.user_id)
        if (change == "degrade") {
          this.data_service
        .degradeState(this.state_update_data)
        .subscribe(() => {
          this.dialogRef.close("1");
        });
        } else {
          console.log("this is before upgrade user id:" + this.state_update_data.user_id)
          this.data_service
        .upgradeState(this.state_update_data)
        .subscribe(() => {
          this.dialogRef.close("1");
        });
        }
      }
    });
  }

  confirmDialog(type: number): boolean {
    return false;
  }

  checkPage() {
    return this.router.url.includes("/home/(home:todo)");
  }

  isVisible(button: string): boolean {
    const temp_state_name = this.data.state_name;
    if (!this.checkPage()) {
      return false;
    }

    switch (button) {
      case "cancel":
      case "reject":
      case "continue":
        if (this.data_service.getUserRole() == "2") {
          if (
            temp_state_name == "VALIDATED" ||
            temp_state_name == "IN PROGRESS"
          ) {
            return true;
          } else {
            return false;
          }
        } else if (this.data_service.getUserRole() == "3") {
          if (
            temp_state_name == "SUBMITTED" ||
            temp_state_name == "WAITING FOR REVIEW"
          ) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
        break;

      case "ok":
        if (temp_state_name == "DONE") {
          return true;
        }
        if (this.data_service.getUserRole() == "2") {
          if (temp_state_name == "WAITING FOR REVIEW") {
            return true;
          } else {
            return false;
          }
        } else if (this.data_service.getUserRole() == "3") {
          if (temp_state_name == "VALIDATED"|| temp_state_name == "REQUEST REJECTED") {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
        break;
    }
    return false;
  }
}
