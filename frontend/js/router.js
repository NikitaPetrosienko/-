/**
 * Deterministic hash-based routing module
 * Single source of truth for navigation
 */

const ROUTER_DEBUG = false; // Set to true for diagnostic logs

class Router {
    constructor() {
        this.currentRoute = null;
        this.params = {};
        this.listeners = [];
        this.routes = {
            'category': 'screen-category',
            'model': 'screen-model',
            'competency': 'screen-competency'
        };
    }

    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle initial route after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.handleRoute());
        } else {
            this.handleRoute();
        }
    }

    handleRoute() {
        const hash = window.location.hash.slice(1);
        let route = 'category';
        let params = {};

        if (ROUTER_DEBUG) console.log('[Router] Current hash:', hash);

        // Parse route and params
        if (!hash || hash === '' || hash === '/category') {
            route = 'category';
        } else if (hash.startsWith('/model')) {
            route = 'model';
        } else if (hash.startsWith('/competency')) {
            route = 'competency';
            // Parse query params: #/competency?key=xxx&level=3
            params = this.parseQueryParams(hash);
            params.key = params.key || '';
            params.level = params.level || '';
        } else {
            // Try to parse old format for backward compatibility
            const parts = hash.split('/').filter(p => p);
            if (parts.length > 0) {
                route = parts[0];
                if (route === 'model' && parts.length > 1) {
                    params.categoryId = parts[1];
                } else if (route === 'competency' && parts.length > 1) {
                    params.key = parts[1];
                    if (parts.length > 2) {
                        params.categoryId = parts[2];
                    }
                }
            }
        }

        // Check localStorage for initial route
        if (route === 'category') {
            const savedCategory = localStorage.getItem('selectedCategoryId');
            if (savedCategory) {
                route = 'model';
                params.categoryId = savedCategory;
                if (!hash || hash === '' || hash === '/category') {
                    window.location.hash = '#/model';
                }
            }
        }

        if (ROUTER_DEBUG) console.log('[Router] Route:', route, 'Params:', params);

        this.currentRoute = route;
        this.params = params;

        // Toggle screens
        this.setActiveScreen(route);

        // Notify listeners exactly once
        this.listeners.forEach(listener => {
            try {
                listener(route, params);
            } catch (error) {
                console.error('[Router] Error in listener:', error);
            }
        });
    }

    navigate(route, params = {}, updateHash = true) {
        if (ROUTER_DEBUG) console.log('[Router] Navigate to:', route, params);

        let hash = '';

        switch (route) {
            case 'category':
                hash = '#/category';
                break;
            case 'model':
                hash = '#/model';
                if (params.categoryId) {
                    // Store in localStorage
                    localStorage.setItem('selectedCategoryId', params.categoryId);
                }
                break;
            case 'competency':
                const key = params.key || params.competencyId || '';
                const level = params.level || '';
                hash = `#/competency?key=${encodeURIComponent(key)}`;
                if (level) {
                    hash += `&level=${encodeURIComponent(level)}`;
                }
                if (params.categoryId) {
                    localStorage.setItem('selectedCategoryId', params.categoryId);
                    hash += `&categoryId=${encodeURIComponent(params.categoryId)}`;
                }
                break;
        }

        if (updateHash) {
            // Update hash; if unchanged, handle the route manually
            const currentHash = window.location.hash;
            if (currentHash !== hash) {
                window.location.hash = hash;
                return;
            }
        }

        // Handle navigation immediately when hash is unchanged or updateHash is false
        this.handleRoute();
    }

    onRouteChange(callback) {
        this.listeners.push(callback);
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    getParams() {
        return { ...this.params };
    }

    parseQueryParams(hash) {
        const queryMatch = hash.match(/\?(.+)$/);
        const params = {};
        if (queryMatch) {
            const searchParams = new URLSearchParams(queryMatch[1]);
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        return params;
    }

    setActiveScreen(route) {
        const targetId = this.routes[route];
        if (!targetId) return;

        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const target = document.getElementById(targetId);
        if (target) {
            target.classList.add('active');
        }
    }
}

// Export singleton instance
const router = new Router();
