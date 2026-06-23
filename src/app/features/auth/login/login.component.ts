import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, ActivatedRoute, RouterLink} from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIf
  ],
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  returnUrl: string = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { identifier, password } = this.loginForm.value;

    this.authService.login({ identifier, password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.router.navigate([this.returnUrl]);
        } else {
          this.errorMessage = response.message || 'Identifiant ou mot de passe incorrect.';
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 0 || error.message?.includes('indisponible') || error.message?.includes('répond pas')) {
          this.errorMessage = 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.';
        } else if (error.status === 401 || error.message?.includes('incorrect')) {
          this.errorMessage = 'Identifiant ou mot de passe incorrect.';
        } else {
          this.errorMessage = error.message || 'Une erreur est survenue. Veuillez réessayer.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get f() {
    return this.loginForm.controls;
  }
}
