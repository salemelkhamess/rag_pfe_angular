import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {AuthService} from '../../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();

  isMobile = false;
  showUserMenu = false;
  showNotifications = false;
  isLoading = false;

  user = {
    name: 'Admin User',
    avatar: '👤',
    email: 'admin@example.com'
  };

  notifications = [
    { id: 1, message: 'Nouveau document ajouté', time: '5 min' },
    { id: 2, message: 'Question répondue avec succès', time: '1 heure' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.checkScreenSize();
    this.loadUserInfo();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  loadUserInfo() {
    // Récupérer les informations de l'utilisateur connecté
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.user = {
          name: `${user.firstName} ${user.lastName}` || user.username,
          avatar: this.getInitials(user.firstName, user.lastName),
          email: user.email
        };
      }
    });
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return '👤';
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  onMenuToggle() {
    this.menuToggle.emit();
  }

  logout() {
    this.isLoading = true;
    this.authService.logout().subscribe({
      next: () => {
        this.isLoading = false;
        this.showUserMenu = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.isLoading = false;
        // Même en cas d'erreur, on redirige vers login
        this.router.navigate(['/login']);
      }
    });
  }

  goToProfile() {
    this.showUserMenu = false;
    this.router.navigate(['/profile']);
  }

  goToSettings() {
    this.showUserMenu = false;
    this.router.navigate(['/settings']);
  }
}
