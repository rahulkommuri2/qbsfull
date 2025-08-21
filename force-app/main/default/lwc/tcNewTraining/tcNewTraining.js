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

export default class TcNewTraining extends NavigationMixin(LightningElement) {
    @track isLoading = false;
    @track errorMessage = '';
    @track editingDisabled = false;
    @track contactId = '';
    @track isMobileView = formFactorPropertyName === 'Small';
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
        { label: 'None', value: 'None' },
        { label: 'Collaborative', value: 'Collaborative' },
        { label: 'Third Party', value: 'Third Party' }
    ];
    @track courseOptions = [];
    @track trainerOptions = [];
    @track secondaryTrainerOptions = [];
    @track specialistOptions = [];
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

    get specialistComboboxDisabled() {
        return this.editingDisabled || this.isSpecialistLoading || !this.specialistOptions.length;
    }

    get secondaryFacultyDisabled() {
        return !this.primaryFacultyContactId || this.editingDisabled;
    }

    @wire(getRecord, { recordId: userId, fields: [CONTACT_ID_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
            if (this.contactId) {
                this.loadInitialData();
            } else {
                this.handleError('User does not have a ContactId associated', new Error('ContactId missing'));
            }
        } else if (error) {
            this.handleError('Error fetching user record', error);
        }
    }

    connectedCallback() {
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        this.isMobileView = formFactorPropertyName === 'Small';
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
            this.subOrganizationOptions = (this.trainingData.childOrganizations || []).map(org => ({
                label: org.Name,
                value: org.Id
            }));
            this.selectedSubOrganization = this.trainingData.organizationId || '';

            const certTypes = new Set((this.trainingData.courses || []).map(course => course.Certification_Type__c).filter(type => type));
            this.certificationTypeOptions = Array.from(certTypes).map(type => ({
                label: type,
                value: type
            }));

            this.courseOptions = (this.trainingData.courses || []).map(course => ({
                label: course.Name,
                value: course.Id
            }));

            this.trainerOptions = (this.trainingData.trainers || []).map(trainer => ({
                label: `${trainer.FirstName} ${trainer.LastName}`,
                value: trainer.Id,
                certificationStatus: trainer.Certification_Contact_Status__c,
                certifiedCourses: this.trainingData.trainerCertificationMap ? this.trainingData.trainerCertificationMap[trainer.Id] : []
            }));
            this.secondaryTrainerOptions = this.trainerOptions;

            this.updateSpecialistOptions();
            this.editingDisabled = !(this.trainingData.viewTrainers && this.trainingData.viewSpecialist);
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

    updateSubOrganization(event) {
        this.selectedSubOrganization = event.detail.value;
        this.newSpecialistOrgId = this.selectedSubOrganization; // Sync modal sub-org
    }

    updateCertificationType(event) {
        this.selectedCertificationType = event.detail.value;
        this.selectedCourseType = '';
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
        if (this.selectedAuthorization !== 'None') {
            this.loadInitialData();
        }
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
        this.secondaryTrainerOptions = this.trainerOptions.filter(
            option => option.value !== this.primaryFacultyContactId
        );
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

    updateCourseCompetencies() {
        if (this.selectedCourseType && this.trainingData?.courseCompetencies) {
            this.courseData = this.trainingData.courseCompetencies
                .filter(comp => comp.Course__c === this.selectedCourseType)
                .map(comp => ({
                    Id: comp.Id,
                    Name: comp.Name,
                    Chapter__c: comp.Chapter__c || '',
                    Initial_Time__c: this.formatTime(comp.Initial_Time__c),
                    Recert_Time__c: this.formatTime(comp.Recert_Time__c),
                    Taught__c: comp.Taught__c || false
                }));
            this.hasCourseCompetencies = this.courseData.length > 0;
            const totalInitialTime = this.courseData.reduce((sum, comp) => sum + (comp.Initial_Time__c ? parseFloat(comp.Initial_Time__c) : 0), 0);
            this.courseMinimumDuration = this.formatTime(totalInitialTime);
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
        this.newSpecialistOrgId = this.selectedSubOrganization; // Default to selected sub-org
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
                    this.loadInitialData(); // Refresh specialist options
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
            Shipping_City__c: this.locationCity,
            Shipping_State__c: this.selectedState,
            Shipping_Postal_Code__c: this.locationZipCode,
            Street__c: this.trainingLocationAddress,
            cc_Training_Description__c: this.trainingNotes,
            Course_Initial_Training_Time__c: this.courseActualDuration ? this.parseTimeToMinutes(this.courseActualDuration) : null,
            Actual_Initial_Training_Time__c: this.courseActualDuration ? this.parseTimeToMinutes(this.courseActualDuration) : null
        };

        const trainers = [];
        if (this.primaryFacultyContactId) trainers.push({ Id: this.primaryFacultyContactId });
        if (this.secondaryFacultyContactId) trainers.push({ Id: this.secondaryFacultyContactId });

        const competenciesWrapper = this.courseData.map((comp, index) => ({
            index: index,
            courseId: this.selectedCourseType,
            isAllCompetencyTaught: this.courseData.every(c => c.Taught__c),
            actualInitialTime: this.parseTimeToMinutes(this.courseActualDuration) || 0,
            actualRecertTime: 0,
            competencyIds: [comp.Id],
            trainingCompetencies: [{
                Id: comp.Id,
                Name: comp.Name,
                Course_Competency__c: comp.Id,
                Taught__c: comp.Taught__c,
                Initial_Time__c: this.parseTimeToMinutes(comp.Initial_Time__c),
                Recert_Time__c: this.parseTimeToMinutes(comp.Recert_Time__c)
            }]
        }));

        saveTraining({
            contactId: this.contactId,
            coursesList: [{ Id: this.selectedCourseType }],
            trainerList: trainers,
            trainingDetails: trainingDetails,
            trainingId: '',
            organizationId: this.selectedSubOrganization,
            trainingType: 'Organization Specialist Training',
            startDate: this.trainingStartDate,
            endDate: this.trainingEndDate,
            selectedCourseIds: [this.selectedCourseType],
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
                    this.navigateToTrainings();
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
        this.saveTraining(); // Extend for grading logic if needed
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
            { field: this.selectedCourseType, name: 'Course' }
        ];

        for (const { field, name } of requiredFields) {
            if (!field) {
                this.showToast('Error', `${name} is required`, 'error');
                return false;
            }
        }
        return true;
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