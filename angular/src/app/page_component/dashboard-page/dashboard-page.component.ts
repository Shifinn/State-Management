import { Component, inject, signal } from '@angular/core';
import { DataProcessingService } from '../../service/data-processing.service';
import { SimpleData} from '../../model/format.type';
import { RequestCardComponent } from '../../component/request-card/request-card.component';
import { ButtonComponent } from "../../component/button/button.component";
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { QuestionnaireComponent } from '../../component/questionnaire/questionnaire.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [RequestCardComponent, ButtonComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  data_service = inject(DataProcessingService)
  requests = signal<Array<SimpleData>>([])
  dialog = inject(MatDialog)
  // dialog_config = inject(MatDialogConfig)

  ngOnInit(): void {
    this.refreshRequests();
  }

  makeNewRequest() {
    const dialog_ref = this.dialog.open(QuestionnaireComponent, {
      autoFocus: false,
      width: '90vw',
      height: '90vh',
      maxWidth: '90vw',
      panelClass: 'custom-dialog-container'
    });

    dialog_ref.afterClosed().subscribe( result => {
      if (result) {      
        this.refreshRequests();
      }
    })
    // this.dialog_config.disableClose = true;
  }

  refreshRequests() {
      this.data_service.getUserRequest(this.data_service.getUserId()).subscribe((reqs: SimpleData[]) => {
        this.requests.set(reqs);
    });
  }


  
}
