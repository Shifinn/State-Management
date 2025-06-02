import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRequest } from '../model/format.type';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataProcessingService {
  http = inject(HttpClient); //enables the use of HTTP client calls for the application
  router = inject(Router); // enables navigation using the Router

    storeUserInfo(u: User) {
    localStorage.setItem('userId', u.user_id);
    localStorage.setItem('userName', u.user_name);
    localStorage.setItem('userEmail', u.email);
    localStorage.setItem('userRole', u.user_role);
  }

  getUserId(): string {
    return this.returnIfNotNull(localStorage.getItem('userId'));
  }

  getUserName(): string {
    return this.returnIfNotNull(localStorage.getItem('userName'));
  }

  getUserEmail(): string {
    return this.returnIfNotNull(localStorage.getItem('userEmail'));
  }

  getUserRole(): string {
    return this.returnIfNotNull(localStorage.getItem('userRole'));
  }


  returnIfNotNull(input: string | null): string {
    if (input === null || input === undefined) {
      return '';
    } else {
      return input;
    }
  }

  getUserRequest(user_id_input: string): Observable<UserRequest[]> {
    const url = `http://localhost:9090/userRequestsData?user_id=${user_id_input}`;  // Constructed URL dynamically
    return this.http.get<UserRequest[]>(url);
  }
}
