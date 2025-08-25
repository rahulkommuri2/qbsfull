import { LightningElement, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import getTrainingsPageData from "@salesforce/apex/tcPortalController.getTrainingsPageData";
import generateCertificate from "@salesforce/apex/tcCertificateController.generateCertificate";
import getTrainingPrintPageUrl from '@salesforce/apex/tcCertificateController.getTrainingPrintPageUrl';
import getSpecialistsForTraining from "@salesforce/apex/tcCertificateController.getSpecialistsForTraining";
import getGradingSpecialists from "@salesforce/apex/tcTrainingGradingController.initializePage";

import { refreshApex } from "@salesforce/apex";
import { getRecord } from "lightning/uiRecordApi";
import userId from "@salesforce/user/Id";
import CONTACT_ID_FIELD from "@salesforce/schema/User.ContactId";
import ACCOUNT_ID_FIELD from "@salesforce/schema/User.AccountId";

export default class TcTrainingListView extends NavigationMixin(
  LightningElement
) {
  @track isLoading = true;
  @track trainings = [];
  @track totalRecords = 0;
  @track organizationName = "";

  // User Context
  @track contactId = "";
  @track accountId = "";

  // To store wire result for refresh
  wiredTrainingsResult;

  @wire(getRecord, {
    recordId: userId,
    fields: [CONTACT_ID_FIELD, ACCOUNT_ID_FIELD],
  })
  wiredUser({ error, data }) {
    if (data) {
      this.contactId = data.fields.ContactId.value || "";
      this.contactId = "003VE00000pefPNYAY"; // Hardcoded for testing
      this.accountId = data.fields.AccountId.value || "";
    } else if (error) {
      console.error("Error loading user data:", error);
      this.showToast(
        "Error",
        error.body?.message || "Failed to load user data",
        "error"
      );
    }
  }

  // Filters
  @track filters = {
    course: "",
    trainer: "",
    finalized: "",
    startDate: null,
    endDate: null,
  };

  // UI State
  @track isFilterOpen = false;
  currentPage = 1;
  pageSize = 10;

  // Action buttions state variables
  @track isViewCertificateActionDisabled = false;
  @track isEditActionDisabled = false;
  @track isPrintActionDisabled = false;
  @track isReportsActionDisabled = false;
  @track isEmailActionDisabled = false;

  // Options
  @track courseOptions = [{ label: "All Courses", value: "" }];
  @track trainerOptions = [{ label: "All Trainers", value: "" }];
  finalizedOptions = [
    { label: "All", value: "" },
    { label: "Finalized", value: "true" },
    { label: "Not Finalized", value: "false" },
  ];
  pageSizeOptions = [
    { label: "10", value: 10 },
    { label: "20", value: 20 },
    { label: "50", value: 50 },
  ];

  columns = [
    { label: "Training", fieldName: "Name", type: "text" },
    {
      label: "Course",
      fieldName: "hed__Course__r",
      type: "text",
      typeAttributes: { linkText: { fieldName: "hed__Course__r.Name" } },
    },
    { label: "Start Date", fieldName: "cc_Course_Start_Date__c", type: "date" },
    { label: "End Date", fieldName: "cc_Course_End_Date__c", type: "date" },
    {
      label: "Primary Trainer",
      fieldName: "hed__Faculty__r.Name",
      type: "text",
    },
    {
      label: "Secondary Trainer",
      fieldName: "cc_Secondary_Faculty__r.Name",
      type: "text",
    },
    { label: "Finalized", fieldName: "Finalized__c", type: "boolean" },
    {
      type: "action",
      typeAttributes: {
        rowActions: [
          { label: "View", name: "view" },
          { label: "Edit", name: "edit" },
        ],
      },
    },
  ];

  // Fixed wire decorator with correct parameter names
  @wire(getTrainingsPageData, {
    offset: "$computedOffset",
    pageSize: "$pageSize",
    courseFilter: "$filters.course",
    trainerFilter: "$filters.trainer",
    finalizedFilter: "$filters.finalized",
    startDate: "$filters.startDate", // Fixed parameter name
    endDate: "$filters.endDate", // Fixed parameter name
    contactId: "$contactId",
  })
  wiredTrainings(result) {
    this.wiredTrainingsResult = result;
    this.isLoading = false;

    if (result.data) {
      const data = result.data;

      this.trainings = data.trainings || [];
      this.totalRecords = data.totalRecords || 0;
      this.organizationName = data.organizationName || "";

      if (data.courses) {
        this.courseOptions = [
          { label: "All Courses", value: "" },
          ...data.courses.map((c) => ({ label: c.Name, value: c.Name })),
        ];
      }

      if (data.trainers) {
        this.trainerOptions = [
          { label: "All Trainers", value: "" },
          ...data.trainers.map((t) => ({ label: t.Name, value: t.Name })),
        ];
      }

      if (data.message) {
        this.showToast("Error", data.message, "error");
      }
    } else if (result.error) {
      console.error("Error loading trainings:", result.error);
      this.showToast(
        "Error",
        result.error.body?.message || "Failed to load trainings",
        "error"
      );
    }
  }

  // With these computed getters:
  get formattedTrainings() {
    if (!this.trainings) return [];

    return this.trainings.map((training) => {
      return {
        ...training,
        courseName: training.hed__Course__r ? training.hed__Course__r.Name : "",
        classNumber: training.Classes_UID__c ? training.Classes_UID__c : "",
        courseId: training.hed__Course__c || "",
        primaryTrainerName: training.hed__Faculty__r
          ? training.hed__Faculty__r.Name
          : "",
        primaryTrainerId: training.hed__Faculty__c || "",
        finalizedStatus: training.Finalized__c ? "Yes" : "No",
        finalizedClass: training.Finalized__c
          ? "status-finalized"
          : "status-not-finalized",
        formattedStartDate: this.formatDate(training.cc_Course_Start_Date__c),
        formattedEndDate: this.formatDate(training.cc_Course_End_Date__c),
      };
    });
  }

  formatDate(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  get computedOffset() {
    return (this.currentPage - 1) * this.pageSize;
  }

  get paginationText() {
    const start = this.computedOffset + 1;
    const end = Math.min(
      this.computedOffset + this.pageSize,
      this.totalRecords
    );
    return `${start}-${end} of ${this.totalRecords}`;
  }

  get totalPages() {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  get disablePrevious() {
    return this.currentPage <= 1;
  }

  get disableNext() {
    return this.currentPage >= this.totalPages;
  }

  // Add navigation methods for clickable elements
  handleTrainingClick(event) {
    const recordId = event.currentTarget.dataset.id;
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        actionName: "view",
      },
      state: {
        trainingId: recordId,
        contactId: this.contactId,
      },
    });
  }

  handleCourseClick(event) {
    const courseId = event.currentTarget.dataset.id;
    this.navigateToRecord(courseId);
  }

  handleTrainerClick(event) {
    const trainerId = event.currentTarget.dataset.id;
    this.navigateToRecord(trainerId);
  }

  async handlePrintAction(event) {
    const trainingId = event.currentTarget.dataset.id;
    const contactId = this.contactId;

    this.isLoading = true;

    try {
      // Import the Apex method at the top of your file:
      // import getTrainingPrintPageUrl from '@salesforce/apex/tcCertificateController.getTrainingPrintPageUrl';

      const pdfUrl = await getTrainingPrintPageUrl({
        trainingId: trainingId,
        contactId: contactId,
      });

      // Open the PDF in new tab
      window.open(pdfUrl, "_blank");

      this.showToast(
        "Success",
        "Training report opened in new tab.",
        "success"
      );
    } catch (error) {
      console.error("Error getting PDF URL:", error);
      this.showToast("Error", "Failed to generate PDF URL.", "error");
    } finally {
      this.isLoading = false;
    }
  }

  async handleViewCertificateAction(event) {
    const trainingId = event.currentTarget.dataset.id;
    // Find the training record to get the course name
    const training = this.formattedTrainings.find((t) => t.Id === trainingId);
    const courseName =
      training && training.courseName ? training.courseName : "Certificate";
    // Format current date and time for filename
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`;
    const timeStr = `${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(
      now.getSeconds()
    )}`;
    const fileName = `${courseName} Certificate ${dateStr} ${timeStr}.pdf`;

    this.isLoading = true;
    try {
      const result = await generateCertificate({ trainingId });
      if (
        result &&
        Array.isArray(result) &&
        result.length > 0 &&
        result[0].documentBase64
      ) {
        // Use generated filename
        const link = document.createElement("a");
        link.href = "data:application/pdf;base64," + result[0].documentBase64;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast(
          "Success",
          "Certificate generated and downloaded.",
          "success"
        );
      } else {
        this.showToast("Error", "Certificate not found.", "error");
      }
    } catch (err) {
      this.showToast("Error", err.body?.message || err.message, "error");
    } finally {
      this.isLoading = false;
    }
  }

  // Add this method to handle the view certificate action for a specialist row
  async handleViewCertificateRow(event) {
    const regId = event.currentTarget.dataset.id;
    if (!regId) return;
    this.isLoading = true;
    try {
        // import generateCertificate from '@salesforce/apex/tcCertificateController.generateCertificate';
        const result = await generateCertificate({ trainingId: regId });
        if (
            result &&
            Array.isArray(result) &&
            result.length > 0 &&
            result[0].documentBase64
        ) {
            const link = document.createElement("a");
            link.href = "data:application/pdf;base64," + result[0].documentBase64;
            link.download = "Certificate.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showToast("Success", "Certificate generated and downloaded.", "success");
        } else {
            this.showToast("Error", "Certificate not found.", "error");
        }
    } catch (err) {
        this.showToast("Error", err.body?.message || err.message, "error");
    } finally {
        this.isLoading = false;
    }
  }

  handleEditAction(event) {
    const recordId = event.currentTarget.dataset.id;
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        actionName: "view",
      },
      state: {
        trainingId: recordId,
        contactId: this.contactId,
        mode: "edit",
      },
    });
  }

  // Event Handlers
  handleNewTraining() {
    this[NavigationMixin.Navigate]({
      type: "comm__namedPage",
      attributes: {
        name: "New_Training__c",
      },
      state: {
        contactId: this.contactId,
      },
    });
  }

  primaryFacultyFilter = "";
  secondaryFacultyFilter = "";

  handleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  handleFinalizedChange(event) {
    this.filters = { ...this.filters, finalized: event.detail.value };
    this.currentPage = 1;
  }

  handleCourseChange(event) {
    this.filters = { ...this.filters, course: event.detail.value };
    this.currentPage = 1;
  }

  handleTrainerChange(event) {
    this.filters = { ...this.filters, trainer: event.target.value };
    this.currentPage = 1;
  }

  handleDateFromChange(event) {
    this.filters = { ...this.filters, startDate: event.target.value };
    this.currentPage = 1;
  }

  handleDateToChange(event) {
    this.filters = { ...this.filters, endDate: event.target.value };
    this.currentPage = 1;
  }

  handleResetSearch() {
    this.handleReset();
  }

  handleSearch() {
    this.currentPage = 1;
    // Wire service will automatically refresh with new filter values
  }

  // Original handlers (kept for compatibility)
  handleFilterToggle() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  handleFilterChange(event) {
    const field = event.target.dataset.field;
    this.filters = { ...this.filters, [field]: event.detail.value };
    this.currentPage = 1;
  }

  handleReset() {
    this.filters = {
      course: "",
      trainer: "",
      finalized: "",
      startDate: null,
      endDate: null,
    };
    this.currentPage = 1;
  }

  handlePageSizeChange(event) {
    this.pageSize = parseInt(event.detail.value, 10);
    this.currentPage = 1;
  }

  handlePrevious() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  handleNext() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  handleRowAction(event) {
    const action = event.detail.action;
    const row = event.detail.row;
    if (action.name === "view") {
      this.navigateToRecord(row.Id);
    }
    if (action.name === "edit") {
      this.navigateToRecord(row.Id, "edit");
    }
  }

  navigateToRecord(recordId, action = "view") {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        actionName: action,
      },
    });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  // Method to manually refresh data
  refreshData() {
    this.isLoading = true;
    return refreshApex(this.wiredTrainingsResult);
  }

  @track isEmailModalOpen = false;
  @track emailModalSpecialists = [];
  @track selectedSpecialistIds = new Set();
  @track ccEmailValue = '';
  @track currentTrainingId = '';

  // Fix: Use correct parameter names for Apex method call
  async handleEmailAction(event) {
    const trainingId = event.currentTarget.dataset.id;
    this.currentTrainingId = trainingId;
    this.isLoading = true;
    try {
        // Fetch specialist data for the selected training using the correct Apex method
        const specialists = await getSpecialistsForTraining({ trainingId, conId: this.contactId });
        console.log('Specialists:', specialists);

        // Map the returned specialist data for modal display
        this.emailModalSpecialists = (specialists || []).map(spec => ({
            regId: spec.GradeId, // Register No
            email: spec.SpecialistEmail,
            name: spec.name,
            certification: spec.CertificationName || '',
            overallGrade: spec.gradeName || spec.grade || '', // Use gradeName for overall grade
            restrictions: spec.restrictions || '',
            checked: false
        }));
        console.log('emailModalSpecialists:', this.emailModalSpecialists);

        this.selectedSpecialistIds = new Set();
        this.ccEmailValue = '';
        this.isEmailModalOpen = true;
    } catch (err) {
        console.error('Failed to load specialists:', err);
        this.showToast('Error', 'Failed to load specialists.', 'error');
    } finally {
        this.isLoading = false;
    }
  }

  handleEmailModalClose() {
    this.isEmailModalOpen = false;
  }

  handleSpecialistCheckboxChange(event) {
    const regId = event.target.dataset.regid;
    if (event.target.checked) {
      this.selectedSpecialistIds.add(regId);
    } else {
      this.selectedSpecialistIds.delete(regId);
    }
    this.selectedSpecialistIds = new Set(this.selectedSpecialistIds);
  }

  handleCcEmailChange(event) {
    this.ccEmailValue = event.target.value;
  }

  async handleSendEmailCertificates() {
    this.isLoading = true;
    try {
      const gradeIds = Array.from(this.selectedSpecialistIds);
      if (gradeIds.length === 0) {
        this.showToast('Error', 'Please select at least one specialist.', 'error');
        this.isLoading = false;
        return;
      }
      // import emailCertificate from '@salesforce/apex/tcCertificateController.emailCertificate';
      const result = await emailCertificate({ GradeId: gradeIds, CCEmail: this.ccEmailValue || "" });
      if (result === "Success") {
        this.showToast("Success", "Certificates emailed successfully", "success");
        this.isEmailModalOpen = false;
      } else {
        this.showToast("Error", "Email failed", "error");
      }
    } catch (error) {
      this.showToast("Error", error.body ? error.body.message : error.message, "error");
    } finally {
      this.isLoading = false;
    }
  }
}