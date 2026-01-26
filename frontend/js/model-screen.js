/**
 * Competency model screen
 */

let selectedClusterId = null;

function showModelScreen(categoryId) {
    const screen = document.getElementById('model-screen');
    screen.classList.remove('hidden');
    
    // Store category in localStorage
    localStorage.setItem('selectedCategory', categoryId);
    
    loadData().then(() => {
        const category = getCategoryById(categoryId);
        if (!category) {
            navigate('category');
            return;
        }
        
        document.getElementById('model-title').textContent = 'Модель компетенций';
        document.getElementById('model-subtitle').textContent = `Категория: ${category.name}`;
        
        renderClusters();
        renderAllCompetencies(categoryId);
    });
}

function renderClusters() {
    const data = getData();
    const sidebar = document.getElementById('clusters-sidebar');
    
    if (!data || !data.clusters) {
        sidebar.innerHTML = '<p>Кластеры не найдены</p>';
        return;
    }
    
    // Group clusters by block
    const clustersByBlock = {};
    data.clusters.forEach(cluster => {
        const blockId = cluster.block_id;
        if (!clustersByBlock[blockId]) {
            clustersByBlock[blockId] = [];
        }
        clustersByBlock[blockId].push(cluster);
    });
    
    // Get block names
    const blocks = {};
    data.blocks.forEach(block => {
        blocks[block.id] = block.name;
    });
    
    let html = '';
    Object.keys(clustersByBlock).forEach(blockId => {
        const blockName = blocks[blockId] || 'Неизвестный блок';
        html += `<div class="block-section" style="margin-bottom: 20px;">`;
        html += `<h4 style="font-size: 0.9rem; color: #999; margin-bottom: 8px; text-transform: uppercase;">${blockName}</h4>`;
        
        clustersByBlock[blockId].forEach(cluster => {
            html += `
                <div class="cluster-item" data-cluster-id="${cluster.id}">
                    <h3>${cluster.name}</h3>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    sidebar.innerHTML = html;
    
    // Add click handlers
    sidebar.querySelectorAll('.cluster-item').forEach(item => {
        item.addEventListener('click', () => {
            const clusterId = item.dataset.clusterId;
            selectCluster(clusterId);
            
            const categoryId = localStorage.getItem('selectedCategory');
            if (categoryId) {
                renderCompetenciesForCluster(clusterId, categoryId);
            }
        });
    });
    
    // Select first cluster by default
    const firstCluster = sidebar.querySelector('.cluster-item');
    if (firstCluster) {
        selectCluster(firstCluster.dataset.clusterId);
    }
}

function selectCluster(clusterId) {
    selectedClusterId = clusterId;
    
    // Update UI
    document.querySelectorAll('.cluster-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.clusterId === clusterId) {
            item.classList.add('active');
        }
    });
}

function renderAllCompetencies(categoryId) {
    const data = getData();
    const main = document.getElementById('competencies-main');
    
    if (!data || !data.competencies) {
        main.innerHTML = '<p>Компетенции не найдены</p>';
        return;
    }
    
    // Group by cluster
    const competenciesByCluster = {};
    data.competencies.forEach(comp => {
        const clusterId = comp.cluster_id;
        if (!competenciesByCluster[clusterId]) {
            competenciesByCluster[clusterId] = [];
        }
        competenciesByCluster[clusterId].push(comp);
    });
    
    let html = '<div class="competencies-grid">';
    
    Object.keys(competenciesByCluster).forEach(clusterId => {
        competenciesByCluster[clusterId].forEach(comp => {
            const targetLevel = getTargetLevel(categoryId, comp.id);
            html += `
                <div class="competency-card" data-competency-id="${comp.id}">
                    <h4>${comp.name}</h4>
                    ${comp.description ? `<div class="description">${comp.description.substring(0, 100)}${comp.description.length > 100 ? '...' : ''}</div>` : ''}
                    ${targetLevel ? `<div class="target-level">Целевой уровень: ${targetLevel}</div>` : ''}
                </div>
            `;
        });
    });
    
    html += '</div>';
    main.innerHTML = html;
    
    // Add click handlers
    main.querySelectorAll('.competency-card').forEach(card => {
        card.addEventListener('click', () => {
            const competencyId = card.dataset.competencyId;
            navigate('competency', { 
                competencyId, 
                categoryId 
            });
        });
    });
}

function renderCompetenciesForCluster(clusterId, categoryId) {
    const data = getData();
    const main = document.getElementById('competencies-main');
    
    const competencies = getCompetenciesByCluster(clusterId);
    
    if (competencies.length === 0) {
        main.innerHTML = '<p>Компетенции не найдены</p>';
        return;
    }
    
    let html = '<div class="competencies-grid">';
    
    competencies.forEach(comp => {
        const targetLevel = getTargetLevel(categoryId, comp.id);
        html += `
            <div class="competency-card" data-competency-id="${comp.id}">
                <h4>${comp.name}</h4>
                ${comp.description ? `<div class="description">${comp.description.substring(0, 100)}${comp.description.length > 100 ? '...' : ''}</div>` : ''}
                ${targetLevel ? `<div class="target-level">Целевой уровень: ${targetLevel}</div>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    main.innerHTML = html;
    
    // Add click handlers
    main.querySelectorAll('.competency-card').forEach(card => {
        card.addEventListener('click', () => {
            const competencyId = card.dataset.competencyId;
            navigate('competency', { 
                competencyId, 
                categoryId 
            });
        });
    });
}

// Back button handler
document.getElementById('back-to-categories')?.addEventListener('click', () => {
    navigate('category');
});
