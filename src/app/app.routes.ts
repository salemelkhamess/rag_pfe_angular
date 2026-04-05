import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
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
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
