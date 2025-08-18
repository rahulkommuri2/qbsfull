import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import userId from '@salesforce/user/Id';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import formFactorPropertyName from '@salesforce/client/formFactor';
import getTrainingDetails from '@salesforce/apex/tcTrainingDetailsController.initializePage';
import createCorrectionCase from '@salesforce/apex/tcTrainingDetailsController.createCase';

/**
 * LWC component for displaying and managing training details.
 * Interacts with tcTrainingDetailsController to fetch and update training data.
 */
export default class TcTrainingDetail extends NavigationMixin(LightningElement) {
    // Public properties
    @api recordId; // Training ID from parent or record page

    // UI state properties
    @track isLoading = true;
    @track isMobileView = false;
    @track isMobileMenuVisible = false;
    @track mobileMenuIcon = 'utility:down';
    @track isEditMode = false;
    @track isNotEditable = true;
    @track errorMessage = '';

    // Training details properties
    @track trainingId = '';
    @track contactId = '';
    @track trainingDetails = {};
    @track selectedSubOrganization = '';
    @track selectedCertificationType = '';
    @track trainingStartDate = '';
    @track trainingEndDate = '';
    @track selectedAuthorization = '';
    @track trainingLocationAddress = '';
    @track locationCity = '';
    @track selectedState = '';
    @track locationZipCode = '';
    @track trainingNotes = '';
    @track finalizedStatus = 'false';
    @track formattedActualTrainingTime = '0 hours';
    @track formattedMinimumTrainingTime = '0 hours';
    @track primaryFacultyContactId = '';
    @track secondaryFacultyContactId = '';

    // Course and competency properties
    @track selectedCourseId = '';
    @track trainingCourseList = [];
    @track courseColumns = [
        { label: 'Competency', fieldName: 'name' },
        { label: 'Chapter', fieldName: 'chapter' },
        { label: 'Initial Time', fieldName: 'initialTime' },
        { label: 'Recert Time', fieldName: 'recertTime' },
        { label: 'Taught', fieldName: 'taught', type: 'boolean', cellAttributes: { class: 'slds-text-align_center' } }
    ];
    @track courseOptions = [];
    @track courseData = [];
    @track hasCourseCompetencies = false;
    @track courseDuration = 0;

    // Specialist properties
    @track selectedSpecialistContactId = '';
    @track specialistList = [];
    @track hasSpecialistsAssigned = false;

    // Dropdown options
    @track subOrganizationOptions = [
        { label: 'Main Organization', value: 'main' },
        { label: 'Branch Office', value: 'branch' }
    ];
    @track certificationTypeOptions = [
        { label: 'Initial', value: 'Initial' },
        { label: 'Recertification', value: 'Recertification' }
    ];
    @track authorizationOptions = [
        { label: 'Option 1', value: 'Option1' },
        { label: 'Option 2', value: 'Option2' }
    ];
    @track stateOptions = [
        { label: 'Alabama', value: 'AL' },
        { label: 'Alaska', value: 'AK' },
        { label: 'Arizona', value: 'AZ' },
        { label: 'Arkansas', value: 'AR' },
        { label: 'California', value: 'CA' },
        { label: 'Colorado', value: 'CO' },
        { label: 'Connecticut', value: 'CT' },
        { label: 'Delaware', value: 'DE' },
        { label: 'Florida', value: 'FL' },
        { label: 'Georgia', value: 'GA' }
        // Add more states as needed
    ];
    @track finalizedStatusOptions = [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' }
    ];

    // Record picker filter criteria
    primaryFacultyFilterCriteria = {
        criteria: [
            { fieldPath: 'Certification_Contact_Status__c', operator: 'eq', value: 'Trainer - Certified' }
        ]
    };
    secondaryFacultyFilterCriteria = {
        criteria: [
            { fieldPath: 'Certification_Contact_Status__c', operator: 'eq', value: 'Trainer - Certified' }
        ]
    };

    // Wire properties
    wiredTrainingResult;
    pageRef;

    /**
     * Initializes component state on connection.
     */
    connectedCallback() {
        this.isMobileView = formFactorPropertyName === 'Small';
        if (this.recordId) {
            this.trainingId = this.recordId;
        }
    }

    /**
     * Retrieves state parameters from the page reference.
     */
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.pageRef = currentPageReference;
            this.trainingId = currentPageReference.state.trainingId || this.trainingId;
            this.contactId = currentPageReference.state.contactId || this.contactId;

            // Always set edit mode if mode param is 'edit'
            const mode = currentPageReference.state.mode;
            if (mode === 'edit') {
                this.isEditMode = true;
            }

