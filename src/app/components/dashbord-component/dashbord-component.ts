import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService, Document, DocumentStats } from '../../core/services/document.service';
import { ConversationService, Conversation, ConversationStats, ProviderStat, ModelStat } from '../../core/services/conversation.service';
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
  llmStats = signal<ConversationStats | null>(null);
  docStats = signal<DocumentStats | null>(null);

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
      llm: this.conversationService.getStats().pipe(catchError(() => of(null))),
      docStats: this.documentService.getStats().pipe(catchError(() => of(null))),
    }).subscribe(({ docs, convs, cats, llm, docStats }) => {
      const docTotal = docs?.totalElements ?? 0;
      const convTotal = convs?.totalCount ?? 0;
      const catTotal = Array.isArray(cats) ? cats.length : 0;

      this.documentCount.set(docTotal);
      this.conversationCount.set(convTotal);
      this.categoryCount.set(catTotal);
      this.recentDocuments.set(docs?.content ?? []);
      this.recentConversations.set(convs?.conversations ?? []);
      if (llm) this.llmStats.set(llm);
      if (docStats) this.docStats.set(docStats);

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

  get isAdmin(): boolean {
    const roles: string[] = this.currentUser?.roles ?? [];
    return roles.includes('admin');
  }

  get barMax(): number {
    return Math.max(...this.chartData.queries);
  }

  formatTokens(n: number | null | undefined): string {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toString();
  }

  formatMs(ms: number | null | undefined): string {
    if (ms == null) return '—';
    if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
    return Math.round(ms) + 'ms';
  }

  topUserTokenMax(): number {
    const top = this.llmStats()?.topUsersByTokens ?? [];
    return Math.max(1, ...top.map(u => u.tokensUsed ?? 0));
  }

  agentTypeEntries(): { key: string; value: number }[] {
    const dist = this.llmStats()?.agentTypeDistribution ?? {};
    return Object.entries(dist).map(([key, value]) => ({ key, value: value as number }));
  }

  agentTypeTotal(): number {
    return Object.values(this.llmStats()?.agentTypeDistribution ?? {}).reduce((a, b) => a + (b as number), 0) || 1;
  }

  providerMax(): number {
    return Math.max(1, ...(this.llmStats()?.providerStats ?? []).map(p => p.messageCount));
  }

  modelMax(): number {
    return Math.max(1, ...(this.llmStats()?.modelStats ?? []).map(m => m.messageCount));
  }

  formatPercent(rate: number | null | undefined): string {
    if (rate == null) return '—';
    return (rate * 100).toFixed(1) + '%';
  }

  dailyBarMax(): number {
    const daily = this.llmStats()?.dailyMessages ?? [];
    return Math.max(1, ...daily.map(d => d.count));
  }

  statusEntries(): { key: string; value: number }[] {
    const dist = this.docStats()?.statusDistribution ?? {};
    return Object.entries(dist).map(([key, value]) => ({ key, value: value as number }));
  }

  typeEntries(): { key: string; value: number }[] {
    const dist = this.docStats()?.typeDistribution ?? {};
    return Object.entries(dist).map(([key, value]) => ({ key, value: value as number }));
  }

  typeTotal(): number {
    return Object.values(this.docStats()?.typeDistribution ?? {}).reduce((a, b) => a + (b as number), 0) || 1;
  }

  citedDocMax(): number {
    const cited = this.llmStats()?.topCitedDocuments ?? [];
    return Math.max(1, ...cited.map(d => d.citationCount));
  }

  formatStorage(bytes: number | null | undefined): string {
    if (bytes == null || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}
