import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import formFactorPropertyName from "@salesforce/client/formFactor";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TcHome extends NavigationMixin(LightningElement) {
    @track dueCount = 0;
    @track lapsedCount = 0;
    @track expiredCount = 0;
    @track isMobile = false;

    connectedCallback() {
        this.isMobile = (formFactorPropertyName === 'Small');
    }

    @track tileData = [
        {
            id: 1,
            title: 'TRAININGS',
            description: 'Add, View, Edit, Print or Finalize Training',
            icon: 'utility:education',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'hed__Course_Offering__c',
                    actionName: 'list'
                }
            }
        },
        {
            id: 2,
            title: 'COURSES',
            description: 'Access Specialist Training Materials and Videos',
            icon: 'utility:video',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'hed__Course__c',
                    actionName: 'list'
                }
            }
        },
        {
            id: 3,
            title: 'SPECIALISTS',
            description: 'Add, View or Update a Specialist Profile',
            icon: 'utility:user',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Contact',
                    actionName: 'list'
                }
            }
        },
        {
            id: 4,
            title: 'TRAINERS',
            description: 'View a Trainer Profile',
            icon: 'utility:groups',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Contact',
                    actionName: 'list'
                }
            }
        },
        {
            id: 5,
            title: 'REPORTS',
            description: 'View Reports',
            icon: 'utility:chart',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Report',
                    actionName: 'list'
                }
            }
        },
        {
            id: 6,
            title: 'CONTACT US',
            description: 'Need to Reach Us?',
            icon: 'utility:email',
            navigationConfig: {
                type: 'standard__webPage',
                attributes: {
                    url: '/lightning/o/Case/new'
                }
            }
        },
        {
            id: 7,
            title: 'TRAINER MATERIALS',
            description: 'Order form for Safety-Care Training Materials',
            icon: 'utility:file',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Material__c',
                    actionName: 'new'
                }
            }
        },
        {
            id: 8,
            title: 'RESTRICTION MANAGEMENT',
            description: 'View and Update your Specialist Restrictions',
            icon: 'utility:lock',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Restriction__c',
                    actionName: 'list'
                }
            }
        },
        {
            id: 9,
            title: 'FAQ',
            description: 'Frequently Asked Questions',
            icon: 'utility:question',
            navigationConfig: {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'FAQ__c',
                    actionName: 'list'
                }
            }
        }
    ];

    handleTileClick(event) {
        event.preventDefault();
        const tileId = parseInt(event.currentTarget.dataset.id);
        
        if (tileId !== 1 && tileId !== 2) {
            this.showToast('Info', 'This feature is coming soon!', 'info');
            return;
        }

        const tile = this.tileData.find(item => item.id === tileId);
        if (tile) {
            try {
                const navigationResult = this[NavigationMixin.Navigate](tile.navigationConfig);
                
                // Check if the result is a Promise before calling .catch()
                if (navigationResult && typeof navigationResult.catch === 'function') {
                    navigationResult.catch(error => {
                        this.showToast('Navigation Error', `Failed to navigate to ${tile.title}`, 'error');
                    });
                }
            } catch (error) {
                this.showToast('Navigation Error', `Failed to navigate to ${tile.title}`, 'error');
            }
        }
    }

    handleNewTrainingClick() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { 
                name: 'New_Training__c'
            }
        });
    }

    handleTileHover(event) {
        const tile = event.currentTarget.querySelector('.tile');
        const icon = event.currentTarget.querySelector('lightning-icon');
        
        if (tile) tile.classList.add('hovered');
        if (icon) icon.style.setProperty('--sds-c-icon-color-foreground-default', 'white');
    }

    handleTileLeave(event) {
        const tile = event.currentTarget.querySelector('.tile');
        const icon = event.currentTarget.querySelector('lightning-icon');
        
        if (tile) tile.classList.remove('hovered');
        if (icon) icon.style.setProperty('--sds-c-icon-color-foreground-default', '#6250b4');
    }

    handleActionClick(event) {
        event.preventDefault();
        this.showToast('Info', 'This feature is coming soon!', 'info');
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}