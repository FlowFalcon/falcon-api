// Modern API Documentation Script
// Enhanced with advanced features and better performance

class APIDocumentation {
    constructor() {
        this.settings = {};
        this.apis = [];
        this.currentCategory = 'all';
        this.searchDebounce = null;
        this.currentModal = null;
        this.notifications = [];
        
        this.elements = {
            // Loading
            loadingScreen: document.getElementById('loadingScreen'),
            
            // Navigation
            sideNav: document.getElementById('sideNav'),
            navCollapseBtn: document.getElementById('navCollapseBtn'),
            menuToggle: document.getElementById('menuToggle'),
            mainWrapper: document.getElementById('mainWrapper'),
            
            // Search
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            searchSuggestions: document.getElementById('searchSuggestions'),
            
            // Header
            mainHeader: document.getElementById('mainHeader'),
            notificationBtn: document.getElementById('notificationBtn'),
            notificationBadge: document.getElementById('notificationBadge'),
            
            // Content
            categoryTabs: document.getElementById('categoryTabs'),
            apiGrid: document.getElementById('apiGrid'),
            
            // Modal
            apiModal: document.getElementById('apiModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalClose: document.getElementById('modalClose'),
            modalCancel: document.getElementById('modalCancel'),
            modalSubmit: document.getElementById('modalSubmit'),
            endpointContent: document.getElementById('endpointContent'),
            paramsSection: document.getElementById('paramsSection'),
            responseSection: document.getElementById('responseSection'),
            responseStatus: document.getElementById('responseStatus'),
            responseCode: document.getElementById('responseCode'),
            copyEndpoint: document.getElementById('copyEndpoint'),
            copyResponse: document.getElementById('copyResponse'),
            
            // Theme
            themeToggle: document.getElementById('themeToggle'),
            
            // Toast
            toastContainer: document.getElementById('toastContainer')
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize theme
            this.initTheme();
            
            // Load settings and data
            await this.loadSettings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize components
            this.initializeSearch();
            this.initializeModal();
            
            // Render content
            this.renderCategories();
            this.renderAPIs();
            
            // Setup scroll animations
            this.setupScrollAnimations();
            
            // Check notifications
            await this.checkNotifications();
            
            // Hide loading screen
            this.hideLoading();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }
    
    // Theme Management
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            this.elements.themeToggle.classList.add('active');
            this.updateThemeIcon('moon');
        } else {
            this.updateThemeIcon('sun');
        }
    }
    
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        this.elements.themeToggle.classList.toggle('active');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeIcon(isDark ? 'moon' : 'sun');
        this.showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'success');
    }
    
    updateThemeIcon(icon) {
        const slider = this.elements.themeToggle?.querySelector('.theme-toggle-slider');
        if (slider) {
            slider.innerHTML = `<i class="fas fa-${icon}"></i>`;
        }
    }
    
    // Data Loading
    async loadSettings() {
        try {
            const response = await fetch('/settings.json');
            if (!response.ok) throw new Error('Failed to load settings');
            
            this.settings = await response.json();
            this.updatePageContent();
            this.initializeLazyLoading();
            
        } catch (error) {
            console.error('Settings load error:', error);
            this.settings = this.getDefaultSettings();
        }
    }
    
    getDefaultSettings() {
        return {
            name: "Falcon API",
            version: "v1.0.0",
            description: "Modern API Documentation",
            creator: "FlowFalcon",
            categories: []
        };
    }
    
    updatePageContent() {
        // Update various page elements with settings data
        document.title = this.settings.name || 'API Documentation';
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element && value) element.textContent = value;
        };
        
        updateElement('sideNavName', this.settings.name);
        updateElement('versionBadge', this.settings.version);
        updateElement('heroTitle', this.settings.name);
        updateElement('heroDescription', this.settings.description);
        updateElement('footerName', this.settings.name);
        
        // Update copyright
        const year = new Date().getFullYear();
        const copyright = document.getElementById('footerCopyright');
        if (copyright) {
            copyright.textContent = `© ${year} ${this.settings.creator || 'FlowFalcon'}. All rights reserved.`;
        }
        
        // Update API count
        const apiCount = this.settings.categories?.reduce((acc, cat) => acc + (cat.items?.length || 0), 0) || 0;
        const apiCountElement = document.getElementById('apiCount');
        if (apiCountElement) {
            apiCountElement.textContent = `${apiCount}+`;
        }
        
        // Update banner image with lazy loading
        if (this.settings.bannerImage) {
            const banner = document.getElementById('heroBanner');
            if (banner) {
                this.loadImageLazily(banner, this.settings.bannerImage, '/src/banner.jpg');
            }
        }
    }
    
    // Event Listeners
    setupEventListeners() {
        // Navigation
        this.elements.navCollapseBtn?.addEventListener('click', () => this.toggleSideNav());
        this.elements.menuToggle?.addEventListener('click', () => this.toggleMobileNav());
        
        // Theme
        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // Search
        this.elements.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.elements.searchInput?.addEventListener('focus', () => {
            if (this.elements.searchInput.value.trim()) {
                this.showSearchSuggestions();
            }
        });
        this.elements.clearSearch?.addEventListener('click', () => this.clearSearch());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Click outside handlers
        document.addEventListener('click', (e) => this.handleClickOutside(e));
        
        // Window scroll
        window.addEventListener('scroll', () => this.handleScroll());
        
        // Modal
        this.elements.modalClose?.addEventListener('click', () => this.closeModal());
        this.elements.modalCancel?.addEventListener('click', () => this.closeModal());
        this.elements.modalSubmit?.addEventListener('click', () => this.submitAPIRequest());
        this.elements.copyEndpoint?.addEventListener('click', () => this.copyEndpoint());
        this.elements.copyResponse?.addEventListener('click', () => this.copyResponse());
        
        // Notifications
        this.elements.notificationBtn?.addEventListener('click', () => this.showNotifications());
        
        // Navigation links
        document.querySelectorAll('.side-nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
    }
    
    // Navigation Management
    toggleSideNav() {
        this.elements.sideNav.classList.toggle('collapsed');
        this.elements.mainWrapper.classList.toggle('nav-collapsed');
        
        const isCollapsed = this.elements.sideNav.classList.contains('collapsed');
        localStorage.setItem('navCollapsed', isCollapsed);
    }
    
    toggleMobileNav() {
        this.elements.sideNav.classList.toggle('active');
    }
    
    handleNavigation(e) {
        e.preventDefault();
        const target = e.currentTarget.getAttribute('href');
        
        // Update active state
        document.querySelectorAll('.side-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Handle section visibility
        const section = e.currentTarget.dataset.section;
        if (section === 'playground') {
            document.getElementById('apis').style.display = 'none';
            document.getElementById('playground').style.display = 'block';
        } else if (section === 'apis') {
            document.getElementById('apis').style.display = 'block';
            document.getElementById('playground').style.display = 'none';
        }
        
        // Smooth scroll
        if (target && target.startsWith('#')) {
            const element = document.querySelector(target);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // Close mobile nav
        if (window.innerWidth < 992) {
            this.elements.sideNav.classList.remove('active');
        }
    }
    
    // Search Functionality
    initializeSearch() {
        // Show/hide clear button based on input
        if (this.elements.searchInput && this.elements.clearSearch) {
            // Event listener sudah ditambahkan di setupEventListeners
            // Hanya perlu initial state
            this.elements.clearSearch.classList.remove('visible');
        }
    }
    
    handleSearch(query) {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }
    
    performSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.renderAPIs();
            this.hideSearchSuggestions();
            return;
        }
        
        const filteredAPIs = [];
        
        this.settings.categories?.forEach(category => {
            category.items?.forEach(api => {
                if (api.name.toLowerCase().includes(searchTerm) ||
                    api.desc.toLowerCase().includes(searchTerm) ||
                    category.name.toLowerCase().includes(searchTerm)) {
                    filteredAPIs.push({ ...api, category: category.name });
                }
            });
        });
        
        this.renderFilteredAPIs(filteredAPIs);
        this.updateSearchSuggestions(filteredAPIs.slice(0, 5));
    }
    
    clearSearch() {
        this.elements.searchInput.value = '';
        this.elements.clearSearch.classList.remove('visible');
        this.hideSearchSuggestions();
        this.renderAPIs();
    }
    
    showSearchSuggestions() {
        if (this.elements.searchInput.value.trim()) {
            this.elements.searchSuggestions.classList.add('show');
        }
    }
    
    hideSearchSuggestions() {
        this.elements.searchSuggestions.classList.remove('show');
    }
    
    updateSearchSuggestions(apis) {
        if (!apis.length) {
            this.hideSearchSuggestions();
            return;
        }
        
        const suggestionsHTML = apis.map(api => `
            <div class="search-suggestion" data-api="${api.name}">
                <i class="fas fa-plug search-suggestion-icon"></i>
                <div class="search-suggestion-content">
                    <div class="search-suggestion-title">${api.name}</div>
                    <div class="search-suggestion-category">${api.category}</div>
                </div>
            </div>
        `).join('');
        
        this.elements.searchSuggestions.innerHTML = suggestionsHTML;
        this.showSearchSuggestions();
        
        // Add click handlers
        this.elements.searchSuggestions.querySelectorAll('.search-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const apiName = suggestion.dataset.api;
                this.elements.searchInput.value = apiName;
                this.performSearch(apiName);
                this.hideSearchSuggestions();
            });
        });
    }
    
    // Category and API Rendering
    renderCategories() {
        if (!this.elements.categoryTabs) return;
        
        if (!this.settings.categories?.length) {
            this.elements.categoryTabs.innerHTML = '<p class="text-muted">No categories available</p>';
            return;
        }
        
        const allTab = `
            <button class="category-tab active" data-category="all">
                <i class="fas fa-th category-tab-icon"></i>
                <span>All APIs</span>
                <span class="category-tab-badge">${this.getTotalAPICount()}</span>
            </button>
        `;
        
        const categoryTabs = this.settings.categories.map(category => `
            <button class="category-tab" data-category="${category.name}">
                ${category.icon ? `<i class="${category.icon} category-tab-icon"></i>` : ''}
                <span>${category.name}</span>
                <span class="category-tab-badge">${category.items?.length || 0}</span>
            </button>
        `).join('');
        
        this.elements.categoryTabs.innerHTML = allTab + categoryTabs;
        
        // Add event listeners
        this.elements.categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => this.filterByCategory(tab.dataset.category));
        });
    }
    
    filterByCategory(category) {
        this.currentCategory = category;
        
        // Update active tab
        this.elements.categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.renderAPIs();
    }
    
    renderAPIs() {
        if (!this.elements.apiGrid) return;
        
        const apis = this.getFilteredAPIs();
        
        if (!apis.length) {
            this.renderEmptyState();
            return;
        }
        
        const apiCards = apis.map((api, index) => this.createAPICard(api, index)).join('');
        this.elements.apiGrid.innerHTML = apiCards;
        
        // Add animation
        this.animateCards();
        
        // Add event listeners
        this.elements.apiGrid.querySelectorAll('.api-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.api-card');
                const apiDataEncoded = card.dataset.apiEncoded;
                try {
                    // Decode from base64
                    const apiDataJson = decodeURIComponent(escape(atob(apiDataEncoded)));
                    const apiData = JSON.parse(apiDataJson);
                    this.openAPIModal(apiData);
                } catch (error) {
                    console.error('Error parsing API data:', error);
                    this.showToast('Error loading API details', 'error');
                }
            });
        });
    }
    
    renderFilteredAPIs(apis) {
        if (!apis.length) {
            this.renderEmptyState('No APIs found matching your search');
            return;
        }
        
        const apiCards = apis.map((api, index) => this.createAPICard(api, index)).join('');
        this.elements.apiGrid.innerHTML = apiCards;
        this.animateCards();
        
        // Add event listeners
        this.elements.apiGrid.querySelectorAll('.api-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.api-card');
                const apiDataEncoded = card.dataset.apiEncoded;
                try {
                    // Decode from base64
                    const apiDataJson = decodeURIComponent(escape(atob(apiDataEncoded)));
                    const apiData = JSON.parse(apiDataJson);
                    this.openAPIModal(apiData);
                } catch (error) {
                    console.error('Error parsing API data:', error);
                    this.showToast('Error loading API details', 'error');
                }
            });
        });
    }
    
    getFilteredAPIs() {
        const apis = [];
        
        this.settings.categories?.forEach(category => {
            if (this.currentCategory === 'all' || this.currentCategory === category.name) {
                category.items?.forEach(api => {
                    apis.push({ ...api, category: category.name });
                });
            }
        });
        
        return apis;
    }
    
    getTotalAPICount() {
        return this.settings.categories?.reduce((acc, cat) => acc + (cat.items?.length || 0), 0) || 0;
    }
    
    createAPICard(api, index) {
        const status = api.status || 'ready';
        const isDisabled = status === 'error' || status === 'update';
        const statusConfig = {
            ready: { class: 'ready', icon: 'fa-check-circle', text: 'Ready' },
            error: { class: 'error', icon: 'fa-exclamation-circle', text: 'Error' },
            update: { class: 'update', icon: 'fa-sync-alt', text: 'Update' }
        };
        
        const currentStatus = statusConfig[status] || statusConfig.ready;
        
        // Escape special characters for safe JSON stringification
        const safeApi = {
            ...api,
            name: this.escapeHtml(api.name),
            desc: this.escapeHtml(api.desc),
            innerDesc: api.innerDesc ? this.escapeHtml(api.innerDesc) : undefined
        };
        
        // Use base64 encoding to safely store JSON data
        const apiDataEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(safeApi))));
        
        return `
            <div class="api-card reveal" data-api-encoded="${apiDataEncoded}" style="animation-delay: ${index * 0.05}s">
                <div class="api-card-header">
                    <h3 class="api-card-title">
                        <div class="api-card-icon">
                            <i class="fas fa-cube"></i>
                        </div>
                        ${api.name}
                    </h3>
                    <div class="api-status ${currentStatus.class}">
                        <i class="fas ${currentStatus.icon}"></i>
                        <span>${currentStatus.text}</span>
                    </div>
                </div>
                
                <p class="api-card-description">${api.desc}</p>
                
                <div class="api-card-footer">
                    <div class="api-method">
                        <i class="fas fa-code"></i>
                        <span>GET</span>
                    </div>
                    <button class="api-action-btn interactive-element" ${isDisabled ? 'disabled' : ''}>
                        <i class="fas fa-play"></i>
                        <span>Try it</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    // Helper function to escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    renderEmptyState(message = 'No APIs available') {
        this.elements.apiGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox empty-state-icon"></i>
                <h3 class="empty-state-title">${message}</h3>
                <p class="empty-state-description">
                    Try adjusting your search or filter to find what you're looking for
                </p>
            </div>
        `;
    }
    
    animateCards() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });
        
        this.elements.apiGrid.querySelectorAll('.reveal').forEach(card => {
            observer.observe(card);
        });
    }
    
    // Modal Management
    initializeModal() {
        // Close modal on background click
        this.elements.apiModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.apiModal) {
                this.closeModal();
            }
        });
    }
    
    openAPIModal(api) {
        this.currentModal = api;
        
        // Update modal content
        this.elements.modalTitle.textContent = api.name;
        this.elements.endpointContent.textContent = `${window.location.origin}${api.path.split('?')[0]}`;
        
        // Clear previous states
        this.elements.paramsSection.innerHTML = '';
        this.elements.responseSection.classList.remove('show');
        this.elements.responseCode.innerHTML = '';
        
        // Parse parameters
        const params = this.parseAPIParams(api);
        if (params.length > 0) {
            this.renderModalParams(params, api);
            this.elements.modalSubmit.style.display = 'flex';
        } else {
            this.elements.modalSubmit.style.display = 'none';
            // Auto-execute if no params
            this.executeAPIRequest(api.path);
        }
        
        // Show modal
        this.elements.apiModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        this.elements.apiModal.classList.remove('show');
        document.body.style.overflow = '';
        this.currentModal = null;
    }
    
    parseAPIParams(api) {
        const urlParams = new URLSearchParams(api.path.split('?')[1]);
        const params = [];
        
        for (const [key, value] of urlParams) {
            params.push({
                name: key,
                value: value,
                description: api.params?.[key] || '',
                required: true
            });
        }
        
        return params;
    }
    
    renderModalParams(params, api) {
        const paramsHTML = `
            <h4>Parameters</h4>
            ${params.map(param => `
                <div class="param-item">
                    <div class="param-label">
                        <span class="param-name">${param.name}</span>
                        ${param.required ? '<span class="param-required">*required</span>' : '<span class="param-optional">optional</span>'}
                    </div>
                    <input 
                        type="text" 
                        class="param-input" 
                        id="param-${param.name}"
                        placeholder="Enter ${param.name}..."
                        data-param="${param.name}"
                        ${param.required ? 'required' : ''}
                    />
                    ${param.description ? `<p class="param-help">${param.description}</p>` : ''}
                </div>
            `).join('')}
            ${api.innerDesc ? `
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle"></i>
                    ${api.innerDesc}
                </div>
            ` : ''}
        `;
        
        this.elements.paramsSection.innerHTML = paramsHTML;
        
        // Add input validation
        this.elements.paramsSection.querySelectorAll('.param-input').forEach(input => {
            input.addEventListener('input', () => this.validateModalInputs());
        });
    }
    
    validateModalInputs() {
        const inputs = this.elements.paramsSection.querySelectorAll('.param-input[required]');
        const allValid = Array.from(inputs).every(input => input.value.trim() !== '');
        
        this.elements.modalSubmit.disabled = !allValid;
    }
    
    async submitAPIRequest() {
        if (!this.currentModal) return;
        
        // Build URL with parameters
        const params = new URLSearchParams();
        this.elements.paramsSection.querySelectorAll('.param-input').forEach(input => {
            if (input.value.trim()) {
                params.append(input.dataset.param, input.value.trim());
            }
        });
        
        const baseUrl = this.currentModal.path.split('?')[0];
        const fullUrl = `${window.location.origin}${baseUrl}?${params.toString()}`;
        
        // Update endpoint display
        this.elements.endpointContent.textContent = fullUrl;
        
        // Execute request
        await this.executeAPIRequest(fullUrl);
    }
    
    async executeAPIRequest(url) {
        // Show loading state
        this.elements.modalSubmit.disabled = true;
        this.elements.modalSubmit.innerHTML = '<span class="loading-spinner"></span> Sending...';
        
        try {
            const startTime = performance.now();
            const response = await fetch(url);
            const endTime = performance.now();
            
            const responseTime = Math.round(endTime - startTime);
            
            // Update status
            const isSuccess = response.ok;
            this.updateResponseStatus(isSuccess, response.status);
            
            // Get response data
            const contentType = response.headers.get('Content-Type');
            let responseData;
            
            if (contentType?.includes('application/json')) {
                responseData = await response.json();
                this.displayJSONResponse(responseData);
            } else if (contentType?.includes('image/')) {
                const blob = await response.blob();
                this.displayImageResponse(blob);
            } else {
                responseData = await response.text();
                this.displayTextResponse(responseData);
            }
            
            // Show response section
            this.elements.responseSection.classList.add('show');
            
            // Add performance metrics
            this.displayPerformanceMetrics(responseTime, response);
            
        } catch (error) {
            this.updateResponseStatus(false, 0);
            this.displayErrorResponse(error);
        } finally {
            // Reset submit button
            this.elements.modalSubmit.disabled = false;
            this.elements.modalSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
        }
    }
    
    updateResponseStatus(isSuccess, statusCode) {
        const statusElement = this.elements.responseStatus;
        if (isSuccess) {
            statusElement.className = 'response-status success';
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> <span>Success ' + statusCode + '</span>';
        } else {
            statusElement.className = 'response-status error';
            statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error ' + statusCode + '</span>';
        }
    }
    
    displayJSONResponse(data) {
        const formatted = this.syntaxHighlightJSON(JSON.stringify(data, null, 2));
        this.elements.responseCode.innerHTML = formatted;
    }
    
    displayImageResponse(blob) {
        const url = URL.createObjectURL(blob);
        this.elements.responseCode.innerHTML = `
            <img src="${url}" alt="API Response" class="response-image" />
            <a href="${url}" download="api-response.${blob.type.split('/')[1]}" class="btn btn-primary mt-3">
                <i class="fas fa-download"></i> Download Image
            </a>
        `;
    }
    
    displayTextResponse(text) {
        this.elements.responseCode.textContent = text;
    }
    
    displayErrorResponse(error) {
        this.elements.responseCode.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message || 'An error occurred while making the request'}</p>
            </div>
        `;
    }
    
    displayPerformanceMetrics(responseTime, response) {
        const parentContainer = this.elements.responseCode.parentElement;
        
        // Cek dan hapus blok metrics yang sudah ada sebelumnya
        const existingMetrics = parentContainer.querySelector('.performance-metrics');
        if (existingMetrics) {
            existingMetrics.remove();
        }

        const size = response.headers.get('Content-Length') || 'N/A';
        const metricsHTML = `
            <div class="performance-metrics">
                <div class="metric-item">
                    <span class="metric-value">${responseTime}ms</span>
                    <span class="metric-label">Response Time</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${size}</span>
                    <span class="metric-label">Size (bytes)</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${response.status}</span>
                    <span class="metric-label">Status Code</span>
                </div>
            </div>
        `;
        
        // Tambahkan metrics yang baru ke dalam response content
        const metricsDiv = document.createElement('div');
        metricsDiv.innerHTML = metricsHTML;
        parentContainer.appendChild(metricsDiv);
    }
    syntaxHighlightJSON(json) {
        return json
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return `<span class="${cls}">${match}</span>`;
            });
    }
    
    // Copy Functions
    async copyEndpoint() {
        const text = this.elements.endpointContent.textContent;
        await this.copyToClipboard(text, this.elements.copyEndpoint);
    }
    
    async copyResponse() {
        // Get only the actual response content, not the formatted HTML
        const responseElement = this.elements.responseCode;
        let textToCopy = '';
        
        // Check if it's JSON response
        if (responseElement.querySelector('.json-key')) {
            // Extract original JSON from formatted HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = responseElement.innerHTML;
            
            // Remove all HTML tags but keep text content
            textToCopy = tempDiv.textContent || tempDiv.innerText || '';
            
            // Try to parse and reformat JSON
            try {
                const jsonData = JSON.parse(textToCopy);
                textToCopy = JSON.stringify(jsonData, null, 2);
            } catch (e) {
                // If parsing fails, use the text as is
            }
        } else {
            // For non-JSON responses
            textToCopy = responseElement.textContent;
        }
        
        await this.copyToClipboard(textToCopy, this.elements.copyResponse);
    }
    
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Update button state
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
            
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            this.showToast('Failed to copy', 'error');
        }
    }
    
    // Notifications
    async checkNotifications() {
        try {
            const response = await fetch('/notifications.json');
            if (response.ok) {
                const notifications = await response.json();
                // Add ID if not exists
                this.notifications = notifications.map((notif, index) => ({
                    id: notif.id || `notif-${index}`,
                    date: notif.date || new Date().toISOString(),
                    read: notif.read || false,
                    title: notif.title || 'Notification',
                    message: notif.message || '',
                    ...notif
                }));
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            // Use default notifications if file not found
            this.notifications = [
                {
                    id: 'welcome',
                    date: new Date().toISOString(),
                    title: 'Welcome!',
                    message: 'Welcome to Falcon API Documentation',
                    read: false
                }
            ];
            this.updateNotificationBadge();
        }
    }
    
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            this.elements.notificationBadge.classList.add('active');
        } else {
            this.elements.notificationBadge.classList.remove('active');
        }
    }
    
    showNotifications() {
        // Create notification panel if not exists
        let notificationPanel = document.getElementById('notificationPanel');
        
        if (!notificationPanel) {
            notificationPanel = document.createElement('div');
            notificationPanel.id = 'notificationPanel';
            notificationPanel.className = 'notification-panel';
            notificationPanel.innerHTML = `
                <div class="notification-panel-header">
                    <h3>Notifications</h3>
                    <button class="notification-panel-close" onclick="document.getElementById('notificationPanel').classList.remove('show')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-panel-content" id="notificationContent">
                    <!-- Notifications will be added here -->
                </div>
            `;
            document.body.appendChild(notificationPanel);
            
            // Add styles for notification panel
            const style = document.createElement('style');
            style.textContent = `
                .notification-panel {
                    position: fixed;
                    top: var(--header-height);
                    right: -400px;
                    width: 400px;
                    height: calc(100vh - var(--header-height));
                    background: var(--surface-color);
                    box-shadow: var(--shadow-xl);
                    z-index: var(--z-modal);
                    transition: right 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }
                
                .notification-panel.show {
                    right: 0;
                }
                
                .notification-panel-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-panel-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                
                .notification-panel-close {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: var(--border-radius-sm);
                    transition: var(--transition);
                }
                
                .notification-panel-close:hover {
                    background: var(--highlight-color);
                    color: var(--primary-color);
                }
                
                .notification-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                }
                
                .notification-item {
                    background: var(--background-color);
                    border-radius: var(--border-radius);
                    padding: 1rem;
                    margin-bottom: 1rem;
                    border-left: 4px solid var(--primary-color);
                    transition: var(--transition);
                }
                
                .notification-item:hover {
                    transform: translateX(-5px);
                    box-shadow: var(--shadow);
                }
                
                .notification-item.unread {
                    border-left-color: var(--accent-color);
                    background: var(--highlight-color);
                }
                
                .notification-date {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-bottom: 0.25rem;
                }
                
                .notification-title {
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .notification-message {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                
                .notification-empty {
                    text-align: center;
                    padding: 3rem;
                    color: var(--text-muted);
                }
                
                .notification-empty i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.3;
                }
                
                @media (max-width: 768px) {
                    .notification-panel {
                        width: 100%;
                        right: -100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Populate notifications
        const notificationContent = document.getElementById('notificationContent');
        
        if (this.notifications.length === 0) {
            notificationContent.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
        } else {
            const notificationHTML = this.notifications.map(notification => {
                const date = new Date(notification.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                
                return `
                    <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                        <div class="notification-date">${date}</div>
                        ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
                        <div class="notification-message">${notification.message}</div>
                    </div>
                `;
            }).join('');
            
            notificationContent.innerHTML = notificationHTML;
            
            // Mark as read when clicked
            notificationContent.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    const notification = this.notifications.find(n => n.id === id);
                    if (notification) {
                        notification.read = true;
                        item.classList.remove('unread');
                        this.updateNotificationBadge();
                    }
                });
            });
        }
        
        // Show panel
        notificationPanel.classList.add('show');
        
        // Mark all as read after 2 seconds
        setTimeout(() => {
            this.notifications.forEach(n => n.read = true);
            this.updateNotificationBadge();
        }, 2000);
    }
    
    // Toast Notifications
    showToast(message, type = 'info', title = '') {
        const toastId = `toast-${Date.now()}`;
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            notification: 'fa-bell'
        };
        
        const toastHTML = `
            <div class="toast ${type}" id="${toastId}">
                <i class="fas ${iconMap[type] || iconMap.info} toast-icon"></i>
                <div class="toast-content">
                    ${title ? `<div class="toast-title">${title}</div>` : ''}
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        this.elements.toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
    
    // Keyboard Shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.elements.searchInput?.focus();
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            if (this.elements.apiModal.classList.contains('show')) {
                this.closeModal();
            } else if (this.elements.searchSuggestions.classList.contains('show')) {
                this.hideSearchSuggestions();
            }
        }
    }
    
    // Click Outside Handlers
    handleClickOutside(e) {
        // Close search suggestions
        if (!e.target.closest('.search-container')) {
            this.hideSearchSuggestions();
        }
        
        // Close mobile nav
        if (window.innerWidth < 992 && 
            !e.target.closest('.side-nav') && 
            !e.target.closest('.menu-toggle') &&
            this.elements.sideNav.classList.contains('active')) {
            this.elements.sideNav.classList.remove('active');
        }
    }
    
    // Scroll Handling
    handleScroll() {
        const scrolled = window.scrollY > 50;
        this.elements.mainHeader?.classList.toggle('scrolled', scrolled);
        
        // Update active section in navigation
        this.updateActiveSection();
    }
    
    updateActiveSection() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelectorAll('.side-nav-link').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }
    
    // Scroll Animations
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });
        
        document.querySelectorAll('.reveal').forEach(element => {
            observer.observe(element);
        });
    }
    
    // Loading Screen
    hideLoading() {
        if (!this.elements.loadingScreen) return;
        
        setTimeout(() => {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
                document.body.classList.remove('no-scroll');
            }, 300);
        }, 500);
    }
    
    // Lazy Loading Implementation
    initializeLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
            
            // Observe all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.loadImage(img);
            });
        }
    }
    
    loadImageLazily(imgElement, src, fallbackSrc = null) {
        imgElement.dataset.src = src;
        imgElement.dataset.fallback = fallbackSrc || src;
        
        // Add loading placeholder
        imgElement.style.backgroundImage = 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)';
        imgElement.style.backgroundSize = '20px 20px';
        imgElement.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        imgElement.style.backgroundColor = 'var(--background-color)';
        
        if (this.imageObserver) {
            this.imageObserver.observe(imgElement);
        } else {
            this.loadImage(imgElement);
        }
    }
    
    loadImage(imgElement) {
        const src = imgElement.dataset.src;
        const fallbackSrc = imgElement.dataset.fallback;
        
        if (!src) return;
        
        const tempImg = new Image();
        tempImg.onload = () => {
            imgElement.src = src;
            imgElement.classList.add('loaded');
            imgElement.style.backgroundImage = '';
            imgElement.style.backgroundColor = '';
            imgElement.removeAttribute('data-src');
        };
        
        tempImg.onerror = () => {
            if (fallbackSrc && fallbackSrc !== src) {
                tempImg.src = fallbackSrc;
                tempImg.onload = () => {
                    imgElement.src = fallbackSrc;
                    imgElement.classList.add('loaded');
                    imgElement.style.backgroundImage = '';
                    imgElement.style.backgroundColor = '';
                };
            } else {
                imgElement.classList.add('error');
                imgElement.style.backgroundImage = '';
                imgElement.style.backgroundColor = '';
                imgElement.alt = 'Gagal memuat gambar';
                console.warn('Failed to load image:', src);
            }
        };
        
        tempImg.src = src;
    }
    
    // Performance optimization methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.apiDocs = new APIDocumentation();
});

// Service Worker Registration (for PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker registration failed, app will still work
        });
    });
}
