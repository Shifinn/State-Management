import { Component, EventEmitter, inject, Input, Output, resource } from '@angular/core';
import { SimpleData } from '../../model/format.type';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { DataProcessingService } from '../../service/data-processing.service';
import { MatDialog } from '@angular/material/dialog';
import { MoreDetailComponent } from '../more-detail/more-detail.component';

@Component({
  selector: 'app-request-card',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './request-card.component.html',
  styleUrl: './request-card.component.css'
})
export class RequestCardComponent {
  @Input() request !: SimpleData;
  @Output() refresh = new EventEmitter<void>();
  data_service = inject(DataProcessingService)
  dialog = inject(MatDialog)


  moreDetails() {
    const dialogref = this.dialog.open(MoreDetailComponent, {
      autoFocus: false,
      width: '90vw',
      height: '90vh',
      maxWidth: '90vw',
      panelClass: 'custom-dialog-container',
      data: {request_id: this.request.request_id}
    });

    dialogref.afterClosed().subscribe(result => {
      this.refresh.emit();
    })
  }
}