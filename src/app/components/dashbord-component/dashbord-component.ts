import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {AuthService} from '../../core/services/auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-dashbord-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashbord-component.html',
  styleUrl: './dashbord-component.css',
})
export class DashbordComponent  implements OnInit{
  currentUser: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  // Statistiques principales
  stats = [
    {
      title: 'Documents',
      value: '1,234',
      icon: '📄',
      change: '+12%',
      color: '#667eea'
    },
    {
      title: 'Questions traitées',
      value: '8,549',
      icon: '💬',
      change: '+23%',
      color: '#48bb78'
    },
    {
      title: 'Taux de réponse',
      value: '94.5%',
      icon: '🎯',
      change: '+5.2%',
      color: '#f6ad55'
    },
    {
      title: 'Utilisateurs actifs',
      value: '342',
      icon: '👥',
      change: '+18%',
      color: '#fc8181'
    }
  ];

  // Données pour les graphiques
  chartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    queries: [45, 52, 48, 62, 78, 85, 92, 110, 125, 142, 168, 189],
    documents: [12, 19, 25, 32, 41, 55, 68, 82, 95, 110, 128, 145]
  };

  // Documents récents
  recentDocuments = [
    { name: 'Guide utilisateur RAG.pdf', type: 'PDF', size: '2.4 MB', date: '2024-03-30', status: 'indexé' },
    { name: 'Documentation API.docx', type: 'DOCX', size: '1.8 MB', date: '2024-03-29', status: 'indexé' },
    { name: 'Rapport trimestriel Q1.pdf', type: 'PDF', size: '3.2 MB', date: '2024-03-28', status: 'en cours' },
    { name: 'FAQ Client.xlsx', type: 'XLSX', size: '856 KB', date: '2024-03-27', status: 'indexé' },
    { name: 'Spécifications techniques.pdf', type: 'PDF', size: '4.1 MB', date: '2024-03-26', status: 'erreur' }
  ];

  // Questions récentes
  recentQueries = [
    { question: "Quels sont les avantages de RAG ?", response: "RAG combine la recherche d'informations avec la génération...", time: "Il y a 5 min", rating: 4.5 },
    { question: "Comment importer des documents ?", response: "Vous pouvez importer des documents via l'interface d'administration...", time: "Il y a 12 min", rating: 5 },
    { question: "Le système supporte-t-il le français ?", response: "Oui, le système supporte parfaitement le français...", time: "Il y a 1 heure", rating: 4 },
    { question: "Comment améliorer la précision ?", response: "Pour améliorer la précision, assurez-vous d'avoir des documents...", time: "Il y a 2 heures", rating: 3.5 }
  ];

  // Activité récente
  activities = [
    { user: 'John Doe', action: 'a ajouté un document', item: 'Guide RAG.pdf', time: '5 min', avatar: '👨‍💼' },
    { user: 'Jane Smith', action: 'a posé une question', item: 'Comment utiliser RAG ?', time: '12 min', avatar: '👩‍💼' },
    { user: 'Admin', action: 'a mis à jour les paramètres', item: 'Configuration système', time: '1 heure', avatar: '👨‍💻' },
    { user: 'Marie Martin', action: 'a exporté un rapport', item: 'Statistiques Q1', time: '2 heures', avatar: '👩‍💻' }
  ];

  // Méthodes
  getStatusClass(status: string): string {
    switch(status) {
      case 'indexé': return 'status-success';
      case 'en cours': return 'status-warning';
      case 'erreur': return 'status-error';
      default: return '';
    }
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    let stars = '★'.repeat(fullStars);
    if (halfStar) stars += '½';
    stars += '☆'.repeat(5 - Math.ceil(rating));
    return stars;
  }
}
