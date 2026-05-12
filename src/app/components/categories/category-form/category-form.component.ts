// src/app/components/categories/category-form/category-form.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService, Category, CategoryRequest } from '../../../core/services/category.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.css']
})
export class CategoryFormComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal(false);
  categoryId = signal<string | null>(null);
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  categories = signal<Category[]>([]);

  formData: CategoryRequest = {
    name: '',
    description: '',
    color: '#007bff',
    icon: '📁',
    parentId: null,
    displayOrder: 0
  };

  colors = [
    { value: '#007bff', name: 'Blue' },
    { value: '#28a745', name: 'Green' },
    { value: '#dc3545', name: 'Red' },
    { value: '#ffc107', name: 'Yellow' },
    { value: '#17a2b8', name: 'Cyan' },
    { value: '#6f42c1', name: 'Purple' },
    { value: '#fd7e14', name: 'Orange' },
    { value: '#20c997', name: 'Teal' }
  ];

  icons = ['📁', '📄', '📊', '📈', '📉', '📋', '📌', '🔖', '🏷️', '⭐', '❤️', '💼', '🎓', '🏥', '🏦'];

  ngOnInit(): void {
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.categoryId.set(id);
      this.loadCategory(id);
    }
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadCategory(id: string): void {
    this.loading.set(true);
    this.categoryService.getCategoryById(id).subscribe({
      next: (category) => {
        this.formData = {
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          parentId: category.parentId,
          displayOrder: category.displayOrder
        };
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading category:', error);
        this.error.set('Failed to load category');
        this.loading.set(false);
      }
    });
  }

  getAvailableParents(): Category[] {
    const currentId = this.categoryId();
    return this.categories().filter(cat => {
      // Ne pas inclure la catégorie elle-même
      if (currentId && cat.id === currentId) return false;
      // Ne pas inclure les descendants (pour éviter les cycles)
      if (currentId && this.isDescendant(cat.id, currentId)) return false;
      return true;
    });
  }

  isDescendant(categoryId: string, ancestorId: string): boolean {
    const category = this.categories().find(c => c.id === categoryId);
    if (!category) return false;
    if (category.parentId === ancestorId) return true;
    if (category.parentId) return this.isDescendant(category.parentId, ancestorId);
    return false;
  }

  onSubmit(): void {
    if (!this.formData.name.trim()) {
      this.error.set('Category name is required');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const request = { ...this.formData };
    if (!request.parentId) request.parentId = null;

    if (this.isEditMode() && this.categoryId()) {
      this.categoryService.updateCategory(this.categoryId()!, request).subscribe({
        next: () => {
          this.router.navigate(['/categories']);
        },
        error: (error) => {
          console.error('Error updating category:', error);
          this.error.set(error.error?.message || 'Failed to update category');
          this.submitting.set(false);
        }
      });
    } else {
      this.categoryService.createCategory(request).subscribe({
        next: () => {
          this.router.navigate(['/categories']);
        },
        error: (error) => {
          console.error('Error creating category:', error);
          this.error.set(error.error?.message || 'Failed to create category');
          this.submitting.set(false);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/categories']);
  }
}
