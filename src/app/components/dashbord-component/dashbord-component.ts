import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService, Document } from '../../core/services/document.service';
import { ConversationService, Conversation } from '../../core/services/conversation.service';
import { CategoryService } from '../../core/services/category.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashbord-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashbord-component.html',
  styleUrl: './dashbord-component.css',
})
export class DashbordComponent implements OnInit {
  currentUser: any;
  loading = signal(true);

  documentCount = signal(0);
  conversationCount = signal(0);
  categoryCount = signal(0);
  recentDocuments = signal<Document[]>([]);
  recentConversations = signal<Conversation[]>([]);

  stats = signal([
    { title: 'Documents', value: '—', icon: '📄', color: '#667eea', link: '/documents' },
    { title: 'Conversations', value: '—', icon: '💬', color: '#48bb78', link: '/conversations' },
    { title: 'Catégories', value: '—', icon: '🗂️', color: '#f6ad55', link: '/categories' },
    { title: 'Taux de succès', value: '—', icon: '🎯', color: '#fc8181', link: null },
  ]);

  chartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    queries: [45, 52, 48, 62, 78, 85, 92, 110, 125, 142, 168, 189],
    documents: [12, 19, 25, 32, 41, 55, 68, 82, 95, 110, 128, 145]
  };

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private conversationService: ConversationService,
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => { this.currentUser = user; });
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    forkJoin({
      docs: this.documentService.getDocuments(0, 5).pipe(catchError(() => of(null))),
      convs: this.conversationService.getConversations(0, 5).pipe(catchError(() => of(null))),
      cats: this.categoryService.getAllCategories().pipe(catchError(() => of(null))),
    }).subscribe(({ docs, convs, cats }) => {
      const docTotal = docs?.totalElements ?? 0;
      const convTotal = convs?.totalCount ?? 0;
      const catTotal = Array.isArray(cats) ? cats.length : 0;

      this.documentCount.set(docTotal);
      this.conversationCount.set(convTotal);
      this.categoryCount.set(catTotal);
      this.recentDocuments.set(docs?.content ?? []);
      this.recentConversations.set(convs?.conversations ?? []);

      this.stats.set([
        { title: 'Documents', value: this.formatCount(docTotal), icon: '📄', color: '#667eea', link: '/documents' },
        { title: 'Conversations', value: this.formatCount(convTotal), icon: '💬', color: '#48bb78', link: '/conversations' },
        { title: 'Catégories', value: this.formatCount(catTotal), icon: '🗂️', color: '#f6ad55', link: '/categories' },
        { title: 'Documents indexés', value: this.formatIndexed(docs?.content ?? []), icon: '✅', color: '#6366f1', link: '/documents' },
      ]);

      this.loading.set(false);
    });
  }

  private formatCount(n: number): string {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();
  }

  private formatIndexed(docs: Document[]): string {
    const total = this.documentCount();
    if (total === 0) return '0%';
    const indexed = docs.filter(d => d.status === 'INDEXED' || d.status === 'indexé').length;
    const ratio = total > 5 ? Math.round((indexed / docs.length) * 100) : 100;
    return ratio + '%';
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'indexed' || s === 'indexé') return 'status-success';
    if (s === 'processing' || s === 'en cours') return 'status-warning';
    if (s === 'error' || s === 'erreur') return 'status-error';
    return 'status-warning';
  }

  getStatusLabel(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'indexed') return 'Indexé';
    if (s === 'processing') return 'En cours';
    if (s === 'error') return 'Erreur';
    return status ?? '—';
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileType(mimeType: string | undefined): string {
    if (!mimeType) return '—';
    const parts = mimeType.split('/');
    return parts.length > 1 ? parts[1].toUpperCase() : mimeType.toUpperCase();
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get barMax(): number {
    return Math.max(...this.chartData.queries);
  }
}
