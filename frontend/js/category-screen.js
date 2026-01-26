/**
 * Category selection screen
 */

function showCategoryScreen() {
    const screen = document.getElementById('category-screen');
    screen.classList.remove('hidden');
    
    loadData().then(() => {
        renderCategories();
    }).catch(error => {
        console.error('Failed to load data:', error);
        document.getElementById('categories-list').innerHTML = 
            '<p style="color: red;">Ошибка загрузки данных. Проверьте консоль.</p>';
    });
}

function renderCategories() {
    const data = getData();
    const container = document.getElementById('categories-list');
    
    if (!data || !data.categories) {
        container.innerHTML = '<p>Категории не найдены</p>';
        return;
    }
    
    container.innerHTML = data.categories.map(category => `
        <div class="category-card" data-category-id="${category.id}">
            <h3>${category.name}</h3>
        </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const categoryId = card.dataset.categoryId;
            // Store in localStorage
            localStorage.setItem('selectedCategory', categoryId);
            // Navigate to model
            navigate('model', { categoryId });
        });
    });
}
