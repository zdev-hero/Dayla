# Guide d'utilisation de Bootstrap dans Dayla

## Configuration

Bootstrap a été configuré dans le projet avec les éléments suivants :

### Dépendances installées

- `bootstrap` - Framework CSS principal
- `bootstrap-icons` - Icônes Bootstrap
- `@types/bootstrap` - Types TypeScript pour Bootstrap

### Configuration Angular (angular.json)

```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",
  "node_modules/bootstrap-icons/font/bootstrap-icons.css",
  "src/styles.scss"
],
"scripts": [
  "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"
]
```

### Variables SCSS personnalisées (styles.scss)

```scss
// Variables Bootstrap personnalisées
$primary: #2c6fff;
$secondary: #6b7280;
$success: #22c55e;
$warning: #f59e0b;
$danger: #ef4444;

// Import Bootstrap
@import "~bootstrap/scss/bootstrap";
```

## Utilisation

### Classes Bootstrap principales utilisées

#### Layout et Grid System

```html
<!-- Container responsive -->
<div class="container-fluid">
  <div class="row">
    <div class="col-lg-8 col-md-6 col-12">Contenu principal</div>
    <div class="col-lg-4 col-md-6 col-12">Sidebar</div>
  </div>
</div>
```

#### Cartes (Cards)

```html
<div class="card">
  <div class="card-header">
    <h5 class="card-title">Titre</h5>
  </div>
  <div class="card-body">Contenu de la carte</div>
</div>
```

#### Formulaires

```html
<form>
  <div class="mb-3">
    <label for="email" class="form-label">Email</label>
    <input type="email" class="form-control" id="email" />
  </div>
  <div class="mb-3">
    <select class="form-select">
      <option>Choisir...</option>
    </select>
  </div>
  <button type="submit" class="btn btn-primary">Soumettre</button>
</form>
```

#### Boutons

```html
<button class="btn btn-primary">Principal</button>
<button class="btn btn-secondary">Secondaire</button>
<button class="btn btn-outline-primary">Contour</button>
<button class="btn btn-sm btn-primary">Petit</button>
```

#### Navigation

```html
<ul class="nav nav-pills flex-column">
  <li class="nav-item">
    <a class="nav-link active" href="#">Actif</a>
  </li>
  <li class="nav-item">
    <a class="nav-link" href="#">Lien</a>
  </li>
</ul>
```

### Icônes Bootstrap Icons

```html
<!-- Icônes couramment utilisées dans l'app -->
<i class="bi bi-grid-3x3-gap"></i>
<!-- Tableau de bord -->
<i class="bi bi-people"></i>
<!-- Salariés -->
<i class="bi bi-calendar-check"></i>
<!-- Congés -->
<i class="bi bi-gear"></i>
<!-- Paramètres -->
<i class="bi bi-chevron-left"></i>
<!-- Navigation -->
<i class="bi bi-chevron-right"></i>
<!-- Navigation -->
```

### Utilitaires de spacing et positionnement

```html
<!-- Margins et padding -->
<div class="m-3">Margin 3</div>
<div class="p-4">Padding 4</div>
<div class="mb-3">Margin bottom 3</div>

<!-- Flexbox -->
<div class="d-flex justify-content-between align-items-center">
  <span>Gauche</span>
  <span>Droite</span>
</div>

<!-- Texte -->
<p class="text-muted">Texte atténué</p>
<p class="fw-semibold">Texte semi-gras</p>
<h5 class="mb-0">Titre sans marge</h5>
```

### Classes de taille de texte

```html
<p class="small">Petit texte</p>
<h6 class="h5">Titre stylé comme h5</h6>
```

## Responsive Design

Bootstrap utilise un système de breakpoints :

- `xs` : < 576px
- `sm` : ≥ 576px
- `md` : ≥ 768px
- `lg` : ≥ 992px
- `xl` : ≥ 1200px
- `xxl` : ≥ 1400px

Exemples d'usage responsive :

```html
<div class="col-12 col-md-6 col-lg-4">
  <!-- 12 cols sur mobile, 6 sur tablette, 4 sur desktop -->
</div>

<div class="d-none d-md-block">
  <!-- Caché sur mobile, visible à partir de md -->
</div>
```

## Personnalisation

### Variables SCSS personnalisées

Les variables Bootstrap peuvent être surchargées dans `styles.scss` :

```scss
// Couleurs personnalisées
$primary: #2c6fff;
$border-radius: 12px;
$font-family-base: "Inter", sans-serif;

// Import Bootstrap après les variables
@import "~bootstrap/scss/bootstrap";
```

### Styles personnalisés

Les styles spécifiques au projet peuvent être ajoutés après l'import Bootstrap :

```scss
// Styles personnalisés pour les composants
.custom-card {
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.06);
}
```

## Bonnes pratiques

1. **Utiliser les classes Bootstrap autant que possible** avant d'écrire du CSS personnalisé
2. **Préférer les utilitaires Bootstrap** pour l'espacement et le positionnement
3. **Utiliser le grid system** pour les layouts responsives
4. **Personnaliser via les variables SCSS** plutôt que de surcharger les styles
5. **Tester la responsivité** sur différentes tailles d'écran

## Exemples de composants modifiés

### Composants adaptés

- `leave-balance-overview` : Utilise les classes card de Bootstrap
- `leave-request-form` : Formulaire complet avec classes Bootstrap
- `main-dashboard` : Layout responsive avec grid Bootstrap
- `navigation-menu` : Navigation avec Bootstrap Icons

Chaque composant conserve ses styles spécifiques tout en utilisant Bootstrap pour la structure de base.
