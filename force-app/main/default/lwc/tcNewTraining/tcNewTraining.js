import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import formFactorPropertyName from '@salesforce/client/formFactor';
import userId from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import ACCOUNT_ID_FIELD from '@salesforce/schema/User.AccountId';
import initializeTrainingData from '@salesforce/apex/tcTrainingController.initializeTrainingData';
import createSpecialist from '@salesforce/apex/tcTrainingController.createSpecialist';
import saveTraining from '@salesforce/apex/tcTrainingController.saveTraining';
import getStatePicklistValues from '@salesforce/apex/tcTrainingController.getPicklistValues';

export default class TcNewTraining extends NavigationMixin(LightningElement) {
    // UI State
    @track isLoading = false;
    @track hasError = false;
    @track errorMessage = '';
    @track editingDisabled = false;
    @track isMobileView = formFactorPropertyName === 'Small';
    @track isModalOpen = false;

    // Form Data
    @track contactId = '';
    @track currentUserAccountId = '';
    @track parentOrgName = '';
    @track parentOrgId = '';
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
    @track courseActualDurationHours = '0';
    @track courseActualDurationMinutes = '0';
    @track courseMinimumDuration = '';
    @track courseData = [];
    @track hasCourseCompetencies = false;
    @track taughtAllChecked = true;
    @track selectedSpecialistContactId = '';
    @track specialists = [];
    @track hasSpecialistsAssigned = false;
    @track newSpecialistFirstName = '';
    @track newSpecialistLastName = '';
    @track newSpecialistEmail = '';
    @track newSpecialistDepartment = '';
    @track newSpecialistOrgId = '';

    // Options for Picklists
    @track subOrganizationOptions = [];
    @track certificationTypeOptions = [];
    @track authorizationOptions = [];
    @track courseOptions = [];
    @track trainerOptions = [];
    @track secondaryTrainerOptions = [];
    @track specialistOptions = [];
    @track stateOptions = [];
    @track durationHourOptions = Array.from({ length: 25 }, (_, i) => ({
        label: `${i} Hour${i !== 1 ? 's' : ''}`,
        value: `${i}`
    }));
    @track durationMinuteOptions = Array.from({ length: 12 }, (_, i) => ({
        label: `${i * 5} Minutes`,
        value: `${i * 5}`
    }));

    // Training Data
    @track trainingData = {};

    // Specialist Filter for Record Picker
    get specialistFilter() {
        return {
            criteria: [
                {
                    fieldPath: 'Id',
                    operator: 'nin',
                    value: this.specialists.map(spec => spec.contactId)
                }
            ]
        };
    }

    // Getters
    get specialistComboboxDisabled() {
        return this.editingDisabled || !this.specialistOptions.length;
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
        return (hours * 60) + minutes;
    }

