import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

interface SidebarMenuItem {
  path: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userSub?: Subscription;

  private readonly allMenuItems: SidebarMenuItem[] = [
    { path: '/dashboard',    icon: 'home',     label: 'Tableau de bord' },
    { path: '/documents',    icon: 'docs',     label: 'Documents' },
    { path: '/conversations',icon: 'chat',     label: 'Conversations' },
    { path: '/categories',   icon: 'folder',   label: 'Catégories', adminOnly: true },
    { path: '/parametrage',  icon: 'settings', label: 'Paramétrage LLM', adminOnly: true },
    { path: '/users',        icon: 'users',    label: 'Utilisateurs', adminOnly: true },
    { path: '/audit',        icon: 'audit',    label: 'Audit',        adminOnly: true },
  ];

  isAdmin = signal(false);

  menuItems = computed(() =>
    this.allMenuItems.filter((item) => !item.adminOnly || this.isAdmin())
  );

  isSidebarCollapsed = false;
  isMobileOpen = false;
  isMobile = false;

  constructor() {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.isAdmin.set(user?.roles?.includes('admin') ?? false);
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
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
