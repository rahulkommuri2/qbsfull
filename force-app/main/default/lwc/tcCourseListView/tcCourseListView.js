import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllCourseResources from '@salesforce/apex/tcCourseController.getAllCourseResources';
import getKnowledgeArticlesForCourse from '@salesforce/apex/tcCourseController.getKnowledgeArticlesForCourse';
import getKnowledgeArticleContent from '@salesforce/apex/tcCourseController.getKnowledgeArticleContent';

export default class TcCourseListView extends LightningElement {
    @track isLoadingArticles = false;
    @track selectedCourseId = null;
    @track selectedCourseName = '';
    @track selectedCourseArticles = [];
    @track itemsPerPage = 10;
    @track currentPage = 1;

    @track showArticleModal = false;
    @track articleContent = '';
    @track articleTitle = '';
    @track isLoadingArticleContent = false;
    @track selectedArticleId = null; // Track selected article
    @track videoUrlInContent = null; // Track video URL if present in content

    // Wire the Apex method
    @wire(getAllCourseResources)
    courseResources;

    // Check if we have data to display
    get hasData() {
        return this.courseResources.data && this.courseResources.data.length > 0;
    }

    // Check if component is in loading state
    get isComponentLoading() {
        return !this.courseResources.data && !this.courseResources.error;
    }

    // Check if a course is selected
    get hasSelectedCourse() {
        return this.selectedCourseId !== null;
    }

    // Get total pages for articles
    get totalArticlePages() {
        if (!this.selectedCourseArticles || this.selectedCourseArticles.length === 0) return 1;
        return Math.ceil(this.selectedCourseArticles.length / this.itemsPerPage);
    }

    // Disable previous/next buttons
    get disableArticlePrevious() {
        return this.currentPage <= 1;
    }
    get disableArticleNext() {
        return this.currentPage >= this.totalArticlePages;
    }

    // Get paginated articles for display
    get paginatedArticles() {
        if (!this.selectedCourseArticles || this.selectedCourseArticles.length === 0) {
            return [];
        }
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.selectedCourseArticles.slice(startIndex, endIndex).map(article => ({
            ...article,
            articleUrl: `/lightning/r/KnowledgeArticle/${article.Id}/view`,
            dataId: article.Id,
            dataTitle: article.Title,
            rowClass: this.selectedArticleId === article.Id
                ? 'related-item selected-course-row slds-p-horizontal_large slds-p-vertical_x-small'
                : 'related-item slds-p-horizontal_large slds-p-vertical_x-small'
        }));
    }

    // Show no articles message
    get showNoArticles() {
        return this.hasSelectedCourse && 
               !this.isLoadingArticles && 
               (!this.selectedCourseArticles || this.selectedCourseArticles.length === 0);
    }

    // Generate pagination text
    get paginationText() {
        if (!this.selectedCourseArticles || this.selectedCourseArticles.length === 0) {
            return '0 - 0 of 0';
        }

        const totalArticles = this.selectedCourseArticles.length;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const start = totalArticles === 0 ? 0 : startIndex + 1;
        const end = Math.min(startIndex + this.itemsPerPage, totalArticles);
        
        return `${start} - ${end} of ${totalArticles}`;
    }

    // Handle course name click to show related articles below
    handleCourseClick(event) {
        const courseId = event.target.dataset.courseId;
        const courseName = event.target.textContent;
        
        console.log('Course clicked:', courseName, 'ID:', courseId);
        
        // Set selected course
        this.selectedCourseId = courseId;
        this.selectedCourseName = courseName;
        this.currentPage = 1; // Reset to first page
        
        // Load articles for the selected course
        this.loadRelatedArticles(courseId);
    }

    // Load related knowledge articles
    loadRelatedArticles(courseId) {
        console.log('Loading related articles for course:', courseId);
        
        this.isLoadingArticles = true;
        this.selectedCourseArticles = []; // Clear previous articles
        
        getKnowledgeArticlesForCourse({ courseResourceId: courseId })
            .then(result => {
                console.log('Related articles received:', result);
                
                if (result && Array.isArray(result)) {
                    this.selectedCourseArticles = result;
                    console.log('Articles set:', this.selectedCourseArticles);
                } else {
                    console.log('No articles found or invalid result');
                    this.selectedCourseArticles = [];
                }
            })
            .catch(error => {
                console.error('Error loading related articles:', error);
                this.selectedCourseArticles = [];
                
                // Show error message to user
                this.showToast('Error', 'Failed to load related articles: ' + error.body?.message, 'error');
            })
            .finally(() => {
                this.isLoadingArticles = false;
            });
    }

