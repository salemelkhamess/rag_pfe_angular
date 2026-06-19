import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserRequest, UserService } from '../../../core/services/user.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { UpdateUserRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
})
export class UserFormComponent implements OnInit {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal(false);
  userId = signal<string | null>(null);
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  roles = signal<string[]>([]);
  showPasswordReset = signal(false);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.minLength(6)]],
    role: ['user'],
    newPassword: ['', [Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.userService.getRoles().subscribe({
      next: (r) => this.roles.set(r.filter((x) => !x.startsWith('default-roles') && x !== 'offline_access' && x !== 'uma_authorization')),
      error: () => this.roles.set(['user', 'admin']),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.userId.set(id);
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
      this.loadUser(id);
    } else {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.controls.password.updateValueAndValidity();
    }
  }

  loadUser(id: string): void {
    this.loading.set(true);
    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roles?.find((r) => r === 'admin' || r === 'user') ?? 'user',
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger l\'utilisateur.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();

    if (this.isEditMode() && this.userId()) {
      const update: UpdateUserRequest = {
        username: v.username!,
        email: v.email!,
        firstName: v.firstName!,
        lastName: v.lastName!,
      };
      this.userService.updateUser(this.userId()!, update).subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigate(['/users']);
        },
        error: (err) => {
          this.error.set(err.message || 'Échec de la mise à jour.');
          this.submitting.set(false);
        },
      });
    } else {
      const create: CreateUserRequest = {
        username: v.username!,
        email: v.email!,
        password: v.password!,
        firstName: v.firstName!,
        lastName: v.lastName!,
        role: v.role ?? 'user',
      };
      this.userService.createUser(create).subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigate(['/users']);
        },
        error: (err) => {
          this.error.set(err.message || 'Échec de la création.');
          this.submitting.set(false);
        },
      });
    }
  }

  resetPassword(): void {
    const id = this.userId();
    const pwd = this.form.controls.newPassword.value;
    if (!id || !pwd || pwd.length < 6) {
      this.error.set('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    this.userService.resetPassword(id, pwd).subscribe({
      next: () => {
        this.error.set(null);
        this.showPasswordReset.set(false);
        this.form.controls.newPassword.reset();
        alert('Mot de passe réinitialisé avec succès.');
      },
      error: (err) => this.error.set(err.message || 'Échec de la réinitialisation.'),
    });
  }

  cancel(): void {
    this.router.navigate(['/users']);
  }
}
