import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-legal-privacy',
  standalone: true,
  styleUrl: './legal.css',
  template: `
    <div class="legal-wrap">
      <button class="legal-back" (click)="back()">← Retour</button>

      <div class="legal-head">
        <h1>Politique de confidentialité</h1>
        <p class="legal-updated">Dernière mise à jour : 4 septembre 2026 · Version 2026-09-04</p>
      </div>

      <p class="legal-note">
        Ce texte décrit fidèlement le fonctionnement actuel de l'application. Il doit
        être relu par un conseil juridique avant toute communication officielle,
        notamment pour les formalités auprès de l'ARTCI (Côte d'Ivoire).
      </p>

      <div class="legal-body">
        <h2>1. Qui est responsable de vos données</h2>
        <p>
          <strong>Abidjan Tennis Community (ATC)</strong>, communauté de joueuses et
          joueurs de tennis basée à Abidjan, Côte d'Ivoire, est responsable du
          traitement des données personnelles collectées via l'application.
          Contact : <a href="mailto:guyaxelsomian&#64;gmail.com">guyaxelsomian&#64;gmail.com</a>.
        </p>

        <h2>2. Données que nous collectons</h2>
        <ul>
          <li><strong>Compte</strong> : nom, adresse e-mail, mot de passe (chiffré), ou identifiant Google si vous vous connectez avec Google.</li>
          <li><strong>Profil</strong> : niveau de jeu, ville, club, et si vous les renseignez : téléphone, âge, courts et créneaux préférés, raquette, présentation, photo de profil.</li>
          <li><strong>Activité</strong> : annonces de match, demandes, défis, matchs joués et scores, classement, messages échangés avec vos partenaires, articles enregistrés.</li>
          <li><strong>Données techniques</strong> : adresse IP, date et heure des requêtes, type d'action, identifiant de session — conservées dans les journaux du serveur à des fins de sécurité et de diagnostic.</li>
          <li><strong>Notifications push</strong> : identifiant d'abonnement de votre navigateur/appareil, si vous activez les notifications.</li>
        </ul>

        <h2>3. Pourquoi et sur quelle base</h2>
        <ul>
          <li><strong>Fournir le service</strong> (compte, annonces, matchs, messagerie, classement) — exécution du contrat qui nous lie.</li>
          <li><strong>E-mails liés à votre activité</strong> (défi reçu, score à valider, message reçu, confirmation d'adresse, mot de passe oublié) — exécution du contrat.</li>
          <li><strong>Annuaire des membres</strong> (votre nom, niveau, ville, club, photo et statistiques visibles des autres membres connectés) — intérêt légitime à faire vivre la communauté. Vous pouvez demander à en être retiré.</li>
          <li><strong>Sécurité, prévention des abus, diagnostic</strong> (journaux, suivi d'erreurs) — intérêt légitime.</li>
          <li><strong>Notifications push et actualités envoyées à tous</strong> — votre consentement, retirable à tout moment.</li>
        </ul>

        <h2>4. Qui a accès à vos données</h2>
        <p>
          Vos données ne sont ni vendues ni louées. Elles sont traitées par des
          prestataires techniques agissant pour notre compte :
        </p>
        <table class="legal-table">
          <tr><th>Prestataire</th><th>Rôle</th><th>Lieu</th></tr>
          <tr><td>Neon</td><td>Base de données</td><td>Union européenne (Francfort)</td></tr>
          <tr><td>Render</td><td>Hébergement du serveur</td><td>Union européenne (Francfort)</td></tr>
          <tr><td>Vercel</td><td>Hébergement de l'interface</td><td>Réseau international</td></tr>
          <tr><td>Cloudinary</td><td>Stockage des images (photos de profil, clubs, articles)</td><td>International</td></tr>
          <tr><td>Maileroo</td><td>Envoi des e-mails</td><td>International</td></tr>
          <tr><td>Google</td><td>Connexion « Continuer avec Google » (si vous l'utilisez)</td><td>International</td></tr>
          <tr><td>Sentry</td><td>Suivi des erreurs techniques</td><td>International</td></tr>
        </table>
        <p>
          Nos serveurs et notre base de données sont hébergés dans l'Union européenne.
          Certains prestataires peuvent traiter des données hors de Côte d'Ivoire et de
          l'UE ; ces transferts sont encadrés contractuellement.
        </p>

        <h2>5. Combien de temps nous les gardons</h2>
        <ul>
          <li><strong>Compte et profil</strong> : tant que votre compte est actif, puis supprimés à votre demande.</li>
          <li><strong>Historique des matchs et classement</strong> : conservés tant que le compte existe (mémoire sportive de la communauté).</li>
          <li><strong>Messages</strong> : conservés tant que la relation existe entre les deux joueurs ; supprimés avec le compte.</li>
          <li><strong>Journaux techniques</strong> : quelques semaines maximum.</li>
          <li><strong>Jetons</strong> (confirmation d'e-mail, mot de passe oublié) : expiration sous 24 h à 30 minutes.</li>
        </ul>

        <h2>6. Vos droits</h2>
        <p>Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition, de portabilité, et du droit de retirer votre consentement à tout moment.</p>
        <p>
          Une partie s'exerce directement dans l'application (modifier votre profil,
          désactiver les notifications). Pour le reste — export de vos données,
          suppression de votre compte, retrait de l'annuaire — écrivez-nous à
          <a href="mailto:guyaxelsomian&#64;gmail.com">guyaxelsomian&#64;gmail.com</a>.
        </p>
        <p>
          Vous pouvez introduire une réclamation auprès de l'<strong>Autorité de
          Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI)</strong>, ou
          de l'autorité de protection des données de votre pays de résidence.
        </p>

        <h2>7. Stockage local sur votre appareil</h2>
        <p>
          L'application utilise le stockage local de votre navigateur pour vous garder
          connecté et retenir vos préférences (clubs favoris, articles enregistrés).
          Aucun de ces éléments n'est utilisé à des fins publicitaires. Le suivi
          d'erreurs (Sentry) n'est activé que pour diagnostiquer des pannes et ne
          collecte pas d'identifiants publicitaires.
        </p>

        <h2>8. Mineurs</h2>
        <p>
          L'application s'adresse aux personnes de 16 ans ou plus. Un mineur ne peut
          s'inscrire qu'avec l'accord de son représentant légal, qui peut à tout
          moment demander la suppression du compte.
        </p>

        <h2>9. Sécurité</h2>
        <p>
          Les mots de passe sont chiffrés, les échanges se font en HTTPS, l'accès aux
          données est restreint. En cas de violation de données susceptible de vous
          exposer à un risque, nous en informerons l'autorité compétente et les
          personnes concernées.
        </p>

        <h2>10. Modifications</h2>
        <p>
          En cas de modification importante de cette politique, la version est mise à
          jour et il vous est demandé de l'accepter à nouveau lors de votre prochaine
          connexion.
        </p>
      </div>
    </div>
  `,
})
export class LegalPrivacyComponent {
  private readonly location = inject(Location);
  back(): void { this.location.back(); }
}
