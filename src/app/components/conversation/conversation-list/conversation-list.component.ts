import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConversationService, Conversation } from '../../../core/services/conversation.service';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.css']
})
export class ConversationListComponent implements OnInit {
  private conversationService = inject(ConversationService);

  conversations = signal<Conversation[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  pageSize = 20;
  totalPages = signal(0);
  totalCount = signal(0);
  searchTerm = '';
  showDeleteModal = signal(false);
  selectedConversation = signal<Conversation | null>(null);

  filteredConversations = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.conversations();
    return this.conversations().filter(conv =>
      conv.title?.toLowerCase().includes(term) ||
      conv.summary?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations(): void {
    this.loading.set(true);
    this.conversationService.getConversations(this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.conversations.set(response.conversations || []);
        this.totalPages.set(response.totalPages);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  confirmDelete(conversation: Conversation): void {
    this.selectedConversation.set(conversation);
    this.showDeleteModal.set(true);
  }

  deleteConversation(): void {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    this.conversationService.deleteConversation(conversation.id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.selectedConversation.set(null);
        this.loadConversations();
      },
      error: () => this.showDeleteModal.set(false)
    });
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.selectedConversation.set(null);
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.loadConversations();
    }
  }

  nextPage(): void {
    if (this.currentPage() + 1 < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadConversations();
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
