import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  submitting = signal(false);
  passwordSubmitting = signal(false);
  success = signal<string | null>(null);
  error = signal<string | null>(null);
  email = signal('');

  profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    username: [{ value: '', disabled: true }],
  });

  passwordForm = this.fb.group({
    oldPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        const user = res.data;
        if (user) {
          this.email.set(user.email);
          this.profileForm.patchValue({
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            username: user.username,
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger votre profil.');
        this.loading.set(false);
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    const { firstName, lastName } = this.profileForm.getRawValue();
    this.authService.updateCurrentUser({ firstName: firstName!, lastName: lastName! }).subscribe({
      next: () => {
        this.success.set('Profil mis à jour avec succès.');
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Échec de la mise à jour.');
        this.submitting.set(false);
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { oldPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.passwordSubmitting.set(true);
    this.error.set(null);
    this.success.set(null);

    this.authService.changePassword({ oldPassword: oldPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.success.set('Mot de passe modifié avec succès.');
        this.passwordForm.reset();
        this.passwordSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Échec du changement de mot de passe.');
        this.passwordSubmitting.set(false);
      },
    });
  }
}
