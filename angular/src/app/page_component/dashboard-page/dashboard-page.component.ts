import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { DataProcessingService } from '../../service/data-processing.service';
import { UserRequest } from '../../model/format.type';
import { NodeComponent } from '../../component/node/node.component';
import { ButtonComponent } from "../../component/button/button.component";

@Component({
  selector: 'app-dashboard-page',
  imports: [NodeComponent, ButtonComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  dataService = inject(DataProcessingService)
  requests = signal<Array<UserRequest>>([])
  ngOnInit(): void {
      this.dataService.getUserRequest(this.dataService.getUserId()).subscribe((requests: UserRequest[]) => {
          this.requests.set(requests);
      });
  }

  makeNewRequest() {
    console.log("new")
  }

}
