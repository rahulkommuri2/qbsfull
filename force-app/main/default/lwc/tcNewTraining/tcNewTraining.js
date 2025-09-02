import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import formFactorPropertyName from '@salesforce/client/formFactor';
import userId from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import initializeTrainingData from '@salesforce/apex/tcTrainingController.initializeTrainingData';
import createSpecialist from '@salesforce/apex/tcTrainingController.createSpecialist';
import saveTraining from '@salesforce/apex/tcTrainingController.saveTraining';
import getStatePicklistValues from '@salesforce/apex/tcTrainingController.getPicklistValues';

export default class TcNewTraining extends NavigationMixin(LightningElement) {
    @track isLoading = false;
    @track errorMessage = '';
    @track hasError = false;
    @track editingDisabled = false;
    @track contactId = '';
    @track isMobileView = formFactorPropertyName === 'Small';
    @track parentOrgName = '';
    @track selectedSubOrganization = '';
    @track selectedCertificationType = '';
    @track trainingStartDate = new Date().toISOString().split('T')[0];
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
    @track courseActualDurationHours = '0';
    @track courseActualDurationMinutes = '0';
    @track courseMinimumDuration = '';
    @track courseData = [];
    @track hasCourseCompetencies = false;
    @track taughtAllChecked = true;
    @track selectedSpecialistContactId = '';
    @track specialists = [];
    @track hasSpecialistsAssigned = false;
    @track isSpecialistLoading = false;
    @track trainingData = {};
    @track isModalOpen = false;
    @track newSpecialistFirstName = '';
    @track newSpecialistLastName = '';
    @track newSpecialistEmail = '';
    @track newSpecialistDepartment = '';
    @track newSpecialistOrgId = '';
    @track subOrganizationOptions = [];
    @track certificationTypeOptions = [];
    @track authorizationOptions = [];
    @track courseOptions = [];
    @track trainerOptions = [];
    @track secondaryTrainerOptions = [];
    @track specialistOptions = [];
    @track stateOptions = [];
    @track durationMinuteOptions = [
        { label: '0 Minutes', value: '0' },
        { label: '5 Minutes', value: '5' },
        { label: '10 Minutes', value: '10' },
        { label: '15 Minutes', value: '15' },
        { label: '20 Minutes', value: '20' },
        { label: '25 Minutes', value: '25' },
        { label: '30 Minutes', value: '30' },
        { label: '35 Minutes', value: '35' },
        { label: '40 Minutes', value: '40' },
        { label: '45 Minutes', value: '45' },
        { label: '50 Minutes', value: '50' },
        { label: '55 Minutes', value: '55' }
    ];
    @track durationHourOptions = [
        { label: '0 Hours', value: '0' },
        { label: '1 Hour', value: '1' },
        { label: '2 Hours', value: '2' },
        { label: '3 Hours', value: '3' },
        { label: '4 Hours', value: '4' },
        { label: '5 Hours', value: '5' },
        { label: '6 Hours', value: '6' },
        { label: '7 Hours', value: '7' },
        { label: '8 Hours', value: '8' },
        { label: '9 Hours', value: '9' },
        { label: '10 Hours', value: '10' },
        { label: '11 Hours', value: '11' },
        { label: '12 Hours', value: '12' },
        { label: '13 Hours', value: '13' },
        { label: '14 Hours', value: '14' },
        { label: '15 Hours', value: '15' },
        { label: '16 Hours', value: '16' },
        { label: '17 Hours', value: '17' },
        { label: '18 Hours', value: '18' },
        { label: '19 Hours', value: '19' },
        { label: '20 Hours', value: '20' },
        { label: '21 Hours', value: '21' },
        { label: '22 Hours', value: '22' },
        { label: '23 Hours', value: '23' },
        { label: '24 Hours', value: '24' }
    ];

    // Getters
    get specialistComboboxDisabled() {
        return this.editingDisabled || this.isSpecialistLoading || !this.specialistOptions.length;
    }

    get secondaryFacultyDisabled() {
        return !this.primaryFacultyContactId || this.editingDisabled;
    }

