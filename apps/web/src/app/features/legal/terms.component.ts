import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './legal.css',
  template: `
    <div class="legal-wrap">
      <button class="legal-back" (click)="back()">← Retour</button>

      <div class="legal-head">
        <h1>Conditions générales d'utilisation</h1>
        <p class="legal-updated">Dernière mise à jour : 4 septembre 2026 · Version 2026-09-04</p>
      </div>

      <p class="legal-note">
        Ce texte encadre l'usage de l'application. Il doit être relu par un conseil
        juridique avant toute communication officielle.
      </p>

      <div class="legal-body">
        <h2>1. Objet</h2>
        <p>
          L'application <strong>Abidjan Tennis Community (ATC)</strong> permet aux
          membres de se présenter, de trouver des partenaires de jeu, de publier des
          annonces et des défis, d'organiser des matchs et d'en enregistrer les
          résultats, et d'échanger entre eux. Son usage implique l'acceptation des
          présentes conditions et de la
          <a routerLink="/legal/confidentialite">politique de confidentialité</a>.
        </p>

        <h2>2. Compte</h2>
        <ul>
          <li>L'inscription est réservée aux personnes de 16 ans ou plus, ou aux mineurs disposant de l'accord de leur représentant légal.</li>
          <li>Vous fournissez des informations exactes et maintenez votre compte à jour.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants et des actions effectuées depuis votre compte.</li>
          <li>Un compte est strictement personnel.</li>
        </ul>

        <h2>3. Règles de conduite</h2>
        <p>En utilisant l'application, vous vous engagez à :</p>
        <ul>
          <li>respecter les autres membres, sans harcèlement, propos haineux, discriminatoires, menaçants ou sexuellement inappropriés ;</li>
          <li>ne publier aucun contenu illicite, trompeur, ou portant atteinte aux droits d'un tiers ;</li>
          <li>ne pas collecter ni diffuser les données d'autres membres en dehors de l'usage prévu ;</li>
          <li>ne pas perturber le fonctionnement du service ni tenter d'y accéder de façon non autorisée ;</li>
          <li>honorer les matchs que vous acceptez, ou prévenir votre partenaire à temps.</li>
        </ul>

        <h2>4. Contenu que vous publiez</h2>
        <p>
          Vous restez propriétaire de ce que vous publiez (présentation, photos,
          messages, scores). Vous accordez à ATC le droit de l'héberger et de
          l'afficher dans l'application aux fins du service. Vous garantissez détenir
          les droits nécessaires, notamment le droit à l'image des personnes
          figurant sur les photos que vous téléversez.
        </p>

        <h2>5. Matchs en personne</h2>
        <p>
          ATC met des joueurs en relation mais n'organise pas les rencontres et n'y
          participe pas. Vous jouez sous votre seule responsabilité. ATC n'est pas
          responsable des blessures, dommages, litiges ou comportements survenant à
          l'occasion d'un match ou d'un contact entre membres. Il vous appartient de
          vérifier votre couverture d'assurance et votre aptitude à la pratique
          sportive.
        </p>

        <h2>6. Classement</h2>
        <p>
          Le niveau et le classement sont calculés automatiquement à partir des
          scores enregistrés et validés. Ils sont indicatifs et n'ouvrent aucun
          droit.
        </p>

        <h2>7. Disponibilité du service</h2>
        <p>
          L'application est fournie « en l'état », par une communauté bénévole, sans
          garantie de disponibilité ni d'absence d'erreur. Le service peut être
          interrompu, modifié ou arrêté à tout moment.
        </p>

        <h2>8. Suspension et résiliation</h2>
        <p>
          Vous pouvez demander la suppression de votre compte à tout moment. ATC peut
          suspendre ou supprimer un compte en cas de manquement aux présentes
          conditions, notamment aux règles de conduite.
        </p>

        <h2>9. Propriété intellectuelle</h2>
        <p>
          Le nom, l'identité visuelle et l'interface de l'application appartiennent à
          ATC. Aucune reproduction en dehors de l'usage normal du service n'est
          autorisée sans accord.
        </p>

        <h2>10. Droit applicable</h2>
        <p>
          Les présentes conditions sont régies par le droit ivoirien. En cas de
          différend, une solution amiable sera recherchée avant toute action
          contentieuse.
        </p>

        <h2>11. Contact</h2>
        <p>
          <a href="mailto:guyaxelsomian&#64;gmail.com">guyaxelsomian&#64;gmail.com</a>
        </p>
      </div>
    </div>
  `,
})
export class LegalTermsComponent {
  private readonly location = inject(Location);
  back(): void { this.location.back(); }
}
