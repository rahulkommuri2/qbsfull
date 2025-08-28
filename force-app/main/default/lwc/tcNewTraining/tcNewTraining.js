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
import getCertificationTypePicklistValues from '@salesforce/apex/tcTrainingController.getPicklistValues';
import getAuthorizationPicklistValues from '@salesforce/apex/tcTrainingController.getPicklistValues';

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
    @track courseActualDuration = '';
    @track courseMinimumDuration = '';
    @track courseData = [];
    @track hasCourseCompetencies = false;
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
    @track authorizationOptions = [
        { label: 'Select Authorization', value: '' },
        { label: 'Standard', value: 'Standard' },
        { label: 'Collaborative', value: 'Collaborative' },
        { label: 'Third Party', value: 'Third Party' }
    ];
    @track courseOptions = [];
    @track trainerOptions = [];
    @track secondaryTrainerOptions = [];
    @track specialistOptions = [];
    @track stateOptions = [];

    courseColumns = [
        { label: 'Competency', fieldName: 'name', type: 'text' },
        { label: 'Chapter', fieldName: 'chapter', type: 'text' },
        { label: 'Initial Time', fieldName: 'initialTime', type: 'text' },
        { label: 'Recert Time', fieldName: 'recertTime', type: 'text' },
        { 
            label: 'Taught', 
            fieldName: 'taught', 
            type: 'boolean', 
            editable: true 
        }
    ];

    get specialistComboboxDisabled() {
        return this.editingDisabled || this.isSpecialistLoading || !this.specialistOptions.length;
    }

    get secondaryFacultyDisabled() {
        return !this.primaryFacultyContactId || this.editingDisabled;
    }

    get actualTimeLabel() {
        return this.selectedCertificationType === 'Initial' ? 'Actual Initial Training Time' : 'Actual Recert Training Time';
    }

    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
            if (this.contactId) {
                this.loadInitialData();
            } else {
                this.handleError('User does not have a ContactId associated', new Error('ContactId missing'));
                this.hasError = true;
            }
        } else if (error) {
            this.handleError('Error fetching user record', error);
            this.hasError = true;
        }
    }

    connectedCallback() {
        window.addEventListener('resize', this.handleResize.bind(this));
        this.fetchStatePicklistValues();
        this.fetchCertificationTypePicklistValues();
        this.fetchAuthorizationPicklistValues();
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        this.isMobileView = window.innerWidth < 768;
    }

    fetchStatePicklistValues() {
        getStatePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'cc_State_Province__c' })
            .then(result => {
                this.stateOptions = result.map(val => ({ label: val, value: val }));
            })
            .catch(error => {
                console.error('Error fetching state picklist values', JSON.stringify(error));
            });
    }

    fetchCertificationTypePicklistValues() {
        getCertificationTypePicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'Certification_Type__c' })
            .then(result => {
                this.certificationTypeOptions = result.map(val => ({ label: val, value: val }));
            })
            .catch(error => {
                console.error('Error fetching certification type picklist values', JSON.stringify(error));
            });
    }

    fetchAuthorizationPicklistValues() {
        getAuthorizationPicklistValues({ objectName: 'hed__Course_Offering__c', fieldName: 'Training_Authorization__c' })
            .then(result => {
                this.authorizationOptions = result.map(val => ({ label: val, value: val }));
            })
            .catch(error => {
                console.error('Error fetching authorization picklist values', JSON.stringify(error));
            });
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

            this.certificationTypeOptions = [
                { label: 'Select Certification Type', value: '' },
                { label: 'Initial', value: 'Initial' },
                { label: 'Recertification', value: 'Recertification' }
            ];

            this.courseOptions = (this.trainingData.courses || []).map(course => ({
                label: course.Name,
                value: course.Id
            }));

            this.trainerOptions = (this.trainingData.trainers || []).map(trainer => ({
                label: trainer.Name,
                value: trainer.Id
            }));
            this.secondaryTrainerOptions = [{ label: 'Select Secondary Faculty', value: '' }, ...this.trainerOptions];

            this.updateSpecialistOptions();
            this.editingDisabled = !(this.trainingData.viewTrainers && this.trainingData.viewSpecialist);
        } catch (error) {
            this.handleError('Error processing training data', error);
        }
    }

    updateSpecialistOptions() {
        this.specialistOptions = [
            { label: 'Search for a Specialist', value: '' },
            ...(this.trainingData.specialists || [])
                .filter(specialist => !this.specialists.some(s => s.contactId === specialist.Id))
                .map(specialist => ({
                    label: `${specialist.Name} - ${specialist.Account?.Name || ''}`,
                    value: specialist.Id
                }))
                .sort((a, b) => a.label.localeCompare(b.label))
        ];
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

    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
        this.newSpecialistOrgId = this.selectedSubOrganization;
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        this.selectedCourseType = '';
        this.courseActualDuration = '';
        this.updateCourseCompetencies();
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
        this.secondaryFacultyContactId = '';
        this.secondaryTrainerOptions = [
            { label: 'Select Secondary Faculty', value: '' },
            ...this.trainerOptions.filter(option => option.value !== this.primaryFacultyContactId)
        ];
        this.template.querySelector('lightning-combobox[data-id="secondaryFaculty"]').value = '';
    }

    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
    }

    updateCourseSelection(event) {
        this.selectedCourseType = event.detail.value;
        this.updateCourseCompetencies();
    }

    updateCourseActualDuration(event) {
        this.courseActualDuration = event.detail.value;
    }

    handleCellChange(event) {
        const draftValues = event.detail.draftValues;
        const updatedData = this.courseData.map(row => {
            const draft = draftValues.find(d => d.id === row.id);
            return draft ? { ...row, ...draft } : row;
        });
        this.courseData = updatedData;
        this.courseMinimumDuration = this.formatTime(
            this.selectedCertificationType === 'Initial' ?
            this.courseData.reduce((sum, comp) => sum + (comp.taught ? comp.initialMinutes : 0), 0) :
            this.courseData.reduce((sum, comp) => sum + (comp.taught ? comp.recertMinutes : 0), 0)
        );
    }

    updateCourseCompetencies() {
        if (this.selectedCourseType && this.trainingData?.courseCompetencies) {
            this.courseData = this.trainingData.courseCompetencies
                .filter(comp => comp.Course__c === this.selectedCourseType)
                .map(comp => ({
                    id: comp.Id,
                    name: comp.Name,
                    chapter: comp.Chapter__c || '',
                    initialTime: this.formatTime(comp.Initial_Time__c),
                    recertTime: this.formatTime(comp.Recert_Time__c),
                    initialMinutes: comp.Initial_Time__c || 0,
                    recertMinutes: comp.Recert_Time__c || 0,
                    taught: comp.Taught__c || false
                }));
            this.hasCourseCompetencies = this.courseData.length > 0;
            this.courseMinimumDuration = this.formatTime(
                this.selectedCertificationType === 'Initial' ?
                this.courseData.reduce((sum, comp) => sum + (comp.taught ? comp.initialMinutes : 0), 0) :
                this.courseData.reduce((sum, comp) => sum + (comp.taught ? comp.recertMinutes : 0), 0)
            );
        } else {
            this.courseData = [];
            this.hasCourseCompetencies = false;
            this.courseMinimumDuration = '';
        }
    }

    updateSpecialistSelection(event) {
        this.selectedSpecialistContactId = event.detail.value;
        if (this.selectedSpecialistContactId) {
            this.addSpecialist();
        }
    }

    addSpecialist() {
        if (!this.selectedSpecialistContactId) {
            this.showToast('Error', 'Please select a specialist to add', 'error');
            return;
        }

        const existingSpecialist = this.specialists.find(spec => spec.contactId === this.selectedSpecialistContactId);
        if (existingSpecialist) {
            this.showToast('Warning', 'This specialist is already added to the training', 'warning');
            return;
        }

        const specialistData = this.trainingData.specialists.find(spec => spec.Id === this.selectedSpecialistContactId);
        if (!specialistData) {
            this.showToast('Error', 'Specialist data not found', 'error');
            return;
        }

        this.isSpecialistLoading = true;
        this.specialists = [
            ...this.specialists,
            {
                contactId: specialistData.Id,
                name: specialistData.Name,
                firstName: specialistData.FirstName,
                lastName: specialistData.LastName,
                specialistEmail: specialistData.Email || '',
                emailLink: specialistData.Email ? `mailto:${specialistData.Email}` : '',
                accountName: specialistData.Account?.Name || '',
                department: specialistData.Department || '',
                grade: ''
            }
        ];
        this.updateSpecialistsView();
        this.updateSpecialistOptions();
        this.clearSpecialistSelection();
        this.isSpecialistLoading = false;
        this.showToast('Success', 'Specialist added successfully', 'success');
    }

    openSpecialistModal() {
        this.isModalOpen = true;
        this.newSpecialistOrgId = this.selectedSubOrganization;
    }

    handleCloseModal() {
        this.isModalOpen = false;
        this.newSpecialistFirstName = '';
        this.newSpecialistLastName = '';
        this.newSpecialistEmail = '';
        this.newSpecialistDepartment = '';
        this.newSpecialistOrgId = this.selectedSubOrganization;
    }

    updateNewSpecialistFirstName(event) {
        this.newSpecialistFirstName = event.detail.value;
    }

    updateNewSpecialistLastName(event) {
        this.newSpecialistLastName = event.detail.value;
    }

    updateNewSpecialistEmail(event) {
        this.newSpecialistEmail = event.detail.value;
    }

    updateNewSpecialistDepartment(event) {
        this.newSpecialistDepartment = event.detail.value;
    }

    updateNewSpecialistOrgId(event) {
        this.newSpecialistOrgId = event.detail.value;
    }

    async handleAdd() {
        if (!this.newSpecialistFirstName || !this.newSpecialistLastName || !this.newSpecialistOrgId) {
            this.showToast('Error', 'First Name, Last Name, and Sub Organization are required', 'error');
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
                isValidate: false,
                contactId: '',
                contactType: 'Specialist'
            });

            if (result.message === 'success' && result.contacts?.[0]?.Id) {
                this.specialists = [
                    ...this.specialists,
                    {
                        contactId: result.contacts[0].Id,
                        name: `${result.contacts[0].FirstName} ${result.contacts[0].LastName}`,
                        firstName: result.contacts[0].FirstName,
                        lastName: result.contacts[0].LastName,
                        specialistEmail: result.contacts[0].Email || '',
                        emailLink: result.contacts[0].Email ? `mailto:${result.contacts[0].Email}` : '',
                        accountName: this.subOrganizationOptions.find(opt => opt.value === result.contacts[0].AccountId)?.label || '',
                        department: result.contacts[0].Department || '',
                        grade: ''
                    }
                ];
                this.updateSpecialistsView();
                this.handleCloseModal();
                this.showToast('Success', 'Specialist created and added successfully', 'success');
                await this.loadInitialData(); // Refresh specialist options
            } else {
                this.handleError('Error creating specialist', new Error(result.message || 'Unknown error'));
            }
        } catch (error) {
            this.handleError('Error creating specialist', error);
        } finally {
            this.isLoading = false;
        }
    }

    removeSpecialist(event) {
        const specialistId = event.currentTarget.dataset.specialistId;
        this.specialists = this.specialists.filter(spec => spec.contactId !== specialistId);
        this.updateSpecialistsView();
        this.updateSpecialistOptions();
        this.clearSpecialistSelection();
        this.showToast('Success', 'Specialist removed successfully', 'success');
    }

    clearSpecialistSelection() {
        this.selectedSpecialistContactId = '';
        const specialistCombobox = this.template.querySelector('lightning-combobox[data-id="specialist"]');
        if (specialistCombobox) {
            specialistCombobox.value = '';
        }
    }

    updateSpecialistsView() {
        this.hasSpecialistsAssigned = this.specialists.length > 0;
    }

    async saveTraining(navigateToPageType) {
        if (!this.validateForm()) return;

        this.isLoading = true;
        try {
            const trainingDetails = this.buildTrainingDetails();
            const competenciesWrapper = this.buildCompetenciesWrapper();
            const result = await saveTraining({
                contactId: this.contactId,
                coursesList: this.selectedCourseType ? [{ Id: this.selectedCourseType, Name: this.courseOptions.find(opt => opt.value === this.selectedCourseType)?.label || '' }] : [],
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
                authorizationType: this.selectedAuthorization || null,
                specialistToBeInserted: this.getSpecialistsForInsert(),
                termId: this.trainingData.termPlanList?.[0]?.Id || null,
                certificationType: this.selectedCertificationType
            });

            const errors = result.filter(err => err.message);
            if (errors.length > 0) {
                errors.forEach(err => this.showToast('Error', err.message, 'error'));
            } else if (result[0]?.trainingId) {
                this.showToast('Success', 'Training saved successfully', 'success');
                if (navigateToPageType === 'gradingPage') {
                    this[NavigationMixin.Navigate]({
                        type: 'comm__namedPage',
                        attributes: {
                            name: 'Training_Grading__c'
                        },
                        state: {
                            contactId: this.contactId,
                            trainingId: result[0].trainingId
                        }
                    });
                } else if (navigateToPageType === 'recordPage') {
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: result[0].trainingId,
                            objectApiName: 'hed__Course_Offering__c',
                            actionName: 'view'
                        },
                        state: {
                            contactId: this.contactId,
                            trainingId: result[0].trainingId
                        }
                    });
                }
            }
        } catch (error) {
            this.handleError('Error saving training', error);
        } finally {
            this.isLoading = false;
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
            { field: this.primaryFacultyContactId, name: 'Primary Faculty' },
            { field: this.selectedCourseType, name: 'Course' },
            { field: this.specialists.length, name: 'At least one specialist' }
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
            
            if (start > end) {
                this.showToast('Error', 'End date must be after start date', 'error');
                return false;
            }
            
            if (end < today) {
                this.showToast('Warning', 'End date is in the past', 'warning');
            }
        }
        return true;
    }

    buildTrainingDetails() {
        const timeInMinutes = this.parseTimeToMinutes(this.courseActualDuration);
        const trainingDetails = {
            Shipping_City__c: this.locationCity,
            Shipping_State__c: this.selectedState,
            Shipping_Postal_Code__c: this.locationZipCode,
            Street__c: this.trainingLocationAddress,
            cc_Training_Description__c: this.trainingNotes
        };
        if (this.selectedCertificationType === 'Initial') {
            trainingDetails.Course_Initial_Training_Time__c = timeInMinutes;
            trainingDetails.Actual_Initial_Training_Time__c = timeInMinutes;
        } else {
            trainingDetails.Course_Recert_Training_Time__c = timeInMinutes;
            trainingDetails.Actual_Recert_Training_Time__c = timeInMinutes;
        }
        return trainingDetails;
    }

    buildCompetenciesWrapper() {
        return this.courseData.map((comp, index) => ({
            index: index,
            courseId: this.selectedCourseType,
            isAllCompetencyTaught: this.courseData.every(c => c.taught),
            actualInitialTime: this.selectedCertificationType === 'Initial' ? this.parseTimeToMinutes(this.courseActualDuration) || 0 : 0,
            actualRecertTime: this.selectedCertificationType !== 'Initial' ? this.parseTimeToMinutes(this.courseActualDuration) || 0 : 0,
            competencyIds: [comp.id],
            trainingCompetencies: [{
                Course_Competency__c: comp.id,
                Name: comp.name,
                Chapter_Name__c: comp.chapter,
                Initial_Time__c: comp.initialMinutes,
                Recert_Time__c: comp.recertMinutes,
                Taught__c: comp.taught
            }]
        }));
    }

    getSelectedTrainers() {
        const trainers = [];
        if (this.primaryFacultyContactId) {
            const primary = this.trainingData.trainers.find(t => t.Id === this.primaryFacultyContactId);
            if (primary) trainers.push({ Id: primary.Id, Name: primary.Name });
        }
        if (this.secondaryFacultyContactId) {
            const secondary = this.trainingData.trainers.find(t => t.Id === this.secondaryFacultyContactId);
            if (secondary) trainers.push({ Id: secondary.Id, Name: secondary.Name });
        }
        return trainers;
    }

    getSpecialistsForInsert() {
        return this.specialists.map(s => ({
            Id: s.contactId,
            FirstName: s.firstName,
            LastName: s.lastName,
            Email: s.specialistEmail,
            Department: s.department,
            AccountId: this.subOrganizationOptions.find(opt => opt.label === s.accountName)?.value || this.selectedSubOrganization
        }));
    }

    formatTime(minutes) {
        if (!minutes) return '0h 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(title, error) {
        console.error(`${title}:`, JSON.stringify(error));
        this.errorMessage = error.body?.message || error.message || 'An unexpected error occurred';
        this.showToast(title, this.errorMessage, 'error');
    }
}