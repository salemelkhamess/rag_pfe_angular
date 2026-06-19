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
      // Categories routes (admin)
      { path: 'categories', loadComponent: () => import('./components/categories/category-list/category-list.component').then(m => m.CategoryListComponent), canActivate: [AdminGuard] },
      { path: 'categories/create', loadComponent: () => import('./components/categories/category-form/category-form.component').then(m => m.CategoryFormComponent), canActivate: [AdminGuard] },
      { path: 'categories/edit/:id', loadComponent: () => import('./components/categories/category-form/category-form.component').then(m => m.CategoryFormComponent), canActivate: [AdminGuard] },
      { path: 'conversations', loadComponent: () => import('./components/conversation/conversation-list/conversation-list.component').then(m => m.ConversationListComponent) },
      { path: 'conversations/new', loadComponent: () => import('./components/conversation/chat/chat.component').then(m => m.ChatComponent) },
      { path: 'conversations/:id', loadComponent: () => import('./components/conversation/chat/chat.component').then(m => m.ChatComponent) },
      // Paramétrage LLM (providers & models) — admin
      { path: 'parametrage', loadComponent: () => import('./components/parametrage/provider-list/provider-list.component').then(m => m.ProviderListComponent), canActivate: [AdminGuard] },
      { path: 'parametrage/create', loadComponent: () => import('./components/parametrage/provider-form/provider-form.component').then(m => m.ProviderFormComponent), canActivate: [AdminGuard] },
      { path: 'parametrage/edit/:id', loadComponent: () => import('./components/parametrage/provider-form/provider-form.component').then(m => m.ProviderFormComponent), canActivate: [AdminGuard] },
      { path: 'profile', loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'users', loadComponent: () => import('./components/users/user-list/user-list.component').then(m => m.UserListComponent), canActivate: [AdminGuard] },
      { path: 'users/create', loadComponent: () => import('./components/users/user-form/user-form.component').then(m => m.UserFormComponent), canActivate: [AdminGuard] },
      { path: 'users/edit/:id', loadComponent: () => import('./components/users/user-form/user-form.component').then(m => m.UserFormComponent), canActivate: [AdminGuard] },
    ]
  },

  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
