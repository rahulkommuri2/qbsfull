import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import initializeTrainingData from '@salesforce/apex/tcTrainingController.initializeTrainingData';
import createSpecialist from '@salesforce/apex/tcTrainingController.createSpecialist';
import saveTraining from '@salesforce/apex/tcTrainingController.saveTraining';
import getStatePicklistValues from '@salesforce/apex/tcTrainingController.getPicklistValues';

export default class TcTrainingDetail extends NavigationMixin(LightningElement) {
    
    @api recordId; // For record context in Experience Cloud
    @track trainingId;
    @track contactId;
    @track errorMessage = '';
    
    // State Variables
    @track isLoading = true;
    @track isSpecialistLoading = false;
    @track hasError = false;
    @track isMobileView = false;
    @track isMobileMenuVisible = false;
    @track editingDisabled = true;
    @track isModalOpen = false;
    @track isViewMode = true;
    @track isEditMode = false;
    @track hasCourseCompetencies = false;
    @track taughtAllChecked = true;

    // Data Variables
    @track trainingData = {};
    @track originalTrainingData = {};
    @track courseData = [];
    @track draftValues = [];
    @track specialists = [];

    // Form Fields
    @track parentOrgName = '';
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
    @track finalizedStatus = '';
    @track primaryFacultyContactId = '';
    @track secondaryFacultyContactId = '';
    @track selectedCourseId = '';
    @track courseActualDurationHours = '0';
    @track courseActualDurationMinutes = '0';
    @track courseMinimumDuration = '';

    // Local Variables
    @track selectedSpecialistContactId = '';
    @track newSpecialistOrgId = '';
    @track newSpecialistFirstName = '';
    @track newSpecialistLastName = '';
    @track newSpecialistEmail = '';
    @track newSpecialistDepartment = '';
    @track subOrganizationOptions = [];
    @track certificationTypeOptions = [];
    @track authorizationOptions = [];
    @track stateOptions = [];
    @track finalizedStatusOptions = [];
    @track primaryFacultyOptions = [];
    @track secondaryFacultyOptions = [];
    @track courseOptions = [];
    @track specialistOptions = [];
    @track taughtCompetenciesOptions = [];
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

    // Computed properties
    get formattedActualTrainingTime() {
        return this.formatTime(this.courseActualDuration);
    }

    get formattedMinimumTrainingTime() {
        return this.courseMinimumDuration;
    }

    get courseActualDuration() {
        const hours = parseInt(this.courseActualDurationHours) || 0;
        const minutes = parseInt(this.courseActualDurationMinutes) || 0;
        return (hours * 60) + minutes; // Total minutes for Apex
    }

    get secondaryFacultyDisabled() {
        return this.editingDisabled || !this.primaryFacultyContactId;
    }

    get specialistComboboxDisabled() {
        return this.editingDisabled || this.isSpecialistLoading || !this.specialistOptions.length;
    }

    get mobileMenuIcon() {
        return this.isMobileMenuVisible ? 'utility:up' : 'utility:down';
    }

    get isNotEditable() {
        return this.trainingData.trainingRecord?.Finalized__c || false;
    }

    get restrictRefinalize() {
        return !this.trainingData.trainingRecord?.Finalized__c;
    }

    get restrictDownload() {
        return !this.trainingData.trainingRecord?.Finalized__c;
    }

    get restrictEmail() {
        return !this.trainingData.trainingRecord?.Finalized__c;
    }

    get actualTimeLabel() {
        return this.selectedCertificationType === 'Initial' ? 'Actual Initial Training Time' : 'Actual Recert Training Time';
    }

    get canNavigateToGrading() {
        return this.trainingId && this.contactId;
    }

    get canSaveTraining() {
        return !this.editingDisabled && this.contactId;
    }

    get today() {
        return new Date().toISOString().split('T')[0];
    }

    // Course columns for datatable
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

