/**
 * Main application module
 * Coordinates UI rendering and user interactions
 */

const DEBUG = false;

class App {
    constructor() {
        this.dataManager = dataManager;
        this.router = router;
        this.selectedCategory = null;
        this.selectedBlock = null;
        this.selectedCluster = null;
        this.currentCompetency = null;
        this.isRendering = false;
    }

    async init() {
        try {
            // Load data first
            await this.dataManager.load();
            
            // Load saved state
            const savedCategory = localStorage.getItem('selectedCategoryId');
            if (savedCategory) {
                this.selectedCategory = savedCategory;
            }

            const savedBlock = sessionStorage.getItem('selectedBlockId');
            if (savedBlock) {
                this.selectedBlock = savedBlock;
            }

            const savedCluster = sessionStorage.getItem('selectedClusterId');
            if (savedCluster) {
                this.selectedCluster = savedCluster;
            }
            
            // Setup event listeners (for static elements only)
            this.setupEventListeners();
            
            // Initialize router and set up route change handler
            this.router.onRouteChange((route, params) => {
                if (DEBUG) console.log('[App] Route changed:', route, params);
                this.handleRouteChange(route, params).catch(error => {
                    console.error('[App] Error handling route change:', error);
                });
            });
            
            // Initialize router (this will trigger initial route)
            this.router.init();
            
        } catch (error) {
            console.error('[App] Failed to initialize:', error);
            this.showError('Не удалось загрузить данные. Пожалуйста, обновите страницу.');
        }
    }

