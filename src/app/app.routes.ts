import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashbord-component/dashbord-component').then((m) => m.DashbordComponent)
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./components/dashbord-component/dashbord-component').then((m) => m.DashbordComponent),
        canActivate: [AdminGuard]
      },

      {
        path: 'documents',
        loadComponent: () =>
          import('./components/documents/document-list/document-list.component').then((m) => m.DocumentListComponent),
      },
      {
        path: 'documents/upload',
        loadComponent: () =>
          import('./components/documents/document-upload/document-upload.component').then((m) => m.DocumentUploadComponent),
      },
      // Categories routes
      { path: 'categories', loadComponent: () => import('./components/categories/category-list/category-list.component').then(m => m.CategoryListComponent) },
      { path: 'categories/create', loadComponent: () => import('./components/categories/category-form/category-form.component').then(m => m.CategoryFormComponent) },
      { path: 'categories/edit/:id', loadComponent: () => import('./components/categories/category-form/category-form.component').then(m => m.CategoryFormComponent) },
      { path: 'conversations', loadComponent: () => import('./components/conversation/conversation-list/conversation-list.component').then(m => m.ConversationListComponent) },
      { path: 'conversations/new', loadComponent: () => import('./components/conversation/chat/chat.component').then(m => m.ChatComponent) },
      { path: 'conversations/:id', loadComponent: () => import('./components/conversation/chat/chat.component').then(m => m.ChatComponent) },
    ]
  },

  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
