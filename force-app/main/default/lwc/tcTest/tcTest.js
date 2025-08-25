import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import userId from '@salesforce/user/Id';
import formFactorPropertyName from '@salesforce/client/formFactor';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import { getRecord } from 'lightning/uiRecordApi';
import initializeTrainingData from '@salesforce/apex/tcTrainingController.initializeTrainingData';
import createSpecialist from '@salesforce/apex/tcTrainingController.createSpecialist';
import saveTraining from '@salesforce/apex/tcTrainingController.saveTraining';

export default class TcTest extends NavigationMixin(LightningElement) {

    @api recordId;
    @track isLoading = true;
    @track errorMessage = '';
    @track isMobileView = formFactorPropertyName === 'Small';
    @track isMobileMenuVisible = false;
    @track mobileMenuIcon = 'utility:down';
    @track isEditMode = false;
    @track isNotEditable = true;
    @track contactId = '';
    @track trainingId = '';
    @track parentOrgName = '';
    @track selectedSubOrganization = '';
    @track selectedCertificationType = '';
    @track trainingStartDate = '';
    @track trainingEndDate = '';
    @track selectedAuthorization = 'None';
    @track trainingLocationAddress = '';
    @track locationCity = '';
    @track selectedState = '';
    @track locationZipCode = '';
    @track trainingNotes = '';
    @track finalizedStatus = 'false';
    @track formattedActualTrainingTime = '';
    @track formattedMinimumTrainingTime = '';
    @track primaryFacultyContactId = '';
    @track secondaryFacultyContactId = '';
    @track selectedCourseId = '';
    @track courseDuration = '';
    @track courseData = [];
    @track hasCourseCompetencies = false;
    @track selectedSpecialistContactId = '';
    @track specialists = [];
    @track hasSpecialistsAssigned = false;
    @track isSpecialistLoading = false;
    @track isModalOpen = false;
    @track newSpecialistFirstName = '';
    @track newSpecialistLastName = '';
    @track newSpecialistEmail = '';
    @track newSpecialistDepartment = '';
    @track newSpecialistOrgId = '';
    @track trainingData = {};
    @track restrictRefinalize = true;
    @track restrictDownload = true;
    @track restrictEmail = true;
    @track draftValues = [];

    @track subOrganizationOptions = [];
    @track certificationTypeOptions = [];
    @track authorizationOptions = [
        { label: 'None', value: 'None' },
        { label: 'Collaborative', value: 'Collaborative' },
        { label: 'Third Party', value: 'Third Party' }
    ];
    @track stateOptions = [
        { label: 'Alabama', value: 'AL' }, { label: 'Alaska', value: 'AK' }, { label: 'Arizona', value: 'AZ' },
        { label: 'Arkansas', value: 'AR' }, { label: 'California', value: 'CA' }, { label: 'Colorado', value: 'CO' },
        { label: 'Connecticut', value: 'CT' }, { label: 'Delaware', value: 'DE' }, { label: 'Florida', value: 'FL' },
        { label: 'Georgia', value: 'GA' }, { label: 'Hawaii', value: 'HI' }, { label: 'Idaho', value: 'ID' },
        { label: 'Illinois', value: 'IL' }, { label: 'Indiana', value: 'IN' }, { label: 'Iowa', value: 'IA' },
        { label: 'Kansas', value: 'KS' }, { label: 'Kentucky', value: 'KY' }, { label: 'Louisiana', value: 'LA' },
        { label: 'Maine', value: 'ME' }, { label: 'Maryland', value: 'MD' }, { label: 'Massachusetts', value: 'MA' },
        { label: 'Michigan', value: 'MI' }, { label: 'Minnesota', value: 'MN' }, { label: 'Mississippi', value: 'MS' },
        { label: 'Missouri', value: 'MO' }, { label: 'Montana', value: 'MT' }, { label: 'Nebraska', value: 'NE' },
        { label: 'Nevada', value: 'NV' }, { label: 'New Hampshire', value: 'NH' }, { label: 'New Jersey', value: 'NJ' },
        { label: 'New Mexico', value: 'NM' }, { label: 'New York', value: 'NY' }, { label: 'North Carolina', value: 'NC' },
        { label: 'North Dakota', value: 'ND' }, { label: 'Ohio', value: 'OH' }, { label: 'Oklahoma', value: 'OK' },
        { label: 'Oregon', value: 'OR' }, { label: 'Pennsylvania', value: 'PA' }, { label: 'Rhode Island', value: 'RI' },
        { label: 'South Carolina', value: 'SC' }, { label: 'South Dakota', value: 'SD' }, { label: 'Tennessee', value: 'TN' },
        { label: 'Texas', value: 'TX' }, { label: 'Utah', value: 'UT' }, { label: 'Vermont', value: 'VT' },
        { label: 'Virginia', value: 'VA' }, { label: 'Washington', value: 'WA' }, { label: 'West Virginia', value: 'WV' },
        { label: 'Wisconsin', value: 'WI' }, { label: 'Wyoming', value: 'WY' }
    ];
    @track finalizedStatusOptions = [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' }
    ];
    @track courseOptions = [];
    @track primaryFacultyOptions = [];
    @track secondaryFacultyOptions = [];
    @track specialistOptions = [];

