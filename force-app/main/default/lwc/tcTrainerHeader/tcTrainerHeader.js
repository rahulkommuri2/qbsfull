import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import formFactorPropertyName from "@salesforce/client/formFactor";

import companyLogo from '@salesforce/resourceUrl/QBSLogo'; 
import userId from '@salesforce/user/Id'; // Importing user ID for potential use
import { getRecord } from 'lightning/uiRecordApi';
import NAME_FIELD from '@salesforce/schema/User.Name'; // Importing the Name field from User
import PROFILE_ID_FIELD from '@salesforce/schema/User.ProfileId'; // Importing the ProfileId field from User
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId'; // Importing the ContactId field from User
import ACCOUNT_ID_FIELD from '@salesforce/schema/User.AccountId'; // Importing the AccountId field from User
import PORTAL_ROLE_FIELD from '@salesforce/schema/User.PortalRole'; // Importing the PortalRole field from User


export default class TcTrainerHeader extends NavigationMixin(LightningElement) {
    @track userName = '';
    @track userId = userId;
    @track isMobile = false;
    
    //for future use
    @track profileName = '';
    @track profileId = '';
    @track contactId = '';
    @track accountId = '';
    @track portalRole = '';

    connectedCallback() {
        // Determine the form factor and set flags accordingly
        if (formFactorPropertyName === 'Small') {
            this.isMobile = true;
        }
    }

    // Static resource logo URL
    get logoUrl() {
        return companyLogo;
    }
    
    // QBS URL
    get qbsUrl() {
        return 'https://qbs.com';
    }

    // use wire get record ui api and fetch user profile name
    @wire(getRecord, { recordId: '$userId', fields: [NAME_FIELD, PROFILE_ID_FIELD, CONTACT_ID_FIELD, ACCOUNT_ID_FIELD, PORTAL_ROLE_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.userName = data.fields.Name.value;
            this.profileId = data.fields.ProfileId.value;
            this.profileName = data.fields.ProfileId.displayValue; 
            this.contactId = data.fields.ContactId.value;
            this.accountId = data.fields.AccountId.value;
        } else if (error) {
            console.error('Error fetching user data:', error);
        }
    }

    // Handle home button click
    handleHome() {
        this.navigateToPage('Home');
    }

    handleProfile() {
        this.navigateToPage('Profile__c');
    }

    handleFeedback() {
        this.navigateToStandardPage('Class_List__c');
    }

    // Navigate to different site pages
    navigateToStandardPage(pageName) {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: "hed__Course_Offering__c",
                actionName: "list",
            },
        });
    }

    // Navigate to different site pages
    navigateToPage(pageName) {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: pageName
            }
        });
    }

    // Handle logout functionality
    handleLogout() {
        // Navigate to login page
        this[NavigationMixin.Navigate]({
            type: 'comm__loginPage',
            attributes: {
                actionName: 'login'
            }
        });
    }
}