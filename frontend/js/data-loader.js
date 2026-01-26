/**
 * Data loader - loads and caches JSON data
 */

let appData = null;

async function loadData() {
    if (appData) {
        return appData;
    }
    
    try {
        const response = await fetch('data/data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        appData = await response.json();
        return appData;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

function getData() {
    return appData;
}

function getCategoryById(categoryId) {
    if (!appData) return null;
    return appData.categories.find(cat => cat.id === categoryId);
}

function getCompetencyById(competencyId) {
    if (!appData) return null;
    return appData.competencies.find(comp => comp.id === competencyId);
}

function getCompetenciesByCluster(clusterId) {
    if (!appData) return [];
    return appData.competencies.filter(comp => comp.cluster_id === clusterId);
}

function getTargetLevel(categoryId, competencyId) {
    if (!appData) return null;
    const targetLevels = appData.target_levels[categoryId];
    if (!targetLevels) return null;
    return targetLevels[competencyId] || null;
}

function getClustersByBlock(blockId) {
    if (!appData) return [];
    return appData.clusters.filter(cluster => cluster.block_id === blockId);
}