    // Wire service to get page reference
    @wire(CurrentPageReference)
    wiredPageRef(pageRef) {
        if (pageRef && pageRef.state) {
            this.trainingId = pageRef.state.trainingId || this.recordId;
            this.contactId = pageRef.state.contactId;
            if(pageRef.state.mode === 'edit') {
                this.isEditMode = true;
                this.isViewMode = false;
            } else if (pageRef.state.mode === 'view') {
                this.isViewMode = true;
                this.isEditMode = false;
            }
            if (this.contactId && this.trainingId) {
                this.loadTrainingData();
            } else {
                this.handleError('Missing Parameters', new Error('Contact ID or Training ID missing'));
                this.hasError = true;
                this.isLoading = false;
            }
        }
    }

    // Lifecycle hooks
    connectedCallback() {
        this.checkMobileView();
        window.addEventListener('resize', this.handleResize.bind(this));
        this.fetchPicklistValues();
        this.setupFinalizedOptions();
        this.setupTaughtCompetenciesOptions();
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
            finalizedStatus: this.finalizedStatus,
            primaryFacultyContactId: this.primaryFacultyContactId,
            secondaryFacultyContactId: this.secondaryFacultyContactId,
            selectedCourseId: this.selectedCourseId,
            courseActualDurationHours: this.courseActualDurationHours,
            courseActualDurationMinutes: this.courseActualDurationMinutes,
            courseData: this.courseData,
            taughtAllChecked: this.taughtAllChecked,
            specialists: this.specialists
        };
        sessionStorage.setItem(`tcTrainingDetail_${this.trainingId}`, JSON.stringify(formState));
    }

    loadFormState() {
        const savedState = sessionStorage.getItem(`tcTrainingDetail_${this.trainingId}`);
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
        sessionStorage.removeItem(`tcTrainingDetail_${this.trainingId}`);
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
            this.handleError('Error fetching picklist values', error);
        }
    }

    setupFinalizedOptions() {
        this.finalizedStatusOptions = [
            { label: 'No', value: 'false' },
            { label: 'Yes', value: 'true' }
        ];
    }

    setupTaughtCompetenciesOptions() {
        this.taughtCompetenciesOptions = [
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' }
        ];
    }

    checkMobileView() {
        this.isMobileView = window.innerWidth < 768;
    }

    handleResize() {
        this.checkMobileView();
        if (!this.isMobileView) {
            this.isMobileMenuVisible = false;
        }
    }

    async loadTrainingData() {
        if (!this.contactId || !this.trainingId) {
            this.handleError('Missing Parameters', new Error('Contact ID or Training ID missing'));
            this.hasError = true;
            this.isLoading = false;
            return;
        }
        try {
            this.isLoading = true;
            const result = await initializeTrainingData({ trainingId: this.trainingId, contactId: this.contactId });
            this.trainingData = result;
            this.originalTrainingData = JSON.parse(JSON.stringify(result));
            this.populateFormFields();
            this.setupOptions();
            this.loadFormState(); // Load saved state after populating
        } catch (error) {
            this.handleError('Error loading training data', error);
            this.hasError = true;
        } finally {
            this.isLoading = false;
        }
    }

    populateFormFields() {
        const training = this.trainingData.trainingRecord;
        if (training) {
            this.parentOrgName = training.Organization__r?.Name || this.trainingData.organizationName || '';
            this.selectedSubOrganization = training.Organization__c || this.trainingData.organizationId || '';
            this.selectedCertificationType = training.Certification_Type__c || '';
            this.trainingStartDate = training.cc_Course_Start_Date__c || '';
            this.trainingEndDate = training.cc_Course_End_Date__c || '';
            this.selectedAuthorization = training.Training_Authorization__c || '';
            this.trainingLocationAddress = training.Street__c || '';
            this.locationCity = training.cc_City__c || '';
            this.selectedState = training.cc_State_Province__c || '';
            this.locationZipCode = training.cc_Zip_Code__c || '';
            this.trainingNotes = training.cc_Training_Description__c || '';
            this.finalizedStatus = training.Finalized__c ? 'true' : 'false';
            this.primaryFacultyContactId = training.hed__Faculty__c || '';
            this.secondaryFacultyContactId = training.cc_Secondary_Faculty__c || '';
            this.selectedCourseId = training.hed__Course__c || '';
            const totalMinutes = this.selectedCertificationType === 'Initial'
                ? training.Actual_Initial_Training_Time__c || 0
                : training.Actual_Recert_Training_Time__c || 0;
            this.courseActualDurationHours = Math.floor(totalMinutes / 60).toString();
            this.courseActualDurationMinutes = (totalMinutes % 60).toString();
        }
        this.populateSpecialists();
        this.updateCourseCompetencies();
        this.saveFormState();
    }

    setupOptions() {
        this.setupSubOrganizationOptions();
        this.setupTrainerOptions();
        this.setupCourseOptions();
        this.updateSpecialistOptions();
    }

    setupSubOrganizationOptions() {
        this.subOrganizationOptions = [
            { label: this.trainingData.organizationName, value: this.trainingData.organizationId }
        ];
        if (this.trainingData.childOrganizations) {
            this.subOrganizationOptions.push(
                ...this.trainingData.childOrganizations
                    .filter(org => org.Id !== this.trainingData.organizationId)
                    .map(org => ({ label: org.Name, value: org.Id }))
            );
        }
    }

    setupTrainerOptions() {
        this.primaryFacultyOptions = [{ label: 'Select Primary Faculty', value: '' }];
        this.secondaryFacultyOptions = [{ label: 'Select Secondary Faculty', value: '' }];
        if (this.trainingData.trainers) {
            this.trainingData.trainers.forEach(trainer => {
                const option = { label: trainer.Name, value: trainer.Id };
                this.primaryFacultyOptions.push(option);
                if (trainer.Id !== this.primaryFacultyContactId) {
                    this.secondaryFacultyOptions.push(option);
                }
            });
        }
    }

    setupCourseOptions() {
        this.courseOptions = [{ label: 'Select Course', value: '' }];
        if (this.trainingData.courses) {
            this.courseOptions.push(
                ...this.trainingData.courses.map(course => ({
                    label: course.Name,
                    value: course.Id
                }))
            );
        }
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

    populateSpecialists() {
        this.specialists = [];
        if (this.trainingData.trainingRecord?.Registers__r) {
            this.specialists = this.trainingData.trainingRecord.Registers__r.map(registration => ({
                contactId: registration.Registration_Contact__c,
                name: registration.Registration_Contact__r?.Name || '',
                firstName: registration.Registration_Contact__r?.FirstName || '',
                lastName: registration.Registration_Contact__r?.LastName || '',
                accountName: registration.Registration_Contact__r?.Account?.Name || '',
                specialistEmail: registration.Registration_Contact__r?.Email || '',
                emailLink: registration.Registration_Contact__r?.Email ? `mailto:${registration.Registration_Contact__r.Email}` : '',
                department: registration.Registration_Contact__r?.Department || '',
                grade: this.getSpecialistGrade(registration.Registration_Contact__c)
            }));
        }
        this.updateSpecialistsView();
        this.updateSpecialistOptions();
        this.saveFormState();
    }

    getSpecialistGrade(contactId) {
        if (this.trainingData.trainingRecord?.hed__Term_Grades__r) {
            const termGrade = this.trainingData.trainingRecord.hed__Term_Grades__r
                .find(grade => grade.hed__Contact__c === contactId);
            return termGrade?.hed__Result__c || '';
        }
        return '';
    }

    updateCourseCompetencies() {
        if (this.selectedCourseId && this.trainingData?.courseCompetencies) {
            this.courseData = this.trainingData.courseCompetencies
                .filter(comp => comp.Course__c === this.selectedCourseId)
                .map((comp, index) => {
                    const eventCompetency = this.getEventCompetency(comp.Id);
                    return {
                        id: comp.Id,
                        name: comp.Name,
                        chapter: comp.Chapter__c || '',
                        initialTime: this.formatTime(comp.Initial_Time__c || 0),
                        recertTime: this.formatTime(comp.Recert_Time__c || 0),
                        initialMinutes: comp.Initial_Time__c || 0,
                        recertMinutes: comp.Recert_Time__c || 0,
                        taught: eventCompetency ? eventCompetency.Taught__c : true // Default to true for new competencies
                    };
                })
                .sort((a, b) => {
                    const aChapter = this.trainingData.courseCompetencies.find(c => c.Id === a.id)?.Chapter_Number__c || 0;
                    const bChapter = this.trainingData.courseCompetencies.find(c => c.Id === b.id)?.Chapter_Number__c || 0;
                    return aChapter - bChapter;
                });
            this.hasCourseCompetencies = this.courseData.length > 0;
            this.taughtAllChecked = this.courseData.every(comp => comp.taught);
            this.calculateMinimumDuration();
        } else {
            this.courseData = [];
            this.hasCourseCompetencies = false;
            this.courseMinimumDuration = '';
            this.taughtAllChecked = true;
        }
        this.saveFormState();
    }

    getEventCompetency(courseCompetencyId) {
        if (this.trainingData.trainingRecord?.Event_Competencies1__r) {
            return this.trainingData.trainingRecord.Event_Competencies1__r
                .find(ec => ec.Course_Competency__c === courseCompetencyId);
        }
        return null;
    }

    // Event Handlers
    toggleMobileMenu() {
        this.isMobileMenuVisible = !this.isMobileMenuVisible;
        this.saveFormState();
    }

    editTraining() {
        if (this.isNotEditable) {
            this.showToast('Error', 'Cannot edit a finalized training', 'error');
            return;
        }
        this.isViewMode = false;
        this.isEditMode = true;
        this.editingDisabled = false;
        this.isMobileMenuVisible = false;
        this.saveFormState();
    }

    refinalizeTraining() {
        if (this.restrictRefinalize) {
            this.showToast('Error', 'Training must be finalized to refinalize', 'error');
            return;
        }
        this.navigateToGradingPage();
        this.isMobileMenuVisible = false;
        this.saveFormState();
    }

    downloadCertificates() {
        if (this.restrictDownload) {
            this.showToast('Error', 'Training must be finalized to download certificates', 'error');
            return;
        }
        this.showToast('Info', 'Download certificates functionality to be implemented', 'info');
        this.isMobileMenuVisible = false;
        this.saveFormState();
    }

    emailCertificates() {
        if (this.restrictEmail) {
            this.showToast('Error', 'Training must be finalized to email certificates', 'error');
            return;
        }
        this.showToast('Info', 'Email certificates functionality to be implemented', 'info');
        this.isMobileMenuVisible = false;
        this.saveFormState();
    }

    requestCorrection() {
        this.showToast('Info', 'Request correction functionality to be implemented', 'info');
        this.isMobileMenuVisible = false;
        this.saveFormState();
    }

    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
        this.newSpecialistOrgId = this.selectedSubOrganization;
        this.saveFormState();
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        const totalMinutes = this.selectedCertificationType === 'Initial'
            ? this.trainingData.trainingRecord?.Actual_Initial_Training_Time__c || 0
            : this.trainingData.trainingRecord?.Actual_Recert_Training_Time__c || 0;
        this.courseActualDurationHours = Math.floor(totalMinutes / 60).toString();
        this.courseActualDurationMinutes = (totalMinutes % 60).toString();
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

    updateFinalizedStatus(event) {
        this.finalizedStatus = event.detail.value;
        this.editingDisabled = this.finalizedStatus === 'true';
        this.saveFormState();
    }

    updatePrimaryFaculty(event) {
        this.primaryFacultyContactId = event.detail.value;
        this.secondaryFacultyContactId = '';
        this.setupTrainerOptions();
        this.saveFormState();
    }

    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
        this.saveFormState();
    }

    updateCourseSelection(event) {
        this.selectedCourseId = event.detail.value;
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
        const courseId = event.target.dataset.id;
        const isChecked = event.target.checked;

        this.courseData = this.courseData.map(comp => {
            if (comp.id === courseId) {
                return { ...comp, taught: isChecked };
            }
            return comp;
        });

        this.draftValues = this.courseData
            .filter(comp => comp.taught !== this.getEventCompetency(comp.id)?.Taught__c)
            .map(comp => ({ id: comp.id, taught: comp.taught }));

        this.taughtAllChecked = this.courseData.every(comp => comp.taught);
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    handleTaughtCompetenciesChange(event) {
        const isChecked = event.detail.value === 'true';
        this.taughtAllChecked = isChecked;

        this.courseData = this.courseData.map(comp => ({
            ...comp,
            taught: isChecked
        }));

        this.draftValues = this.courseData
            .filter(comp => comp.taught !== this.getEventCompetency(comp.id)?.Taught__c)
            .map(comp => ({ id: comp.id, taught: comp.taught }));

        this.calculateMinimumDuration();
        this.saveFormState();
    }

    updateSpecialistSelection = this.debounce((event) => {
        this.selectedSpecialistContactId = event.detail.value;
        if (this.selectedSpecialistContactId) {
            this.addSpecialist();
        }
        this.saveFormState();
    }, 300);

    handleCellChange(event) {
        const draftValues = event.detail.draftValues;
        this.draftValues = draftValues;
        this.courseData = this.courseData.map(row => {
            const draft = draftValues.find(d => d.id === row.id);
            return draft ? { ...row, ...draft } : row;
        });
        this.taughtAllChecked = this.courseData.every(comp => comp.taught);
        this.calculateMinimumDuration();
        this.saveFormState();
    }

    addSpecialist() {
        if (!this.selectedSpecialistContactId) {
            this.showToast('Error', 'Please select a specialist to add', 'error');
            return;
        }
        if (this.trainingData.specialistsAllowed && this.specialists.length >= this.trainingData.specialistsAllowed) {
            this.showToast('Error', 'Maximum number of specialists reached', 'error');
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
                grade: this.getSpecialistGrade(specialistData.Id),
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

    openSpecialistModal() {
        if (this.trainingData.specialistsAllowed && this.specialists.length >= this.trainingData.specialistsAllowed) {
            this.showToast('Error', 'Maximum number of specialists reached', 'error');
            return;
        }
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
        if (!this.validateNewSpecialist()) {
            return;
        }
        this.isLoading = true;
        const tempSpecialist = {
            contactId: null,
            name: `${this.newSpecialistFirstName} ${this.newSpecialistLastName}`,
            firstName: this.newSpecialistFirstName,
            lastName: this.newSpecialistLastName,
            accountName: this.getAccountName(this.newSpecialistOrgId),
            specialistEmail: this.newSpecialistEmail || '',
            emailLink: this.newSpecialistEmail ? `mailto:${this.newSpecialistEmail}` : '',
            department: this.newSpecialistDepartment || '',
            grade: '',
            accountId: this.newSpecialistOrgId,
            isNew: true
        };
        this.specialists = [...this.specialists, tempSpecialist];
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
                this.specialists = this.specialists.filter(s => s !== tempSpecialist);
                this.showToast('Warning', message, 'warning');
                this.isLoading = false;
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
                this.specialists = this.specialists.map(s =>
                    s === tempSpecialist ? {
                        ...s,
                        contactId: contact.Id,
                        name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
                        firstName: contact.FirstName || '',
                        lastName: contact.LastName || '',
                        specialistEmail: contact.Email || '',
                        emailLink: contact.Email ? `mailto:${contact.Email}` : '',
                        department: contact.Department || '',
                        accountId: contact.AccountId
                    } : s
                );
                this.updateSpecialistsView();
                this.updateSpecialistOptions();
                this.handleCloseModal();
                this.showToast('Success', 'Specialist created and added successfully', 'success');
                await this.loadTrainingData(); // Refresh specialist options
                this.saveFormState();
            } else {
                this.specialists = this.specialists.filter(s => s !== tempSpecialist);
                this.showToast('Error', createResult.message || 'Failed to create specialist', 'error');
            }
        } catch (error) {
            this.specialists = this.specialists.filter(s => s !== tempSpecialist);
            this.handleError('Error creating specialist', error);
        } finally {
            this.isLoading = false;
        }
    }

    validateNewSpecialist() {
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
        if (this.trainingData.specialistsAllowed && this.specialists.length >= this.trainingData.specialistsAllowed) {
            this.showToast('Error', 'Maximum number of specialists reached', 'error');
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

    navigateToTrainings() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            },
            state: {
                contactId: this.contactId,
                trainingId: this.trainingId
            }
        });
    }

    navigateToGradingPage() {
        if (!this.canNavigateToGrading) {
            this.showToast('Error', 'Missing required parameters for navigation', 'error');
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Training_Grading__c'
            },
            state: {
                contactId: this.contactId,
                trainingId: this.trainingId
            }
        });
    }

    async gradeAndFinalize() {
        if (!this.validateForm()) return;
        if (!this.specialists.length) {
            this.showToast('Error', 'Please add at least one specialist before finalizing', 'error');
            return;
        }
        const result = await this.saveTraining();
        if (result) {
            this.clearFormState();
            this.navigateToGradingPage();
        }
    }

    async handleSaveTraining() {
        const result = await this.saveTraining();
        if (result) {
            this.clearFormState();
            this.navigateToRecordPage(result.trainingId);
        }
    }

    validateForm() {
        const requiredFields = [
            { value: this.selectedCourseId, name: 'Course' },
            { value: this.primaryFacultyContactId, name: 'Primary Faculty' },
            { value: this.trainingStartDate, name: 'Start Date' },
            { value: this.trainingEndDate, name: 'End Date' },
            { value: this.selectedSubOrganization, name: 'Sub Organization' },
            { value: this.selectedCertificationType, name: 'Certification Type' },
            { value: this.selectedAuthorization, name: 'Authorization' }
        ];

        for (const field of requiredFields) {
            if (!field.value) {
                this.showToast('Error', `${field.name} is required`, 'error');
                return false;
            }
        }

        if (!this.validateDateRange()) {
            return false;
        }

        if (!this.courseData.some(c => c.taught)) {
            this.showToast('Error', 'At least one competency must be taught', 'error');
            return false;
        }

        if (this.courseActualDuration < this.parseTime(this.courseMinimumDuration)) {
            this.showToast('Error', 'Actual training time must be at least the minimum time', 'error');
            return false;
        }

        if (this.primaryFacultyContactId && this.secondaryFacultyContactId &&
            this.primaryFacultyContactId === this.secondaryFacultyContactId) {
            this.showToast('Error', 'Primary and secondary faculty cannot be the same', 'error');
            return false;
        }

        return true;
    }

    validateDateRange() {
        if (this.trainingStartDate && this.trainingEndDate) {
            const start = new Date(this.trainingStartDate);
            const end = new Date(this.trainingEndDate);
            const today = new Date('2025-09-01');
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

    async saveTraining() {
        if (!this.validateForm()) {
            throw new Error('Validation failed');
        }
        this.isLoading = true;
        try {
            this.processDraftValues();
            const trainingDetails = this.buildTrainingDetails();
            const competenciesWrapper = this.buildCompetenciesWrapper();
            const saveParams = {
                contactId: this.contactId,
                coursesList: this.getSelectedCourses(),
                trainerList: this.getSelectedTrainers(),
                trainingDetails: trainingDetails,
                trainingId: this.trainingId,
                organizationId: this.selectedSubOrganization,
                trainingType: 'Organization Specialist Training',
                startDate: this.trainingStartDate,
                endDate: this.trainingEndDate,
                selectedCourseIds: this.selectedCourseId ? [this.selectedCourseId] : [],
                selectedTrainersIds: this.getSelectedTrainerIds(),
                selectedSpecialistIds: this.getSelectedSpecialistIds(),
                competenciesWrapperStr: JSON.stringify(competenciesWrapper),
                isCollaborative: this.selectedAuthorization === 'Collaborative',
                authorizationType: this.selectedAuthorization || 'Standard',
                specialistToBeInserted: this.getSpecialistsForInsert(),
                termId: this.trainingData.termPlanList?.[0]?.Id || null,
                certificationType: this.selectedCertificationType
            };
            const result = await saveTraining(saveParams);
            const errors = result.filter(item => item.message && !item.trainingId);
            const successes = result.filter(item => item.trainingId);

            if (errors.length > 0) {
                errors.forEach(error => this.showToast('Error', error.message, 'error'));
                throw new Error('Validation errors occurred during save');
            }

            if (successes.length > 0) {
                this.trainingId = successes[0].trainingId;
                this.editingDisabled = this.finalizedStatus === 'true';
                this.showToast('Success', 'Training saved successfully', 'success');
                return successes[0];
            }

            throw new Error('No valid response from server');
        } catch (error) {
            this.handleError('Error saving training', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    processDraftValues() {
        if (this.draftValues && this.draftValues.length > 0) {
            this.draftValues.forEach(draft => {
                const index = this.courseData.findIndex(item => item.id === draft.id);
                if (index !== -1) {
                    this.courseData[index] = { ...this.courseData[index], ...draft };
                }
            });
            this.draftValues = [];
        }
    }

    navigateToRecordPage(trainingId) {
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

    buildTrainingDetails() {
        const totalMinutes = this.courseActualDuration;
        const trainingDetails = {
            Shipping_City__c: this.locationCity,
            Shipping_State__c: this.selectedState,
            Shipping_Postal_Code__c: this.locationZipCode,
            cc_Training_Description__c: this.trainingNotes,
            Street__c: this.trainingLocationAddress,
            Finalized__c: this.finalizedStatus === 'true'
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
            courseId: this.selectedCourseId,
            actualInitialTime: this.selectedCertificationType === 'Initial' ? this.courseActualDuration : 0,
            actualRecertTime: this.selectedCertificationType !== 'Initial' ? this.courseActualDuration : 0,
            competencyIds: this.courseData.map(comp => comp.id),
            trainingCompetencies: this.courseData.map(comp => {
                const eventCompetency = this.getEventCompetency(comp.id);
                return {
                    Id: eventCompetency?.Id || null,
                    Course_Competency__c: comp.id,
                    Name: comp.name,
                    Chapter_Name__c: comp.chapter,
                    Initial_Time__c: comp.initialMinutes,
                    Recert_Time__c: comp.recertMinutes,
                    Taught__c: comp.taught
                };
            })
        }];
    }

    getSelectedCourses() {
        if (this.selectedCourseId) {
            return this.trainingData.courses?.filter(c => c.Id === this.selectedCourseId) || [];
        }
        return [];
    }

    getSelectedTrainers() {
        const trainers = [];
        if (this.primaryFacultyContactId) {
            const primary = this.trainingData.trainers?.find(t => t.Id === this.primaryFacultyContactId);
            if (primary) trainers.push(primary);
        }
        if (this.secondaryFacultyContactId) {
            const secondary = this.trainingData.trainers?.find(t => t.Id === this.secondaryFacultyContactId);
            if (secondary) trainers.push(secondary);
        }
        return trainers;
    }

    getSelectedTrainerIds() {
        const ids = [];
        if (this.primaryFacultyContactId) ids.push(this.primaryFacultyContactId);
        if (this.secondaryFacultyContactId) ids.push(this.secondaryFacultyContactId);
        return ids;
    }

    getSelectedSpecialistIds() {
        return this.specialists.map(s => s.contactId);
    }

    getSpecialistsForInsert() {
        return this.specialists
            .filter(s => s.isNew)
            .map(s => ({
                Id: s.contactId,
                FirstName: s.firstName,
                LastName: s.lastName,
                Email: s.specialistEmail,
                Department: s.department,
                AccountId: s.accountId || this.selectedSubOrganization
            }));
    }

    getAccountName(accountId) {
        const org = this.subOrganizationOptions.find(o => o.value === accountId);
        return org?.label || '';
    }

    formatTime(minutes) {
        if (!minutes) return '0h 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    parseTime(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.replace('h', '').replace('m', '').split(' ').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(message, error) {
        console.error(message, error);
        this.errorMessage = `${message}: ${error.message || error}`;
        this.hasError = true;
        this.showToast('Error', this.errorMessage, 'error');
    }

    debounce(fn, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }
}