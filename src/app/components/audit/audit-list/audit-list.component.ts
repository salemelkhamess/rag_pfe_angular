import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditEvent, AuditService } from '../../../core/services/audit.service';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-list.component.html',
  styleUrls: ['./audit-list.component.css'],
})
export class AuditListComponent implements OnInit {
  private auditService = inject(AuditService);

  events        = signal<AuditEvent[]>([]);
  loading       = signal(true);
  error         = signal<string | null>(null);
  page          = signal(0);
  totalPages    = signal(0);
  totalElements = signal(0);

  successCount  = computed(() => this.events().filter(e => e.status?.toUpperCase() === 'SUCCESS').length);
  failureCount  = computed(() => this.events().filter(e => ['FAILURE','ERROR'].includes(e.status?.toUpperCase())).length);

  filterStatus   = '';
  filterService  = '';
  filterResource = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auditService.getEvents({
      status:       this.filterStatus   || undefined,
      serviceName:  this.filterService  || undefined,
      resourceType: this.filterResource || undefined,
      page: this.page(),
      size: 20,
    }).subscribe({
      next: (res) => {
        this.events.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erreur lors du chargement des audits.');
        this.loading.set(false);
      },
    });
  }

  onFilter(): void { this.page.set(0); this.load(); }

  prevPage(): void {
    if (this.page() > 0) { this.page.update(p => p - 1); this.load(); }
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) { this.page.update(p => p + 1); this.load(); }
  }

  statusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':           return 'badge-ok';
      case 'FAILURE': case 'ERROR': return 'badge-err';
      case 'PENDING':           return 'badge-warn';
      default:                  return 'badge-neutral';
    }
  }

  actionClass(action: string): string {
    switch (action?.toUpperCase()) {
      case 'UPLOAD': case 'DOWNLOAD': return 'upload';
      case 'DELETE':                  return 'delete';
      case 'CREATE': case 'READ':     return 'create';
      case 'ENABLE':                  return 'enable';
      case 'DISABLE':                 return 'disable';
      default:                        return 'other';
    }
  }

  actionLabel(action: string): string {
    switch (action?.toUpperCase()) {
      case 'CREATE':   return 'Créé';
      case 'UPDATE':   return 'Modifié';
      case 'DELETE':   return 'Supprimé';
      case 'ENABLE':   return 'Activé';
      case 'DISABLE':  return 'Désactivé';
      case 'UPLOAD':   return 'Uploadé';
      case 'DOWNLOAD': return 'Téléchargé';
      case 'LOGIN':    return 'Connexion';
      case 'LOGOUT':   return 'Déconnexion';
      default:         return action || '—';
    }
  }

  formatDay(dt: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatTime(dt: string): string {
    if (!dt) return '';
    return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
