import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import initializeTrainingData from '@salesforce/apex/tcTrainingController.initializeTrainingData';
import createSpecialist from '@salesforce/apex/tcTrainingController.createSpecialist';
import saveTraining from '@salesforce/apex/tcTrainingController.saveTraining';

export default class tcTrainingDetail extends NavigationMixin(LightningElement) {
    @track recordId;
    @track trainingId;
    @track contactId;

    // Loading states
    @track isLoading = true;
    @track isSpecialistLoading = false;

    // View states
    @track isMobileView = false;
    @track isMobileMenuVisible = false;
    @track editingDisabled = true;
    @track isModalOpen = false;

    // Training Data
    @track trainingData = {};
    @track originalTrainingData = {};

    // Training Details
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

    // Trainers
    @track primaryFacultyContactId = '';
    @track secondaryFacultyContactId = '';

    // Courses
    @track selectedCourseId = '';
    @track courseData = [];
    @track courseDuration = '';
    @track draftValues = [];

    // Specialists
    @track specialists = [];
    @track selectedSpecialistContactId = '';

    // New Specialist Modal
    @track newSpecialistOrgId = '';
    @track newSpecialistFirstName = '';
    @track newSpecialistLastName = '';
    @track newSpecialistEmail = '';
    @track newSpecialistDepartment = '';

    // Options
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

    @wire(CurrentPageReference)
wiredPageRef(pageRef) {
    if (pageRef && pageRef.state) {
        const { trainingId, contactId } = pageRef.state;
        this.trainingId = trainingId;
        this.contactId = contactId;
        if (this.contactId) {
            this.loadTrainingData().catch(error => {
                console.error('Error in wired page ref:', error);
            });
        }
    }
}

    // Computed properties
    get formattedActualTrainingTime() {
        return this.formatTime(this.trainingData.trainingRecord?.Actual_Initial_Training_Time__c || 0);
    }

    get formattedMinimumTrainingTime() {
        return this.formatTime(this.calculateMinimumTime());
    }

    get hasCourseCompetencies() {
        return this.courseData && this.courseData.length > 0;
    }

    get hasSpecialistsAssigned() {
        return this.specialists && this.specialists.length > 0;
    }

    get secondaryFacultyDisabled() {
        return this.editingDisabled || !this.primaryFacultyContactId;
    }

