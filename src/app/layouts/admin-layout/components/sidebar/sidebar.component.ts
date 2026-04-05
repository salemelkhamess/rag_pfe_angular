import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Tableau de bord' },
    { path: '/documents', icon: '📄', label: 'Documents' },
    { path: '/chat', icon: '💬', label: 'Chat RAG' },
    { path: '/users', icon: '👥', label: 'Utilisateurs' },
    { path: '/settings', icon: '⚙️', label: 'Paramètres' }
  ];

  isSidebarCollapsed = false;
  isMobileOpen = false;
  isMobile = false;

  constructor() {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isSidebarCollapsed = false;
      this.isMobileOpen = false;
    }
  }

  toggleSidebar() {
    if (this.isMobile) {
      this.isMobileOpen = !this.isMobileOpen;
    } else {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }
  }

  closeMobile() {
    this.isMobileOpen = false;
  }

  closeOnMobile() {
    if (this.isMobile) {
      this.isMobileOpen = false;
    }
  }
}
