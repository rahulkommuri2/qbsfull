import { LightningElement } from 'lwc';
import LightningAlert from 'lightning/alert';
import { NavigationMixin } from 'lightning/navigation';

export default class TcTest extends NavigationMixin(LightningElement) {

    isLoading = false;
    errorMessage = '';

    handleEditTraining() {
        // Logic to edit the training
    }

    handleRefinalize() {
        // Logic to refinalize the training
    }

    handleDownloadCerts() {
        // Logic to download certificates
    }

    handleEmailCerts() {
        // Logic to email certificates
    }

    handleRequestCorrection() {
        // Logic to request a correction
    }

    handleBackToTrainings() {
        // Logic to navigate back to the trainings list
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            }
        });
    }

    async showErrorAlert() {
        await LightningAlert.open({
            message: this.errorMessage,
            theme: 'error', // a red theme intended for error states
            label: 'Error!', // this is the header text
        });
    }

}