    get actualTimeLabel() {
        return this.selectedCertificationType === 'Initial' ? 'Actual Initial Training Time' : 'Actual Recert Training Time';
    }

    get today() {
        return new Date().toISOString().split('T')[0];
    }

    get courseActualDuration() {
        const hours = parseInt(this.courseActualDurationHours) || 0;
        const minutes = parseInt(this.courseActualDurationMinutes) || 0;
        return (hours * 60) + minutes; // Return total minutes for Apex
    }

    // Wire service to fetch user contact ID
    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
            if (this.contactId) {
                this.loadInitialData();
                this.loadFormState(); // Load saved state on initialization
            } else {
                this.handleError('User does not have a ContactId associated', new Error('ContactId missing'));
                this.hasError = true;
            }
        } else if (error) {
            this.handleError('Error fetching user record', error);
            this.hasError = true;
        }
    }

    // Lifecycle hooks
    connectedCallback() {
        window.addEventListener('resize', this.handleResize.bind(this));
        this.fetchPicklistValues();
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    // State Management
    saveFormState() {
        const formState = {
            selectedSubOrganization: this.selectedSubOrganization,
            selectedCertificationType: this.selectedCertificationType,
            trainingStartDate: this.trainingStartDate,
            trainingEndDate: this.trainingEndDate,
            selectedAuthorization: this.selectedAuthorization,
            trainingLocationAddress: this.trainingLocationAddress,
            locationCity: this.locationCity,
            selectedState: this.selectedState,
            locationZipCode: this.locationZipCode,
            trainingNotes: this.trainingNotes,
            primaryFacultyContactId: this.primaryFacultyContactId,
            secondaryFacultyContactId: this.secondaryFacultyContactId,
            selectedCourseType: this.selectedCourseType,
            courseActualDurationHours: this.courseActualDurationHours,
            courseActualDurationMinutes: this.courseActualDurationMinutes,
            courseData: this.courseData,
            taughtAllChecked: this.taughtAllChecked,
            specialists: this.specialists
        };
        sessionStorage.setItem('tcNewTrainingFormState', JSON.stringify(formState));
    }

    loadFormState() {
        const savedState = sessionStorage.getItem('tcNewTrainingFormState');
        if (savedState) {
            const formState = JSON.parse(savedState);
            Object.assign(this, formState);
            this.updateSpecialistsView();
            this.updateSpecialistOptions();
            this.updateCourseCompetencies();
            this.calculateMinimumDuration();
        }
    }

    clearFormState() {
        sessionStorage.removeItem('tcNewTrainingFormState');
    }

    handleResize() {
        this.isMobileView = window.innerWidth < 768;
    }

    async fetchPicklistValues() {
        try {
            const [stateResults, certResults, authResults] = await Promise.all([
                getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'cc_State_Province__c' }),
                getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'Certification_Type__c' }),
                getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'Training_Authorization__c' })
            ]);
            this.stateOptions = [
                { label: 'Select State/Province', value: '' },
                ...stateResults.map(val => ({ label: val, value: val }))
            ];
            this.certificationTypeOptions = [
                { label: 'Select Certification Type', value: '' },
                ...certResults.map(val => ({ label: val, value: val }))
            ];
            this.authorizationOptions = [
                { label: 'Select Authorization', value: '' },
                ...authResults.map(val => ({ label: val, value: val }))
            ];
        } catch (error) {
            console.error('Error fetching picklist values:', error);
            this.handleError('Error loading form options', error);
        }
    }

    loadInitialData() {
        this.isLoading = true;
        initializeTrainingData({ trainingId: '', contactId: this.contactId })
            .then(result => {
                this.trainingData = result;
                this.processTrainingData();
            })
            .catch(error => {
                this.handleError('Error loading training data', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    processTrainingData() {
        if (!this.trainingData) return;
        try {
            this.parentOrgName = this.trainingData.organizationName || '';
            this.subOrganizationOptions = [
                { label: this.trainingData.organizationName, value: this.trainingData.organizationId },
                ...(this.trainingData.childOrganizations || []).map(org => ({
                    label: org.Name,
                    value: org.Id
                }))
            ];
            this.selectedSubOrganization = this.trainingData.organizationId || '';
            this.courseOptions = [
                { label: 'Select Course', value: '' },
                ...(this.trainingData.courses || []).map(course => ({
                    label: course.Name,
                    value: course.Id
                }))
            ];
            this.trainerOptions = [
                { label: 'Select Primary Faculty', value: '' },
                ...(this.trainingData.trainers || []).map(trainer => ({
                    label: trainer.Name,
                    value: trainer.Id
                }))
            ];
            this.updateSecondaryTrainerOptions();
            this.updateSpecialistOptions();
            this.editingDisabled = !(this.trainingData.viewTrainers && this.trainingData.viewSpecialist);
            this.updateCourseCompetencies();
            this.saveFormState(); // Save state after processing
        } catch (error) {
            this.handleError('Error processing training data', error);
        }
    }

    updateSecondaryTrainerOptions() {
        this.secondaryTrainerOptions = [
            { label: 'Select Secondary Faculty', value: '' },
            ...(this.trainingData.trainers || [])
                .filter(trainer => trainer.Id !== this.primaryFacultyContactId)
                .map(trainer => ({
                    label: trainer.Name,
                    value: trainer.Id
                }))
        ];
        this.saveFormState();
    }

    updateSpecialistOptions() {
        const assignedSpecialistIds = this.specialists.map(s => s.contactId);
        this.specialistOptions = [
            { label: 'Search for a Specialist', value: '' },
            ...(this.trainingData.specialists || [])
                .filter(specialist => !assignedSpecialistIds.includes(specialist.Id))
                .map(specialist => ({
                    label: `${specialist.Name} - ${specialist.Account?.Name || ''}`,
                    value: specialist.Id
                }))
                .sort((a, b) => a.label.localeCompare(b.label))
        ];
        this.saveFormState();
    }

    navigateToTrainings() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            },
            state: {
                contactId: this.contactId
            }
        });
    }

    // Event Handlers
    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
        this.newSpecialistOrgId = this.selectedSubOrganization;
        this.saveFormState();
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        this.selectedCourseType = '';
        this.courseActualDurationHours = '0';
        this.courseActualDurationMinutes = '0';
        this.updateCourseCompetencies();
        this.saveFormState();
    }

    updateStartDate(event) {
        this.trainingStartDate = event.detail.value;
        this.validateDateRange();
        this.saveFormState();
    }

    updateEndDate(event) {
        this.trainingEndDate = event.detail.value;
        this.validateDateRange();
        this.saveFormState();
    }

    updateAuthorization(event) {
        this.selectedAuthorization = event.detail.value;
        this.saveFormState();
    }

    updateLocationAddress(event) {
        this.trainingLocationAddress = event.detail.value;
        this.saveFormState();
    }

    updateCity(event) {
        this.locationCity = event.detail.value;
        this.saveFormState();
    }

    updateState(event) {
        this.selectedState = event.detail.value;
        this.saveFormState();
    }

    updateZipCode(event) {
        this.locationZipCode = event.detail.value;
        this.saveFormState();
    }

    updateTrainingNotes(event) {
        this.trainingNotes = event.detail.value;
        this.saveFormState();
    }

    updatePrimaryFaculty(event) {
        this.primaryFacultyContactId = event.detail.value;
        this.secondaryFacultyContactId = '';
        this.updateSecondaryTrainerOptions();
        this.saveFormState();
    }

    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
        this.saveFormState();
    }

    updateCourseSelection(event) {
        this.selectedCourseType = event.detail.value;
        this.courseActualDurationHours = '0';
        this.courseActualDurationMinutes = '0';
        this.updateCourseCompetencies();
        this.saveFormState();
    }

    updateCourseDuration(event) {
        const target = event.target;
        const label = target.label;

        if (label === 'Actual Training Time Hours') {
            this.courseActualDurationHours = event.detail.value;
        } else if (label === 'Minutes') {
            this.courseActualDurationMinutes = event.detail.value;
        }

        this.calculateMinimumDuration();
        this.saveFormState();
    }

    handleToggleChange(event) {
        const competencyId = event.target.dataset.id;
        const isChecked = event.target.checked;

        this.courseData = this.courseData.map(comp => {
            if (comp.id === competencyId) {
                return { ...comp, taught: isChecked };
            }
            return comp;
        });

        this.taughtAllChecked = this.courseData.every(comp => comp.taught);
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    handleTaughtCompetenciesChange(event) {
        const isChecked = event.target.checked;
        this.taughtAllChecked = isChecked;

        this.courseData = this.courseData.map(comp => ({
            ...comp,
            taught: isChecked
        }));

        this.calculateMinimumDuration();
        this.saveFormState();
    }

    updateCourseCompetencies() {
        if (this.selectedCourseType && this.trainingData?.courseCompetencies) {
            this.courseData = this.trainingData.courseCompetencies
                .filter(comp => comp.Course__c === this.selectedCourseType)
                .map((comp, index) => ({
                    id: comp.Id,
                    name: comp.Name,
                    chapter: comp.Chapter__c || '',
                    initialTime: this.formatTime(comp.Initial_Time__c),
                    recertTime: this.formatTime(comp.Recert_Time__c),
                    initialMinutes: comp.Initial_Time__c || 0,
                    recertMinutes: comp.Recert_Time__c || 0,
                    taught: true // Default to taught
                }))
                .sort((a, b) => {
                    const aChapter = this.trainingData.courseCompetencies.find(c => c.Id === a.id)?.Chapter_Number__c || 0;
                    const bChapter = this.trainingData.courseCompetencies.find(c => c.Id === b.id)?.Chapter_Number__c || 0;
                    return aChapter - bChapter;
                });
            this.hasCourseCompetencies = this.courseData.length > 0;
            this.taughtAllChecked = true;
            this.calculateMinimumDuration();
        } else {
            this.courseData = [];
            this.hasCourseCompetencies = false;
            this.courseMinimumDuration = '';
            this.taughtAllChecked = true;
        }
        this.saveFormState();
    }

    calculateMinimumDuration() {
        if (!this.courseData.length) {
            this.courseMinimumDuration = '';
            return;
        }
        const isInitial = this.selectedCertificationType === 'Initial';
        const totalMinutes = this.courseData
            .filter(comp => comp.taught)
            .reduce((sum, comp) => sum + (isInitial ? comp.initialMinutes : comp.recertMinutes), 0);
        this.courseMinimumDuration = this.formatTime(totalMinutes);
    }

    updateSpecialistSelection(event) {
        this.selectedSpecialistContactId = event.detail.value;
        if (this.selectedSpecialistContactId) {
            this.addSpecialist();
        }
        this.saveFormState();
    }

    addSpecialist() {
        if (!this.selectedSpecialistContactId) {
            this.showToast('Error', 'Please select a specialist to add', 'error');
            return;
        }
        const existingSpecialist = this.specialists.find(spec => spec.contactId === this.selectedSpecialistContactId);
        if (existingSpecialist) {
            this.showToast('Warning', 'This specialist is already added to the training', 'warning');
            this.clearSpecialistSelection();
            return;
        }
        const specialistData = this.trainingData.specialists.find(spec => spec.Id === this.selectedSpecialistContactId);
        if (!specialistData) {
            this.showToast('Error', 'Specialist data not found', 'error');
            this.clearSpecialistSelection();
            return;
        }
        this.isSpecialistLoading = true;
        try {
            const newSpecialist = {
                contactId: specialistData.Id,
                name: specialistData.Name,
                firstName: specialistData.FirstName || '',
                lastName: specialistData.LastName || '',
                specialistEmail: specialistData.Email || '',
                emailLink: specialistData.Email ? `mailto:${specialistData.Email}` : '',
                accountName: specialistData.Account?.Name || '',
                department: specialistData.Department || '',
                grade: '',
                accountId: specialistData.AccountId
            };
            this.specialists = [...this.specialists, newSpecialist];
            this.updateSpecialistsView();
            this.updateSpecialistOptions();
            this.clearSpecialistSelection();
            this.showToast('Success', 'Specialist added successfully', 'success');
            this.saveFormState();
        } catch (error) {
            this.handleError('Error adding specialist', error);
        } finally {
            this.isSpecialistLoading = false;
        }
    }

    // Modal handlers
    openSpecialistModal() {
        this.isModalOpen = true;
        this.newSpecialistOrgId = this.selectedSubOrganization;
        this.saveFormState();
    }

    handleCloseModal() {
        this.isModalOpen = false;
        this.resetNewSpecialistForm();
        this.saveFormState();
    }

    resetNewSpecialistForm() {
        this.newSpecialistFirstName = '';
        this.newSpecialistLastName = '';
        this.newSpecialistEmail = '';
        this.newSpecialistDepartment = '';
        this.newSpecialistOrgId = this.selectedSubOrganization;
        this.saveFormState();
    }

    updateNewSpecialistFirstName(event) {
        this.newSpecialistFirstName = event.detail.value;
        this.saveFormState();
    }

    updateNewSpecialistLastName(event) {
        this.newSpecialistLastName = event.detail.value;
        this.saveFormState();
    }

    updateNewSpecialistEmail(event) {
        this.newSpecialistEmail = event.detail.value;
        this.saveFormState();
    }

    updateNewSpecialistDepartment(event) {
        this.newSpecialistDepartment = event.detail.value;
        this.saveFormState();
    }

    updateNewSpecialistOrgId(event) {
        this.newSpecialistOrgId = event.detail.value;
        this.saveFormState();
    }

    async handleAdd() {
        if (!this.validateNewSpecialistForm()) {
            return;
        }
        this.isLoading = true;
        try {
            const result = await createSpecialist({
                accountId: this.newSpecialistOrgId,
                firstName: this.newSpecialistFirstName,
                lastName: this.newSpecialistLastName,
                email: this.newSpecialistEmail,
                department: this.newSpecialistDepartment,
                isValidate: true, // Validate first to check for existing specialist
                contactId: '',
                contactType: 'Specialist'
            });

            if (result.isEmailMatched || result.contacts?.length > 0) {
                const message = result.message === 'message1' ? 'Specialist with this email or name already exists.' : 'Specialist with this name already exists.';
                this.showToast('Warning', message, 'warning');
                this.isLoading = false;
                return;
            }

            // Proceed with creation if validation passes
            const createResult = await createSpecialist({
                accountId: this.newSpecialistOrgId,
                firstName: this.newSpecialistFirstName,
                lastName: this.newSpecialistLastName,
                email: this.newSpecialistEmail,
                department: this.newSpecialistDepartment,
                isValidate: false,
                contactId: '',
                contactType: 'Specialist'
            });

            if (createResult.message === 'success' && createResult.contacts?.[0]) {
                const contact = createResult.contacts[0];
                const orgName = this.subOrganizationOptions.find(opt => opt.value === contact.AccountId)?.label || '';
                const newSpecialist = {
                    contactId: contact.Id,
                    name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
                    firstName: contact.FirstName || '',
                    lastName: contact.LastName || '',
                    specialistEmail: contact.Email || '',
                    emailLink: contact.Email ? `mailto:${contact.Email}` : '',
                    accountName: orgName,
                    department: contact.Department || '',
                    grade: '',
                    accountId: contact.AccountId,
                    isNew: true
                };
                this.specialists = [...this.specialists, newSpecialist];
                this.updateSpecialistsView();
                this.updateSpecialistOptions();
                this.handleCloseModal();
                this.showToast('Success', 'Specialist created and added successfully', 'success');
                await this.loadInitialData(); // Refresh specialist options
                this.saveFormState();
            } else {
                this.showToast('Error', createResult.message || 'Failed to create specialist', 'error');
            }
        } catch (error) {
            this.handleError('Error creating specialist', error);
        } finally {
            this.isLoading = false;
        }
    }

    validateNewSpecialistForm() {
        if (!this.newSpecialistFirstName?.trim()) {
            this.showToast('Error', 'First Name is required', 'error');
            return false;
        }
        if (!this.newSpecialistLastName?.trim()) {
            this.showToast('Error', 'Last Name is required', 'error');
            return false;
        }
        if (!this.newSpecialistOrgId) {
            this.showToast('Error', 'Sub Organization is required', 'error');
            return false;
        }
        if (this.newSpecialistEmail && !this.isValidEmail(this.newSpecialistEmail)) {
            this.showToast('Error', 'Please enter a valid email address', 'error');
            return false;
        }
        return true;
    }

    isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    removeSpecialist(event) {
        const specialistId = event.currentTarget.dataset.specialistId;
        this.specialists = this.specialists.filter(spec => spec.contactId !== specialistId);
        this.updateSpecialistsView();
        this.updateSpecialistOptions();
        this.clearSpecialistSelection();
        this.showToast('Success', 'Specialist removed successfully', 'success');
        this.saveFormState();
    }

    clearSpecialistSelection() {
        this.selectedSpecialistContactId = '';
        const specialistCombobox = this.template.querySelector('lightning-combobox[data-id="specialist"]');
        if (specialistCombobox) {
            specialistCombobox.value = '';
        }
        this.saveFormState();
    }

    updateSpecialistsView() {
        this.hasSpecialistsAssigned = this.specialists.length > 0;
    }

    // Save methods
    async saveTraining(navigateToPageType) {
        if (!this.validateForm()) return;
        this.isLoading = true;
        try {
            const trainingDetails = this.buildTrainingDetails();
            const competenciesWrapper = this.buildCompetenciesWrapper();
            const result = await saveTraining({
                contactId: this.contactId,
                coursesList: this.getSelectedCourses(),
                trainerList: this.getSelectedTrainers(),
                trainingDetails: trainingDetails,
                trainingId: '',
                organizationId: this.selectedSubOrganization,
                trainingType: 'Organization Specialist Training',
                startDate: this.trainingStartDate,
                endDate: this.trainingEndDate,
                selectedCourseIds: this.selectedCourseType ? [this.selectedCourseType] : [],
                selectedTrainersIds: [this.primaryFacultyContactId, this.secondaryFacultyContactId].filter(id => id),
                selectedSpecialistIds: this.specialists.map(spec => spec.contactId),
                competenciesWrapperStr: JSON.stringify(competenciesWrapper),
                isCollaborative: this.selectedAuthorization === 'Collaborative',
                authorizationType: this.selectedAuthorization || 'Standard',
                specialistToBeInserted: this.getSpecialistsForInsert(),
                termId: this.getValidTermId(),
                certificationType: this.selectedCertificationType
            });
            if (this.handleSaveResult(result, navigateToPageType)) {
                this.clearFormState(); // Clear state on successful save
                this.showToast('Success', 'Training saved successfully', 'success');
            }
        } catch (error) {
            this.handleError('Error saving training', error);
        } finally {
            this.isLoading = false;
        }
    }

    handleSaveResult(result, navigateToPageType) {
        if (!result || !Array.isArray(result)) {
            this.showToast('Error', 'Invalid response from server', 'error');
            return false;
        }
        const errors = result.filter(err => err.message && !err.trainingId);
        if (errors.length > 0) {
            errors.forEach(err => this.showToast('Error', err.message, 'error'));
            return false;
        }
        const successResult = result.find(res => res.trainingId);
        if (successResult?.trainingId) {
            this.navigateAfterSave(navigateToPageType, successResult.trainingId);
            return true;
        }
        this.showToast('Error', 'Training saved but no ID returned', 'error');
        return false;
    }

    navigateAfterSave(navigateToPageType, trainingId) {
        if (navigateToPageType === 'gradingPage') {
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                    name: 'Training_Grading__c'
                },
                state: {
                    contactId: this.contactId,
                    trainingId: trainingId
                }
            });
        } else if (navigateToPageType === 'recordPage') {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: trainingId,
                    objectApiName: 'hed__Course_Offering__c',
                    actionName: 'view'
                },
                state: {
                    contactId: this.contactId,
                    trainingId: trainingId
                }
            });
        }
    }

    async gradeAndFinalize() {
        if (!this.validateForm()) return;
        if (!this.specialists.length) {
            this.showToast('Error', 'Please add at least one specialist before finalizing', 'error');
            return;
        }
        await this.saveTraining('gradingPage');
    }

    async handleSaveTraining() {
        await this.saveTraining('recordPage');
    }

    // Validation methods
    validateForm() {
        const requiredFields = [
            { field: this.selectedCertificationType, name: 'Certification Type' },
            { field: this.trainingStartDate, name: 'Start Date' },
            { field: this.trainingEndDate, name: 'End Date' },
            { field: this.selectedCourseType, name: 'Course' }
        ];
        for (const { field, name } of requiredFields) {
            if (!field) {
                this.showToast('Error', `${name} is required`, 'error');
                return false;
            }
        }
        return this.validateDateRange();
    }

    validateDateRange() {
        if (this.trainingStartDate && this.trainingEndDate) {
            const start = new Date(this.trainingStartDate);
            const end = new Date(this.trainingEndDate);
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            if (start > end) {
                this.showToast('Error', 'End date must be on or after start date', 'error');
                return false;
            }

            if (end > today) {
                this.showToast('Error', 'End date cannot be in the future', 'error');
                return false;
            }
        }
        return true;
    }

    // Data building methods
    buildTrainingDetails() {
        const totalMinutes = this.courseActualDuration;
        const trainingDetails = {
            Shipping_City__c: this.locationCity,
            Shipping_State__c: this.selectedState,
            Shipping_Postal_Code__c: this.locationZipCode,
            Street__c: this.trainingLocationAddress,
            cc_Training_Description__c: this.trainingNotes
        };
        if (this.selectedCertificationType === 'Initial') {
            trainingDetails.Course_Initial_Training_Time__c = totalMinutes;
            trainingDetails.Actual_Initial_Training_Time__c = totalMinutes;
        } else {
            trainingDetails.Course_Recert_Training_Time__c = totalMinutes;
            trainingDetails.Actual_Recert_Training_Time__c = totalMinutes;
        }
        return trainingDetails;
    }

    buildCompetenciesWrapper() {
        if (!this.courseData.length) return [];
        return [{
            index: 0,
            isAllCompetencyTaught: this.taughtAllChecked,
            courseId: this.selectedCourseType,
            actualInitialTime: this.selectedCertificationType === 'Initial' ? this.courseActualDuration : 0,
            actualRecertTime: this.selectedCertificationType !== 'Initial' ? this.courseActualDuration : 0,
            competencyIds: this.courseData.map(comp => comp.id),
            trainingCompetencies: this.courseData.map(comp => ({
                Id: null, // New competencies, no ID yet
                Course_Competency__c: comp.id,
                Name: comp.name,
                Chapter_Name__c: comp.chapter,
                Initial_Time__c: comp.initialMinutes,
                Recert_Time__c: comp.recertMinutes,
                Taught__c: comp.taught
            }))
        }];
    }

    getSelectedCourses() {
        if (!this.selectedCourseType) return [];
        const selectedCourse = this.trainingData.courses?.find(course => course.Id === this.selectedCourseType);
        return selectedCourse ? [selectedCourse] : [];
    }

    getSelectedTrainers() {
        const trainers = [];
        if (this.primaryFacultyContactId) {
            const primary = this.trainingData.trainers?.find(trainer => trainer.Id === this.primaryFacultyContactId);
            if (primary) trainers.push(primary);
        }
        if (this.secondaryFacultyContactId) {
            const secondary = this.trainingData.trainers?.find(trainer => trainer.Id === this.secondaryFacultyContactId);
            if (secondary) trainers.push(secondary);
        }
        return trainers;
    }

    getSpecialistsForInsert() {
        return this.specialists
            .filter(spec => spec.isNew)
            .map(spec => ({
                Id: spec.contactId,
                FirstName: spec.firstName,
                LastName: spec.lastName,
                Email: spec.specialistEmail,
                Department: spec.department,
                AccountId: spec.accountId
            }));
    }

    getValidTermId() {
        return this.trainingData.termPlanList?.[0]?.Id || null;
    }

    formatTime(minutes) {
        if (!minutes) return '0h 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    // Utility methods
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(message, error) {
        console.error(message, error);
        this.showToast('Error', `${message}: ${error.message || error}`, 'error');
        this.hasError = true;
    }
}