            if(this.trainingId && this.contactId) {
                this.fetchTrainingDetails();
            }
        }
    }

    /**
     * Fetches the current user's contact ID.
     */
    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value || this.contactId;
        } else if (error) {
            this.showErrorToast('Failed to load user contact ID: ' + this.getErrorMessage(error));
        }
    }

    fetchTrainingDetails() {
        this.isLoading = true;
        getTrainingDetails({ trainingId: this.trainingId, conId: this.contactId })
            .then((data) => {
                this.wiredTrainingResult = data;
                if (data) {
                    console.log('Apex response:', JSON.stringify(data));
                    this.processTrainingDetails(data);
                }
                this.isLoading = false;
            })
            .catch((error) => {
                this.showErrorToast('Failed to load training details: ' + this.getErrorMessage(error));
                this.isLoading = false;
            });
    }

    /**
     * Fetches training details from Apex.
     */
    // @wire(getTrainingDetails, { trainingId: '$trainingId', contactId: '$contactId' })
    // wiredTraining({ error, data }) {
    //     this.wiredTrainingResult = data;
    //     if (data) {
    //         this.processTrainingDetails(data);
    //         this.isLoading = false;
    //     } else if (error) {
    //         this.showErrorToast('Failed to load training details: ' + this.getErrorMessage(error));
    //         this.isLoading = false;
    //     }
    // }

    /**
     * Computes whether editing is disabled.
     */
    get editingDisabled() {
        return this.isNotEditable || !this.isEditMode;
    }

    /**
     * Toggles the mobile menu visibility.
     */
    toggleMobileMenu() {
        this.isMobileMenuVisible = !this.isMobileMenuVisible;
        this.mobileMenuIcon = this.isMobileMenuVisible ? 'utility:up' : 'utility:down';
    }

    /**
     * Navigates to the training list page.
     */
    navigateToTrainings() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            }
        });
    }

    /**
     * Enables edit mode if the training is editable.
     */
    editTraining() {
        if (this.isNotEditable) {
            this.showInfoToast('This training cannot be edited.');
            return;
        }
        this.isEditMode = true;
        this.showSuccessToast('Edit mode enabled.');
    }

    /**
     * Handles refinalization of training (placeholder).
     */
    refinalizeTraining() {
        // TODO: Implement refinalize functionality
        this.showInfoToast('Refinalize functionality coming soon.');
    }

    /**
     * Handles downloading certificates (placeholder).
     */
    downloadCertificates() {
        // TODO: Implement download certificates functionality
        this.showInfoToast('Download certificates functionality coming soon.');
    }

    /**
     * Handles emailing certificates (placeholder).
     */
    emailCertificates() {
        // TODO: Implement email certificates functionality
        this.showInfoToast('Email certificates functionality coming soon.');
    }

    /**
     * Submits a correction request case.
     */
    requestCorrection() {
        if (!this.trainingDetails.training?.Name) {
            this.showErrorToast('Training name is missing.');
            return;
        }
        this.isLoading = true;
        createCorrectionCase({
            newTaskComment: 'Correction requested from portal',
            newTaskTraining: JSON.stringify(this.trainingDetails.training),
            caseTrainingNumber: this.trainingDetails.training.Name,
            conId: this.contactId
        })
            .then(() => {
                this.showSuccessToast('Correction request submitted successfully.');
                this.refreshData();
            })
            .catch(error => {
                this.showErrorToast('Failed to submit correction request: ' + this.getErrorMessage(error));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Processes training details from Apex response.
     * @param {Object} data - TrainingDetails object from Apex
     */
    processTrainingDetails(data) {
        this.trainingDetails = data || {};
        this.isNotEditable = data.isNotEditable ?? true;
        // Only reset isEditMode if not coming from navigation with edit mode
        if (!this.isEditMode) {
            this.isEditMode = false;
        }

        // Processing training information
        this.processTrainingInfo(data.training);
        // Processing trainers
        this.processTrainers(data.trainerList);
        // Processing courses and competencies
        this.processCourses(data.trainingCourseList);
        // Processing specialists
        this.processSpecialists(data.specialistList);
    }

    /**
     * Processes training information.
     * @param {Object} training - hed__Course_Offering__c record
     */
    processTrainingInfo(training) {
        if (training) {
            this.selectedSubOrganization = training.Organization__r?.Name ?? '';
            this.selectedCertificationType = training.Certification_Type__c ?? '';
            this.trainingStartDate = training.cc_Course_Start_Date__c ?? '';
            this.trainingEndDate = training.cc_Course_End_Date__c ?? '';
            this.selectedAuthorization = training.Training_Authorization__c ?? '';
            this.trainingLocationAddress = training.Street__c ?? '';
            this.locationCity = training.cc_City__c ?? '';
            this.selectedState = training.cc_State_Province__c ?? '';
            this.locationZipCode = training.cc_Zip_Code__c ?? '';
            this.trainingNotes = training.cc_Training_Description__c ?? '';
            this.finalizedStatus = training.Finalized__c ? 'true' : 'false';
            this.updateFormattedTimes(this.trainingDetails.trainingTime ?? 0, this.calculateMinimumTime(training));
        }
    }

    /**
     * Processes trainer list.
     * @param {Array} trainerList - List of Contact records
     */
    processTrainers(trainerList) {
        if (trainerList?.length) {
            this.primaryFacultyContactId = trainerList[0]?.Id ?? '';
            this.secondaryFacultyContactId = trainerList[1]?.Id ?? '';
        }
    }

    /**
     * Processes course and competency data.
     * @param {Array} trainingCourseList - List of CourseWrapper objects
     */
    processCourses(trainingCourseList) {
        this.courseOptions = (trainingCourseList || []).map(course => ({
            label: course.name ?? '',
            value: course.courseId,
            initialTime: course.competencyList?.reduce((sum, comp) => sum + (comp.Initial_Time__c ?? 0), 0) ?? 0,
            recertTime: course.competencyList?.reduce((sum, comp) => sum + (comp.Recert_Time__c ?? 0), 0) ?? 0,
            taught: course.competencyList?.some(comp => comp.Taught__c) ?? false,
            chapter: course.competencyList?.[0]?.Course_Competency__r?.Chapter__c ?? ''
        }));

        if (trainingCourseList?.length) {
            this.selectedCourseId = trainingCourseList[0].courseId;
            this.setCourseData(trainingCourseList[0].competencyList);
        } else {
            this.hasCourseCompetencies = false;
        }
    }

    /**
     * Sets course data for the datatable.
     * @param {Array} competencies - List of cc_Event_Competency__c records
     */
    setCourseData(competencies) {
        this.courseData = (competencies || []).map(comp => ({
            id: comp.Id,
            name: comp.Name ?? '',
            chapter: comp.Course_Competency__r?.Chapter__c ?? '',
            initialTime: (comp.Initial_Time__c ?? 0).toFixed(2),
            recertTime: (comp.Recert_Time__c ?? 0).toFixed(2),
            taught: comp.Taught__c ?? false
        }));
        this.hasCourseCompetencies = this.courseData.length > 0;
        this.courseDuration = this.courseData.reduce((sum, comp) => sum + (Number(comp.initialTime) || Number(comp.recertTime)), 0).toFixed(2);
    }

    /**
     * Processes specialist list.
     * @param {Array} specialistList - List of SpecialistWrapper objects
     */
    processSpecialists(specialistList) {
        this.specialistList = (specialistList || []).map(specialist => ({
            ...specialist,
            emailLink: specialist.specialistEmail ? `mailto:${specialist.specialistEmail}` : ''
        }));
        this.hasSpecialistsAssigned = this.specialistList.length > 0;
    }

    /**
     * Calculates minimum training time in hours.
     * @param {Object} training - hed__Course_Offering__c record
     * @returns {Number} Minimum time in hours
     */
    calculateMinimumTime(training) {
        if (!training) return 0;
        const minTime = training.Certification_Type__c === 'Initial'
            ? (training.Course_Initial_Training_Time__c ?? 0)
            : (training.Course_Recert_Training_Time__c ?? 0);
        return (minTime / 60).toFixed(2);
    }

    /**
     * Updates formatted actual and minimum training times.
     * @param {Number} actualTime - Actual training time
     * @param {Number} minTime - Minimum training time
     */
    updateFormattedTimes(actualTime, minTime) {
        this.formattedActualTrainingTime = `${actualTime} hours`;
        this.formattedMinimumTrainingTime = `${minTime} hours`;
    }

    /**
     * Handles sub-organization change.
     */
    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
    }

    /**
     * Handles certification type change.
     */
    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        this.updateFormattedTimes(
            this.trainingDetails.trainingTime ?? 0,
            this.calculateMinimumTime(this.trainingDetails.training)
        );
    }

    /**
     * Handles training start date change.
     */
    updateStartDate(event) {
        this.trainingStartDate = event.detail.value;
    }

    /**
     * Handles training end date change.
     */
    updateEndDate(event) {
        this.trainingEndDate = event.detail.value;
    }

    /**
     * Handles authorization change.
     */
    updateAuthorization(event) {
        this.selectedAuthorization = event.detail.value;
    }

    /**
     * Handles location address change.
     */
    updateLocationAddress(event) {
        this.trainingLocationAddress = event.detail.value;
    }

    /**
     * Handles city change.
     */
    updateCity(event) {
        this.locationCity = event.detail.value;
    }

    /**
     * Handles state change.
     */
    updateState(event) {
        this.selectedState = event.detail.value;
    }

    /**
     * Handles zip code change.
     */
    updateZipCode(event) {
        this.locationZipCode = event.detail.value;
    }

    /**
     * Handles training notes change.
     */
    updateTrainingNotes(event) {
        this.trainingNotes = event.detail.value;
    }

    /**
     * Handles finalized status change.
     */
    updateFinalizedStatus(event) {
        this.finalizedStatus = event.detail.value;
    }

    /**
     * Handles primary faculty change.
     */
    updatePrimaryFaculty(event) {
        this.primaryFacultyContactId = event.detail.value;
    }

    /**
     * Handles secondary faculty change.
     */
    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
    }

    /**
     * Handles course selection change.
     */
    updateCourseSelection(event) {
        this.selectedCourseId = event.detail.value;
        const selectedCourse = this.trainingDetails.trainingCourseList?.find(course => course.courseId === this.selectedCourseId);
        if (selectedCourse) {
            this.setCourseData(selectedCourse.competencyList);
        }
    }

    /**
     * Handles course duration change.
     */
    updateCourseDuration(event) {
        this.courseDuration = event.detail.value;
    }

    /**
     * Handles specialist selection (placeholder).
     */
    updateSpecialistSelection(event) {
        const value = event.detail.value;
        if (value) {
            // TODO: Implement actual specialist addition via Apex
            this.specialistList.push({
                conId: value,
                name: 'New Specialist',
                specialistEmail: '',
                grade: 'Pending',
                restrictions: '',
                accountId: this.trainingDetails.training?.Organization__c,
                isEmailBounced: false,
                emailLink: ''
            });
            this.hasSpecialistsAssigned = true;
            this.selectedSpecialistContactId = '';
            this.showSuccessToast('Specialist added (simulation).');
        }
    }

    /**
     * Handles adding a new specialist (placeholder).
     */
    addNewSpecialist() {
        // TODO: Implement add new specialist functionality
        this.showInfoToast('Add new specialist functionality coming soon.');
    }

    /**
     * Removes a specialist from the list (simulation).
     */
    removeSpecialist(event) {
        const specialistId = event.currentTarget.dataset.specialistId;
        this.specialistList = this.specialistList.filter(spec => spec.conId !== specialistId);
        this.hasSpecialistsAssigned = this.specialistList.length > 0;
        this.showSuccessToast('Specialist removed (simulation).');
    }

    /**
     * Saves training details (placeholder).
     */
    saveTraining() {
        // TODO: Implement actual save functionality via Apex
        this.isLoading = true;
        const trainingDataToSave = {
            Id: this.trainingId,
            Organization__c: this.selectedSubOrganization,
            Certification_Type__c: this.selectedCertificationType,
            cc_Course_Start_Date__c: this.trainingStartDate,
            cc_Course_End_Date__c: this.trainingEndDate,
            Training_Authorization__c: this.selectedAuthorization,
            Street__c: this.trainingLocationAddress,
            cc_City__c: this.locationCity,
            cc_State_Province__c: this.selectedState,
            cc_Zip_Code__c: this.locationZipCode,
            cc_Training_Description__c: this.trainingNotes,
            Finalized__c: this.finalizedStatus === 'true',
            hed__Faculty__c: this.primaryFacultyContactId,
            cc_Secondary_Faculty__c: this.secondaryFacultyContactId
        };
        setTimeout(() => {
            this.isLoading = false;
            this.showSuccessToast('Training details saved successfully (simulation).');
            this.isEditMode = false;
            this.refreshData();
        }, 1000);
    }

    /**
     * Navigates to the training grading page.
     */
    gradeAndFinalize() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Training_Grading__c'
            },
            state: {
                trainingId: this.trainingId,
                contactId: this.contactId
            }
        });
    }

    /**
     * Refreshes training data from Apex.
     */
    refreshData() {
        this.isLoading = true;
        return refreshApex(this.wiredTrainingResult)
            .then(() => {
                this.isLoading = false;
            })
            .catch(error => {
                this.showErrorToast('Failed to refresh data: ' + this.getErrorMessage(error));
                this.isLoading = false;
            });
    }

    /**
     * Extracts error message from Apex or LWC errors.
     * @param {Object} error - Error object
     * @returns {String} Formatted error message
     */
    getErrorMessage(error) {
        return error.body?.message || error.message || 'Unknown error';
    }

    /**
     * Displays a success toast message.
     * @param {String} message - Message to display
     */
    showSuccessToast(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message,
            variant: 'success'
        }));
    }

    /**
     * Displays an error toast message.
     * @param {String} message - Message to display
     */
    showErrorToast(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message,
            variant: 'error'
        }));
    }

    /**
     * Displays an info toast message.
     * @param {String} message - Message to display
     */
    showInfoToast(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Info',
            message,
            variant: 'info'
        }));
    }
}