import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page d'accueil publique (non connecté) : explique ce qu'est TenCI à un visiteur
 * côté joueur — mission, parcours, avantages, licence fédérale à venir. Les admins
 * n'ont pas besoin de cette page, ils arrivent par /auth/login directement.
 * Route '' (racine), derrière guestGuard : un membre déjà connecté est renvoyé
 * vers /accueil, comme pour /auth/login.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {}
