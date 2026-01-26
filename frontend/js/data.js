/**
 * Data management module
 * Handles loading and caching of JSON data
 */

const DATA_CACHE_KEY = 'appDataCache_v1';

class DataManager {
    constructor() {
        this.data = null;
        this.loading = false;
        this.indexes = null;
    }

    async load() {
        if (this.data) {
            return this.data;
        }

        if (this.loading) {
            // Wait for ongoing load
            while (this.loading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.data;
        }

        // Try cached data first (static content, safe to reuse)
        const cached = localStorage.getItem(DATA_CACHE_KEY);
        if (cached) {
            try {
                this.data = JSON.parse(cached);
                this.buildIndexes();
                return this.data;
            } catch (error) {
                console.warn('Failed to parse cached data, refetching:', error);
                localStorage.removeItem(DATA_CACHE_KEY);
            }
        }

        this.loading = true;
        try {
            const response = await fetch('data/data.json');
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.statusText}`);
            }
            this.data = await response.json();
            this.buildIndexes();
            localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(this.data));
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        } finally {
            this.loading = false;
        }
    }

    getCategories() {
        return this.data?.categories || [];
    }

    getBlocks() {
        return this.data?.blocks || [];
    }

    getClusters() {
        return this.data?.clusters || [];
    }

    getCompetencies() {
        return this.data?.competencies || [];
    }

    getCompetencyById(id) {
        return this.indexes?.competencyById?.[id] || this.getCompetencies().find(c => c.id === id);
    }

    getClusterById(id) {
        return this.indexes?.clusterById?.[id] || this.getClusters().find(c => c.id === id);
    }

    getGlossary() {
        return this.data?.glossary || {};
    }

    getBlockById(id) {
        return this.indexes?.blockById?.[id] || this.getBlocks().find(b => b.id === id);
    }

    getTargetLevel(categoryId, competencyId) {
        const targetLevels = this.data?.target_levels || {};
        return targetLevels[categoryId]?.[competencyId] || null;
    }

    getLevelDescription(competencyId, level) {
        const descriptions = this.data?.level_descriptions || {};
        return descriptions[competencyId]?.[String(level)] || '';
    }

    getGlossary() {
        return this.data?.glossary || {};
    }

    getClustersByBlock(blockId) {
        if (!blockId) return this.getClusters();
        return this.indexes?.clustersByBlock?.[blockId] || [];
    }

    getCompetenciesByCluster(clusterId) {
        if (!clusterId) return this.getCompetencies();
        return this.indexes?.competenciesByCluster?.[clusterId] || [];
    }

    buildIndexes() {
        this.indexes = {
            competencyById: {},
            clusterById: {},
            blockById: {},
            competenciesByCluster: {},
            clustersByBlock: {}
        };

        this.getBlocks().forEach(block => {
            this.indexes.blockById[block.id] = block;
        });

        this.getClusters().forEach(cluster => {
            this.indexes.clusterById[cluster.id] = cluster;
            if (!this.indexes.clustersByBlock[cluster.block_id]) {
                this.indexes.clustersByBlock[cluster.block_id] = [];
            }
            this.indexes.clustersByBlock[cluster.block_id].push(cluster);
        });

        this.getCompetencies().forEach(competency => {
            this.indexes.competencyById[competency.id] = competency;
            if (!this.indexes.competenciesByCluster[competency.cluster_id]) {
                this.indexes.competenciesByCluster[competency.cluster_id] = [];
            }
            this.indexes.competenciesByCluster[competency.cluster_id].push(competency);
        });
    }
}

// Export singleton instance
const dataManager = new DataManager();
