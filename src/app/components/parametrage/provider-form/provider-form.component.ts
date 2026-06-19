import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LlmModelConfig,
  ModelRequest,
  ParametrageService,
  ProviderRequest,
} from '../../../core/services/parametrage.service';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './provider-form.component.html',
  styleUrls: ['./provider-form.component.css'],
})
export class ProviderFormComponent implements OnInit {
  private parametrageService = inject(ParametrageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal(false);
  providerId = signal<string | null>(null);
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  models = signal<LlmModelConfig[]>([]);

  providerForm: ProviderRequest = {
    code: '',
    name: '',
    displayName: '',
    baseUrl: '',
    apiKey: '',
    active: true,
    description: '',
  };

  modelForm: ModelRequest = {
    providerId: '',
    name: '',
    modelId: '',
    active: true,
    isDefault: false,
    contextWindow: undefined,
    description: '',
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.providerId.set(id);
      this.modelForm.providerId = id;
      this.loadProvider(id);
    }
  }

  loadProvider(id: string): void {
    this.loading.set(true);
    this.parametrageService.getProviderById(id).subscribe({
      next: (provider) => {
        this.providerForm = {
          code: provider.code,
          name: provider.name,
          displayName: provider.displayName ?? '',
          baseUrl: provider.baseUrl ?? '',
          active: provider.active,
          description: provider.description ?? '',
        };
        this.loadModels(id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le provider.');
        this.loading.set(false);
      },
    });
  }

  loadModels(providerId: string): void {
    this.parametrageService.getModelsByProvider(providerId).subscribe({
      next: (models) => this.models.set(models),
      error: () => this.models.set([]),
    });
  }

  onSubmitProvider(): void {
    if (!this.providerForm.code.trim() || !this.providerForm.name.trim()) {
      this.error.set('Le code et le nom du provider sont obligatoires.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const payload: ProviderRequest = {
      ...this.providerForm,
      code: this.providerForm.code.trim().toLowerCase(),
      name: this.providerForm.name.trim(),
    };

    if (this.isEditMode() && this.providerId()) {
      this.parametrageService.updateProvider(this.providerId()!, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigate(['/parametrage']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Échec de la mise à jour.');
          this.submitting.set(false);
        },
      });
    } else {
      this.parametrageService.createProvider(payload).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.router.navigate(['/parametrage/edit', created.id]);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Échec de la création.');
          this.submitting.set(false);
        },
      });
    }
  }

  addModel(): void {
    const pid = this.providerId();
    if (!pid) {
      this.error.set('Enregistrez d\'abord le provider avant d\'ajouter des modèles.');
      return;
    }
    if (!this.modelForm.name.trim() || !this.modelForm.modelId.trim()) {
      this.error.set('Le nom et le model ID sont obligatoires.');
      return;
    }

    const request: ModelRequest = {
      ...this.modelForm,
      providerId: pid,
      name: this.modelForm.name.trim(),
      modelId: this.modelForm.modelId.trim(),
    };

    this.parametrageService.createModel(request).subscribe({
      next: () => {
        this.modelForm = {
          providerId: pid,
          name: '',
          modelId: '',
          active: true,
          isDefault: false,
          contextWindow: undefined,
          description: '',
        };
        this.error.set(null);
        this.loadModels(pid);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Échec de l\'ajout du modèle.');
      },
    });
  }

  deleteModel(model: LlmModelConfig): void {
    if (!confirm(`Supprimer le modèle « ${model.name} » ?`)) return;
    this.parametrageService.deleteModel(model.id).subscribe({
      next: () => this.loadModels(model.providerId),
      error: () => this.error.set('Échec de la suppression du modèle.'),
    });
  }

  setDefault(model: LlmModelConfig): void {
    this.parametrageService.setDefaultModel(model.id).subscribe({
      next: () => this.loadModels(model.providerId),
      error: () => this.error.set('Impossible de définir le modèle par défaut.'),
    });
  }

  cancel(): void {
    this.router.navigate(['/parametrage']);
  }
}