    // Handle items per page change for pagination
    handleItemsPerPageChange(event) {
        const selectedValue = parseInt(event.target.value);
        console.log('Items per page changed to:', selectedValue);
        
        this.itemsPerPage = selectedValue;
        this.currentPage = 1; // Reset to first page when changing items per page
    }

    // Pagination for articles
    handleArticlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }
    handleArticleNext() {
        if (this.currentPage < this.totalArticlePages) {
            this.currentPage++;
        }
   }

    // Add click handler for article links
    handleArticleClick(event) {
        event.preventDefault();
        const articleId = event.currentTarget.dataset.articleId;
        const articleTitle = event.currentTarget.dataset.articleTitle;
        this.articleTitle = articleTitle;
        this.articleContent = '';
        this.showArticleModal = true;
        this.isLoadingArticleContent = true;
        this.selectedArticleId = articleId;
        this.videoUrlInContent = null; // Reset video URL

        getKnowledgeArticleContent({ articleId })
            .then(result => {
                this.articleContent = result || '<em>No content found.</em>';

                // Detect any iframe and extract src (video)
                // This will match the first iframe src in the content
                const iframeMatch = result && result.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i);
                if (iframeMatch && iframeMatch[1]) {
                    this.videoUrlInContent = iframeMatch[1];
                } else {
                    this.videoUrlInContent = null;
                }
            })
            .catch(error => {
                this.articleContent = '<em>Error loading content.</em>';
                this.videoUrlInContent = null;
            })
            .finally(() => {
                this.isLoadingArticleContent = false;
            });
    }

    closeArticleModal() {
        this.showArticleModal = false;
        this.articleContent = '';
        this.articleTitle = '';
        this.selectedArticleId = null;
        this.videoUrlInContent = null; // Reset video URL
    }

    // Keyboard event for Escape key to close modal
    handleKeydown = (event) => {
        if (event.key === 'Escape' && this.showArticleModal) {
            this.closeArticleModal();
        }
    };

    renderedCallback() {
        // Render article content in modal
        if (this.showArticleModal && !this.isLoadingArticleContent && this.articleContent) {
            const container = this.template.querySelector('.article-rich-content');
            if (container) {
                container.innerHTML = this.articleContent;
            }
        }
        // Add/remove keyboard event listener for modal
        if (this.showArticleModal) {
            window.addEventListener('keydown', this.handleKeydown);
        } else {
            window.removeEventListener('keydown', this.handleKeydown);
        }

        // Show accessibility error as toast if present
        if (this.accessibilityErrorMessage && !this._toastShown) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: this.accessibilityErrorMessage,
                variant: 'error'
            }));
            this._toastShown = true;
        }
    }

    // Show toast message (if needed)
    showToast(title, message, variant) {
        // You can implement toast notifications here if needed
        console.log(`${variant.toUpperCase()}: ${title} - ${message}`);
    }

    getCourseRowClass(courseId) {
        return `course-row${this.selectedCourseId === courseId ? ' selected-course-row' : ''}`;
    }

    // Use this getter in your template for the course list
    get processedCourses() {
        if (!this.courseResources.data) return [];
        return this.courseResources.data.map(course => ({
            ...course,
            rowClass: this.selectedCourseId === course.Id
                ? 'course-row selected-course-row'
                : 'course-row'
        }));
    }

    // Error message getter for accessibility errors
    get accessibilityErrorMessage() {
        return this.courseResources.error && this.courseResources.error.body && this.courseResources.error.body.message
            ? this.courseResources.error.body.message
            : '';
    }

    handleOpenVideoInNewTab() {
        if (this.videoUrlInContent) {
            window.open(this.videoUrlInContent, '_blank');
        }
    }
}