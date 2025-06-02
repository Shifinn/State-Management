import { Component, input, signal, Injectable, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { DataProcessingService } from '../../service/data-processing.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  loginService = inject(LoginService);
  dataService = inject(DataProcessingService); 
  id = signal(this.dataService.getUserName()); // Signal to track the ID

  logOut() {
    this.loginService.logOut(); // Call the logout method from the servic
  }
}