    setupEventListeners() {
        // Change category buttons
        ['btn-change-category', 'btn-change-category-2'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    localStorage.removeItem('selectedCategoryId');
                    this.selectedCategory = null;
                    this.router.navigate('category');
                });
            }
        });

        // Back to model button
        const backToModelBtn = document.getElementById('btn-back-to-model');
        if (backToModelBtn) {
            backToModelBtn.addEventListener('click', () => {
                if (this.selectedCategory) {
                    this.router.navigate('model', { categoryId: this.selectedCategory });
                } else {
                    this.router.navigate('category');
                }
            });
        }

        // Modal buttons
        ['btn-glossary', 'btn-glossary-2', 'btn-glossary-3'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.openGlossaryModal());
            }
        });

        ['btn-help', 'btn-help-2', 'btn-help-3'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.openHelpModal());
            }
        });

        // Modal close buttons
        const closeGlossary = document.getElementById('btn-close-glossary');
        if (closeGlossary) {
            closeGlossary.addEventListener('click', () => this.closeGlossaryModal());
        }

        const closeHelp = document.getElementById('btn-close-help');
        if (closeHelp) {
            closeHelp.addEventListener('click', () => this.closeHelpModal());
        }

        // Close modals on overlay click
        const glossaryModal = document.getElementById('modal-glossary');
        if (glossaryModal) {
            glossaryModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeGlossaryModal();
                }
            });
        }

        const helpModal = document.getElementById('modal-help');
        if (helpModal) {
            helpModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeHelpModal();
                }
            });
        }

        // Glossary search
        const glossarySearch = document.getElementById('glossary-search-input');
        if (glossarySearch) {
            glossarySearch.addEventListener('input', (e) => {
                this.filterGlossary(e.target.value);
            });
        }
    }

    async handleRouteChange(route, params) {
        if (this.isRendering) {
            if (DEBUG) console.log('[App] Already rendering, skipping');
            return;
        }

        this.isRendering = true;

        try {
            if (DEBUG) console.log('[App] Handling route:', route, params);

            switch (route) {
                case 'category':
                    await this.renderCategorySelection();
                    break;
                case 'model':
                    const categoryId = params.categoryId || this.selectedCategory;
                    if (categoryId) {
                        this.selectedCategory = categoryId;
                        await this.renderModel(categoryId);
                    } else {
                        // No category, go to selection
                        this.router.navigate('category');
                    }
                    break;
                case 'competency':
                    const competencyKey = params.key || params.competencyId;
                    if (competencyKey) {
                        const catId = params.categoryId || this.selectedCategory;
                        await this.renderCompetencyDetails(competencyKey, catId, params.level);
                    } else {
                        // No competency key, go back to model
                        if (this.selectedCategory) {
                            this.router.navigate('model', { categoryId: this.selectedCategory });
                        } else {
                            this.router.navigate('category');
                        }
                    }
                    break;
            }
        } finally {
            this.isRendering = false;
        }
    }

    async renderCategorySelection() {
        if (DEBUG) console.log('[App] Rendering category selection');
        
        const categories = this.dataManager.getCategories();
        const container = document.getElementById('category-list');
        
        if (!container) return;
        
        // Get meaningful descriptions from data
        const categoryDescriptions = {
            'лидеры_стратегии': 'Формируете цифровую стратегию компании, определяете направления развития и требования к цифровым решениям',
            'руководители': 'Управляете цифровыми проектами и командами, внедряете цифровые решения в бизнес-процессы',
            'эксперты_по_цифровым_направлениям': 'Разрабатываете и внедряете цифровые решения, обеспечиваете техническую экспертизу',
            'пользователи': 'Используете цифровые инструменты и сервисы для выполнения рабочих задач',
            'рабочие_на_промысле': 'Работаете с производственными системами и данными на объектах добычи'
        };

        container.innerHTML = categories.map((category, index) => {
            const description = categoryDescriptions[category.id] || 'Выберите эту категорию для просмотра целевых компетенций';
            
            return `
                <div class="category-card" data-category-id="${category.id}">
                    <div class="category-card-content">
                        <h3>${this.escapeHtml(category.name)}</h3>
                        <p class="category-description">${this.escapeHtml(description)}</p>
                        <div class="category-card-action">
                            <span class="action-text">Выбрать</span>
                            <span class="action-arrow">→</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers - use event delegation
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.category-card');
            if (card) {
                const categoryId = card.dataset.categoryId;
                if (categoryId) {
                    if (DEBUG) console.log('[App] Category clicked:', categoryId);
                    this.router.navigate('model', { categoryId });
                }
            }
        });
    }

    async renderModel(categoryId) {
        if (DEBUG) console.log('[App] Rendering model for category:', categoryId);
        
        const category = this.dataManager.getCategories().find(c => c.id === categoryId);
        if (!category) {
            this.router.navigate('category');
            return;
        }

        // Update header
        const categoryNameEl = document.getElementById('current-category-name');
        if (categoryNameEl) {
            categoryNameEl.textContent = category.name;
        }

        // Render blocks selector
        this.renderBlocks(categoryId);

        // Render clusters (filtered by selected block)
        this.renderClusters(categoryId);

        // Render competencies (filtered by selected cluster)
        this.renderCompetencies(categoryId);
    }

    renderBlocks(categoryId) {
        const blocks = this.dataManager.getBlocks();
        const container = document.getElementById('blocks-selector');
        
        if (!container) {
            // Create blocks selector if it doesn't exist
            const modelHeader = document.querySelector('.model-header');
            if (modelHeader && !document.getElementById('blocks-selector')) {
                const blocksDiv = document.createElement('div');
                blocksDiv.id = 'blocks-selector';
                blocksDiv.className = 'blocks-selector';
                modelHeader.insertBefore(blocksDiv, modelHeader.firstChild);
            }
        }

        const blocksContainer = document.getElementById('blocks-selector');
        if (!blocksContainer) return;

        blocksContainer.innerHTML = `
            <label class="blocks-label">Блок компетенций:</label>
            <div class="blocks-list">
                ${blocks.map(block => `
                    <button class="block-btn ${this.selectedBlock === block.id ? 'active' : ''}" 
                            data-block-id="${block.id}">
                        ${this.escapeHtml(block.name)}
                    </button>
                `).join('')}
            </div>
        `;

        // Add click handlers
        blocksContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.block-btn');
            if (btn) {
                const blockId = btn.dataset.blockId;
                this.selectedBlock = blockId;
                sessionStorage.setItem('selectedBlockId', blockId);
                
                // Update active state
                blocksContainer.querySelectorAll('.block-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Reset cluster selection
                this.selectedCluster = null;
                sessionStorage.removeItem('selectedClusterId');
                
                // Re-render clusters and competencies
                this.renderClusters(categoryId);
                this.renderCompetencies(categoryId);
            }
        });

        // Set first block as active if none selected
        if (!this.selectedBlock && blocks.length > 0) {
            this.selectedBlock = blocks[0].id;
            sessionStorage.setItem('selectedBlockId', blocks[0].id);
            const firstBtn = blocksContainer.querySelector('.block-btn');
            if (firstBtn) {
                firstBtn.classList.add('active');
            }
        }
    }

    renderClusters(categoryId, options = {}) {
        const detailMode = options.detailMode || false;
        const clusters = this.dataManager.getClusters();
        const container = document.getElementById('clusters-list');
        const detailContainer = document.getElementById('clusters-list-detail');
        
        // Filter clusters by selected block
        let filteredClusters = clusters;
        if (this.selectedBlock) {
            filteredClusters = clusters.filter(c => c.block_id === this.selectedBlock);
        }
        if (detailMode && this.selectedCluster) {
            filteredClusters = filteredClusters.filter(c => c.id === this.selectedCluster);
        }

        const renderClusterList = (containerEl) => {
            if (!containerEl) return;
            
            containerEl.innerHTML = filteredClusters.map(cluster => `
                <li class="cluster-item ${this.selectedCluster === cluster.id ? 'active' : ''}" 
                    data-cluster-id="${cluster.id}">
                    ${this.escapeHtml(cluster.name)}
                </li>
            `).join('');

            // Add click handlers
            containerEl.addEventListener('click', (e) => {
                const item = e.target.closest('.cluster-item');
                if (item) {
                    const clusterId = item.dataset.clusterId;
                    this.selectedCluster = clusterId;
                    sessionStorage.setItem('selectedClusterId', clusterId);
                    
                    // Update active state
                    containerEl.querySelectorAll('.cluster-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    
                    // Update cluster title
                    const clusterTitle = document.getElementById('cluster-title');
                    if (clusterTitle) {
                        clusterTitle.textContent = `Компетенции кластера «${filteredClusters.find(c => c.id === clusterId)?.name || ''}»`;
                    }
                    
                    // Re-render competencies
                    this.renderCompetencies(categoryId);
                }
            });
        };

        renderClusterList(container);
        renderClusterList(detailContainer);

        if (detailContainer) {
            if (detailMode) {
                detailContainer.classList.add('clusters-sidebar-compact');
            } else {
                detailContainer.classList.remove('clusters-sidebar-compact');
            }
        }
        
        // Set first cluster as active if none selected
        if (!this.selectedCluster && filteredClusters.length > 0) {
            this.selectedCluster = filteredClusters[0].id;
            sessionStorage.setItem('selectedClusterId', filteredClusters[0].id);
            const firstItem = container?.querySelector('.cluster-item');
            if (firstItem) {
                firstItem.classList.add('active');
                const clusterTitle = document.getElementById('cluster-title');
                if (clusterTitle) {
                    clusterTitle.textContent = `Компетенции кластера «${filteredClusters[0].name}»`;
                }
            }
        }
    }

    renderCompetencies(categoryId, clusterId = null) {
        const container = document.getElementById('competencies-list');
        
        if (!container) return;
        
        // Filter by cluster
        const activeClusterId = clusterId || this.selectedCluster;
        const filtered = activeClusterId ? 
            this.dataManager.getCompetenciesByCluster(activeClusterId) : 
            this.dataManager.getCompetencies();

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Нет компетенций для отображения</p></div>';
            return;
        }

        container.innerHTML = filtered.map(competency => {
            const targetLevel = this.dataManager.getTargetLevel(categoryId, competency.id);
            const levelText = targetLevel ? `Целевой уровень: ${targetLevel}` : 'Целевой уровень: —';
            
            return `
                <div class="competency-card" data-competency-id="${competency.id}">
                    <div class="competency-card-header">
                        <h4>${this.escapeHtml(competency.name)}</h4>
                    </div>
                    <div class="target-level-display">
                        <span class="target-level-label">${levelText}</span>
                    </div>
                    <button class="btn-open">Открыть</button>
                </div>
            `;
        }).join('');

        // Add click handlers - use event delegation
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.competency-card');
            if (card) {
                const competencyId = card.dataset.competencyId;
                if (competencyId) {
                    if (DEBUG) console.log('[App] Competency clicked:', competencyId);
                    this.router.navigate('competency', { 
                        key: competencyId,
                        categoryId 
                    });
                }
            }
        });
    }

    async renderCompetencyDetails(competencyKey, categoryId, level = null) {
        if (DEBUG) console.log('[App] Rendering competency details:', competencyKey, categoryId, level);
        
        const competency = this.dataManager.getCompetencyById(competencyKey);
        if (!competency) {
            if (this.selectedCategory) {
                this.router.navigate('model', { categoryId: this.selectedCategory });
            } else {
                this.router.navigate('category');
            }
            return;
        }

        this.currentCompetency = competency;

        // Update title
        const titleEl = document.getElementById('competency-title');
        if (titleEl) {
            titleEl.textContent = competency.name;
        }

        // Update breadcrumbs
        this.updateBreadcrumbs(categoryId, competency);

        // Show target level
        const targetLevel = this.dataManager.getTargetLevel(categoryId, competencyKey);
        const targetBadge = document.getElementById('target-level-badge');
        if (targetBadge) {
            if (targetLevel) {
                targetBadge.textContent = `${targetLevel} из 5`;
                targetBadge.className = 'target-level-badge';
            } else {
                targetBadge.textContent = '—';
                targetBadge.className = 'target-level-badge';
            }
        }

        // Remember active cluster before rendering sidebar
        if (competency.cluster_id) {
            this.selectedCluster = competency.cluster_id;
            sessionStorage.setItem('selectedClusterId', competency.cluster_id);
        }

        // Render clusters sidebar for detail view (compact, only active cluster)
        this.renderClusters(categoryId, { detailMode: true });

        // Render level buttons
        const initialLevel = level ? parseInt(level) : (targetLevel || 3);
        this.renderLevelButtons(competencyKey, initialLevel);

        // Render level description and actions
        this.renderLevelContent(competencyKey, initialLevel);
    }

    updateBreadcrumbs(categoryId, competency) {
        const breadcrumbsEl = document.getElementById('breadcrumbs');
        if (!breadcrumbsEl) return;

        const category = this.dataManager.getCategories().find(c => c.id === categoryId);
        const cluster = this.dataManager.getClusterById(competency.cluster_id);

        let breadcrumb = '';
        if (category) {
            breadcrumb += `<a href="#/model" data-navigate="model">${this.escapeHtml(category.name)}</a>`;
        }
        if (cluster) {
            breadcrumb += ` → <a href="#/model" data-navigate="model">${this.escapeHtml(cluster.name)}</a>`;
        }
        breadcrumb += ` → ${this.escapeHtml(competency.name)}`;

        breadcrumbsEl.innerHTML = breadcrumb;

        // Add click handlers for breadcrumb links
        breadcrumbsEl.querySelectorAll('a[data-navigate]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.navigate;
                if (route === 'model' && this.selectedCategory) {
                    this.router.navigate('model', { categoryId: this.selectedCategory });
                } else {
                    this.router.navigate(route);
                }
            });
        });
    }

    renderLevelButtons(competencyId, currentLevel) {
        const container = document.querySelector('.level-switch');
        if (!container) return;

        container.innerHTML = [1, 2, 3, 4, 5].map(level => `
            <button class="level-switch-btn ${level === currentLevel ? 'active' : ''}" 
                    data-level="${level}">
                ${level}
            </button>
        `).join('');

        // Add click handlers
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.level-switch-btn');
            if (btn) {
                const level = parseInt(btn.dataset.level);
                
                // Update active state
                container.querySelectorAll('.level-switch-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update URL without triggering full re-render
                const params = this.router.getParams();
                this.router.navigate('competency', {
                    key: competencyId,
                    level: level.toString(),
                    categoryId: params.categoryId || this.selectedCategory
                });
                
                // Render content for selected level
                this.renderLevelContent(competencyId, level);
            }
        });
    }

    renderLevelContent(competencyId, level) {
        // Render level description
        const description = this.dataManager.getLevelDescription(competencyId, level);
        const descContainer = document.getElementById('level-description');
        
        if (descContainer) {
            if (description) {
                descContainer.innerHTML = `
                    <h4>Описание уровня ${level}</h4>
                    <p>${this.escapeHtml(description)}</p>
                `;
                descContainer.style.display = 'block';
            } else {
                descContainer.style.display = 'none';
            }
        }

        // Render actions
        const competency = this.dataManager.getCompetencyById(competencyId);
        this.renderActions(competency, level);
    }

    renderActions(competency, level) {
        const container = document.getElementById('actions-content');
        if (!container) return;
        
        const actions = competency?.actions || {};
        
        if (!actions.all || actions.all.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Развивающие действия для данной компетенции отсутствуют</p></div>';
            return;
        }

        // Get actions for the selected level
        const levelActions = actions.by_level?.[String(level)] || 
                           actions.by_level?.['all'] || 
                           actions.all;

        // Group by type
        const byType = {
            '70': [],
            '20': [],
            '10': [],
            'other': []
        };

        levelActions.forEach(action => {
            const type = action.type || 'other';
            if (byType[type] !== undefined) {
                byType[type].push(action);
            } else {
                byType.other.push(action);
            }
        });

        // Render action groups
        let html = '';
        
        const typeLabels = {
            '70': 'Обучение на практике (70%)',
            '20': 'Развитие на рабочем месте (20%)',
            '10': 'Обучение и саморазвитие (10%)',
            'other': 'Другие действия'
        };

        Object.entries(byType).forEach(([type, typeActions]) => {
            if (typeActions.length > 0) {
                html += `
                    <div class="action-group">
                        <h4>${typeLabels[type] || 'Действия'}</h4>
                        <div class="action-cards">
                            ${typeActions.map(action => `
                                <div class="action-card">
                                    <div class="action-card-title">${this.escapeHtml(action.text.substring(0, 50))}${action.text.length > 50 ? '...' : ''}</div>
                                    <div class="action-card-description">${this.escapeHtml(action.text)}</div>
                                    <div class="action-card-resource">Внешний ресурс</div>
                                    <button class="btn-open">Открыть</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html || '<div class="empty-state"><p>Нет действий для выбранного уровня</p></div>';
    }

    openGlossaryModal() {
        const modal = document.getElementById('modal-glossary');
        if (modal) {
            modal.classList.add('active');
            this.renderGlossary();
        }
    }

    closeGlossaryModal() {
        const modal = document.getElementById('modal-glossary');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    openHelpModal() {
        const modal = document.getElementById('modal-help');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeHelpModal() {
        const modal = document.getElementById('modal-help');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    renderGlossary() {
        const glossary = this.dataManager.getGlossary();
        const container = document.getElementById('glossary-list');
        if (!container) return;

        const terms = Object.values(glossary);
        
        container.innerHTML = terms.map(term => `
            <div class="glossary-item">
                <div class="glossary-term">${this.escapeHtml(term.term)}</div>
                <div class="glossary-definition">${this.escapeHtml(term.definition)}</div>
            </div>
        `).join('');
    }

    filterGlossary(searchTerm) {
        const glossary = this.dataManager.getGlossary();
        const container = document.getElementById('glossary-list');
        if (!container) return;

        const terms = Object.values(glossary);
        const filtered = terms.filter(term => {
            const search = searchTerm.toLowerCase();
            return term.term.toLowerCase().includes(search) || 
                   term.definition.toLowerCase().includes(search);
        });
        
        container.innerHTML = filtered.map(term => `
            <div class="glossary-item">
                <div class="glossary-term">${this.escapeHtml(term.term)}</div>
                <div class="glossary-definition">${this.escapeHtml(term.definition)}</div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
