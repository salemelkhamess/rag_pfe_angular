import { Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConversationService, Conversation, Message } from '../../../core/services/conversation.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private conversationService = inject(ConversationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  conversationId = signal<string | null>(null);
  conversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  loading = signal(true);
  sending = signal(false);
  inputMessage = '';
  newConversationTitle = '';
  isNewConversation = signal(false);
  private shouldScroll = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new' || !id) {
      this.isNewConversation.set(true);
      this.loading.set(false);
    } else {
      this.conversationId.set(id);
      this.loadConversation(id);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  loadConversation(id: string): void {
    this.loading.set(true);
    this.conversationService.getConversation(id).subscribe({
      next: (conv) => {
        this.conversation.set(conv);
        this.loadMessages(id);
      },
      error: () => this.loading.set(false)
    });
  }

  loadMessages(conversationId: string): void {
    this.conversationService.getMessages(conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => this.loading.set(false)
    });
  }

  createAndSend(): void {
    const title = this.newConversationTitle.trim() || 'Nouvelle conversation';
    const firstMessage = this.inputMessage.trim();
    if (!firstMessage) return;

    this.loading.set(true);
    this.conversationService.createConversation({ title, agentType: 'document_qa' }).subscribe({
      next: (conv) => {
        this.conversationId.set(conv.id);
        this.conversation.set(conv);
        this.isNewConversation.set(false);
        this.router.navigate(['/conversations', conv.id], { replaceUrl: true });
        this.loading.set(false);
        this.doSendMessage(firstMessage);
      },
      error: () => this.loading.set(false)
    });
  }

  sendMessage(): void {
    const message = this.inputMessage.trim();
    if (!message || this.sending()) return;

    if (this.isNewConversation()) {
      this.createAndSend();
      return;
    }

    this.doSendMessage(message);
  }

  private doSendMessage(message: string): void {
    const conversationId = this.conversationId();
    if (!conversationId) return;

    const optimisticUser: Message = {
      id: `tmp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };
    this.messages.update(msgs => [...msgs, optimisticUser]);
    this.inputMessage = '';
    this.sending.set(true);
    this.shouldScroll = true;

    this.conversationService.addMessage(conversationId, { content: message }).subscribe({
      next: (aiMessage) => {
        this.messages.update(msgs => [...msgs, aiMessage]);
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
          createdAt: new Date().toISOString()
        };
        this.messages.update(msgs => [...msgs, errMsg]);
        this.sending.set(false);
        this.shouldScroll = true;
      }
    });
  }

  addFeedback(message: Message, feedbackType: string, rating: number): void {
    const conversationId = this.conversationId();
    if (!conversationId) return;

    this.conversationService.addFeedback(conversationId, message.id, {
      feedbackType,
      comment: feedbackType === 'helpful' ? 'Utile' : 'Pas utile',
      rating
    }).subscribe({
      next: (feedback) => {
        this.messages.update(msgs =>
          msgs.map(m => m.id === message.id ? { ...m, feedback } : m)
        );
      },
      error: (err) => console.error('Feedback error:', err)
    });
  }

  deleteConversation(): void {
    const id = this.conversationId();
    if (id && confirm('Supprimer cette conversation ?')) {
      this.conversationService.deleteConversation(id).subscribe({
        next: () => this.router.navigate(['/conversations']),
        error: (err) => console.error('Delete error:', err)
      });
    }
  }

  parseSources(sources: string | undefined): string[] {
    if (!sources) return [];
    try {
      const parsed = JSON.parse(sources);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  formatTime(ms: number | undefined): string {
    if (!ms) return '';
    return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }

  ngOnDestroy(): void {}
}