    // Lifecycle Hooks
    connectedCallback() {
        window.addEventListener('resize', this.handleResize.bind(this));
        this.fetchPicklistValues();
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD, ACCOUNT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
            this.currentUserAccountId = data.fields.AccountId.value;
            if (this.contactId) {
                this.loadInitialData();
                this.loadFormState();
            } else {
                this.handleError('User does not have a ContactId associated', new Error('ContactId missing'));
            }
        } else if (error) {
            this.handleError('Error fetching user record', error);
        }
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
            specialists: this.specialists,
            newSpecialistOrgId: this.newSpecialistOrgId
        };
        sessionStorage.setItem('tcNewTrainingFormState', JSON.stringify(formState));
    }

    loadFormState() {
        const savedState = sessionStorage.getItem('tcNewTrainingFormState');
        if (savedState) {
            const state = JSON.parse(savedState);
            // Only update duration if valid to prevent reset
            if (state.courseActualDurationHours && state.courseActualDurationMinutes) {
                this.courseActualDurationHours = state.courseActualDurationHours;
                this.courseActualDurationMinutes = state.courseActualDurationMinutes;
            }
            Object.assign(this, {
                selectedSubOrganization: state.selectedSubOrganization,
                selectedCertificationType: state.selectedCertificationType,
                trainingStartDate: state.trainingStartDate,
                trainingEndDate: state.trainingEndDate,
                selectedAuthorization: state.selectedAuthorization,
                trainingLocationAddress: state.trainingLocationAddress,
                locationCity: state.locationCity,
                selectedState: state.selectedState,
                locationZipCode: state.locationZipCode,
                trainingNotes: state.trainingNotes,
                primaryFacultyContactId: state.primaryFacultyContactId,
                secondaryFacultyContactId: state.secondaryFacultyContactId,
                selectedCourseType: state.selectedCourseType,
                courseData: state.courseData,
                taughtAllChecked: state.taughtAllChecked,
                specialists: state.specialists,
                newSpecialistOrgId: state.newSpecialistOrgId
            });
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

    // Data Fetching
    async fetchPicklistValues() {
        try {
            const [stateResults, certResults, authResults] = await Promise.all([
                getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'cc_State_Province__c' }),
                getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'Certification_Type__c' }),
                getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'Training_Authorization__c' })
            ]);
            this.stateOptions = [{ label: 'Select State/Province', value: '' }, ...stateResults.map(val => ({ label: val, value: val }))];
            this.certificationTypeOptions = [
                { label: 'Select Certification Type', value: '' },
                ...certResults.map(val => ({ label: val === 'Initial' ? 'Initial/Mixed' : val, value: val }))
            ];
            this.authorizationOptions = [{ label: 'Select Authorization', value: '' }, ...authResults.map(val => ({ label: val, value: val }))];
        } catch (error) {
            this.handleError('Error loading picklist values', error);
        }
    }

    async loadInitialData() {
        this.isLoading = true;
        try {
            this.trainingData = await initializeTrainingData({ trainingId: '', contactId: this.contactId });
            console.log('Training data loaded:', JSON.stringify(this.trainingData, null, 2));
            this.processTrainingData();
        } catch (error) {
            this.handleError('Error loading training data', error);
        } finally {
            this.isLoading = false;
        }
    }

    processTrainingData() {
        if (!this.trainingData) return;
        try {
            this.parentOrgName = this.trainingData.organizationName || '';
            this.parentOrgId = this.trainingData.organizationId || '';
            this.subOrganizationOptions = [
                { label: 'Select Sub-Organization', value: '' },
                ...(this.trainingData.childOrganizations || []).map(org => ({ label: org.Name, value: org.Id }))
                .filter(org => org.value !== this.currentUserAccountId)
            ];
            this.selectedSubOrganization = '';
            this.courseOptions = [
                { label: 'Select Course', value: '' },
                ...(this.trainingData.courses || []).map(course => ({ label: course.Name, value: course.Id }))
            ];
            this.trainerOptions = [
                { label: 'Select Primary Faculty', value: '' },
                ...(this.trainingData.trainers || []).map(trainer => ({ label: trainer.Name, value: trainer.Id }))
            ];
            this.updateSecondaryTrainerOptions();
            this.updateSpecialistOptions();
            this.editingDisabled = !(this.trainingData.viewTrainers && this.trainingData.viewSpecialist);
            this.updateCourseCompetencies();
            this.saveFormState();
        } catch (error) {
            this.handleError('Error processing training data', error);
        }
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
        // Only reset duration if no valid course is selected
        if (!this.selectedCourseType) {
            this.courseActualDurationHours = '0';
            this.courseActualDurationMinutes = '0';
        }
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
        // Only reset duration if course type changes to empty
        if (!this.selectedCourseType) {
            this.courseActualDurationHours = '0';
            this.courseActualDurationMinutes = '0';
        }
        this.updateCourseCompetencies();
        this.saveFormState();
    }

    updateCourseHourDuration(event) {
        this.courseActualDurationHours = event.detail.value || '0';
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    updateCourseMinutesDuration(event) {
        this.courseActualDurationMinutes = event.detail.value || '0';
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    handleToggleChange(event) {
        const competencyId = event.target.dataset.id;
        const isChecked = event.target.checked;
        this.courseData = this.courseData.map(comp => comp.id === competencyId ? { ...comp, taught: isChecked } : comp);
        this.taughtAllChecked = this.courseData.every(comp => comp.taught);
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    handleTaughtCompetenciesChange(event) {
        this.taughtAllChecked = event.target.checked;
        this.courseData = this.courseData.map(comp => ({ ...comp, taught: this.taughtAllChecked }));
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    handleSearchSpecialistChange(event) {
        this.selectedSpecialistContactId = event.detail.recordId;
        if (this.selectedSpecialistContactId) {
            this.addSpecialist();
        }
        this.saveFormState();
    }

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
        if (!this.validateNewSpecialistForm()) return;
        this.isLoading = true;
        try {
            const result = await createSpecialist({
                accountId: this.newSpecialistOrgId,
                firstName: this.newSpecialistFirstName,
                lastName: this.newSpecialistLastName,
                email: this.newSpecialistEmail,
                department: this.newSpecialistDepartment,
                isValidate: true,
                contactId: '',
                contactType: 'Specialist'
            });

            if (result.isEmailMatched || result.contacts?.length > 0) {
                const message = result.message === 'message1' ? 'Specialist with this email or name already exists.' : 'Specialist with this name already exists.';
                this.showToast('Warning', message, 'warning');
                return;
            }

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
                this.specialists = [...this.specialists, {
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
                }];
                this.updateSpecialistsView();
                this.updateSpecialistOptions();
                this.handleCloseModal();
                this.showToast('Success', 'Specialist created and added successfully', 'success');
                await this.loadInitialData();
            } else {
                this.showToast('Error', createResult.message || 'Failed to create specialist', 'error');
            }
        } catch (error) {
            this.handleError('Error creating specialist', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Data Processing
    updateSecondaryTrainerOptions() {
        this.secondaryTrainerOptions = [
            { label: 'Select Secondary Faculty', value: '' },
            ...(this.trainingData.trainers || [])
                .filter(trainer => trainer.Id !== this.primaryFacultyContactId)
                .map(trainer => ({ label: trainer.Name, value: trainer.Id }))
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
        ];
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
                    taught: true
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

    addSpecialist() {
        if (!this.selectedSpecialistContactId) {
            this.showToast('Error', 'Please select a specialist to add', 'error');
            return;
        }
        if (this.specialists.find(spec => spec.contactId === this.selectedSpecialistContactId)) {
            this.showToast('Warning', 'This specialist is already added', 'warning');
            this.clearSpecialistSelection();
            return;
        }
        const specialistData = this.trainingData.specialists.find(spec => spec.Id === this.selectedSpecialistContactId);
        if (!specialistData) {
            this.showToast('Error', 'Specialist data not found', 'error');
            this.clearSpecialistSelection();
            return;
        }
        this.specialists = [...this.specialists, {
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
        }];
        this.updateSpecialistsView();
        this.updateSpecialistOptions();
        this.clearSpecialistSelection();
        this.showToast('Success', 'Specialist added successfully', 'success');
        this.saveFormState();
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

    resetNewSpecialistForm() {
        this.newSpecialistFirstName = '';
        this.newSpecialistLastName = '';
        this.newSpecialistEmail = '';
        this.newSpecialistDepartment = '';
        this.newSpecialistOrgId = this.selectedSubOrganization;
        this.saveFormState();
    }

    clearSpecialistSelection() {
        this.selectedSpecialistContactId = '';
        const recordPicker = this.template.querySelector('lightning-record-picker');
        if (recordPicker) {
            recordPicker.clearSelection();
        }
        this.saveFormState();
    }

    updateSpecialistsView() {
        this.hasSpecialistsAssigned = this.specialists.length > 0;
    }

    // Navigation
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

    navigateAfterSave(navigateToPageType, trainingId) {
        const pageConfig = {
            gradingPage: {
                type: 'comm__namedPage',
                attributes: { name: 'Training_Grading__c' },
                state: { contactId: this.contactId, trainingId }
            },
            recordPage: {
                type: 'standard__recordPage',
                attributes: { recordId: trainingId, objectApiName: 'hed__Course_Offering__c', actionName: 'view' },
                state: { contactId: this.contactId, trainingId }
            }
        };
        if (pageConfig[navigateToPageType]) {
            this[NavigationMixin.Navigate](pageConfig[navigateToPageType]);
        }
    }

    // Save Methods
    async handleSaveTraining() {
        await this.saveTraining('recordPage');
    }

    async gradeAndFinalize() {
        if (!this.specialists.length) {
            this.showToast('Error', 'Please add at least one specialist before finalizing', 'error');
            return;
        }
        await this.saveTraining('gradingPage');
    }

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
                trainingDetails,
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
                this.clearFormState();
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

    // Validation
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
        if (this.newSpecialistEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newSpecialistEmail)) {
            this.showToast('Error', 'Please enter a valid email address', 'error');
            return false;
        }
        return true;
    }

    // Data Building
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
                Id: null,
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

    // Utility
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(message, error) {
        console.error(message, error);
        this.showToast('Error', `${message}: ${error.message || error}`, 'error');
        this.hasError = true;
    }
}