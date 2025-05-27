import { Component, input, signal, Injectable, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../service/login.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  loginService = inject(LoginService); 
  id = signal(this.loginService.getUserId()); // Signal to track the ID
}
