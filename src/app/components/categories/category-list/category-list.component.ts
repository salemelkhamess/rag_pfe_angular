// src/app/components/categories/category-list/category-list.component.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryService, Category } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.css']
})
export class CategoryListComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private toastService = inject(ToastService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  selectedCategory = signal<Category | null>(null);
  showDeleteModal = signal(false);
  expandedCategories = signal<Set<string>>(new Set());

  // Computed values
  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.categories();
    return this.categories().filter(cat =>
      cat.name.toLowerCase().includes(term) ||
      cat.description?.toLowerCase().includes(term)
    );
  });

  rootCategories = computed(() => {
    return this.filteredCategories().filter(cat => !cat.parentId);
  });

  constructor() {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoryService.getAllCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.loading.set(false);
      }
    });
  }

  getChildren(parentId: string): Category[] {
    return this.categories().filter(cat => cat.parentId === parentId);
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedCategories().has(categoryId);
  }

  toggleExpand(categoryId: string): void {
    const newSet = new Set(this.expandedCategories());
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    this.expandedCategories.set(newSet);
  }

  getLevelSpacing(level: number): string {
    return `${level * 1.5}rem`;
  }

  confirmDelete(category: Category): void {
    this.selectedCategory.set(category);
    this.showDeleteModal.set(true);
  }

  deleteCategory(): void {
    const category = this.selectedCategory();
    if (category) {
      this.categoryService.deleteCategory(category.id).subscribe({
        next: () => {
          this.showDeleteModal.set(false);
          this.selectedCategory.set(null);
          this.loadCategories();
        },
        error: (error) => {
          console.error('Error deleting category:', error);
          this.showDeleteModal.set(false);
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.selectedCategory.set(null);
  }

  toggleCategory(category: Category): void {
    const willEnable = !category.active;
    this.categoryService.toggleCategoryStatus(category.id).subscribe({
      next: (updated) => {
        this.categories.update(list =>
          list.map(c => c.id === updated.id ? { ...c, active: updated.active } : c)
        );
        this.toastService.success(
          willEnable
            ? `Catégorie "${category.name}" activée avec succès`
            : `Catégorie "${category.name}" désactivée avec succès`
        );
      },
      error: () => this.toastService.error('Erreur lors de la modification du statut')
    });
  }

  getStatusClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }

  getStatusText(active: boolean): string {
    return active ? 'Active' : 'Inactive';
  }
}
