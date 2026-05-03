import { Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConversationService, Conversation, Message, StreamCallbacks } from '../../../core/services/conversation.service';
import { LlmService, ProviderInfo } from '../../../core/services/llm.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private conversationService = inject(ConversationService);
  private llmService = inject(LlmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  conversationId = signal<string | null>(null);
  conversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  loading = signal(true);
  sending = signal(false);
  isStreaming = signal(false);
  inputMessage = '';
  newConversationTitle = '';
  isNewConversation = signal(false);
  private shouldScroll = false;
  private streamController: AbortController | null = null;

  readonly STREAMING_ID = '__streaming__';

  providers = signal<ProviderInfo[]>([
    { name: 'ollama', available: true, defaultModel: 'llama3:latest', models: ['llama3:latest', 'mistral:latest', 'deepseek-r1:latest', 'gemma4:latest', 'qwen3.5:cloud', 'gpt-oss:20b'] },
    { name: 'openai', available: true, defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'] }
  ]);
  selectedProvider = localStorage.getItem('llm_provider') ?? 'ollama';
  selectedModel = localStorage.getItem('llm_model') ?? 'llama3:latest';

  get currentModels(): string[] {
    const provider = this.providers().find(p => p.name === this.selectedProvider);
    const models = provider?.models ?? [this.selectedModel];
    return models.filter(m => m && m.trim().length > 0);
  }

  ngOnInit(): void {
    this.loadProviders();
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new' || !id) {
      this.isNewConversation.set(true);
      this.loading.set(false);
    } else {
      this.conversationId.set(id);
      const initialMessage = (window.history.state as any)?.initialMessage as string | undefined;
      if (initialMessage) {
        this.conversationService.getConversation(id).subscribe({
          next: (conv) => {
            this.conversation.set(conv);
            this.loading.set(false);
            this.doSendMessage(initialMessage);
          },
          error: () => this.loading.set(false)
        });
      } else {
        this.loadConversation(id);
      }
    }
  }

  loadProviders(): void {
    this.llmService.getProviders().subscribe({
      next: (providers) => {
        if (providers && providers.length > 0) {
          this.providers.set(providers);
          // Only apply API defaults when the user has no saved preference
          if (!localStorage.getItem('llm_provider')) {
            const available = providers.find(p => p.available);
            if (available) {
              this.selectedProvider = available.name;
              this.selectedModel = available.defaultModel || available.models?.[0] || this.selectedModel;
            }
          }
        }
      },
      error: () => {}
    });
  }

  onProviderChange(): void {
    const provider = this.providers().find(p => p.name === this.selectedProvider);
    if (provider) {
      this.selectedModel = provider.defaultModel || provider.models?.[0] || '';
    }
    this.saveSelection();
  }

  onModelChange(): void {
    this.saveSelection();
  }

  private saveSelection(): void {
    localStorage.setItem('llm_provider', this.selectedProvider);
    localStorage.setItem('llm_model', this.selectedModel);
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
        // Navigate avec le message initial dans le state.
        // Le nouveau composant le récupère dans ngOnInit() et démarre le stream.
        this.router.navigate(['/conversations', conv.id], {
          replaceUrl: true,
          state: { initialMessage: firstMessage }
        });
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

    this.inputMessage = '';
    this.sending.set(true);
    this.isStreaming.set(false);
    this.shouldScroll = true;

    const streamingPlaceholder: Message = {
      id: this.STREAMING_ID,
      conversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };

    const callbacks: StreamCallbacks = {
      onUserSaved: (userMsg) => {
        this.messages.update(msgs => [...msgs, userMsg, streamingPlaceholder]);
        this.isStreaming.set(true);
        this.shouldScroll = true;
      },
      onToken: (token) => {
        this.messages.update(msgs =>
          msgs.map(m => m.id === this.STREAMING_ID
            ? { ...m, content: m.content + token }
            : m)
        );
        this.shouldScroll = true;
      },
      onDone: (aiMsg) => {
        this.messages.update(msgs =>
          msgs.map(m => m.id === this.STREAMING_ID ? aiMsg : m)
        );
        this.sending.set(false);
        this.isStreaming.set(false);
        this.shouldScroll = true;
      },
      onError: (err) => {
        this.messages.update(msgs =>
          msgs.filter(m => m.id !== this.STREAMING_ID)
        );
        this.messages.update(msgs => [...msgs, {
          id: `err-${Date.now()}`,
          conversationId,
          role: 'assistant' as const,
          content: err.includes('HTTP') ? "Désolé, une erreur s'est produite." : err,
          createdAt: new Date().toISOString()
        }]);
        this.sending.set(false);
        this.isStreaming.set(false);
        this.shouldScroll = true;
      }
    };

    this.streamController = this.conversationService.streamMessage(
      conversationId,
      { content: message, llmProvider: this.selectedProvider, llmModel: this.selectedModel },
      callbacks
    );
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

  ngOnDestroy(): void {
    this.streamController?.abort();
  }
}