    get specialistComboboxDisabled() {
        return this.editingDisabled || this.isSpecialistLoading;
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

    connectedCallback() {
        this.checkMobileView();
        this.setupStateOptions();
        this.setupCertificationOptions();
        this.setupAuthorizationOptions();
        this.setupFinalizedOptions();
        this.setupTaughtCompetenciesOptions();
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    async loadTrainingData() {
        if (!this.contactId) {
            this.showErrorToast('Missing Parameters', 'Contact ID is required.');
            this.isLoading = false;
            return Promise.reject(new Error('Missing Contact ID'));
        }

        try {
            this.isLoading = true;
            const result = await initializeTrainingData({ 
                trainingId: this.trainingId || '', 
                contactId: this.contactId 
            });
            
            console.log('Training data loaded successfully:', JSON.stringify(result, null, 2));
            this.trainingData = result;
            this.originalTrainingData = JSON.parse(JSON.stringify(result));
            this.populateFormFields();
            this.setupOptions();
            
            return result;
        } catch (error) {
            this.showErrorToast('Error loading training data', error.body?.message || error.message);
            console.error('Error loading training data:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    populateFormFields() {
        const training = this.trainingData.trainingRecord;
        
        if (training) {
            this.parentOrgName = training.Organization__r?.Name || '';
            this.selectedSubOrganization = training.Organization__c || '';
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
            this.courseDuration = this.formatTimeForInput(
                this.selectedCertificationType === 'Initial' ? 
                training.Actual_Initial_Training_Time__c : 
                training.Actual_Recert_Training_Time__c
            );
        } else {
            this.parentOrgName = this.trainingData.organizationName || '';
            this.selectedSubOrganization = this.trainingData.organizationId || '';
            this.trainingStartDate = new Date().toISOString().split('T')[0]; // Default for new training
        }

        this.populateSpecialists();
        this.populateCourseCompetencies();
    }

    setupOptions() {
        this.setupSubOrganizationOptions();
        this.setupTrainerOptions();
        this.setupCourseOptions();
        this.setupSpecialistOptions();
    }

    setupSubOrganizationOptions() {
        this.subOrganizationOptions = [
            { label: this.trainingData.organizationName, value: this.trainingData.organizationId }
        ];
        
        if (this.trainingData.childOrganizations) {
            this.trainingData.childOrganizations.forEach(org => {
                if (org.Id !== this.trainingData.organizationId) {
                    this.subOrganizationOptions.push({
                        label: org.Name,
                        value: org.Id
                    });
                }
            });
        }
    }

    setupTrainerOptions() {
        this.primaryFacultyOptions = [{ label: 'Select Primary Faculty', value: '' }];
        this.secondaryFacultyOptions = [{ label: 'Select Secondary Faculty', value: '' }];
        
        if (this.trainingData.trainers) {
            this.trainingData.trainers.forEach(trainer => {
                const option = {
                    label: trainer.Name,
                    value: trainer.Id
                };
                this.primaryFacultyOptions.push(option);
                this.secondaryFacultyOptions.push(option);
            });
        }
    }

    setupCourseOptions() {
        this.courseOptions = [];
        
        if (this.trainingData.courses) {
            this.trainingData.courses.forEach(course => {
                this.courseOptions.push({
                    label: course.Name,
                    value: course.Id
                });
            });
        }
    }

    setupSpecialistOptions() {
        this.specialistOptions = [{ label: 'Search for a Specialist', value: '' }];
        
        if (this.trainingData.specialists) {
            this.trainingData.specialists.forEach(specialist => {
                const isAlreadySelected = this.specialists.some(s => s.contactId === specialist.Id);
                if (!isAlreadySelected) {
                    this.specialistOptions.push({
                        label: `${specialist.Name} - ${specialist.Account?.Name || ''}`,
                        value: specialist.Id
                    });
                }
            });
        }
    }

    setupStateOptions() {
        this.stateOptions = [
            { label: 'Select State/Province', value: '' },
            { label: 'Alabama', value: 'AL' },
            { label: 'Alaska', value: 'AK' },
            { label: 'Arizona', value: 'AZ' },
            { label: 'Arkansas', value: 'AR' },
            { label: 'California', value: 'CA' },
            { label: 'Colorado', value: 'CO' },
            { label: 'Connecticut', value: 'CT' },
            { label: 'Delaware', value: 'DE' },
            { label: 'Florida', value: 'FL' },
            { label: 'Georgia', value: 'GA' },
            { label: 'Hawaii', value: 'HI' },
            { label: 'Idaho', value: 'ID' },
            { label: 'Illinois', value: 'IL' },
            { label: 'Indiana', value: 'IN' },
            { label: 'Iowa', value: 'IA' },
            { label: 'Kansas', value: 'KS' },
            { label: 'Kentucky', value: 'KY' },
            { label: 'Louisiana', value: 'LA' },
            { label: 'Maine', value: 'ME' },
            { label: 'Maryland', value: 'MD' },
            { label: 'Massachusetts', value: 'MA' },
            { label: 'Michigan', value: 'MI' },
            { label: 'Minnesota', value: 'MN' },
            { label: 'Mississippi', value: 'MS' },
            { label: 'Missouri', value: 'MO' },
            { label: 'Montana', value: 'MT' },
            { label: 'Nebraska', value: 'NE' },
            { label: 'Nevada', value: 'NV' },
            { label: 'New Hampshire', value: 'NH' },
            { label: 'New Jersey', value: 'NJ' },
            { label: 'New Mexico', value: 'NM' },
            { label: 'New York', value: 'NY' },
            { label: 'North Carolina', value: 'NC' },
            { label: 'North Dakota', value: 'ND' },
            { label: 'Ohio', value: 'OH' },
            { label: 'Oklahoma', value: 'OK' },
            { label: 'Oregon', value: 'OR' },
            { label: 'Pennsylvania', value: 'PA' },
            { label: 'Rhode Island', value: 'RI' },
            { label: 'South Carolina', value: 'SC' },
            { label: 'South Dakota', value: 'SD' },
            { label: 'Tennessee', value: 'TN' },
            { label: 'Texas', value: 'TX' },
            { label: 'Utah', value: 'UT' },
            { label: 'Vermont', value: 'VT' },
            { label: 'Virginia', value: 'VA' },
            { label: 'Washington', value: 'WA' },
            { label: 'West Virginia', value: 'WV' },
            { label: 'Wisconsin', value: 'WI' },
            { label: 'Wyoming', value: 'WY' }
        ];
    }

    setupCertificationOptions() {
        this.certificationTypeOptions = [
            { label: 'Select Certification Type', value: '' },
            { label: 'Initial', value: 'Initial' },
            { label: 'Recertification', value: 'Recertification' }
        ];
    }

    setupAuthorizationOptions() {
        this.authorizationOptions = [
            { label: 'Select Authorization', value: '' },
            { label: 'Standard', value: 'Standard' },
            { label: 'Collaborative', value: 'Collaborative' },
            { label: 'Third Party', value: 'Third Party' }
        ];
    }

    setupTaughtCompetenciesOptions() {
        this.taughtCompetenciesOptions = [
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' }
        ];
    }

    setupFinalizedOptions() {
        this.finalizedStatusOptions = [
            { label: 'No', value: 'false' },
            { label: 'Yes', value: 'true' }
        ];
    }

    populateSpecialists() {
        this.specialists = [];
        
        if (this.trainingData.trainingRecord?.Registers__r) {
            this.trainingData.trainingRecord.Registers__r.forEach(registration => {
                const specialist = {
                    contactId: registration.Registration_Contact__c,
                    name: registration.Registration_Contact__r?.Name || '',
                    firstName: registration.Registration_Contact__r?.FirstName || '',
                    lastName: registration.Registration_Contact__r?.LastName || '',
                    accountName: registration.Registration_Contact__r?.Account?.Name || '',
                    specialistEmail: registration.Registration_Contact__r?.Email || '',
                    emailLink: registration.Registration_Contact__r?.Email ? 
                              `mailto:${registration.Registration_Contact__r.Email}` : '',
                    department: registration.Registration_Contact__r?.Department || '',
                    grade: this.getSpecialistGrade(registration.Registration_Contact__c)
                };
                this.specialists.push(specialist);
            });
        }
    }

    getSpecialistGrade(contactId) {
        if (this.trainingData.trainingRecord?.hed__Term_Grades__r) {
            const termGrade = this.trainingData.trainingRecord.hed__Term_Grades__r
                .find(grade => grade.hed__Contact__c === contactId);
            return termGrade?.hed__Result__c || '';
        }
        return '';
    }

    populateCourseCompetencies() {
        this.courseData = [];
        
        if (this.selectedCourseId && this.trainingData.courseCompetencies) {
            const courseCompetencies = this.trainingData.courseCompetencies
                .filter(comp => comp.Course__c === this.selectedCourseId);
            
            courseCompetencies.forEach((comp, index) => {
                const eventCompetency = this.getEventCompetency(comp.Id);
                this.courseData.push({
                    id: comp.Id,
                    name: comp.Name,
                    chapter: comp.Chapter__c || '',
                    initialTime: this.formatTime(comp.Initial_Time__c || 0),
                    recertTime: this.formatTime(comp.Recert_Time__c || 0),
                    initialMinutes: comp.Initial_Time__c || 0,
                    recertMinutes: comp.Recert_Time__c || 0,
                    taught: eventCompetency?.Taught__c || false
                });
            });
        }
    }

    getEventCompetency(courseCompetencyId) {
        if (this.trainingData.trainingRecord?.Event_Competencies1__r) {
            return this.trainingData.trainingRecord.Event_Competencies1__r
                .find(ec => ec.Course_Competency__c === courseCompetencyId);
        }
        return null;
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

    toggleMobileMenu() {
        this.isMobileMenuVisible = !this.isMobileMenuVisible;
    }

    handleTaughtCompetenciesChange(event) {
        this.taughtCompetenciesValue = event.detail.value;
        if (this.taughtCompetenciesValue === 'true') {
            this.courseData.forEach(comp => {
                comp.taught = true;
            });
        } else {
            this.courseData.forEach(comp => {
                comp.taught = false;
            });
        }
    }

    navigateToTrainings() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'hed__Course_Offering__c',
                actionName: 'list'
            },
            state: {
                c__contactId: this.contactId
            }
        }).catch(error => {
            this.showErrorToast('Navigation Error', 'Failed to navigate to trainings list');
            console.error('Navigation error:', error);
        });
    }

    navigateToGradingPage() {
        if (!this.trainingId || !this.contactId) {
            this.showErrorToast('Navigation Error', 'Missing required parameters for navigation');
            return;
        }
        
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                Name: 'Training_Grading__c',
            },
            state: {
                c__trainingId: this.trainingId,
                c__contactId: this.contactId
            }
        }).catch(error => {
            this.showErrorToast('Navigation Error', 'Failed to navigate to grading page');
            console.error('Navigation error:', error);
        });
    }

    editTraining() {
        this.editingDisabled = false;
        this.showInfoToast('Edit Mode Enabled', 'You can now modify the training details.');
    }

    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        this.courseDuration = this.formatTimeForInput(
            this.selectedCertificationType === 'Initial' ? 
            this.trainingData.trainingRecord?.Actual_Initial_Training_Time__c :
            this.trainingData.trainingRecord?.Actual_Recert_Training_Time__c
        );
    }

    updateStartDate(event) {
        this.trainingStartDate = event.detail.value;
    }

    updateEndDate(event) {
        this.trainingEndDate = event.detail.value;
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
        if (!this.primaryFacultyContactId) {
            this.secondaryFacultyContactId = '';
        }
    }

    updateSecondaryFaculty(event) {
        this.secondaryFacultyContactId = event.detail.value;
    }

    updateCourseSelection(event) {
        this.selectedCourseId = event.detail.value;
        this.populateCourseCompetencies();
    }

    updateCourseDuration(event) {
        this.courseDuration = event.detail.value;
    }

    updateSpecialistSelection(event) {
        const specialistId = event.detail.value;
        if (specialistId) {
            this.addSpecialistToTable(specialistId);
            this.selectedSpecialistContactId = '';
            this.setupSpecialistOptions();
        }
    }

    handleCellChange(event) {
        const draftValues = event.detail.draftValues;
        this.draftValues = draftValues;
        const updatedData = this.courseData.map(row => {
            const draft = draftValues.find(d => d.id === row.id);
            return draft ? { ...row, ...draft } : row;
        });
        this.courseData = updatedData;
    }

    addSpecialistToTable(specialistId) {
        const specialist = this.trainingData.specialists.find(s => s.Id === specialistId);
        if (specialist) {
            const newSpecialist = {
                contactId: specialist.Id,
                name: specialist.Name,
                firstName: specialist.FirstName,
                lastName: specialist.LastName,
                accountName: specialist.Account?.Name || '',
                specialistEmail: specialist.Email || '',
                emailLink: specialist.Email ? `mailto:${specialist.Email}` : '',
                department: specialist.Department || '',
                grade: ''
            };
            this.specialists = [...this.specialists, newSpecialist];
        }
    }

    removeSpecialist(event) {
        const specialistId = event.currentTarget.dataset.specialistId;
        this.specialists = this.specialists.filter(s => s.contactId !== specialistId);
        this.setupSpecialistOptions();
    }

    openSpecialistModal() {
        this.isModalOpen = true;
        this.clearNewSpecialistForm();
    }

    handleCloseModal() {
        this.isModalOpen = false;
        this.clearNewSpecialistForm();
    }

    clearNewSpecialistForm() {
        this.newSpecialistOrgId = this.selectedSubOrganization;
        this.newSpecialistFirstName = '';
        this.newSpecialistLastName = '';
        this.newSpecialistEmail = '';
        this.newSpecialistDepartment = '';
    }

    updateNewSpecialistOrgId(event) {
        this.newSpecialistOrgId = event.detail.value;
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

    async handleAdd() {
        if (!this.validateNewSpecialist()) {
            return;
        }

        try {
            this.isLoading = true;
            const result = await createSpecialist({
                accountId: this.newSpecialistOrgId,
                firstName: this.newSpecialistFirstName,
                lastName: this.newSpecialistLastName,
                email: this.newSpecialistEmail,
                department: this.newSpecialistDepartment,
                isValidate: false,
                contactId: '',
                contactType: ''
            });

            if (result.message === 'success' && result.contacts.length > 0) {
                const specialist = result.contacts[0];
                const newSpecialist = {
                    contactId: specialist.Id,
                    name: `${specialist.FirstName} ${specialist.LastName}`,
                    firstName: specialist.FirstName,
                    lastName: specialist.LastName,
                    accountName: this.getAccountName(this.newSpecialistOrgId),
                    specialistEmail: specialist.Email || '',
                    emailLink: specialist.Email ? `mailto:${specialist.Email}` : '',
                    department: specialist.Department || '',
                    grade: ''
                };
                this.specialists = [...this.specialists, newSpecialist];
                this.handleCloseModal();
                this.showSuccessToast('Success', 'Specialist added successfully');
                this.setupSpecialistOptions();
            } else {
                this.showErrorToast('Error', 'Failed to create specialist');
            }
        } catch (error) {
            this.showErrorToast('Error creating specialist', error.body?.message || error.message);
        } finally {
            this.isLoading = false;
        }
    }

    validateNewSpecialist() {
        if (!this.newSpecialistFirstName || !this.newSpecialistLastName) {
            this.showErrorToast('Validation Error', 'First Name and Last Name are required');
            return false;
        }
        if (!this.newSpecialistOrgId) {
            this.showErrorToast('Validation Error', 'Please select a Sub Organization');
            return false;
        }
        return true;
    }

    getAccountName(accountId) {
        const org = this.trainingData.childOrganizations?.find(o => o.Id === accountId);
        return org?.Name || '';
    }

    async saveTraining() {
        if (!this.validateTrainingData()) {
            throw new Error('Validation failed');
        }

        try {
            this.isLoading = true;
            const trainingDetails = this.buildTrainingDetails();
            const competenciesWrapper = this.buildCompetenciesWrapper();
            
            const result = await saveTraining({
                contactId: this.contactId,
                coursesList: this.getSelectedCourses(),
                trainerList: this.getSelectedTrainers(),
                trainingDetails: trainingDetails,
                trainingId: this.trainingId || '',
                organizationId: this.selectedSubOrganization,
                trainingType: 'Organization Specialist Training',
                startDate: this.trainingStartDate,
                endDate: this.trainingEndDate,
                selectedCourseIds: [this.selectedCourseId],
                selectedTrainersIds: this.getSelectedTrainerIds(),
                selectedSpecialistIds: this.getSelectedSpecialistIds(),
                competenciesWrapperStr: JSON.stringify(competenciesWrapper),
                isCollaborative: this.selectedAuthorization === 'Collaborative',
                authorizationType: this.selectedAuthorization,
                specialistToBeInserted: this.getSpecialistsForInsert(),
                termId: this.trainingData.termPlanList?.[0]?.Id || '',
                certificationType: this.selectedCertificationType
            });

            if (result && result.length > 0) {
                let hasErrors = false;
                let savedSuccessfully = false;
                
                result.forEach(res => {
                    if (res.trainingId) {
                        this.trainingId = res.trainingId;
                        this.showSuccessToast('Success', 'Training saved successfully');
                        this.editingDisabled = true;
                        savedSuccessfully = true;
                    } else if (res.message) {
                        this.showErrorToast('Validation Error', res.message);
                        hasErrors = true;
                    }
                });
                
                if (hasErrors) {
                    throw new Error('Validation errors occurred');
                }
                
                if (savedSuccessfully) {
                    // Refresh the training data after successful save
                    await this.loadTrainingData();
                    return result;
                }
            } else {
                throw new Error('No response received from server');
            }
        } catch (error) {
            this.showErrorToast('Error saving training', error.body?.message || error.message);
            console.error('Save error:', error);
            throw error; // Re-throw to be handled by calling methods
        } finally {
            this.isLoading = false;
        }
    }

    validateTrainingData() {
        if (!this.selectedCourseId) {
            this.showErrorToast('Validation Error', 'Please select a course');
            return false;
        }
        if (!this.primaryFacultyContactId) {
            this.showErrorToast('Validation Error', 'Please select a primary faculty');
            return false;
        }
        if (!this.trainingStartDate) {
            this.showErrorToast('Validation Error', 'Please select a start date');
            return false;
        }
        if (!this.trainingEndDate) {
            this.showErrorToast('Validation Error', 'Please select an end date');
            return false;
        }
        if (this.trainingEndDate < this.trainingStartDate) {
            this.showErrorToast('Validation Error', 'End date must be after start date');
            return false;
        }
        return true;
    }

    buildTrainingDetails() {
        const timeInMinutes = this.parseTimeInput(this.courseDuration);
        const trainingDetails = {
            Shipping_City__c: this.locationCity,
            Shipping_State__c: this.selectedState,
            Shipping_Postal_Code__c: this.locationZipCode,
            cc_Training_Description__c: this.trainingNotes,
            Street__c: this.trainingLocationAddress
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
        const competencies = [];
        this.courseData.forEach((comp, index) => {
            competencies.push({
                index: index,
                isAllCompetencyTaught: comp.taught,
                courseId: this.selectedCourseId,
                actualInitialTime: this.selectedCertificationType === 'Initial' ? this.parseTimeInput(this.courseDuration) : 0,
                actualRecertTime: this.selectedCertificationType !== 'Initial' ? this.parseTimeInput(this.courseDuration) : 0,
                competencyIds: [comp.id],
                trainingCompetencies: [{
                    Course_Competency__c: comp.id,
                    Name: comp.name,
                    Chapter_Name__c: comp.chapter,
                    Initial_Time__c: comp.initialMinutes,
                    Recert_Time__c: comp.recertMinutes,
                    Taught__c: comp.taught
                }]
            });
        });
        return competencies;
    }

    getSelectedCourses() {
        if (this.selectedCourseId) {
            return this.trainingData.courses.filter(c => c.Id === this.selectedCourseId);
        }
        return [];
    }

    getSelectedTrainers() {
        const trainers = [];
        if (this.primaryFacultyContactId) {
            const primary = this.trainingData.trainers.find(t => t.Id === this.primaryFacultyContactId);
            if (primary) trainers.push(primary);
        }
        if (this.secondaryFacultyContactId) {
            const secondary = this.trainingData.trainers.find(t => t.Id === this.secondaryFacultyContactId);
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
        return this.specialists.map(s => ({
            Id: s.contactId,
            FirstName: s.firstName,
            LastName: s.lastName,
            Email: s.specialistEmail,
            Department: s.department,
            AccountId: this.getAccountName(s.accountName) ? s.accountName : this.selectedSubOrganization
        }));
    }

    async gradeAndFinalize() {
        try {
            await this.saveTraining();
            if (this.trainingId) {
                this.navigateToGradingPage();
            }
        } catch (error) {
            this.showErrorToast('Error', 'Error saving training details');
            console.error('Grade and finalize error:', error);
        }
    }

    async handleSaveClick() {
        try {
            await this.saveTraining();
            if (this.trainingId) {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: this.trainingId,
                        objectApiName: 'hed__Course_Offering__c',
                        actionName: 'view'
                    }
                });
            }
        } catch (error) {
            this.showErrorToast('Error', 'Error saving training details');
            console.error('Save and navigate error:', error);
        }
    }

    refinalizeTraining() {
        this.navigateToGradingPage();
    }

    downloadCertificates() {
        this.showInfoToast('Info', 'Download certificates functionality would be implemented here');
    }

    emailCertificates() {
        this.showInfoToast('Info', 'Email certificates functionality would be implemented here');
    }

    requestCorrection() {
        this.showInfoToast('Info', 'Request correction functionality would be implemented here');
    }

    formatTime(minutes) {
        if (!minutes) return '0h 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    formatTimeForInput(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    parseTimeInput(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    calculateMinimumTime() {
        let totalMinutes = 0;
        const field = this.selectedCertificationType === 'Initial' ? 'initialMinutes' : 'recertMinutes';
        this.courseData.forEach(comp => {
            if (comp.taught) {
                totalMinutes += comp[field] || 0;
            }
        });
        return totalMinutes;
    }

    showSuccessToast(title, message) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: 'success'
        }));
    }

    showErrorToast(title, message) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: 'error'
        }));
    }

    showInfoToast(title, message) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: 'info'
        }));
    }
}