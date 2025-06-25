// Main Application Entry Point
import { PrismDashboard } from './dashboard';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    const dashboard = new PrismDashboard();
    
    // Make it available globally for debugging if needed
    (window as any).prismDashboard = dashboard;
    
    console.log('🔮 Prism Dashboard initialized successfully');
});

// Handle any unhandled errors
window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
}); 