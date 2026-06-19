import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LlmModelConfig,
  LlmProviderConfig,
  ParametrageService,
} from '../../../core/services/parametrage.service';

@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './provider-list.component.html',
  styleUrls: ['./provider-list.component.css'],
})
export class ProviderListComponent implements OnInit {
  private parametrageService = inject(ParametrageService);

  providers = signal<LlmProviderConfig[]>([]);
  models = signal<LlmModelConfig[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  expandedProviders = signal<Set<string>>(new Set());
  selectedProvider = signal<LlmProviderConfig | null>(null);
  showDeleteModal = signal(false);

  filteredProviders = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.providers();
    return this.providers().filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.parametrageService.getAllProviders().subscribe({
      next: (providers) => {
        this.providers.set(providers);
        this.parametrageService.getAllModels().subscribe({
          next: (models) => {
            this.models.set(models);
            this.loading.set(false);
          },
          error: () => {
            this.models.set([]);
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Error loading providers:', err);
        this.loading.set(false);
      },
    });
  }

  getModelsForProvider(providerId: string): LlmModelConfig[] {
    return this.models().filter((m) => m.providerId === providerId);
  }

  isExpanded(providerId: string): boolean {
    return this.expandedProviders().has(providerId);
  }

  toggleExpand(providerId: string): void {
    const next = new Set(this.expandedProviders());
    if (next.has(providerId)) next.delete(providerId);
    else next.add(providerId);
    this.expandedProviders.set(next);
  }

  confirmDelete(provider: LlmProviderConfig): void {
    this.selectedProvider.set(provider);
    this.showDeleteModal.set(true);
  }

  deleteProvider(): void {
    const provider = this.selectedProvider();
    if (!provider) return;
    this.parametrageService.deleteProvider(provider.id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.selectedProvider.set(null);
        this.loadData();
      },
      error: (err) => console.error('Error deleting provider:', err),
    });
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.selectedProvider.set(null);
  }

  getStatusClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }

  getStatusText(active: boolean): string {
    return active ? 'Actif' : 'Inactif';
  }
}