    courseColumns = [
        { label: 'Competency', fieldName: 'Name', type: 'text' },
        { label: 'Chapter', fieldName: 'Chapter__c', type: 'text' },
        { label: 'Initial Time', fieldName: 'Initial_Time__c', type: 'text' },
        { label: 'Recert Time', fieldName: 'Recert_Time__c', type: 'text' },
        { 
            label: 'Taught', 
            fieldName: 'Taught__c', 
            type: 'boolean', 
            editable: { fieldName: 'isEditable' },
            cellAttributes: { class: 'slds-align_absolute-center' }
        }
    ];

    wiredTrainingResult;

    get editingDisabled() {
        return this.isNotEditable || !this.isEditMode;
    }

    get specialistComboboxDisabled() {
        return this.editingDisabled || this.isSpecialistLoading || !this.specialistOptions.length;
    }

    get secondaryFacultyDisabled() {
        return !this.primaryFacultyContactId || this.editingDisabled;
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.trainingId = currentPageReference.state.trainingId || this.recordId;
            this.contactId = currentPageReference.state.contactId || this.contactId;
            if (currentPageReference.state.mode === 'edit') {
                this.isEditMode = true;
            }
            if (this.trainingId && this.contactId) {
                this.loadTrainingData();
            }
        }
    }

    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value || this.contactId;
            if (this.trainingId && this.contactId) {
                this.loadTrainingData();
            }
        } else if (error) {
            this.handleError('Error fetching user record', error);
        }
    }

    connectedCallback() {
        this.trainingId = this.recordId || this.trainingId;
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        this.isMobileView = formFactorPropertyName === 'Small';
    }

    loadTrainingData() {
        this.isLoading = true;
        initializeTrainingData({ trainingId: this.trainingId, contactId: this.contactId })
            .then(result => {
                this.wiredTrainingResult = result;
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
            this.selectedSubOrganization = this.trainingData.organizationId || '';
            this.subOrganizationOptions = (this.trainingData.childOrganizations || []).map(org => ({
                label: org.Name,
                value: org.Id
            }));

            const certTypes = new Set((this.trainingData.courses || []).map(course => course.Certification_Type__c).filter(type => type));
            this.certificationTypeOptions = Array.from(certTypes).map(type => ({
                label: type,
                value: type
            }));

            this.courseOptions = (this.trainingData.courses || []).map(course => ({
                label: course.Name,
                value: course.Id
            }));

            this.primaryFacultyOptions = (this.trainingData.trainers || []).map(trainer => ({
                label: `${trainer.FirstName} ${trainer.LastName}`,
                value: trainer.Id
            }));
            this.secondaryFacultyOptions = this.primaryFacultyOptions;

            this.updateSpecialistOptions();

            const training = this.trainingData.training;
            if (training) {
                this.selectedCertificationType = training.Certification_Type__c || '';
                this.trainingStartDate = training.cc_Course_Start_Date__c || '';
                this.trainingEndDate = training.cc_Course_End_Date__c || '';
                this.selectedAuthorization = training.Training_Authorization__c || 'None';
                this.trainingLocationAddress = training.Street__c || '';
                this.locationCity = training.Shipping_City__c || '';
                this.selectedState = training.Shipping_State__c || '';
                this.locationZipCode = training.Shipping_Postal_Code__c || '';
                this.trainingNotes = training.cc_Training_Description__c || '';
                this.finalizedStatus = training.Finalized__c ? 'true' : 'false';
                this.primaryFacultyContactId = training.hed__Faculty__c || '';
                this.secondaryFacultyContactId = training.cc_Secondary_Faculty__c || '';
                this.restrictRefinalize = (training.Refinalized__c && training.Finalized__c) || !training.Finalized__c;
                this.restrictDownload = !training.Finalized__c;
                this.restrictEmail = !training.Finalized__c;
                this.isNotEditable = this.trainingData.isNotEditable || false;

                const actualTime = training.Course_Initial_Training_Time__c || 0;
                this.courseDuration = this.formatTime(actualTime);
                this.formattedActualTrainingTime = this.formatTime(actualTime);
                this.formattedMinimumTrainingTime = this.formatTime(this.calculateMinimumTime(training));
            }

            const trainingCourses = this.trainingData.trainingCourseList || [];
            if (trainingCourses.length) {
                this.selectedCourseId = trainingCourses[0].courseId;
                this.setCourseData(trainingCourses[0].competencyList);
            }

            this.specialists = (this.trainingData.trainingSpecialists || []).map(spec => ({
                contactId: spec.Contact__c,
                name: spec.Contact__r?.Name || '',
                specialistEmail: spec.Contact__r?.Email || '',
                emailLink: spec.Contact__r?.Email ? `mailto:${spec.Contact__r?.Email}` : '',
                accountId: spec.Contact__r?.AccountId || '',
                accountName: spec.Contact__r?.Account?.Name || '',
                department: spec.Contact__r?.Department || '',
                type: spec.Contact__r?.Type__c || '',
                grade: spec.Grade__c || ''
            }));
            this.hasSpecialistsAssigned = this.specialists.length > 0;

            if (!this.isEditMode) {
                this.isEditMode = this.trainingData.viewTrainers && this.trainingData.viewSpecialist && !this.isNotEditable;
            }
        } catch (error) {
            this.handleError('Error processing training data', error);
        }
    }

    updateSpecialistOptions() {
        this.specialistOptions = (this.trainingData.specialists || [])
            .filter(specialist => !this.specialists.some(s => s.contactId === specialist.Id))
            .map(specialist => ({
                label: specialist.Name,
                value: specialist.Id,
                email: specialist.Email,
                department: specialist.Department,
                accountName: specialist.Account?.Name || '',
                type: specialist.Type__c
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    calculateMinimumTime(training) {
        if (!training) return 0;
        const minTime = training.Certification_Type__c === 'Initial'
            ? (training.Course_Initial_Training_Time__c || 0)
            : (training.Course_Recert_Training_Time__c || 0);
        return minTime;
    }

    toggleMobileMenu() {
        this.isMobileMenuVisible = !this.isMobileMenuVisible;
        this.mobileMenuIcon = this.isMobileMenuVisible ? 'utility:up' : 'utility:down';
    }

    navigateToTrainings() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            },
            state: {
                filterName: 'Recent'
            }
        });
    }

    editTraining() {
        if (this.isNotEditable) {
            this.showToast('Info', 'This training cannot be edited.', 'info');
            return;
        }
        this.isEditMode = true;
        this.showToast('Success', 'Edit mode enabled.', 'success');
    }

    refinalizeTraining() {
        this.showToast('Info', 'Refinalize functionality coming soon.', 'info');
    }

    downloadCertificates() {
        this.showToast('Info', 'Download certificates functionality coming soon.', 'info');
    }

    emailCertificates() {
        this.showToast('Info', 'Email certificates functionality coming soon.', 'info');
    }

    requestCorrection() {
        this.showToast('Info', 'Request correction functionality coming soon.', 'info');
    }

    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
        this.newSpecialistOrgId = this.selectedSubOrganization;
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        this.formattedMinimumTrainingTime = this.formatTime(this.calculateMinimumTime(this.trainingData.training));
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

    updateFinalizedStatus(event) {
        this.finalizedStatus = event.detail.value;
    }

    updatePrimaryFaculty(event) {
        this.primaryFacultyContactId = event.detail.value;
        this.secondaryFacultyContactId = '';
        this.secondaryFacultyOptions = this.primaryFacultyOptions.filter(
            option => option.value !== this.primaryFacultyContactId
        );
        this.template.querySelector('lightning-combobox[data-id="secondaryFaculty"]').value = '';
    }

    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
    }

    updateCourseSelection(event) {
        this.selectedCourseId = event.detail.value;
        const selectedCourse = this.trainingData.trainingCourseList?.find(course => course.courseId === this.selectedCourseId);
        if (selectedCourse) {
            this.setCourseData(selectedCourse.competencyList);
        }
    }

    updateCourseDuration(event) {
        this.courseDuration = event.detail.value;
        this.formattedActualTrainingTime = this.courseDuration;
    }

    handleRowAction(event) {
        if (!this.isEditMode) return;
        const row = event.detail.row;
        const draftValues = [...this.draftValues];
        const existingIndex = draftValues.findIndex(draft => draft.id === row.id);
        if (existingIndex >= 0) {
            draftValues[existingIndex] = { id: row.id, Taught__c: row.Taught__c };
        } else {
            draftValues.push({ id: row.id, Taught__c: row.Taught__c });
        }
        this.draftValues = draftValues;
        this.courseData = this.courseData.map(comp => ({
            ...comp,
            Taught__c: draftValues.find(draft => draft.id === comp.id)?.Taught__c ?? comp.Taught__c
        }));
    }

    setCourseData(competencies) {
        this.courseData = (competencies || []).map(comp => ({
            id: comp.Id,
            Name: comp.Name || '',
            Chapter__c: comp.Course_Competency__r?.Chapter__c || '',
            Initial_Time__c: this.formatTime(comp.Initial_Time__c),
            Recert_Time__c: this.formatTime(comp.Recert_Time__c),
            Taught__c: comp.Taught__c || false,
            isEditable: this.isEditMode
        }));
        this.hasCourseCompetencies = this.courseData.length > 0;
        const totalInitialTime = this.courseData.reduce((sum, comp) => sum + (comp.Initial_Time__c ? parseFloat(this.parseTimeToMinutes(comp.Initial_Time__c)) : 0), 0);
        this.formattedMinimumTrainingTime = this.formatTime(totalInitialTime);
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
                specialistEmail: specialistData.Email || '',
                emailLink: specialistData.Email ? `mailto:${specialistData.Email}` : '',
                accountId: specialistData.AccountId || '',
                accountName: specialistData.Account?.Name || '',
                department: specialistData.Department || '',
                type: specialistData.Type__c || '',
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

    handleAdd() {
        if (!this.newSpecialistFirstName || !this.newSpecialistLastName || !this.newSpecialistOrgId) {
            this.showToast('Error', 'First Name, Last Name, and Sub Organization are required', 'error');
            return;
        }

        this.isLoading = true;
        createSpecialist({
            accountId: this.newSpecialistOrgId,
            firstName: this.newSpecialistFirstName,
            lastName: this.newSpecialistLastName,
            email: this.newSpecialistEmail,
            department: this.newSpecialistDepartment,
            isValidate: false,
            contactId: null,
            contactType: 'Specialist'
        })
            .then(result => {
                if (result.message === 'success' && result.contacts?.[0]?.Id) {
                    this.specialists = [
                        ...this.specialists,
                        {
                            contactId: result.contacts[0].Id,
                            name: `${result.contacts[0].FirstName} ${result.contacts[0].LastName}`,
                            specialistEmail: result.contacts[0].Email || '',
                            emailLink: result.contacts[0].Email ? `mailto:${result.contacts[0].Email}` : '',
                            accountId: result.contacts[0].AccountId || '',
                            accountName: this.subOrganizationOptions.find(opt => opt.value === result.contacts[0].AccountId)?.label || '',
                            department: result.contacts[0].Department || '',
                            type: result.contacts[0].Type__c || '',
                            grade: ''
                        }
                    ];
                    this.updateSpecialistsView();
                    this.handleCloseModal();
                    this.showToast('Success', 'Specialist created and added successfully', 'success');
                    this.loadTrainingData();
                } else {
                    this.handleError('Error creating specialist', new Error(result.message || 'Unknown error'));
                }
            })
            .catch(error => {
                this.handleError('Error creating specialist', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    removeSpecialist(event) {
        const specialistId = event.target.dataset.specialistId;
        const specialistData = this.trainingData.specialists.find(spec => spec.Id === specialistId);
        this.specialists = this.specialists.filter(spec => spec.contactId !== specialistId);
        if (specialistData) {
            this.specialistOptions = [
                ...this.specialistOptions,
                {
                    label: specialistData.Name,
                    value: specialistData.Id,
                    email: specialistData.Email,
                    department: specialistData.Department,
                    accountName: specialistData.Account?.Name || '',
                    type: specialistData.Type__c
                }
            ].sort((a, b) => a.label.localeCompare(b.label));
        }
        this.updateSpecialistsView();
        this.clearSpecialistSelection();
        this.showToast('Success', 'Specialist removed successfully', 'success');
    }

    clearSpecialistSelection() {
        this.selectedSpecialistContactId = '';
        this.template.querySelector('lightning-combobox[data-id="specialist"]').value = '';
    }

    updateSpecialistsView() {
        this.hasSpecialistsAssigned = this.specialists.length > 0;
    }

    saveTraining() {
        if (!this.validateForm()) return;

        this.isLoading = true;
        const trainingDetails = {
            Id: this.trainingId,
            Shipping_City__c: this.locationCity,
            Shipping_State__c: this.selectedState,
            Shipping_Postal_Code__c: this.locationZipCode,
            Street__c: this.trainingLocationAddress,
            cc_Training_Description__c: this.trainingNotes,
            Course_Initial_Training_Time__c: this.courseDuration ? this.parseTimeToMinutes(this.courseDuration) : null,
            Actual_Initial_Training_Time__c: this.courseDuration ? this.parseTimeToMinutes(this.courseDuration) : null,
            Finalized__c: this.finalizedStatus === 'true',
            hed__Faculty__c: this.primaryFacultyContactId,
            cc_Secondary_Faculty__c: this.secondaryFacultyContactId,
            Certification_Type__c: this.selectedCertificationType,
            cc_Course_Start_Date__c: this.trainingStartDate,
            cc_Course_End_Date__c: this.trainingEndDate,
            Training_Authorization__c: this.selectedAuthorization === 'None' ? null : this.selectedAuthorization
        };

        const trainers = [];
        if (this.primaryFacultyContactId) trainers.push({ Id: this.primaryFacultyContactId });
        if (this.secondaryFacultyContactId) trainers.push({ Id: this.secondaryFacultyContactId });

        const competenciesWrapper = this.courseData.map((comp, index) => ({
            index: index,
            courseId: this.selectedCourseId,
            isAllCompetencyTaught: this.courseData.every(c => c.Taught__c),
            actualInitialTime: this.parseTimeToMinutes(this.courseDuration) || 0,
            actualRecertTime: 0,
            competencyIds: [comp.id],
            trainingCompetencies: [{
                Id: comp.id,
                Name: comp.Name,
                Course_Competency__c: comp.id,
                Taught__c: comp.Taught__c,
                Initial_Time__c: this.parseTimeToMinutes(comp.Initial_Time__c),
                Recert_Time__c: this.parseTimeToMinutes(comp.Recert_Time__c)
            }]
        }));

        saveTraining({
            contactId: this.contactId,
            coursesList: [{ Id: this.selectedCourseId }],
            trainerList: trainers,
            trainingDetails: trainingDetails,
            trainingId: this.trainingId,
            organizationId: this.selectedSubOrganization,
            trainingType: 'Organization Specialist Training',
            startDate: this.trainingStartDate,
            endDate: this.trainingEndDate,
            selectedCourseIds: [this.selectedCourseId],
            selectedTrainersIds: [this.primaryFacultyContactId, this.secondaryFacultyContactId].filter(id => id),
            selectedSpecialistIds: this.specialists.map(spec => spec.contactId),
            competenciesWrapperStr: JSON.stringify(competenciesWrapper),
            isCollaborative: this.selectedAuthorization === 'Collaborative',
            authorizationType: this.selectedAuthorization === 'None' ? null : this.selectedAuthorization,
            specialistToBeInserted: [],
            termId: this.trainingData.termPlanList?.[0]?.Id || null,
            certificationType: this.selectedCertificationType
        })
            .then(result => {
                const errors = result.filter(err => err.message);
                if (errors.length > 0) {
                    this.handleError('Error saving training', new Error(errors[0].message));
                } else {
                    this.showToast('Success', 'Training saved successfully', 'success');
                    this.isEditMode = false;
                    this.refreshData();
                }
            })
            .catch(error => {
                this.handleError('Error saving training', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    gradeAndFinalize() {
        if (!this.validateForm()) return;
        if (!this.specialists.length) {
            this.showToast('Error', 'Please add at least one specialist before finalizing', 'error');
            return;
        }
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

    refreshData() {
        this.isLoading = true;
        return refreshApex(this.wiredTrainingResult)
            .then(() => {
                this.loadTrainingData();
            })
            .catch(error => {
                this.handleError('Failed to refresh data', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
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
            { field: this.selectedCourseId, name: 'Course' }
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
            if (start > end) {
                this.showToast('Error', 'End date must be after start date', 'error');
                this.trainingEndDate = '';
                return false;
            }
        }
        return true;
    }

    formatTime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }

    parseTimeToMinutes(timeStr) {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(title, error) {
        console.error(`${title}:`, error);
        this.errorMessage = error.body?.message || error.message || 'An unexpected error occurred';
        this.showToast(title, this.errorMessage, 'error');
    }

}