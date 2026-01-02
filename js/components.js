// Load Header Component
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
    loadFooter();
});

function loadHeader() {
    const header = document.getElementById('header');
    if (header) {
        header.innerHTML = `
            <nav class="border-b border-gray-200 bg-cream">
                <div class="container mx-auto px-6 py-4">
                    <div class="flex items-center justify-between">
                        <a href="index.html" class="font-serif text-2xl font-bold text-primary">
                            Gigabole
                        </a>
                        <ul class="flex items-center space-x-8">
                            <li>
                                <a href="index.html" class="text-gray-700 hover:text-primary transition-colors">
                                    Accueil
                                </a>
                            </li>
                            <li>
                                <a href="catalogue/index.html" class="text-gray-700 hover:text-primary transition-colors">
                                    Catalogue
                                </a>
                            </li>
                            <li>
                                <a href="#apropos" class="text-gray-700 hover:text-primary transition-colors">
                                    À propos
                                </a>
                            </li>
                            <li>
                                <a href="#contact" class="text-gray-700 hover:text-primary transition-colors">
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }
}

function loadFooter() {
    const footer = document.getElementById('footer');
    if (footer) {
        footer.innerHTML = `
            <footer class="border-t border-gray-200 bg-cream mt-16">
                <div class="container mx-auto px-6 py-12">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 class="font-serif text-xl font-semibold text-primary mb-4">Gigabole</h3>
                            <p class="text-gray-600 text-sm">
                                Éditeur indépendant dédié à la publication de livres de qualité.
                            </p>
                        </div>
                        <div>
                            <h4 class="font-sans text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                                Navigation
                            </h4>
                            <ul class="space-y-2">
                                <li><a href="index.html" class="text-gray-600 hover:text-primary text-sm transition-colors">Accueil</a></li>
                                <li><a href="catalogue/index.html" class="text-gray-600 hover:text-primary text-sm transition-colors">Catalogue</a></li>
                                <li><a href="#apropos" class="text-gray-600 hover:text-primary text-sm transition-colors">À propos</a></li>
                                <li><a href="#contact" class="text-gray-600 hover:text-primary text-sm transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-sans text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                                Contact
                            </h4>
                            <ul class="space-y-2 text-sm text-gray-600">
                                <li>contact@gigabole.fr</li>
                                <li>Suivez-nous sur les réseaux sociaux</li>
                            </ul>
                        </div>
                    </div>
                    <div class="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
                        <p>&copy; ${new Date().getFullYear()} Gigabole. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        `;
    }
}

