// document-upload.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { DocumentService } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.css']
})
export class DocumentUploadComponent implements OnDestroy {
  selectedFile: File | null = null;
  documentName = '';
  description = '';
  documentType = 'TXT';
  uploadProgress: number = 0;
  uploadSuccess = false;
  uploadError = '';
  isUploading = false;
  isDragging = false;
  private destroy$ = new Subject<void>();
  private uploadSubscription: Subscription | null = null;
  private progressInterval: number | null = null;  // Changé: number au lieu de NodeJS.Timeout

  constructor(
    private documentService: DocumentService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    if (file.size > 100 * 1024 * 1024) {
      this.uploadError = 'File size exceeds 100MB limit';
      return;
    }

    this.selectedFile = file;
    this.uploadError = '';
    this.uploadSuccess = false;

    if (!this.documentName) {
      this.documentName = file.name.replace(/\.[^/.]+$/, '');
    }
  }

  upload(): void {
    if (this.isUploading) {
      console.warn('Upload already in progress');
      return;
    }

    if (!this.selectedFile || !this.documentName) {
      this.uploadError = 'Please select a file and enter a document name';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadSuccess = false;
    this.uploadError = '';

    // Simuler la progression
    this.startProgressSimulation();

    this.uploadSubscription = this.documentService
      .uploadDocument(this.selectedFile, this.documentName, this.description, this.documentType)
      .pipe(
        finalize(() => {
          this.stopProgressSimulation();
          this.isUploading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Upload successful:', response);
          this.uploadProgress = 100;
          this.uploadSuccess = true;

          setTimeout(() => {
            this.router.navigate(['/documents']);
          }, 2000);
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.uploadError = error.message || 'Upload failed. Please try again.';
          this.uploadProgress = 0;
          this.uploadSuccess = false;
        }
      });
  }

  private startProgressSimulation(): void {
    let progress = 0;
    this.progressInterval = window.setInterval(() => {
      if (progress < 90 && this.isUploading) {
        progress += 10;
        this.uploadProgress = progress;
      }
    }, 500);
  }

  private stopProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  resetForm(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }

    this.stopProgressSimulation();

    this.selectedFile = null;
    this.documentName = '';
    this.description = '';
    this.documentType = 'TXT';
    this.uploadProgress = 0;
    this.uploadSuccess = false;
    this.uploadError = '';
    this.isUploading = false;

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  cancelUpload(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
    this.stopProgressSimulation();
    this.isUploading = false;
    this.uploadProgress = 0;
    this.uploadError = 'Upload cancelled';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }
    this.stopProgressSimulation();
  }
}
