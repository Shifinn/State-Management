import { Component,inject,ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { InputBoxComponent } from '../../component/input-box/input-box.component';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../../service/login.service';

@Component({
  selector: 'app-login-page',
  imports: [MatButtonModule, InputBoxComponent,RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})


export class LoginPageComponent {
  // Injecting the LoginService to handle login logic
  loginService = inject(LoginService); 
  // Injecting the Router to handle navigation
  router = inject(Router);

  // Flag to check if the input is valid
  validInput: boolean = false;

  ngOnInit(): void {
    if (this.loginService.getUserId() !== 0) {
      this.router.navigate(['/home']);
    }
  }

  // ViewChild to access the input boxes in the template
  @ViewChild('usernameBox') usernameBox!: InputBoxComponent;
  @ViewChild('passwordBox') passwordBox!: InputBoxComponent;

  // Function to handle login when the button is clicked
  // Checks the username and password and calls the login service to authenticate the user
  // If the login is successful, it sets validInput to true, else false
  checkLogin(usernameBox: InputBoxComponent, passwordBox: InputBoxComponent) {
    const username = usernameBox.value;
    const password = passwordBox.value;
    this.loginService.login(username.toLowerCase(), password).subscribe(response => {
      this.loginService.storeUserId(response);

      if (response) {
        this.validInput = true;
        this.router.navigate(['/home']);
      }
    console.log("from page, userid: " + this.loginService.getUserId());
    })
  }
}



