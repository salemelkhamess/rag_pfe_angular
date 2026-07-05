import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserInfoResponse } from '../../../core/models/auth.models';
import { NgSelectModule } from '@ng-select/ng-select';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  users = signal<UserInfoResponse[]>([]);
  loading = signal(true);
  searchUsername = signal('');
  searchEmail = signal('');
  filterEnabled = signal<string>('all');
  page = signal(0);
  totalPages = signal(0);
  totalCount = signal(0);
  selectedUser = signal<UserInfoResponse | null>(null);
  showDeleteModal = signal(false);
  error = signal<string | null>(null);

  filteredUsers = computed(() => this.users());

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    const enabled =
      this.filterEnabled() === 'all'
        ? undefined
        : this.filterEnabled() === 'active';

    this.userService
      .listUsers({
        username: this.searchUsername() || undefined,
        email: this.searchEmail() || undefined,
        enabled,
        page: this.page(),
        size: 20,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.users ?? []);
          this.totalPages.set(res.totalPages ?? 0);
          this.totalCount.set(res.totalCount ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.error.set(err.message || 'Erreur lors du chargement.');
          this.users.set([]);
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    this.page.set(0);
    this.loadUsers();
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
      this.loadUsers();
    }
  }

  confirmDelete(user: UserInfoResponse): void {
    this.selectedUser.set(user);
    this.showDeleteModal.set(true);
  }

  deleteUser(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.selectedUser.set(null);
        this.loadUsers();
      },
      error: (err) => console.error('Error deleting user:', err),
    });
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.selectedUser.set(null);
  }

  toggleEnabled(user: UserInfoResponse): void {
    const willEnable = !user.enabled;
    const action = user.enabled
      ? this.userService.disableUser(user.id)
      : this.userService.enableUser(user.id);
    action.subscribe({
      next: () => {
        this.toastService.success(
          willEnable
            ? `Utilisateur "${user.username}" activé avec succès`
            : `Utilisateur "${user.username}" désactivé avec succès`
        );
        this.loadUsers();
      },
      error: () => this.toastService.error('Erreur lors de la modification du statut'),
    });
  }

  getStatusClass(enabled: boolean): string {
    return enabled ? 'status-active' : 'status-inactive';
  }

  getStatusText(enabled: boolean): string {
    return enabled ? 'Actif' : 'Inactif';
  }

  formatRoles(roles?: string[]): string {
    if (!roles?.length) return '—';
    return roles.filter((r) => !r.startsWith('default-roles')).join(', ') || '—';
  }

  getInitial(user: UserInfoResponse): string {
    const fromName = user.firstName?.charAt(0) || user.lastName?.charAt(0);
    return fromName || user.username?.charAt(0) || '?';
  }
}
