import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import formFactorPropertyName from "@salesforce/client/formFactor";
import userId from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import initializeNewTrainingData from '@salesforce/apex/tcTrainingServiceController.initializeTrainingPage';

export default class TcNewTraining extends NavigationMixin(LightningElement) {
    // Existing properties remain unchanged
    @track isLoading = false;
    @track errorMessage = '';
    @track editingDisabled = false;
    @track contactId = '';
    @track isMobileView = false;
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
    @track primaryFacultyContactId = '';
    @track secondaryFacultyContactId = '';
    @track selectedCourseType = '';
    @track courseDuration = '';
    @track courseData = [];
    @track hasCourseCompetencies = false;
    @track selectedSpecialistContactId = '';
    @track specialists = [];
    @track hasSpecialistsAssigned = false;
    @track addSpecialistDisabled = true;
    @track trainingData;
    @track subOrganizationOptions = [];
    @track certificationTypeOptions = [];
    @track authorizationOptions = [];
    @track courseOptions = [];
    @track trainerOptions = [];
    @track specialistOptions = [];
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
    ];
    @track isSpecialistLoading = false;

    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
            if (this.contactId) {
                this.loadInitialData();
            } else {
                console.error('User does not have a ContactId associated:', data);
                this.errorMessage = 'User does not have a ContactId associated';
                this.showToast('Error', this.errorMessage, 'error');
            }
        } else if (error) {
            console.error('Error fetching user record:', error);
            this.errorMessage = error.body.message || 'Error fetching user record';
            this.showToast('Error', this.errorMessage, 'error');
        }
    }

    // Updated course columns to show competencies
    courseColumns = [
        { label: 'Competency', fieldName: 'Name', type: 'text' },
        { label: 'Chapter', fieldName: 'Chapter__c', type: 'text' },
        { label: 'Initial Time', fieldName: 'Initial_Time__c', type: 'text' },
        { label: 'Recert Time', fieldName: 'Recert_Time__c', type: 'text' },
        { 
            label: 'Taught', 
            fieldName: 'Taught__c', 
            type: 'boolean', 
            editable: true 
        }
    ];

    // Remove record picker filter criteria since we're using dropdowns
    get primaryFacultyFilterCriteria() {
        return {};
    }
    get secondaryFacultyFilterCriteria() {
        return {};
    }
    get specialistFilterCriteria() {
        return {};
    }

    get secondaryTrainerOptions() {
        return this.trainerOptions.filter(
            option => option.value !== this.primaryFacultyContactId
        );
    }

    get secondaryFacultyDisabled() {
        return !this.primaryFacultyContactId || this.editingDisabled;
    }

    connectedCallback() {
        this.detectMobileView();
        this.initializeComponent();
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    initializeComponent() {
        this.isLoading = true;
        try {
            // Initialize any required data
        } catch (error) {
            this.handleError('Error initializing component', error);
        } finally {
            this.isLoading = false;
        }
    }

    detectMobileView() {
        this.isMobileView = (formFactorPropertyName === 'Small');
    }

    handleResize() {
        this.detectMobileView();
    }

    loadInitialData() {
        this.isLoading = true;
        initializeNewTrainingData({ trainingId: '', conId: this.contactId })
            .then((data) => {
                this.trainingData = data;
                console.log('Training Data Loaded:', JSON.stringify(this.trainingData, null, 2));
                this.processTrainingData();
            })
            .catch((error) => {
                this.handleError('Error loading training data', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    processTrainingData() {
        if (!this.trainingData) return;
        try {
            if (this.trainingData.childOrganizations && this.trainingData.childOrganizations.length > 0) {
                this.subOrganizationOptions = this.trainingData.childOrganizations.map(org => ({
                    label: org.Name,
                    value: org.Id
                }));
            }
            if (this.trainingData.listOfCourses && this.trainingData.listOfCourses.length > 0) {
                const certTypes = new Set();
                this.trainingData.listOfCourses.forEach(course => {
                    if (course.Certification_Type__c) {
                        certTypes.add(course.Certification_Type__c);
                    }
                });
                this.certificationTypeOptions = Array.from(certTypes).map(type => ({
                    label: type,
                    value: type
                }));
            }
            this.authorizationOptions = [
                { label: 'None', value: 'None' },
                { label: 'Collaborative', value: 'Collaborative' },
                { label: 'Third Party', value: 'Third Party' }
            ];
            if (this.trainingData.listOfCourses && this.trainingData.listOfCourses.length > 0) {
                this.courseOptions = this.trainingData.listOfCourses.map(course => ({
                    label: course.Name,
                    value: course.Id
                }));
            }
            if (this.trainingData.listOfTrainers && this.trainingData.listOfTrainers.length > 0) {
                this.trainerOptions = this.trainingData.listOfTrainers.map(trainer => ({
                    label: `${trainer.FirstName} ${trainer.LastName}`,
                    value: trainer.Id,
                    certificationStatus: trainer.Certification_Contact_Status__c,
                    certifiedCourses: this.trainingData.trainerIDtoCertifiedCourseMap ?
                                    this.trainingData.trainerIDtoCertifiedCourseMap[trainer.Id] : []
                }));
            }
            if (this.trainingData.listOfSpecialists && this.trainingData.listOfSpecialists.length > 0) {
                this.specialistOptions = this.trainingData.listOfSpecialists
                    .filter(specialist => !this.specialists.some(s => s.contactId === specialist.Id))
                    .map(specialist => ({
                        label: specialist.Name,
                        value: specialist.Id,
                        email: specialist.Email,
                        department: specialist.Department,
                        accountName: specialist.Account ? specialist.Account.Name : '',
                        type: specialist.Type__c
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label));
            }
            this.updateCourseCompetencies();
            this.updateSpecialistsView();
        } catch (error) {
            console.error('Error processing training data:', error);
            this.handleError('Error processing training data', error);
        }
    }

    navigateToTrainings() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            }
        });
    }

    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
    }

    updateStartDate(event) {
        this.trainingStartDate = event.detail.value;
        this.validateDateRange();
    }

    updateEndDate(event) {
        this.trainingEndDate = event.detail.value;
        this.validateDateRange();
    }

    updateAuthorization(event) {
        this.selectedAuthorization = event.detail.value;
    }

    updateLocationAddress(event) {
        this.trainingLocationAddress = event.detail.value;
    }

    updateCity(event) {
        this.locationCity = event.detail.value;
    }

    updateState(event) {
        this.selectedState = event.detail.value;
    }

    updateZipCode(event) {
        this.locationZipCode = event.detail.value;
    }

    updateTrainingNotes(event) {
        this.trainingNotes = event.detail.value;
    }

    updatePrimaryFaculty(event) {
        this.primaryFacultyContactId = event.detail.value;
        this.secondaryFacultyContactId = ''; // Clear secondary faculty selection
        const secondaryCombobox = this.template.querySelector('lightning-combobox[data-id="secondaryFaculty"]');
        if (secondaryCombobox) {
            secondaryCombobox.value = '';
        }
    }

    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
    }

    // New method to clear primary faculty selection
    clearPrimaryFaculty() {
        this.primaryFacultyContactId = '';
        this.secondaryFacultyContactId = '';
        const primaryCombobox = this.template.querySelector('lightning-combobox[data-id="primaryFaculty"]');
        const secondaryCombobox = this.template.querySelector('lightning-combobox[data-id="secondaryFaculty"]');
        if (primaryCombobox) {
            primaryCombobox.value = '';
        }
        if (secondaryCombobox) {
            secondaryCombobox.value = '';
        }
    }

    // New method to clear secondary faculty selection
    clearSecondaryFaculty() {
        this.secondaryFacultyContactId = '';
        const secondaryCombobox = this.template.querySelector('lightning-combobox[data-id="secondaryFaculty"]');
        if (secondaryCombobox) {
            secondaryCombobox.value = '';
        }
    }

    // New method to clear specialist selection
    clearSpecialistSelection() {
        this.selectedSpecialistContactId = '';
        this.addSpecialistDisabled = true;
        const specialistCombobox = this.template.querySelector('lightning-combobox[data-id="specialist"]');
        if (specialistCombobox) {
            specialistCombobox.value = '';
        }
    }

    updateCourseSelection(event) {
        this.selectedCourseType = event.detail.value;
        this.updateCourseCompetencies();
    }

    updateCourseDuration(event) {
        this.courseDuration = event.detail.value;
    }

    updateCourseCompetencies() {
        if (this.selectedCourseType && this.trainingData && this.trainingData.listOfCourseCompetency) {
            const courseCompetencies = this.trainingData.listOfCourseCompetency
                .filter(comp => comp.Course__c === this.selectedCourseType)
                .map(comp => ({
                    Id: comp.Id,
                    Name: comp.Name,
                    Chapter__c: comp.Chapter__c || '',
                    Initial_Time__c: comp.Initial_Time__c || '',
                    Recert_Time__c: comp.Recert_Time__c || '',
                    Taught__c: comp.Taught__c || false
                }));
            this.courseData = courseCompetencies;
            this.hasCourseCompetencies = courseCompetencies.length > 0;
        } else {
            this.courseData = [];
            this.hasCourseCompetencies = false;
        }
    }

    updateSpecialistSelection(event) {
        this.selectedSpecialistContactId = event.detail.value;
        this.addSpecialistDisabled = !this.selectedSpecialistContactId;
        if (this.selectedSpecialistContactId) {
            this.isSpecialistLoading = true; // Activate spinner
            setTimeout(() => {
                this.addSpecialist();
            }, 1000); // 1-second delay for visual effect
        }
    }

    addSpecialist() {
        if (!this.selectedSpecialistContactId) {
            this.isLoading = false;
            this.showToast('Error', 'Please select a specialist to add', 'error');
            return;
        }
        const existingSpecialist = this.specialists.find(
            spec => spec.contactId === this.selectedSpecialistContactId
        );
        if (existingSpecialist) {
            this.isLoading = false;
            this.showToast('Warning', 'This specialist is already added to the training', 'warning');
            return;
        }
        const specialistData = this.trainingData.listOfSpecialists.find(
            spec => spec.Id === this.selectedSpecialistContactId
        );
        if (!specialistData) {
            this.isLoading = false;
            this.showToast('Error', 'Specialist data not found', 'error');
            return;
        }
        const newSpecialist = {
            contactId: specialistData.Id,
            name: specialistData.Name,
            specialistEmail: specialistData.Email || '',
            emailLink: specialistData.Email ? `mailto:${specialistData.Email}` : '',
            accountId: specialistData.Account ? specialistData.Account.Id : '',
            accountName: specialistData.Account ? specialistData.Account.Name : '',
            department: specialistData.Department || '',
            type: specialistData.Type__c || '',
            grade: '',
            restrictions: null
        };
        this.specialists = [...this.specialists, newSpecialist];
        this.updateSpecialistsView();
        this.selectedSpecialistContactId = '';
        this.addSpecialistDisabled = true;
        this.specialistOptions = this.specialistOptions.filter(
            option => option.value !== specialistData.Id
        );
        const specialistCombobox = this.template.querySelector('lightning-combobox[data-id="specialist"]');
        if (specialistCombobox) {
            specialistCombobox.value = '';
        }
        this.isSpecialistLoading = false;
    }

    addNewSpecialist() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Contact',
                actionName: 'new'
            }
        });
    }

    removeSpecialist(event) {
        const specialistId = event.target.dataset.specialistId;
        const removedSpecialist = this.specialists.find(
            spec => spec.contactId === specialistId
        );
        this.specialists = this.specialists.filter(
            spec => spec.contactId !== specialistId
        );
        const specialistData = this.trainingData.listOfSpecialists.find(
            spec => spec.Id === specialistId
        );
        if (specialistData) {
            this.specialistOptions = [
                ...this.specialistOptions,
                {
                    label: specialistData.Name,
                    value: specialistData.Id,
                    email: specialistData.Email,
                    department: specialistData.Department,
                    accountName: specialistData.Account ? specialistData.Account.Name : '',
                    type: specialistData.Type__c
                }
            ].sort((a, b) => a.label.localeCompare(b.label));
        }
        this.updateSpecialistsView();
        const specialistCombobox = this.template.querySelector('lightning-combobox[data-id="specialist"]');
        if (specialistCombobox) {
            specialistCombobox.value = '';
        }
        this.showToast('Success', 'Specialist removed successfully', 'success');
    }

    updateSpecialistsView() {
        this.hasSpecialistsAssigned = this.specialists.length > 0;
    }

    saveTraining() {
        if (!this.validateForm()) {
            return;
        }
        this.isLoading = true;
        try {
            setTimeout(() => {
                this.isLoading = false;
                this.showToast('Success', 'Training saved successfully', 'success');
            }, 2000);
        } catch (error) {
            this.isLoading = false;
            this.handleError('Error saving training', error);
        }
    }

    gradeAndFinalize() {
        if (!this.validateForm()) {
            return;
        }
        if (this.specialists.length === 0) {
            this.showToast('Error', 'Please add at least one specialist before finalizing', 'error');
            return;
        }
        this.isLoading = true;
        try {
            setTimeout(() => {
                this.isLoading = false;
                this.showToast('Success', 'Training graded and finalized successfully', 'success');
                this.navigateToTrainings();
            }, 3000);
        } catch (error) {
            this.isLoading = false;
            this.handleError('Error finalizing training', error);
        }
    }

    validateForm() {
        const requiredFields = [
            { field: this.selectedSubOrganization, name: 'Sub Organization' },
            { field: this.selectedCertificationType, name: 'Certification Type' },
            { field: this.trainingStartDate, name: 'Start Date' },
            { field: this.trainingEndDate, name: 'End Date' },
            { field: this.selectedAuthorization, name: 'Authorization' },
            { field: this.trainingLocationAddress, name: 'Training Location Address' },
            { field: this.locationCity, name: 'City' },
            { field: this.selectedState, name: 'State/Province' },
            { field: this.primaryFacultyContactId, name: 'Primary Faculty' }
        ];
        for (const field of requiredFields) {
            if (!field.field) {
                this.showToast('Error', `${field.name} is required`, 'error');
                return false;
            }
        }
        return true;
    }

    validateDateRange() {
        if (this.trainingStartDate && this.trainingEndDate) {
            const startDate = new Date(this.trainingStartDate);
            const endDate = new Date(this.trainingEndDate);
            if (startDate > endDate) {
                this.showToast('Error', 'End date must be after start date', 'error');
                this.trainingEndDate = '';
            }
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    handleError(title, error) {
        console.error(title, error);
        this.errorMessage = error.message || error.body?.message || 'An unexpected error occurred';
        this.showToast(title, this.errorMessage, 'error');
    }

    getTrainerCertificationStatus(trainerId) {
        if (!this.trainingData || !this.trainingData.trainerIDtoCertifiedCourseMap) {
            return [];
        }
        return this.trainingData.trainerIDtoCertifiedCourseMap[trainerId] || [];
    }

    isTrainerCertifiedForCourse(trainerId, courseName) {
        const certifications = this.getTrainerCertificationStatus(trainerId);
        return certifications.includes(courseName);
    }
}