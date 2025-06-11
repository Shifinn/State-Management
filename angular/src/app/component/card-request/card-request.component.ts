import { Component, EventEmitter, inject, Input, Output, resource } from '@angular/core';
import { SimpleData } from '../../model/format.type';
import { CommonModule } from '@angular/common';
import { CustomSquareButtonComponent } from '../custom-square-button/custom-square-button.component';
import { DataProcessingService } from '../../service/data-processing.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogMoreDetailComponent } from '../dialog-more-detail/dialog-more-detail.component';

@Component({
  selector: 'app-card-request',
  imports: [CommonModule, CustomSquareButtonComponent],
  templateUrl: './card-request.component.html',
  styleUrl: './card-request.component.css'
})
export class CardRequestComponent {
  @Input() request !: SimpleData;
  @Output() refresh = new EventEmitter<void>();
  data_service = inject(DataProcessingService)
  dialog = inject(MatDialog)


  moreDetails() {
    const dialogref = this.dialog.open(DialogMoreDetailComponent, {
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